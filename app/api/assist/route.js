// SIP Companion answer route. No external AI and no API keys: the conversation engine (lib/companion/converse.mjs)
// reads the message plus recent conversation, retrieves this SIP's data and verified facts, composes a reply,
// and the pipeline validates it with the 15 checks before it is returned.
import { cleanState, cleanHistory, answerQuestion } from "@/lib/companion/pipeline.mjs";
import { rateLimited } from "@/lib/server";

export const runtime = "nodejs";
const respond = (body, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

export async function GET() { return respond({ live: false, engine: "conversation engine: retrieval + checks, no external AI" }); }

export async function POST(req) {
  if (rateLimited(req, "assist", 40)) return respond({ error: "rate_limited" }, 429);
  let body; try { body = await req.json(); } catch { return respond({ error: "bad_request" }, 400); }
  const q = typeof body.q === "string" ? body.q.trim().slice(0, 300) : "";
  const s = cleanState(body.state);
  if (!q) return respond({ error: "empty" }, 400);
  if (!s) return respond({ error: "bad_state" }, 400);
  const t0 = Date.now();
  const r = await answerQuestion(s, q, { generate: null, history: cleanHistory(body.history) });
  return respond({ ...r, ms: Date.now() - t0 });
}
