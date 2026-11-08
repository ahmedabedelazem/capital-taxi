import { NextResponse } from "next/server";
import { getServerDb } from "@/lib/server/firebase-admin";
import { hasRole, verifyRequestUser } from "@/lib/server/auth";
import { isTripStatus, type TripStatus } from "@/lib/domain/trip";
import { updateTripStatusForDriver } from "@/lib/server/trip-lifecycle-core";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ tripId: string }> };
const driverSteps = new Set<TripStatus>(["driver_arrived", "in_progress", "completed"]);

export async function POST(request: Request, context: RouteContext) {
  let user;
  try { user = await verifyRequestUser(request); }
  catch { return NextResponse.json({ ok: false, error: "authentication_service_unavailable" }, { status: 503 }); }
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!hasRole(user, ["driver"])) return NextResponse.json({ ok: false, error: "approved_driver_required" }, { status: 403 });

  const { tripId } = await context.params;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(tripId)) return NextResponse.json({ ok: false, error: "invalid_trip_id" }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 }); }
  const nextStatus = body && typeof body === "object" ? (body as Record<string, unknown>).status : undefined;
  if (!isTripStatus(nextStatus) || !driverSteps.has(nextStatus)) {
    return NextResponse.json({ ok: false, error: "invalid_driver_trip_status" }, { status: 400 });
  }

  try {
    await updateTripStatusForDriver(getServerDb(), tripId, user.uid, nextStatus);
    return NextResponse.json({ ok: true, tripId, status: nextStatus }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "DRIVER_NOT_APPROVED") return NextResponse.json({ ok: false, error: "approved_driver_required" }, { status: 403 });
    if (code === "TRIP_NOT_FOUND") return NextResponse.json({ ok: false, error: "trip_not_found" }, { status: 404 });
    if (code === "TRIP_NOT_ASSIGNED_TO_DRIVER") return NextResponse.json({ ok: false, error: "trip_not_assigned_to_driver" }, { status: 403 });
    if (code === "INVALID_CURRENT_STATUS" || code === "INVALID_TRANSITION") return NextResponse.json({ ok: false, error: "invalid_trip_transition" }, { status: 409 });
    return NextResponse.json({ ok: false, error: "trip_status_update_failed" }, { status: 503 });
  }
}
