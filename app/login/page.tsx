import Link from "next/link";
import { LogIn } from "lucide-react";
import AuthForm from "@/components/AuthForm";

export const metadata = { title: "Log In | AI Career Simulator" };

export default function LoginPage() {
  return (
    <div className="flex min-h-full w-full items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <LogIn className="h-6 w-6" />
          </span>
          <h1 className="mt-3 text-xl font-bold text-slate-900">Log In</h1>
          <p className="mt-1 text-sm text-slate-500">Access your saved simulations and reports.</p>
        </div>

        <div className="mt-6">
          <AuthForm mode="login" />
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
