import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";

const projectId = "demo-capital-taxi";
let testEnv: RulesTestEnvironment;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

after(async () => {
  await testEnv?.cleanup();
});

test("unauthenticated clients cannot read trip documents", async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "trips/rules-fixture"), {
      status: "pending",
    });
  });

  const db = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, "trips/rules-fixture")));
});

test("authenticated customers cannot read application data directly", async () => {
  const db = testEnv.authenticatedContext("customer-1", {
    role: "customer",
  }).firestore();

  await assertFails(getDoc(doc(db, "config/tripPricing")));
});

test("driver and admin claims do not grant direct Firestore write access", async () => {
  const driverDb = testEnv.authenticatedContext("driver-1", {
    role: "driver",
    driverApproved: true,
  }).firestore();
  const adminDb = testEnv.authenticatedContext("admin-1", {
    role: "admin",
  }).firestore();

  await assertFails(
    setDoc(doc(driverDb, "drivers/driver-1"), { isAvailable: true }),
  );
  await assertFails(
    setDoc(doc(adminDb, "config/tripPricing"), { baseFare: 100 }),
  );
});

test("authenticated users cannot delete protected records", async () => {
  const db = testEnv.authenticatedContext("customer-2").firestore();

  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "adminAuditLogs/fixture"), {
      action: "fixture",
    });
  });

  await assertFails(deleteDoc(doc(db, "adminAuditLogs/fixture")));
});

test("the test suite is explicitly isolated from production project ids", () => {
  assert.match(projectId, /^demo-/);
});
