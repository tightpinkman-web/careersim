"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, BookOpen, Target, Loader2, AlertTriangle, GraduationCap, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SimulationMode } from "@/types/simulation";

interface PreSimPrepModalProps {
  title: string;
  tagline: string;
  mission: string[];
  keyConcepts: [string, string, string];
  mode: SimulationMode;
  starting: boolean;
  error: string | null;
  onBack: () => void;
  onConfirm: () => void;
}

export default function PreSimPrepModal({
  title,
  tagline,
  mission,
  keyConcepts,
  mode,
  starting,
  error,
  onBack,
  onConfirm,
}: PreSimPrepModalProps) {
  const isChild = mode === "child";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 8 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => e.stopPropagation()}
      className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
    >
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          disabled={starting}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold",
            isChild ? "bg-emerald-50 text-emerald-700" : "bg-slate-800 text-white"
          )}
        >
          {isChild ? <GraduationCap className="h-3.5 w-3.5" /> : <Briefcase className="h-3.5 w-3.5" />}
          {isChild ? "Child / Aptitude Focus" : "Professional / Full Tech"}
        </span>
      </div>

      <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-indigo-600">Pre-Sim Prep Sheet</p>
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>

      <div className="mt-5">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
          <BookOpen className="h-3.5 w-3.5" />3 Key Concepts to Know
        </h3>
        <ul className="mt-2 space-y-2">
          {keyConcepts.map((concept, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-semibold text-indigo-600">
                {i + 1}
              </span>
              {concept}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
          <Target className="h-3.5 w-3.5" />
          Your Mission &amp; Core Objective
        </h3>
        <p className="mt-2 text-sm text-slate-600">{tagline}</p>
        <ul className="mt-2 space-y-1.5">
          {mission.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-indigo-400" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <p className="mt-4 flex items-center gap-1.5 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      <button
        onClick={onConfirm}
        disabled={starting}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        {starting ? "Starting..." : "I'm Ready: Enter Simulation"}
      </button>
    </motion.div>
  );
}
