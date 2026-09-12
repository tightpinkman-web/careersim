import { ClipboardList } from "lucide-react";
import RequestForm from "@/components/RequestForm";

export default function RequestPageClient() {
  return (
    <div className="min-h-full w-full bg-slate-50">
      <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <ClipboardList className="h-6 w-6" />
          </span>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-indigo-600">Request a Simulation</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Tell us the career you want tested</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
            Counselors and students can request a new career track. We prioritize builds based on demand and fit
            for our AI Game Master format.
          </p>
        </div>

        <RequestForm />
      </div>
    </div>
  );
}
