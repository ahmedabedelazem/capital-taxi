import "server-only";

import { getServerAuth } from "@/lib/server/firebase-admin";

export type AppRole = "customer" | "driver" | "admin";

export interface AuthenticatedUser {
  uid: string;
  role: AppRole;
  email?: string;
}

const validRoles: readonly AppRole[] = ["customer", "driver", "admin"];
export const SESSION_COOKIE_NAME = "__session";

function readCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
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

export async function verifyRequestUser(
  request: Request,
): Promise<AuthenticatedUser | null> {
  const auth = getServerAuth();
  const sessionCookie = readCookie(request, SESSION_COOKIE_NAME);

  if (sessionCookie) {
    try {
      const decoded = await auth.verifySessionCookie(sessionCookie, true);
      return toAuthenticatedUser(decoded);
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
    return toAuthenticatedUser(decoded);
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
