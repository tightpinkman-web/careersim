import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/safeRedirect";

/** Google OAuth (and any future OAuth provider) redirects here with a `code` to exchange for a
 *  session - see the `redirectTo` passed to `supabase.auth.signInWithOAuth()` in AuthForm.tsx.
 *  Guest history backfill is NOT done here: this is a server redirect handler with no access to
 *  the browser's localStorage-held anonymous session id, so it's handled client-side instead,
 *  the same way the email/password flow already does it - see Navbar.tsx's onAuthStateChange
 *  listener, which fires for this sign-in exactly like any other. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = safeRedirectPath(searchParams.get("redirectTo"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
