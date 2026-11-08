import { NextResponse } from "next/server";
import { getServerDb } from "@/lib/server/firebase-admin";
import { hasRole, verifyRequestUser } from "@/lib/server/auth";
import { cancelTripForActor } from "@/lib/server/trip-lifecycle-core";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ tripId: string }> };

export async function POST(request: Request, context: RouteContext) {
  let user;
  try {
    user = await verifyRequestUser(request);
  } catch {
    return NextResponse.json({ ok: false, error: "authentication_service_unavailable" }, { status: 503 });
  }
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { tripId } = await context.params;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(tripId)) {
    return NextResponse.json({ ok: false, error: "invalid_trip_id" }, { status: 400 });
  }

  const actor = hasRole(user, ["admin"])
    ? "admin"
    : hasRole(user, ["driver"])
      ? "driver"
      : hasRole(user, ["customer"])
        ? "customer"
        : null;
  if (!actor) return NextResponse.json({ ok: false, error: "trip_not_found" }, { status: 404 });

  try {
    await cancelTripForActor(getServerDb(), tripId, user.uid, actor);
    return NextResponse.json({ ok: true, tripId, status: "cancelled" }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "TRIP_NOT_FOUND" || code === "TRIP_NOT_ACCESSIBLE") {
      return NextResponse.json({ ok: false, error: "trip_not_found" }, { status: 404 });
    }
    if (code === "CANCELLATION_NOT_ALLOWED" || code === "INVALID_CURRENT_STATUS") {
      return NextResponse.json({ ok: false, error: "trip_cannot_be_cancelled_in_current_status" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: "trip_cancellation_failed" }, { status: 503 });
  }
}
