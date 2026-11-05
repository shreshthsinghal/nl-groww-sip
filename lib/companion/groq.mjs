// Live AI for SIP Companion: Groq's free tier, called only from the server (GROQ_API_KEY never reaches the browser).
// Free-tier limits are small (a few answers a minute per model), so this module:
//  - tries a short list of models in order, skipping any model that is cooling down after a rate limit,
//  - gives every call a hard deadline,
//  - throws { code } on any problem so the pipeline answers from the rule-based + retrieval engine instead.
import { extractJSON } from "../server.js";

export const GROQ_MODELS = (process.env.GROQ_MODELS || "qwen/qwen3.8-27b,openai/gpt-oss-20b").split(",").map((x) => x.trim()).filter(Boolean);
const cooling = new Map(); // model -> time (ms) until which it is rate limited
export let lastModel = null;

export function groqConfigured() { return !!process.env.GROQ_API_KEY; }
export function groqCooling() { const now = Date.now(); return GROQ_MODELS.every((m) => (cooling.get(m) || 0) > now); }

function fail(code) { const e = new Error(code); e.code = code; return e; }
function retryAfterMs(r, body) {
  const h = Number(r.headers.get("retry-after"));
  if (Number.isFinite(h) && h > 0) return h * 1000;
  const m = /try again in (?:(\d+)m)?([\d.]+)(ms|s)/i.exec(body || "");
  if (m) return (Number(m[1] || 0) * 60000) + Number(m[2]) * (m[3] === "ms" ? 1 : 1000);
  return 20000;
}

/* Returns a generate(prompt) function for the pipeline. deadline = absolute time (ms) after which no call may run. */
export function groqGenerate(deadline, meter = { calls: [] }) {
  return async (prompt) => {
    const now = Date.now();
    const models = GROQ_MODELS.filter((m) => (cooling.get(m) || 0) <= now);
    if (!models.length) throw fail("rate_limited");
    let last = "upstream_error";
    for (const model of models) {
      const left = deadline - Date.now();
      if (left < 700) throw fail(last === "rate_limited" ? "rate_limited" : "timeout");
      const ac = new AbortController(); const t = setTimeout(() => ac.abort(), left); const started = Date.now();
      try {
        const body = { model, temperature: 0.2, max_tokens: /gpt-oss/.test(model) ? 700 : 450, messages: [{ role: "user", content: prompt }] };
        if (/gpt-oss/.test(model)) { body.reasoning_effort = "low"; body.include_reasoning = false; }
        const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST", signal: ac.signal,
          headers: { authorization: "Bearer " + process.env.GROQ_API_KEY, "content-type": "application/json" },
          body: JSON.stringify(body)
        });
        if (r.status === 429) { const b = await r.text().catch(() => ""); cooling.set(model, Date.now() + retryAfterMs(r, b)); last = "rate_limited"; meter.calls.push({ model, status: 429 }); continue; }
        if (r.status >= 500 && deadline - Date.now() > 1500) { meter.calls.push({ model, status: r.status }); await new Promise((z) => setTimeout(z, 300)); last = "http_" + r.status; continue; } // transient: back off, try the next model
        if (!r.ok) { last = "http_" + r.status; meter.calls.push({ model, status: r.status }); continue; }
        const j = await r.json();
        const u = j.usage || {};
        meter.calls.push({ model, status: 200, ms: Date.now() - started, in: u.prompt_tokens || 0, out: u.completion_tokens || 0 });
        const raw = ((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || "").replace(/<think>[\s\S]*?<\/think>/g, "");
        const o = extractJSON(raw);
        if (!o) { last = "unparseable"; continue; }
        lastModel = model;
        return o;
      } catch (e) {
        last = e && e.name === "AbortError" ? "timeout" : "upstream_error";
        if (last === "timeout") throw fail("timeout");
      } finally { clearTimeout(t); }
    }
    throw fail(last);
  };
}

export function groqWaitMs() { const now = Date.now(); return Math.max(0, Math.min(...GROQ_MODELS.map((m) => (cooling.get(m) || 0) - now))); }
