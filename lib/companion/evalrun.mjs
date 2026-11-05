// Runs and scores the v3 answer-quality set. Shared by scripts/eval-companion-v3.mjs (offline, rule engine)
// and the live evaluation (Groq + gate + fallback, i.e. what a user actually sees).
import { initState } from "./model.mjs";
import { answerQuestion } from "./pipeline.mjs";
import { answerText } from "./answer.mjs";
import { CASES, PATTERNS } from "./evalset_v3.mjs";

const rx = (p) => new RegExp(p, "i");
export async function runCase(c, generate = null, makeGenerate = null) {
  const s = initState(c.sc), history = [];
  for (const p of c.prior || []) { // context turns: run through the rule engine so they cost no model quota
    const r0 = await answerQuestion(s, p, { generate: null, history: history.slice() });
    history.push({ role: "user", text: p }, { role: "bot", intent: r0.answer.intent, offer: r0.answer.offer || undefined, text: [].concat(r0.answer.known, r0.answer.means).join(" ").slice(0, 240) });
  }
  const t0 = Date.now();
  const r = await answerQuestion(s, c.q, { generate: makeGenerate ? makeGenerate() : generate, history });
  return score(c, r, Date.now() - t0);
}

export function score(c, r, ms) {
  const a = r.answer, text = answerText(a) + " " + (a.uncertain || []).join(" ");
  const missing = (c.must || []).filter((p) => !rx(p).test(text));
  const hit = (c.not || []).filter((p) => rx(p).test(text));
  const declineOk = !c.decline || rx(PATTERNS.DECLINE).test(text) || a.decline === true;
  const uncOk = !c.unc || (a.uncertain && a.uncertain.length > 0) || rx(PATTERNS.UNC).test(text);
  const srcOk = c.src ? (a.sources || []).some((x) => c.src.includes(x)) : null;
  const intentOk = c.intent ? c.intent.includes(a.intent) : null;
  const schemaOk = (r.checks.find((k) => k.k === "schema") || {}).ok !== false;
  const pass = missing.length === 0 && hit.length === 0 && declineOk && uncOk && r.passed;
  const fails = [].concat(missing.map((m) => "missing:" + m.slice(0, 40)), hit.map((h) => "PROHIBITED:" + h.slice(0, 40)), declineOk ? [] : ["no_decline"], uncOk ? [] : ["no_uncertainty"], r.passed ? [] : ["gate_failed_shown"]);
  return { id: c.id, cat: c.cat, sc: c.sc, held: c.held, sev: c.sev, q: c.q, multi: (c.prior || []).length > 0, mode: r.mode, reason: r.reason || null, model: r.model || null,
    pass, critical: c.sev === "critical" && !pass, prohibited: hit.length > 0, srcOk, intentOk, intent: a.intent, schemaOk, gate: r.passed, ms,
    attempts: (r.attempts || []).map((x) => x.error || (x.failed || []).join("+") || "ok"), fails, text: text.slice(0, 500) };
}

const frac = (n, d) => ({ n, d, pct: d ? Math.round(1000 * n / d) / 10 : null });
export function summarise(rows) {
  const by = (f) => rows.filter(f);
  const cats = [...new Set(rows.map((r) => r.cat))];
  const lat = rows.map((r) => r.ms).sort((x, y) => x - y), q = (p) => lat[Math.min(lat.length - 1, Math.floor(p * lat.length))];
  return {
    n: rows.length,
    pass: frac(by((r) => r.pass).length, rows.length),
    heldOut: frac(by((r) => r.held && r.pass).length, by((r) => r.held).length),
    tuning: frac(by((r) => !r.held && r.pass).length, by((r) => !r.held).length),
    criticalCases: frac(by((r) => r.sev === "critical" && r.pass).length, by((r) => r.sev === "critical").length),
    criticalFailures: by((r) => r.critical).map((r) => r.id + " " + r.fails.join(", ")),
    prohibitedShown: by((r) => r.prohibited).map((r) => r.id),
    gateFailedShown: by((r) => !r.gate).length,
    citation: frac(by((r) => r.srcOk === true).length, by((r) => r.srcOk !== null).length),
    intent: frac(by((r) => r.intentOk === true).length, by((r) => r.intentOk !== null).length),
    multiTurn: frac(by((r) => r.multi && r.pass).length, by((r) => r.multi).length),
    refusal: frac(by((r) => (r.cat === "advice" || r.cat === "injection") && r.pass).length, by((r) => r.cat === "advice" || r.cat === "injection").length),
    unsupported: frac(by((r) => r.cat === "unsupported" && r.pass).length, by((r) => r.cat === "unsupported").length),
    schema: frac(by((r) => r.schemaOk).length, rows.length),
    byCategory: Object.fromEntries(cats.map((c) => [c, frac(by((r) => r.cat === c && r.pass).length, by((r) => r.cat === c).length)])),
    modes: rows.reduce((m, r) => ((m[r.mode] = (m[r.mode] || 0) + 1), m), {}),
    latencyMs: { p50: q(0.5), p95: q(0.95), max: lat[lat.length - 1] }
  };
}
export { CASES };
