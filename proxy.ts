import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

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

/** Refreshes the Supabase auth session cookie against the request/response pair this proxy is
 *  already building (so a signed-in user's server components and API routes always see a valid
 *  session without a separate middleware file - this Next.js version supports only one proxy).
 *  Every page is public - guests fall through to the anonymous-session flow the app already
 *  supports (see lib/authStudent.ts) - this only keeps an optional session cookie fresh. */
async function refreshSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  await supabase.auth.getUser();

  return response;
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

  return refreshSession(request);
}

// Content-Security-Policy and the other static security headers live in next.config.ts, since
// they no longer depend on a per-request nonce. This proxy now runs on nearly every route (not
// just the guarded API routes above) so the Supabase auth cookie stays fresh across page loads;
// isGuardedApiRoute() scopes the abuse-prevention checks back down to just the routes that need
// them.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
