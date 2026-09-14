/** Internal domain used to map a plain Username + Password login onto Supabase Auth's
 *  email-based accounts, so students never see or verify an email address. Nothing is ever
 *  sent to this domain - Supabase just needs a syntactically valid, unique email per account.
 *  Must use a normal-looking TLD: Supabase Auth's own email validator rejects non-standard
 *  TLDs like ".internal" as an invalid address (verified against the live project). */
const INTERNAL_EMAIL_DOMAIN = "users.careersim-app.com";

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

/** Recovers the username from an internal email (e.g. from `user.email` on the Supabase session).
 *  Returns null for anything that isn't one of our internal addresses, such as a real account
 *  created before this suffix scheme or a guest's `anon_<uuid>@anonymous.simulation.local` row. */
export function internalEmailToUsername(email: string): string | null {
  const suffix = `@${INTERNAL_EMAIL_DOMAIN}`;
  if (!email.endsWith(suffix)) return null;
  return email.slice(0, -suffix.length);
}
