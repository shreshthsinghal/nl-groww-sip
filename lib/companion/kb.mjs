// SIP Companion knowledge base: source metadata and hybrid retrieval.
// The corpus is small (about 22 reviewed facts from 13 sources), so retrieval is proportionate: the
// question's deterministic intent selects the facts that intent always needs, and a BM25 keyword
// score over the fact texts adds any other fact the wording points to. No vector database.
//
// Review process: facts and sources are edited by hand in base.mjs (text) and here (metadata).
// "verified" is the date a person last opened the source and checked the fact against it.
// Nothing is refreshed automatically. To update: re-read the source, edit the fact, change "verified".
import { FACTS, SOURCES } from "./base.mjs";

export const SOURCE_META = {
  GROWW_CANCELLED: { org: "Groww", type: "help-centre article", verified: "2026-10-26" },
  GROWW_FAIL: { org: "Groww", type: "help-centre article", verified: "2026-10-26" },
  GROWW_MISSED: { org: "Groww", type: "help-centre article", verified: "2026-11-01" },
  GROWW_SKIP: { org: "Groww", type: "help-centre article", verified: "2026-10-26" },
  GROWW_EDIT: { org: "Groww", type: "official blog how-to", verified: "2026-10-26" },
  GROWW_CANCEL: { org: "Groww", type: "help-centre article", verified: "2026-10-26" },
  GROWW_ECS: { org: "Groww", type: "help-centre article", verified: "2026-10-26" },
  AMFI_FAQ: { org: "AMFI (uniform SIP cancellation process, effective 1 Apr 2024; copy hosted by Taurus MF)", type: "regulatory process FAQ", verified: "2026-11-01" },
  SEBI: { org: "SEBI", type: "regulator investor website", verified: "2026-10-26" },
  MFSH_SIP: { org: "AMFI (Mutual Funds Sahi Hai)", type: "investor education", verified: "2026-11-02" },
  SEBI_FAQ: { org: "SEBI (FAQ, copy hosted by freefincal)", type: "regulator FAQ", verified: "2026-11-02" },
  GROWW_REDEEM: { org: "Groww", type: "help-centre article", verified: "2026-11-02" },
  LOCKIN_SIP: { org: "Angel One (secondary explainer)", type: "broker explainer, not a policy source", verified: "2026-11-02" }
};

// Which facts carry a product rule whose source must be cited (policy-sensitive).
export const POLICY_FACTS = ["CANCEL_RULE", "PAY_NOW", "CANCEL_7D", "SKIP_NOT_FAIL", "CANCEL_FINAL", "CHARGES", "SKIP", "EDIT", "CANCEL_HOW", "ONE_TIME", "NOTIFY"];

export function sourceCard(id) {
  const s = SOURCES[id], m = SOURCE_META[id] || {};
  return s ? { id, title: s.title, url: s.url, org: m.org, type: m.type, verified: m.verified } : null;
}

/* ---------- BM25 over fact texts (plus a few hand-written synonyms per fact) ---------- */
const SYN = {
  CANCEL_RULE: "three 3 in a row consecutive miss missed fail failed cancelled automatically auto cancel next one",
  NOTIFY: "email sms message notification told informed alert",
  SKIP_NOT_FAIL: "skip pause skipped paused not counted failure",
  CAUSES: "why reason failed rejected unsuccessful not processed not deducted money wasn't deducted kyc mandate autopay balance bank",
  PAY_NOW: "pay missed instalment pay now recover make up catch up insufficient balance window working days",
  ONE_TIME: "one-time lumpsum invest separately extra payment",
  SKIP: "skip pause next month break hold",
  EDIT: "change date move debit date lower reduce amount edit salary payday",
  CANCEL_HOW: "stop cancel close sip existing invested units money stays redeem what happens to my money",
  CANCEL_7D: "stop cancel within 7 days due soon",
  CANCEL_FINAL: "undo restart start again later new sip",
  CHARGES: "fee charge penalty bank charge bounce ecs",
  NO_ADVICE: "which fund best fund returns recommend advice should i invest",
  SIP_WHAT: "what is sip how sip works systematic investment plan",
  SIP_MIN: "minimum amount smallest sip 500",
  UNITS_NAV: "nav units price value",
  MARKET_RISK: "risk loss red negative returns market down safe guarantee",
  EXIT_LOAD: "exit load withdraw early charge",
  REDEEM: "withdraw redeem take money out sell",
  LOCKIN: "lock-in elss tax saving 3 years"
};
const tok = (t) => String(t).toLowerCase().replace(/[^a-z0-9₹]+/g, " ").split(" ").filter((w) => w.length > 1 && !STOP.has(w));
const STOP = new Set("the a an is are was were be to of in on for and or it my me i you your this that what how can do does will with at by from as if not but so than there their they we our".split(" "));
const DOCS = Object.keys(FACTS).map((id) => ({ id, toks: tok(FACTS[id].text + " " + (SYN[id] || "")) }));
const N = DOCS.length, AVG = DOCS.reduce((s, d) => s + d.toks.length, 0) / N;
const DF = new Map(); DOCS.forEach((d) => new Set(d.toks).forEach((w) => DF.set(w, (DF.get(w) || 0) + 1)));
export function bm25(q, k = 4) {
  const qt = [...new Set(tok(q))];
  return DOCS.map((d) => {
    let s = 0;
    for (const w of qt) {
      const f = d.toks.filter((x) => x === w).length; if (!f) continue;
      const idf = Math.log(1 + (N - DF.get(w) + 0.5) / (DF.get(w) + 0.5));
      s += idf * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * d.toks.length / AVG));
    }
    return [d.id, s];
  }).filter(([, s]) => s > 1.2).sort((a, b) => b[1] - a[1]).slice(0, k);
}

/* Hybrid: facts the intent always needs, then keyword hits, de-duplicated, capped. */
export function hybridRetrieve(q, intentIds, extraIds = [], cap = 8) {
  const kw = bm25(q).map(([id]) => id);
  return [...new Set([...intentIds, ...extraIds, ...kw])].filter((id) => FACTS[id]).slice(0, cap);
}
