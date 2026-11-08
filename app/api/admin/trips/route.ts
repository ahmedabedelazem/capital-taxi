import { NextResponse } from "next/server";
import { getServerDb } from "@/lib/server/firebase-admin";
import { hasRole, verifyRequestUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const visibleStatuses = new Set([
  "pending", "searching", "accepted", "driver_arrived", "in_progress",
  "completed", "cancelled", "no_driver",
]);

function iso(value: unknown): string | null {
  if (value && typeof value === "object" && "toDate" in value &&
      typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

export async function GET(request: Request) {
  let user;
  try {
    user = await verifyRequestUser(request);
  } catch {
    return NextResponse.json({ ok: false, error: "authentication_service_unavailable" }, { status: 503 });
  }
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!hasRole(user, ["admin"])) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const requestedStatus = url.searchParams.get("status");
  if (requestedStatus && requestedStatus !== "all" && !visibleStatuses.has(requestedStatus)) {
    return NextResponse.json({ ok: false, error: "invalid_status_filter" }, { status: 400 });
  }

  try {
    const db = getServerDb();
    const snapshot = await db.collection("trips").orderBy("createdAt", "desc").limit(100).get();
    const records = snapshot.docs
      .map((doc) => ({ id: doc.id, data: doc.data() }))
      .filter(({ data }) => requestedStatus === "all"
        ? true
        : requestedStatus
          ? data.status === requestedStatus
          : visibleStatuses.has(String(data.status)));

    const driverUids = [...new Set(records
      .map(({ data }) => data.assignedDriverUid)
      .filter((uid): uid is string => typeof uid === "string" && uid.length > 0))];
    const driverSnapshots = driverUids.length
      ? await db.getAll(...driverUids.map((uid) => db.collection("drivers").doc(uid)))
      : [];
    const drivers = new Map(driverSnapshots.map((doc) => [doc.id, doc.data() ?? {}]));

    const trips = records.slice(0, 50).map(({ id, data }) => {
      const driverUid = typeof data.assignedDriverUid === "string" ? data.assignedDriverUid : null;
      const driver = driverUid ? drivers.get(driverUid) : undefined;
      const locationUpdatedAt = iso(driver?.locationUpdatedAt);
      const locationAgeMs = locationUpdatedAt ? Date.now() - Date.parse(locationUpdatedAt) : null;
      const location = driver?.location && typeof driver.location.lat === "number" &&
        typeof driver.location.lng === "number" && locationAgeMs !== null &&
        locationAgeMs >= 0 && locationAgeMs <= 120_000
        ? { lat: driver.location.lat, lng: driver.location.lng, updatedAt: locationUpdatedAt }
        : null;

      return {
        tripId: id,
        status: typeof data.status === "string" ? data.status : "unknown",
        pickupLabel: typeof data.pickup?.label === "string" ? data.pickup.label : null,
        destinationLabel: typeof data.destination?.label === "string" ? data.destination.label : null,
        fareEstimate: typeof data.fareEstimate === "number" ? data.fareEstimate : null,
        distanceKm: typeof data.distanceKm === "number" ? data.distanceKm : null,
        vehicleCategory: typeof data.vehicleCategory === "string" ? data.vehicleCategory : null,
        paymentMethod: typeof data.paymentMethod === "string" ? data.paymentMethod : null,
        driverUid,
        driverLocation: location,
        createdAt: iso(data.createdAt),
        updatedAt: iso(data.updatedAt),
      };
    });

    return NextResponse.json({ ok: true, trips, count: trips.length }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "admin_trips_read_failed" }, { status: 503 });
  }
}
