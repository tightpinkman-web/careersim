"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, organization, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send your message.");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send your message.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-2 border border-signal/40 bg-signal/10 p-6 text-center">
        <CheckCircle2 className="h-6 w-6 text-signal" />
        <p className="text-sm font-medium text-ink">Thanks. We&apos;ll be in touch shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className="w-full border border-hairline bg-obsidian px-3 py-2.5 text-base text-ink placeholder:text-slate-500 outline-none focus:border-signal"
      />
      <input
        required
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email address"
        className="w-full border border-hairline bg-obsidian px-3 py-2.5 text-base text-ink placeholder:text-slate-500 outline-none focus:border-signal"
      />
      <input
        value={organization}
        onChange={(e) => setOrganization(e.target.value)}
        placeholder="Organization (optional)"
        className="w-full border border-hairline bg-obsidian px-3 py-2.5 text-base text-ink placeholder:text-slate-500 outline-none focus:border-signal"
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="How can we help?"
        rows={4}
        className="w-full resize-none border border-hairline bg-obsidian px-3 py-2.5 text-base text-ink placeholder:text-slate-500 outline-none focus:border-signal"
      />
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-rose-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="flex items-center justify-center gap-2 border border-signal bg-signal px-4 py-2.5 text-sm font-semibold text-obsidian transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
