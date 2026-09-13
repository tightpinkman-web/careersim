import { FileCheck2, ListChecks, Timer, ClipboardList, Mail, Phone, ArrowRight, PlayCircle, LibraryBig } from "lucide-react";
import ContactForm from "@/components/ContactForm";
import AuthGatedCta from "@/components/AuthGatedCta";

const CONTACT_EMAIL = "tightpinkman@gmail.com";
const CONTACT_PHONE = "9739409451";
const CONTACT_PHONE_DISPLAY = "(973) 940-9451";

const PROCESS_STEPS = [
  {
    icon: ClipboardList,
    label: "Student picks a career",
    detail: "One of five roles: Venture Capital, Cybersecurity, Product Management, Corporate Law, or Quant Trading.",
  },
  {
    icon: Timer,
    label: "Works a timed scenario",
    detail: "A live, multi-step decision scenario with a countdown per step and real constraints to work within.",
  },
  {
    icon: ListChecks,
    label: "Decisions are scored",
    detail: "Each choice is graded against 4 fixed competencies for that career, not a single pass/fail check.",
  },
  {
    icon: FileCheck2,
    label: "Report is exported",
    detail: "A PDF scorecard with the overall score, competency breakdown, strengths, and growth areas.",
  },
];

export default function Home() {
  return (
    <div className="w-full">
      {/* Hero */}
      <section className="border-b border-slate-200 px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            For Career Counselors and Schools
          </p>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            A structured career simulation and evaluation tool
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Students work through a scored, decision-based simulation of a real job, then receive a
            competency breakdown and a downloadable PDF report. Built for career counseling practices
            and schools to evaluate student career fit across Venture Capital, Cybersecurity, Product
            Management, Corporate Law, and Quant Trading.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <AuthGatedCta
              href="/demo"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 sm:w-auto"
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
              className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
            >
              Request Career
              <ArrowRight className="h-4 w-4" />
            </AuthGatedCta>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">How It Works</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">From simulation to scorecard</h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-700">
            Each simulation places a student in a live scenario generated for that career, with real
            constraints and a decision clock for every step. Decisions are graded against the same
            competencies a working professional in that role would be measured on, producing a report a
            counselor can review with the student.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS_STEPS.map(({ icon: Icon, label, detail }, i) => (
              <div key={label} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-700">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-semibold text-slate-400">Step {i + 1}</span>
                </div>
                <p className="text-sm font-semibold text-slate-900">{label}</p>
                <p className="text-xs leading-relaxed text-slate-500">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Us */}
      <section id="contact" className="scroll-mt-16 border-t border-slate-200 bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contact Us</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Bring this to your students</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Tell us about your counseling practice or school, and we&apos;ll walk you through a pilot.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="flex items-center gap-2 text-sm font-medium text-slate-700 transition-colors hover:text-indigo-600"
              >
                <Mail className="h-4 w-4 text-slate-500" />
                {CONTACT_EMAIL}
              </a>
              <a
                href={`tel:${CONTACT_PHONE}`}
                className="flex items-center gap-2 text-sm font-medium text-slate-700 transition-colors hover:text-indigo-600"
              >
                <Phone className="h-4 w-4 text-slate-500" />
                {CONTACT_PHONE_DISPLAY}
              </a>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <ContactForm />
          </div>
        </div>
      </section>
    </div>
  );
}
