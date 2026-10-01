"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertTriangle, Lock, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getAnonymousSessionId } from "@/lib/anonymousSession";
import { safeRedirectPath } from "@/lib/safeRedirect";
import { isValidUsername, usernameToInternalEmail } from "@/lib/username";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface AuthFormProps {
  mode: "login" | "signup";
}

function AuthFormInner({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get("redirectTo"));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === "signup";

  const syncStudent = async () => {
    try {
      await fetch("/api/auth/sync-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonymousSessionId: getAnonymousSessionId() }),
      });
    } catch {
      // Non-fatal - the next authenticated request (e.g. starting a simulation) will retry this,
      // just without the one-time anonymous-history backfill.
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const trimmed = username.trim();
    if (!isValidUsername(trimmed)) {
      setError("Username must be 3-20 characters: lowercase letters, numbers, - or _, starting with a letter or number.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const email = usernameToInternalEmail(trimmed);

    try {
      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username: trimmed } },
        });
        if (signUpError) {
          throw new Error(
            signUpError.message.toLowerCase().includes("already registered")
              ? "That username is already taken."
              : signUpError.message
          );
        }

        if (!data.session) {
          // No real inbox exists for the internal email, so confirmation can never complete here -
          // this project's Supabase Auth "Confirm email" setting must be off for signup to work.
          setError(
            "Account created, but this project still requires email confirmation, which isn't possible for a username-only account. Ask an admin to disable \"Confirm email\" in Supabase Auth settings."
          );
          return;
        }
        await syncStudent();
        router.push(redirectTo);
        router.refresh();
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          throw new Error(
            signInError.message.toLowerCase().includes("invalid login credentials")
              ? "Incorrect username or password."
              : signInError.message
          );
        }
        await syncStudent();
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="relative">
        <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          required
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
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

      {error && (
        <p className="flex items-start gap-1.5 border border-rose-900 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      <Button type="submit" loading={submitting} fullWidth size="md" className="mt-1">
        {submitting ? "Please wait..." : isSignup ? "Create Account" : "Sign In"}
      </Button>
    </form>
  );
}

/** Wrapped in Suspense because it reads ?redirectTo= via useSearchParams, which Next requires
 *  to be inside a Suspense boundary during static rendering. */
export default function AuthForm({ mode }: AuthFormProps) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>}>
      <AuthFormInner mode={mode} />
    </Suspense>
  );
}
