// SIP Companion answer route.
// Live AI: when GROQ_API_KEY is set (server-side only), domain questions are drafted by a Groq model on the free tier,
// within a 5-second budget, and every draft must pass the same 15 deterministic checks before it is shown.
// When the free-tier limit is used up, the model is slow or a draft fails a check, the reply comes from the
// conversation engine (rule-based + retrieval over this SIP's data and verified facts), which is checked the same way.
import { cleanState, cleanHistory, answerQuestion } from "@/lib/companion/pipeline.mjs";
import { groqConfigured, groqGenerate, groqCooling, GROQ_MODELS, lastModel } from "@/lib/companion/groq.mjs";
import { rateLimited } from "@/lib/server";

export const runtime = "nodejs";
export const maxDuration = 15;
const BUDGET_MS = 5000;
const respond = (body, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

export async function GET() {
  return respond({ live: groqConfigured(), provider: groqConfigured() ? "groq (free tier)" : null, models: groqConfigured() ? GROQ_MODELS : [], cooling: groqConfigured() ? groqCooling() : false,
    fallback: "conversation engine: rule-based + retrieval, same checks" });
}

export async function POST(req) {
  if (rateLimited(req, "assist", 40)) return respond({ error: "rate_limited" }, 429);
  let body; try { body = await req.json(); } catch { return respond({ error: "bad_request" }, 400); }
  const q = typeof body.q === "string" ? body.q.trim().slice(0, 300) : "";
  const s = cleanState(body.state);
  if (!q) return respond({ error: "empty" }, 400);
  if (!s) return respond({ error: "bad_state" }, 400);
  const t0 = Date.now();
  const generate = groqConfigured() ? groqGenerate(t0 + BUDGET_MS) : null;
  const r = await answerQuestion(s, q, { generate, history: cleanHistory(body.history) });
  return respond({ ...r, model: r.mode === "live" ? lastModel : undefined, liveAvailable: groqConfigured(), ms: Date.now() - t0 });
}
