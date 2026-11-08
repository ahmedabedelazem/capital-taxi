import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { canTransitionTrip, isTripStatus } from "../domain/trip";

export type TripCancellationActor = "admin" | "customer" | "driver";

/**
 * Cancels a trip and its live offers atomically.
 * The API route verifies the signed-in identity; this core re-checks trip ownership
 * and all Firestore state inside the transaction.
 */
export async function cancelTripForActor(
  db: Firestore,
  tripId: string,
  actorUid: string,
  actor: TripCancellationActor,
): Promise<number> {
  const tripRef = db.collection("trips").doc(tripId);
  const timelineRef = tripRef.collection("statusTimeline").doc();

  return db.runTransaction(async (transaction) => {
    const tripSnapshot = await transaction.get(tripRef);
    if (!tripSnapshot.exists) throw new Error("TRIP_NOT_FOUND");
    const trip = tripSnapshot.data() ?? {};

    const isCustomerOwner = actor === "customer" && trip.customerUid === actorUid;
    const isAssignedDriver = actor === "driver" && trip.assignedDriverUid === actorUid;
    if (actor !== "admin" && !isCustomerOwner && !isAssignedDriver) {
      throw new Error("TRIP_NOT_ACCESSIBLE");
    }
    if (!isTripStatus(trip.status)) throw new Error("INVALID_CURRENT_STATUS");

    const transition = canTransitionTrip({ current: trip.status, next: "cancelled", actor });
    if (!transition.allowed) throw new Error("CANCELLATION_NOT_ALLOWED");

    const assignedDriverUid = typeof trip.assignedDriverUid === "string"
      ? trip.assignedDriverUid
      : null;
    const offersQuery = db.collection("tripOffers")
      .where("tripId", "==", tripId)
      .where("status", "in", ["offered", "accepted"])
      .limit(200);
    const [driverSnapshot, offersSnapshot] = await Promise.all([
      assignedDriverUid
        ? transaction.get(db.collection("drivers").doc(assignedDriverUid))
        : Promise.resolve(null),
      transaction.get(offersQuery),
    ]);

    transaction.update(tripRef, {
      status: "cancelled",
      cancelledAt: FieldValue.serverTimestamp(),
      cancelledBy: { uid: actorUid, role: actor },
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (assignedDriverUid && driverSnapshot?.exists &&
        driverSnapshot.data()?.activeTripId === tripId) {
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
      actorUid,
      cancelledOffers: offersSnapshot.size,
      createdAt: FieldValue.serverTimestamp(),
    });

    return offersSnapshot.size;
  });
}
