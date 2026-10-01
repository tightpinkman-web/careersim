/** Minimal Server-Sent-Events helper for streaming simulation turns to the client.
 *
 * Only used once request validation (bad JSON, missing fields, 404s, etc.) has already passed
 * and returned its own normal NextResponse.json(...) with a real HTTP status - by the time this
 * is called, the response has committed to 200 and a streaming body, so a failure that happens
 * mid-stream (e.g. the Gemini call itself) is reported as a `{"type":"error"}` event instead of
 * an HTTP status code, and the client must check for that event explicitly. */
export function sseResponse(
  build: (send: (event: Record<string, unknown>) => void) => Promise<void>
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        await build(send);
      } catch (err) {
        send({ type: "error", error: err instanceof Error ? err.message : "Unknown error." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
