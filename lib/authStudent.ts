import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { resolveUserEntitlement } from "@/lib/auth/entitlements";

/**
 * Resolves the Student row for the currently signed-in Supabase user (from the request's session
 * cookie), upserting one on first use. Returns null for guests - callers fall back to the
 * anonymous, localStorage-keyed flow (see lib/anonymousSession.ts) in that case.
 *
 * Real accounts and anonymous sessions share the same Student table, distinguished only by
 * supabaseAuthId: a real user's row is keyed by their actual Supabase auth uid, an anonymous
 * visitor's by `anon_<uuid>`. This keeps SimulationSession's existing studentId relation as the
 * single link to "whoever ran this simulation," authenticated or not - see student_auth_bridge
 * in project memory for why there's no separate userId FK.
 *
 * `name` comes from whichever identity provider authenticated the user: Google OAuth populates
 * `user_metadata.full_name`/`name` and `avatar_url`; direct email+password signups have neither,
 * so this falls back to the email's local part. `username` is no longer set for new accounts
 * (the synthetic-username auth scheme was removed in favor of Google OAuth + real email/password -
 * see lib/username.ts's removal) but is left alone on any existing row so nothing regresses.
 */
export async function getAuthenticatedStudent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) return null;

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    user.email.split("@")[0];

  // Domain-based entitlement is re-checked on every login so a newly-whitelisted partner domain
  // takes effect immediately. It only ever upgrades here - a non-matching domain never downgrades
  // a student who separately unlocked ENTERPRISE_STUDENT via a cohort access key (see
  // app/api/auth/cohort-key/route.ts), since this omits `inputAccessKey` entirely.
  const domainEntitlement = await resolveUserEntitlement(user.email);
  const domainUpgrade =
    domainEntitlement.tier === "ENTERPRISE_STUDENT" ? domainEntitlement.organization : null;

  return prisma.student.upsert({
    where: { supabaseAuthId: user.id },
    update: {
      email: user.email,
      name: displayName,
      ...(domainUpgrade ? { tier: "ENTERPRISE_STUDENT", schoolId: domainUpgrade.id } : {}),
    },
    create: {
      supabaseAuthId: user.id,
      email: user.email,
      name: displayName,
      tier: domainUpgrade ? "ENTERPRISE_STUDENT" : "PUBLIC_DEMO",
      schoolId: domainUpgrade?.id ?? null,
    },
  });
}
