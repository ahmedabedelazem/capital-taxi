import { NextResponse } from "next/server";
import { getServerDb } from "@/lib/server/firebase-admin";
import { hasRole, verifyRequestUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

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
  if (!hasRole(user, ["customer"])) {
    return NextResponse.json({ ok: false, error: "customer_account_required" }, { status: 403 });
  }

  try {
    const snapshot = await getServerDb().collection("trips")
      .where("customerUid", "==", user.uid)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();
    const trips = snapshot.docs
      .map((doc) => {
        const trip = doc.data();
        return {
          tripId: doc.id,
          status: typeof trip.status === "string" ? trip.status : "unknown",
          pickupLabel: typeof trip.pickup?.label === "string" ? trip.pickup.label : null,
          destinationLabel: typeof trip.destination?.label === "string" ? trip.destination.label : null,
          fareEstimate: typeof trip.fareEstimate === "number" ? trip.fareEstimate : null,
          distanceKm: typeof trip.distanceKm === "number" ? trip.distanceKm : null,
          vehicleCategory: typeof trip.vehicleCategory === "string" ? trip.vehicleCategory : null,
          paymentMethod: typeof trip.paymentMethod === "string" ? trip.paymentMethod : null,
          createdAt: iso(trip.createdAt),
        };
      });
    return NextResponse.json({ ok: true, trips }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "customer_trips_read_failed" }, { status: 503 });
  }
}
