import "server-only";

import { getServerAuth, getServerDb } from "@/lib/server/firebase-admin";

export type AppRole = "customer" | "driver" | "admin";

export interface AuthenticatedUser {
  uid: string;
  role: AppRole;
  email?: string;
}

const validRoles: readonly AppRole[] = ["customer", "driver", "admin"];
export const SESSION_COOKIE_NAME = "__session";

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isSameOriginMutation(request: Request): boolean {
  if (!unsafeMethods.has(request.method.toUpperCase())) return true;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function readCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }
  return null;
}

function toAuthenticatedUser(decoded: {
  uid: string;
  email?: string;
  role?: unknown;
}): AuthenticatedUser {
  // Role claims are trusted only because Firebase signs them; clients cannot
  // set custom claims. Missing/unknown claims fail closed to customer.
  const role: AppRole =
    typeof decoded.role === "string" &&
    validRoles.includes(decoded.role as AppRole)
      ? (decoded.role as AppRole)
      : "customer";

  return {
    uid: decoded.uid,
    role,
    ...(typeof decoded.email === "string" ? { email: decoded.email } : {}),
  };
}

async function resolveApprovedRole(user: AuthenticatedUser): Promise<AuthenticatedUser> {
  if (user.role !== "driver") return user;

  // A signed driver claim is necessary but not sufficient: approval must
  // also exist in the server-owned application record.
  const application = await getServerDb()
    .collection("driverApplications")
    .doc(user.uid)
    .get();

  if (application.data()?.status !== "approved") {
    return { ...user, role: "customer" };
  }
  return user;
}

export async function verifyRequestUser(
  request: Request,
): Promise<AuthenticatedUser | null> {
  const auth = getServerAuth();
  const sessionCookie = readCookie(request, SESSION_COOKIE_NAME);

  if (sessionCookie) {
    // Cookie-authenticated mutations must originate from this exact site.
    // SameSite=Lax is defense-in-depth, not a substitute for CSRF validation.
    if (!isSameOriginMutation(request)) return null;
    try {
      const decoded = await auth.verifySessionCookie(sessionCookie, true);
      return await resolveApprovedRole(toAuthenticatedUser(decoded));
    } catch {
      return null;
    }
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;

  const idToken = authorization.slice("Bearer ".length).trim();
  if (!idToken) return null;

  try {
    const decoded = await auth.verifyIdToken(idToken, true);
    return await resolveApprovedRole(toAuthenticatedUser(decoded));
  } catch {
    return null;
  }
}

export function hasRole(
  user: AuthenticatedUser,
  allowed: readonly AppRole[],
): boolean {
  return allowed.includes(user.role);
}
