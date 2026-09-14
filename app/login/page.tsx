import type { Metadata } from "next";
import Link from "next/link";
import { LogIn } from "lucide-react";
import AuthForm from "@/components/AuthForm";
import Card from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Sign In | AI Career Simulator",
  description: "Sign in with your username and password to track your simulation history.",
};

export default function LoginPage() {
  return (
    <div className="min-h-full w-full bg-obsidian font-display">
      <div className="mx-auto w-full max-w-sm px-4 py-16 sm:px-6 sm:py-20">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center border border-signal text-signal">
            <LogIn className="h-6 w-6" />
          </span>
          <p className="mt-3 font-mono text-xs font-semibold uppercase tracking-widest text-signal">SIGN_IN</p>
          <h1 className="mt-2 text-2xl font-bold text-ink">Welcome back</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm text-slate-400">
            An account is optional - it just saves your simulation history across visits.
          </p>
        </div>

        <Card className="mt-6">
          <AuthForm mode="login" />
        </Card>

        <p className="mt-4 text-center text-sm text-slate-400">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-signal hover:opacity-80">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
