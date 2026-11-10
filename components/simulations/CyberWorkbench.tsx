"use client";

import { useEffect, useMemo, useState } from "react";
import { ListTree, Network, ShieldOff, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CyberPayload } from "@/types/simulation";

interface CyberWorkbenchProps {
  payload: CyberPayload;
}

const IPV4_PATTERN = /\b(\d{1,3}(?:\.\d{1,3}){3})\b/;

const severityRank: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const severityDot: Record<string, string> = {
  low: "bg-sky-400",
  medium: "bg-amber-400",
  high: "bg-orange-400",
  critical: "bg-rose-400",
};

interface NetworkNode {
  ip: string;
  subnet: string;
  maxSeverity: string;
  alertCount: number;
}

/** Pulls every distinct source IP out of the alert feed (terminal output doesn't reliably carry a
 *  parseable IP per line, so the topology map is built from alerts, same data the SIEM stream
 *  below renders) and groups them into /24-style subnets for the isolation toggle. */
function buildNetworkNodes(payload: CyberPayload): NetworkNode[] {
  const byIp = new Map<string, NetworkNode>();
  for (const alert of payload.alerts) {
    const match = alert.source.match(IPV4_PATTERN);
    const ip = match ? match[1] : alert.source;
    const subnet = match ? `${match[1].split(".").slice(0, 3).join(".")}.0/24` : "unknown";
    const existing = byIp.get(ip);
    if (existing) {
      existing.alertCount += 1;
      if (severityRank[alert.severity] > severityRank[existing.maxSeverity]) existing.maxSeverity = alert.severity;
    } else {
      byIp.set(ip, { ip, subnet, maxSeverity: alert.severity, alertCount: 1 });
    }
  }
  return Array.from(byIp.values());
}

/**
 * Cyber Workbench: a structured SIEM log stream (the same alert feed CyberSimulationView already
 * shows, but parsed into a filterable table instead of narrative cards) plus a derived network
 * topology map with per-IP inspection and subnet isolation toggles. Isolation is a local,
 * presentational sandbox action - it marks a subnet as contained for the student's own reasoning,
 * it does not call back into the simulation engine or change payload.systemHealth/activeIncidents.
 */
export default function CyberWorkbench({ payload }: CyberWorkbenchProps) {
  const nodes = useMemo(() => buildNetworkNodes(payload), [payload]);
  const subnets = useMemo(() => Array.from(new Set(nodes.map((n) => n.subnet))), [nodes]);

  const [severityFilter, setSeverityFilter] = useState<"all" | "high" | "critical">("all");
  const [selectedIp, setSelectedIp] = useState<string | null>(null);
  const [isolatedSubnets, setIsolatedSubnets] = useState<Set<string>>(new Set());
  const [streamedCount, setStreamedCount] = useState(0);

  // Progressively reveals the SIEM stream rather than dumping every alert at once, so it reads as
  // a live feed - resets whenever the underlying alert set changes (a new turn).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting the stream reveal for a new alert set is the whole point of this effect
    setStreamedCount(0);
    if (payload.alerts.length === 0) return;
    const interval = setInterval(() => {
      setStreamedCount((count) => (count >= payload.alerts.length ? count : count + 1));
    }, 220);
    return () => clearInterval(interval);
  }, [payload.alerts]);

  const streamedAlerts = payload.alerts
    .slice(0, streamedCount)
    .filter((alert) => severityFilter === "all" || alert.severity === severityFilter);

  function toggleSubnet(subnet: string) {
    setIsolatedSubnets((prev) => {
      const next = new Set(prev);
      if (next.has(subnet)) next.delete(subnet);
      else next.add(subnet);
      return next;
    });
  }

  const selectedNode = nodes.find((n) => n.ip === selectedIp) ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto bg-black p-3 text-emerald-400 md:flex-row">
      {/* SIEM log stream */}
      <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-hairline bg-obsidian">
        <div className="flex items-center gap-2 border-b border-hairline px-3 py-2.5">
          <ListTree className="h-3.5 w-3.5 text-slate-300" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">SIEM Log Stream</h3>
          <div className="ml-auto flex gap-1">
            {(["all", "high", "critical"] as const).map((level) => (
              <button
                key={level}
                onClick={() => setSeverityFilter(level)}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase",
                  severityFilter === level ? "bg-signal text-white" : "text-slate-500 hover:text-slate-300"
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2 font-mono text-[11px]">
          {streamedAlerts.length === 0 && <p className="p-2 text-slate-600">Awaiting events...</p>}
          {streamedAlerts.map((alert) => (
            <div key={alert.id} className="flex items-start gap-2 border-b border-hairline px-1 py-1.5">
              <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", severityDot[alert.severity])} />
              <span className="shrink-0 text-slate-500">{alert.timestamp}</span>
              <span className="shrink-0 font-semibold text-slate-400">{alert.source}</span>
              <span className="text-slate-200">{alert.message}</span>
              {alert.resolved && <span className="ml-auto shrink-0 text-[9px] text-slate-600">RESOLVED</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Network topology */}
      <div className="flex min-h-0 w-full flex-col rounded-lg border border-hairline bg-obsidian md:w-72">
        <div className="flex items-center gap-2 border-b border-hairline px-3 py-2.5">
          <Network className="h-3.5 w-3.5 text-slate-300" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">Network Topology</h3>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          {subnets.length === 0 && <p className="text-[11px] text-slate-600">No hosts observed yet.</p>}
          {subnets.map((subnet) => {
            const subnetNodes = nodes.filter((n) => n.subnet === subnet);
            const isolated = isolatedSubnets.has(subnet);
            return (
              <div key={subnet} className={cn("rounded-md border p-2", isolated ? "border-rose-500/40 bg-rose-500/5" : "border-hairline")}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="font-mono text-[11px] text-slate-300">{subnet}</span>
                  <button
                    onClick={() => toggleSubnet(subnet)}
                    className={cn(
                      "flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
                      isolated ? "bg-rose-500/20 text-rose-300" : "bg-obsidian text-slate-400 hover:text-slate-200"
                    )}
                  >
                    {isolated ? <ShieldOff className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                    {isolated ? "Isolated" : "Isolate"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {subnetNodes.map((node) => (
                    <button
                      key={node.ip}
                      onClick={() => setSelectedIp(node.ip)}
                      className={cn(
                        "flex items-center gap-1 rounded border px-1.5 py-1 font-mono text-[10px]",
                        selectedIp === node.ip ? "border-signal text-signal" : "border-hairline text-slate-400",
                        isolated && "opacity-40"
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", severityDot[node.maxSeverity])} />
                      {node.ip}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {selectedNode && (
          <div className="border-t border-hairline p-3 text-[11px]">
            <p className="font-mono font-semibold text-slate-200">{selectedNode.ip}</p>
            <p className="mt-1 text-slate-500">Subnet: {selectedNode.subnet}</p>
            <p className="text-slate-500">
              {selectedNode.alertCount} alert{selectedNode.alertCount === 1 ? "" : "s"} - highest severity:{" "}
              <span className="font-semibold uppercase text-slate-300">{selectedNode.maxSeverity}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
