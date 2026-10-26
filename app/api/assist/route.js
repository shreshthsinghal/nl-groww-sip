// SIP Companion 2.0 answer route. The pipeline (lib/companion/pipeline.mjs) validates every answer before it is returned.
import { cleanState, answerQuestion } from "@/lib/companion/pipeline.mjs";
import { callClaude, extractJSON, rateLimited, MODEL, hasKey } from "@/lib/server";

export const runtime = "nodejs";
export const maxDuration = 45;
const respond = (body, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

export async function GET() { return respond({ live: hasKey(), model: hasKey() ? MODEL : null }); }

export async function POST(req) {
  if (rateLimited(req, "assist", 30)) return respond({ error: "rate_limited" }, 429);
  let body; try { body = await req.json(); } catch { return respond({ error: "bad_request" }, 400); }
  const q = typeof body.q === "string" ? body.q.trim().slice(0, 300) : "";
  const s = cleanState(body.state);
  if (!q) return respond({ error: "empty" }, 400);
  if (!s) return respond({ error: "bad_state" }, 400);
  const t0 = Date.now();
  const generate = hasKey() ? async (prompt) => {
    return extractJSON(await callClaude(prompt, { maxTokens: 600, temperature: 0.2, timeoutMs: 18000 })); // null if unparseable: fails the schema check and is retried
  } : null;
  const r = await answerQuestion(s, q, { generate });
  return respond({ ...r, model: r.mode === "live" ? MODEL : null, ms: Date.now() - t0 });
}
