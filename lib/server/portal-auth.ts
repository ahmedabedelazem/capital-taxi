import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerAuth, getServerDb } from "@/lib/server/firebase-admin";
import { SESSION_COOKIE_NAME } from "@/lib/server/auth";

export type PortalRole = "customer" | "driver" | "admin";

const portalPaths: Record<PortalRole, string> = {
  customer: "/customer",
  driver: "/driver",
  admin: "/admin",
};

function roleFromClaims(role: unknown): PortalRole {
  return role === "admin" || role === "driver" || role === "customer"
    ? role
    : "customer";
}

/**
 * Enforces portal access before rendering a protected server page.
 * API handlers must continue to perform their own authorization checks.
 */
export async function requirePortalRole(requiredRole: PortalRole): Promise<void> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const loginUrl = `/login?next=${encodeURIComponent(portalPaths[requiredRole])}`;

  if (!sessionCookie) redirect(loginUrl);

  let role: PortalRole;
  let uid: string;

  try {
    const decoded = await getServerAuth().verifySessionCookie(sessionCookie, true);
    uid = decoded.uid;
    role = roleFromClaims(decoded.role);
  } catch {
    redirect(loginUrl);
  }

  if (role === "driver") {
    try {
      const application = await getServerDb()
        .collection("driverApplications")
        .doc(uid)
        .get();
      if (application.data()?.status !== "approved") role = "customer";
    } catch {
      // Fail closed if the server cannot confirm driver approval.
      role = "customer";
    }
  }

  if (role !== requiredRole) redirect(portalPaths[role]);
}
