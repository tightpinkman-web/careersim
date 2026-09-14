"use client";

import { useState } from "react";
import { Briefcase, ShieldHalf, Kanban, Scale, LineChart } from "lucide-react";
import { cn } from "@/lib/utils";
import SimulationShell from "@/components/simulations/SimulationShell";
import type { SimulationState, UiMode } from "@/types/simulation";

const MODES: { id: UiMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "VENTURE_CAPITAL", label: "Venture Capital", icon: Briefcase },
  { id: "CYBERSECURITY", label: "Cybersecurity", icon: ShieldHalf },
  { id: "PRODUCT_MANAGEMENT", label: "Product Mgmt", icon: Kanban },
  { id: "CORPORATE_LAW", label: "Corporate Law", icon: Scale },
  { id: "QUANT_TRADING", label: "Quant Trading", icon: LineChart },
];

const DUMMY_STATES: Record<UiMode, SimulationState> = {
  VENTURE_CAPITAL: {
    currentStep: 3,
    careerType: "VENTURE_CAPITAL",
    ui_mode: "VENTURE_CAPITAL",
    narrativePrompt:
      "A founder just replied to your diligence questions. Review the data room and decide whether to advance to partner meeting.",
    allowedActions: [
      { id: "advance", label: "Advance to Partner Meeting", kind: "primary" },
      { id: "pass", label: "Pass on Deal", kind: "secondary" },
      { id: "more_dd", label: "Request More Diligence", kind: "secondary" },
    ],
    hudMetrics: { fundsLeft: "$4.2M", timeRemaining: "02:14:00" },
    payload: {
      startupName: "Nimbus Robotics",
      memoDraft: "Nimbus shows strong founder-market fit and early enterprise traction...",
      emails: [
        {
          id: "e1",
          from: "Ava Chen <ava@nimbusrobotics.ai>",
          subject: "Re: Diligence questions - churn & margins",
          preview: "Thanks for the thorough questions...",
          body: "Thanks for the thorough questions. Our gross margin sits at 71% blended across hardware and software. Logo churn last quarter was 2.1%, driven mostly by a single enterprise pilot that didn't renew due to budget freeze, not product fit.",
          receivedAt: "9:14 AM",
          read: false,
          attachments: ["cohort_retention.xlsx"],
        },
        {
          id: "e2",
          from: "Marcus Webb <partner@sequoia-fake.vc>",
          subject: "Co-invest interest",
          preview: "We'd like to explore a co-investment...",
          body: "We'd like to explore a co-investment in Nimbus's Series A. Can you share your term sheet once ready?",
          receivedAt: "8:02 AM",
          read: true,
        },
      ],
      deckSlides: [
        {
          id: "s1",
          title: "Problem",
          bullets: ["Warehouse picking errors cost retailers $60B/yr", "Existing robots require costly rail infrastructure"],
        },
        {
          id: "s2",
          title: "Traction",
          bullets: ["14 paid pilots, $1.8M ARR", "142% net revenue retention", "3 Fortune 500 LOIs"],
        },
        {
          id: "s3",
          title: "Ask",
          bullets: ["Raising $8M Series A", "18mo runway to Series B metrics"],
        },
      ],
      financialMetrics: [
        { label: "ARR", value: "$1.8M", trend: "up" },
        { label: "Burn Multiple", value: "1.4x", trend: "flat" },
        { label: "Gross Margin", value: "71%", trend: "up" },
        { label: "Runway", value: "11 mo", trend: "down" },
      ],
    },
  },

  CYBERSECURITY: {
    currentStep: 5,
    careerType: "CYBERSECURITY",
    ui_mode: "CYBERSECURITY",
    narrativePrompt: "Suspicious outbound traffic detected on host web-prod-03. Investigate and contain if necessary.",
    allowedActions: [
      { id: "isolate_host", label: "Isolate Host", kind: "danger" },
      { id: "escalate", label: "Escalate to IR Lead", kind: "primary" },
      { id: "mark_benign", label: "Mark Benign", kind: "secondary" },
    ],
    hudMetrics: { serverHealth: "62%", timeRemaining: "00:41:00" },
    payload: {
      systemHealth: 62,
      activeIncidents: 2,
      currentDirectory: "~/soc/incident-4471",
      terminalLines: [
        { id: "l1", type: "input", text: "netstat -antp | grep ESTABLISHED", timestamp: "10:02:01" },
        { id: "l2", type: "output", text: "tcp  0  0 10.0.4.12:443  185.220.101.4:51322  ESTABLISHED  3391/nginx", timestamp: "10:02:01" },
        { id: "l3", type: "input", text: "whois 185.220.101.4", timestamp: "10:02:14" },
        { id: "l4", type: "error", text: "connection timed out while querying whois server", timestamp: "10:02:19" },
      ],
      alerts: [
        { id: "a1", severity: "critical", source: "EDR", message: "Unrecognized process spawned from nginx worker", timestamp: "10:01:58" },
        { id: "a2", severity: "high", source: "IDS", message: "Outbound beacon-like traffic to known Tor exit node", timestamp: "10:02:03" },
        { id: "a3", severity: "medium", source: "WAF", message: "Repeated 403s from single IP on /admin", timestamp: "09:58:40" },
        { id: "a4", severity: "low", source: "Auth", message: "New device login for svc-deploy", timestamp: "09:40:12", resolved: true },
      ],
    },
  },

  PRODUCT_MANAGEMENT: {
    currentStep: 2,
    careerType: "PRODUCT_MANAGEMENT",
    ui_mode: "PRODUCT_MANAGEMENT",
    narrativePrompt: "Checkout conversion dropped 4pts after last release. Prioritize the sprint to address it.",
    allowedActions: [
      { id: "ship_sprint", label: "Commit Sprint Plan", kind: "primary" },
      { id: "request_data", label: "Request More Data", kind: "secondary" },
    ],
    hudMetrics: { conversionRate: "58.2%", timeRemaining: "1d 04h" },
    payload: {
      conversionRate: 58.2,
      board: {
        columns: {
          TODO: [
            { id: "t1", title: "Add saved payment methods", description: "Reduce re-entry friction", priority: "high", points: 5 },
            { id: "t2", title: "Guest checkout A/B test", priority: "medium", points: 3 },
          ],
          IN_PROGRESS: [
            { id: "t3", title: "Fix coupon field validation bug", description: "Blocking 6% of sessions", priority: "high", points: 2 },
          ],
          SELECTED: [
            { id: "t4", title: "One-click Apple Pay", description: "Requested by 3 enterprise accounts", priority: "medium", points: 8 },
          ],
        },
      },
      funnelData: [
        { stage: "Cart", users: 12500 },
        { stage: "Shipping", users: 9800 },
        { stage: "Payment", users: 7600 },
        { stage: "Confirm", users: 7280 },
      ],
      prioritizationMatrix: [
        { id: "p1", name: "Saved payment methods", impact: 8, effort: 5 },
        { id: "p2", name: "Guest checkout test", impact: 5, effort: 2 },
        { id: "p3", name: "Coupon fix", impact: 6, effort: 1 },
        { id: "p4", name: "Apple Pay", impact: 7, effort: 8 },
      ],
    },
  },

  CORPORATE_LAW: {
    currentStep: 4,
    careerType: "CORPORATE_LAW",
    ui_mode: "CORPORATE_LAW",
    narrativePrompt: "Opposing counsel pushed back on the indemnification cap. Review the flagged clause and respond.",
    allowedActions: [
      { id: "accept_terms", label: "Accept Redline", kind: "primary" },
      { id: "counter", label: "Send Counter-Proposal", kind: "secondary" },
      { id: "reject", label: "Reject", kind: "danger" },
    ],
    hudMetrics: { timeRemaining: "3d 00h" },
    payload: {
      documentTitle: "Master Services Agreement - Draft v4",
      clauses: [
        {
          id: "c1",
          heading: "1. Definitions",
          text: "\"Confidential Information\" means any non-public information disclosed by either Party in connection with this Agreement.",
        },
        {
          id: "c2",
          heading: "8. Limitation of Liability",
          text: "In no event shall either party's aggregate liability exceed the fees paid in the preceding twelve (12) months.",
          flagged: true,
          redline: {
            original: "exceed the fees paid in the preceding twelve (12) months",
            proposed: "exceed two (2) times the fees paid in the preceding twelve (12) months",
            rationale: "Client requested a higher liability cap given the scope of data access granted under this MSA.",
          },
        },
        {
          id: "c3",
          heading: "9. Indemnification",
          text: "Each party shall indemnify the other against third-party claims arising from breach of Sections 4 (Confidentiality) and 6 (IP Ownership).",
          flagged: true,
          redline: {
            original: "indemnify the other against third-party claims",
            proposed: "indemnify and hold harmless the other against third-party claims, including reasonable attorneys' fees",
            rationale: "Standard market practice to include recoverable legal costs.",
          },
        },
      ],
      negotiationThread: [
        { id: "n1", sender: "opposing_counsel", text: "We can't accept an uncapped indemnity on IP claims.", timestamp: "2:04 PM" },
        { id: "n2", sender: "student", text: "Understood - proposing a 2x fees cap as a middle ground.", timestamp: "2:07 PM" },
      ],
    },
  },

  QUANT_TRADING: {
    currentStep: 7,
    careerType: "QUANT_TRADING",
    ui_mode: "QUANT_TRADING",
    narrativePrompt: "Volatility is spiking ahead of the earnings print. Adjust your parameters and decide whether to hold the position.",
    allowedActions: [
      { id: "hold", label: "Hold Position", kind: "primary" },
      { id: "reduce", label: "Reduce Exposure", kind: "secondary" },
      { id: "liquidate", label: "Liquidate", kind: "danger" },
    ],
    hudMetrics: { fundsLeft: "$2.1M", timeRemaining: "00:12:45" },
    payload: {
      ticker: "NVDA",
      pnl: 18420.5,
      candles: [
        { time: "09:30", open: 118.2, high: 119.1, low: 117.8, close: 118.9 },
        { time: "09:45", open: 118.9, high: 120.4, low: 118.6, close: 120.1 },
        { time: "10:00", open: 120.1, high: 120.6, low: 118.9, close: 119.3 },
        { time: "10:15", open: 119.3, high: 119.8, low: 117.5, close: 117.9 },
        { time: "10:30", open: 117.9, high: 118.7, low: 117.1, close: 118.5 },
        { time: "10:45", open: 118.5, high: 121.2, low: 118.4, close: 120.8 },
        { time: "11:00", open: 120.8, high: 122.0, low: 120.2, close: 121.7 },
      ],
      orderBook: {
        bids: [
          { price: 121.65, size: 420 },
          { price: 121.6, size: 310 },
          { price: 121.55, size: 890 },
          { price: 121.5, size: 150 },
        ],
        asks: [
          { price: 121.7, size: 260 },
          { price: 121.75, size: 540 },
          { price: 121.8, size: 700 },
          { price: 121.85, size: 190 },
        ],
      },
      news: [
        { id: "n1", headline: "NVDA implied vol jumps ahead of after-hours print", source: "Bloomberg", timestamp: "10:58", sentiment: "negative" },
        { id: "n2", headline: "Analysts raise price targets citing datacenter demand", source: "Reuters", timestamp: "10:41", sentiment: "positive" },
        { id: "n3", headline: "Options market pricing 7% post-earnings move", source: "MarketWatch", timestamp: "10:22", sentiment: "neutral" },
      ],
      parameters: { stopLoss: 3.5, volatilityThreshold: 0.62, positionSize: 5000 },
    },
  },
};

export default function SimulationPreviewPage() {
  const [activeMode, setActiveMode] = useState<UiMode>("VENTURE_CAPITAL");
  const state = DUMMY_STATES[activeMode];

  return (
    <div className="flex h-full flex-col bg-obsidian font-display">
      {/* Floating mode switcher */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-50 flex justify-center">
        <div className="pointer-events-auto flex items-center gap-1 border border-hairline bg-surface/95 p-1 font-mono backdrop-blur">
          {MODES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveMode(id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                activeMode === id ? "bg-signal text-obsidian" : "text-slate-400 hover:text-signal"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 pt-16">
        <SimulationShell
          state={state}
          onAction={(actionId, freeformInput) => {
            console.log("[preview] action:", actionId, "input:", freeformInput);
          }}
        />
      </div>
    </div>
  );
}
