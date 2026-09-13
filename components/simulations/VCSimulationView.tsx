"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Paperclip, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VCPayload, VCEmail } from "@/types/simulation";

interface VCSimulationViewProps {
  payload: VCPayload;
  narrativePrompt: string;
}

export default function VCSimulationView({ payload, narrativePrompt }: VCSimulationViewProps) {
  const { emails, memoDraft, deckSlides, financialMetrics, startupName } = payload;
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(emails[0]?.id ?? null);
  const [memo, setMemo] = useState(memoDraft);
  const [slideIndex, setSlideIndex] = useState(0);

  const selectedEmail: VCEmail | undefined = emails.find((e) => e.id === selectedEmailId);
  const activeSlide = deckSlides[slideIndex];

  return (
    <div className="grid h-full grid-cols-1 gap-4 overflow-hidden md:grid-cols-2">
      {/* Left column: inbox + memo */}
      <div className="flex min-h-0 flex-col gap-4">
        <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
            <Mail className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-700">Inbox</h2>
            <span className="ml-auto text-xs text-slate-400">{emails.length} messages</span>
          </div>
          <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
            <ul className="max-h-40 w-full shrink-0 overflow-y-auto border-b border-slate-100 sm:max-h-none sm:w-1/2 sm:min-w-[160px] sm:border-b-0 sm:border-r">
              {emails.map((email) => (
                <li key={email.id}>
                  <button
                    onClick={() => setSelectedEmailId(email.id)}
                    className={cn(
                      "w-full border-b border-slate-100 px-3 py-2 text-left transition-colors",
                      selectedEmailId === email.id ? "bg-indigo-50" : "hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn("truncate text-xs font-medium", !email.read && "font-semibold text-slate-900")}>
                        {email.from}
                      </span>
                      {!email.read && <span className="ml-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />}
                    </div>
                    <p className="truncate text-xs text-slate-600">{email.subject}</p>
                  </button>
                </li>
              ))}
            </ul>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <AnimatePresence mode="wait">
                {selectedEmail ? (
                  <motion.div
                    key={selectedEmail.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                  >
                    <h3 className="text-sm font-semibold text-slate-900">{selectedEmail.subject}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedEmail.from} &middot; {selectedEmail.receivedAt}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{selectedEmail.body}</p>
                    {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {selectedEmail.attachments.map((att) => (
                          <span
                            key={att}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600"
                          >
                            <Paperclip className="h-3 w-3" />
                            {att}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <p className="text-sm text-slate-400">Select a message to read it.</p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex min-h-[160px] flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-700">Investment Memo</h2>
          </div>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="Draft your investment memo..."
            className="min-h-[120px] flex-1 resize-none rounded-b-lg p-4 text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Right column: deck + financials */}
      <div className="flex min-h-0 flex-col gap-4">
        <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-slate-200 bg-slate-900 text-white shadow-sm">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold">{startupName}: Data Room</h2>
            <span className="text-xs text-slate-400">
              {deckSlides.length > 0 ? slideIndex + 1 : 0} / {deckSlides.length}
            </span>
          </div>
          <div className="relative flex min-h-[220px] flex-1 items-center justify-center p-6">
            <AnimatePresence mode="wait">
              {activeSlide && (
                <motion.div
                  key={activeSlide.id}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.2 }}
                  className="w-full"
                >
                  <h3 className="text-lg font-semibold">{activeSlide.title}</h3>
                  <ul className="mt-4 space-y-2">
                    {activeSlide.bullets.map((bullet, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-indigo-400" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
            {deckSlides.length > 1 && (
              <>
                <button
                  onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
                  disabled={slideIndex === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md bg-white/10 p-1.5 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setSlideIndex((i) => Math.min(deckSlides.length - 1, i + 1))}
                  disabled={slideIndex === deckSlides.length - 1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-white/10 p-1.5 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Key Financials</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {financialMetrics.map((metric) => (
              <div key={metric.label} className="rounded-md bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{metric.label}</p>
                <div className="mt-1 flex items-center gap-1">
                  <p className="text-sm font-semibold text-slate-900">{metric.value}</p>
                  {metric.trend === "up" && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
                  {metric.trend === "down" && <TrendingDown className="h-3.5 w-3.5 text-rose-500" />}
                  {metric.trend === "flat" && <Minus className="h-3.5 w-3.5 text-slate-400" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
          {narrativePrompt}
        </p>
      </div>
    </div>
  );
}
