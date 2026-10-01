"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertTriangle, Lock, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { safeRedirectPath } from "@/lib/safeRedirect";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface AuthFormProps {
  mode: "login" | "signup";
}

/** Never let a raw Supabase/GoTrue error reach the UI - a handful of already-clean, expected
 *  messages pass through as-is; everything else (including an email-provider-disabled or other
 *  infra-level error) becomes one generic, non-revealing status badge. */
function sanitizeAuthErrorMessage(message: string): string {
  const KNOWN_CLEAN_MESSAGES = [
    "Incorrect email or password.",
    "That email is already registered.",
    "Please enter a valid email address.",
  ];
  return KNOWN_CLEAN_MESSAGES.includes(message) ? message : "AUTHENTICATION_FAILED // PLEASE TRY AGAIN";
}

function AuthFormInner({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get("redirectTo"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === "signup";

  // The OAuth callback route redirects back here with ?error= on failure (e.g. the user denied
  // the Google consent screen, or the code exchange failed) - surface it the same sanitized way.
  // A pure derivation from the URL, not state - form-submission errors below take priority.
  const callbackError = searchParams.get("error") ? "AUTHENTICATION_FAILED // PLEASE TRY AGAIN" : null;
  const displayedError = error ?? callbackError;

  const handleGoogleSignIn = async () => {
    if (googleSubmitting || submitting) return;
    setGoogleSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
      },
    });
    if (oauthError) {
      setError(sanitizeAuthErrorMessage(oauthError.message));
      setGoogleSubmitting(false);
    }
    // On success the browser navigates away to Google's consent screen - nothing left to do here.
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const trimmedEmail = email.trim();
    setSubmitting(true);
    setError(null);

    const supabase = createClient();

    try {
      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
        });
        if (signUpError) {
          throw new Error(
            signUpError.message.toLowerCase().includes("already registered")
              ? "That email is already registered."
              : sanitizeAuthErrorMessage(signUpError.message)
          );
        }

        if (!data.session) {
          setError("Account created - check your inbox for a confirmation link before signing in.");
          return;
        }
        router.push(redirectTo);
        router.refresh();
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (signInError) {
          throw new Error(
            signInError.message.toLowerCase().includes("invalid login credentials")
              ? "Incorrect email or password."
              : sanitizeAuthErrorMessage(signInError.message)
          );
        }
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AUTHENTICATION_FAILED // PLEASE TRY AGAIN");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Button
        type="button"
        onClick={handleGoogleSignIn}
        loading={googleSubmitting}
        fullWidth
        size="md"
        variant="secondary"
        icon={!googleSubmitting ? <GoogleIcon className="h-4 w-4" /> : undefined}
      >
        {googleSubmitting ? "Redirecting to Google..." : "Continue with Google"}
      </Button>

      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="h-px flex-1 bg-hairline" />
        OR
        <span className="h-px flex-1 bg-hairline" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="pl-9"
          />
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            required
            minLength={6}
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="pl-9"
          />
        </div>

        {displayedError && (
          <p className="flex items-start gap-1.5 border border-rose-900 bg-rose-950/40 px-3 py-2 font-mono text-xs uppercase tracking-wide text-rose-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {displayedError}
          </p>
        )}

        <Button type="submit" loading={submitting} fullWidth size="md" className="mt-1">
          {submitting ? "Please wait..." : isSignup ? "Create Account" : "Sign In"}
        </Button>
      </form>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.48a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.56-5.17 3.56-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96h-4v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.63h-4A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.37l4-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.63l4 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

/** Wrapped in Suspense because it reads ?redirectTo=/?error= via useSearchParams, which Next
 *  requires to be inside a Suspense boundary during static rendering. */
export default function AuthForm({ mode }: AuthFormProps) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>}>
      <AuthFormInner mode={mode} />
    </Suspense>
  );
}
