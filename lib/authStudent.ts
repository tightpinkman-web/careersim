import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

/**
 * Resolves the Student row for the currently signed-in Supabase user (from the request's session
 * cookie), upserting one on first use. Returns null for guests - callers fall back to the
 * anonymous, localStorage-keyed flow (see lib/anonymousSession.ts) in that case.
 *
 * Real accounts and anonymous sessions share the same Student table, distinguished only by
 * supabaseAuthId: a real user's row is keyed by their actual Supabase auth uid, an anonymous
 * visitor's by `anon_<uuid>`. This keeps SimulationSession's existing studentId relation as the
 * single link to "whoever ran this simulation," authenticated or not.
 */
export async function getAuthenticatedStudent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) return null;

  return prisma.student.upsert({
    where: { supabaseAuthId: user.id },
    update: { email: user.email },
    create: {
      supabaseAuthId: user.id,
      email: user.email,
      name: (user.user_metadata?.name as string | undefined) || user.email,
    },
  });
}
