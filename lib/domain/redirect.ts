/** Return a same-origin absolute path suitable for a post-auth redirect. */
export function safeInternalRedirectPath(value: string | null, origin: string): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  try {
    const base = new URL(origin);
    const target = new URL(value, base);
    if (target.origin !== base.origin || target.username || target.password) return null;
    return target.pathname + target.search + target.hash;
  } catch {
    return null;
  }
}
