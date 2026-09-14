import { ClipboardList } from "lucide-react";
import RequestForm from "@/components/RequestForm";

export default function RequestPageClient() {
  return (
    <div className="min-h-full w-full bg-obsidian font-display">
      <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center border border-signal text-signal">
            <ClipboardList className="h-6 w-6" />
          </span>
          <p className="mt-3 font-mono text-xs font-semibold uppercase tracking-widest text-signal">
            REQUEST_A_SIMULATION
          </p>
          <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">Tell us the career you want tested</h1>
          <p className="mt-2 font-mono text-xs font-medium text-slate-500">
            Need a specific industry? Suggest new simulation scenarios for our build pipeline.
          </p>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-400">
            Counselors and students can request a new career track. We prioritize builds based on demand and fit
            for our AI Game Master format.
          </p>
        </div>

        <RequestForm />
      </div>
    </div>
  );
}
