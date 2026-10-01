import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Pinged by the Vercel Cron configured in vercel.json every 3 days so Supabase's free-tier
 *  database doesn't auto-pause from inactivity. If CRON_SECRET is set, requires it as a bearer
 *  token (Vercel's documented pattern for authenticating its own cron invocations) - if unset,
 *  the route stays open so this also works in environments where that secret isn't configured. */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await prisma.$queryRaw`SELECT 1`;

  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
