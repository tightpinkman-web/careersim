"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, AlertTriangle, ArrowLeft, ClipboardList } from "lucide-react";

type Role = "COUNSELOR" | "STUDENT";

export default function RequestPage() {
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("COUNSELOR");
  const [organization, setOrganization] = useState("");
  const [requestedCareerTitle, setRequestedCareerTitle] = useState("");
  const [industry, setIndustry] = useState("");
  const [keySkills, setKeySkills] = useState("");
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
        body: JSON.stringify({
          name,
          role,
          organization,
          requestedCareerTitle,
          industry,
          keySkills,
        }),
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

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">Request received</h2>
              <p className="max-w-sm text-sm text-slate-500">
                Thanks &mdash; we&apos;ll review your requested career simulation and follow up if we need more
                detail.
              </p>
              <Link
                href="/"
                className="mt-2 flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to home
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["COUNSELOR", "STUDENT"] as Role[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setRole(option)}
                      className={`rounded-md border px-3 py-2.5 text-sm font-medium transition-colors ${
                        role === option
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {option === "COUNSELOR" ? "Counselor" : "Student"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Organization (optional)</label>
                <input
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="School or counseling practice"
                  className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Requested Career Title</label>
                <input
                  required
                  value={requestedCareerTitle}
                  onChange={(e) => setRequestedCareerTitle(e.target.value)}
                  placeholder="e.g. Nurse Practitioner, Architect, Data Scientist"
                  className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Industry</label>
                <input
                  required
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Healthcare, Architecture, Technology"
                  className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Key Skills to Test</label>
                <textarea
                  required
                  value={keySkills}
                  onChange={(e) => setKeySkills(e.target.value)}
                  placeholder="e.g. Patient triage, spatial reasoning, statistical modeling"
                  rows={3}
                  className="w-full resize-none rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
              </div>

              {error && (
                <p className="flex items-center gap-1.5 text-xs text-rose-600">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
