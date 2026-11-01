// Server-only helpers: the model call, JSON extraction, and a simple per-IP rate limit.
// Provider order: Google Gemini API (GEMINI_API_KEY, free tier) > OpenRouter (OPENROUTER_API_KEY) > Anthropic (ANTHROPIC_API_KEY).
// Keys live only in Vercel environment variables; nothing here is sent to the browser.
const GEMINI = !!process.env.GEMINI_API_KEY;
const OPENROUTER = !GEMINI && !!process.env.OPENROUTER_API_KEY;
const ANTHROPIC = !GEMINI && !OPENROUTER && !!process.env.ANTHROPIC_API_KEY;

export const PROVIDER = GEMINI ? "gemini" : OPENROUTER ? "openrouter" : ANTHROPIC ? "anthropic" : null;
const list = (v) => v.split(",").map((m) => m.trim()).filter(Boolean).slice(0, 3);
// Models are tried in order; the next one is used only if the previous is busy or unavailable.
export const MODELS = GEMINI
  ? list(process.env.GEMINI_MODELS || process.env.GEMINI_MODEL || "gemini-flash-lite-latest,gemini-flash-latest")
  : OPENROUTER
    ? list(process.env.OPENROUTER_MODELS || process.env.OPENROUTER_MODEL || "google/gemma-4-31b-it:free,google/gemma-4-26b-a4b-it:free")
    : [process.env.ANTHROPIC_MODEL || "claude-haiku-5-5"];
export const MODEL = MODELS[0];
export let lastModel = null; // the model that actually answered the most recent call

export function hasKey() { return !!PROVIDER; }

// The free quota is shared by both sites, so the
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
    if (GEMINI) {
      const tried = [];
      for (const m of (models || MODELS)) {
        const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(m) + ":generateContent", {
          method: "POST", signal: ctl.signal,
          headers: { "x-goog-api-key": process.env.GEMINI_API_KEY, "content-type": "application/json" },
          // Generous output budget: some Gemini models spend tokens thinking before they answer.
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature, maxOutputTokens: Math.max(2048, maxTokens * 4) } })
        });
        if (res.ok) {
          const j = await res.json();
          const text = (j.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || "").join("");
          if (text) { lastModel = m; return text; }
          tried.push(m + ": empty (" + (j.candidates?.[0]?.finishReason || j.promptFeedback?.blockReason || "no text") + ")");
          continue;
        }
        let msg = ""; try { msg = String((await res.json())?.error?.message || "").slice(0, 200); } catch {}
        tried.push(m + ": " + res.status + " " + msg);
        if (![429, 500, 503, 404].includes(res.status)) { const e = err("The AI service returned " + res.status, "upstream_error", res.status); e.detail = tried.join(" | "); throw e; }
      }
      const e = err("No model was available", "rate_limited", 429); e.detail = tried.join(" | "); throw e;
    }
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

// Diagnostic: model names the Gemini key can use for text generation (never returns the key).
export async function listGeminiModels() {
  if (!GEMINI) return null;
  const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": process.env.GEMINI_API_KEY } });
  if (!r.ok) return { error: r.status };
  const j = await r.json();
  return (j.models || []).filter((m) => (m.supportedGenerationMethods || []).includes("generateContent")).map((m) => m.name.replace(/^models\//, ""));
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
