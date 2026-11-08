import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { canTransitionTrip, isTripStatus, type TripStatus } from "../domain/trip";

export type TripCancellationActor = "admin" | "customer" | "driver";

export async function cancelTripForActor(
  db: Firestore, tripId: string, actorUid: string, actor: TripCancellationActor,
): Promise<number> {
  const tripRef = db.collection("trips").doc(tripId);
  const timelineRef = tripRef.collection("statusTimeline").doc();
  return db.runTransaction(async (transaction) => {
    const tripSnapshot = await transaction.get(tripRef);
    if (!tripSnapshot.exists) throw new Error("TRIP_NOT_FOUND");
    const trip = tripSnapshot.data() ?? {};
    const isCustomerOwner = actor === "customer" && trip.customerUid === actorUid;
    const isAssignedDriver = actor === "driver" && trip.assignedDriverUid === actorUid;
    if (actor !== "admin" && !isCustomerOwner && !isAssignedDriver) throw new Error("TRIP_NOT_ACCESSIBLE");
    if (!isTripStatus(trip.status)) throw new Error("INVALID_CURRENT_STATUS");
    const transition = canTransitionTrip({ current: trip.status, next: "cancelled", actor });
    if (!transition.allowed) throw new Error("CANCELLATION_NOT_ALLOWED");
    const assignedDriverUid = typeof trip.assignedDriverUid === "string" ? trip.assignedDriverUid : null;
    const offersQuery = db.collection("tripOffers").where("tripId", "==", tripId)
      .where("status", "in", ["offered", "accepted"]).limit(200);
    const [driverSnapshot, offersSnapshot] = await Promise.all([
      assignedDriverUid ? transaction.get(db.collection("drivers").doc(assignedDriverUid)) : Promise.resolve(null),
      transaction.get(offersQuery),
    ]);
    transaction.update(tripRef, {
      status: "cancelled", cancelledAt: FieldValue.serverTimestamp(),
      cancelledBy: { uid: actorUid, role: actor }, updatedAt: FieldValue.serverTimestamp(),
    });
    if (assignedDriverUid && driverSnapshot?.exists && driverSnapshot.data()?.activeTripId === tripId) {
      transaction.set(db.collection("drivers").doc(assignedDriverUid), {
        activeTripId: FieldValue.delete(), isAvailable: false,
        availabilityUpdatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    for (const offer of offersSnapshot.docs) transaction.update(offer.ref, {
      status: "cancelled", cancelledAt: FieldValue.serverTimestamp(),
    });
    transaction.create(timelineRef, {
      from: trip.status, to: "cancelled", actorType: actor, actorUid,
      cancelledOffers: offersSnapshot.size, createdAt: FieldValue.serverTimestamp(),
    });
    return offersSnapshot.size;
  });
}

export async function updateTripStatusForDriver(
  db: Firestore, tripId: string, driverUid: string, nextStatus: TripStatus,
): Promise<void> {
  const tripRef = db.collection("trips").doc(tripId);
  const driverRef = db.collection("drivers").doc(driverUid);
  const applicationRef = db.collection("driverApplications").doc(driverUid);
  const timelineRef = tripRef.collection("statusTimeline").doc();
  await db.runTransaction(async (transaction) => {
    const [tripSnapshot, driverSnapshot, applicationSnapshot] = await Promise.all([
      transaction.get(tripRef), transaction.get(driverRef), transaction.get(applicationRef),
    ]);
    if (applicationSnapshot.data()?.status !== "approved") throw new Error("DRIVER_NOT_APPROVED");
    if (!tripSnapshot.exists) throw new Error("TRIP_NOT_FOUND");
    const trip = tripSnapshot.data() ?? {};
    if (trip.assignedDriverUid !== driverUid || driverSnapshot.data()?.activeTripId !== tripId) {
      throw new Error("TRIP_NOT_ASSIGNED_TO_DRIVER");
    }
    if (!isTripStatus(trip.status)) throw new Error("INVALID_CURRENT_STATUS");
    const transition = canTransitionTrip({ current: trip.status, next: nextStatus, actor: "driver" });
    if (!transition.allowed) throw new Error("INVALID_TRANSITION");
    const updates: Record<string, unknown> = { status: nextStatus, updatedAt: FieldValue.serverTimestamp() };
    if (nextStatus === "driver_arrived") updates.driverArrivedAt = FieldValue.serverTimestamp();
    if (nextStatus === "in_progress") updates.startedAt = FieldValue.serverTimestamp();
    if (nextStatus === "completed") {
      updates.completedAt = FieldValue.serverTimestamp();
      transaction.set(driverRef, {
        activeTripId: FieldValue.delete(), isAvailable: false,
        availabilityUpdatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    transaction.update(tripRef, updates);
    transaction.create(timelineRef, {
      from: trip.status, to: nextStatus, actorType: "driver", actorUid: driverUid,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function setDriverAvailability(db: Firestore, driverUid: string, isAvailable: boolean): Promise<void> {
  const driverRef = db.collection("drivers").doc(driverUid);
  await db.runTransaction(async (transaction) => {
    const [application, driver] = await Promise.all([
      transaction.get(db.collection("driverApplications").doc(driverUid)), transaction.get(driverRef),
    ]);
    if (application.data()?.status !== "approved") throw new Error("DRIVER_NOT_APPROVED");
    if (driver.data()?.activeTripId) throw new Error(isAvailable ? "ACTIVE_TRIP_CANNOT_GO_ONLINE" : "ACTIVE_TRIP_CANNOT_GO_OFFLINE");
    transaction.set(driverRef, {
      uid: driverUid, isAvailable, availabilityUpdatedAt: FieldValue.serverTimestamp(),
      ...(isAvailable ? { lastOnlineAt: FieldValue.serverTimestamp() } : {}),
    }, { merge: true });
  });
}
