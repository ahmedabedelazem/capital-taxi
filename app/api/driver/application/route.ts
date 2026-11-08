import { NextResponse } from "next/server";
import { getServerDb } from "@/lib/server/firebase-admin";
import { hasRole, verifyRequestUser } from "@/lib/server/auth";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  let user;
  try {
    user = await verifyRequestUser(request);
  } catch {
    return NextResponse.json({ ok: false, error: "authentication_service_unavailable" }, { status: 503 });
  }
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!hasRole(user, ["customer"])) return NextResponse.json({ ok: false, error: "customer_account_required" }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const data = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const fullName = clean(data.fullName, 100);
  const phone = clean(data.phone, 25);
  const vehicleType = clean(data.vehicleType, 40);
  const vehicleModel = clean(data.vehicleModel, 60);
  const plateNumber = clean(data.plateNumber, 30);

  if (!fullName || !/^\+?[0-9\s()-]{8,20}$/.test(phone) || !vehicleType || !vehicleModel || !plateNumber) {
    return NextResponse.json({ ok: false, error: "invalid_application_fields" }, { status: 400 });
  }

  try {
    const db = getServerDb();
    const ref = db.collection("driverApplications").doc(user.uid);
    const existing = await ref.get();
    if (existing.data()?.status === "approved") {
      return NextResponse.json({ ok: false, error: "already_approved" }, { status: 409 });
    }
    await ref.set({
      uid: user.uid,
      fullName,
      phone,
      vehicleType,
      vehicleModel,
      plateNumber,
      status: "pending",
      submittedAt: FieldValue.serverTimestamp(),
      reviewedAt: null,
      reviewedBy: null,
    });
    return NextResponse.json({ ok: true, status: "pending" }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "application_save_failed" }, { status: 503 });
  }
}
