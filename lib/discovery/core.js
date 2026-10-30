// Shared logic for the Discovery Engine 2.0: taxonomy, search, scoring, resampling and agreement.
// Used by the pages (client) and by the research agent (server). No network calls here.
import DS from "./dataset.json";

/** @typedef {"PAY"|"STOP"|"EXPECT"|"AMOUNT"|"PAUSE"|"TRUST"|"CONFUSE"|"OUTSIDE"|"KEEP"|"OTHER"} Driver */
/** @typedef {{v:string, phrase:string}} Signal */
/** @typedef {{round:number, codebook:string, human:Driver, ai:Driver, live:Driver|null, agree:boolean, error:string|null, aiPrev:Driver|null}} GoldenEntry */
/** @typedef {{id:string, src:string, date:string, dateApprox:boolean, stars:string|null, url:string, urlKind:"post"|"listing"|"video", text:string,
 *   driver:Driver, d11:Driver, override:{from:Driver,to:Driver,rule:string}|null, stage:string, emotion:string, firstHand:boolean, seg:string|null,
 *   golden:GoldenEntry[], sig:Object<string,Signal>, lapse:boolean}} EvidenceRecord */

export { DS };
/** @type {EvidenceRecord[]} */
export const RECORDS = DS.records;
export const BY_ID = Object.fromEntries(RECORDS.map((r) => [r.id, r]));
export const RANKED = ["PAY", "STOP", "EXPECT", "AMOUNT", "PAUSE", "TRUST", "CONFUSE", "OUTSIDE"];
export const ALL_DRIVERS = [...RANKED, "KEEP", "OTHER"];
export const LAPSE_N = DS.lapse; // 352: the denominator for every story share

export const DRIVER = {
  PAY: "Payment failure", STOP: "Decides to stop", EXPECT: "Returns gap", AMOUNT: "Amount vs cash flow", PAUSE: "Skip or pause",
  TRUST: "Platform trust", CONFUSE: "Confusing screens", OUTSIDE: "Asks outside the app", KEEP: "Kept going (continuers)", OTHER: "Context (not a lapse driver)"
};
export const DRIVER_SHORT = { PAY: "Payment", STOP: "Stop", EXPECT: "Returns gap", AMOUNT: "Amount", PAUSE: "Pause", TRUST: "Trust", CONFUSE: "Confusion", OUTSIDE: "Outside help", KEEP: "Kept going", OTHER: "Context" };
// Codebook definitions as used for the v1.2 labels (codebook v1 definitions plus the v1.1 and v1.2 rules that changed them).
export const DEF = {
  PAY: "How instalments get paid, when something actually broke: a failed or bounced debit, a rejected or stuck mandate, a double debit, bounce charges or auto-cancellation. Set-up questions and hypothetical 'is there a penalty if…' questions are not PAY (v1.2 rule 5).",
  STOP: "The person has stopped, cancelled or redeemed, or states an intent to ('thinking of stopping'). A question such as 'should I stop?' stays with its cause (v1.2 rule 7).",
  EXPECT: "Returns lower or slower than expected, a red or flat portfolio, comparisons with a fixed deposit.",
  AMOUNT: "The SIP amount against cash flow: job loss, irregular income, EMI, expenses, wanting to reduce or increase the amount.",
  PAUSE: "Has skipped or paused instalments, or will; includes a pause that never resumed.",
  TRUST: "Platform trust: allotment delay, missing units, statement mismatch, redemption delay. A KYC or document rejection is TRUST (v1.1 rule 3).",
  CONFUSE: "Confusion inside the app about numbers, screens or statuses. Confusion about a video or a general concept is OTHER (v1.2 rule 8).",
  OUTSIDE: "Seeks reassurance or advice outside the app, only when no problem is described. If a problem is described, the problem is coded (v1.2 rule 6).",
  KEEP: "Reasons someone continued, or a habit that kept them going. Not a lapse driver; excluded from the 352 denominator.",
  OTHER: "Relevant but none of the above: feature wishes, set-up questions, opinions. Not a lapse driver; excluded from the 352 denominator."
};
export const TIE_RULE = "When several drivers apply, the primary label is the one closest to the exit: PAY > STOP > PAUSE > AMOUNT > EXPECT.";
export const COLOR = { PAY: "#C2462B", STOP: "#4B2BA8", EXPECT: "#9A5B00", AMOUNT: "#0F766E", PAUSE: "#1962BE", TRUST: "#8A4B9E", CONFUSE: "#5B6375", OUTSIDE: "#2F7D5B", KEEP: "#0A7A55", OTHER: "#8C93A3" };
export const SRC = { RD: "Reddit", TQ: "TradingQ&A", YT: "YouTube", PS: "Google Play", AS: "App Store" };
export const SRC_ORDER = ["RD", "TQ", "YT", "PS", "AS"];
export const STAGE = { ONBOARD: "Setting up", EARLY: "First 6 months", LATER: "After 6 months", UNKNOWN: "Not stated" };
export const SEG = { SALARIED: "Salaried", IRREGULAR_INCOME: "Irregular income", STUDENT: "Student", FAMILY_MONEY: "Family money", INFLUENCER_LED: "Started via a creator or friend", TIER2_HINT: "Outside a metro" };
export const EMO = { ANXIOUS: "Anxious", DISAPPOINTED: "Disappointed", ANGRY: "Angry", CONFUSED: "Confused", CALM: "Calm", POSITIVE: "Positive" };
export const SIG_FIELDS = { outcome: "Stated SIP outcome", payment: "Payment event", money: "Money context", help: "Help sought", tenure: "Tenure", age: "Age" };
export const W = Object.fromEntries(DS.ranking.map((r) => [r.driver, { exit: r.exit, addr: r.addr }]));
export const WHY_WEIGHT = {
  PAY: { exit: "Three failed instalments in a row cancel a monthly SIP automatically (AMFI uniform process, since 1 Apr 2024).", addr: "Status, reasons, retries and the debit date all live inside the app." },
  STOP: { exit: "Ends the SIP directly.", addr: "Some reasons, such as a goal reached or a fund switch, sit outside the product." },
  EXPECT: { exit: "Often, but not always, leads to stopping.", addr: "The app shapes what is shown in year one, not what markets do." },
  AMOUNT: { exit: "A tight month usually ends in a skip or a stop.", addr: "Amount, date and step-down are product decisions." },
  PAUSE: { exit: "A pause that never restarts is an exit.", addr: "Pause length, return date and reminders are in the app." },
  TRUST: { exit: "Rarely ends a SIP on its own.", addr: "Mostly operations: allotment, registrar and bank timelines." },
  CONFUSE: { exit: "Confusion feeds other exits more than it causes one.", addr: "Labels and explanations can change; the numbers can't." },
  OUTSIDE: { exit: "A signal of doubt rather than an exit.", addr: "The app can explain, but cannot give advice." }
};

/* ---------------- formatting ---------------- */
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function fmtDate(r) { const p = r.date.split("-"); return (r.dateApprox ? "About " : "") + (p[2] && !r.dateApprox ? +p[2] + " " : "") + (p[1] ? MON[+p[1] - 1] + " " : "") + p[0]; }
export const yearOf = (r) => +r.date.slice(0, 4);
export const pct = (a, b, d = 1) => (b ? ((a / b) * 100).toFixed(d) : "0") + "%";
export function validation(r) {
  const g = r.golden[r.golden.length - 1];
  if (g) return { key: "golden", label: `Human-checked, round ${g.round}`, detail: g.agree ? "AI and human agreed" : `AI said ${DRIVER_SHORT[g.ai]}, human said ${DRIVER_SHORT[g.human]}`, agree: g.agree };
  if (r.override) return { key: "override", label: "Label changed in codebook v1.2", detail: r.override.rule };
  return { key: "ai", label: "AI label, not individually reviewed", detail: "" };
}

/* ---------------- search ---------------- */
// Query expansion for SIP language, including common Hinglish phrasing. Shown to the user as "also matched".
export const SYNONYMS = {
  payment: ["payment", "autopay", "auto pay", "mandate", "nach", "ecs", "upi", "debit", "deduct", "instalment", "installment", "bounce"],
  fail: ["fail", "failed", "failure", "bounce", "bounced", "reject", "rejected", "dishonour", "stuck", "not processed"],
  mandate: ["mandate", "autopay", "auto pay", "nach", "enach", "upi"],
  autopay: ["autopay", "auto pay", "mandate", "nach", "upi"],
  stop: ["stop", "stopped", "cancel", "cancelled", "discontinue", "redeem", "exit", "band", "withdraw"],
  cancel: ["cancel", "cancelled", "canceled", "stop", "discontinue", "band"],
  pause: ["pause", "paused", "skip", "skipped", "postpone"],
  skip: ["skip", "skipped", "pause", "paused"],
  returns: ["return", "returns", "loss", "negative", "red", "xirr", "fd", "minus", "profit"],
  loss: ["loss", "negative", "red", "minus", "down"],
  salary: ["salary", "payday", "pay day", "earn", "earning", "income", "job"],
  emi: ["emi", "loan", "debt", "credit card"],
  charge: ["charge", "charged", "penalty", "fee", "gst"],
  trust: ["allot", "allotment", "units", "redeem", "redemption", "missing", "discrepancy", "pending"]
};
const tok = (s) => s.toLowerCase().replace(/[^a-z0-9₹%\s'-]/g, " ").split(/\s+/).filter((w) => w.length > 1);
export function expandQuery(q) {
  const words = tok(q).filter((w) => !STOP.has(w)); const groups = words.map((w) => { const g = new Set([w]); for (const [k, list] of Object.entries(SYNONYMS)) if (w === k || w.startsWith(k)) list.forEach((x) => g.add(x)); return [...g]; });
  return { words, groups, terms: [...new Set(groups.flat())] };
}
const STOP = new Set(["the", "and", "of", "to", "in", "is", "my", "for", "on", "it", "a", "an", "was", "with", "about", "what", "why", "how"]);
/** Every query word (or one of its synonyms) must appear. Exact words weigh 2, synonyms 1. Returns 0 when any word is missing. */
export function matchScore(r, { words, groups }, any = false) {
  if (/^[a-z]\d+$/i.test(words[0] || "") && words.length === 1) return r.id.toLowerCase() === words[0] ? 100 : 0;
  const t = (r.text + " " + DRIVER[r.driver]).toLowerCase(); let s = 0;
  for (let i = 0; i < groups.length; i++) { const hit = groups[i].filter((x) => t.includes(x)); if (!hit.length) { if (any) continue; return 0; } s += hit.includes(words[i]) ? 2 : 1; s += Math.min(hit.length - 1, 2) * 0.1; }
  return s;
}
export function search(records, q, any = false) {
  const qq = q && q.trim() ? expandQuery(q) : null;
  if (!qq || !qq.terms.length) return records.map((r) => ({ r, s: 0 }));
  return records.map((r) => ({ r, s: matchScore(r, qq, any) })).filter((x) => x.s > 0);
}

/* ---------------- filters ---------------- */
export const EMPTY_FILTERS = { q: "", src: "", driver: "", stage: "", year: "", fh: "", val: "", seg: "", sig: "", sort: "relevance" };
export function applyFilters(f) {
  let rows = search(RECORDS, f.q);
  rows = rows.filter(({ r }) => (!f.src || r.src === f.src) && (!f.driver || r.driver === f.driver)
    && (!f.stage || r.stage === f.stage) && (!f.year || (f.year === "old" ? yearOf(r) <= 2022 : yearOf(r) === +f.year))
    && (!f.fh || (f.fh === "yes" ? r.firstHand : !r.firstHand))
    && (!f.val || validation(r).key === f.val || (f.val === "disagree" && r.golden.some((g) => !g.agree)))
    && (!f.seg || r.seg === f.seg)
    && (!f.sig || Object.values(r.sig).some((s) => s.v === f.sig)));
  const byDate = (a, b) => a.r.date.localeCompare(b.r.date);
  if (f.sort === "newest") rows.sort((a, b) => -byDate(a, b));
  else if (f.sort === "oldest") rows.sort(byDate);
  else if (f.sort === "id") rows.sort((a, b) => a.r.id.localeCompare(b.r.id, "en", { numeric: true }));
  else rows.sort((a, b) => b.s - a.s || -byDate(a, b));
  return rows.map((x) => x.r);
}

/* ---------------- scoring ---------------- */
/**
 * Opportunity score = share^a × exit^b × addressability^c × evidence^d. With a = b = c = d = 1 this is the original model.
 * share = stories with the driver ÷ lapse stories × 100; evidence = 0.5 + 0.5 × first-hand share.
 */
export function rankDrivers(records = RECORDS, { a = 1, b = 1, c = 1, d = 1, weights = W } = {}) {
  const lapse = records.filter((r) => r.lapse); const N = lapse.length;
  const rows = RANKED.map((drv) => {
    const its = lapse.filter((r) => r.driver === drv); const n = its.length;
    const share = N ? (n / N) * 100 : 0; const fh = n ? its.filter((r) => r.firstHand).length / n : 0; const ev = 0.5 + 0.5 * fh;
    const w = weights[drv]; const score = n ? Math.pow(share, a) * Math.pow(w.exit, b) * Math.pow(w.addr, c) * Math.pow(ev, d) : 0;
    const sources = new Set(its.map((r) => r.src)).size;
    const early = n ? its.filter((r) => r.stage === "ONBOARD" || r.stage === "EARLY").length : 0;
    return { driver: drv, n, share, fh, ev, exit: w.exit, addr: w.addr, score, sources, early };
  });
  rows.sort((x, y) => y.score - x.score); rows.forEach((x, i) => { x.rank = i + 1; });
  return { rows, N };
}

/* ---------------- resampling (seeded, reproducible in the browser) ---------------- */
export function mulberry32(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function bootstrap(runs = 1000, seed = 20261023) {
  const lapse = RECORDS.filter((r) => r.lapse); const N = lapse.length; const rnd = mulberry32(seed); const wins = {};
  for (let k = 0; k < runs; k++) {
    const s = new Array(N); for (let i = 0; i < N; i++) s[i] = lapse[Math.floor(rnd() * N)];
    const top = rankDrivers(s).rows[0].driver; wins[top] = (wins[top] || 0) + 1;
  }
  return wins;
}
export function weightNudge(runs = 1000, seed = 42, spread = 0.15) {
  const rnd = mulberry32(seed); const wins = {}; const clamp = (x) => Math.min(1, Math.max(0.05, x));
  for (let k = 0; k < runs; k++) {
    const w = Object.fromEntries(RANKED.map((d) => [d, { exit: clamp(W[d].exit + (rnd() * 2 - 1) * spread), addr: clamp(W[d].addr + (rnd() * 2 - 1) * spread) }]));
    const top = rankDrivers(RECORDS, { weights: w }).rows[0].driver; wins[top] = (wins[top] || 0) + 1;
  }
  return wins;
}

/* ---------------- small stats ---------------- */
export function countBy(rows, f) { const o = {}; rows.forEach((r) => { const k = f(r); if (k != null && k !== "") o[k] = (o[k] || 0) + 1; }); return o; }
export function kappa(pairs) {
  const n = pairs.length; if (!n) return null; const cats = [...new Set(pairs.flat())];
  const po = pairs.filter(([x, y]) => x === y).length / n; let pe = 0;
  for (const c of cats) pe += (pairs.filter(([x]) => x === c).length / n) * (pairs.filter(([, y]) => y === c).length / n);
  return pe === 1 ? 1 : (po - pe) / (1 - pe);
}
export const GOLDEN = RECORDS.flatMap((r) => r.golden.map((g) => ({ ...g, id: r.id, src: r.src, text: r.text, current: r.driver, override: r.override })));
export const ERROR_TYPES = ["Wrong topic: not a lapse driver", "Missed relevant evidence", "Several drivers apply: wrong primary", "Outside help vs the problem itself", "Wrong lapse driver"];
