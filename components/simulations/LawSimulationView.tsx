"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, MessageSquare, X, Send, PenLine, FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LawPayload, NegotiationMessage } from "@/types/simulation";
import LegalWorkbench from "@/components/simulations/LegalWorkbench";
import { recordInformationGather } from "@/lib/telemetry/tracker";

interface LawSimulationViewProps {
  payload: LawPayload;
  narrativePrompt: string;
  /** When set, opening a clause's redline detail is logged as an information-gathering
   *  interaction (lib/telemetry/tracker.ts) for the Counselor Debrief Pack. */
  sessionId?: string;
}

export default function LawSimulationView({ payload, narrativePrompt, sessionId }: LawSimulationViewProps) {
  const { documentTitle, clauses, negotiationThread } = payload;
  const [activeClauseId, setActiveClauseId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<NegotiationMessage[]>(negotiationThread);
  const [draft, setDraft] = useState("");
  const [workbenchOpen, setWorkbenchOpen] = useState(false);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}`, sender: "student", text: draft, timestamp: new Date().toISOString() },
    ]);
    setDraft("");
  };

  return (
    <div className="relative flex h-full min-h-0 gap-4 overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <FileText className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">{documentTitle}</h2>
          <span className="ml-auto text-xs text-slate-400">
            {clauses.filter((c) => c.flagged).length} flagged clause{clauses.filter((c) => c.flagged).length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6 font-serif">
          {clauses.map((clause) => (
            <div key={clause.id}>
              <h3 className="mb-1 text-sm font-semibold text-slate-800">{clause.heading}</h3>
              <p
                onClick={() => {
                  if (!clause.redline) return;
                  setActiveClauseId(clause.id);
                  if (sessionId) recordInformationGather(sessionId, "exhibit", clause.id);
                }}
                className={cn(
                  "text-sm leading-relaxed text-slate-700",
                  clause.flagged && "cursor-pointer rounded bg-rose-50 px-1 decoration-rose-400 decoration-2 underline underline-offset-4",
                  clause.redline && "cursor-pointer hover:bg-amber-50"
                )}
              >
                {clause.text}
              </p>
              {activeClauseId === clause.id && clause.redline && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs"
                >
                  <div className="mb-2 flex items-center gap-1 font-semibold text-amber-700">
                    <PenLine className="h-3.5 w-3.5" />
                    Redline suggestion
                  </div>
                  <p className="text-slate-500 line-through">{clause.redline.original}</p>
                  <p className="mt-1 text-emerald-700">{clause.redline.proposed}</p>
                  {clause.redline.rationale && (
                    <p className="mt-2 text-slate-500">{clause.redline.rationale}</p>
                  )}
                </motion.div>
              )}
            </div>
          ))}
        </div>
        <p className="border-t border-slate-200 bg-slate-50 px-4 py-2 pb-14 text-[11px] text-slate-500">{narrativePrompt}</p>
      </div>

      {/* Floating trigger */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="absolute bottom-4 right-4 flex items-center gap-2 rounded-md bg-obsidian px-4 py-2.5 text-xs font-medium text-white ring-1 ring-signal/15 hover:bg-surface"
        >
          <MessageSquare className="h-4 w-4" />
          Negotiation ({messages.length})
        </button>
      )}

      {/* Overlay negotiation drawer */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ x: 360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 360, opacity: 0 }}
            transition={{ type: "tween", duration: 0.2 }}
            className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col rounded-l-lg border border-slate-200 bg-white ring-1 ring-signal/15"
          >
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
              <MessageSquare className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-700">Opposing Counsel</h2>
              <button onClick={() => setChatOpen(false)} className="ml-auto rounded p-1 hover:bg-slate-100">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn("flex", msg.sender === "student" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-3 py-2 text-xs",
                      msg.sender === "student" ? "bg-signal text-white" : "bg-slate-100 text-slate-700"
                    )}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-slate-200 p-3">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Propose a term..."
                className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:border-signal"
              />
              <button
                type="submit"
                className="rounded-md bg-signal p-2 text-white hover:opacity-90 disabled:opacity-40"
                disabled={!draft.trim()}
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Risk scanner / counter-proposal workbench toggle + drawer */}
      {!workbenchOpen && (
        <button
          onClick={() => setWorkbenchOpen(true)}
          className="absolute bottom-4 left-4 flex items-center gap-2 rounded-md bg-obsidian px-4 py-2.5 text-xs font-medium text-white ring-1 ring-signal/15 hover:bg-surface"
        >
          <FileSearch className="h-4 w-4" />
          Workbench
        </button>
      )}
      <AnimatePresence>
        {workbenchOpen && (
          <motion.div
            initial={{ x: -360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -360, opacity: 0 }}
            transition={{ type: "tween", duration: 0.2 }}
            className="absolute inset-y-0 left-0 flex w-full max-w-sm flex-col overflow-hidden rounded-r-lg border border-slate-200 bg-white ring-1 ring-signal/15"
          >
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
              <FileSearch className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-700">Workbench</h2>
              <button onClick={() => setWorkbenchOpen(false)} className="ml-auto rounded p-1 hover:bg-slate-100">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            <LegalWorkbench payload={payload} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
