"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Paperclip, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, Calculator, Inbox, Database, Gauge, FileSignature, Gavel, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VCPayload, VCEmail } from "@/types/simulation";
import VCWorkbench from "@/components/simulations/VCWorkbench";
import TickerHeader from "@/components/simulations/vc/TickerHeader";
import InboundHub from "@/components/simulations/vc/InboundHub";
import SlackInterrupt from "@/components/simulations/vc/SlackInterrupt";
import DataRoomCanvas from "@/components/simulations/vc/DataRoomCanvas";
import UnitEconomicsModel from "@/components/simulations/vc/UnitEconomicsModel";
import TermSheetBuilder from "@/components/simulations/vc/TermSheetBuilder";
import PartnerDefense from "@/components/simulations/vc/PartnerDefense";
import { recordInformationGather } from "@/lib/telemetry/tracker";
import { recordToolOpened, type VcToolId } from "@/lib/telemetry/vc-tracker";
import type { StartupId } from "@/lib/simulation/vc-engine";

type DrawerKind = VcToolId | null;

const LEFT_DRAWER_TOOLS: Array<{ id: DrawerKind; label: string; icon: typeof Calculator }> = [
  { id: "workbench", label: "Workbench", icon: Calculator },
  { id: "dataroom", label: "Data Room", icon: Database },
  { id: "unitEconomics", label: "Unit Econ", icon: Gauge },
];

const RIGHT_DRAWER_TOOLS: Array<{ id: DrawerKind; label: string; icon: typeof Inbox }> = [
  { id: "inbound", label: "Inbound Hub", icon: Inbox },
  { id: "termsheet", label: "Term Sheet", icon: FileSignature },
  { id: "partnerDefense", label: "Defense Room", icon: Gavel },
];

interface VCSimulationViewProps {
  payload: VCPayload;
  narrativePrompt: string;
  /** When set, opening an email or paging through the deck is logged as an information-gathering
   *  interaction (lib/telemetry/tracker.ts) for the Counselor Debrief Pack. Omitted entirely in
   *  the static /simulations/preview sandbox, where there's no real session to attribute it to. */
  sessionId?: string;
}

export default function VCSimulationView({ payload, narrativePrompt, sessionId }: VCSimulationViewProps) {
  const { emails, memoDraft, deckSlides, financialMetrics, startupName } = payload;
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(emails[0]?.id ?? null);
  const [memo, setMemo] = useState(memoDraft);
  const [slideIndex, setSlideIndex] = useState(0);
  const [activeDrawer, setActiveDrawer] = useState<DrawerKind>(null);
  const [auditedStartupIds, setAuditedStartupIds] = useState<Set<StartupId>>(new Set());

  function toggleDrawer(kind: DrawerKind) {
    setActiveDrawer((current) => {
      const next = current === kind ? null : kind;
      if (next && sessionId) recordToolOpened(sessionId, next);
      return next;
    });
  }

  const selectedEmail: VCEmail | undefined = emails.find((e) => e.id === selectedEmailId);
  const activeSlide = deckSlides[slideIndex];

  return (
    <div className="relative flex h-full min-h-0 flex-col gap-8 overflow-hidden">
      <TickerHeader />
      <SlackInterrupt />
      <div className="relative grid min-h-0 flex-1 grid-cols-1 gap-8 overflow-hidden md:grid-cols-2">
      {/* Left column: inbox + memo */}
      <div className="flex min-h-0 flex-col gap-8">
        <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-4">
            <Mail className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-700">Inbox</h2>
            <span className="ml-auto text-xs text-slate-400">{emails.length} messages</span>
          </div>
          <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
            <ul className="max-h-40 w-full shrink-0 overflow-y-auto border-b border-slate-100 sm:max-h-none sm:w-1/2 sm:min-w-[160px] sm:border-b-0 sm:border-r">
              {emails.map((email) => (
                <li key={email.id}>
                  <button
                    onClick={() => {
                      setSelectedEmailId(email.id);
                      if (sessionId) recordInformationGather(sessionId, "email", email.id);
                    }}
                    className={cn(
                      "w-full border-b border-slate-100 px-3 py-2 text-left transition-colors",
                      selectedEmailId === email.id ? "bg-signal/10" : "hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn("truncate text-xs font-medium", !email.read && "font-semibold text-slate-900")}>
                        {email.from}
                      </span>
                      {!email.read && <span className="ml-1 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />}
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

        <div className="flex min-h-[160px] flex-col rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-700">Investment Memo</h2>
          </div>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="Draft your investment memo..."
            className="min-h-[120px] flex-1 resize-none rounded-b-2xl p-8 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-1 focus:ring-signal/30"
          />
        </div>
      </div>

      {/* Right column: deck + financials */}
      <div className="flex min-h-0 flex-col gap-8">
        <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-hairline bg-obsidian text-white">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <h2 className="text-sm font-semibold">{startupName}: Data Room</h2>
            <span className="text-xs text-slate-400">
              {deckSlides.length > 0 ? slideIndex + 1 : 0} / {deckSlides.length}
            </span>
          </div>
          <div className="relative flex min-h-[220px] flex-1 items-center justify-center p-8">
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
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-signal" />
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
                  onClick={() => {
                    const nextIndex = Math.max(0, slideIndex - 1);
                    setSlideIndex(nextIndex);
                    if (sessionId && deckSlides[nextIndex]) recordInformationGather(sessionId, "exhibit", deckSlides[nextIndex].id);
                  }}
                  disabled={slideIndex === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md bg-white/10 p-1.5 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    const nextIndex = Math.min(deckSlides.length - 1, slideIndex + 1);
                    setSlideIndex(nextIndex);
                    if (sessionId && deckSlides[nextIndex]) recordInformationGather(sessionId, "exhibit", deckSlides[nextIndex].id);
                  }}
                  disabled={slideIndex === deckSlides.length - 1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-white/10 p-1.5 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Key Financials</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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

        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
          {narrativePrompt}
        </p>
      </div>
      </div>

      {/* Left-side analyst tools: Workbench / Data Room / Unit Economics. `fixed` rather than
          `absolute` - this canvas now nests inside the Desktop OS Shell's narrower center grid
          column (see WorkspaceShell), so a drawer anchored to that column's own (much narrower)
          box would collide with the opposite drawer in the middle; anchoring to the viewport
          instead keeps both drawers exactly where they were before that nesting changed. */}
      <div className="fixed bottom-4 left-4 z-20 flex flex-col-reverse gap-2">
        {LEFT_DRAWER_TOOLS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => toggleDrawer(id)}
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-2.5 text-xs font-medium ring-1 ring-signal/15",
              activeDrawer === id ? "bg-signal text-white" : "bg-obsidian text-white hover:bg-surface"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
      <AnimatePresence>
        {(activeDrawer === "workbench" || activeDrawer === "dataroom" || activeDrawer === "unitEconomics") && (
          <motion.div
            key={activeDrawer}
            initial={{ x: -360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -360, opacity: 0 }}
            transition={{ type: "tween", duration: 0.2 }}
            className="fixed inset-y-4 left-4 z-40 flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white pb-16 ring-1 ring-signal/15"
          >
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-end border-b border-slate-200 px-2 py-1">
                <button onClick={() => setActiveDrawer(null)} className="rounded p-1 hover:bg-slate-100">
                  <X className="h-4 w-4 text-slate-500" />
                </button>
              </div>
              {activeDrawer === "workbench" && <VCWorkbench payload={payload} />}
              {activeDrawer === "dataroom" && (
                <DataRoomCanvas
                  sessionId={sessionId}
                  onStartupViewed={(id) => setAuditedStartupIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))}
                />
              )}
              {activeDrawer === "unitEconomics" && <UnitEconomicsModel sessionId={sessionId} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right-side deal tools: Inbound Hub / Term Sheet Builder - `fixed`, same reasoning as the
          left-side stack above. */}
      <div className="fixed bottom-4 right-4 z-20 flex flex-col-reverse gap-2">
        {RIGHT_DRAWER_TOOLS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => toggleDrawer(id)}
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-2.5 text-xs font-medium ring-1 ring-signal/15",
              activeDrawer === id ? "bg-signal text-white" : "bg-obsidian text-white hover:bg-surface"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
      <AnimatePresence>
        {(activeDrawer === "inbound" || activeDrawer === "termsheet" || activeDrawer === "partnerDefense") && (
          <motion.div
            key={activeDrawer}
            initial={{ x: 360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 360, opacity: 0 }}
            transition={{ type: "tween", duration: 0.2 }}
            className="fixed inset-y-4 right-4 z-40 flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white pb-16 ring-1 ring-signal/15"
          >
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-end border-b border-slate-200 px-2 py-1">
                <button onClick={() => setActiveDrawer(null)} className="rounded p-1 hover:bg-slate-100">
                  <X className="h-4 w-4 text-slate-500" />
                </button>
              </div>
              {activeDrawer === "inbound" && <InboundHub sessionId={sessionId} />}
              {activeDrawer === "termsheet" && <TermSheetBuilder sessionId={sessionId} />}
              {activeDrawer === "partnerDefense" && <PartnerDefense sessionId={sessionId} auditedStartupIds={auditedStartupIds} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
