// SIP Companion answer route. No external AI and no API keys: every answer is composed by the on-site
// engine from this SIP's data and verified help-page facts, then validated (lib/companion/pipeline.mjs).
import { cleanState, answerQuestion } from "@/lib/companion/pipeline.mjs";
import { rateLimited } from "@/lib/server";

export const runtime = "nodejs";
const respond = (body, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

export async function GET() { return respond({ live: false, engine: "on-site retrieval + checks" }); }

export async function POST(req) {
  if (rateLimited(req, "assist", 30)) return respond({ error: "rate_limited" }, 429);
  let body; try { body = await req.json(); } catch { return respond({ error: "bad_request" }, 400); }
  const q = typeof body.q === "string" ? body.q.trim().slice(0, 300) : "";
  const s = cleanState(body.state);
  if (!q) return respond({ error: "empty" }, 400);
  if (!s) return respond({ error: "bad_state" }, 400);
  const t0 = Date.now();
  const r = await answerQuestion(s, q, { generate: null });
  return respond({ ...r, ms: Date.now() - t0 });
}
