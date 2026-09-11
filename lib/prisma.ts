import { PrismaClient } from "@prisma/client";

/**
 * Singleton Prisma Client, cached on `globalThis`.
 *
 * This matters in two different ways depending on where the process is running:
 * - In local dev, it survives Next.js's module-reload-on-save without spawning a fresh
 *   client (and a fresh connection pool) on every file change.
 * - On Vercel, each serverless function invocation runs in a "container" that is frequently
 *   reused ("warm") for the next invocation to the same function before it is eventually
 *   frozen/recycled. Caching the client on `globalThis` - in every environment, not just
 *   dev - lets a warm container reuse the same client (and its connections to Supabase's
 *   PgBouncer transaction pooler) across invocations instead of opening a new pool each
 *   time, which is what actually prevents connection exhaustion under concurrent traffic.
 *
 * DATABASE_URL must point at Supabase's transaction pooler (port 6543, `pgbouncer=true`)
 * for this runtime client - PgBouncer in transaction mode is what lets many short-lived
 * serverless invocations share a small number of real Postgres connections. DIRECT_URL
 * (port 5432, no pooler) is used only by `prisma migrate`/`db push`, which need a direct,
 * session-level connection to run DDL and are never invoked from serverless functions.
 * See .env.local for both connection strings.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

globalForPrisma.prisma = prisma;
