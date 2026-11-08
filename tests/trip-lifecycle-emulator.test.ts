import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { deleteApp, initializeApp, getApps, type App } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { setDriverAvailability, updateTripStatusForDriver } from "../lib/server/trip-lifecycle-core";

const projectId = "demo-capital-taxi";
let app: App;
before(() => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "", /^127\.0\.0\.1:8080$/);
  app = getApps().find((item) => item.name === "trip-lifecycle-emulator-tests") ??
    initializeApp({ projectId }, "trip-lifecycle-emulator-tests");
});
after(async () => { if (app) await deleteApp(app); });

test("driver completion releases the active trip and requires explicit return online", async () => {
  const db = getFirestore(app), tripId = `complete-${randomUUID()}`, driverUid = `driver-${randomUUID()}`;
  const tripRef = db.collection("trips").doc(tripId), driverRef = db.collection("drivers").doc(driverUid);
  const applicationRef = db.collection("driverApplications").doc(driverUid);
  try {
    const batch = db.batch();
    batch.set(tripRef, { status: "in_progress", assignedDriverUid: driverUid, createdAt: Timestamp.now() });
    batch.set(driverRef, { isAvailable: false, activeTripId: tripId });
    batch.set(applicationRef, { status: "approved" }); await batch.commit();
    await updateTripStatusForDriver(db, tripId, driverUid, "completed");
    const [trip, driver, timeline] = await Promise.all([tripRef.get(), driverRef.get(), tripRef.collection("statusTimeline").get()]);
    assert.equal(trip.data()?.status, "completed");
    assert.equal(driver.data()?.activeTripId, undefined);
    assert.equal(driver.data()?.isAvailable, false);
    assert.equal(timeline.size, 1);
    await setDriverAvailability(db, driverUid, true);
    assert.equal((await driverRef.get()).data()?.isAvailable, true);
  } finally {
    const cleanup = db.batch(); cleanup.delete(tripRef); cleanup.delete(driverRef); cleanup.delete(applicationRef);
    const events = await tripRef.collection("statusTimeline").get(); for (const event of events.docs) cleanup.delete(event.ref);
    await cleanup.commit();
  }
});

test("driver cannot change availability while assigned to an active trip", async () => {
  const db = getFirestore(app), driverUid = `busy-driver-${randomUUID()}`;
  const driverRef = db.collection("drivers").doc(driverUid), applicationRef = db.collection("driverApplications").doc(driverUid);
  try {
    const batch = db.batch(); batch.set(applicationRef, { status: "approved" });
    batch.set(driverRef, { isAvailable: false, activeTripId: `trip-${randomUUID()}` }); await batch.commit();
    await assert.rejects(setDriverAvailability(db, driverUid, true), /ACTIVE_TRIP_CANNOT_GO_ONLINE/);
    await assert.rejects(setDriverAvailability(db, driverUid, false), /ACTIVE_TRIP_CANNOT_GO_OFFLINE/);
    assert.equal((await driverRef.get()).data()?.isAvailable, false);
  } finally {
    const cleanup = db.batch(); cleanup.delete(driverRef); cleanup.delete(applicationRef); await cleanup.commit();
  }
});

test("unapproved drivers cannot update trip status or availability", async () => {
  const db = getFirestore(app), tripId = `unapproved-${randomUUID()}`, driverUid = `unapproved-driver-${randomUUID()}`;
  const tripRef = db.collection("trips").doc(tripId), driverRef = db.collection("drivers").doc(driverUid);
  const applicationRef = db.collection("driverApplications").doc(driverUid);
  try {
    const batch = db.batch(); batch.set(tripRef, { status: "in_progress", assignedDriverUid: driverUid });
    batch.set(driverRef, { isAvailable: false, activeTripId: tripId }); batch.set(applicationRef, { status: "pending" }); await batch.commit();
    await assert.rejects(updateTripStatusForDriver(db, tripId, driverUid, "completed"), /DRIVER_NOT_APPROVED/);
    await assert.rejects(setDriverAvailability(db, driverUid, true), /DRIVER_NOT_APPROVED/);
    assert.equal((await tripRef.get()).data()?.status, "in_progress");
  } finally {
    const cleanup = db.batch(); cleanup.delete(tripRef); cleanup.delete(driverRef); cleanup.delete(applicationRef); await cleanup.commit();
  }
});
