import { NextResponse } from "next/server";
import { getServerDb } from "@/lib/server/firebase-admin";
import { hasRole, verifyRequestUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ tripId: string }> },
) {
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

  try {
    const db = getServerDb();
    const tripRef = db.collection("trips").doc(tripId);
    const snapshot = await tripRef.get();
    if (!snapshot.exists) return NextResponse.json({ ok: false, error: "trip_not_found" }, { status: 404 });

    const trip = snapshot.data() ?? {};
    const isAdmin = hasRole(user, ["admin"]);
    const isCustomerOwner = trip.customerUid === user.uid;
    const isAssignedDriver = trip.assignedDriverUid === user.uid && hasRole(user, ["driver"]);
    if (!isAdmin && !isCustomerOwner && !isAssignedDriver) {
      return NextResponse.json({ ok: false, error: "trip_not_found" }, { status: 404 });
    }

    const timelineSnapshot = await tripRef.collection("statusTimeline")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();
    const timeline = timelineSnapshot.docs.map((doc) => {
      const event = doc.data();
      return {
        from: typeof event.from === "string" ? event.from : null,
        to: typeof event.to === "string" ? event.to : null,
        eventType: typeof event.eventType === "string" ? event.eventType : null,
        createdAt: event.createdAt?.toDate?.().toISOString?.() ?? null,
      };
    });

    return NextResponse.json({
      ok: true,
      trip: {
        tripId: snapshot.id,
        status: typeof trip.status === "string" ? trip.status : "unknown",
        pickupLabel: typeof trip.pickup?.label === "string" ? trip.pickup.label : null,
        destinationLabel: typeof trip.destination?.label === "string" ? trip.destination.label : null,
        fareEstimate: typeof trip.fareEstimate === "number" ? trip.fareEstimate : null,
        distanceKm: typeof trip.distanceKm === "number" ? trip.distanceKm : null,
        vehicleCategory: typeof trip.vehicleCategory === "string" ? trip.vehicleCategory : null,
        paymentMethod: typeof trip.paymentMethod === "string" ? trip.paymentMethod : null,
        assigned: typeof trip.assignedDriverUid === "string" && trip.assignedDriverUid.length > 0,
        createdAt: trip.createdAt?.toDate?.().toISOString?.() ?? null,
        timeline,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "trip_read_failed" }, { status: 503 });
  }
}
