"use client";

import { useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import { STARTUP_IDS, STARTUP_NAMES, INITIAL_VC_STATE, type StartupId } from "@/lib/simulation/vc-engine";
import { recordModelTweak } from "@/lib/telemetry/vc-tracker";

const PROJECTION_MONTHS = 24;

/**
 * Unit Economics & Sensitivity Model for the VC Associate simulation: CAC/LTV/Churn/Payback-target
 * sliders seeded directly from a selected startup's lib/simulation/vc-engine.ts financials (plain
 * numeric fields, not narrative strings), so there is no string-parsing layer to misread the way
 * VCWorkbench's older financialMetrics-driven sliders could. A separate Market Stress slider scales
 * churn to drive a two-line "Base vs. Stressed" cumulative-retained-value chart, so a diligence
 * assumption can be pressure-tested against a downturn scenario rather than just its happy path.
 */
export default function UnitEconomicsModel({ sessionId }: { sessionId?: string }) {
  const [selectedId, setSelectedId] = useState<StartupId>(STARTUP_IDS[0]);
  const financials = INITIAL_VC_STATE.startups[selectedId];

  const [cac, setCac] = useState(financials.cac);
  const [ltv, setLtv] = useState(financials.ltv);
  const [annualChurnPct, setAnnualChurnPct] = useState(financials.churnRate);
  const [paybackTargetMonths, setPaybackTargetMonths] = useState(12);
  const [stressPct, setStressPct] = useState(0);

  function selectStartup(id: StartupId) {
    setSelectedId(id);
    const next = INITIAL_VC_STATE.startups[id];
    setCac(next.cac);
    setLtv(next.ltv);
    setAnnualChurnPct(next.churnRate);
  }

  const ltvToCac = cac > 0 ? ltv / cac : 0;
  const monthlyChurn = annualChurnPct / 100 / 12;
  const monthlyArpu = ltv * monthlyChurn;
  const actualPaybackMonths = monthlyArpu > 0 ? cac / monthlyArpu : Infinity;
  const meetsPaybackTarget = Number.isFinite(actualPaybackMonths) && actualPaybackMonths <= paybackTargetMonths;

  const stressedMonthlyChurn = monthlyChurn * (1 + stressPct / 100);

  const retentionCurve = useMemo(() => {
    const baseRetention = Math.max(0, 1 - monthlyChurn);
    const stressedRetention = Math.max(0, 1 - stressedMonthlyChurn);
    return Array.from({ length: PROJECTION_MONTHS }, (_, month) => ({
      month: `M${month + 1}`,
      base: Math.round(ltv * baseRetention ** month),
      stressed: Math.round(ltv * stressedRetention ** month),
    }));
  }, [ltv, monthlyChurn, stressedMonthlyChurn]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
        <Gauge className="h-4 w-4 text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-700">Unit Economics & Sensitivity</h2>
      </div>

      <div className="flex shrink-0 gap-1 border-b border-slate-100 px-3 pt-2">
        {STARTUP_IDS.map((id) => (
          <button
            key={id}
            onClick={() => selectStartup(id)}
            className={cn(
              "rounded-t-md px-3 py-1.5 text-xs font-medium transition-colors",
              selectedId === id ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            {STARTUP_NAMES[id]}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mb-3 flex items-center justify-between">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold",
              ltvToCac >= 3 ? "bg-emerald-100 text-emerald-700" : ltvToCac >= 1 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
            )}
          >
            LTV:CAC {ltvToCac.toFixed(1)}x
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold",
              meetsPaybackTarget ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
            )}
          >
            Payback {Number.isFinite(actualPaybackMonths) ? actualPaybackMonths.toFixed(1) : "∞"} mo
            {meetsPaybackTarget ? " ✓ within target" : " ✗ over target"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Slider
            label="CAC"
            value={cac}
            display={`₹${cac.toLocaleString("en-IN")}`}
            min={10_000}
            max={500_000}
            step={5_000}
            onChange={setCac}
            onCommit={() => sessionId && recordModelTweak(sessionId)}
            accent="accent-indigo-500"
          />
          <Slider
            label="LTV"
            value={ltv}
            display={`₹${ltv.toLocaleString("en-IN")}`}
            min={50_000}
            max={2_000_000}
            step={10_000}
            onChange={setLtv}
            onCommit={() => sessionId && recordModelTweak(sessionId)}
            accent="accent-emerald-500"
          />
          <Slider
            label="Annual Churn"
            value={annualChurnPct}
            display={`${annualChurnPct}%`}
            min={1}
            max={60}
            step={1}
            onChange={setAnnualChurnPct}
            onCommit={() => sessionId && recordModelTweak(sessionId)}
            accent="accent-rose-500"
          />
          <Slider
            label="Payback Target"
            value={paybackTargetMonths}
            display={`${paybackTargetMonths} mo`}
            min={1}
            max={36}
            step={1}
            onChange={setPaybackTargetMonths}
            onCommit={() => sessionId && recordModelTweak(sessionId)}
            accent="accent-slate-500"
          />
        </div>

        <div className="mt-4">
          <Slider
            label="Market Stress (downturn severity)"
            value={stressPct}
            display={`${stressPct}%`}
            min={0}
            max={100}
            step={5}
            onChange={setStressPct}
            onCommit={() => sessionId && recordModelTweak(sessionId)}
            accent="accent-amber-500"
          />
        </div>

        <div className="mt-4 h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={retentionCurve} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="base" name="Base case" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="stressed" name="Stressed case" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
  onCommit,
  accent,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  /** Fired on pointer/key release rather than on every drag tick, so slider-driven telemetry
   *  (lib/telemetry/vc-tracker.ts's recordModelTweak) counts deliberate commits instead of dozens
   *  of continuous onChange events per drag. */
  onCommit?: () => void;
  accent: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span className="font-mono text-slate-800">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        className={cn("w-full", accent)}
      />
    </div>
  );
}
