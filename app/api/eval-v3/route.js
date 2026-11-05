// TEMPORARY (removed after the frozen run): runs slices of the v3.2 sets live on this deployment and returns
// compact scored rows plus full text for listed ids (for the claim-level audit).
import { CASES, runCase } from "@/lib/companion/evalrun.mjs";
import { HOLDOUT } from "@/lib/companion/evalset_v3_holdout.mjs";
import { groqConfigured, groqGenerate, lastModel } from "@/lib/companion/groq.mjs";
import { PROMPT_VERSION } from "@/lib/companion/pipeline.mjs";
export const runtime = "nodejs";
export const maxDuration = 300;
const NONCE = "c9dd07ee78b142df13be46a8";
export async function GET(req) {
  const u = new URL(req.url);
  if (u.searchParams.get("k") !== NONCE) return new Response("not found", { status: 404 });
  if (!groqConfigured()) return Response.json({ error: "no key" });
  const set = u.searchParams.get("set") === "H" ? HOLDOUT : CASES;
  const from = Number(u.searchParams.get("from") || 0), n = Number(u.searchParams.get("n") || 8), gap = Number(u.searchParams.get("gap") || 4000);
  const want = new Set((u.searchParams.get("text") || "").split(",").filter(Boolean));
  const rows = [], t0 = Date.now();
  for (const c of set.slice(from, from + n)) {
    await new Promise((z) => setTimeout(z, gap));
    let meter = { calls: [] }, r = await runCase(c, null, () => groqGenerate(Date.now() + 5000, meter)), retried = false;
    if (r.mode === "provider_down" && (r.reason === "rate_limited" || r.reason === "busy") && Date.now() - t0 < 230000) {
      await new Promise((z) => setTimeout(z, 22000)); meter = { calls: [] }; r = await runCase(c, null, () => groqGenerate(Date.now() + 5000, meter)); retried = true;
    }
    const inT = meter.calls.reduce((a, x) => a + (x.in || 0), 0), outT = meter.calls.reduce((a, x) => a + (x.out || 0), 0);
    rows.push([r.id, r.pass ? 1 : 0, r.mode[0] + (r.reason ? ":" + r.reason : ""), r.mode === "live" ? (lastModel || "").split("/")[1] : "", r.ms, r.srcOk === null ? "" : r.srcOk ? 1 : 0, r.intentOk === null ? "" : r.intentOk ? 1 : 0, r.intent, r.gate ? 1 : 0, r.prohibited ? 1 : 0, inT, outT, retried ? 1 : 0, r.pass ? "" : r.fails.join("; ").slice(0, 140)].join("|") + (want.has(r.id) || !r.pass ? " || " + r.text.slice(0, 420) : ""));
  }
  return new Response([ "build=" + (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7) + " prompt=" + PROMPT_VERSION + " set=" + (set === HOLDOUT ? "H" : "dev") + " from=" + from ].concat(rows).join("\n"), { headers: { "content-type": "text/plain" } });
}
