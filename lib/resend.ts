import { Resend } from "resend";

const ALERT_RECIPIENT = "tightpinkman@gmail.com";
const FROM_ADDRESS = "onboarding@resend.dev";

let client: Resend | null = null;

/**
 * Lazily constructs the Resend client on first use inside a request handler - not at module
 * load time - for the same reason as lib/gemini.ts and lib/prisma.ts: Next.js's build step
 * imports every route module to collect its config, so anything eager here would run during
 * `next build` too.
 */
function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

/**
 * Sends a best-effort lead-alert email. Never throws - a missing RESEND_API_KEY, an API error,
 * or a network failure all just get logged, since a notification email failing should never
 * turn an otherwise-successful lead/request submission into a 500 for the visitor who filled
 * out the form.
 */
export async function sendLeadAlertEmail(email: { subject: string; html: string; text: string }): Promise<void> {
  const resend = getResendClient();
  if (!resend) return;

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: ALERT_RECIPIENT,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    if (error) {
      console.error("Resend API returned an error sending lead alert email:", error);
    }
  } catch (err) {
    console.error("Failed to send lead alert email:", err);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderFieldsHtml(title: string, rows: [string, string][]): string {
  const rowsHtml = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px;font-weight:600;color:#334155;white-space:nowrap;vertical-align:top;">${escapeHtml(
          label
        )}</td><td style="padding:6px 12px;color:#0f172a;">${escapeHtml(value).replace(/\n/g, "<br/>")}</td></tr>`
    )
    .join("");
  return `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;">
  <h2 style="color:#4338ca;font-size:16px;margin:0 0 12px;">${escapeHtml(title)}</h2>
  <table style="border-collapse:collapse;width:100%;font-size:14px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">${rowsHtml}</table>
</div>`;
}

function renderFieldsText(title: string, rows: [string, string][]): string {
  return [title, "", ...rows.map(([label, value]) => `${label}: ${value}`)].join("\n");
}

interface SimulationRequestEmailData {
  requestedCareerTitle: string;
}

export function buildSimulationRequestEmail(data: SimulationRequestEmailData) {
  const subject = `New Career Sim Request: ${data.requestedCareerTitle}`;
  const rows: [string, string][] = [["Requested Career", data.requestedCareerTitle]];
  return { subject, html: renderFieldsHtml(subject, rows), text: renderFieldsText(subject, rows) };
}

interface ContactLeadEmailData {
  name: string;
  email: string;
  organization: string | null;
  message: string | null;
}

export function buildContactLeadEmail(data: ContactLeadEmailData) {
  const subject = `New B2B Lead: ${data.name} (${data.organization || "No organization"})`;
  const rows: [string, string][] = [
    ["Name", data.name],
    ["Email", data.email],
    ["Organization", data.organization || "N/A"],
    ["Message", data.message || "N/A"],
  ];
  return { subject, html: renderFieldsHtml(subject, rows), text: renderFieldsText(subject, rows) };
}
