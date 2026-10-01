/** Shared between proxy.ts (which captures `?ref=` into a cookie on first visit) and
 *  app/api/simulations/start/route.ts (which reads that cookie and persists it onto the new
 *  SimulationSession as partnerRef) - white-label partner/institutional attribution tracking. */
export const PARTNER_REF_COOKIE = "partner_ref";
export const PARTNER_REF_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/** Keeps the cookie value small and free of anything that could be used for header/cookie
 *  injection or stored-XSS if a partner ref is ever rendered back in an admin view. */
export function sanitizePartnerRef(raw: string): string | null {
  const trimmed = raw.trim().slice(0, 40);
  return /^[A-Za-z0-9_-]+$/.test(trimmed) ? trimmed : null;
}
