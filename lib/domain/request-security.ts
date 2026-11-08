const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function isSameOriginCookieRequest(request: Request): boolean {
  return safeMethods.has(request.method.toUpperCase()) || isSameOriginRequest(request);
}
