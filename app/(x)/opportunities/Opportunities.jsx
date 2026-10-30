"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DS, RECORDS, RANKED, DRIVER, DRIVER_SHORT, COLOR, SRC, W, WHY_WEIGHT, rankDrivers, bootstrap, weightNudge, pct } from "@/lib/discovery/core";
import { Head, Bars, DriverPill } from "@/components/x/ui";

const PRESETS = [
  ["Original model", { a: 1, b: 1, c: 1, d: 1 }], ["Volume only", { a: 1, b: 0, c: 0, d: 0 }], ["Ignore exit relevance", { a: 1, b: 0, c: 1, d: 1 }],
  ["Ignore addressability", { a: 1, b: 1, c: 0, d: 1 }], ["Frequency counts double", { a: 2, b: 1, c: 1, d: 1 }], ["Evidence quality counts triple", { a: 1, b: 1, c: 1, d: 3 }]
];
const FACTORS = [["a", "Frequency (share)"], ["b", "Exit relevance"], ["c", "Addressability"], ["d", "Evidence quality"]];

export default function Opportunities() {
  const sp = useSearchParams(); const src = sp.get("src") || "";
  const pool = useMemo(() => (src ? RECORDS.filter((r) => r.src === src) : RECORDS), [src]);
  const base = useMemo(() => rankDrivers(pool), [pool]);
  const [view, setView] = useState("score"); const [calc, setCalc] = useState("PAY");
  const [ex, setEx] = useState(PRESETS[0][1]); const [wts, setWts] = useState(W);
  const scen = useMemo(() => rankDrivers(pool, { ...ex, weights: wts }), [pool, ex, wts]);
  const [rerun, setRerun] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { const h = window.location.hash.slice(1); if (RANKED.includes(h)) { setCalc(h); document.getElementById(h)?.scrollIntoView(); } }, []);
  const vol = [...base.rows].sort((a, b) => b.n - a.n);
  const C = base.rows.find((r) => r.driver === calc);
  const leaderChanged = scen.rows[0].driver !== base.rows[0].driver;
  const custom = JSON.stringify(wts) !== JSON.stringify(W);
  function run() { setBusy(true); setTimeout(() => { setRerun({ boot: bootstrap(1000, 20261023), nudge: weightNudge(1000, 42, 0.15) }); setBusy(false); }, 30); }
  return (
    <div className="x-page">
      <Head eyebrow="Opportunity Ranking" title="Complaint volume is not the same as opportunity">The most common lapse story is not the best product opportunity. Compare the two views, open the full calculation for any driver, then change the assumptions and see what moves.</Head>
      {src && <p className="x-note info">Ranked within {SRC[src]} only ({base.N} lapse stories). <Link href="/opportunities">Rank all platforms</Link>{base.N < 60 ? " Small base: treat this as directional." : ""}</p>}

      <section className="x-card x-sec">
        <div className="x-row" style={{ justifyContent: "space-between" }}>
          <h2 className="x-h2">{view === "volume" ? "View A · Story volume" : "View B · Opportunity score"}</h2>
          <div className="x-seg" role="group" aria-label="View"><button aria-pressed={view === "volume"} onClick={() => setView("volume")}>Story volume</button><button aria-pressed={view === "score"} onClick={() => setView("score")}>Opportunity score</button></div>
        </div>
        {view === "volume"
          ? <Bars rows={vol.map((r) => ({ key: r.driver, label: DRIVER[r.driver], value: r.n, color: COLOR[r.driver] }))} max={vol[0].n} fmt={(r) => `${r.value} · ${pct(r.value, base.N, 1)}`} />
          : <Bars rows={base.rows.map((r) => ({ key: r.driver, label: DRIVER[r.driver], value: r.score, color: COLOR[r.driver] }))} max={base.rows[0].score} fmt={(r) => r.value.toFixed(1)} />}
        <p className="x-small">{view === "volume" ? `Share of ${base.N} lapse stories. ${DRIVER[vol[0].driver]} is the largest.` : "Score = share × exit relevance × addressability × evidence quality. Higher means more stories, closer to an exit, and more fixable in the app."}</p>
        <p className="x-note info"><b>Why trust has more stories but payment failure ranks first.</b> Trust: {base.rows.find((r) => r.driver === "TRUST").n} stories × exit 0.5 × addressability 0.3. Payment failure: {base.rows.find((r) => r.driver === "PAY").n} stories × exit 1.0 × addressability 0.9. Trust problems (allotment, registrar, bank timelines) rarely end a SIP on their own and are mostly operations. A failed instalment counts towards automatic cancellation, and its status, reason and retry all live in the app.</p>
      </section>

      <section className="x-sec" aria-labelledby="cards-t"><h2 className="x-h2" id="cards-t">The eight opportunities</h2>
        <div className="x-grid x-g2">{base.rows.map((r) => (
          <article key={r.driver} id={r.driver} className="x-card x-sec" style={{ gap: 8, borderTop: `4px solid ${COLOR[r.driver]}` }}>
            <div className="x-row" style={{ justifyContent: "space-between" }}><span className="x-pill acc">Rank {r.rank}</span><b className="x-num" style={{ fontSize: "1.4rem" }}>{r.score.toFixed(1)}</b></div>
            <h3 className="x-h3" style={{ fontSize: "1.1rem" }}>{DRIVER[r.driver]}</h3>
            <table className="x-table" style={{ fontSize: ".85rem" }}><tbody>
              <tr><td>Stories</td><td className="n">{r.n} of {base.N}</td></tr>
              <tr><td>Story share</td><td className="n">{r.share.toFixed(1)}%</td></tr>
              <tr><td>Supporting platforms</td><td className="n">{r.sources} of 5</td></tr>
              <tr><td>Exit relevance (analyst)</td><td className="n">{(wts[r.driver] || W[r.driver]).exit}</td></tr>
              <tr><td>Addressability (analyst)</td><td className="n">{(wts[r.driver] || W[r.driver]).addr}</td></tr>
              <tr><td>Evidence quality (0.5 + 0.5 × first-hand {Math.round(r.fh * 100)}%)</td><td className="n">{r.ev.toFixed(2)}</td></tr>
            </tbody></table>
            <div className="x-row"><Link className="x-btn pri" href={`/evidence?driver=${r.driver}${src ? "&src=" + src : ""}`}>Open {r.n} records</Link><button className="x-btn" onClick={() => { setCalc(r.driver); document.getElementById("calc")?.scrollIntoView({ behavior: "smooth" }); }}>Show calculation</button><Link className="x-btn" href={`/themes#${r.driver}`}>Theme</Link></div>
          </article>))}
        </div>
      </section>

      <section id="calc" className="x-card x-sec" aria-labelledby="calc-t">
        <div className="x-row" style={{ justifyContent: "space-between" }}><h2 className="x-h2" id="calc-t">Full calculation</h2>
          <select className="x-select" style={{ width: "auto" }} value={calc} onChange={(e) => setCalc(e.target.value)} aria-label="Driver">{RANKED.map((d) => <option key={d} value={d}>{DRIVER[d]}</option>)}</select></div>
        <div className="x-tablewrap"><table className="x-table"><thead><tr><th>Term</th><th>How it's computed</th><th className="n">Value</th><th>Source</th></tr></thead><tbody>
          <tr><td>Share</td><td>{C.n} {DRIVER_SHORT[calc].toLowerCase()} stories ÷ {base.N} lapse stories × 100</td><td className="n">{C.share.toFixed(2)}</td><td>Counted from records</td></tr>
          <tr><td>Exit relevance</td><td>{WHY_WEIGHT[calc].exit}</td><td className="n">{W[calc].exit}</td><td>Analyst judgement</td></tr>
          <tr><td>Addressability</td><td>{WHY_WEIGHT[calc].addr}</td><td className="n">{W[calc].addr}</td><td>Analyst judgement</td></tr>
          <tr><td>Evidence quality</td><td>0.5 + 0.5 × ({Math.round(C.fh * C.n)} first-hand ÷ {C.n})</td><td className="n">{C.ev.toFixed(3)}</td><td>Counted from records</td></tr>
          <tr><td><b>Score</b></td><td>{C.share.toFixed(2)} × {W[calc].exit} × {W[calc].addr} × {C.ev.toFixed(3)}</td><td className="n"><b>{C.score.toFixed(2)}</b></td><td>Rank {C.rank} of 8</td></tr>
        </tbody></table></div>
        <p className="x-small">Recomputed live from the 450 records; it matches the stored ranking ({DS.consistency.filter((c) => !c.ok).length} mismatches). The score has no reach, effort or confidence term, so it is not RICE. It orders where to look, not how much retention a fix would buy.</p>
      </section>

      <section id="sensitivity" className="x-card x-sec" aria-labelledby="sens-t">
        <div><div className="x-eyebrow" style={{ color: "var(--amber)" }}>Scenario analysis · not proof of retention impact</div><h2 className="x-h2" id="sens-t">Change the assumptions</h2>
          <p className="x-small">Each factor is raised to a power: 0 removes it, 1 is the original model, 2 doubles its influence. Exit and addressability weights can also be edited per driver. This shows how much the order depends on the assumptions; it says nothing about the causal effect of any fix.</p></div>
        <div className="x-row">{PRESETS.map(([l, p]) => <button key={l} className="x-btn" aria-pressed={JSON.stringify(p) === JSON.stringify(ex)} onClick={() => setEx(p)}>{l}</button>)}</div>
        <div className="x-grid x-g2">{FACTORS.map(([k, l]) => <label key={k} className="x-slider"><span>{l}</span><input type="range" min="0" max="3" step="0.25" value={ex[k]} onChange={(e) => setEx({ ...ex, [k]: +e.target.value })} /><b className="x-num">{ex[k]}</b></label>)}</div>
        <details className="x-details"><summary>Edit exit and addressability weights{custom ? " (edited)" : ""}</summary>
          <div className="x-tablewrap"><table className="x-table"><thead><tr><th>Driver</th><th>Exit (0–1)</th><th>Addressability (0–1)</th></tr></thead><tbody>
            {RANKED.map((d) => <tr key={d}><td>{DRIVER[d]}</td>{["exit", "addr"].map((f) => <td key={f}><input className="x-input" style={{ maxWidth: 90 }} type="number" min="0" max="1" step="0.05" value={wts[d][f]} aria-label={`${DRIVER[d]} ${f}`} onChange={(e) => { const v = Math.max(0, Math.min(1, +e.target.value || 0)); setWts({ ...wts, [d]: { ...wts[d], [f]: v } }); }} /></td>)}</tr>)}
          </tbody></table></div>
          <button className="x-btn" style={{ marginTop: 8 }} onClick={() => setWts(W)} disabled={!custom}>Reset weights</button>
        </details>
        <p className={"x-note " + (leaderChanged ? "bad" : "ok")} role="status"><b>{leaderChanged ? `The leader changes: ${DRIVER[scen.rows[0].driver]} is now first.` : `${DRIVER[base.rows[0].driver]} stays first under this scenario.`}</b></p>
        <div className="x-tablewrap"><table className="x-table"><thead><tr><th>Driver</th><th className="n">Original rank</th><th className="n">Scenario rank</th><th className="n">Change</th><th className="n">Scenario score</th></tr></thead><tbody>
          {scen.rows.map((r) => { const o = base.rows.find((x) => x.driver === r.driver).rank; const ch = o - r.rank; return <tr key={r.driver}><td><DriverPill d={r.driver} /></td><td className="n">{o}</td><td className="n"><b>{r.rank}</b></td><td className="n">{ch > 0 ? <span className="x-up">▲ {ch}</span> : ch < 0 ? <span className="x-down">▼ {-ch}</span> : "—"}</td><td className="n">{r.score >= 100 ? r.score.toFixed(0) : r.score.toFixed(2)}</td></tr>; })}
        </tbody></table></div>
      </section>

      <section className="x-card x-sec" aria-labelledby="stab-t">
        <h2 className="x-h2" id="stab-t">Ranking stability</h2>
        <div className="x-grid x-g2">
          <div className="x-card flat"><b className="x-num" style={{ fontSize: "1.6rem" }}>{DS.stability.bootstrap.kept} / {DS.stability.bootstrap.of.toLocaleString("en-IN")}</b><p>bootstrap resamples kept payment failure first (recorded).</p><p className="x-small">Method: draw 352 lapse stories with replacement from the 352, recompute every score with the original weights, record the top driver; repeat 1,000 times. Seed {DS.stability.bootstrap.seed}. Unit resampled: the {DS.stability.bootstrap.unit}.</p></div>
          <div className="x-card flat"><b className="x-num" style={{ fontSize: "1.6rem" }}>{DS.stability.nudge.kept} / {DS.stability.nudge.of.toLocaleString("en-IN")}</b><p>weight-nudge runs kept payment failure first (recorded).</p><p className="x-small">Method: move each driver's exit and addressability weight by a random amount up to ±0.15, recompute, record the top driver; repeat 1,000 times. Seed {DS.stability.nudge.seed}.</p></div>
        </div>
        <div className="x-row"><button className="x-btn pri" onClick={run} disabled={busy}>{busy ? "Running 2,000 runs…" : rerun ? "Run again" : "Re-run both checks in this browser"}</button><span className="x-small">Uses a seeded generator (mulberry32), so the result is reproducible here.</span></div>
        {rerun && <div className="x-grid x-g2" role="status">
          {[["Bootstrap re-run", rerun.boot], ["Weight-nudge re-run", rerun.nudge]].map(([l, w]) => <div key={l} className="x-card flat"><b>{l}</b><p className="x-num">Payment failure first in <b>{w.PAY || 0}</b> of 1,000.{Object.entries(w).filter(([k]) => k !== "PAY").map(([k, v]) => ` ${DRIVER_SHORT[k]}: ${v}.`).join("")}</p></div>)}
          <p className="x-small" style={{ gridColumn: "1/-1" }}>The re-run uses a different random-number generator from the original, which wasn't recorded, so the counts differ by a few dozen. What matters is that both land in the same range. These are counts of runs, not confidence intervals, and no interval was calculated.</p>
        </div>}
        <p className="x-note"><b>What stability does not cover.</b> Resampling tests whether the order survives noise in which stories were drawn. It cannot fix a biased sample: Reddit-heavy sources, an undocumented selection of the 450, and AI labels with κ 0.50 agreement on 20 records. With all analyst weights removed, payment failure ranks {rankDrivers(pool, { b: 0, c: 0, d: 0 }).rows.find((r) => r.driver === "PAY").rank}th, so the lead rests on the weights.</p>
      </section>
    </div>
  );
}
