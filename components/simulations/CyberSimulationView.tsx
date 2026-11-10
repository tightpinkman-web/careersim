"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, Terminal as TerminalIcon, Activity, ChevronsRight, Network, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CyberPayload, TerminalLine } from "@/types/simulation";
import CyberWorkbench from "@/components/simulations/CyberWorkbench";
import { recordInformationGather } from "@/lib/telemetry/tracker";

interface CyberSimulationViewProps {
  payload: CyberPayload;
  narrativePrompt: string;
  /** When set, inspecting a threat-feed alert is logged as an information-gathering interaction
   *  (lib/telemetry/tracker.ts) for the Counselor Debrief Pack. */
  sessionId?: string;
}

const severityColor: Record<string, string> = {
  low: "text-sky-400 border-sky-500/30 bg-sky-500/10",
  medium: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  high: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  critical: "text-rose-400 border-rose-500/30 bg-rose-500/10",
};

export default function CyberSimulationView({ payload, narrativePrompt, sessionId }: CyberSimulationViewProps) {
  const { systemHealth, activeIncidents, terminalLines, alerts, currentDirectory } = payload;
  const [command, setCommand] = useState("");
  const [localLines, setLocalLines] = useState<TerminalLine[]>(terminalLines);
  const [workbenchOpen, setWorkbenchOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [localLines]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;
    setLocalLines((prev) => [
      ...prev,
      { id: `${Date.now()}`, type: "input", text: command, timestamp: new Date().toISOString() },
    ]);
    setCommand("");
  };

  const healthColor =
    systemHealth >= 70 ? "bg-emerald-500" : systemHealth >= 40 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-hairline bg-black text-emerald-400 md:flex-row">
      <div className="flex min-h-0 flex-1 flex-col pb-14">
        {/* Header: SOC system health */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline bg-obsidian px-4 py-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 shrink-0 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">SOC Health</span>
          </div>
          <div className="h-2 w-24 overflow-hidden rounded-full bg-obsidian sm:w-40">
            <motion.div
              className={cn("h-full rounded-full", healthColor)}
              animate={{ width: `${systemHealth}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <span className="text-xs text-slate-400">{systemHealth}%</span>
          <span className="flex items-center gap-1 text-xs text-rose-400 sm:ml-auto">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
            {activeIncidents} active incident{activeIncidents === 1 ? "" : "s"}
          </span>
        </div>

        {/* Terminal body */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-3 font-mono text-xs leading-relaxed">
          {localLines.map((line) => (
            <div
              key={line.id}
              className={cn(
                line.type === "input" && "text-emerald-300",
                line.type === "output" && "text-slate-300",
                line.type === "error" && "text-rose-400"
              )}
            >
              {line.type === "input" ? (
                <span>
                  <span className="text-slate-500">{currentDirectory}$ </span>
                  {line.text}
                </span>
              ) : (
                line.text
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-hairline px-4 py-3">
          <ChevronsRight className="h-4 w-4 shrink-0 text-emerald-500" />
          <span className="shrink-0 text-xs text-slate-500">{currentDirectory}$</span>
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Enter a command..."
            className="flex-1 bg-transparent font-mono text-xs text-emerald-300 outline-none placeholder:text-slate-600"
            autoComplete="off"
            spellCheck={false}
          />
        </form>

        <p className="border-t border-hairline bg-obsidian px-4 py-2 text-[11px] text-slate-500">{narrativePrompt}</p>
      </div>

      {/* Side drawer: live alert feed */}
      <div className="flex max-h-56 w-full shrink-0 flex-col border-t border-hairline bg-obsidian md:h-auto md:max-h-none md:w-72 md:border-l md:border-t-0">
        <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
          <TerminalIcon className="h-4 w-4 text-slate-300" />
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-300">Threat Feed</h2>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          <AnimatePresence initial={false}>
            {alerts.map((alert) => (
              <motion.div
                key={alert.id}
                onClick={() => sessionId && recordInformationGather(sessionId, "log", alert.id)}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "cursor-pointer rounded-md border px-3 py-2 text-xs",
                  severityColor[alert.severity],
                  alert.resolved && "opacity-40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold uppercase">{alert.severity}</span>
                  <span className="text-[10px] opacity-70">{alert.timestamp}</span>
                </div>
                <p className="mt-1 text-slate-200">{alert.message}</p>
                <p className="mt-1 text-[10px] opacity-70">source: {alert.source}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* SIEM / network topology workbench toggle + drawer */}
      {!workbenchOpen && (
        <button
          onClick={() => setWorkbenchOpen(true)}
          className="absolute bottom-4 left-4 flex items-center gap-2 rounded-md bg-obsidian px-4 py-2.5 text-xs font-medium text-emerald-300 ring-1 ring-signal/15 hover:bg-surface"
        >
          <Network className="h-4 w-4" />
          Workbench
        </button>
      )}
      <AnimatePresence>
        {workbenchOpen && (
          <motion.div
            initial={{ y: 360, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 360, opacity: 0 }}
            transition={{ type: "tween", duration: 0.2 }}
            className="absolute inset-x-0 bottom-0 flex h-3/4 flex-col overflow-hidden rounded-t-lg border border-hairline ring-1 ring-signal/15"
          >
            <div className="flex items-center gap-2 border-b border-hairline bg-obsidian px-4 py-3">
              <Network className="h-4 w-4 text-slate-300" />
              <h2 className="text-sm font-semibold text-slate-200">Workbench</h2>
              <button onClick={() => setWorkbenchOpen(false)} className="ml-auto rounded p-1 hover:bg-surface">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <CyberWorkbench payload={payload} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
