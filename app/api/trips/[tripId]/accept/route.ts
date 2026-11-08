import { NextResponse } from "next/server";
import { getServerDb } from "@/lib/server/firebase-admin";
import { acceptTripForDriver } from "@/lib/server/trip-acceptance-core";
import { hasRole, verifyRequestUser } from "@/lib/server/auth";

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
  if (!hasRole(user, ["driver"])) return NextResponse.json({ ok: false, error: "approved_driver_required" }, { status: 403 });

  const { tripId } = await context.params;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(tripId)) {
    return NextResponse.json({ ok: false, error: "invalid_trip_id" }, { status: 400 });
  }

  try {
    const db = getServerDb();
    const tripRef = db.collection("trips").doc(tripId);
    const offerRef = db.collection("tripOffers").doc(`${tripId}_${user.uid}`);
    const driverRef = db.collection("drivers").doc(user.uid);
    const applicationRef = db.collection("driverApplications").doc(user.uid);
    const timelineRef = tripRef.collection("statusTimeline").doc();

    await acceptTripForDriver(db, tripId, user.uid);

    return NextResponse.json({ ok: true, tripId, status: "accepted" }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "DRIVER_NOT_APPROVED") return NextResponse.json({ ok: false, error: "approved_driver_required" }, { status: 403 });
    if (code === "DRIVER_NOT_AVAILABLE" || code === "DRIVER_HAS_ACTIVE_TRIP") return NextResponse.json({ ok: false, error: "driver_not_available" }, { status: 409 });
    if (code === "TRIP_NOT_AVAILABLE" || code === "OFFER_NOT_AVAILABLE") return NextResponse.json({ ok: false, error: "offer_not_available_or_expired" }, { status: 404 });
    if (code === "TRIP_ALREADY_ASSIGNED") return NextResponse.json({ ok: false, error: "trip_already_assigned" }, { status: 409 });
    return NextResponse.json({ ok: false, error: "trip_acceptance_failed" }, { status: 503 });
  }
}
