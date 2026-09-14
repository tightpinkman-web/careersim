"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";

function RequestFormInner() {
  const searchParams = useSearchParams();
  const [careerTitle, setCareerTitle] = useState(() => searchParams.get("career") ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/simulation-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ careerTitle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit your request.");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit your request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="h-8 w-8 text-signal" />
        <h2 className="text-lg font-semibold text-ink">Request received</h2>
        <p className="max-w-sm text-sm text-slate-400">
          Thanks. We&apos;ll review your requested career simulation and follow up if we need more detail.
        </p>
        <Link href="/" className="mt-2 flex items-center gap-1.5 text-sm font-medium text-signal hover:opacity-80">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block font-mono text-xs font-medium uppercase tracking-wide text-slate-400">
          Career Title
        </label>
        <input
          required
          value={careerTitle}
          onChange={(e) => setCareerTitle(e.target.value)}
          placeholder="e.g. Nurse Practitioner, Architect, Data Scientist"
          className="min-h-11 w-full border border-hairline bg-obsidian px-3 py-2.5 text-base text-ink placeholder:text-slate-500 outline-none focus:border-signal"
        />
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-rose-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 flex min-h-11 items-center justify-center gap-2 border border-signal bg-signal px-4 py-3 text-sm font-semibold text-obsidian transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? "Submitting..." : "Submit Request"}
      </button>
    </form>
  );
}

/** Wrapped in its own Suspense boundary because it reads the ?career= query param via
 *  useSearchParams, which Next requires to be inside Suspense during static rendering. */
export default function RequestForm() {
  return (
    <div className="mt-8 border border-hairline bg-surface p-6 sm:p-8">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
          </div>
        }
      >
        <RequestFormInner />
      </Suspense>
    </div>
  );
}
