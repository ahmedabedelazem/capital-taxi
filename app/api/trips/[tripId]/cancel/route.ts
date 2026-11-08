import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getServerDb } from "@/lib/server/firebase-admin";
import { hasRole, verifyRequestUser } from "@/lib/server/auth";
import { canTransitionTrip, isTripStatus } from "@/lib/domain/trip";

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

  const { tripId } = await context.params;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(tripId)) {
    return NextResponse.json({ ok: false, error: "invalid_trip_id" }, { status: 400 });
  }

  try {
    const db = getServerDb();
    const tripRef = db.collection("trips").doc(tripId);
    const timelineRef = tripRef.collection("statusTimeline").doc();

    await db.runTransaction(async (transaction) => {
      const tripSnapshot = await transaction.get(tripRef);
      if (!tripSnapshot.exists) throw new Error("TRIP_NOT_FOUND");
      const trip = tripSnapshot.data() ?? {};
      const isAdmin = hasRole(user, ["admin"]);
      const isCustomerOwner = hasRole(user, ["customer"]) && trip.customerUid === user.uid;
      const isAssignedDriver = hasRole(user, ["driver"]) && trip.assignedDriverUid === user.uid;
      if (!isAdmin && !isCustomerOwner && !isAssignedDriver) throw new Error("TRIP_NOT_ACCESSIBLE");
      if (!isTripStatus(trip.status)) throw new Error("INVALID_CURRENT_STATUS");

      const actor = isAdmin ? "admin" : isAssignedDriver ? "driver" : "customer";
      const transition = canTransitionTrip({ current: trip.status, next: "cancelled", actor });
      if (!transition.allowed) throw new Error("CANCELLATION_NOT_ALLOWED");

      const assignedDriverUid = typeof trip.assignedDriverUid === "string" ? trip.assignedDriverUid : null;
      const offersQuery = db.collection("tripOffers")
        .where("tripId", "==", tripId)
        .where("status", "in", ["offered", "accepted"])
        .limit(200);
      const [driverSnapshot, offersSnapshot] = await Promise.all([
        assignedDriverUid ? transaction.get(db.collection("drivers").doc(assignedDriverUid)) : Promise.resolve(null),
        transaction.get(offersQuery),
      ]);

      transaction.update(tripRef, {
        status: "cancelled",
        cancelledAt: FieldValue.serverTimestamp(),
        cancelledBy: { uid: user.uid, role: actor },
        updatedAt: FieldValue.serverTimestamp(),
      });
      if (assignedDriverUid && driverSnapshot?.exists && driverSnapshot.data()?.activeTripId === tripId) {
        transaction.set(db.collection("drivers").doc(assignedDriverUid), {
          activeTripId: FieldValue.delete(),
          isAvailable: false,
          availabilityUpdatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      for (const offer of offersSnapshot.docs) {
        transaction.update(offer.ref, {
          status: "cancelled",
          cancelledAt: FieldValue.serverTimestamp(),
        });
      }
      transaction.create(timelineRef, {
        from: trip.status,
        to: "cancelled",
        actorType: actor,
        actorUid: user.uid,
        cancelledOffers: offersSnapshot.size,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({ ok: true, tripId, status: "cancelled" }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "TRIP_NOT_FOUND" || code === "TRIP_NOT_ACCESSIBLE") {
      return NextResponse.json({ ok: false, error: "trip_not_found" }, { status: 404 });
    }
    if (code === "CANCELLATION_NOT_ALLOWED" || code === "INVALID_CURRENT_STATUS") {
      return NextResponse.json({ ok: false, error: "trip_cannot_be_cancelled_in_current_status" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: "trip_cancellation_failed" }, { status: 503 });
  }
}
