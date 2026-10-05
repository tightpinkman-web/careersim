/**
 * Load/spike test for the Groq + Upstash Redis simulation pipeline (lib/llm/provider.ts,
 * lib/redis.ts) - ramps from 100 to 5,000 concurrent virtual users, each minting its own
 * session via /api/simulations/start and then driving it through /api/simulations/action,
 * the hot path this pipeline exists to accelerate.
 *
 * Requires the k6 binary (https://k6.io/docs/get-started/installation/) - this is NOT an npm
 * package, it's a standalone Go binary, so there is nothing to `npm install` here.
 *
 * Usage:
 *   k6 run tests/load/simulation-spike.js
 *   k6 run -e BASE_URL=https://staging.example.com tests/load/simulation-spike.js
 *
 * BASE_URL defaults to http://localhost:3000 - a stray `k6 run` with no flags will never
 * accidentally spike a live deployment. Point this at production only deliberately, with the
 * team aware a 5,000-VU ramp is about to hit real Groq/Upstash/Supabase/Vercel billing and
 * rate limits - coordinate the exact window before running it there.
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

// Custom metrics, read from k6's end-of-run summary:
//  - start_latency / action_latency: per-endpoint response time, not just the blended default.
//  - action_error_rate: genuine failures only - a demo-tier 403 (DEMO_CAP_REACHED) is expected
//    traffic under this script's synthetic load, not a pipeline failure, so it's counted
//    separately via demo_cap_reached instead of polluting the error rate.
const startLatency = new Trend("start_latency", true);
const actionLatency = new Trend("action_latency", true);
const actionErrorRate = new Rate("action_error_rate");
const demoCapReached = new Counter("demo_cap_reached");

export const options = {
  scenarios: {
    spike: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 100 }, // baseline
        { duration: "1m", target: 100 },
        { duration: "30s", target: 1000 }, // first spike
        { duration: "1m", target: 1000 },
        { duration: "30s", target: 5000 }, // full spike
        { duration: "2m", target: 5000 },
        { duration: "1m", target: 0 }, // ramp-down
      ],
    },
  },
  thresholds: {
    // Groq's whole premise is low-latency turn generation - these thresholds are the pass/fail
    // bar for "the Redis+Groq pipeline held up under load," not arbitrary SLA numbers.
    start_latency: ["p(95)<5000"],
    action_latency: ["p(95)<3000", "p(99)<6000"],
    action_error_rate: ["rate<0.05"],
    http_req_failed: ["rate<0.05"],
  },
};

const CAREER_TYPES = ["VENTURE_CAPITAL", "CYBERSECURITY", "PRODUCT_MANAGEMENT", "CORPORATE_LAW", "QUANT_TRADING"];
const SAMPLE_ACTIONS = [
  "analyze_data: Pull the raw telemetry before committing to a plan.",
  "escalate: Loop in the on-call lead immediately.",
  "negotiate_terms: Push back on the clause and counter.",
  "hold_position: Tighten risk parameters and hold through the spike.",
];

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/** SSE-style body: the "done" event's JSON (the last `data:` line) carries sessionId, preceded
 *  by several "delta" events that aren't valid JSON on their own - so this regex-extracts the id
 *  directly instead of parsing the whole SSE stream in k6. */
function extractSessionId(body) {
  const match = body && body.match(/"sessionId":"([^"]+)"/);
  return match ? match[1] : null;
}

// Each iteration mints its OWN session (a unique anonymousSessionId per VU/iteration) and drives
// it through one /action call - this is what actually exercises the Redis-cached per-turn hot
// path and the Groq provider under concurrent load. Hammering a single shared session instead
// would just trip the PUBLIC_DEMO 3-step cap (see lib/auth/entitlements.ts) after a handful of
// calls and tell you nothing about pipeline throughput.
export default function simulationSpike() {
  const anonymousSessionId = `k6-${__VU}-${__ITER}-${Date.now()}`;

  const startRes = http.post(
    `${BASE_URL}/api/simulations/start`,
    JSON.stringify({
      anonymousSessionId,
      careerType: randomFrom(CAREER_TYPES),
      mode: "professional",
      ageTier: "college_pro",
    }),
    { headers: { "Content-Type": "application/json" }, timeout: "30s" }
  );
  startLatency.add(startRes.timings.duration);

  const startOk = check(startRes, {
    "start: status 200": (r) => r.status === 200,
    "start: has sessionId": (r) => extractSessionId(r.body) !== null,
  });

  if (!startOk) {
    actionErrorRate.add(1);
    sleep(1);
    return;
  }

  const sessionId = extractSessionId(startRes.body);

  sleep(Math.random() * 2); // simulate a student reading the scenario before acting

  const actionRes = http.post(
    `${BASE_URL}/api/simulations/action`,
    JSON.stringify({
      sessionId,
      action: randomFrom(SAMPLE_ACTIONS),
      decisionTimeSeconds: Math.floor(Math.random() * 45) + 5,
    }),
    { headers: { "Content-Type": "application/json" }, timeout: "30s" }
  );
  actionLatency.add(actionRes.timings.duration);

  const isDemoCap = actionRes.status === 403 && actionRes.body && actionRes.body.includes("DEMO_CAP_REACHED");
  if (isDemoCap) {
    demoCapReached.add(1);
  } else {
    const actionOk = check(actionRes, { "action: status 200": (r) => r.status === 200 });
    actionErrorRate.add(!actionOk);
  }

  sleep(1);
}
