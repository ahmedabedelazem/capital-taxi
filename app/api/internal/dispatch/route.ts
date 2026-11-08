import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getServerDb } from "@/lib/server/firebase-admin";
import { distanceKm, geohashQueryPrefixes, isValidPoint } from "@/lib/domain/geo";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const expected = process.env.DISPATCH_WORKER_SECRET;
  const supplied = request.headers.get("x-dispatch-secret");
  if (!expected || expected.length < 32 || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const data = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const tripId = typeof data.tripId === "string" ? data.tripId : "";
  const stage = data.stage;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(tripId) ||
      typeof stage !== "number" || !Number.isInteger(stage) || stage < 0 || stage > 6) {
    return NextResponse.json({ ok: false, error: "invalid_dispatch_request" }, { status: 400 });
  }

  try {
    const db = getServerDb();
    const tripRef = db.collection("trips").doc(tripId);
    const [tripSnapshot, configSnapshot] = await Promise.all([
      tripRef.get(),
      db.collection("config").doc("dispatch").get(),
    ]);
    if (!tripSnapshot.exists) return NextResponse.json({ ok: false, error: "trip_not_found" }, { status: 404 });
    if (!configSnapshot.exists) return NextResponse.json({ ok: false, error: "dispatch_not_configured" }, { status: 503 });

    const trip = tripSnapshot.data() ?? {};
    const config = configSnapshot.data() ?? {};
    const now = Date.now();
    const radii = config.stageRadiiKm;
    const ttlSeconds = config.offerTtlSeconds;
    const maxOffers = config.maxOffersPerStage;
    if (!Array.isArray(radii) || !radii.length || radii.length > 6 ||
        !radii.every((v) => typeof v === "number" && Number.isFinite(v) && v > 0) ||
        radii.some((v, index) => index > 0 && v <= (radii[index - 1] as number)) ||
        typeof ttlSeconds !== "number" || !Number.isInteger(ttlSeconds) || ttlSeconds < 15 || ttlSeconds > 300 ||
        typeof maxOffers !== "number" || !Number.isInteger(maxOffers) || maxOffers < 1 || maxOffers > 30 ||
        stage > radii.length) {
      return NextResponse.json({ ok: false, error: "dispatch_not_configured" }, { status: 503 });
    }

    if (stage === radii.length) {
      const finalization = await db.runTransaction(async (transaction) => {
        const currentTrip = await transaction.get(tripRef);
        if (!currentTrip.exists) throw new Error("TRIP_NOT_FOUND");
        const current = currentTrip.data() ?? {};
        const currentStage = typeof current.dispatchStage === "number" ? current.dispatchStage : 0;
        if (currentStage !== stage) throw new Error("STALE_DISPATCH_STAGE");
        if (current.status !== "searching" || current.assignedDriverUid) {
          throw new Error("TRIP_NOT_DISPATCHABLE");
        }
        const offersQuery = db.collection("tripOffers")
          .where("tripId", "==", tripId)
          .where("status", "==", "offered")
          .where("expiresAt", ">", Timestamp.fromMillis(now))
          .limit(1);
        const offersSnapshot = await transaction.get(offersQuery);
        const hasLiveOffer = !offersSnapshot.empty;
        if (hasLiveOffer) return { status: "searching" as const, waitingForOffers: true };
        transaction.update(tripRef, {
          status: "no_driver",
          updatedAt: FieldValue.serverTimestamp(),
        });
        transaction.create(tripRef.collection("statusTimeline").doc(), {
          from: "searching",
          to: "no_driver",
          actorType: "system",
          actorUid: "dispatch-worker",
          createdAt: FieldValue.serverTimestamp(),
        });
        return { status: "no_driver" as const, waitingForOffers: false };
      });
      return NextResponse.json({ ok: true, tripId, ...finalization }, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const pickup = trip.pickup && typeof trip.pickup === "object" ? trip.pickup as Record<string, unknown> : {};
    const tripPoint = { lat: pickup.lat, lng: pickup.lng };
    if (!isValidPoint(tripPoint)) {
      return NextResponse.json({ ok: false, error: "trip_pickup_invalid" }, { status: 422 });
    }
    // New location updates carry a 9-character geohash. Query a conservative
    // bounding box at a coarser precision, then retain the exact distance test.
    // A bounded legacy scan keeps drivers without geohash discoverable during rollout.
    let geohashPrefixes: string[] = [];
    for (let precision = 4; precision >= 1; precision -= 1) {
      try {
        geohashPrefixes = geohashQueryPrefixes(tripPoint, radii[stage] as number, precision);
        break;
      } catch (error) {
        if (!(error instanceof RangeError) || error.message !== "geohash_query_too_broad" || precision === 1) {
          throw error;
        }
      }
    }

    const driversCollection = db.collection("drivers");
    const [geohashSnapshots, legacySnapshot] = await Promise.all([
      Promise.all(geohashPrefixes.map((prefix) => driversCollection
        .where("isAvailable", "==", true)
        .where("geohash", ">=", prefix)
        .where("geohash", "<=", `${prefix}~`)
        .limit(100)
        .get())),
      driversCollection.where("isAvailable", "==", true).limit(100).get(),
    ]);
    const driverDocs = new Map(legacySnapshot.docs.map((doc) => [doc.id, doc] as const));
    for (const snapshot of geohashSnapshots) {
      for (const doc of snapshot.docs) driverDocs.set(doc.id, doc);
    }

    const candidates = [...driverDocs.values()].map((doc) => {
      const driver = doc.data();
      const location = driver.location && typeof driver.location === "object"
        ? driver.location as Record<string, unknown>
        : {};
      const updatedAt = driver.locationUpdatedAt;
      const point = { lat: location.lat, lng: location.lng };
      if (!isValidPoint(point) ||
          !(updatedAt instanceof Timestamp) || now - updatedAt.toMillis() > 90_000 ||
          now < updatedAt.toMillis() || driver.activeTripId) return null;
      const distance = distanceKm(tripPoint, point);
      return { uid: doc.id, distance, point };
    }).filter((v): v is NonNullable<typeof v> => v !== null && v.distance <= (radii[stage] as number))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxOffers as number);

    const driverRefs = candidates.map((candidate) => db.collection("drivers").doc(candidate.uid));
    const applicationRefs = candidates.map((candidate) => db.collection("driverApplications").doc(candidate.uid));
    const offerRefs = candidates.map((candidate) => db.collection("tripOffers").doc(`${tripId}_${candidate.uid}`));
    const timelineRef = tripRef.collection("statusTimeline").doc();
    const expiresAt = Timestamp.fromMillis(now + ttlSeconds * 1000);

    const outcome = await db.runTransaction(async (transaction) => {
      const [currentTrip, driverStates, applicationStates, existingOffers] = await Promise.all([
        transaction.get(tripRef),
        Promise.all(driverRefs.map((ref) => transaction.get(ref))),
        Promise.all(applicationRefs.map((ref) => transaction.get(ref))),
        Promise.all(offerRefs.map((ref) => transaction.get(ref))),
      ]);
      if (!currentTrip.exists) throw new Error("TRIP_NOT_FOUND");
      const current = currentTrip.data() ?? {};
      const currentStage = typeof current.dispatchStage === "number" ? current.dispatchStage : 0;
      if (currentStage !== stage) throw new Error("STALE_DISPATCH_STAGE");
      if ((stage === 0 && current.status !== "pending") ||
          (stage > 0 && current.status !== "searching") ||
          current.assignedDriverUid) throw new Error("TRIP_NOT_DISPATCHABLE");

      const accepted = candidates.flatMap((candidate, index) => {
        const driver = driverStates[index].data() ?? {};
        const application = applicationStates[index].data() ?? {};
        const location = driver.location && typeof driver.location === "object"
          ? driver.location as Record<string, unknown>
          : {};
        const currentPoint = { lat: location.lat, lng: location.lng };
        if (application.status !== "approved" || driver.isAvailable !== true ||
            driver.activeTripId || !(driver.locationUpdatedAt instanceof Timestamp) ||
            now - driver.locationUpdatedAt.toMillis() < 0 ||
            now - driver.locationUpdatedAt.toMillis() > 90_000 ||
            !isValidPoint(currentPoint) || existingOffers[index].exists) {
          return [];
        }
        const currentDistance = distanceKm(tripPoint, currentPoint);
        if (!Number.isFinite(currentDistance) || currentDistance > (radii[stage] as number)) return [];
        return [{ ...candidate, distance: currentDistance }];
      });
      for (const candidate of accepted) {
        const index = candidates.findIndex((item) => item.uid === candidate.uid);
        transaction.create(offerRefs[index], {
          tripId,
          driverUid: candidate.uid,
          status: "offered",
          distanceToPickupKm: Number(candidate.distance.toFixed(2)),
          stage,
          createdAt: FieldValue.serverTimestamp(),
          expiresAt,
        });
      }
      const nextStatus = "searching";
      transaction.update(tripRef, {
        status: nextStatus,
        dispatchStage: stage + 1,
        lastDispatchAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.create(timelineRef, {
        from: current.status,
        to: nextStatus,
        eventType: "dispatch_stage",
        stage,
        offersCreated: accepted.length,
        actorType: "system",
        actorUid: "dispatch-worker",
        createdAt: FieldValue.serverTimestamp(),
      });
      return { offersCreated: accepted.length, radiusKm: radii[stage] as number, nextStage: stage + 1 };
    });

    return NextResponse.json({ ok: true, tripId, ...outcome }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "TRIP_NOT_FOUND") return NextResponse.json({ ok: false, error: "trip_not_found" }, { status: 404 });
    if (code === "STALE_DISPATCH_STAGE") return NextResponse.json({ ok: false, error: "dispatch_stage_already_processed" }, { status: 409 });
    if (code === "TRIP_NOT_DISPATCHABLE") return NextResponse.json({ ok: false, error: "trip_not_dispatchable" }, { status: 409 });
    return NextResponse.json({ ok: false, error: "dispatch_failed" }, { status: 503 });
  }
}
