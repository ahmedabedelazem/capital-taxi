import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getServerDb } from "@/lib/server/firebase-admin";
import { hasRole, verifyRequestUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let user;
  try {
    user = await verifyRequestUser(request);
  } catch {
    return NextResponse.json({ ok: false, error: "authentication_service_unavailable" }, { status: 503 });
  }
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!hasRole(user, ["driver"])) return NextResponse.json({ ok: false, error: "approved_driver_required" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const data = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const lat = data.lat;
  const lng = data.lng;
  const accuracyMeters = data.accuracyMeters;
  if (typeof lat !== "number" || !Number.isFinite(lat) || lat < -90 || lat > 90 ||
      typeof lng !== "number" || !Number.isFinite(lng) || lng < -180 || lng > 180 ||
      typeof accuracyMeters !== "number" || !Number.isFinite(accuracyMeters) ||
      accuracyMeters < 0 || accuracyMeters > 200) {
    return NextResponse.json({ ok: false, error: "invalid_location" }, { status: 400 });
  }

  try {
    const db = getServerDb();
    const driverRef = db.collection("drivers").doc(user.uid);
    const applicationRef = db.collection("driverApplications").doc(user.uid);
    const now = Date.now();
    await db.runTransaction(async (transaction) => {
      const [application, driver] = await Promise.all([
        transaction.get(applicationRef),
        transaction.get(driverRef),
      ]);
      if (application.data()?.status !== "approved") throw new Error("DRIVER_NOT_APPROVED");
      const state = driver.data() ?? {};
      if (state.isAvailable !== true && typeof state.activeTripId !== "string") {
        throw new Error("DRIVER_NOT_ON_DUTY");
      }
      const lastUpdate = state.locationUpdatedAt;
      if (lastUpdate && typeof lastUpdate.toMillis === "function" &&
          now - lastUpdate.toMillis() < 2_000) {
        throw new Error("LOCATION_UPDATE_TOO_FREQUENT");
      }
      transaction.set(driverRef, {
        uid: user.uid,
        location: { lat, lng },
        locationAccuracyMeters: accuracyMeters,
        locationUpdatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });
    return NextResponse.json({ ok: true, received: true }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "DRIVER_NOT_APPROVED") return NextResponse.json({ ok: false, error: "approved_driver_required" }, { status: 403 });
    if (code === "DRIVER_NOT_ON_DUTY") return NextResponse.json({ ok: false, error: "driver_must_be_online_or_on_trip" }, { status: 409 });
    if (code === "LOCATION_UPDATE_TOO_FREQUENT") return NextResponse.json({ ok: false, error: "location_update_too_frequent" }, { status: 429 });
    return NextResponse.json({ ok: false, error: "location_update_failed" }, { status: 503 });
  }
}
