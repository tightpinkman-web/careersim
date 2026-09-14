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

const GUARDED_API_PREFIXES = [
  "/api/simulations/",
  "/api/simulation-requests",
  "/api/contact",
  "/api/catalog/vote",
];

function isGuardedApiRoute(pathname: string): boolean {
  return GUARDED_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;

  if (isGuardedApiRoute(pathname)) {
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
        return NextResponse.json({ error: "Content-Type must be application/json." }, { status: 415 });
      }

      const contentLength = Number(request.headers.get("content-length") ?? "0");
      if (contentLength > MAX_JSON_BODY_BYTES) {
        return NextResponse.json({ error: "Request body too large." }, { status: 413 });
      }
    }
  }

  return NextResponse.next({ request });
}

// Content-Security-Policy and the other static security headers live in next.config.ts, since
// they no longer depend on a per-request nonce. This proxy now runs on nearly every route, but
// isGuardedApiRoute() scopes the abuse-prevention checks back down to just the routes that need
// them. Every page and API route is fully public - there is no session/auth concept left to
// refresh here; guests are identified purely by the anonymousSessionId their browser generates
// and persists in localStorage (see lib/anonymousSession.ts).
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
