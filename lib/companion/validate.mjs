// The answer gate. Every answer, live or demo, passes these deterministic checks before it is shown.
// A model's own confidence is never treated as proof: these checks decide.
import { FACTS, LEX } from "./base.mjs";
import { answerText } from "./answer.mjs";

const NUM = /\d[\d,]*(\.\d+)?/g;
const nums = (t) => (String(t).match(NUM) || []).map((x) => String(parseFloat(x.replace(/,/g, ""))));
// Pressure to pay: instructions to pay or fund the account, as opposed to explaining that paying is one option.
const PAY_PUSH = /\b(tap|click|press|use) (the )?pay now\b[^.]*\b(to|and) (pay|complete|settle)|\b(ensure|make sure|arrange)\b[^.]{0,40}\b(sufficient|enough) (balance|funds|money)\b[^.]{0,30}\b(before|for) (attempting|paying|the payment|payment)|\byou (need|have|must) to pay\b|\bpay (it|the missed instalment) (now|today|soon)\b/i;
// A missed instalment doesn't touch units already bought: block claims that it does.
const LOSS = /\b(your|the|all (your|the)?|existing)\s*(money|investments?|units|savings|corpus)\b[^.]{0,30}\b(is|are|will be|would be|has been|have been|gets?)\s+(lost|gone|forfeited|wiped|deducted|taken back)\b|\b(lose|forfeit)\b[^.]{0,25}\b(what you'?ve invested|your (existing )?(investment|units|money))\b/i;
const words = (t) => String(t).trim().split(/\s+/).filter(Boolean).length;
const INTENTS = ["SENSITIVE", "OUT_OF_SCOPE", "ADVICE", "CHARGES", "PAUSE", "STOP", "CONSEQUENCE", "AFFORD", "LOWER", "CHANGE_DATE", "NEXT_DATE", "WHY", "PAY", "STATUS", "CHAT", "LEARN", "CLARIFY"];

export const CHECKS = [
  ["schema", "Answer has the expected structure, in plain words"],
  ["no_funds", "Names no fund, AMC or stock"],
  ["no_return_claims", "Predicts no returns and claims no loss of money already invested"],
  ["no_advice", "Gives no investment advice"],
  ["no_urgency", "No fear, FOMO, urgency or pressure to pay"],
  ["grounded_numbers", "Every number comes from the SIP data or a source"],
  ["sources_valid", "Cites only real, retrieved sources"],
  ["rules_cited", "Product rules carry their source"],
  ["reason_grounded", "States no failure reason that isn't confirmed"],
  ["uncertainty_disclosed", "Says what is still unknown"],
  ["no_transaction_claims", "Claims no payment or change was made"],
  ["no_sensitive_request", "Asks for no PAN, OTP or password"],
  ["no_pii_echo", "Repeats no personal numbers"],
  ["actions_available", "Offers or claims only actions this SIP allows"],
  ["length", "Short enough to read (≤ 140 words)"]
];

export function validate(a, snap, question, ctx) {
  const retrieved = new Set(ctx.retrieved || []), allowedActs = new Set(ctx.actions || []);
  const ok = (k, pass, d) => ({ k, label: CHECKS.find((c) => c[0] === k)[1], ok: !!pass, d: pass ? "" : d });
  const res = [];
  const arr = (x) => Array.isArray(x) && x.every((y) => typeof y === "string");
  const schema = !!a && typeof a === "object" && INTENTS.includes(a.intent) && arr(a.known) && arr(a.means) && arr(a.todo) && arr(a.uncertain) && arr(a.sources) && arr(a.actions) && (a.known.length + a.means.length + a.todo.length) > 0;
  const t = schema ? answerText(a) : (a && typeof a.message === "string" ? a.message : "");
  const code = t.match(/\b[A-Z][A-Z0-9]*(_[A-Z0-9]+)+\b/) || t.match(/<\/?[a-z][^>]*>|https?:\/\/|www\.|\]\(|\*\*/i);
  res.push(ok("schema", schema && !code, code ? "Code, markup or link shown: " + code[0] : "Not a valid structured answer"));
  const f = t.match(LEX.FUND_CS) || t.match(LEX.FUND_CI); res.push(ok("no_funds", !f, f && "Names " + f[0]));
  const r = t.match(LEX.RETURN_A) || t.match(LEX.RETURN_B) || t.match(LEX.RETURN_C) || t.match(LOSS); res.push(ok("no_return_claims", !r, r && "Return or loss claim: " + r[0]));
  const ad = t.match(LEX.ADVICE); res.push(ok("no_advice", !ad, ad && "Advice: " + ad[0]));
  const u = t.match(LEX.URGENCY) || t.match(PAY_PUSH); res.push(ok("no_urgency", !u, u && "Pressure: " + u[0]));

  const allowed = new Set(["0", "1", "2", "3"]);
  nums(JSON.stringify(snap)).forEach((x) => allowed.add(x)); (JSON.stringify(snap).match(/\d+/g) || []).forEach((x) => allowed.add(String(parseFloat(x))));
  nums(question || "").forEach((x) => allowed.add(x));
  (ctx.extraNums || []).forEach((x) => x != null && allowed.add(String(x)));
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
  const badAct = (schema ? a.actions : []).filter((x) => !allowedActs.has(x));
  // The text must not claim an option the app has ruled out right now (e.g. stopping within 7 days of a debit).
  const un = new Set(ctx.unavailable || []);
  if (un.has("STOP") && /\b(you can|you'?re able to|it'?s possible to|go ahead and)\s+(still\s+)?(stop|cancel)\b|\b(stop|cancel) (it|the sip|this sip|your sip) (now|from the app|anytime|any time|right away)\b/i.test(t) && !/\b(can'?t|cannot|not (be )?(possible|allowed)|isn'?t (possible|allowed)|within 7 days|after the)\b[^.]{0,60}\b(stop|cancel)|\b(stop|cancel)[^.]{0,60}\b(can'?t|cannot|not (be )?(possible|allowed)|within 7 days)/i.test(t)) badAct.push("STOP (claimed in text)");
  if (un.has("PAY_MISSED") && /\bpay now (is|option is) (open|available)\b|\buse pay now\b/i.test(t)) badAct.push("PAY_MISSED (claimed in text)");
  res.push(ok("actions_available", schema && badAct.length === 0, "Not available here: " + badAct.join(", ")));
  const w = words(t); res.push(ok("length", w <= 140, w + " words"));
  return { checks: res, passed: res.every((c) => c.ok) };
}
