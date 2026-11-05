"use client";
// Opportunity score breakdown: every component of one driver's score, computed from dataset.json, with the record IDs
// behind it, evidence that cuts the other way, and what it would take for another driver to rank first.
import { useMemo, useState } from "react";
import Link from "next/link";
import { DS, RECORDS, RANKED, DRIVER, WHY_WEIGHT, rankDrivers, pct } from "@/lib/discovery/core";

const ROWS = rankDrivers().rows;
const LAPSE = RECORDS.filter((r) => r.lapse);
export const SCALE = [
  ["Share", "count ÷ 352 lapse stories × 100", "0–100", "How often the driver appears in the coded lapse stories (sample share, not prevalence)."],
  ["Exit relevance", "analyst weight", "0–1", "1 = leads directly to the SIP ending; 0.5 = contributes; near 0 = rarely ends a SIP."],
  ["Addressability", "analyst weight", "0–1", "1 = the cause and the fix live inside the app; low = mostly outside the product (registrar, markets, life events)."],
  ["Evidence quality", "0.5 + 0.5 × first-hand share", "0.5–1", "Computed: rewards first-hand accounts; a driver with no first-hand stories scores 0.5."]
];

export default function Breakdown() {
  const [d, setD] = useState("PAY");
  const r = ROWS.find((x) => x.driver === d), top = ROWS[0];
  const recs = LAPSE.filter((x) => x.driver === d);
  const ids = recs.filter((x) => x.firstHand).slice(0, 8).map((x) => x.id);
  const continued = recs.filter((x) => x.sig && x.sig.outcome && x.sig.outcome.v === "Continued").map((x) => x.id);
  const movedOut = DS.overrides.filter((o) => o.from === d).length, movedIn = DS.overrides.filter((o) => o.to === d).length;
  const volRank = [...ROWS].sort((a, b) => b.n - a.n).findIndex((x) => x.driver === d) + 1;
  // What would make this driver first: the exit × addressability product it would need, holding share and evidence fixed.
  const need = d === top.driver ? null : top.score / (r.share * r.ev);
  const second = ROWS[1];
  const keep = useMemo(() => (top.driver === "PAY" ? (second.score / (top.share * top.ev)) : null), []);
  return (
    <section className="x-card x-sec" id="breakdown" aria-labelledby="bd-h">
      <h2 id="bd-h" className="x-h2">Score breakdown</h2>
      <label className="x-label">Driver <select className="x-select" value={d} onChange={(e) => setD(e.target.value)}>{RANKED.map((k) => <option key={k} value={k}>{DRIVER[k]}</option>)}</select></label>
      <div className="x-tablewrap"><table className="x-table"><thead><tr><th>Component</th><th className="n">Value</th><th>Basis</th></tr></thead><tbody>
        <tr><td>Share</td><td className="n">{r.share.toFixed(1)}</td><td>{r.n} of {LAPSE.length} lapse stories (sample share, not prevalence)</td></tr>
        <tr><td>Exit relevance</td><td className="n">{r.exit}</td><td>Analyst-set. {WHY_WEIGHT[d].exit}</td></tr>
        <tr><td>Addressability</td><td className="n">{r.addr}</td><td>Analyst-set. {WHY_WEIGHT[d].addr}</td></tr>
        <tr><td>Evidence quality</td><td className="n">{r.ev.toFixed(3)}</td><td>0.5 + 0.5 × {recs.filter((x) => x.firstHand).length}/{r.n} first-hand</td></tr>
        <tr><td><b>Score</b></td><td className="n"><b>{r.score.toFixed(1)}</b></td><td>{r.share.toFixed(1)} × {r.exit} × {r.addr} × {r.ev.toFixed(3)} = {r.score.toFixed(2)} · rank {r.rank} of 8 (rank {volRank} by volume)</td></tr>
      </tbody></table></div>
      <p className="x-small"><b>Supporting records (first-hand):</b> {ids.map((id, i) => <span key={id}>{i ? ", " : ""}<Link href={`/evidence?id=${id}`}>{id}</Link></span>)}{recs.filter((x) => x.firstHand).length > 8 ? ` and ${recs.filter((x) => x.firstHand).length - 8} more` : ""}. <Link href={`/evidence?driver=${d}`}>All {r.n}</Link></p>
      <p className="x-small"><b>Evidence that cuts the other way:</b> {continued.length ? <>{continued.length} of these {r.n} stories say the investor kept going ({continued.slice(0, 5).map((id, i) => <span key={id}>{i ? ", " : ""}<Link href={`/evidence?id=${id}`}>{id}</Link></span>)}). </> : ""}{movedOut + movedIn} labels moved into or out of this driver between codebook v1.1 and v1.2 ({movedOut} out, {movedIn} in), so its boundary is contested.{d === "PAY" ? ` On volume alone it ranks ${volRank}th, behind platform trust (64), returns gap (58) and decides to stop (57).` : ""}</p>
      <p className="x-small"><b>What would change the order:</b> {need ? (need <= 1 ? <>{DRIVER[d]} would rank first if its exit × addressability product rose from {(r.exit * r.addr).toFixed(2)} to at least {need.toFixed(2)} (both weights stay within 0–1).</> : <>{DRIVER[d]} cannot rank first by changing its two weights alone: it would need exit × addressability = {need.toFixed(2)}, above the maximum of 1. Only a larger share (more stories) or lower weights for {DRIVER[top.driver]} would move it.</>) : <>{DRIVER[d]} is first. It stays first unless its exit × addressability product ({(r.exit * r.addr).toFixed(2)}) falls below {keep ? keep.toFixed(2) : "—"}, the level at which {DRIVER[second.driver]} overtakes it.</>}</p>
      <p className="x-small"><b>Limitations:</b> the two weights are analyst judgements, not measurements; shares come from a purposive sample (see Methodology → Sampling); the score is a prioritisation heuristic, not a predicted retention effect.</p>
      <h3 className="x-h3">Component scales</h3>
      <div className="x-tablewrap"><table className="x-table"><thead><tr><th>Component</th><th>How it's set</th><th>Range</th><th>Meaning</th></tr></thead><tbody>{SCALE.map(([a, b, c, e]) => <tr key={a}><td>{a}</td><td>{b}</td><td>{c}</td><td>{e}</td></tr>)}</tbody></table></div>
      <p className="x-small">Drivers are mutually exclusive: each lapse story has one primary driver, so the eight counts add up to {LAPSE.length}. The sliders above are a sensitivity exercise, not a statistical confidence interval.</p>
    </section>
  );
}
