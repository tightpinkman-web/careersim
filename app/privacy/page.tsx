import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export const metadata = { title: "Privacy Policy | AI Career Simulator" };

export default function PrivacyPage() {
  return (
    <div className="min-h-full w-full bg-slate-50">
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">Privacy Policy</h1>
          <p className="mt-2 text-sm text-slate-500">Last updated September 12, 2026</p>
        </div>

        <div className="mt-10 flex flex-col gap-8 text-sm leading-relaxed text-slate-700">
          <section>
            <h2 className="text-base font-semibold text-slate-900">Data Minimization</h2>
            <p className="mt-2">
              We collect only what is needed to run and improve your career simulations: the simulation
              transcripts and scores you generate, and an anonymous device identifier stored in your
              browser so your in-progress and completed simulations remain accessible on that device. An
              account is optional - if you create one via Google, we store the name, email, and avatar
              your Google account provides; if you create one with email and password instead, we store
              that email and a securely hashed password. We do not request or store any information
              beyond this.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Cookies</h2>
            <p className="mt-2">
              If you create an optional account, we set a single authentication cookie to keep you
              signed in. We do not use analytics cookies, advertising cookies, or any cross-site tracking
              cookies of any kind.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">No Selling or Sharing of Behavioral Data</h2>
            <p className="mt-2">
              We do not sell, rent, or share your personal data or simulation activity with third-party
              advertisers, data brokers, or analytics networks. Your simulation transcripts, scores, and
              generated reports are used solely to provide the service back to you.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Third-Party Processors</h2>
            <p className="mt-2">
              We use a small number of infrastructure providers strictly to operate the service:
              Supabase (database hosting and, for accounts you choose to create, authentication), Google
              Gemini (to generate simulation content and evaluations from your in-session responses), and
              Resend (to deliver transactional email alerts you request). None of these providers are
              permitted to use your data for their own advertising or model-training purposes under our
              agreements with them.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Your Choices</h2>
            <p className="mt-2">
              You can clear your browser&apos;s local storage at any time to remove your device
              identifier and disconnect from your prior simulation history.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Contact</h2>
            <p className="mt-2">
              Questions about this policy can be sent through the{" "}
              <Link href="/#contact" className="font-medium text-indigo-600 hover:text-indigo-700">
                contact form
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
