"use client";
import { useState } from "react";
import Link from "next/link";
import { RECORDS, DRIVER, DRIVER_SHORT, COLOR, SEG, SRC, countBy, pct } from "@/lib/discovery/core";
import { Head, Bars, useEvidence, IdChips, SrcTag } from "@/components/x/ui";

const N = RECORDS.length;
const has = (f, v) => (r) => r.sig[f] && (!v || r.sig[f].v === v);
// Each segment says how membership was decided. "explicit" = a phrase in the text; "ai" = the coder's label, applied only when stated.
const SEGS = [
  { k: "salaried", t: "Salary-linked", tag: "ai", how: "Coded salaried, or the text mentions salary, payday or income.", f: (r) => r.seg === "SALARIED" || has("money", "Income mentioned")(r) },
  { k: "tight", t: "Describes tight cash flow", tag: "explicit", how: "Text names an EMI, loan, debt, job loss or medical or family need.", f: (r) => has("money")(r) && r.sig.money.v !== "Income mentioned" },
  { k: "new", t: "Says they are new", tag: "explicit", how: "Text says first SIP, beginner, just started, a month back…", f: has("tenure") },
  { k: "early", t: "Set-up or first 6 months", tag: "ai", how: "AI-coded stage ONBOARD or EARLY (from what the text says about timing).", f: (r) => r.stage === "ONBOARD" || r.stage === "EARLY" },
  { k: "social", t: "Started via a creator or friend", tag: "ai", how: "Coded as creator or friend-led, or the text mentions an outside influence.", f: (r) => r.seg === "INFLUENCER_LED" || has("help", "Mentions an outside influence")(r) },
  { k: "student", t: "Student", tag: "ai", how: "Coded student; applied only when stated.", f: (r) => r.seg === "STUDENT" },
  { k: "irregular", t: "Irregular income", tag: "ai", how: "Coded irregular income; applied only when stated.", f: (r) => r.seg === "IRREGULAR_INCOME" },
  { k: "family", t: "Family money", tag: "ai", how: "Coded as investing family money; applied only when stated.", f: (r) => r.seg === "FAMILY_MONEY" }
];
const COMPARE = [
  ["New earners vs stable-income investors", "Students: 6. Neither 'new earner' nor 'stable income' is stated often enough to form groups. No comparison is shown."],
  ["Self-directed vs socially influenced", "Socially influenced: the segment above. 'Self-directed' is never stated; treating the rest as self-directed would be invented. Gap."],
  ["Salary-linked planners vs manual payment readiness", "Salary-linked: above. How people fund the debit (salary transfer vs topping up by hand) is rarely stated. The survey covers it instead: 10 of 20 matched the debit date to payday."],
  ["First-time vs experienced investors", "'Says they are new' and the AI stage are above. Experience is almost never stated, so the rest are 'Not stated', not 'experienced'."],
  ["Tight cash flow vs consistent affordability", "Tight cash flow is above. Nobody states consistent affordability, so there is no comparison group."]
];
const NOT = [["Age", "4 of 450 records state an age (22, 24, 24, 41). Never inferred from writing style."], ["Gender or identity", "Not stated in any record; not inferred."], ["Income level", "Not stated; SIP amount is never used as a proxy."], ["City or tier", "2 records hint at living outside a metro; too few to analyse."], ["Occupation", "Only salaried and student, when stated."]];

function Profile({ s }) {
  const { open } = useEvidence();
  const rows = RECORDS.filter(s.f); const lapse = rows.filter((r) => r.lapse); const n = rows.length;
  const drv = Object.entries(countBy(lapse, (r) => r.driver)).sort((a, b) => b[1] - a[1]);
  const out = countBy(rows.filter((r) => r.sig.outcome), (r) => r.sig.outcome.v);
  const help = rows.filter((r) => r.sig.help).length; const counter = rows.filter((r) => r.driver === "KEEP" || (r.sig.outcome && r.sig.outcome.v === "Continued"));
  const examples = [...rows].sort((a, b) => (b.firstHand - a.firstHand) || (Object.keys(b.sig).length - Object.keys(a.sig).length)).slice(0, 4).map((r) => r.id);
  const small = lapse.length < 15;
  return (
    <div className="x-sec" aria-live="polite">
      <div className="x-row" style={{ justifyContent: "space-between" }}><h2 className="x-h2">{s.t}</h2><span className="x-row"><SrcTag k={s.tag === "ai" ? "ai" : "explicit"} /><span className="x-pill">{n} records · {lapse.length} lapse stories</span></span></div>
      <p className="x-small">{s.how} {s.tag === "ai" ? "The coder applied this only when the text says so, but it was not separately human-validated." : "Membership is a phrase match; the matching phrase is shown on each record."}</p>
      {small && <p className="x-note">Only {lapse.length} lapse stories. Read them individually; percentages at this size are noise.</p>}
      <div className="x-grid x-g2">
        <div className="x-card x-sec"><h3 className="x-h3">Typical concerns: lapse drivers (n = {lapse.length})</h3>
          {lapse.length ? <Bars rows={drv.map(([d, v]) => ({ key: d, label: DRIVER_SHORT[d], value: v, color: COLOR[d] }))} max={lapse.length} fmt={(r) => small ? String(r.value) : `${r.value} · ${pct(r.value, lapse.length, 0)}`} /> : <p className="x-small">No lapse stories in this segment.</p>}
        </div>
        <div className="x-card x-sec"><h3 className="x-h3">What they did (stated, n = {n})</h3>
          {Object.keys(out).length ? <Bars rows={Object.entries(out).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ key: k, label: k, value: v, color: "var(--teal)" }))} max={n} /> : <p className="x-small">No outcome stated.</p>}
          <p className="x-small">Not stated: {n - Object.values(out).reduce((a, b) => a + b, 0)} of {n}. Reported workaround (asking others or an outside source): {help} of {n}.</p>
          {drv[0] && <p style={{ fontSize: ".9rem" }}><b>Likely continuation barrier</b> <SrcTag k="inference" />: {DRIVER[drv[0][0]].toLowerCase()} is the most common driver here, but with {lapse.length} stories that is directional.</p>}
        </div>
      </div>
      <div className="x-grid x-g2">
        <div className="x-card x-sec"><h3 className="x-h3">Supporting evidence</h3><IdChips ids={examples} /><p className="x-small">Sources: {Object.entries(countBy(rows, (r) => SRC[r.src])).map(([k, v]) => `${k} ${v}`).join(" · ")}</p></div>
        <div className="x-card x-sec"><h3 className="x-h3">Counterexamples: continued ({counter.length})</h3>{counter.length ? <IdChips ids={counter.slice(0, 8).map((r) => r.id)} /> : <p className="x-small">None in this segment.</p>}</div>
      </div>
    </div>
  );
}

export default function Segments() {
  const [k, setK] = useState("salaried"); const s = SEGS.find((x) => x.k === k);
  const any = RECORDS.filter((r) => SEGS.some((x) => x.f(r))).length;
  return (
    <div className="x-page">
      <Head eyebrow="Segment Explorer" title="Who these investors are, using only what they told us">Segments are built only from what people stated, or from labels the coder applied when the text said so. Everything else is shown as not stated, and nothing is inferred from writing style or SIP amount.</Head>
      <p className="x-note"><b>{any} of {N} records ({pct(any, N, 0)})</b> fall into any segment below. The other {N - any} state no circumstance we can use. Segment sizes are unequal and mostly small, so the profiles are for reading the stories, not for comparing rates.</p>
      <section className="x-tablewrap"><table className="x-table"><thead><tr><th>Segment</th><th>How it is decided</th><th>Evidence type</th><th className="n">Records</th><th className="n">Lapse stories</th></tr></thead><tbody>
        {SEGS.map((x) => { const r = RECORDS.filter(x.f); return <tr key={x.k} style={{ cursor: "pointer", background: x.k === k ? "var(--acc-soft)" : undefined }} onClick={() => setK(x.k)}><td><button className="x-id" style={{ fontFamily: "inherit" }} onClick={() => setK(x.k)}>{x.t}</button></td><td className="x-small">{x.how}</td><td><SrcTag k={x.tag === "ai" ? "ai" : "explicit"} /></td><td className="n">{r.length}</td><td className="n">{r.filter((y) => y.lapse).length}</td></tr>; })}
        <tr><td>Not stated</td><td className="x-small">No circumstance in the text</td><td><SrcTag k="unknown" /></td><td className="n">{N - any}</td><td className="n">{RECORDS.filter((r) => r.lapse && !SEGS.some((x) => x.f(r))).length}</td></tr>
      </tbody></table></section>
      <p className="x-small">Segments overlap: one record can be both salary-linked and new.</p>
      <section className="x-card"><Profile s={s} /></section>
      <section className="x-grid x-g2">
        <div className="x-card x-sec"><h2 className="x-h2">Comparisons the assignment asks for</h2>{COMPARE.map(([t, d]) => <div key={t} className="x-qa"><b>{t}</b><p className="x-small">{d}</p></div>)}</div>
        <div className="x-card x-sec"><h2 className="x-h2">Not captured, and why</h2>{NOT.map(([t, d]) => <div key={t} className="x-qa"><b>{t} <SrcTag k="unknown" /></b><p className="x-small">{d}</p></div>)}
          <p className="x-small">Primary research fills some gaps: the survey (n = 20 starters) asked about payday timing and money pressure, and two interviews (P01, P02) are in the deck. Those counts are never mixed with these.</p>
          <Link className="x-btn" href="/agent?q=How%20do%20salary-linked%20investors%20behave%20differently%3F">Ask the agent about salary-linked investors →</Link></div>
      </section>
    </div>
  );
}
