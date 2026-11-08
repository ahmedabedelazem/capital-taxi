import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getServerAuth, getServerDb } from "@/lib/server/firebase-admin";
import { hasRole, verifyRequestUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ uid: string }> },
) {
  let user;
  try { user = await verifyRequestUser(request); } catch {
    return NextResponse.json({ ok: false, error: "authentication_service_unavailable" }, { status: 503 });
  }
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!hasRole(user, ["admin"])) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const { uid } = await context.params;
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(uid)) {
    return NextResponse.json({ ok: false, error: "invalid_user_id" }, { status: 400 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const decision = body && typeof body === "object" && "decision" in body
    ? (body as { decision?: unknown }).decision : undefined;
  const rejectionReason = body && typeof body === "object" && "rejectionReason" in body &&
    typeof (body as { rejectionReason?: unknown }).rejectionReason === "string"
    ? (body as { rejectionReason: string }).rejectionReason.trim()
    : "";
  if (decision !== "approved" && decision !== "rejected") {
    return NextResponse.json({ ok: false, error: "invalid_decision" }, { status: 400 });
  }
  if (decision === "rejected" && (rejectionReason.length < 10 || rejectionReason.length > 500)) {
    return NextResponse.json({ ok: false, error: "invalid_rejection_reason" }, { status: 400 });
  }

  try {
    const db = getServerDb();
    const auth = getServerAuth();
    const applicationRef = db.collection("driverApplications").doc(uid);
    const target = await auth.getUser(uid);
    const currentClaims = target.customClaims ?? {};
    const currentRole = currentClaims.role;

    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(applicationRef);
      if (!snapshot.exists) throw new Error("application_not_found");
      const currentStatus = snapshot.data()?.status;
      if (currentStatus !== "pending" && currentStatus !== decision) {
        throw new Error("application_already_reviewed");
      }
      // Allow retrying the same decision so a transient Firebase Auth claim
      // update failure can be repaired without permitting a decision reversal.
      if (currentStatus === "pending") {
        transaction.update(applicationRef, {
          status: decision,
          rejectionReason: decision === "rejected" ? rejectionReason : null,
          reviewedAt: FieldValue.serverTimestamp(),
          reviewedBy: user.uid,
        });
        const auditRef = db.collection("adminAuditLogs").doc();
        transaction.create(auditRef, {
          action: "driver_application_decision",
          targetUid: uid,
          decision,
          rejectionReason: decision === "rejected" ? rejectionReason : null,
          actorUid: user.uid,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    });

    // Preserve unrelated claims. Admin privileges are never changed here.
    if (currentRole !== "admin") {
      const nextClaims = { ...currentClaims };
      if (decision === "approved") nextClaims.role = "driver";
      else if (nextClaims.role === "driver") delete nextClaims.role;
      await auth.setCustomUserClaims(uid, nextClaims);
    }

    return NextResponse.json({ ok: true, status: decision }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "application_not_found") {
      return NextResponse.json({ ok: false, error: "application_not_found" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "application_already_reviewed") {
      return NextResponse.json({ ok: false, error: "application_already_reviewed" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: "decision_save_failed" }, { status: 503 });
  }
}
