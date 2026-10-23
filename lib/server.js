// Server-only helpers: the Claude call, JSON extraction, and a simple per-IP rate limit.
const API = "https://api.anthropic.com/v1/messages";

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";

export function hasKey() { return !!process.env.ANTHROPIC_API_KEY; }

export async function callClaude(prompt, { maxTokens = 500, temperature = 0.2, timeoutMs = 25000 } = {}) {
  if (!hasKey()) { const e = new Error("Live AI is not configured on this server."); e.code = "no_key"; throw e; }
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(API, {
      method: "POST",
      signal: ctl.signal,
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, temperature, messages: [{ role: "user", content: prompt }] })
    });
    if (!r.ok) { const e = new Error("The AI service returned " + r.status); e.code = r.status === 429 ? "rate_limited" : "upstream_error"; e.status = r.status; throw e; }
    const j = await r.json();
    return (j.content || []).map((c) => c.text || "").join("");
  } catch (e) {
    if (e.name === "AbortError") { const x = new Error("The AI took too long to answer."); x.code = "timeout"; throw x; }
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
