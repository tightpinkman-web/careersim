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
  Target,
  Sparkles,
  Clock,
  AlertTriangle,
  ArrowRight,
  Megaphone,
  GraduationCap,
} from "lucide-react";
import PreSimPrepModal from "@/components/PreSimPrepModal";
import { getAnonymousSessionId } from "@/lib/anonymousSession";
import { ageTierForMode, type CareerType, type SimulationMode } from "@/types/simulation";

interface CareerInfo {
  careerType: CareerType;
  title: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Shown in the step-1 briefing modal, before a mode is chosen - mode-agnostic. */
  mission: string[];
  skills: string[];
  duration: string;
  keyConcepts: Record<SimulationMode, [string, string, string]>;
  /** Shown in PreSimPrepModal's "Your Mission & Core Objective", tuned per mode. */
  prepMission: Record<SimulationMode, string[]>;
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
    keyConcepts: {
      professional: [
        "ARR (Annual Recurring Revenue): the yearly revenue a subscription business can count on repeating.",
        "Churn: the rate at which customers cancel or fail to renew - the silent killer of recurring revenue.",
        "Term Sheet: the non-binding document that sets the price and key terms of an investment.",
      ],
      child: [
        "Equity: owning a slice of the company's pizza pie - the bigger your slice, the more you get if the pizza (the company) grows.",
        "Recurring Revenue: money a business collects again and again, like a monthly allowance instead of a one-time gift.",
        "Churn: when customers stop coming back - like friends who stop showing up to your lemonade stand.",
      ],
    },
    prepMission: {
      professional: [
        "Review a live pitch deck, inbox, and financials",
        "Spot red flags before recommending a term sheet",
        "Defend your investment thesis to a skeptical partner",
      ],
      child: [
        "Ask sharp questions and notice when something doesn't quite add up",
        "Explain your reasoning clearly enough that a partner could follow it",
        "Stay curious about the story behind the numbers, not just the numbers themselves",
      ],
    },
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
    keyConcepts: {
      professional: [
        "Ransomware: malicious software that encrypts a victim's files and demands payment to unlock them.",
        "Containment: isolating an infected system from the network before an attacker can spread further.",
        "EDR: security software that watches individual computers for suspicious activity in real time.",
      ],
      child: [
        "Ransomware: a computer virus that locks up files and demands money to unlock them - like a digital kidnapping.",
        "Containment: cutting off a sick computer from the rest of the network, like isolating someone with a cold.",
        "Security Alert: a warning sign that something suspicious might be happening, like a smoke detector going off.",
      ],
    },
    prepMission: {
      professional: [
        "Triage live threat alerts and terminal output",
        "Sequence containment actions correctly",
        "Balance speed against forensic integrity",
      ],
      child: [
        "Stay calm and think through the problem step by step, like solving a puzzle under a ticking clock",
        "Communicate clearly with your team so everyone knows what to do next",
        "Stay curious about the clues the system is giving you instead of guessing",
      ],
    },
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
    keyConcepts: {
      professional: [
        "Conversion Rate: the percentage of visitors who complete a desired action, like finishing a purchase.",
        "Sprint: a fixed time block (often 1-2 weeks) where a team commits to completing a set amount of work.",
        "Backlog: the running list of features and fixes a team hasn't built yet, ranked by priority.",
      ],
      child: [
        "Conversion Rate: out of everyone who visits a store, how many actually buy something.",
        "Sprint: a short, focused work period - like a two-week countdown to finish a project.",
        "Backlog: your to-do list of ideas and fixes, sorted by what matters most.",
      ],
    },
    prepMission: {
      professional: [
        "Diagnose the root cause from funnel data",
        "Prioritize a backlog against a fixed dev budget",
        "Defend your roadmap call with evidence",
      ],
      child: [
        "Figure out the real reason something is going wrong before jumping to a fix",
        "Work as a team to decide what matters most with limited time",
        "Stay curious about what the evidence is actually telling you",
      ],
    },
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
    keyConcepts: {
      professional: [
        "Non-Compete Clause: a contract term restricting someone from working for a competitor for a set time and area.",
        "Redline: a tracked-changes edit showing exactly what language is being added, removed, or changed.",
        "Indemnification: a promise in a contract to cover the other party's losses if certain problems arise.",
      ],
      child: [
        "Non-Compete Clause: a rule saying you can't work for a rival business for a while - like a 'no rematch' rule.",
        "Redline: marking up a document to show exactly what you want to change, like editing an essay.",
        "Indemnification: a promise to pay for damages if something goes wrong - a safety net written into a contract.",
      ],
    },
    prepMission: {
      professional: [
        "Review a full acquisition agreement for risk",
        "Spot an unreasonable non-compete clause",
        "Negotiate market-standard terms with opposing counsel",
      ],
      child: [
        "Read carefully enough to notice when a rule seems unfair",
        "Work together to find a solution both sides can agree to",
        "Stay curious about why each rule in the contract is there",
      ],
    },
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
    keyConcepts: {
      professional: [
        "Stop-Loss: a preset price at which a losing position is automatically sold to limit further losses.",
        "Volatility: how much and how fast a price swings up and down - higher volatility means bigger, faster moves.",
        "Order Book: the live list of buy and sell orders waiting to be matched at various prices.",
      ],
      child: [
        "Algorithm: a recipe for making decisions automatically - step-by-step instructions a computer follows, no matter how busy things get.",
        "Stop-Loss: a safety rule that says 'sell automatically if I start losing too much money.'",
        "Volatility: how wildly a price jumps around - calm water vs. a stormy sea.",
      ],
    },
    prepMission: {
      professional: [
        "Read live price action and the order book",
        "Actively manage stop-loss and volatility parameters",
        "Make a decisive risk call under pressure",
      ],
      child: [
        "Make logical, level-headed choices even when things are moving fast",
        "Think like part of a trading team, not just for yourself",
        "Stay curious about why the price is moving the way it is",
      ],
    },
  },
];

export default function DemoPageClient() {
  const router = useRouter();
  const [selected, setSelected] = useState<CareerInfo | null>(null);
  const [mode, setMode] = useState<SimulationMode | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closeAll = () => {
    if (starting) return;
    setSelected(null);
    setMode(null);
    setError(null);
  };

  const startSimulation = async () => {
    if (!selected || !mode || starting) return;
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/simulations/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonymousSessionId: getAnonymousSessionId(),
          careerType: selected.careerType,
          mode,
          ageTier: ageTierForMode(mode),
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
    <div className="min-h-full w-full bg-obsidian font-display">
      <div className="flex items-center gap-2 border-b border-hairline bg-surface px-4 py-2.5 text-center font-mono text-xs font-medium uppercase tracking-wide text-signal sm:justify-center">
        <Megaphone className="h-3.5 w-3.5 shrink-0" />
        <span>COUNSELOR_PREVIEW_ENVIRONMENT — Test our 5 flagship career simulations.</span>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="text-center">
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-signal">
            AI_CAREER_SIMULATOR
          </p>
          <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">Choose a career to step into</h1>
          <p className="mt-2 font-mono text-xs font-medium text-slate-500">
            Instant access to 5 flagship scenarios — test drive right now.
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
            Each simulation is a live, AI-driven scenario. Your decisions are scored against how a strong
            performer would actually handle the job.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAREERS.map((career) => {
            const Icon = career.icon;
            return (
              <motion.button
                key={career.careerType}
                onClick={() => setSelected(career)}
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="flex flex-col items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-left transition-colors hover:border-signal hover:bg-slate-900/80"
              >
                <span className="flex h-10 w-10 items-center justify-center border border-hairline text-signal">
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="text-sm font-semibold text-ink">{career.title}</h2>
                <p className="text-xs leading-relaxed text-slate-400">{career.tagline}</p>
                <span className="mt-auto flex items-center gap-1 pt-2 font-mono text-xs font-medium text-signal">
                  View briefing
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selected && !mode && (
          <motion.div
            key="briefing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/70 p-4"
            onClick={closeAll}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg border border-hairline bg-surface p-6 font-display sm:p-8"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-hairline text-signal">
                    <selected.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-signal">
                      What you&apos;re stepping into
                    </p>
                    <h2 className="text-lg font-bold text-ink">{selected.title}</h2>
                  </div>
                </div>
                <button
                  onClick={closeAll}
                  className="shrink-0 border border-hairline p-1.5 text-slate-400 hover:border-signal hover:text-signal"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-slate-400">{selected.tagline}</p>

              <div className="mt-5">
                <h3 className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wide text-slate-300">
                  <Target className="h-3.5 w-3.5" />
                  Key Mission &amp; Objectives
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {selected.mission.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="mt-1.5 h-1 w-1 shrink-0 bg-signal" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5">
                <h3 className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wide text-slate-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Core Skills Evaluated
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selected.skills.map((skill) => (
                    <span key={skill} className="border border-hairline px-2.5 py-1 font-mono text-xs font-medium text-slate-400">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex items-center gap-1.5 font-mono text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                Estimated duration: <span className="font-medium text-slate-300">{selected.duration}</span>
              </div>

              <div className="mt-6">
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Choose Your Mode
                </h3>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    onClick={() => setMode("child")}
                    className="flex min-h-11 flex-col items-start gap-1 border border-hairline p-3 text-left transition-colors hover:border-signal"
                  >
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                      <GraduationCap className="h-4 w-4 text-signal" />
                      Child / Aptitude Focus
                    </span>
                    <span className="text-xs text-slate-500">
                      Simplified jargon, focused on decision logic &amp; soft skills.
                    </span>
                  </button>
                  <button
                    onClick={() => setMode("professional")}
                    className="flex min-h-11 flex-col items-start gap-1 border border-hairline p-3 text-left transition-colors hover:border-signal"
                  >
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                      <Briefcase className="h-4 w-4 text-slate-300" />
                      Professional / Full Tech
                    </span>
                    <span className="text-xs text-slate-500">
                      Real-world technical depth &amp; industry metrics.
                    </span>
                  </button>
                </div>
              </div>

              {error && (
                <p className="mt-4 flex items-center gap-1.5 border border-rose-900 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}

        {selected && mode && (
          <motion.div
            key="prep"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/70 p-4"
            onClick={closeAll}
          >
            <PreSimPrepModal
              title={selected.title}
              tagline={selected.tagline}
              mission={selected.prepMission[mode]}
              keyConcepts={selected.keyConcepts[mode]}
              mode={mode}
              starting={starting}
              error={error}
              onBack={() => setMode(null)}
              onConfirm={startSimulation}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
