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
  const isAvailable = body && typeof body === "object"
    ? (body as Record<string, unknown>).isAvailable
    : undefined;
  if (typeof isAvailable !== "boolean") {
    return NextResponse.json({ ok: false, error: "isAvailable_must_be_boolean" }, { status: 400 });
  }

  try {
    const db = getServerDb();
    const driverRef = db.collection("drivers").doc(user.uid);
    await db.runTransaction(async (transaction) => {
      const [application, driver] = await Promise.all([
        transaction.get(db.collection("driverApplications").doc(user.uid)),
        transaction.get(driverRef),
      ]);
      if (application.data()?.status !== "approved") {
        throw new Error("DRIVER_NOT_APPROVED");
      }
      if (!isAvailable && driver.data()?.activeTripId) {
        throw new Error("ACTIVE_TRIP_CANNOT_GO_OFFLINE");
      }
      transaction.set(driverRef, {
        uid: user.uid,
        isAvailable,
        availabilityUpdatedAt: FieldValue.serverTimestamp(),
        ...(isAvailable ? { lastOnlineAt: FieldValue.serverTimestamp() } : {}),
      }, { merge: true });
    });
    return NextResponse.json({ ok: true, isAvailable }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "DRIVER_NOT_APPROVED") {
      return NextResponse.json({ ok: false, error: "approved_driver_required" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "ACTIVE_TRIP_CANNOT_GO_OFFLINE") {
      return NextResponse.json({ ok: false, error: "active_trip_cannot_go_offline" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: "availability_update_failed" }, { status: 503 });
  }
}
