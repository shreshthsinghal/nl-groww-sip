"use client";
import Link from "next/link";
import { DS, RECORDS, SRC, SRC_ORDER, LAPSE_N, countBy, pct } from "@/lib/discovery/core";
import { Head } from "@/components/x/ui";

const by = countBy(RECORDS, (r) => r.src); const R3 = DS.rounds[2];
const DATES = RECORDS.map((r) => r.date).filter(Boolean).sort(); const D0 = DATES[0], D1 = DATES[DATES.length - 1];
const FH = RECORDS.filter((r) => r.firstHand).length, CHECKED = RECORDS.filter((r) => r.golden && r.golden.length).length;
export const SAMPLE_WARNING = "This dataset is designed to identify and prioritise reported lapse mechanisms. It is not a representative estimate of SIP lapse prevalence among all investors. Driver shares describe the coded research sample, not the overall investor population.";
function Sampling() {
  const rows = [
    ["How were the 450 chosen?", <>From per-platform candidate lists drawn from the {DS.passed.toLocaleString("en-IN")} records that passed the filters. The only written rule: Reddit's 1,553 filtered matches were sampled down to 280 candidates. Which candidates were coded, and the rules for the other platforms, were <b>not recorded</b>. The selection cannot be reproduced.</>],
    ["Random, stratified, keyword-based or manual?", <>Keyword filters (topic and first-person gates) before candidate lists; after that, undocumented. It is <b>not</b> described as random or stratified because it was not documented as either.</>],
    ["Proportional across platforms?", <>No. Reddit is {pct(DS.collected.RD, DS.collected.total)} of collected records but {by.RD} of 450 coded ({pct(by.RD, 450)}); App Store is {pct(DS.collected.AS, DS.collected.total)} of collected but {pct(by.AS, 450)} of coded.</>],
    ["Deliberate oversampling of lapse stories?", <>Effectively yes: the gates and candidate lists targeted SIP problems, so {LAPSE_N} of 450 ({pct(LAPSE_N, 450)}) coded records are lapse-labelled. This is a property of the sample, not a lapse rate.</>],
    ["Time period", <>One collection snapshot in {DS.collected.window}. Post dates in the coded set run from {D0} to {D1}; {RECORDS.filter((r) => r.dateApprox).length} YouTube dates are approximate (relative ages).</>],
    ["Qualified for coding", <>Passed the topic gate (SIP, mandate, instalment, pause, redeem…) and the first-person gate, and was on a candidate list.</>],
    ["Excluded", <>Failed either gate, or was not picked from a candidate list. Reasons were not stored per record.</>],
    ["Can a record be in several categories?", <>No for drivers: each record has exactly one primary driver, so the 8 lapse-driver counts add up to {LAPSE_N}. Segment and attribute tags can overlap.</>],
    ["How first-hand status was set", <>By the AI coder from the wording (STRONG or WEAK first-person evidence): {FH} of 450 are first-hand. It was not verified separately by a human.</>],
    ["Human review", <>{CHECKED} records (three blind rounds of 20) were labelled by a human. The other {450 - CHECKED} labels are AI-only.</>]
  ];
  return (
    <section className="x-card x-sec" id="sampling" aria-labelledby="samp-h">
      <h2 id="samp-h" className="x-h2">Sampling and selection</h2>
      <p className="x-note warn" role="note"><b>Read this first.</b> {SAMPLE_WARNING}</p>
      <div className="x-tablewrap"><table className="x-table"><tbody>{rows.map(([k, v]) => <tr key={k}><th scope="row" style={{ width: "30%" }}>{k}</th><td>{v}</td></tr>)}</tbody></table></div>
      <h3 className="x-h3" style={{ marginTop: 16 }}>Rejected records audit</h3>
      <div className="x-tablewrap"><table className="x-table"><thead><tr><th>Stage</th><th className="n">Records</th><th>Retained?</th><th>Reasons recorded?</th></tr></thead><tbody>
        <tr><td>Collected</td><td className="n">{DS.collected.total.toLocaleString("en-IN")}</td><td>Counts by platform only</td><td>—</td></tr>
        <tr><td>Removed by the topic and first-person filters</td><td className="n">{(DS.collected.total - DS.passed).toLocaleString("en-IN")}</td><td><b>No</b></td><td><b>No</b></td></tr>
        <tr><td>Passed the filters but not coded</td><td className="n">{(DS.passed - 450).toLocaleString("en-IN")}</td><td><b>No</b></td><td><b>No</b></td></tr>
        <tr><td>Coded (browsable in the Evidence Explorer)</td><td className="n">450</td><td>Yes</td><td>—</td></tr>
      </tbody></table></div>
      <p className="x-small">{(DS.collected.total - DS.passed).toLocaleString("en-IN")} is a calculated difference (19,005 − 2,518), not a list of rejected records. Because rejected records and their reasons were not kept, a record-level rejection analysis can't be reproduced and no rejection categories are shown.</p>
      <p className="x-small"><b>Platform concentration.</b> Reddit supplies {pct(DS.collected.RD, DS.collected.total)} of everything collected. Platform composition and self-selection shape which themes appear; more Reddit posts on a theme do not mean Reddit investors have more SIP problems.</p>
    </section>
  );
}
const QA = [
  ["Where did the data come from?", <>Public posts only, from five platforms: Reddit (Indian investing subreddits), TradingQ&A, YouTube comments on 32 SIP videos, Google Play reviews and App Store India reviews of Groww. No private data, accounts, portfolios or PAN details were collected.</>],
  ["When was it collected?", <>In {DS.collected.window}, as one snapshot. Per-record collection timestamps were not stored. Post dates in the coded set span {D0} to {D1}; YouTube dates are approximate because YouTube shows relative ages ("2 months ago").</>],
  ["How many records came from each platform?", <table className="x-table" style={{ marginTop: 6 }}><thead><tr><th>Platform</th><th className="n">Collected</th><th className="n">Coded</th><th className="n">Highest candidate ID coded</th></tr></thead><tbody>{SRC_ORDER.map((k) => <tr key={k}><td>{SRC[k]}</td><td className="n">{DS.collected[k].toLocaleString("en-IN")}</td><td className="n">{by[k]}</td><td className="n">{DS.idRange[k].maxIndex}</td></tr>)}<tr><td><b>Total</b></td><td className="n"><b>{DS.collected.total.toLocaleString("en-IN")}</b></td><td className="n"><b>{DS.coded}</b></td><td /></tr></tbody></table>],
  ["How was duplicate content handled?", <>Within the 450 coded records there are 0 duplicate IDs and 0 duplicate excerpts (case- and space-insensitive check, rerun on every build). A deduplication log for the collection stage was not kept. Duplicates of the same story across platforms can't be detected from excerpts.</>],
  ["How was relevance determined?", <>A topic gate (SIP, mandate, instalment, pause, returns and similar terms), then a first-person gate. {DS.passed.toLocaleString("en-IN")} of {DS.collected.total.toLocaleString("en-IN")} passed. The coder then marked each coded record relevant or not. Records filtered out at either stage were not retained.</>],
  ["How was first-hand experience determined?", <>The AI coder marked evidence STRONG (first-hand and specific) or WEAK (general opinion, second-hand, advice). {RECORDS.filter((r) => r.firstHand).length} of {DS.coded} are first-hand. This label was not part of the human golden set, so its accuracy hasn't been measured.</>],
  ["How were the 450 records selected for labelling?", <><b>Not fully documented.</b> The only written note is that Reddit's 1,553 filtered matches were sampled down to 280 candidates. The method (random or first-N) and the rule for the other platforms were not recorded. Evidence IDs are each record's position in its platform's candidate list, and the coded IDs run up to the numbers in the table above. That shows each list was only partly coded. We don't describe this as a random or stratified sample, because it wasn't documented as one.</>],
  ["How did the AI classify records?", <>Claude (an Anthropic model; the exact model version and prompt text for the original run were not recorded) coded each record against a written codebook: one primary driver from ten, stage, emotion, segment signals (only when stated) and evidence strength. The codebook went through v1.0, v1.1 and v1.2. Moving to v1.2 changed {DS.overrides.length} labels, each logged with its rule and kept alongside the v1.1 label. The "stated in text" attributes on this site (outcome, payment event, money context, help sought, tenure, age) are deterministic phrase matches added in this version, with the matching phrase stored.</>],
  ["How was human validation performed?", <>Three blind rounds of 20 records. The human labelled without seeing the AI's label, and the round 3 engine labels were locked with a hash first. Agreement went from κ {DS.rounds[0].kappa.toFixed(2)} to {DS.rounds[1].kappa.toFixed(2)} to {R3.kappa.toFixed(2)}. After rounds 1–2, the {DS.reconciliation.disagreements} disagreements were reconciled: engine right {DS.reconciliation.engineRight}, human right {DS.reconciliation.humanRight}, both defensible {DS.reconciliation.both}. <Link href="/quality">See every label →</Link></>],
  ["How were opportunity scores calculated?", <>Score = share × exit relevance × addressability × evidence quality. Share is the driver's stories ÷ {LAPSE_N} lapse stories × 100. Exit and addressability are 0–1 weights set by the team, each with a written reason. Evidence quality is 0.5 + 0.5 × the first-hand share. The site recomputes every score from the records on each build and checks it against the stored ranking: 0 mismatches. <Link href="/opportunities#calc">Full calculation →</Link></>],
  ["How was resampling performed?", <>A bootstrap: draw {LAPSE_N} lapse stories with replacement, rescore, record the top driver, and repeat 1,000 times (seed {DS.stability.bootstrap.seed}). Payment failure stayed first in {DS.stability.bootstrap.kept}. Separately, each weight was nudged by up to ±0.15 at random, 1,000 times (seed {DS.stability.nudge.seed}); it stayed first in {DS.stability.nudge.kept}. These are counts of runs, not confidence intervals. <Link href="/opportunities#sensitivity">Re-run in your browser →</Link></>],
  ["What biases remain?", <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}><li>Platform skew: Reddit is {pct(DS.collected.RD, DS.collected.total, 0)} of everything collected and {pct(by.RD, DS.coded, 0)} of the coded records.</li><li>Negativity: people post when something goes wrong, and app-store reviews skew towards one-star.</li><li>Survivorship: continuers rarely post ({DS.continuers} records).</li><li>Selection: the 2,518 → 450 step isn't documented.</li><li>Not only Groww: Reddit, TradingQ&A and YouTube posts may describe other platforms.</li><li>Labels: AI-coded, with moderate agreement on small samples.</li><li>Stories, not people: no share here is a population rate.</li></ul>]
];

export default function Methodology() {
  return (
    <div className="x-page">
      <Head eyebrow="Methodology and research audit" title="How this was built, including what wasn't recorded">Twelve questions an evaluator should ask, each answered plainly. Where a step wasn't documented, we say so instead of reconstructing it.</Head>
      <Sampling />
      <section className="x-card">{QA.map(([q, a], i) => <div key={q} id={"q" + (i + 1)} className="x-qa"><b>{i + 1}. {q}</b><div style={{ fontSize: ".95rem", color: "var(--ink-2)" }}>{a}</div></div>)}</section>

      <section className="x-grid x-g2">
        <div className="x-card x-sec"><h2 className="x-h2">Inclusion and exclusion</h2>
          <p><b>Included:</b> public posts about a SIP or mutual fund instalment in an Indian context: starting, paying, pausing, stopping, returns or the app experience.</p>
          <p><b>Excluded at filtering:</b> posts outside the topic gate and posts that failed the first-person gate.</p>
          <p><b>Kept but not ranked:</b> {DS.continuers} continuer stories and {DS.context} context records (feature wishes, set-up questions, opinions). They stay searchable but are outside the {LAPSE_N} denominator.</p></div>
        <div className="x-card x-sec"><h2 className="x-h2">Rejected records</h2>
          <p className="x-note"><b>Not retained.</b> The 16,487 records that failed the filters were not saved, so examples of irrelevant posts, general market talk, third-person advice, duplicates or low-information content can't be shown. We don't fabricate examples. The closest available evidence is the {DS.context} records coded as context and the {DS.overrides.filter((o) => o.to === "OTHER").length} records moved to context in v1.2.</p>
          <Link className="x-btn" href="/evidence?driver=OTHER">Browse the context records</Link></div>
      </section>

      <section className="x-sec"><h2 className="x-h2">Data-quality audit</h2><p className="x-small">Recomputed on every build from the versioned files. The raw golden labels and the v1.2 override log are kept unchanged; the coded dataset is generated from them, never edited by hand.</p>
        <div className="x-tablewrap"><table className="x-table"><thead><tr><th>Check</th><th className="n">Result</th><th>Note</th></tr></thead><tbody>
          {DS.audit.map((a) => <tr key={a.check}><td>{a.check}</td><td className="n">{a.result}{a.of ? ` / ${a.of}` : ""}</td><td className="x-small">{a.note}</td></tr>)}
        </tbody></table></div></section>

      <section className="x-card x-sec"><h2 className="x-h2">Versions</h2>
        <dl className="x-dl">
          <dt>Dataset</dt><dd>Snapshot {DS.snapshot}; built {DS.built}</dd>
          <dt>Codebook</dt><dd>v1.2 (labels); v1.1 kept per record; v1.0 kept for golden round 2</dd>
          <dt>Labelling model</dt><dd>Claude; version and prompt not recorded for the original run</dd>
          <dt>Research agent</dt><dd>Deterministic retrieval and counting on the server. An optional model only rephrases findings, and the rewrite is rejected if it introduces numbers or IDs</dd>
          <dt>Evidence IDs</dt><dd>Source letter + position in that platform's candidate list. Stable across versions</dd>
        </dl></section>
    </div>
  );
}
