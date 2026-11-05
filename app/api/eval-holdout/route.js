// TEMPORARY, single-purpose: ONE controlled live run of the 25 locked held-out cases on this build. Removed after the run.
// One case at a time, a gap between cases, at most one retry after a rate limit; if Groq still refuses, the run STOPS
// (a quota fallback is never counted as a result). A lock prevents overlapping runs on an instance.
import { HOLDOUT } from "@/lib/companion/evalset_v3_holdout.mjs";
import { runCase } from "@/lib/companion/evalrun.mjs";
import { groqConfigured, groqGenerate, lastModel } from "@/lib/companion/groq.mjs";
import { PROMPT_VERSION } from "@/lib/companion/pipeline.mjs";
export const runtime = "nodejs";
export const maxDuration = 300;
const NONCE = "92170767302d6d414a497faa";
let running = false;
export async function GET(req) {
  const u = new URL(req.url);
  if (u.searchParams.get("k") !== NONCE) return new Response("not found", { status: 404 });
  if (!groqConfigured()) return Response.json({ error: "no key" });
  if (running) return Response.json({ error: "a run is already in progress" }, { status: 409 });
  running = true;
  const from = Number(u.searchParams.get("from") || 0), n = Math.min(Number(u.searchParams.get("n") || 25), 25), gap = Math.max(Number(u.searchParams.get("gap") || 8000), 4000);
  const rows = []; let stopped = null; const t0 = Date.now();
  try {
    for (const c of HOLDOUT.slice(from, from + n)) {
      if (Date.now() - t0 > 250000) { stopped = "time budget"; break; }
      await new Promise((z) => setTimeout(z, gap));
      let meter = { calls: [] }, r = await runCase(c, null, () => groqGenerate(Date.now() + 5000, meter)), tries = 1, limits = meter.calls.filter((x) => x.status === 429).length;
      if (r.mode === "provider_down" && (r.reason === "rate_limited" || r.reason === "busy")) {
        await new Promise((z) => setTimeout(z, 20000)); meter = { calls: [] }; r = await runCase(c, null, () => groqGenerate(Date.now() + 5000, meter)); tries = 2; limits += meter.calls.filter((x) => x.status === 429).length + 1;
        if (r.mode === "provider_down" && (r.reason === "rate_limited" || r.reason === "busy")) { stopped = "quota: Groq refused " + c.id + " twice"; rows.push({ id: c.id, notCounted: true, reason: r.reason }); break; }
      }
      rows.push({ id: c.id, pass: r.pass, mode: r.mode, reason: r.reason, model: r.mode === "live" ? lastModel : null, ms: r.ms, intent: r.intent, srcOk: r.srcOk, gate: r.gate, prohibited: r.prohibited, tries, rateLimitErrors: limits,
        tokensIn: meter.calls.reduce((a, x) => a + (x.in || 0), 0), tokensOut: meter.calls.reduce((a, x) => a + (x.out || 0), 0), calls: meter.calls.map((x) => x.model.split("/")[1] + ":" + x.status), fails: r.fails, text: r.text.slice(0, 600) });
    }
  } finally { running = false; }
  return Response.json({ build: (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7), deployment: process.env.VERCEL_DEPLOYMENT_ID || null, prompt: PROMPT_VERSION, from, ran: rows.length, stopped, rows });
}
