"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, X, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

type EntitlementTier = "ENTERPRISE_STUDENT" | "PUBLIC_DEMO";

/** Only surfaces the "Have a School Access Key?" entry point for students who are both on the
 *  capped demo tier and signed in on a personal (non-partner) email domain - a student whose
 *  school domain is already whitelisted has nothing to redeem. */
export default function CohortKeyModal() {
  const [tier, setTier] = useState<EntitlementTier | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [accessKey, setAccessKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successOrgName, setSuccessOrgName] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/entitlement");
        const data = await res.json();
        if (ignore) return;
        setTier(data.tier ?? "PUBLIC_DEMO");
        setEmail(data.email ?? null);
      } catch {
        // Entry point just won't render - not worth surfacing an error for this.
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const isPersonalEmail = email ? /^[^@]+@gmail\.com$/i.test(email) : false;
  if (tier !== "PUBLIC_DEMO" || !isPersonalEmail) return null;

  const submit = async () => {
    if (!accessKey.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/cohort-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessKey: accessKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "That access key wasn't recognized.");
      setSuccessOrgName(data.organization?.name ?? null);
      setTier("ENTERPRISE_STUDENT");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That access key wasn't recognized.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex min-h-11 items-center gap-1.5 border border-hairline px-3 py-1.5 font-mono text-xs font-medium uppercase tracking-wide text-slate-400 hover:border-signal hover:text-signal"
      >
        <KeyRound className="h-3.5 w-3.5" />
        Have a School Access Key?
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/70 p-4"
            onClick={() => !submitting && setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm border border-hairline bg-surface p-6 font-display"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-signal">
                    Partner Cohort Unlock
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-ink">Enter Access Key</h2>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="shrink-0 border border-hairline p-1.5 text-slate-400 hover:border-signal hover:text-signal"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {successOrgName ? (
                <div className="mt-5 flex flex-col items-center gap-2 py-4 text-center">
                  <CheckCircle2 className="h-8 w-8 text-signal" />
                  <p className="text-sm text-slate-300">
                    You&apos;re now enrolled under <span className="font-semibold text-ink">{successOrgName}</span>.
                    Full enterprise simulations are unlocked.
                  </p>
                  <button
                    onClick={() => setOpen(false)}
                    className="mt-2 flex min-h-11 items-center gap-2 border border-signal bg-signal px-4 py-2 font-mono text-xs font-medium uppercase tracking-wide text-obsidian hover:opacity-90"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <p className="mt-3 text-sm text-slate-400">
                    Ask your counselor or Mindler representative for your school&apos;s cohort key to unlock full
                    multi-step enterprise simulations.
                  </p>
                  <input
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    placeholder="e.g. MNDL-DPS2026"
                    className="mt-4 min-h-11 w-full border border-hairline bg-slate-950/40 px-3 py-2 text-sm text-ink outline-none placeholder:text-slate-600 focus:border-signal"
                  />
                  {error && (
                    <p className="mt-3 flex items-center gap-1.5 border border-rose-900 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      {error}
                    </p>
                  )}
                  <button
                    onClick={submit}
                    disabled={submitting || !accessKey.trim()}
                    className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 border border-signal bg-signal px-4 py-2 font-mono text-xs font-medium uppercase tracking-wide text-obsidian hover:opacity-90 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Unlock Enterprise Access"}
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
