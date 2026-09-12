import { createBrowserClient } from "@supabase/ssr";

/** Browser-side Supabase client. Auth state lives in cookies (not localStorage) so the session
 *  is visible to server components/route handlers too - see lib/supabase/server.ts. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
