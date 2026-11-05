// Offline tests for the Discovery Engine (no network). Run: node --import ./scripts/lib/register.mjs --no-warnings scripts/eval-engine.mjs
// 1. Feature flag: with DISCOVERY_LIVE_AI_ENABLED unset/false on SITE=engine, no model client is invoked (fetch is trapped).
// 2. Provider contract with a MOCKED model (not live AI): valid synthesis shown; invented numbers/IDs and unsafe text rejected.
// 3. Data integrity: every reported count, share and score recomputes from dataset.json; Investor Check constants match.
// 4. Evidence Research Assistant (deterministic mode): 26 development + 10 locked held-out questions.
import { writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
process.env.SITE = "engine"; delete process.env.DISCOVERY_LIVE_AI_ENABLED; process.env.GROQ_API_KEY = "test-not-a-real-key";
let fetchCalls = 0; globalThis.fetch = async () => { fetchCalls++; throw new Error("network blocked in tests"); };

const { externalModelsBlocked, callClaude, liveFor } = await import("../lib/server.js");
const { groqConfigured, groqGenerate } = await import("../lib/companion/groq.mjs");
const live = await import("../lib/discovery/live.js");
const { answerWithContext, citedIds, validateCitations } = await import("../lib/discovery/agent.js");
const core = await import("../lib/discovery/core.js");
const pat = await import("../lib/patterns.js");
const { DEV } = await import("../lib/discovery/eval/dev.mjs");
const { HOLDOUT } = await import("../lib/discovery/eval/holdout.mjs");
const DS = core.DS, R = core.RECORDS;
const T = []; const t = (group, name, ok, d = "") => T.push({ group, name, ok: !!ok, d });

/* 1. feature flag */
t("flag", "externalModelsBlocked() on SITE=engine", externalModelsBlocked());
t("flag", "liveFor('engine') is false", !liveFor("engine"));
t("flag", "groqConfigured() is false despite a key", !groqConfigured());
let code = null; try { await callClaude("x"); } catch (e) { code = e.code; } t("flag", "callClaude refuses with live_disabled", code === "live_disabled", code);
const a0 = answerWithContext("Why does payment failure rank first?", null);
const s0 = await live.synthesise(a0, "Why does payment failure rank first?"); t("flag", "synthesise() returns deterministic without calling a model", s0.mode === "deterministic", s0.mode);
let gcode = null; try { await groqGenerate(Date.now() + 1000)("p"); } catch (e) { gcode = e.code; } t("flag", "groqGenerate refuses with live_disabled", gcode === "live_disabled", gcode);
process.env.DISCOVERY_LIVE_AI_ENABLED = "TRUE"; t("flag", "only the exact value 'true' enables (TRUE does not)", externalModelsBlocked()); delete process.env.DISCOVERY_LIVE_AI_ENABLED;
t("flag", "zero network requests made", fetchCalls === 0, "fetch calls: " + fetchCalls);

/* 2. provider contract, mocked (no network) */
const mk = (o) => async () => o;
const okOut = await live.synthesise(a0, "q", { generate: mk({ answer: `Payment failure scores 13.3 from 52 of 352 stories.`, challenges: "", cannot: "It cannot show retention impact." }) });
t("contract", "mock: grounded synthesis accepted", okOut.mode === "live", okOut.why);
const badNum = await live.synthesise(a0, "q", { generate: mk({ answer: "Payment failure affects 37% of investors.", cannot: "" }) });
t("contract", "mock: invented number rejected", badNum.mode === "fallback" && /unsupported_number/.test(badNum.why), badNum.why);
const badId = await live.synthesise(a0, "q", { generate: mk({ answer: "See record R999 for 52 stories.", cannot: "" }) });
t("contract", "mock: invented record ID rejected", badId.mode === "fallback" && /unknown_record/.test(badId.why), badId.why);
const unsafe = await live.synthesise(a0, "q", { generate: mk({ answer: "You should invest more; returns are guaranteed.", cannot: "" }) });
t("contract", "mock: unsafe advice rejected", unsafe.mode === "fallback", unsafe.why);
const err = await live.synthesise(a0, "q", { generate: async () => { const e = new Error("429"); e.code = "rate_limited"; throw e; } });
t("contract", "mock: 429 falls back", err.mode === "fallback" && err.why === "rate_limited", err.why);
t("contract", "still zero network requests", fetchCalls === 0, "fetch calls: " + fetchCalls);

/* 3. data integrity */
const cnt = (f) => R.filter(f).length;
t("data", "collected = 19,005 and source sum", DS.collected.total === 19005 && ["RD", "TQ", "YT", "PS", "AS"].reduce((s, k) => s + DS.collected[k], 0) === 19005);
t("data", "Reddit share of collected = 62%", Math.round(100 * DS.collected.RD / DS.collected.total) === 62);
t("data", "coded records = 450", R.length === 450 && DS.coded === 450);
t("data", "first-hand = 409", cnt((r) => r.firstHand) === 409, cnt((r) => r.firstHand));
t("data", "lapse 352 / continuers 50 / context 48", cnt((r) => r.lapse) === 352 && cnt((r) => r.driver === "KEEP") === 50 && cnt((r) => r.driver === "OTHER") === 48);
const exp = { TRUST: 64, EXPECT: 58, STOP: 57, PAY: 52, CONFUSE: 40, AMOUNT: 38, PAUSE: 33, OUTSIDE: 10 };
t("data", "8 driver counts match and sum to 352 (mutually exclusive)", Object.entries(exp).every(([k, v]) => cnt((r) => r.lapse && r.driver === k) === v) && Object.values(exp).reduce((a, b) => a + b) === 352);
const rows = core.rankDrivers().rows, scoreExp = { PAY: 13.3, STOP: 9.7, EXPECT: 8.1, AMOUNT: 7.8, PAUSE: 7.5, TRUST: 2.6, CONFUSE: 2.2, OUTSIDE: 0.4 };
t("data", "8 opportunity scores recompute to the published values", rows.every((r) => Math.abs(r.score - scoreExp[r.driver]) < 0.05), rows.map((r) => r.driver + " " + r.score.toFixed(2)).join(", "));
t("data", "kappa 0.15 → 0.29 → 0.50 and round-3 raw 11/20", DS.rounds.map((r) => r.kappa.toFixed(2)).join() === "0.15,0.29,0.50" && DS.rounds[2].agree === 11 && DS.rounds[2].n === 20);
t("data", "60 records human-checked", cnt((r) => r.golden && r.golden.length) === 60);
t("data", "Investor Check TOTAL = 352 lapse records", pat.TOTAL === 352 && pat.FIRST_HAND === 409 && pat.CODED === 450);
t("data", "Investor Check situation counts match the dataset", Object.entries(pat.COUNTS).every(([k, v]) => cnt((r) => r.lapse && r.driver === k) === v));
t("data", "no rejected records are retained (audit row)", DS.audit.some((a) => /Rejected/.test(a.check) && a.result === 0));

/* 4. assistant evaluation (deterministic mode) */
const ADV = /\b(you should (invest|buy|sell|switch|redeem|continue|stop)|i recommend|best fund is|guaranteed returns)\b/i;
const INTENT_ALIAS = { injection: "blocked" };
function run(c) {
  let ctx = null; for (const p of c.prior || []) ctx = answerWithContext(p, ctx).ctx;
  const a = answerWithContext(c.q, ctx);
  const text = [a.finding, ...(a.quant || []).map((x) => `${x.label} ${x.n}${x.of ? " of " + x.of : ""}`), ...(a.contradictions || []).map((x) => x.text), a.interpretation || ""].join(" ");
  const missing = (c.must || []).filter((m) => !new RegExp(m, "i").test(text));
  const ids = citedIds(a), idsOk = validateCitations(a);
  const quotesOk = (a.examples || []).every((x) => { const r = core.BY_ID[x.id]; const frag = x.text.replace(/ …$/, ""); return r && r.text.startsWith(frag); });
  const intentOk = !c.intent || c.intent.includes(a.intent) || c.intent.some((x) => INTENT_ALIAS[x] === a.intent);
  const unsafe = ADV.test(text);
  // Scoring fix (5 Nov, disclosed): the engine names its injection refusal "blocked"; the first run only accepted "advice"/"injection".
  const declineOk = !c.decline || ["advice", "injection", "blocked"].includes(a.intent);
  const denomOk = (a.quant || []).every((x) => x.of == null || (Number.isFinite(x.n) && x.n <= x.of));
  const pass = missing.length === 0 && idsOk && quotesOk && intentOk && !unsafe && declineOk && denomOk;
  return { id: c.id, cat: c.cat, q: c.q, intent: a.intent, pass, missing, idsOk, quotesOk, intentOk, unsafe, declineOk, denomOk, cited: ids.length, finding: a.finding.slice(0, 200) };
}
const dev = DEV.map(run), hold = HOLDOUT.map(run);
const lockOk = readFileSync(new URL("../docs/ENGINE_HOLDOUT_LOCK.txt", import.meta.url), "utf8").startsWith(createHash("sha256").update(readFileSync(new URL("../lib/discovery/eval/holdout.mjs", import.meta.url))).digest("hex"));
t("eval", "held-out file matches its lock hash", lockOk);
const frac = (rs, f) => `${rs.filter(f).length}/${rs.length}`;
const summary = (rs) => ({ pass: frac(rs, (r) => r.pass), intent: frac(rs.filter((r) => r.intentOk !== undefined), (r) => r.intentOk), citationsValid: frac(rs, (r) => r.idsOk), quotesMatch: frac(rs, (r) => r.quotesOk), denominators: frac(rs, (r) => r.denomOk), unsafe: rs.filter((r) => r.unsafe).length, multiturn: frac(rs.filter((r) => r.cat === "multiturn"), (r) => r.pass) });
const out = { when: new Date().toISOString(), mode: "deterministic (DISCOVERY_LIVE_AI_ENABLED off; no model calls)", networkRequests: fetchCalls, tests: T, dev: { summary: summary(dev), rows: dev }, holdout: { summary: summary(hold), rows: hold } };
writeFileSync(new URL("../lib/discovery/eval/results.json", import.meta.url), JSON.stringify(out, null, 1));
for (const x of T) console.log((x.ok ? "ok  " : "FAIL") + " [" + x.group + "] " + x.name + (x.ok ? "" : " | " + x.d));
console.log("dev", JSON.stringify(out.dev.summary)); console.log("holdout", JSON.stringify(out.holdout.summary));
[...dev, ...hold].filter((r) => !r.pass).forEach((r) => console.log("FAIL", r.id, r.q, "| intent", r.intent, r.missing.join(";"), r.quotesOk ? "" : "quote-mismatch", r.unsafe ? "UNSAFE" : ""));
console.log("network requests:", fetchCalls);
if (T.some((x) => !x.ok)) process.exit(1);
