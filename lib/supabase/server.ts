import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/** Server-side Supabase client for Route Handlers / Server Components, backed by the request's
 *  session cookie. In a Server Component, cookie writes are no-ops (Next disallows them there) -
 *  the middleware is what actually keeps the session cookie fresh in that case. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component - middleware refreshes the session instead.
          }
        },
      },
    }
  );
}
