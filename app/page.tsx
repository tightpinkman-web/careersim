import Link from "next/link";
import { GraduationCap, Compass, ShieldCheck, Sparkles, Mail, Phone, ArrowRight, PlayCircle } from "lucide-react";
import ContactForm from "@/components/ContactForm";

// TODO: replace with your real public-facing contact details before launch.
const CONTACT_EMAIL = "[YOUR_EMAIL]";
const CONTACT_PHONE = "[YOUR_PHONE]";

const ABOUT_HIGHLIGHTS = [
  { icon: GraduationCap, label: "Built for 10th-12th graders" },
  { icon: Compass, label: "5 flagship career tracks" },
  { icon: ShieldCheck, label: "Consistent, scored outcomes" },
  { icon: Sparkles, label: "Live AI-driven scenarios" },
];

export default function Home() {
  return (
    <div className="w-full">
      {/* Hero */}
      <section className="bg-gradient-to-b from-indigo-50 to-white px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            For Career Counseling Practices &amp; Schools
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            AI-Powered Career Simulation Platform for Career Counseling Practice &amp; Schools
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-slate-600 sm:text-lg">
            Give your students a live, AI-driven day-in-the-life before they pick a major. Real decisions, real
            scenarios, real feedback &mdash; across Venture Capital, Cybersecurity, Product Management, Corporate
            Law, and Quant Trading.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/demo"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 sm:w-auto"
            >
              <PlayCircle className="h-4 w-4" />
              Try Demo Simulations
            </Link>
            <Link
              href="/request"
              className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
            >
              Request a Career Simulation
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* About Us */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">About Us</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              Real career trial runs, before the major is chosen
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Most 10th-12th graders choose a college major based on a job title, not a job. Our mission is to
              give students an experiential, realistic trial run of the careers they&apos;re considering &mdash;
              powered by the same AI &quot;Game Master&quot; technology counselors can trust to be consistent,
              scored, and repeatable, session after session.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Every simulation drops a student into a live scenario with real constraints and consequences, then
              scores their decisions against how a strong performer in that career would actually act &mdash; not
              a quiz, a rehearsal.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {ABOUT_HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-start gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Icon className="h-4 w-4" />
                </span>
                <p className="text-xs font-medium text-slate-700">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Us */}
      <section id="contact" className="scroll-mt-16 bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Contact Us</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Bring this to your students</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Tell us about your counseling practice or school, and we&apos;ll walk you through a pilot.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-indigo-600"
              >
                <Mail className="h-4 w-4 text-indigo-600" />
                {CONTACT_EMAIL}
              </a>
              <a
                href={`tel:${CONTACT_PHONE}`}
                className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-indigo-600"
              >
                <Phone className="h-4 w-4 text-indigo-600" />
                {CONTACT_PHONE}
              </a>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <ContactForm />
          </div>
        </div>
      </section>
    </div>
  );
}
