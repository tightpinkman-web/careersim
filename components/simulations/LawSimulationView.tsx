"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, MessageSquare, X, Send, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LawPayload, NegotiationMessage } from "@/types/simulation";

interface LawSimulationViewProps {
  payload: LawPayload;
  narrativePrompt: string;
}

export default function LawSimulationView({ payload, narrativePrompt }: LawSimulationViewProps) {
  const { documentTitle, clauses, negotiationThread } = payload;
  const [activeClauseId, setActiveClauseId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<NegotiationMessage[]>(negotiationThread);
  const [draft, setDraft] = useState("");

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
      <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
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
                onClick={() => clause.redline && setActiveClauseId(clause.id)}
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
        <p className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-500">{narrativePrompt}</p>
      </div>

      {/* Floating trigger */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="absolute bottom-4 right-4 flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-lg hover:bg-slate-800"
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
            className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col rounded-l-lg border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
              <MessageSquare className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-700">Opposing Counsel</h2>
              <button onClick={() => setChatOpen(false)} className="ml-auto rounded p-1 hover:bg-slate-100">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn("flex", msg.sender === "student" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-3 py-2 text-xs",
                      msg.sender === "student" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"
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
                className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:border-indigo-400"
              />
              <button
                type="submit"
                className="rounded-md bg-indigo-600 p-2 text-white hover:bg-indigo-700 disabled:opacity-40"
                disabled={!draft.trim()}
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
