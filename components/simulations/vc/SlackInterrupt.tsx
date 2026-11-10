"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare, X } from "lucide-react";
import { STARTUP_NAMES } from "@/lib/simulation/vc-engine";

const INTERRUPT_DELAY_MS = 4 * 60 * 1000;

/**
 * Asynchronous Interruption for the VC Associate simulation: a simulated Slack DM toast from the
 * Managing Partner, firing once, 4 minutes into due diligence, demanding an immediate read on
 * Enterprise Mesh. Purely presentational, same posture as WorkspaceShell's interruption pings -
 * dismissing or ignoring it never touches simulation/grading state, it's a cognitive-load
 * competitor for attention while the student works the canvas.
 */
export default function SlackInterrupt() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setVisible(true), INTERRUPT_DELAY_MS);
    return () => clearTimeout(timeout);
  }, []);

  const showToast = visible && !dismissed;

  return (
    <AnimatePresence>
      {showToast && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          role="alert"
          className="fixed bottom-6 right-6 z-50 w-full max-w-xs rounded-2xl border border-hairline bg-obsidian p-8 text-slate-100 ring-1 ring-signal/20"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-signal/20 text-signal">
              <MessageSquare className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-200">Managing Partner &middot; direct message</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">
                Need your immediate read on {STARTUP_NAMES.ENTERPRISE_MESH} - drop what you&apos;re doing and get me a verdict now.
              </p>
            </div>
            <button
              onClick={() => setDismissed(true)}
              aria-label="Dismiss"
              className="shrink-0 rounded p-1 text-slate-500 hover:bg-surface hover:text-slate-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
