"use client";
import { useEffect, useMemo, useState } from "react";
import { DS, GOLDEN, ERROR_TYPES, DRIVER, DRIVER_SHORT, SRC, BY_ID } from "@/lib/discovery/core";
import { Head, Kpi, useEvidence, IdChips, Bars } from "@/components/x/ui";

const R = DS.rounds; const R3 = R[2];
const NOT_EVAL = [["False first-hand classification", "First-hand status was not part of the golden labelling, so it hasn't been evaluated."], ["Incorrect causal interpretation", "The coder assigns topics, not causes; there was no causal label to evaluate."], ["Unsupported attributes", "Segment and attribute labels were not human-checked."]];
const CODEBOOK = [
  { v: "v1.0", k: R[0], rules: ["Relevant yes/no; one primary driver from 10; stage ONBOARD, EARLY, LATER or UNKNOWN; segment signals; emotion; evidence STRONG or WEAK.", "Tie order when several drivers apply: PAY > STOP > PAUSE > AMOUNT > EXPECT."], why: "First blind round: the AI often coded the mechanism mentioned (autopay) rather than the topic, and treated feature wishes as lapse drivers." },
  { v: "v1.1", k: R[1], rules: ["Code the topic, not the mechanism mentioned.", "A feature wish is OTHER, not a lapse driver.", "PAY means how instalments get paid; KYC or document rejection is TRUST or STOP."], why: "After reconciling 29 round 1–2 disagreements: the engine was right in 16, the human in 7, both defensible in 6." },
  { v: "v1.2", k: R[2], rules: ["PAY only when something actually broke. Set-up and hypothetical questions are OTHER (rule 5).", "Code the problem; outside help is coded only when no problem is described (rule 6).", "Explicit tie rule: STOP if they stopped or intend to; a question stays with its cause (rule 7).", "CONFUSE is confusion inside the app only (rule 8)."], why: "Payment failure was over-counted (74 stories, many of them set-up questions). The 60 relabels are each logged with their rule." }
];
const ruleGroup = (s) => (s.startsWith("setup") ? "Set-up is not a failure (rule 5)" : s.startsWith("tie rule") || s.startsWith("v1.1 tie") ? "Tie rule: closest to exit (rule 7)" : s.startsWith("reconciliation") ? "Reconciliation: human or engine judged right" : s.startsWith("outside") ? "Outside help vs the problem (rule 6)" : s.startsWith("CONFUSE") ? "Confusion inside the app only (rule 8)" : s.startsWith("question") ? "Question stays with its cause (rule 7)" : "Other");

export default function Quality() {
  const { open } = useEvidence();
  const [round, setRound] = useState(""); const [res, setRes] = useState(""); const [err, setErr] = useState("");
  const [log, setLog] = useState(null);
  useEffect(() => { fetch("/api/reviews").then((r) => r.json()).then((j) => setLog(j.rows || [])).catch(() => setLog([])); }, []);
  const rows = useMemo(() => GOLDEN.filter((g) => (!round || g.round === +round) && (!res || (res === "agree" ? g.agree : !g.agree)) && (!err || g.error === err)).sort((a, b) => a.round - b.round || a.id.localeCompare(b.id, "en", { numeric: true })), [round, res, err]);
  const dis = GOLDEN.filter((g) => !g.agree);
  const errCount = ERROR_TYPES.map((e) => ({ key: e, label: e, value: dis.filter((g) => g.error === e).length, color: "var(--coral)" }));
  const correction = (g) => g.agree ? "None needed" : g.current === g.human ? (g.override ? `Fixed in v1.2: ${g.override.rule}` : "Matches human in v1.2") : g.round === 3 ? "Open: current label differs from the human" : g.override ? `Changed in v1.2 to ${DRIVER_SHORT[g.current]}; still differs` : "Open: reconciled, label kept";
  const groups = Object.entries(DS.overrides.reduce((o, x) => { const k = ruleGroup(x.rule); (o[k] = o[k] || []).push(x); return o; }, {})).sort((a, b) => b[1].length - a[1].length);
  const ex = {
    correct: GOLDEN.filter((g) => g.agree && g.round === 3).slice(0, 4),
    incorrect: GOLDEN.filter((g) => !g.agree && g.error === "Wrong lapse driver").slice(0, 4),
    ambiguous: GOLDEN.filter((g) => !g.agree && g.error === "Several drivers apply: wrong primary").slice(0, 4),
    rejected: GOLDEN.filter((g) => !g.agree && g.error === "Wrong topic: not a lapse driver").slice(0, 4)
  };
  return (
    <div className="x-page">
      <Head eyebrow="AI Quality and Human Validation" title="How far to trust the AI labels">Sixty records were labelled blind by a human across three rounds of 20 and compared with the AI. Agreement improved as the codebook was revised, to moderate. Twenty items per round can show direction; they can't establish high confidence.</Head>
      <section className="x-grid x-g4">
        <Kpi value={`${R3.agree} / ${R3.n}`} label="Matched, round 3 (v1.2)" def={`${R3.n - R3.agree} disagreements · ${Math.round((R3.agree / R3.n) * 100)}% agreement · n = ${R3.n}`} />
        <Kpi value={`κ ${R3.kappa.toFixed(2)}`} label={`Cohen's kappa, n = ${R3.n}`} def="Moderate. Corrects for chance agreement across 10 labels." />
        <Kpi value={`κ ${R3.recorded.engine_live.kappa.toFixed(2)}`} label={`Engine vs live model, n = ${R3.n}`} def={`${R3.recorded.engine_live.agree}/${R3.n} match. Live model vs human: ${R3.liveAgree}/${R3.n}, κ ${R3.liveKappa.toFixed(2)}.`} />
        <Kpi value={GOLDEN.length} label="Human labels in total" def={`3 rounds × 20 · ${dis.length} disagreements overall`} />
      </section>
      <p className="x-note">Round 3 engine labels were locked before the human labelled (sha256 {R3.lock.slice(0, 12)}…), so the human could not see them. The original labelling model and prompt version were not recorded. "Engine" means the stored labels; "live" means a re-run of the current model on the same 20.</p>

      <section className="x-sec" id="codebook"><h2 className="x-h2">Codebook evolution: κ {R.map((r) => r.kappa.toFixed(2)).join(" → ")}</h2>
        <div className="x-grid x-g3">{CODEBOOK.map((c) => (
          <div key={c.v} className="x-card x-sec"><div className="x-row" style={{ justifyContent: "space-between" }}><b style={{ fontSize: "1.2rem" }}>{c.v}</b><span className="x-pill acc">Round {c.k.round}: {c.k.agree}/{c.k.n} · κ {c.k.kappa.toFixed(2)}</span></div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: ".9rem" }}>{c.rules.map((r) => <li key={r}>{r}</li>)}</ul><p className="x-small"><b>Why it changed:</b> {c.why}</p>
            <button className="x-btn" onClick={() => { setRound(String(c.k.round)); setRes(""); setErr(""); document.getElementById("ws")?.scrollIntoView({ behavior: "smooth" }); }}>See round {c.k.round} labels</button></div>))}
        </div>
        <p className="x-small">Each round used a different 20 records, so the gains mix a better codebook with easier or harder items. The κ trend is suggestive, not a controlled comparison.</p>
        <details className="x-details x-card"><summary>All {DS.overrides.length} label changes from v1.1 to v1.2, grouped by rule</summary>
          {groups.map(([g, list]) => <div key={g} className="x-qa"><b>{g} · {list.length}</b><div className="x-small">{[...new Set(list.map((o) => `${DRIVER_SHORT[o.from]} → ${DRIVER_SHORT[o.to]}`))].join(", ")}</div><IdChips ids={list.map((o) => o.id)} /></div>)}
        </details>
      </section>

      <section className="x-grid x-g2">
        <div className="x-card x-sec"><h2 className="x-h2">Per-category precision and recall, round 3</h2><p className="x-note">Each category has 0–4 records in this round, so these figures are anecdotes, not rates. They are shown because they were computed; don't compare them.</p>
          <div className="x-tablewrap"><table className="x-table"><thead><tr><th>Driver</th><th className="n">Human n</th><th className="n">AI n</th><th className="n">Both</th><th className="n">Precision</th><th className="n">Recall</th></tr></thead><tbody>
            {Object.entries(DS.perCategoryR3).sort((a, b) => b[1].actual - a[1].actual).map(([d, v]) => <tr key={d}><td>{DRIVER_SHORT[d]}</td><td className="n">{v.actual}</td><td className="n">{v.predicted}</td><td className="n">{v.tp}</td><td className="n">{v.predicted ? `${v.tp}/${v.predicted}` : "—"}</td><td className="n">{v.actual ? `${v.tp}/${v.actual}` : "—"}</td></tr>)}
          </tbody></table></div></div>
        <div className="x-card x-sec"><h2 className="x-h2">Known error types (all rounds, n = {dis.length} disagreements)</h2>
          <Bars rows={errCount} onPick={(k) => { setErr(err === k ? "" : k); setRes(""); setRound(""); }} picked={err} max={Math.max(...errCount.map((e) => e.value))} />
          <p className="x-small">Select a type to filter the workspace below. Error type is derived from the human and AI labels: for example, the human said context and the AI said a lapse driver.</p>
          <h3 className="x-h3">Not evaluated</h3>{NOT_EVAL.map(([t, d]) => <p key={t} className="x-small"><b>{t}:</b> {d}</p>)}
        </div>
      </section>

      <section className="x-sec"><h2 className="x-h2">Examples by outcome</h2>
        <div className="x-grid x-g4">{[["correct", "Correct (round 3)"], ["incorrect", "Incorrect: wrong driver"], ["ambiguous", "Ambiguous: several apply"], ["rejected", "Rejected: not a lapse driver"]].map(([k, l]) => <div key={k} className="x-card x-sec"><b>{l}</b>{ex[k].length ? ex[k].map((g) => <p key={g.id + g.round} className="x-small"><button className="x-id" onClick={() => open(g.id)}>{g.id}</button> human {DRIVER_SHORT[g.human]} · AI {DRIVER_SHORT[g.ai]}</p>) : <p className="x-small">None.</p>}</div>)}</div>
        <p className="x-small">Reconciliation of rounds 1–2 ({DS.reconciliation.disagreements} disagreements): engine judged right {DS.reconciliation.engineRight}, human right {DS.reconciliation.humanRight}, both defensible {DS.reconciliation.both}. A disagreement is not always an AI error.</p>
      </section>

      <section id="ws" className="x-card x-sec" aria-labelledby="ws-t"><h2 className="x-h2" id="ws-t">Golden set and disagreement workspace</h2>
        <div className="x-filters">
          <label className="x-label">Round<select className="x-select" value={round} onChange={(e) => setRound(e.target.value)}><option value="">All 3</option>{R.map((r) => <option key={r.round} value={r.round}>Round {r.round} ({r.codebook})</option>)}</select></label>
          <label className="x-label">Result<select className="x-select" value={res} onChange={(e) => setRes(e.target.value)}><option value="">All</option><option value="agree">Agreed</option><option value="disagree">Disagreed</option></select></label>
          <label className="x-label">Error type<select className="x-select" value={err} onChange={(e) => setErr(e.target.value)}><option value="">Any</option>{ERROR_TYPES.map((e) => <option key={e}>{e}</option>)}</select></label>
          <div className="x-label">Showing<b className="x-num" style={{ fontSize: "1.2rem" }}>{rows.length} of {GOLDEN.length}</b></div>
        </div>
        <div className="x-tablewrap" style={{ maxHeight: 640 }}><table className="x-table"><thead><tr><th>ID</th><th>Round</th><th>Excerpt</th><th>Human</th><th>AI</th><th>Live</th><th>Result</th><th>Correction</th></tr></thead><tbody>
          {rows.length === 0 ? <tr><td colSpan={8}>No labels match these filters.</td></tr> : rows.map((g) => <tr key={g.id + g.round}>
            <td><button className="x-id" onClick={() => open(g.id)}>{g.id}</button><div className="x-small">{SRC[g.src]}</div></td><td>{g.round}</td>
            <td style={{ minWidth: 240, maxWidth: 380 }}>{g.text.length > 160 ? g.text.slice(0, 160) + "…" : g.text}</td>
            <td>{DRIVER_SHORT[g.human]}</td><td>{DRIVER_SHORT[g.ai]}</td><td>{g.live ? DRIVER_SHORT[g.live] : "—"}</td>
            <td>{g.agree ? <span className="x-pill ok">Agree</span> : <span className="x-pill bad">{g.error}</span>}</td><td className="x-small" style={{ minWidth: 160 }}>{correction(g)}</td></tr>)}
        </tbody></table></div>
      </section>

      <section className="x-card x-sec"><h2 className="x-h2">Community review log</h2>
        <p className="x-small">Reviews added from any record's detail drawer (approve, correct or flag). The log is append-only and stores the AI label, codebook version and time. Reviews don't change the dataset or the ranking until a new codebook version is published with documented rules.</p>
        {log === null ? <div className="x-skel" style={{ height: 60 }} /> : log.length === 0 ? <p>No reviews yet. Open any record and use “Human review”.</p> :
          <div className="x-tablewrap"><table className="x-table"><thead><tr><th>When</th><th>Record</th><th>Action</th><th>AI → human</th><th>Rationale</th><th>Codebook</th></tr></thead><tbody>
            {log.map((x) => <tr key={x.id}><td className="x-small">{new Date(x.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td><td>{BY_ID[x.evidence_id] ? <button className="x-id" onClick={() => open(x.evidence_id)}>{x.evidence_id}</button> : x.evidence_id}</td><td>{x.action}</td><td>{DRIVER_SHORT[x.ai_label]}{x.human_label && x.human_label !== x.ai_label ? " → " + DRIVER_SHORT[x.human_label] : ""}</td><td>{x.rationale || "—"}</td><td>{x.codebook_version}</td></tr>)}
          </tbody></table></div>}
        <p className="x-small">Reviewer identity isn't collected, so these are unattributed and unverified. A reviewed label becomes an accepted correction only after a second human agrees with it.</p>
      </section>
    </div>
  );
}
