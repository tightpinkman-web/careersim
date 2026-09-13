import Link from "next/link";
import AuthForm from "@/components/AuthForm";
import Logo from "@/components/Logo";

export const metadata = { title: "Sign Up | AI Career Simulator" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;
  const loginHref = redirectTo ? `/login?redirectTo=${encodeURIComponent(redirectTo)}` : "/login";

  return (
    <div className="flex min-h-full w-full flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <Link href="/" className="mb-8 transition-opacity hover:opacity-80">
        <Logo size={36} />
      </Link>
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900">Create Your Account</h1>
          <p className="mt-1 text-sm text-slate-500">
            Save your simulation history and reports across devices.
          </p>
        </div>

        <div className="mt-6">
          <AuthForm mode="signup" />
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href={loginHref} className="font-semibold text-indigo-600 hover:text-indigo-700">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
