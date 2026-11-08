import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { deleteApp, initializeApp, getApps, type App } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { cancelTripForActor } from "../lib/server/trip-lifecycle-core";

const projectId = "demo-capital-taxi";
let app: App;

before(() => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "", /^127\.0\.0\.1:8080$/);
  app = getApps().find((item) => item.name === "trip-lifecycle-emulator-tests") ??
    initializeApp({ projectId }, "trip-lifecycle-emulator-tests");
});

after(async () => {
  if (app) await deleteApp(app);
});

test("cancelling an accepted trip clears the driver and cancels accepted and offered offers", async () => {
  const db = getFirestore(app);
  const tripId = `cancel-${randomUUID()}`;
  const customerUid = `customer-${randomUUID()}`;
  const driverUid = `driver-${randomUUID()}`;
  const tripRef = db.collection("trips").doc(tripId);
  const driverRef = db.collection("drivers").doc(driverUid);
  const offerRefs = [
    db.collection("tripOffers").doc(`${tripId}-accepted`),
    db.collection("tripOffers").doc(`${tripId}-offered`),
  ];
  try {
    const batch = db.batch();
    batch.set(tripRef, {
      status: "accepted",
      customerUid,
      assignedDriverUid: driverUid,
      createdAt: Timestamp.now(),
    });
    batch.set(driverRef, { isAvailable: false, activeTripId: tripId });
    batch.set(offerRefs[0], { tripId, driverUid, status: "accepted" });
    batch.set(offerRefs[1], { tripId, driverUid: "another-driver", status: "offered" });
    await batch.commit();

    const cancelledOffers = await cancelTripForActor(db, tripId, customerUid, "customer");
    assert.equal(cancelledOffers, 2);

    const [trip, driver, offers, timeline] = await Promise.all([
      tripRef.get(),
      driverRef.get(),
      Promise.all(offerRefs.map((ref) => ref.get())),
      tripRef.collection("statusTimeline").get(),
    ]);
    assert.equal(trip.data()?.status, "cancelled");
    assert.equal(trip.data()?.cancelledBy?.uid, customerUid);
    assert.equal(driver.data()?.activeTripId, undefined);
    assert.equal(driver.data()?.isAvailable, false);
    assert.deepEqual(offers.map((item) => item.data()?.status), ["cancelled", "cancelled"]);
    assert.equal(timeline.size, 1);
    assert.equal(timeline.docs[0].data()?.cancelledOffers, 2);
  } finally {
    const cleanup = db.batch();
    cleanup.delete(tripRef);
    cleanup.delete(driverRef);
    for (const ref of offerRefs) cleanup.delete(ref);
    const timeline = await tripRef.collection("statusTimeline").get();
    for (const event of timeline.docs) cleanup.delete(event.ref);
    await cleanup.commit();
  }
});

test("a customer cannot cancel another customer's trip", async () => {
  const db = getFirestore(app);
  const tripId = `protected-${randomUUID()}`;
  const tripRef = db.collection("trips").doc(tripId);
  try {
    await tripRef.set({
      status: "searching",
      customerUid: `owner-${randomUUID()}`,
      createdAt: Timestamp.now(),
    });
    await assert.rejects(
      cancelTripForActor(db, tripId, `intruder-${randomUUID()}`, "customer"),
      /TRIP_NOT_ACCESSIBLE/,
    );
    assert.equal((await tripRef.get()).data()?.status, "searching");
  } finally {
    const cleanup = db.batch();
    cleanup.delete(tripRef);
    const timeline = await tripRef.collection("statusTimeline").get();
    for (const event of timeline.docs) cleanup.delete(event.ref);
    await cleanup.commit();
  }
});
