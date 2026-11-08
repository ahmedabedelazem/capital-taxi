import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getServerDb } from "@/lib/server/firebase-admin";
import { hasRole, verifyRequestUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ tripId: string }> };

export async function POST(request: Request, context: RouteContext) {
  let user;
  try {
    user = await verifyRequestUser(request);
  } catch {
    return NextResponse.json({ ok: false, error: "authentication_service_unavailable" }, { status: 503 });
  }
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!hasRole(user, ["driver"])) return NextResponse.json({ ok: false, error: "approved_driver_required" }, { status: 403 });

  const { tripId } = await context.params;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(tripId)) {
    return NextResponse.json({ ok: false, error: "invalid_trip_id" }, { status: 400 });
  }

  try {
    const db = getServerDb();
    const tripRef = db.collection("trips").doc(tripId);
    const offerRef = db.collection("tripOffers").doc(`${tripId}_${user.uid}`);
    const driverRef = db.collection("drivers").doc(user.uid);
    const applicationRef = db.collection("driverApplications").doc(user.uid);
    const timelineRef = tripRef.collection("statusTimeline").doc();

    await db.runTransaction(async (transaction) => {
      const [tripSnapshot, offerSnapshot, driverSnapshot, applicationSnapshot] = await Promise.all([
        transaction.get(tripRef),
        transaction.get(offerRef),
        transaction.get(driverRef),
        transaction.get(applicationRef),
      ]);
      if (!applicationSnapshot.exists || applicationSnapshot.data()?.status !== "approved") {
        throw new Error("DRIVER_NOT_APPROVED");
      }
      const driverState = driverSnapshot.data() ?? {};
      if (driverState.activeTripId) throw new Error("DRIVER_HAS_ACTIVE_TRIP");
      if (!driverSnapshot.exists || driverState.isAvailable !== true) {
        throw new Error("DRIVER_NOT_AVAILABLE");
      }
      if (!tripSnapshot.exists) throw new Error("TRIP_NOT_AVAILABLE");
      if (!offerSnapshot.exists) throw new Error("OFFER_NOT_AVAILABLE");

      const trip = tripSnapshot.data() ?? {};
      const offer = offerSnapshot.data() ?? {};
      const expiresAt = offer.expiresAt;
      if (offer.driverUid !== user.uid || offer.tripId !== tripId ||
          offer.status !== "offered" ||
          typeof expiresAt?.toMillis !== "function" ||
          expiresAt.toMillis() <= Date.now()) {
        throw new Error("OFFER_NOT_AVAILABLE");
      }
      if (trip.status !== "searching" || trip.assignedDriverUid) {
        throw new Error("TRIP_ALREADY_ASSIGNED");
      }

      transaction.update(tripRef, {
        status: "accepted",
        assignedDriverUid: user.uid,
        acceptedAt: FieldValue.serverTimestamp(),
      });
      transaction.update(offerRef, {
        status: "accepted",
        acceptedAt: FieldValue.serverTimestamp(),
      });
      transaction.set(driverRef, {
        isAvailable: false,
        activeTripId: tripId,
        availabilityUpdatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      transaction.create(timelineRef, {
        from: "searching",
        to: "accepted",
        actorType: "driver",
        actorUid: user.uid,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({ ok: true, tripId, status: "accepted" }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "DRIVER_NOT_APPROVED") return NextResponse.json({ ok: false, error: "approved_driver_required" }, { status: 403 });
    if (code === "DRIVER_NOT_AVAILABLE" || code === "DRIVER_HAS_ACTIVE_TRIP") return NextResponse.json({ ok: false, error: "driver_not_available" }, { status: 409 });
    if (code === "TRIP_NOT_AVAILABLE" || code === "OFFER_NOT_AVAILABLE") return NextResponse.json({ ok: false, error: "offer_not_available_or_expired" }, { status: 404 });
    if (code === "TRIP_ALREADY_ASSIGNED") return NextResponse.json({ ok: false, error: "trip_already_assigned" }, { status: 409 });
    return NextResponse.json({ ok: false, error: "trip_acceptance_failed" }, { status: 503 });
  }
}
