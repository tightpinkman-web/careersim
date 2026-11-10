"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Mail, MessageSquare, Paperclip, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import CountdownTimer from "@/components/workspace/CountdownTimer";

export interface WorkspaceEmail {
  id: string;
  from: string;
  subject: string;
  preview: string;
  receivedAt: string;
  attachments?: string[];
}

export interface WorkspaceChatMessage {
  id: string;
  channel: string;
  author: string;
  text: string;
  timestamp: string;
  isInterruption?: boolean;
}

export interface CrisisAnchor {
  label: string;
  durationSeconds: number;
}

interface WorkspaceShellProps {
  /** Identifies the current simulation step (e.g. `${currentStep}`) so the chat/email effects
   *  below reset exactly once per step - not on every parent re-render, which happens every second
   *  purely from SimulationShell's own decision-clock tick and would otherwise wipe the thread and
   *  restart the interruption timer continuously. */
  stepKey: string | number;
  isDark?: boolean;
  /** Mock inbox rendered by the simulated corporate email client tool pane - career tracks that
   *  already generate real email threads (e.g. VENTURE_CAPITAL's payload.emails) pass those
   *  through so the OS shell doesn't invent a second, contradictory inbox. */
  emails?: WorkspaceEmail[];
  /** Seeds the simulated Slack/Teams pane's thread on mount/step-change, before any interruption
   *  pings are injected. */
  seedMessages?: WorkspaceChatMessage[];
  /** Plain-language one-liners the shell can fire as out-of-nowhere team pings while the student
   *  is mid-task - the "asynchronous interruption" cognitive-load mechanic. Purely presentational:
   *  these never call onAction or otherwise touch simulation/grading state. */
  interruptionPool?: string[];
  /** When set, renders a live countdown anchor (see CountdownTimer) above the canvas for
   *  crisis-flagged nodes (a security breach, a liquidity crunch, ...). */
  crisis?: CrisisAnchor | null;
  onCrisisExpire?: () => void;
  /** A short name for the active tool, shown as the window chrome's centered tab title (e.g. "Data
   *  Room", "Terminal"). Falls back to "Workspace" when omitted. */
  tabTitle?: string;
  /** The role-specific interactive tool (terminal, spreadsheet, backlog board, code editor, ...)
   *  rendered in the Primary Workspace Canvas pane. */
  children: React.ReactNode;
}

const DEFAULT_INTERRUPTIONS = [
  "Hey - can you jump on a call in 5? Need your read on this before it escalates.",
  "Quick ping: leadership is asking for a status update, can you pivot to that first?",
  "Heads up, a related issue just landed in the next channel over - keep it in mind.",
  "Reminder: the deadline for this just moved up. No pressure :)",
];

let beepContext: AudioContext | null = null;

/** Synthesizes a short two-tone notification beep via WebAudio rather than shipping an audio
 *  asset - best-effort only: browsers that block audio before a user gesture, or don't support
 *  AudioContext at all, just silently get no sound instead of a thrown error. */
function playNotificationBeep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!beepContext) beepContext = new Ctx();
    const ctx = beepContext;
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.setValueAtTime(660, now + 0.08);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.2);
  } catch {
    // Audio is a nice-to-have cognitive-load cue, never a requirement - swallow and move on.
  }
}

/** Manually formatted rather than `toLocaleTimeString` - the Comms Hub feed is now always
 *  rendered (not hidden behind an unselected tab the way the old chat/email tabs were), so this
 *  runs during SSR too, and Node's ICU formats AM/PM differently ("PM") than some browsers' Intl
 *  implementation ("pm") for the same locale, causing a hydration mismatch. A fixed-format string
 *  is identical on server and client by construction. */
function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    const hours24 = date.getHours();
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const period = hours24 < 12 ? "AM" : "PM";
    return `${hours12}:${minutes} ${period}`;
  } catch {
    return iso;
  }
}

type FeedItem =
  | { kind: "message"; id: string; timestamp: string; message: WorkspaceChatMessage }
  | { kind: "email"; id: string; timestamp: string; email: WorkspaceEmail };

/**
 * Desktop OS Shell: wraps a simulation step's role-specific canvas in a simulated desktop/browser
 * window - a macOS-style chrome bar (traffic-light dots, centered tab title) over a persistent
 * 3-panel grid (Comms Hub / canvas / Notes & Status), replacing the previous click-to-switch
 * Workspace/Team Chat/Inbox tabs. Nothing is hidden behind a tab anymore: the goal is still
 * cognitive load that matches a real job (chat pings and inbox mail compete for attention the way
 * they would at an actual desk), but without anything able to visually collide with its own
 * toggle - see design.md §10. Never alters what the student can actually submit (that stays owned
 * by SimulationShell's decision bar).
 */
export default function WorkspaceShell({
  stepKey,
  isDark,
  emails = [],
  seedMessages = [],
  interruptionPool = DEFAULT_INTERRUPTIONS,
  crisis,
  onCrisisExpire,
  tabTitle = "Workspace",
  children,
}: WorkspaceShellProps) {
  const [messages, setMessages] = useState<WorkspaceChatMessage[]>(seedMessages);
  const [muted, setMuted] = useState(false);
  const [notes, setNotes] = useState("");
  const [sessionActivity, setSessionActivity] = useState(0);
  const mutedRef = useRef(muted);
  // eslint-disable-next-line react-hooks/refs -- latest-value ref read from an async timer callback below
  mutedRef.current = muted;

  // Re-seed the thread once per step (keyed on stepKey, not on seedMessages/emails identity -
  // those are freshly-allocated arrays on every parent render, including the once-a-second render
  // SimulationShell's own decision clock causes).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- re-seeding the thread for a new step is the whole point of this effect
    setMessages(seedMessages);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed on stepKey only, see comment above
  }, [stepKey]);

  // Fires one out-of-nowhere team ping at a random point during the step - the "asynchronous
  // interruption" mechanic. Re-arms once per step (via stepKey) and always cleans up its timer so
  // it never outlives the component or leaks across steps.
  useEffect(() => {
    if (interruptionPool.length === 0) return;
    const delayMs = 20_000 + Math.random() * 20_000;
    const timeout = setTimeout(() => {
      const text = interruptionPool[Math.floor(Math.random() * interruptionPool.length)];
      const ping: WorkspaceChatMessage = {
        id: `interrupt-${Date.now()}`,
        channel: "team-chat",
        author: "Teammate",
        text,
        timestamp: new Date().toISOString(),
        isInterruption: true,
      };
      setMessages((prev) => [...prev, ping]);
      setSessionActivity((count) => count + 1);
      if (!mutedRef.current) playNotificationBeep();
    }, delayMs);
    return () => clearTimeout(timeout);
  }, [stepKey, interruptionPool]);

  const feed: FeedItem[] = [
    ...messages.map((message): FeedItem => ({ kind: "message", id: message.id, timestamp: message.timestamp, message })),
    ...emails.map((email): FeedItem => ({ kind: "email", id: email.id, timestamp: email.receivedAt, email })),
  ].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border", isDark ? "border-hairline bg-base-black" : "border-slate-200 bg-slate-100")}>
      {/* macOS-style window chrome */}
      <div
        className={cn(
          "relative flex shrink-0 items-center gap-2 border-b px-4 py-2",
          isDark ? "border-hairline bg-midnight-blue" : "border-slate-200 bg-white"
        )}
      >
        <div className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>
        <span
          className={cn(
            "pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-medium",
            isDark ? "text-slate-300" : "text-slate-600"
          )}
        >
          {tabTitle}
        </span>
        <div className={cn("ml-auto flex items-center gap-3 text-xs", isDark ? "text-slate-400" : "text-slate-500")}>
          <button
            onClick={() => setMuted((m) => !m)}
            title={muted ? "Unmute notification sounds" : "Mute notification sounds"}
            className="flex items-center gap-1 rounded-full px-1.5 py-1 hover:text-hot-pink"
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
          <span className="relative flex items-center gap-1">
            <Bell className="h-3.5 w-3.5" />
            {sessionActivity > 0 && <span className="absolute -right-1.5 -top-1.5 h-2 w-2 rounded-full bg-rose-500" />}
          </span>
        </div>
      </div>

      {/* Persistent 3-panel grid: Comms Hub / canvas / Notes & Status */}
      {/* grid-rows-1 pins the single row to the grid's own (definite, flex-1-derived) height -
          without it, the row's "auto" track sizes to its tallest child's natural content height
          instead of the available space, so the center canvas (and anything it absolutely
          positions against its own box, like VCSimulationView's drawer toggles) grows past the
          viewport instead of scrolling internally. */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 lg:grid-cols-[260px_minmax(0,1fr)_260px] lg:grid-rows-1 lg:overflow-hidden">
        {/* Left: Comms Hub */}
        <div
          className={cn(
            "order-2 flex min-h-0 flex-col overflow-hidden rounded-2xl border lg:order-1",
            isDark ? "border-hairline bg-midnight-blue" : "border-slate-200 bg-white"
          )}
        >
          <div className={cn("flex shrink-0 items-center gap-1.5 border-b px-3 py-2 text-xs font-semibold", isDark ? "border-hairline text-slate-300" : "border-slate-200 text-slate-600")}>
            <MessageSquare className="h-3.5 w-3.5" />
            Comms Hub
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
            {feed.length === 0 && (
              <p className={cn("text-xs italic", isDark ? "text-slate-500" : "text-slate-400")}>Nothing new yet.</p>
            )}
            {feed.map((item) =>
              item.kind === "message" ? (
                <div
                  key={`msg-${item.id}`}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs",
                    item.message.isInterruption
                      ? "border-hot-pink/40 bg-hot-pink/10"
                      : isDark
                        ? "border-hairline bg-obsidian text-slate-300"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                  )}
                >
                  <div className="mb-1 flex items-center justify-between gap-2 font-semibold">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3 opacity-60" />
                      {item.message.author} <span className="font-normal opacity-60">#{item.message.channel}</span>
                    </span>
                    <span className="font-mono text-[10px] font-normal opacity-60">{formatTimestamp(item.message.timestamp)}</span>
                  </div>
                  <p>{item.message.text}</p>
                </div>
              ) : (
                <div
                  key={`mail-${item.id}`}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs",
                    isDark ? "border-hairline bg-obsidian text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"
                  )}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 font-semibold">
                      <Mail className="h-3 w-3 opacity-60" />
                      {item.email.from}
                    </span>
                    {/* email.receivedAt is already a display-ready string (e.g. "9:14 AM"), not an
                        ISO timestamp - re-parsing it through formatTimestamp produced NaN:NaN for
                        any value Date() couldn't parse, so it's rendered verbatim instead, exactly
                        like VCSimulationView's own inbox pane already does. */}
                    <span className="font-mono text-[10px] opacity-60">{item.email.receivedAt}</span>
                  </div>
                  <p className="font-medium">{item.email.subject}</p>
                  <p className="mt-0.5 opacity-80">{item.email.preview}</p>
                  {item.email.attachments && item.email.attachments.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {item.email.attachments.map((attachment) => (
                        <span
                          key={attachment}
                          className={cn(
                            "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px]",
                            isDark ? "border-hairline text-slate-400" : "border-slate-200 text-slate-500"
                          )}
                        >
                          <Paperclip className="h-2.5 w-2.5" />
                          {attachment}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>

        {/* Center: primary workspace canvas */}
        <div
          className={cn(
            "order-1 min-h-0 overflow-auto rounded-2xl border lg:order-2",
            isDark ? "border-hairline bg-midnight-blue" : "border-slate-200 bg-white"
          )}
        >
          {children}
        </div>

        {/* Right: Notes & Status */}
        <div
          className={cn(
            "order-3 flex min-h-0 flex-col gap-3 overflow-y-auto rounded-2xl border p-3",
            isDark ? "border-hairline bg-midnight-blue" : "border-slate-200 bg-white"
          )}
        >
          {crisis && (
            <CountdownTimer anchorKey={crisis.label} label={crisis.label} durationSeconds={crisis.durationSeconds} onExpire={onCrisisExpire} isDark={isDark} className="rounded-xl" />
          )}
          <div className={cn("rounded-xl border px-3 py-2 text-xs", isDark ? "border-hairline text-slate-400" : "border-slate-200 text-slate-500")}>
            <p className="font-semibold">Session activity</p>
            <p className="mt-0.5">{feed.length} item{feed.length === 1 ? "" : "s"} in Comms Hub</p>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <p className={cn("mb-1.5 text-xs font-semibold", isDark ? "text-slate-300" : "text-slate-600")}>Notes</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Working notes for this step..."
              className={cn(
                "min-h-[100px] flex-1 resize-none rounded-xl border p-2.5 text-xs outline-none focus:border-hot-pink",
                isDark ? "border-hairline bg-obsidian text-slate-200 placeholder:text-slate-600" : "border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400"
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
