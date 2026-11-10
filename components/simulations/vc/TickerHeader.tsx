"use client";

import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface TickerItem {
  text: string;
  trend: "up" | "down" | "flat";
}

const DEFAULT_TICKER_ITEMS: TickerItem[] = [
  { text: "SaaS Multiples Drop to 8.5x ARR as Public Comps Reprice", trend: "down" },
  { text: "Rival Fund Closes ₹340 Cr Series B in Vertical AI", trend: "up" },
  { text: "Median Seed Valuation Cap Falls 12% QoQ Across Indian SaaS", trend: "down" },
  { text: "LP Appetite for Growth-Stage Rounds Cools Amid Rate Hold", trend: "down" },
  { text: "Enterprise Infra Deals See Longest Diligence Cycles in 3 Years", trend: "flat" },
  { text: "Secondary Market Pricing Gap Widens to 22% Below Last Primary", trend: "down" },
  { text: "Climate-Tech Logistics Rounds Up 18% YoY on Unit Economics Proof", trend: "up" },
];

/**
 * Global Market Ticker Header - a continuously scrolling marquee of SaaS market indicators and
 * rival-fund deal news, rendered above the VC Associate simulation canvas. Purely ambient
 * market-pressure texture: it never reads from or writes to simulation/grading state, matching
 * CountdownTimer's "cognitive load anchor, not a state mutator" posture in components/workspace.
 */
export default function TickerHeader({ items = DEFAULT_TICKER_ITEMS, isDark }: { items?: TickerItem[]; isDark?: boolean }) {
  const loopItems = [...items, ...items];

  return (
    <div
      className={cn(
        "flex shrink-0 items-center overflow-hidden border-b font-mono text-[11px]",
        isDark ? "border-hairline bg-obsidian text-slate-400" : "border-hairline bg-obsidian text-slate-300"
      )}
    >
      <span className="shrink-0 border-r border-white/10 bg-signal/90 px-2.5 py-1.5 font-semibold uppercase tracking-wider text-slate-950">
        Market
      </span>
      <div className="relative flex-1 overflow-hidden py-1.5">
        <motion.div
          className="flex w-max items-center gap-8 whitespace-nowrap pl-4"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 45, ease: "linear", repeat: Infinity }}
        >
          {loopItems.map((item, i) => (
            <span key={i} className="flex shrink-0 items-center gap-1.5">
              {item.trend === "up" && <TrendingUp className="h-3 w-3 shrink-0 text-emerald-400" />}
              {item.trend === "down" && <TrendingDown className="h-3 w-3 shrink-0 text-rose-400" />}
              {item.text}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
