import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getServerDb } from "@/lib/server/firebase-admin";
import { hasRole, verifyRequestUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const APPLICATION_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_APPLICATIONS_PER_WINDOW = 3;

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
    const applicationRef = db.collection("driverApplications").doc(user.uid);
    const rateLimitRef = db.collection("driverApplicationRateLimits").doc(user.uid);
    const now = Date.now();

    const result = await db.runTransaction(async (transaction) => {
      const [applicationSnapshot, rateLimitSnapshot] = await Promise.all([
        transaction.get(applicationRef),
        transaction.get(rateLimitRef),
      ]);
      const currentStatus = applicationSnapshot.data()?.status;

      if (currentStatus === "approved") return "already_approved";
      if (currentStatus === "pending") return "application_already_pending";
      if (applicationSnapshot.exists && currentStatus !== "rejected") return "application_not_resubmittable";

      const rateLimit = rateLimitSnapshot.data();
      const windowStartedAt = rateLimit?.windowStartedAt instanceof Timestamp
        ? rateLimit.windowStartedAt.toMillis()
        : 0;
      const previousCount = Number.isInteger(rateLimit?.count) ? rateLimit.count as number : 0;
      const windowIsActive = now - windowStartedAt >= 0 && now - windowStartedAt < APPLICATION_WINDOW_MS;
      const nextCount = windowIsActive ? previousCount + 1 : 1;

      if (nextCount > MAX_APPLICATIONS_PER_WINDOW) return "application_rate_limited";

      transaction.set(applicationRef, {
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
      transaction.set(rateLimitRef, {
        windowStartedAt: windowIsActive ? rateLimit!.windowStartedAt : Timestamp.fromMillis(now),
        count: nextCount,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return "submitted";
    });

    if (result !== "submitted") {
      const status = result === "application_rate_limited" ? 429 : 409;
      return NextResponse.json({ ok: false, error: result }, { status, headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({ ok: true, status: "pending" }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "application_save_failed" }, { status: 503 });
  }
}
