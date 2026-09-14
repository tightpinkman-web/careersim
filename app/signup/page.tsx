import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import AuthForm from "@/components/AuthForm";
import Card from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Sign Up | AI Career Simulator",
  description: "Create a username and password to track your simulation history - no email required.",
};

export default function SignupPage() {
  return (
    <div className="min-h-full w-full bg-obsidian font-display">
      <div className="mx-auto w-full max-w-sm px-4 py-16 sm:px-6 sm:py-20">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center border border-signal text-signal">
            <UserPlus className="h-6 w-6" />
          </span>
          <p className="mt-3 font-mono text-xs font-semibold uppercase tracking-widest text-signal">SIGN_UP</p>
          <h1 className="mt-2 text-2xl font-bold text-ink">Create an account</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm text-slate-400">
            Just a username and password - no email address needed.
          </p>
        </div>

        <Card className="mt-6">
          <AuthForm mode="signup" />
        </Card>

        <p className="mt-4 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-signal hover:opacity-80">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
