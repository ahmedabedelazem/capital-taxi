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

    const assignedDriverUid = typeof trip.assignedDriverUid === "string" ? trip.assignedDriverUid : null;
    const canSeeDriverContact = isCustomerOwner &&
      ["accepted", "driver_arrived", "in_progress"].includes(String(trip.status));
    let driver: { fullName: string | null; phone: string | null; vehicleType: string | null; vehicleModel: string | null; plateNumber: string | null } | null = null;
    if (assignedDriverUid && canSeeDriverContact) {
      const application = await db.collection("driverApplications").doc(assignedDriverUid).get();
      if (application.exists) {
        const details = application.data() ?? {};
        driver = {
          fullName: typeof details.fullName === "string" ? details.fullName : null,
          phone: typeof details.phone === "string" ? details.phone : null,
          vehicleType: typeof details.vehicleType === "string" ? details.vehicleType : null,
          vehicleModel: typeof details.vehicleModel === "string" ? details.vehicleModel : null,
          plateNumber: typeof details.plateNumber === "string" ? details.plateNumber : null,
        };
      }
    }

    let driverLocation: { lat: number; lng: number; updatedAt: string } | null = null;
    if (isCustomerOwner && assignedDriverUid && ["accepted", "driver_arrived", "in_progress"].includes(String(trip.status))) {
      const driverSnapshot = await db.collection("drivers").doc(assignedDriverUid).get();
      const driverState = driverSnapshot.data() ?? {};
      const location = driverState.location;
      const updatedAt = driverState.locationUpdatedAt;
      const updatedAtMillis = typeof updatedAt?.toMillis === "function" ? updatedAt.toMillis() : 0;
      const ageMs = Date.now() - updatedAtMillis;
      if (location && typeof location.lat === "number" && Number.isFinite(location.lat) &&
          typeof location.lng === "number" && Number.isFinite(location.lng) &&
          updatedAtMillis > 0 && ageMs >= 0 && ageMs <= 120_000) {
        driverLocation = {
          lat: location.lat,
          lng: location.lng,
          updatedAt: updatedAt.toDate().toISOString(),
        };
      }
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
        assigned: Boolean(assignedDriverUid),
        driver,
        driverLocation,
        createdAt: trip.createdAt?.toDate?.().toISOString?.() ?? null,
        timeline,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "trip_read_failed" }, { status: 503 });
  }
}
