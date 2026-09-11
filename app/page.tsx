"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  ShieldHalf,
  Kanban,
  Scale,
  LineChart,
  X,
  Clock,
  Target,
  Sparkles,
  Loader2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import type { CareerType } from "@/types/simulation";

interface CareerInfo {
  careerType: CareerType;
  title: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  mission: string[];
  skills: string[];
  duration: string;
}

const CAREERS: CareerInfo[] = [
  {
    careerType: "VENTURE_CAPITAL",
    title: "Venture Capital Associate",
    tagline: "Diligence a pre-Series A pitch and decide where the real risk is hiding.",
    icon: Briefcase,
    mission: [
      "Review a live pitch deck, inbox, and financials",
      "Spot red flags before recommending a term sheet",
      "Defend your investment thesis to a skeptical partner",
    ],
    skills: ["Financial Analysis", "Risk Identification", "Critical Thinking", "Persuasive Writing"],
    duration: "~10 minutes",
  },
  {
    careerType: "CYBERSECURITY",
    title: "SOC Incident Responder",
    tagline: "Contain an active ransomware breach before it takes down critical systems.",
    icon: ShieldHalf,
    mission: [
      "Triage live threat alerts and terminal output",
      "Sequence containment actions correctly",
      "Balance speed against forensic integrity",
    ],
    skills: ["Threat Triage", "Technical Command", "Decision Speed", "Incident Response"],
    duration: "~10 minutes",
  },
  {
    careerType: "PRODUCT_MANAGEMENT",
    title: "Product Manager",
    tagline: "Diagnose a checkout conversion drop and ship a sprint plan under a hard point budget.",
    icon: Kanban,
    mission: [
      "Diagnose the root cause from funnel data",
      "Prioritize a backlog against a fixed dev budget",
      "Defend your roadmap call with evidence",
    ],
    skills: ["Data-Driven Reasoning", "Prioritization", "Root Cause Analysis", "Stakeholder Communication"],
    duration: "~10 minutes",
  },
  {
    careerType: "CORPORATE_LAW",
    title: "Corporate Associate",
    tagline: "Negotiate a D2C acquisition and catch the predatory clause buried in the fine print.",
    icon: Scale,
    mission: [
      "Review a full acquisition agreement for risk",
      "Spot an unreasonable non-compete clause",
      "Negotiate market-standard terms with opposing counsel",
    ],
    skills: ["Contract Risk Detection", "Negotiation Strategy", "Precision Drafting", "Client Advocacy"],
    duration: "~10 minutes",
  },
  {
    careerType: "QUANT_TRADING",
    title: "Quant Trading Analyst",
    tagline: "Manage risk on a live position through a volatile central bank rate announcement.",
    icon: LineChart,
    mission: [
      "Read live price action and the order book",
      "Actively manage stop-loss and volatility parameters",
      "Make a decisive risk call under pressure",
    ],
    skills: ["Risk Management", "Volatility Reasoning", "Pattern Recognition", "Decisive Execution"],
    duration: "~10 minutes",
  },
];

function getAnonymousSessionId(): string {
  const KEY = "sim_anon_session_id";
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    // localStorage unavailable (private browsing, etc.) - fall back to a per-load id
    return crypto.randomUUID();
  }
}

export default function Home() {
  const router = useRouter();
  const [selected, setSelected] = useState<CareerInfo | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startSimulation = async () => {
    if (!selected || starting) return;
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/simulations/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonymousSessionId: getAnonymousSessionId(),
          careerType: selected.careerType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start the simulation.");
      router.push(`/simulations/${data.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start the simulation.");
      setStarting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">AI Career Simulator</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Choose a career to step into</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
            Each simulation is a live, AI-driven scenario. Your decisions are scored against how a strong
            performer would actually handle the job.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAREERS.map((career) => {
            const Icon = career.icon;
            return (
              <button
                key={career.careerType}
                onClick={() => setSelected(career)}
                className="flex flex-col items-start gap-3 rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="text-sm font-semibold text-slate-900">{career.title}</h2>
                <p className="text-xs leading-relaxed text-slate-500">{career.tagline}</p>
                <span className="mt-auto flex items-center gap-1 pt-2 text-xs font-medium text-indigo-600">
                  View briefing
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Onboarding briefing modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
            onClick={() => !starting && setSelected(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <selected.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
                      What you&apos;re stepping into
                    </p>
                    <h2 className="text-lg font-bold text-slate-900">{selected.title}</h2>
                  </div>
                </div>
                <button
                  onClick={() => !starting && setSelected(null)}
                  className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-slate-600">{selected.tagline}</p>

              <div className="mt-5">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  <Target className="h-3.5 w-3.5" />
                  Key Mission &amp; Objectives
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {selected.mission.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-indigo-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Core Skills Evaluated
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selected.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                Estimated duration: <span className="font-medium text-slate-700">{selected.duration}</span>
              </div>

              {error && (
                <p className="mt-4 flex items-center gap-1.5 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </p>
              )}

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setSelected(null)}
                  disabled={starting}
                  className="rounded-md px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={startSimulation}
                  disabled={starting}
                  className="flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {starting ? "Starting..." : "Start Simulation"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
