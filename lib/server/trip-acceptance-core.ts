import { FieldValue, type Firestore } from "firebase-admin/firestore";

/**
 * Atomically claims a searching trip for one approved driver.
 * Authentication and signed role verification are performed by the API route;
 * this function re-checks server-owned approval, availability, and offer state
 * in the same transaction that assigns the trip.
 */
export async function acceptTripForDriver(
  db: Firestore,
  tripId: string,
  driverUid: string,
): Promise<void> {
  const tripRef = db.collection("trips").doc(tripId);
  const offerRef = db.collection("tripOffers").doc(`${tripId}_${driverUid}`);
  const driverRef = db.collection("drivers").doc(driverUid);
  const applicationRef = db.collection("driverApplications").doc(driverUid);
  const timelineRef = tripRef.collection("statusTimeline").doc();

  await db.runTransaction(async (transaction) => {
    const competingOffersQuery = db.collection("tripOffers")
      .where("tripId", "==", tripId)
      .where("status", "==", "offered");
    const [tripSnapshot, offerSnapshot, driverSnapshot, applicationSnapshot, competingOffersSnapshot] = await Promise.all([
      transaction.get(tripRef),
      transaction.get(offerRef),
      transaction.get(driverRef),
      transaction.get(applicationRef),
      transaction.get(competingOffersQuery),
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
    if (offer.driverUid !== driverUid || offer.tripId !== tripId ||
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
      assignedDriverUid: driverUid,
      acceptedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(offerRef, {
      status: "accepted",
      acceptedAt: FieldValue.serverTimestamp(),
    });
    for (const competingOffer of competingOffersSnapshot.docs) {
      if (competingOffer.ref.path === offerRef.path) continue;
      transaction.update(competingOffer.ref, {
        status: "withdrawn",
        withdrawnAt: FieldValue.serverTimestamp(),
      });
    }
    transaction.set(driverRef, {
      isAvailable: false,
      activeTripId: tripId,
      availabilityUpdatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.create(timelineRef, {
      from: "searching",
      to: "accepted",
      actorType: "driver",
      actorUid: driverUid,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}
