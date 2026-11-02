// TEMPORARY latency/quality probe for the Groq key. Removed after the test. Never returns the key.
import { initState } from "@/lib/companion/model.mjs";
import { answerQuestion } from "@/lib/companion/pipeline.mjs";
import { answerText } from "@/lib/companion/answer.mjs";
import { extractJSON } from "@/lib/server";

export const runtime = "nodejs";
export const maxDuration = 120;
const NONCE = "00cfe5a0ce7d7ddd49a16b6c";
const CASES = [
  ["A1", "A", "Why did this instalment fail?", ["insufficient balance"]],
  ["A2", "A", "What does two missed instalments in a row mean?", ["cancel"]],
  ["A3", "A", "Can I pay the missed instalment?", ["Pay Now"]],
  ["A4", "A", "What can I do if I cannot afford the next instalment?", ["skip"]],
  ["A7", "A", "Should I stop investing because markets are down?", ["SEBI"]],
  ["A8", "A", "Which fund gives better returns than this one?", ["SEBI"]],
  ["B1", "B", "Why did this instalment fail?", []],
  ["B4", "B", "Was it because my balance was low?", []],
  ["C1", "C", "What can I do if I cannot afford the next instalment?", ["skip"]],
  ["C5", "C", "paise nahi hai is mahine, kya karu?", ["skip"]],
  ["D2", "D", "What happens if the next one fails too?", []],
  ["E1", "E", "Why does it say pending?", []]
];

let lastErr = null;
function groq(model, timeoutMs, opts) {
  return async (prompt) => {
    const ac = new AbortController(); const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST", signal: ac.signal,
        headers: { authorization: "Bearer " + process.env.GROQ_API_KEY, "content-type": "application/json" },
        body: JSON.stringify(Object.assign({ model, temperature: 0.2, max_tokens: 700, messages: [{ role: "user", content: prompt }] }, opts.json ? { response_format: { type: "json_object" } } : {}, opts.effort ? { reasoning_effort: opts.effort, include_reasoning: false } : {}))
      });
      if (!r.ok) { const b = await r.text().catch(() => ""); lastErr = b.slice(0, 300); const e = new Error("http"); e.code = "http_" + r.status; throw e; }
      const j = await r.json();
      const o = extractJSON(j.choices?.[0]?.message?.content || "");
      if (!o) { const e = new Error("parse"); e.code = "unparseable"; throw e; }
      return o;
    } catch (e) { if (e.name === "AbortError") { const x = new Error("timeout"); x.code = "timeout"; throw x; } throw e; }
    finally { clearTimeout(t); }
  };
}

export async function GET(req) {
  const u = new URL(req.url);
  if (u.searchParams.get("k") !== NONCE) return new Response("not found", { status: 404 });
  if (!process.env.GROQ_API_KEY) return Response.json({ key: false });
  if (u.searchParams.get("list")) {
    const r = await fetch("https://api.groq.com/openai/v1/models", { headers: { authorization: "Bearer " + process.env.GROQ_API_KEY } });
    const j = await r.json().catch(() => ({}));
    return Response.json({ status: r.status, models: (j.data || []).map((m) => m.id) });
  }
  const model = u.searchParams.get("m") || "llama-3.3-70b-versatile";
  const timeoutMs = Number(u.searchParams.get("t") || 5000);
  const opts = { json: u.searchParams.get("json") === "1", effort: u.searchParams.get("e") || null };
  const only = Number(u.searchParams.get("n") || 12);
  const out = [];
  for (const [id, sid, q, must] of CASES.slice(0, only)) {
    const t0 = Date.now();
    const r = await answerQuestion(initState(sid), q, { generate: groq(model, timeoutMs, opts) });
    const text = answerText(r.answer);
    out.push({ id, ms: Date.now() - t0, mode: r.mode, passed: r.passed, attempts: r.attempts, intent: r.answer.intent, mustOk: must.every((m) => new RegExp(m, "i").test(text)), text: text.slice(0, 400) });
  }
  const ms = out.map((x) => x.ms).sort((a, b) => a - b);
  return Response.json({ model, opts, lastErr, timeoutMs, n: out.length, live: out.filter((x) => x.mode === "live").length, p50: ms[Math.floor(ms.length / 2)], p90: ms[Math.floor(ms.length * 0.9)], max: ms[ms.length - 1], out });
}
