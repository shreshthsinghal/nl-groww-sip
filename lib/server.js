// Server-only helpers: the model call, JSON extraction, and a simple per-IP rate limit.
// Provider: OpenRouter when OPENROUTER_API_KEY is set (free models), else Anthropic when ANTHROPIC_API_KEY is set.
// Keys live only in Vercel environment variables; nothing here is sent to the browser.
const OPENROUTER = !!process.env.OPENROUTER_API_KEY;
const ANTHROPIC = !OPENROUTER && !!process.env.ANTHROPIC_API_KEY;

export const PROVIDER = OPENROUTER ? "openrouter" : ANTHROPIC ? "anthropic" : null;
// OpenRouter tries these free models in order (all served by providers that do not train on prompts).
export const MODELS = OPENROUTER
  ? (process.env.OPENROUTER_MODELS || process.env.OPENROUTER_MODEL || "google/gemma-4-31b-it:free,google/gemma-4-26b-a4b-it:free,poolside/laguna-s-2.1:free").split(",").map((m) => m.trim()).filter(Boolean).slice(0, 3)
  : [process.env.ANTHROPIC_MODEL || "claude-haiku-5-5"];
export const MODEL = MODELS[0];
export let lastModel = null; // the model that actually answered the most recent call

export function hasKey() { return !!PROVIDER; }

// The free OpenRouter quota is shared by both sites (50 requests a day without credits), so the
// discovery engine's optional model calls stay off unless ENGINE_LIVE=1. The Companion MVP always uses it.
export function liveFor(feature) {
  if (!hasKey()) return false;
  if (feature === "engine") return process.env.ENGINE_LIVE === "1";
  return true;
}

function err(message, code, status) { const e = new Error(message); e.code = code; if (status) e.status = status; return e; }

export async function callClaude(prompt, { maxTokens = 500, temperature = 0.2, timeoutMs = 25000, models = null } = {}) {
  if (!hasKey()) throw err("Live AI is not configured on this server.", "no_key");
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    let r;
    if (OPENROUTER) {
      r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST", signal: ctl.signal,
        headers: { authorization: "Bearer " + process.env.OPENROUTER_API_KEY, "content-type": "application/json", "HTTP-Referer": "https://nl-groww-sip.vercel.app", "X-Title": "SIP Companion case study" },
        body: JSON.stringify({ models: models || MODELS, max_tokens: maxTokens, temperature, messages: [{ role: "user", content: prompt }] })
      });
    } else {
      r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", signal: ctl.signal,
        headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, temperature, messages: [{ role: "user", content: prompt }] })
      });
    }
    if (!r.ok) {
      const e = err("The AI service returned " + r.status, r.status === 429 ? "rate_limited" : r.status === 402 ? "payment_required" : "upstream_error", r.status);
      try { const b = await r.json(); e.detail = String(b?.error?.message || "").slice(0, 300); e.raw = String(b?.error?.metadata?.raw || "").slice(0, 300); } catch {}
      throw e;
    }
    const j = await r.json();
    if (OPENROUTER) {
      if (j.error) throw err("The AI service returned an error", j.error.code === 429 ? "rate_limited" : "upstream_error", j.error.code);
      lastModel = j.model || null;
      return (j.choices?.[0]?.message?.content || "").toString();
    }
    lastModel = MODEL;
    return (j.content || []).map((c) => c.text || "").join("");
  } catch (e) {
    if (e.name === "AbortError") throw err("The AI took too long to answer.", "timeout");
    throw e;
  } finally { clearTimeout(t); }
}

export function extractJSON(text) {
  if (!text) return null;
  const firstObj = text.indexOf("{"), firstArr = text.indexOf("[");
  const isArr = firstArr >= 0 && (firstObj < 0 || firstArr < firstObj);
  const start = isArr ? firstArr : firstObj;
  const end = isArr ? text.lastIndexOf("]") : text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

const buckets = new Map();
export function rateLimited(req, key, perMinute) {
  const ip = (req.headers.get("x-forwarded-for") || "anon").split(",")[0].trim();
  const k = key + ":" + ip, now = Date.now();
  const b = buckets.get(k) || { n: 0, t: now };
  if (now - b.t > 60000) { b.n = 0; b.t = now; }
  b.n++; buckets.set(k, b);
  if (buckets.size > 5000) buckets.clear();
  return b.n > perMinute;
}

export const PII = /\b[A-Z]{5}\d{4}[A-Z]\b|\b\d{10,18}\b/i;
