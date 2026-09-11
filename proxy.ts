import { NextRequest, NextResponse } from "next/server";

/**
 * In-memory sliding-window rate limiter, keyed by client IP.
 *
 * CAVEAT: this Map lives in a single Edge Middleware instance's memory. On Vercel, traffic
 * can be routed across multiple concurrent instances/regions and instances are recycled on
 * redeploys or scale-to-zero, so this is a best-effort guardrail against accidental bursts
 * and simple abuse - not a durable, cross-instance limit. For real distributed rate limiting
 * in production, swap this for `@upstash/ratelimit` backed by Upstash Redis (a few lines -
 * see the deployment guide).
 */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const MAX_TRACKED_CLIENTS = 5_000;
const MAX_JSON_BODY_BYTES = 100_000; // 100kb - simulation action/start payloads are small JSON

const requestLog = new Map<string, number[]>();

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  if (requestLog.size > MAX_TRACKED_CLIENTS) {
    for (const [trackedKey, timestamps] of requestLog) {
      if (timestamps.every((t) => t <= windowStart)) requestLog.delete(trackedKey);
    }
  }

  const timestamps = (requestLog.get(key) ?? []).filter((t) => t > windowStart);
  timestamps.push(now);
  requestLog.set(key, timestamps);
  return timestamps.length > RATE_LIMIT_MAX_REQUESTS;
}

function validateSimulationApiRequest(request: NextRequest): NextResponse | null {
  const ip = getClientIp(request);

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down and try again shortly." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  if (request.method === "POST") {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json." },
        { status: 415 }
      );
    }

    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > MAX_JSON_BODY_BYTES) {
      return NextResponse.json({ error: "Request body too large." }, { status: 413 });
    }
  }

  return null;
}

function buildCspHeader(nonce: string): string {
  const isDev = process.env.NODE_ENV !== "production";
  return [
    `default-src 'self'`,
    // 'unsafe-eval' is required in dev only (Next.js/Turbopack HMR); production stays strict.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // React/framer-motion render inline `style` attributes (e.g. animated widths/transforms),
    // which CSP style-src can only allow via 'unsafe-inline' - there is no per-attribute nonce.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data:`,
    `font-src 'self'`,
    `connect-src 'self' https://*.supabase.co`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/simulations")) {
    const rejection = validateSimulationApiRequest(request);
    if (rejection) return rejection;
  }

  // Nonce-based strict CSP for every page, per Next.js's documented App Router CSP recipe:
  // https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCspHeader(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
