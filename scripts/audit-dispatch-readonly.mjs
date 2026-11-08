import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { FieldPath, getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID;
const confirmation = process.argv.find((arg) => arg.startsWith("--confirm-project="))?.split("=")[1];

if (!projectId || confirmation !== projectId) {
  console.error("Refusing to run. Set FIREBASE_PROJECT_ID and pass --confirm-project=<same-project-id>.");
  process.exit(2);
}

const app = getApps()[0] ?? initializeApp({
  credential: applicationDefault(),
  projectId,
});
const db = getFirestore(app);
const pageSize = 250;
const statusCounts = {};
const issues = {
  pendingMissingCreatedAt: 0,
  searchingMissingLastDispatchAt: 0,
  searchingInvalidDispatchStage: 0,
};
let scanned = 0;
let cursor;

try {
  const configSnapshot = await db.collection("config").doc("dispatch").get();
  const config = configSnapshot.exists ? configSnapshot.data() ?? {} : null;
  const radii = config?.stageRadiiKm;
  const validConfig = Array.isArray(radii) && radii.length > 0 && radii.length <= 6 &&
    radii.every((value, index) => typeof value === "number" &&
      Number.isFinite(value) && value > 0 &&
      (index === 0 || value > radii[index - 1]));
  const stageCount = validConfig ? radii.length : null;

  while (true) {
    let query = db.collection("trips")
      .orderBy(FieldPath.documentId())
      .limit(pageSize);
    if (cursor) query = query.startAfter(cursor);

    const snapshot = await query.get();
    if (snapshot.empty) break;

    for (const doc of snapshot.docs) {
      const trip = doc.data();
      scanned += 1;
      const status = typeof trip.status === "string" ? trip.status : "(missing)";
      statusCounts[status] = (statusCounts[status] ?? 0) + 1;

      if (status === "pending" && !trip.createdAt) {
        issues.pendingMissingCreatedAt += 1;
      }
      if (status === "searching") {
        if (!trip.lastDispatchAt) issues.searchingMissingLastDispatchAt += 1;
        const stage = trip.dispatchStage;
        if (stageCount === null ||
            typeof stage !== "number" ||
            !Number.isInteger(stage) ||
            stage < 1 ||
            stage > stageCount) {
          issues.searchingInvalidDispatchStage += 1;
        }
      }
    }

    cursor = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < pageSize) break;
  }

  const report = {
    mode: "READ_ONLY",
    projectId,
    scannedTrips: scanned,
    dispatchConfig: {
      exists: Boolean(config),
      validStageRadii: validConfig,
      stageCount,
    },
    statusCounts,
    issues,
    note: "No Firestore documents were created, updated, or deleted. Review anomalies manually before any remediation.",
  };
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error("Read-only dispatch audit failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await app.delete();
}
