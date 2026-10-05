import { Redis } from "@upstash/redis";

/** One turn's worth of persisted state - the Redis-cached shape mirrors Prisma's ActionLog row
 *  closely enough that callers can map 1:1 between the two (see app/api/simulations/evaluate's
 *  flush), but this type deliberately has no Prisma import so lib/redis.ts stays a plain cache
 *  module. */
export interface CachedTurn {
  stepSequence: number;
  studentInput: string;
  returnedState: unknown;
  decisionTag: string | null;
  decisionTimeSeconds: number | null;
}

/** Everything app/api/simulations/action/route.ts needs to serve a turn without touching Postgres -
 *  the full in-progress session plus its turn history. Written on /start, read+rewritten on every
 *  /action call, and flushed into Postgres + deleted by /evaluate once the session concludes. */
export interface CachedSimulationSession {
  studentId: string;
  careerType: string;
  mode: string;
  ageTier: string;
  status: "IN_PROGRESS" | "COMPLETED";
  studentTier: "ENTERPRISE_STUDENT" | "PUBLIC_DEMO";
  turns: CachedTurn[];
}

const SESSION_TTL_SECONDS = 86400; // 24 hours
const SESSION_KEY_PREFIX = "sim:session:";

let client: Redis | null | undefined;

/**
 * Lazily constructs (and caches) the Upstash Redis client from UPSTASH_REDIS_REST_URL /
 * UPSTASH_REDIS_REST_TOKEN. Returns null - never throws - when those aren't configured, so every
 * helper below degrades to a clean no-op/cache-miss and callers fall back to direct Postgres
 * reads/writes exactly as they did before Redis existed (see isRedisConfigured()).
 */
function getClient(): Redis | null {
  if (client !== undefined) return client;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn(
      "[lib/redis] UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN not set - session caching disabled, falling back to direct database reads/writes."
    );
    client = null;
    return client;
  }

  client = new Redis({ url, token });
  return client;
}

/** Lets callers branch on cache-backed vs. DB-direct behavior (e.g. action/route.ts choosing
 *  whether to skip its synchronous per-turn ActionLog write) without duplicating the env check. */
export function isRedisConfigured(): boolean {
  return getClient() !== null;
}

function sessionKey(sessionId: string): string {
  return `${SESSION_KEY_PREFIX}${sessionId}`;
}

/** Fetches cached session state (turn history, mode, tier, status). Returns null on a cache miss
 *  OR on any Redis error - callers always treat null as "go read Postgres instead," never as a
 *  thrown exception. */
export async function getRedisSession<T = CachedSimulationSession>(sessionId: string): Promise<T | null> {
  const redis = getClient();
  if (!redis) return null;
  try {
    const data = await redis.get<T>(sessionKey(sessionId));
    return data ?? null;
  } catch (err) {
    console.error("[lib/redis] getRedisSession failed, falling back to the database:", err);
    return null;
  }
}

/** Writes (or overwrites) a session's full cached state with a sliding 24h TTL. A no-op when
 *  Redis isn't configured or the write fails - never throws, since the database remains the
 *  durable source of truth once /evaluate flushes this. */
export async function setRedisSession(
  sessionId: string,
  sessionData: unknown,
  ttlSeconds: number = SESSION_TTL_SECONDS
): Promise<void> {
  const redis = getClient();
  if (!redis) return;
  try {
    await redis.set(sessionKey(sessionId), sessionData, { ex: ttlSeconds });
  } catch (err) {
    console.error("[lib/redis] setRedisSession failed (continuing without cache):", err);
  }
}

/** Deletes the cached session - called once /evaluate has durably flushed its final turn history
 *  and scorecard into Postgres, so a stale cache entry never outlives the row it mirrors. */
export async function clearRedisSession(sessionId: string): Promise<void> {
  const redis = getClient();
  if (!redis) return;
  try {
    await redis.del(sessionKey(sessionId));
  } catch (err) {
    console.error("[lib/redis] clearRedisSession failed:", err);
  }
}
