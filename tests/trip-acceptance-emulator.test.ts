import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { initializeApp, getApps, type App } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { acceptTripForDriver } from "../lib/server/trip-acceptance-core";

const projectId = "demo-capital-taxi";
let app: App;

before(() => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "", /^127\.0\.0\.1:8080$/);
  app = getApps().find((item) => item.name === "trip-acceptance-emulator-tests") ??
    initializeApp({ projectId }, "trip-acceptance-emulator-tests");
});

after(async () => {
  if (app) await app.delete();
});

test("two drivers racing for one trip produce exactly one winner", async () => {
  const db = getFirestore(app);
  const tripId = `race-${randomUUID()}`;
  const driverUids = [`driver-a-${randomUUID()}`, `driver-b-${randomUUID()}`];
  const tripRef = db.collection("trips").doc(tripId);
  const offerRefs = driverUids.map((uid) => db.collection("tripOffers").doc(`${tripId}_${uid}`));
  const driverRefs = driverUids.map((uid) => db.collection("drivers").doc(uid));
  const applicationRefs = driverUids.map((uid) => db.collection("driverApplications").doc(uid));

  try {
    const batch = db.batch();
    batch.set(tripRef, {
      status: "searching",
      assignedDriverUid: null,
      dispatchStage: 1,
      createdAt: Timestamp.now(),
    });
    for (let index = 0; index < driverUids.length; index += 1) {
      batch.set(driverRefs[index], { isAvailable: true });
      batch.set(applicationRefs[index], { status: "approved" });
      batch.set(offerRefs[index], {
        tripId,
        driverUid: driverUids[index],
        status: "offered",
        expiresAt: Timestamp.fromMillis(Date.now() + 60_000),
      });
    }
    await batch.commit();

    const outcomes = await Promise.allSettled(
      driverUids.map((uid) => acceptTripForDriver(db, tripId, uid)),
    );
    const winners = outcomes.flatMap((outcome, index) =>
      outcome.status === "fulfilled" ? [driverUids[index]] : [],
    );
    assert.equal(winners.length, 1, "only one concurrent acceptance may commit");

    const [tripSnapshot, offerSnapshots, driverSnapshots, timelineSnapshot] = await Promise.all([
      tripRef.get(),
      Promise.all(offerRefs.map((ref) => ref.get())),
      Promise.all(driverRefs.map((ref) => ref.get())),
      tripRef.collection("statusTimeline").get(),
    ]);
    const assignedDriverUid = tripSnapshot.data()?.assignedDriverUid;
    assert.equal(tripSnapshot.data()?.status, "accepted");
    assert.equal(assignedDriverUid, winners[0]);

    const winnerIndex = driverUids.indexOf(winners[0]);
    const loserIndex = winnerIndex === 0 ? 1 : 0;
    assert.equal(offerSnapshots[winnerIndex].data()?.status, "accepted");
    assert.equal(offerSnapshots[loserIndex].data()?.status, "withdrawn");
    assert.equal(driverSnapshots[winnerIndex].data()?.activeTripId, tripId);
    assert.equal(driverSnapshots[winnerIndex].data()?.isAvailable, false);
    assert.equal(driverSnapshots[loserIndex].data()?.isAvailable, true);
    assert.equal(timelineSnapshot.size, 1);
  } finally {
    const cleanup = db.batch();
    cleanup.delete(tripRef);
    for (const ref of [...offerRefs, ...driverRefs, ...applicationRefs]) cleanup.delete(ref);
    const timeline = await tripRef.collection("statusTimeline").get();
    for (const event of timeline.docs) cleanup.delete(event.ref);
    await cleanup.commit();
  }
});
