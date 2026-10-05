import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SCORECARDS_BUCKET = "scorecards";

let client: SupabaseClient | null = null;

/**
 * Lazily constructs (and caches) a plain (non-SSR, non-cookie-bound) Supabase client for
 * server-side Storage operations - this module runs from API route handlers, not a user request's
 * cookie context, so lib/supabase/server.ts's cookie-aware client isn't the right fit here. Uses
 * the same anon key the rest of this app already relies on (no service-role key is configured);
 * the `scorecards` bucket's storage.objects RLS policies are scoped to just this bucket and allow
 * public read plus server-side write, since every PDF in it is meant to be publicly downloadable
 * via its CDN URL anyway.
 */
function getStorageClient(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  }
  return client;
}

function objectPath(sessionId: string): string {
  return `${sessionId}.pdf`;
}

/**
 * Uploads a rendered PDF buffer to `scorecards/${sessionId}.pdf` (overwriting any prior render for
 * this session, since `upsert: true` makes export-pdf/route.ts idempotent against retries) and
 * returns its public CDN URL.
 */
export async function uploadScorecardPDF(sessionId: string, pdfBuffer: Buffer): Promise<string> {
  const supabase = getStorageClient();
  const path = objectPath(sessionId);

  const { error } = await supabase.storage.from(SCORECARDS_BUCKET).upload(path, pdfBuffer, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) {
    throw new Error(`Failed to upload scorecard PDF to Supabase Storage: ${error.message}`);
  }

  const { data } = supabase.storage.from(SCORECARDS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Checks whether a PDF has already been rendered for this session directly against Supabase
 * Storage (rather than trusting only the SimulationSession.pdfUrl column), so a session whose
 * object exists but whose DB write was interrupted still resolves to its URL instead of
 * re-rendering. Returns null on a miss or any storage error - never throws.
 */
export async function getScorecardPDFUrl(sessionId: string): Promise<string | null> {
  const supabase = getStorageClient();
  const path = objectPath(sessionId);

  try {
    const { data, error } = await supabase.storage.from(SCORECARDS_BUCKET).list("", {
      search: path,
    });
    if (error || !data?.some((entry) => entry.name === path)) return null;

    const { data: publicUrlData } = supabase.storage.from(SCORECARDS_BUCKET).getPublicUrl(path);
    return publicUrlData.publicUrl;
  } catch (err) {
    console.error("[lib/storage/pdf] getScorecardPDFUrl failed:", err);
    return null;
  }
}
