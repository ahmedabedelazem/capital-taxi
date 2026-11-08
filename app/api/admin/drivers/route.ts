import { NextResponse } from "next/server";
import { getServerDb } from "@/lib/server/firebase-admin";
import { hasRole, verifyRequestUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  let user;
  try { user = await verifyRequestUser(request); } catch {
    return NextResponse.json({ ok: false, error: "authentication_service_unavailable" }, { status: 503 });
  }
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!hasRole(user, ["admin"])) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  try {
    const snapshot = await getServerDb().collection("driverApplications")
      .where("status", "==", "pending").limit(50).get();
    const applications = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        fullName: data.fullName,
        phone: data.phone,
        vehicleType: data.vehicleType,
        vehicleModel: data.vehicleModel,
        plateNumber: data.plateNumber,
        status: data.status,
        submittedAt: data.submittedAt?.toDate?.().toISOString?.() ?? null,
      };
    });
    return NextResponse.json({ ok: true, applications }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "applications_read_failed" }, { status: 503 });
  }
}
