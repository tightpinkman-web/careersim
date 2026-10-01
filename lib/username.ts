/** Internal domain used to map a plain Username + Password login onto Supabase Auth's
 *  email-based accounts, so students never see or verify an email address. Nothing is ever
 *  sent to this domain - Supabase just needs a syntactically valid, unique email per account.
 *
 *  NOTE: Supabase Auth's email validator on this project has been observed rejecting
 *  `@users.careersim-app.com` with `email_address_invalid` ("Example and test domains are
 *  currently not supported") - see supabase_signup_domain_blocked memory. Live re-testing on
 *  2026-10-01 found this check behaves inconsistently (two fresh signup attempts on that same
 *  domain were NOT rejected on domain grounds a few minutes after a real attempt WAS rejected),
 *  which points at a flaky/real-time check on Supabase's side rather than a fixed denylist this
 *  app can reliably route around by switching strings. `careersim.app` is not a resolving domain
 *  either (verified via DNS - NXDOMAIN), so this swap is not guaranteed to be a complete fix;
 *  it's applied per instruction with a fallback so existing behavior isn't worsened, and
 *  genuinely needs re-verification against live GoTrue once rate limits allow another real test. */
const INTERNAL_EMAIL_DOMAIN = "careersim.app";

/** Prior domain this project used before the above change - no account has ever completed
 *  signup under it (zero rows with students.username set, verified live), so this exists purely
 *  as a sign-in fallback in case that changes before this constant is ever removed. */
const LEGACY_INTERNAL_EMAIL_DOMAIN = "users.careersim-app.com";

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_-]{2,19}$/;

export function isValidUsername(raw: string): boolean {
  return USERNAME_PATTERN.test(raw.trim().toLowerCase());
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function usernameToInternalEmail(username: string): string {
  return `${normalizeUsername(username)}@${INTERNAL_EMAIL_DOMAIN}`;
}

/** Sign-in fallback only (see LEGACY_INTERNAL_EMAIL_DOMAIN) - never used for new signups. */
export function usernameToLegacyInternalEmail(username: string): string {
  return `${normalizeUsername(username)}@${LEGACY_INTERNAL_EMAIL_DOMAIN}`;
}

/** Recovers the username from an internal email (e.g. from `user.email` on the Supabase session).
 *  Checks both the current and legacy internal domains, so an account created under either still
 *  resolves correctly. Returns null for anything else, such as a real email or a guest's
 *  `anon_<uuid>@anonymous.simulation.local` row. */
export function internalEmailToUsername(email: string): string | null {
  for (const domain of [INTERNAL_EMAIL_DOMAIN, LEGACY_INTERNAL_EMAIL_DOMAIN]) {
    const suffix = `@${domain}`;
    if (email.endsWith(suffix)) return email.slice(0, -suffix.length);
  }
  return null;
}
