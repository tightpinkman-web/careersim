/**
 * Validates a `redirectTo`/`next` value pulled from a query param before it's used to build a
 * redirect. Only a same-app relative path is allowed - anything else (a full URL, or a
 * protocol-relative "//evil.com" path that browsers would treat as a different host) falls back
 * to `fallback`, closing off the classic open-redirect vector this kind of param invites.
 */
export function safeRedirectPath(raw: string | null | undefined, fallback = "/history"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  return raw;
}
