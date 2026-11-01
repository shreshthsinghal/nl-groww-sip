// SIP Companion 2.0 answer route. The pipeline (lib/companion/pipeline.mjs) validates every answer before it is returned.
import { cleanState, answerQuestion } from "@/lib/companion/pipeline.mjs";
import { callClaude, extractJSON, rateLimited, MODEL, hasKey } from "@/lib/server";

export const runtime = "nodejs";
export const maxDuration = 45;
const respond = (body, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

export async function GET(req) {
  // ?probe=1 makes one tiny model call and reports the provider's status and error message (never the key).
  if (new URL(req.url).searchParams.get("probe") === "1" && hasKey()) {
    if (rateLimited(req, "probe", 3)) return respond({ error: "rate_limited" }, 429);
    const t0 = Date.now();
    try { const text = await callClaude("Reply with the single word OK.", { maxTokens: 5, temperature: 0, timeoutMs: 15000 }); return respond({ ok: true, model: MODEL, reply: text.slice(0, 20), ms: Date.now() - t0 }); }
    catch (e) { return respond({ ok: false, model: MODEL, code: e.code, status: e.status || null, detail: e.detail || null, raw: e.raw || null, ms: Date.now() - t0 }); }
  }
  return respond({ live: hasKey(), model: hasKey() ? MODEL : null });
}

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
