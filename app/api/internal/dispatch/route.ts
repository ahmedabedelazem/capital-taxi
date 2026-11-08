import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getServerDb } from "@/lib/server/firebase-admin";

export const dynamic = "force-dynamic";

type Point = { lat: number; lng: number };

function distanceKm(a: Point, b: Point): number {
  const rad = (v: number) => v * Math.PI / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

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
      typeof stage !== "number" || !Number.isInteger(stage) || stage < 0 || stage > 5) {
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
    const radii = config.stageRadiiKm;
    const ttlSeconds = config.offerTtlSeconds;
    const maxOffers = config.maxOffersPerStage;
    if (!Array.isArray(radii) || !radii.length ||
        !radii.every((v) => typeof v === "number" && Number.isFinite(v) && v > 0) ||
        typeof ttlSeconds !== "number" || !Number.isInteger(ttlSeconds) || ttlSeconds < 15 || ttlSeconds > 300 ||
        typeof maxOffers !== "number" || !Number.isInteger(maxOffers) || maxOffers < 1 || maxOffers > 30 ||
        stage >= radii.length) {
      return NextResponse.json({ ok: false, error: "dispatch_not_configured" }, { status: 503 });
    }

    const pickup = trip.pickup && typeof trip.pickup === "object" ? trip.pickup as Record<string, unknown> : {};
    if (typeof pickup.lat !== "number" || typeof pickup.lng !== "number" ||
        !Number.isFinite(pickup.lat) || !Number.isFinite(pickup.lng)) {
      return NextResponse.json({ ok: false, error: "trip_pickup_invalid" }, { status: 422 });
    }
    const tripPoint = { lat: pickup.lat, lng: pickup.lng };
    const driverSnapshot = await db.collection("drivers")
      .where("isAvailable", "==", true)
      .limit(100)
      .get();
    const now = Date.now();
    const candidates = driverSnapshot.docs.map((doc) => {
      const driver = doc.data();
      const location = driver.location && typeof driver.location === "object"
        ? driver.location as Record<string, unknown>
        : {};
      const updatedAt = driver.locationUpdatedAt;
      if (typeof location.lat !== "number" || typeof location.lng !== "number" ||
          !Number.isFinite(location.lat) || !Number.isFinite(location.lng) ||
          !(updatedAt instanceof Timestamp) || now - updatedAt.toMillis() > 90_000 ||
          now < updatedAt.toMillis() || driver.activeTripId) return null;
      const point = { lat: location.lat, lng: location.lng };
      const distance = distanceKm(tripPoint, point);
      return { uid: doc.id, distance, point };
    }).filter((v): v is NonNullable<typeof v> => v !== null && v.distance <= (radii[stage] as number))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxOffers as number);

    const driverRefs = candidates.map((candidate) => db.collection("drivers").doc(candidate.uid));
    const offerRefs = candidates.map((candidate) => db.collection("tripOffers").doc(`${tripId}_${candidate.uid}`));
    const timelineRef = tripRef.collection("statusTimeline").doc();
    const expiresAt = Timestamp.fromMillis(now + ttlSeconds * 1000);

    const outcome = await db.runTransaction(async (transaction) => {
      const [currentTrip, driverStates, existingOffers] = await Promise.all([
        transaction.get(tripRef),
        Promise.all(driverRefs.map((ref) => transaction.get(ref))),
        Promise.all(offerRefs.map((ref) => transaction.get(ref))),
      ]);
      if (!currentTrip.exists) throw new Error("TRIP_NOT_FOUND");
      const current = currentTrip.data() ?? {};
      const currentStage = typeof current.dispatchStage === "number" ? current.dispatchStage : 0;
      if (currentStage !== stage) throw new Error("STALE_DISPATCH_STAGE");
      if ((stage === 0 && current.status !== "pending") ||
          (stage > 0 && current.status !== "searching") ||
          current.assignedDriverUid) throw new Error("TRIP_NOT_DISPATCHABLE");

      const accepted = candidates.filter((candidate, index) => {
        const driver = driverStates[index].data() ?? {};
        return driver.isAvailable === true && !driver.activeTripId &&
          driver.locationUpdatedAt instanceof Timestamp &&
          now - driver.locationUpdatedAt.toMillis() <= 90_000 &&
          !existingOffers[index].exists;
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
