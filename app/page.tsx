import { GraduationCap, Compass, ShieldCheck, Sparkles, Mail, Phone, ArrowRight, PlayCircle, LibraryBig } from "lucide-react";
import ContactForm from "@/components/ContactForm";
import AuthGatedCta from "@/components/AuthGatedCta";

const CONTACT_EMAIL = "tightpinkman@gmail.com";
const CONTACT_PHONE = "9739409451";
const CONTACT_PHONE_DISPLAY = "(973) 940-9451";

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
      <section className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        {/* Dot-grid texture, fading toward the edges so it reads as an accent, not noise */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.4] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,black_10%,transparent_70%)]"
          style={{
            backgroundImage: "radial-gradient(circle, #c7d2fe 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Soft radial glow behind the headline */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-[32rem] w-[64rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-gradient-to-b from-indigo-200/50 via-teal-100/30 to-transparent blur-3xl" />

        <div className="relative mx-auto max-w-4xl text-center">
          <p className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
            For Career Counseling Practices &amp; Schools
          </p>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-balance text-slate-900 sm:text-5xl lg:text-6xl">
            The career trial run, before the{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-teal-500 bg-clip-text text-transparent">
              major is chosen
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Give your students a live, AI-driven day-in-the-life before they pick a major. Real decisions, real
            scenarios, real feedback &mdash; across Venture Capital, Cybersecurity, Product Management, Corporate
            Law, and Quant Trading.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <AuthGatedCta
              href="/demo"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/25 sm:w-auto"
            >
              <PlayCircle className="h-4 w-4" />
              Start Demo Simulation
            </AuthGatedCta>
            <AuthGatedCta
              href="/catalog"
              className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
            >
              <LibraryBig className="h-4 w-4" />
              Browse Catalog
            </AuthGatedCta>
            <AuthGatedCta
              href="/request"
              className="group flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
            >
              Request Career
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </AuthGatedCta>
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
            <p className="mt-4 text-sm leading-relaxed text-slate-700">
              Most 10th-12th graders choose a college major based on a job title, not a job. Our mission is to
              give students an experiential, realistic trial run of the careers they&apos;re considering &mdash;
              powered by the same AI &quot;Game Master&quot; technology counselors can trust to be consistent,
              scored, and repeatable, session after session.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-slate-700">
              Every simulation drops a student into a live scenario with real constraints and consequences, then
              scores their decisions against how a strong performer in that career would actually act &mdash; not
              a quiz, a rehearsal.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {ABOUT_HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="group flex flex-col items-start gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-100">
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
                className="flex items-center gap-2 text-sm font-medium text-slate-700 transition-colors hover:text-indigo-600"
              >
                <Mail className="h-4 w-4 text-indigo-600" />
                {CONTACT_EMAIL}
              </a>
              <a
                href={`tel:${CONTACT_PHONE}`}
                className="flex items-center gap-2 text-sm font-medium text-slate-700 transition-colors hover:text-indigo-600"
              >
                <Phone className="h-4 w-4 text-indigo-600" />
                {CONTACT_PHONE_DISPLAY}
              </a>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
            <ContactForm />
          </div>
        </div>
      </section>
    </div>
  );
}
