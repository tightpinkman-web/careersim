import type { SimulationState } from "@/types/simulation";

export interface SimDoneEvent {
  type: "done";
  sessionId: string;
  state: SimulationState;
}
export interface SimDeltaEvent {
  type: "delta";
  narrativePreview: string;
}
export interface SimErrorEvent {
  type: "error";
  error: string;
  /** Machine-readable error code (e.g. "SESSION_NOT_FOUND", "ENGINE_ERROR") driving the masked
   *  status-badge UI in app/simulations/[sessionId]/page.tsx - see SimulationStreamError below. */
  code?: string;
}
export type SimStreamEvent = SimDoneEvent | SimDeltaEvent | SimErrorEvent;

/** Thrown by readSimulationStream on any failure, carrying the server's error `code` (falls back
 *  to "UNKNOWN") alongside the human-readable message, so callers can branch on the code instead
 *  of fragile string-matching the message. */
export class SimulationStreamError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Reads the SSE body from /api/simulations/start or /api/simulations/action (see lib/sse.ts on
 * the server side), invoking `onEvent` for every "delta"/"done" event as it arrives, and
 * resolving with the final "done" event once the stream ends. Throws on a non-2xx response
 * (parsing its JSON `{error, code}` body the same way the old single-JSON-response flow did) or
 * on an in-stream `{"type":"error"}` event.
 */
export async function readSimulationStream(
  res: Response,
  onEvent?: (event: SimStreamEvent) => void
): Promise<SimDoneEvent> {
  if (!res.ok) {
    let message = `Request failed with status ${res.status}.`;
    let code = "UNKNOWN";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
      if (data?.code) code = data.code;
    } catch {
      // Body wasn't JSON - keep the generic message/code.
    }
    throw new SimulationStreamError(message, code);
  }

  if (!res.body) {
    throw new SimulationStreamError("Response had no body to stream.", "NO_BODY");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done: SimDoneEvent | null = null;

  while (true) {
    const { value, done: streamDone } = await reader.read();
    if (streamDone) break;
    buffer += decoder.decode(value, { stream: true });

    let separatorIndex: number;
    while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);

      const dataLine = rawEvent.split("\n").find((line) => line.startsWith("data:"));
      if (!dataLine) continue;
      const json = dataLine.slice("data:".length).trim();
      if (!json) continue;

      let event: SimStreamEvent;
      try {
        event = JSON.parse(json);
      } catch {
        continue;
      }

      onEvent?.(event);
      if (event.type === "error") throw new SimulationStreamError(event.error, event.code ?? "ENGINE_ERROR");
      if (event.type === "done") done = event;
    }
  }

  if (!done) throw new SimulationStreamError("The simulation stream ended unexpectedly.", "STREAM_INCOMPLETE");
  return done;
}
