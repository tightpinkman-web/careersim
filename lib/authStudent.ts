import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { internalEmailToUsername } from "@/lib/username";

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
 */
export async function getAuthenticatedStudent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) return null;

  const username =
    (user.user_metadata?.username as string | undefined) || internalEmailToUsername(user.email) || undefined;

  return prisma.student.upsert({
    where: { supabaseAuthId: user.id },
    update: { email: user.email, ...(username ? { username } : {}) },
    create: {
      supabaseAuthId: user.id,
      email: user.email,
      username,
      name: (user.user_metadata?.username as string | undefined) || user.email,
    },
  });
}
