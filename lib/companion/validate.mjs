// The answer gate. Every answer, live or demo, passes these deterministic checks before it is shown.
// A model's own confidence is never treated as proof: these checks decide.
import { FACTS, LEX } from "./base.mjs";
import { answerText } from "./answer.mjs";

const NUM = /\d[\d,]*(\.\d+)?/g;
const nums = (t) => (String(t).match(NUM) || []).map((x) => String(parseFloat(x.replace(/,/g, ""))));
const words = (t) => String(t).trim().split(/\s+/).filter(Boolean).length;
const INTENTS = ["SENSITIVE", "OUT_OF_SCOPE", "ADVICE", "CHARGES", "PAUSE", "STOP", "CONSEQUENCE", "AFFORD", "LOWER", "CHANGE_DATE", "NEXT_DATE", "WHY", "PAY", "STATUS"];

export const CHECKS = [
  ["schema", "Answer has the expected structure"],
  ["no_funds", "Names no fund, AMC or stock"],
  ["no_return_claims", "Predicts or promises no returns"],
  ["no_advice", "Gives no investment advice"],
  ["no_urgency", "No fear, FOMO or urgency"],
  ["grounded_numbers", "Every number comes from the SIP data or a source"],
  ["sources_valid", "Cites only real, retrieved sources"],
  ["rules_cited", "Product rules carry their source"],
  ["reason_grounded", "States no failure reason that isn't confirmed"],
  ["uncertainty_disclosed", "Says what is still unknown"],
  ["no_transaction_claims", "Claims no payment or change was made"],
  ["no_sensitive_request", "Asks for no PAN, OTP or password"],
  ["no_pii_echo", "Repeats no personal numbers"],
  ["actions_available", "Offers only actions this SIP allows"],
  ["length", "Short enough to read (≤ 140 words)"]
];

export function validate(a, snap, question, ctx) {
  const retrieved = new Set(ctx.retrieved || []), allowedActs = new Set(ctx.actions || []);
  const ok = (k, pass, d) => ({ k, label: CHECKS.find((c) => c[0] === k)[1], ok: !!pass, d: pass ? "" : d });
  const res = [];
  const arr = (x) => Array.isArray(x) && x.every((y) => typeof y === "string");
  const schema = !!a && typeof a === "object" && INTENTS.includes(a.intent) && arr(a.known) && arr(a.means) && arr(a.todo) && arr(a.uncertain) && arr(a.sources) && arr(a.actions) && (a.known.length + a.means.length + a.todo.length) > 0;
  res.push(ok("schema", schema, "Not a valid structured answer"));
  const t = schema ? answerText(a) : (a && typeof a.message === "string" ? a.message : "");
  const f = t.match(LEX.FUND_CS) || t.match(LEX.FUND_CI); res.push(ok("no_funds", !f, f && "Names " + f[0]));
  const r = t.match(LEX.RETURN_A) || t.match(LEX.RETURN_B) || t.match(LEX.RETURN_C); res.push(ok("no_return_claims", !r, r && "Return claim: " + r[0]));
  const ad = t.match(LEX.ADVICE); res.push(ok("no_advice", !ad, ad && "Advice: " + ad[0]));
  const u = t.match(LEX.URGENCY); res.push(ok("no_urgency", !u, u && "Urgency: " + u[0]));

  const allowed = new Set(["0", "1", "2", "3"]);
  nums(JSON.stringify(snap)).forEach((x) => allowed.add(x)); (JSON.stringify(snap).match(/\d+/g) || []).forEach((x) => allowed.add(String(parseFloat(x))));
  nums(question || "").forEach((x) => allowed.add(x));
  (schema ? a.sources : []).forEach((id) => FACTS[id] && nums(FACTS[id].text).forEach((x) => allowed.add(x)));
  const bad = nums(t).filter((x) => !allowed.has(x)); res.push(ok("grounded_numbers", bad.length === 0, "Not in the data: " + bad.join(", ")));

  const badSrc = (schema ? a.sources : []).filter((id) => !FACTS[id] || !retrieved.has(id)); res.push(ok("sources_valid", schema && badSrc.length === 0, "Unknown or unretrieved source: " + badSrc.join(", ")));
  const need = [];
  if (/\bcancel(l?ed)?\b[^.]*\b(3|three)\b[^.]*\bin a row\b|\b(3|three)\b[^.]*\bin a row\b[^.]*\bcancel/i.test(t)) need.push("CANCEL_RULE");
  if (/\bpay now\b/i.test(t) && /\b(working days?|open until|is open|shows)\b/i.test(t)) need.push("PAY_NOW");
  if (/\b7 days\b/i.test(t)) need.push("CANCEL_7D");
  if (/\b(isn'?t|not) counted as a failure\b/i.test(t)) need.push("SKIP_NOT_FAIL");
  if (/\bcan'?t be undone\b/i.test(t)) need.push("CANCEL_FINAL");
  const missing = need.filter((id) => !(schema && a.sources.includes(id))); res.push(ok("rules_cited", missing.length === 0, "Uncited rule: " + missing.join(", ")));

  const reason = snap && snap.last_attempt ? snap.last_attempt.reason : null;
  const confirmed = reason === "confirmed";
  const cause = !confirmed && t.match(LEX.CAUSE); res.push(ok("reason_grounded", !cause, cause && "Unconfirmed cause stated: " + cause[0]));
  const needU = (reason === "unknown" || reason === "pending") && schema && ["WHY", "STATUS", "PAY"].includes(a.intent);
  res.push(ok("uncertainty_disclosed", !needU || (a.uncertain.length > 0 && LEX.UNCERTAIN.test(a.uncertain.join(" "))), "Doesn't say what is unknown"));
  const tx = t.match(LEX.TX_CLAIM); res.push(ok("no_transaction_claims", !tx, tx && "Claims an action: " + tx[0]));
  const sens = t.match(LEX.ASKS_SENSITIVE); res.push(ok("no_sensitive_request", !sens, sens && "Asks for: " + sens[0]));
  const p = t.match(LEX.PII); res.push(ok("no_pii_echo", !p, "Repeats a personal number"));
  const badAct = (schema ? a.actions : []).filter((x) => !allowedActs.has(x)); res.push(ok("actions_available", schema && badAct.length === 0, "Not available here: " + badAct.join(", ")));
  const w = words(t); res.push(ok("length", w <= 140, w + " words"));
  return { checks: res, passed: res.every((c) => c.ok) };
}
