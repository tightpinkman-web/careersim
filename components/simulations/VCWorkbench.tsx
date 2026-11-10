"use client";

import { useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Calculator, Flame, NotebookPen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VCPayload } from "@/types/simulation";

interface VCWorkbenchProps {
  payload: VCPayload;
}

const COHORT_MONTHS = 12;

/** Parses a dollar figure out of a financial-metric value string like "$42K" or "$1.2M" - best
 *  effort only, since these values are free-form narrative text from the Game Master, not
 *  structured numbers. The match is anchored to the WHOLE (trimmed) string rather than a prefix,
 *  so a non-dollar value that merely starts with digits - "11 mo" (a runway duration, not a dollar
 *  figure) or "1.4x" (a multiple) - is rejected outright instead of having its trailing unit letter
 *  misread as a k/m suffix (e.g. "11 mo" silently becoming $11,000,000 via the "m" in "mo"). Falls
 *  back to `fallback` whenever the string isn't a plain number/$-figure end to end. */
function parseDollarFigure(value: string, fallback: number): number {
  const match = value
    .replace(/,/g, "")
    .trim()
    .match(/^\$?\s*([\d.]+)\s*(k|m)?$/i);
  if (!match) return fallback;
  const amount = parseFloat(match[1]);
  if (Number.isNaN(amount)) return fallback;
  const unit = match[2]?.toLowerCase();
  if (unit === "k") return amount * 1_000;
  if (unit === "m") return amount * 1_000_000;
  return amount;
}

/**
 * Analyst sandbox layered on top of VCSimulationView's deck/inbox/memo: a CAC-vs-LTV cohort model
 * and a burn-rate runway calculator, both driven by adjustable sliders seeded (best-effort) from
 * the startup's own financialMetrics. This never writes back into the official investment memo -
 * it has its own "scratchpad" textarea for working notes, kept deliberately separate so a student's
 * exploratory math never silently overwrites the memo they're actually submitting.
 */
export default function VCWorkbench({ payload }: VCWorkbenchProps) {
  const seededBurn = useMemo(() => {
    // Excludes "Burn Multiple" (a ratio like "1.4x", not a dollar figure) - only an actual
    // burn-rate/monthly-burn metric should seed this slider.
    const burnMetric = payload.financialMetrics.find((m) => /burn/i.test(m.label) && !/multiple/i.test(m.label));
    return burnMetric ? parseDollarFigure(burnMetric.value, 50_000) : 50_000;
  }, [payload.financialMetrics]);
  const seededCash = useMemo(() => {
    // Excludes "Runway" (a duration like "11 mo", not a dollar figure) - only an actual
    // cash-on-hand/bank-balance metric should seed this slider.
    const cashMetric = payload.financialMetrics.find((m) => /cash|bank/i.test(m.label));
    return cashMetric ? parseDollarFigure(cashMetric.value, 600_000) : 600_000;
  }, [payload.financialMetrics]);

  const [cac, setCac] = useState(500);
  const [ltv, setLtv] = useState(1500);
  const [monthlyChurnPct, setMonthlyChurnPct] = useState(5);
  const [burnRate, setBurnRate] = useState(seededBurn);
  const [cashOnHand, setCashOnHand] = useState(seededCash);
  const [notes, setNotes] = useState("");

  const ltvToCac = cac > 0 ? ltv / cac : 0;
  const paybackMonths = ltv > 0 ? Math.ceil((cac / ltv) * COHORT_MONTHS) : 0;

  const cohortData = useMemo(() => {
    const retention = 1 - monthlyChurnPct / 100;
    return Array.from({ length: COHORT_MONTHS }, (_, month) => month).reduce<{ month: string; cumulativeValue: number }[]>(
      (acc, month) => {
        const monthlyValue = (ltv / COHORT_MONTHS) * retention ** month;
        const previous = acc[month - 1]?.cumulativeValue ?? 0;
        acc.push({ month: `M${month + 1}`, cumulativeValue: Math.round(previous + monthlyValue) });
        return acc;
      },
      []
    );
  }, [ltv, monthlyChurnPct]);

  const runwayMonths = burnRate > 0 ? Math.floor(cashOnHand / burnRate) : Infinity;
  const burnPath = useMemo(() => {
    const months = Math.min(24, Number.isFinite(runwayMonths) ? runwayMonths + 2 : 24);
    return Array.from({ length: Math.max(1, months) }, (_, i) => ({
      month: `M${i}`,
      cash: Math.max(0, Math.round(cashOnHand - burnRate * i)),
    }));
  }, [cashOnHand, burnRate, runwayMonths]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-8 overflow-y-auto bg-slate-50 p-8">
      {/* Unit economics */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <div className="mb-3 flex items-center gap-2">
          <Calculator className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Unit Economics: CAC vs. LTV</h2>
          <span
            className={cn(
              "ml-auto rounded-full px-2 py-0.5 text-xs font-semibold",
              ltvToCac >= 3 ? "bg-emerald-100 text-emerald-700" : ltvToCac >= 1 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
            )}
          >
            LTV:CAC {ltvToCac.toFixed(1)}x
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
              <span>CAC</span>
              <span className="font-mono text-slate-800">${cac}</span>
            </div>
            <input type="range" min={50} max={3000} step={50} value={cac} onChange={(e) => setCac(parseFloat(e.target.value))} className="w-full accent-signal" />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
              <span>LTV</span>
              <span className="font-mono text-slate-800">${ltv}</span>
            </div>
            <input type="range" min={100} max={8000} step={100} value={ltv} onChange={(e) => setLtv(parseFloat(e.target.value))} className="w-full accent-emerald-500" />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
              <span>Monthly Churn</span>
              <span className="font-mono text-slate-800">{monthlyChurnPct}%</span>
            </div>
            <input
              type="range"
              min={1}
              max={25}
              step={1}
              value={monthlyChurnPct}
              onChange={(e) => setMonthlyChurnPct(parseFloat(e.target.value))}
              className="w-full accent-rose-500"
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">Payback period: ~{paybackMonths} month{paybackMonths === 1 ? "" : "s"}</p>
        <div className="mt-3 h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cohortData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Bar dataKey="cumulativeValue" fill="#ec4899" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Burn rate sensitivity */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <div className="mb-3 flex items-center gap-2">
          <Flame className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Burn Rate Sensitivity</h2>
          <span className="ml-auto text-xs font-medium text-slate-600">
            Runway: {Number.isFinite(runwayMonths) ? `${runwayMonths} mo` : "indefinite"}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
              <span>Monthly Burn</span>
              <span className="font-mono text-slate-800">${burnRate.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min={5_000}
              max={300_000}
              step={5_000}
              value={burnRate}
              onChange={(e) => setBurnRate(parseFloat(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
              <span>Cash on Hand</span>
              <span className="font-mono text-slate-800">${cashOnHand.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min={50_000}
              max={5_000_000}
              step={50_000}
              value={cashOnHand}
              onChange={(e) => setCashOnHand(parseFloat(e.target.value))}
              className="w-full accent-slate-500"
            />
          </div>
        </div>
        <div className="mt-3 h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={burnPath} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v) => `$${Number(v).toLocaleString()}`} />
              <Line type="monotone" dataKey="cash" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Analyst scratchpad - deliberately separate from the official investment memo */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <div className="mb-2 flex items-center gap-2">
          <NotebookPen className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Analyst Scratchpad</h2>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Working notes on unit economics, runway, diligence questions..."
          className="min-h-[80px] w-full resize-none rounded-md border border-slate-200 p-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-signal"
        />
      </div>
    </div>
  );
}
