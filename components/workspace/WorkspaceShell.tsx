"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, LayoutGrid, Mail, MessageSquare, Paperclip, Volume2, VolumeX } from "lucide-react";
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
  /** The role-specific interactive tool (terminal, spreadsheet, backlog board, code editor, ...)
   *  rendered in the Primary Workspace Canvas pane. */
  children: React.ReactNode;
}

type ToolTab = "canvas" | "chat" | "email";

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

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

const TABS: Array<{ id: ToolTab; label: string; icon: typeof LayoutGrid }> = [
  { id: "canvas", label: "Workspace", icon: LayoutGrid },
  { id: "chat", label: "Team Chat", icon: MessageSquare },
  { id: "email", label: "Inbox", icon: Mail },
];

/**
 * Desktop/workspace container ("OS Shell") wrapping a simulation step's role-specific canvas with
 * simulated native tools - a Slack/Teams-style team chat and a corporate email client - plus a top
 * status bar with a notification center and tool switcher. The goal is cognitive load that matches
 * a real job: the "right" tool is still the canvas, but chat pings and inbox mail compete for
 * attention the way they would at an actual desk, while never altering what the student can
 * actually submit (that stays owned by SimulationShell's decision bar).
 */
export default function WorkspaceShell({
  stepKey,
  isDark,
  emails = [],
  seedMessages = [],
  interruptionPool = DEFAULT_INTERRUPTIONS,
  crisis,
  onCrisisExpire,
  children,
}: WorkspaceShellProps) {
  const [activeTab, setActiveTab] = useState<ToolTab>("canvas");
  const [messages, setMessages] = useState<WorkspaceChatMessage[]>(seedMessages);
  const [unreadChat, setUnreadChat] = useState(0);
  const [unreadEmail, setUnreadEmail] = useState(0);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(muted);
  // eslint-disable-next-line react-hooks/refs -- latest-value ref read from an async timer callback below
  mutedRef.current = muted;
  const activeTabRef = useRef(activeTab);
  // eslint-disable-next-line react-hooks/refs -- latest-value ref read from an async timer callback below
  activeTabRef.current = activeTab;

  // Re-seed the thread once per step (keyed on stepKey, not on seedMessages/emails identity -
  // those are freshly-allocated arrays on every parent render, including the once-a-second render
  // SimulationShell's own decision clock causes) and reset the badge counters for the new step.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- re-seeding the thread for a new step is the whole point of this effect
    setMessages(seedMessages);
    setUnreadEmail(emails.length > 0 ? emails.length : 0);
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
      if (activeTabRef.current !== "chat") {
        setUnreadChat((count) => count + 1);
        if (!mutedRef.current) playNotificationBeep();
      }
    }, delayMs);
    return () => clearTimeout(timeout);
  }, [stepKey, interruptionPool]);

  function selectTab(tab: ToolTab) {
    setActiveTab(tab);
    if (tab === "chat") setUnreadChat(0);
    if (tab === "email") setUnreadEmail(0);
  }

  const totalUnread = unreadChat + unreadEmail;

  return (
    <div className={cn("flex h-full min-h-0 flex-col", isDark ? "bg-slate-950" : "bg-slate-100")}>
      {/* OS top status bar */}
      <div
        className={cn(
          "flex shrink-0 items-center gap-2 border-b px-3 py-1.5",
          isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"
        )}
      >
        <div className="flex items-center gap-1">
          {TABS.map(({ id, label, icon: Icon }) => {
            const unread = id === "chat" ? unreadChat : id === "email" ? unreadEmail : 0;
            return (
              <button
                key={id}
                onClick={() => selectTab(id)}
                className={cn(
                  "relative flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  activeTab === id
                    ? "bg-signal/15 text-signal"
                    : isDark
                      ? "text-slate-400 hover:text-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {unread > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-signal px-1 text-[10px] font-bold text-slate-950">
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className={cn("ml-auto flex items-center gap-3 text-xs", isDark ? "text-slate-400" : "text-slate-500")}>
          {crisis && <CountdownTimer anchorKey={crisis.label} label={crisis.label} durationSeconds={crisis.durationSeconds} onExpire={onCrisisExpire} isDark={isDark} />}
          <button
            onClick={() => setMuted((m) => !m)}
            title={muted ? "Unmute notification sounds" : "Mute notification sounds"}
            className="flex items-center gap-1 rounded px-1.5 py-1 hover:text-signal"
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
          <span className="relative flex items-center gap-1">
            <Bell className="h-3.5 w-3.5" />
            {totalUnread > 0 && <span className="absolute -right-1.5 -top-1.5 h-2 w-2 rounded-full bg-red-500" />}
          </span>
        </div>
      </div>

      {/* Active tool pane */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="h-full min-h-0 overflow-auto"
          >
            {activeTab === "canvas" && <div className="h-full min-h-0 p-3">{children}</div>}

            {activeTab === "chat" && (
              <div className="flex h-full flex-col gap-2 p-3">
                {messages.length === 0 && (
                  <p className={cn("text-xs italic", isDark ? "text-slate-500" : "text-slate-400")}>No messages yet.</p>
                )}
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "border px-3 py-2 text-xs",
                      message.isInterruption
                        ? "border-signal/50 bg-signal/10"
                        : isDark
                          ? "border-slate-800 bg-slate-900 text-slate-300"
                          : "border-slate-200 bg-white text-slate-600"
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2 font-semibold">
                      <span>
                        {message.author} <span className="font-normal opacity-60">#{message.channel}</span>
                      </span>
                      <span className="font-mono text-[10px] font-normal opacity-60">{formatTimestamp(message.timestamp)}</span>
                    </div>
                    <p>{message.text}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "email" && (
              <div className="flex h-full flex-col gap-2 p-3">
                {emails.length === 0 && (
                  <p className={cn("text-xs italic", isDark ? "text-slate-500" : "text-slate-400")}>Inbox is empty.</p>
                )}
                {emails.map((email) => (
                  <div
                    key={email.id}
                    className={cn(
                      "border px-3 py-2 text-xs",
                      isDark ? "border-slate-800 bg-slate-900 text-slate-300" : "border-slate-200 bg-white text-slate-600"
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="font-semibold">{email.from}</span>
                      <span className="font-mono text-[10px] opacity-60">{formatTimestamp(email.receivedAt)}</span>
                    </div>
                    <p className="font-medium">{email.subject}</p>
                    <p className="mt-0.5 opacity-80">{email.preview}</p>
                    {email.attachments && email.attachments.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {email.attachments.map((attachment) => (
                          <span
                            key={attachment}
                            className={cn(
                              "flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]",
                              isDark ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-500"
                            )}
                          >
                            <Paperclip className="h-2.5 w-2.5" />
                            {attachment}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
