const KEY = "sim_anon_session_id";

/** Stable per-browser anonymous session id, used to resolve the same Student record across
 *  visits without a real auth system. Client-only (reads/writes localStorage). */
export function getAnonymousSessionId(): string {
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    // localStorage unavailable (private browsing, etc.) - fall back to a per-load id
    return crypto.randomUUID();
  }
}
