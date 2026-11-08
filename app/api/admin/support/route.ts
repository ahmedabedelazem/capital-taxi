import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getServerDb } from "@/lib/server/firebase-admin";
import { hasRole, verifyRequestUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
const allowedStatuses = ["open", "in_progress", "resolved", "closed"] as const;

function serializeDate(value: unknown): string | null {
  if (value && typeof value === "object" && "toDate" in value &&
      typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return value instanceof Date ? value.toISOString() : null;
}

export async function GET(request: Request) {
  let user;
  try { user = await verifyRequestUser(request); } catch {
    return NextResponse.json({ ok: false, error: "authentication_service_unavailable" }, { status: 503 });
  }
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!hasRole(user, ["admin"])) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  try {
    const snapshot = await getServerDb().collection("supportTickets")
      .orderBy("createdAt", "desc").limit(100).get();
    const tickets = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ticketId: doc.id,
        uid: data.uid ?? null,
        userRole: data.userRole ?? null,
        category: data.category ?? "other",
        subject: data.subject ?? "",
        description: data.description ?? "",
        tripId: data.tripId ?? null,
        status: data.status ?? "open",
        priority: data.priority ?? "normal",
        adminNote: data.adminNote ?? null,
        createdAt: serializeDate(data.createdAt),
        updatedAt: serializeDate(data.updatedAt),
      };
    });
    return NextResponse.json({ ok: true, tickets }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "support_tickets_read_failed" }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  let user;
  try { user = await verifyRequestUser(request); } catch {
    return NextResponse.json({ ok: false, error: "authentication_service_unavailable" }, { status: 503 });
  }
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!hasRole(user, ["admin"])) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const data = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const ticketId = typeof data.ticketId === "string" ? data.ticketId.trim() : "";
  const status = typeof data.status === "string" && allowedStatuses.includes(data.status as typeof allowedStatuses[number])
    ? data.status : null;
  const adminNote = typeof data.adminNote === "string" ? data.adminNote.trim() : undefined;
  if (!ticketId || ticketId.length > 128 || !status ||
      (adminNote !== undefined && adminNote.length > 1000)) {
    return NextResponse.json({ ok: false, error: "invalid_ticket_update" }, { status: 400 });
  }

  const db = getServerDb();
  const ticketRef = db.collection("supportTickets").doc(ticketId);
  const auditRef = db.collection("adminAuditLogs").doc();
  try {
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ticketRef);
      if (!snapshot.exists) throw new Error("TICKET_NOT_FOUND");
      const previousStatus = snapshot.data()?.status ?? "open";
      const statusChanged = previousStatus !== status;
      transaction.update(ticketRef, {
        ...(statusChanged ? {
          status,
          resolvedAt: status === "resolved" || status === "closed"
            ? FieldValue.serverTimestamp()
            : null,
        } : {}),
        ...(adminNote !== undefined ? { adminNote: adminNote || null } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.create(auditRef, {
        actorUid: user.uid,
        action: "support_ticket_updated",
        targetType: "support_ticket",
        targetId: ticketId,
        previousStatus,
        nextStatus: status,
        statusChanged,
        noteUpdated: adminNote !== undefined,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
    return NextResponse.json({ ok: true, ticketId, status }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "TICKET_NOT_FOUND") {
      return NextResponse.json({ ok: false, error: "ticket_not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: "support_ticket_update_failed" }, { status: 503 });
  }
}
