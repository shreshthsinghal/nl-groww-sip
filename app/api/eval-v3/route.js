// TEMPORARY: runs a slice of the v3 evaluation set live on the deployment (Groq + gate + fallback). Removed after the run.
import { CASES, runCase } from "@/lib/companion/evalrun.mjs";
import { groqConfigured, groqGenerate, groqWaitMs, lastModel } from "@/lib/companion/groq.mjs";
export const runtime = "nodejs";
export const maxDuration = 300;
const NONCE = "8a051aa0c632d4783b98d7a1";
export async function GET(req) {
  const u = new URL(req.url);
  if (u.searchParams.get("k") !== NONCE) return new Response("not found", { status: 404 });
  if (!groqConfigured()) return Response.json({ error: "no key" });
  const from = Number(u.searchParams.get("from") || 0), n = Number(u.searchParams.get("n") || 8), pace = u.searchParams.get("pace") !== "0";
  const rows = [], t0 = Date.now();
  for (const c of CASES.slice(from, from + n)) {
    if (pace) { const w = groqWaitMs(); if (w > 0 && Date.now() - t0 + w < 250000) await new Promise((z) => setTimeout(z, Math.min(w + 200, 30000))); }
    const meter = { calls: [] };
    const r = await runCase(c, null, () => groqGenerate(Date.now() + 5000, meter));
    r.model = r.mode === "live" ? lastModel : null;
    r.usage = { in: meter.calls.reduce((a, x) => a + (x.in || 0), 0), out: meter.calls.reduce((a, x) => a + (x.out || 0), 0), calls: meter.calls.map((x) => x.model.split("/")[1] + ":" + x.status) };
    rows.push(r);
  }
  return Response.json({ from, n: rows.length, rows });
}
