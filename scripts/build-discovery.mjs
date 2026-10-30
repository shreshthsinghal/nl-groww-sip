// Builds lib/discovery/dataset.json from the raw research sources. Nothing here edits the sources.
//   lib/research.json                 450 coded stories, codebook v1.2 labels (snapshot 26 Oct 2026)
//   data/discovery/v12_overrides.tsv  the 60 documented v1.1 -> v1.2 label changes, one rule each
//   data/discovery/golden_round*.json the three hand-labelled golden rounds (20 items each)
// Run: node scripts/build-discovery.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const rd = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const R = JSON.parse(rd("lib/research.json"));
const OVR = rd("data/discovery/v12_overrides.tsv").trim().split("\n").slice(1).map((l) => { const [id, from, to, rule] = l.split("\t"); return { id, from, to, rule }; });
const G = [1, 2, 3].map((n) => JSON.parse(rd(`data/discovery/golden_round${n}.json`)));

const RANKED = ["PAY", "STOP", "EXPECT", "AMOUNT", "PAUSE", "TRUST", "CONFUSE", "OUTSIDE"];
const SRC_NAME = { RD: "Reddit", TQ: "TradingQ&A", YT: "YouTube", PS: "Google Play Store", AS: "Apple App Store" };

/* ---------- agreement statistics ---------- */
function kappa(pairs) {
  const n = pairs.length; if (!n) return null;
  const cats = [...new Set(pairs.flat())];
  const po = pairs.filter(([a, b]) => a === b).length / n;
  let pe = 0; for (const c of cats) { const pa = pairs.filter(([a]) => a === c).length / n; const pb = pairs.filter(([, b]) => b === c).length / n; pe += pa * pb; }
  return pe === 1 ? 1 : (po - pe) / (1 - pe);
}
const SEQ = new Set(["PAY", "STOP", "PAUSE", "AMOUNT", "EXPECT"]);
function errorCategory(human, ai) {
  if (human === ai) return null;
  if (human === "OTHER") return "Wrong topic: not a lapse driver";
  if (ai === "OTHER") return "Missed relevant evidence";
  if (human === "OUTSIDE" || ai === "OUTSIDE") return "Outside help vs the problem itself";
  if ((human === "STOP" || human === "PAUSE" || ai === "STOP" || ai === "PAUSE") && SEQ.has(human) && SEQ.has(ai)) return "Several drivers apply: wrong primary";
  return "Wrong lapse driver";
}

/* ---------- rule-based signal extraction: explicit phrases only, the matched words are kept ---------- */
const RULES = {
  outcome: [
    ["Stopped or cancelled", /(\bi (?:have |had |already )?(?:stopped|cancel+ed|discontinued|redeemed|quit|exited)\b|\b(?:have|already) stopped\b|(?<!never )\bstopped (?:my|investing|sip|the sip|due|it|when|and|last|in)\b|\bcancel+ed (?:my|all|it|the sip|existing)\b|\bdiscontinued all\b|\bredeemed my\b|\bclosed that sip\b|\bband kar (?:diya|di)\b|\bsips were stopped\b|\bexited all\b|\bbooke? my all\b)/i],
    ["Considering stopping or leaving", /(thinking (?:of|to) (?:stop|discontinu)|planning to (?:stop|discontinu|sell|redeem)|want(?:ed)? to (?:stop|discontinue|cancel)|should i (?:stop|exit|redeem|withdraw|cancel|continue)|continue or (?:withdraw|stop)|band karne|band kar du|cutt? kre|withdrawal kr|wondering if i should|will not use groww anymore|move away from your platform|decided to close)/i],
    ["Paused or skipped", /\b(paused|pause|skipped|skip(?:ping)?)\b/i],
    ["Reduced or wants to reduce", /(reduced|reduce|lower the|brought it down|from 5k to 3k|to a lower amount)/i],
    ["Continued", /(continued|never stopped|haven'?t skipped|stuck to it|didn'?t stop|will not withdraw|sip continue|still continuing|keeping my sip|won'?t be pausing|will run regardless|kabhi band nhi)/i]
  ],
  payment: [
    ["Payment failed or rejected", /((?:fail(?:ed|s|ure)?|bounc\w*|reject\w*|dishonou?r\w*|not processed|stuck|could not be deducted)[^.]{0,60}(?:sip|autopay|auto pay|mandate|nach|ecs|upi|payment|instal\w*|debit|transaction))|((?:sip|autopay|auto pay|mandate|nach|ecs|upi|payment|instal\w*|debit|transaction)[^.]{0,60}(?:fail(?:ed|s|ure)?|bounc\w*|reject\w*|dishonou?r\w*|not processed|stuck|could not be deducted))/i],
    ["Bounce charge mentioned", /(\bbounce charge|\bcharge[sd]?\b|\bcharging\b|\bpenalty\b|\bfees?\b|return charges)/i],
    ["Mandate or autopay mentioned", /(mandate|autopay|auto pay|auto-pay|nach|enach|upi)/i]
  ],
  money: [
    ["Job loss", /(lost my job|layoff|laid off|lose my job)/i],
    ["EMI, loan or debt", /(\bemi\b|loan|credit card|cc debt|\bdebt\b|cc bill)/i],
    ["Medical or family need", /(medical|hospital|operated|surgery|family reasons|mom'?s|dad needed)/i],
    ["Income mentioned", /(salary|pay ?day|i earn|earning|stipend|pension|pay hike|income)/i]
  ],
  help: [
    ["Asks others what to do", /(should i|what should|what to do|\bsuggest(?: me)?\b|\badvice\b|kya kar|batao|please tell|kya karu|kya kre|samajh me nhi)/i],
    ["Mentions an outside influence", /(friend|youtube|video|professor|my ca\b|ca called|creator|\bsir\b|whatsapp|finfluencer)/i]
  ],
  tenure: [["Says they are new", /(first (?:time|sip|instal\w*)|1st time|beginner|new user|just started|started (?:my )?sip last month|month back|weeks ago|new for grow)/i]],
  age: [["States an age", /(\b\d{2} ?(?:years old|yrs old)\b|\bi'?m \d{2}\b|\bi am \d{2}\b|\b\d{2} years\b(?= ?\.\.\. ?starting))/i]]
};
function extract(text) {
  const out = {};
  for (const [field, rules] of Object.entries(RULES)) {
    for (const [label, re] of rules) { const m = text.match(re); if (m) { out[field] = { v: label, phrase: m[0].trim() }; break; } }
  }
  return out;
}

/* ---------- records ---------- */
const ovrById = Object.fromEntries(OVR.map((o) => [o.id, o]));
const golden = {};
G.forEach((g, k) => {
  const round = k + 1;
  for (const [id, human] of Object.entries(g.human)) {
    const ai = g.engine[id];
    (golden[id] = golden[id] || []).push({ round, codebook: g.codebook, human, ai, live: g.live ? g.live[id] : null, agree: human === ai, error: errorCategory(human, ai), aiPrev: k === 1 ? g.engine_v1_0[id] : null });
  }
});
function urlKind(u) {
  if (/apps\.apple\.com|play\.google\.com/.test(u)) return "listing";
  if (/youtube\.com|youtu\.be/.test(u)) return "video";
  return "post";
}
const records = R.items.map((i) => {
  const o = ovrById[i.id];
  const d11 = o ? o.from : i.driver;
  if (o && o.to !== i.driver) throw new Error(`Override ${i.id} says ${o.to} but snapshot has ${i.driver}`);
  return {
    id: i.id, src: i.src, date: i.date.replace("~", ""), dateApprox: i.date.startsWith("~"), stars: i.stars || null,
    url: i.url, urlKind: urlKind(i.url), text: i.text,
    driver: i.driver, d11, override: o ? { from: o.from, to: o.to, rule: o.rule } : null,
    stage: i.stage, emotion: i.emotion, firstHand: i.evidence === "STRONG", seg: i.seg || null,
    golden: golden[i.id] || [], sig: extract(i.text), lapse: RANKED.includes(i.driver)
  };
});
const missingGolden = Object.keys(golden).filter((id) => !records.find((r) => r.id === id));
if (missingGolden.length) throw new Error("Golden ids not in snapshot: " + missingGolden.join(","));

/* ---------- golden summaries ---------- */
const rounds = G.map((g, k) => {
  const ids = Object.keys(g.human);
  const pairs = ids.map((id) => [g.human[id], g.engine[id]]);
  const live = g.live ? ids.map((id) => [g.human[id], g.live[id]]) : null;
  return { round: k + 1, codebook: g.codebook, n: ids.length, agree: pairs.filter(([a, b]) => a === b).length, kappa: +kappa(pairs).toFixed(3), liveAgree: live ? live.filter(([a, b]) => a === b).length : null, liveKappa: live ? +kappa(live).toFixed(3) : null, lock: g.engine_lock_sha256 || null, recorded: g.recorded || null };
});
// per-category precision / recall, round 3 only (codebook v1.2)
const g3 = G[2]; const per = {};
for (const c of [...new Set([...Object.values(g3.human), ...Object.values(g3.engine)])]) {
  const ids = Object.keys(g3.human);
  const tp = ids.filter((i) => g3.human[i] === c && g3.engine[i] === c).length;
  const predicted = ids.filter((i) => g3.engine[i] === c).length; const actual = ids.filter((i) => g3.human[i] === c).length;
  per[c] = { tp, predicted, actual, precision: predicted ? +(tp / predicted).toFixed(2) : null, recall: actual ? +(tp / actual).toFixed(2) : null };
}

/* ---------- data-quality audit ---------- */
const textCount = {}; records.forEach((r) => { const k = r.text.toLowerCase().replace(/\s+/g, " ").trim(); textCount[k] = (textCount[k] || 0) + 1; });
const idCount = {}; records.forEach((r) => { idCount[r.id] = (idCount[r.id] || 0) + 1; });
const idPrefix = { A: "AS", P: "PS", R: "RD", T: "TQ", Y: "YT" };
const audit = [
  { check: "Duplicate evidence IDs", result: Object.values(idCount).filter((c) => c > 1).length, of: records.length, note: "Each record has a stable ID: source letter + position in that source's candidate list." },
  { check: "Duplicate excerpt text (case- and space-insensitive)", result: Object.values(textCount).filter((c) => c > 1).length, of: records.length, note: "Cross-platform duplicates of the same story cannot be detected from excerpts alone." },
  { check: "Empty or malformed excerpts (< 10 characters)", result: records.filter((r) => r.text.trim().length < 10).length, of: records.length, note: "Excerpts are trimmed by the coder; '...' marks a cut." },
  { check: "ID prefix disagrees with source", result: records.filter((r) => idPrefix[r.id[0]] !== r.src).length, of: records.length, note: "" },
  { check: "Missing source URL", result: records.filter((r) => !r.url).length, of: records.length, note: "" },
  { check: "URL points to the app listing, not the review", result: records.filter((r) => r.urlKind === "listing").length, of: records.length, note: "App and Play Store review-level links were not kept, so these reviews cannot be opened individually." },
  { check: "URL points to the video, not the comment", result: records.filter((r) => r.urlKind === "video").length, of: records.length, note: "YouTube comment-level links were not kept." },
  { check: "Approximate date (relative YouTube date)", result: records.filter((r) => r.dateApprox).length, of: records.length, note: "Shown as 'about' a month; never used as an exact date." },
  { check: "Labels changed between codebook v1.1 and v1.2", result: OVR.length, of: records.length, note: "Every change has a written rule; the v1.1 label is kept on the record." },
  { check: "Rejected (filtered-out) records retained", result: 0, of: 2518 - 450, note: "Only the 450 coded stories were kept. Rejected and uncoded records cannot be inspected." }
];
// share and score consistency check against the stored ranking
const lapse = records.filter((r) => r.lapse); const NL = lapse.length;
const consistency = R.ranking.map((x) => {
  const its = lapse.filter((r) => r.driver === x.driver); const fh = its.filter((r) => r.firstHand).length / its.length;
  const share = its.length / NL * 100; const score = share * x.exit * x.addr * (0.5 + 0.5 * fh);
  return { driver: x.driver, stored: x.score, recomputed: +score.toFixed(2), n: its.length, storedN: x.n, ok: its.length === x.n && Math.abs(+score.toFixed(1) - x.score) < 0.051 };
});
audit.push({ check: "Stored scores that do not match a recomputation from the records", result: consistency.filter((c) => !c.ok).length, of: 8, note: "Shares use the 352 lapse stories as the denominator." });

/* ---------- id-range observation for the 450 selection ---------- */
const idRange = Object.fromEntries(Object.entries(idPrefix).map(([p, s]) => { const nums = records.filter((r) => r.id[0] === p).map((r) => +r.id.slice(1)); return [s, { coded: nums.length, maxIndex: Math.max(...nums) }]; }));

const out = {
  built: new Date().toISOString().slice(0, 10),
  snapshot: "26 Oct 2026 (codebook v1.2)",
  collected: { RD: 11802, TQ: 3445, YT: 1610, PS: 1160, AS: 988, total: 19005, window: "October 2026" },
  passed: 2518, coded: records.length, lapse: NL, continuers: records.filter((r) => r.driver === "KEEP").length, context: records.filter((r) => r.driver === "OTHER").length,
  stability: { bootstrap: { kept: 945, of: 1000, seed: 20261023, unit: "lapse story (352), resampled with replacement" }, nudge: { kept: 937, of: 1000, seed: 42, unit: "each driver's two analyst weights, moved by up to ±0.15" } },
  ranking: R.ranking, consistency, findings: R.findings, rounds, perCategoryR3: per, overrides: OVR, audit, idRange,
  reconciliation: { disagreements: 29, engineRight: 16, humanRight: 7, both: 6, rounds: "1 and 2" },
  records
};
fs.mkdirSync(path.join(ROOT, "lib/discovery"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "lib/discovery/dataset.json"), JSON.stringify(out));
console.log("records", records.length, "lapse", NL, "rounds", rounds.map((r) => `${r.round}:${r.agree}/${r.n} k=${r.kappa}`).join(" "), "consistency ok", consistency.every((c) => c.ok));
console.log("sig coverage", Object.keys(RULES).map((f) => f + "=" + records.filter((r) => r.sig[f]).length).join(" "));
console.log("audit", audit.map((a) => a.check.slice(0, 30) + ":" + a.result).join(" | "));
console.log("idRange", JSON.stringify(idRange));
