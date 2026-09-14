"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

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
        <Button
          href="/"
          variant="secondary"
          icon={<ArrowLeft className="h-4 w-4 shrink-0" />}
          size="sm"
          className="mt-2"
        >
          Back to home
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block font-mono text-xs font-medium uppercase tracking-wide text-slate-400">
          Career Title
        </label>
        <Input
          required
          value={careerTitle}
          onChange={(e) => setCareerTitle(e.target.value)}
          placeholder="e.g. Nurse Practitioner, Architect, Data Scientist"
        />
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-rose-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting} loading={submitting} size="lg" className="mt-2">
        {submitting ? "Submitting..." : "Submit Request"}
      </Button>
    </form>
  );
}

/** Wrapped in its own Suspense boundary because it reads the ?career= query param via
 *  useSearchParams, which Next requires to be inside Suspense during static rendering. */
export default function RequestForm() {
  return (
    <Card className="mt-8">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
          </div>
        }
      >
        <RequestFormInner />
      </Suspense>
    </Card>
  );
}
