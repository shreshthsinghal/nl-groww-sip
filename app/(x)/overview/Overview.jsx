"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DS, RECORDS, LAPSE_N, DRIVER, DRIVER_SHORT, COLOR, SRC, SRC_ORDER, RANKED, rankDrivers, countBy, pct } from "@/lib/discovery/core";
import { Head, Kpi, Bars, DriverPill } from "@/components/x/ui";

const R3 = DS.rounds[2];
const FH = RECORDS.filter((r) => r.firstHand).length;
const GOLD = DS.rounds.reduce((s, r) => s + r.n, 0);
const STEPS = [
  { k: "collect", n: DS.collected.total.toLocaleString("en-IN"), t: "Collected", s: "Public posts and reviews", href: "/methodology#q1", body: `${DS.collected.total.toLocaleString("en-IN")} public posts, comments and reviews from five platforms, gathered in ${DS.collected.window}. Reddit is ${DS.collected.RD.toLocaleString("en-IN")} of them (${pct(DS.collected.RD, DS.collected.total, 0)}).` },
  { k: "filter", n: DS.passed.toLocaleString("en-IN"), t: "Passed filters", s: "About a SIP and a person", href: "/methodology#q5", body: `${DS.passed.toLocaleString("en-IN")} passed keyword and relevance filters (about SIPs, about continuing, not spam). The records filtered out were not kept, so they can't be inspected.` },
  { k: "select", n: DS.coded, t: "Coded", s: "Selection rule undocumented", href: "/methodology#q7", body: "450 were coded in full. The rule used to choose them from the 2,518 was not recorded. It was not a random or stratified sample. ID ranges show that each platform's candidate list was only partly coded." },
  { k: "code", n: "v1.2", t: "Labelled by AI", s: "Codebook, 3 versions", href: "/quality#codebook", body: `An AI coder assigned one primary driver, stage, emotion, segment signals and first-hand status to each record. Codebook v1.2 changed ${DS.overrides.length} labels from v1.1, each with a written rule.` },
  { k: "validate", n: GOLD, t: "Human-checked", s: "3 blind rounds of 20", href: "/quality", body: `${GOLD} human labels over 3 rounds of 20. In the latest round, AI and human agreed on ${R3.agree} of ${R3.n} (κ ${R3.kappa.toFixed(2)}, moderate). That is too small for strong confidence.` },
  { k: "rank", n: "8", t: "Ranked", s: "Share × exit × addressability", href: "/opportunities", body: `The 8 lapse drivers are ranked by story share (of ${LAPSE_N}) × exit relevance × addressability × evidence quality. The weights are analyst judgements, and you can change them.` }
];

export default function Overview() {
  const sp = useSearchParams(); const router = useRouter();
  const [src, setSrc] = useState(sp.get("src") || ""); const [step, setStep] = useState("select");
  const bySrc = countBy(RECORDS, (r) => r.src);
  const sel = src ? RECORDS.filter((r) => r.src === src) : RECORDS;
  const rank = rankDrivers(sel); const base = rankDrivers();
  const vol = [...base.rows].sort((a, b) => b.n - a.n);
  const S = STEPS.find((x) => x.k === step);
  const pickSrc = (k) => { const v = src === k ? "" : k; setSrc(v); router.replace(v ? `/?src=${v}` : "/", { scroll: false }); };
  return (
    <div className="x-page">
      <Head eyebrow="SIP Discovery Engine 2.0 · Groww case study" title="Why first SIPs lapse, and how to check our reasoning">
        450 public stories from first-time mutual fund investors, coded into eight lapse drivers and ranked by how much a product change could help. Every number links back to the records behind it, and every judgement can be challenged.
      </Head>

      <section className="x-grid x-g4" aria-label="Key numbers">
        <Kpi value={DS.collected.total.toLocaleString("en-IN")} label="Public posts collected" def={`Five platforms, ${DS.collected.window}. Denominator for the collection stage only.`} />
        <Kpi value={DS.coded} label="Records coded" def={`From ${DS.passed.toLocaleString("en-IN")} that passed filters. ${FH} of ${DS.coded} are first-hand (${pct(FH, DS.coded, 0)}).`} />
        <Kpi value={LAPSE_N} label="Lapse stories" def={`The denominator for every driver share. The other ${DS.coded - LAPSE_N} are continuers (${DS.continuers}) or context (${DS.context}).`} />
        <Kpi value={`κ ${R3.kappa.toFixed(2)}`} label={`Human–AI agreement, n = ${R3.n}`} def={`Round 3, codebook v1.2: ${R3.agree} of ${R3.n} matched. Moderate and preliminary; up from κ ${DS.rounds[0].kappa.toFixed(2)} in round 1.`} />
      </section>

      <section className="x-sec" aria-labelledby="pipe-t">
        <h2 className="x-h2" id="pipe-t">How 19,005 posts became a ranking</h2>
        <div className="x-pipe">{STEPS.map((x) => <button key={x.k} className="x-step" aria-pressed={step === x.k} onClick={() => setStep(x.k)}><small>{x.t}</small><b>{x.n}</b><span>{x.s}</span></button>)}</div>
        <div className="x-card flat x-row" style={{ justifyContent: "space-between" }}><p style={{ maxWidth: "80ch" }}>{S.body}</p><Link className="x-btn" href={S.href}>Inspect →</Link></div>
      </section>

      <section className="x-grid x-g2">
        <div className="x-card x-sec">
          <div><h2 className="x-h2">Where the evidence comes from</h2><p className="x-small">Coded records by platform (n = {DS.coded}). Select a platform to see its driver mix, filter the evidence or re-rank within it.</p></div>
          <Bars rows={SRC_ORDER.map((k) => ({ key: k, label: SRC[k], value: bySrc[k] || 0 }))} max={DS.coded / 2.5} onPick={pickSrc} picked={src} fmt={(r) => `${r.value} · ${pct(r.value, DS.coded, 0)}`} />
          <table className="x-table" style={{ fontSize: ".82rem" }}><thead><tr><th>Platform</th><th className="n">Collected</th><th className="n">Coded</th></tr></thead><tbody>
            {SRC_ORDER.map((k) => <tr key={k}><td>{SRC[k]}</td><td className="n">{DS.collected[k].toLocaleString("en-IN")}</td><td className="n">{bySrc[k]}</td></tr>)}
          </tbody></table>
          <p className="x-note"><b>Limitation: Reddit concentration.</b> Reddit is {pct(DS.collected.RD, DS.collected.total, 0)} of everything collected and {pct(bySrc.RD, DS.coded, 0)} of the coded records. Reddit users skew towards self-directed investors who post about problems, so its framing carries more weight than any other platform's. Use the selector to see whether a finding holds outside Reddit.</p>
        </div>
        <div className="x-card x-sec">
          <div><h2 className="x-h2">{src ? `Driver mix: ${SRC[src]} only` : "Driver mix: all platforms"}</h2><p className="x-small">Lapse stories by driver (n = {rank.N}{src ? ` from ${SRC[src]}` : ""}). Shares use this denominator.</p></div>
          <Bars rows={[...rank.rows].sort((a, b) => b.n - a.n).map((r) => ({ key: r.driver, label: DRIVER_SHORT[r.driver], value: r.n, color: COLOR[r.driver] }))} fmt={(r) => `${r.value} · ${pct(r.value, rank.N, 0)}`} />
          <div className="x-row">
            <Link className="x-btn pri" href={`/evidence${src ? "?src=" + src : ""}`}>Open {sel.length} records</Link>
            <Link className="x-btn" href={`/opportunities${src ? "?src=" + src : ""}`}>Ranking {src ? "within " + SRC[src] : ""} →</Link>
            {src && <button className="x-btn" onClick={() => pickSrc(src)}>Clear platform</button>}
          </div>
          {src && <p className="x-small">Top driver on the opportunity score within {SRC[src]}: <b>{DRIVER[rank.rows[0].driver]}</b>.{rank.N < 60 ? ` With ${rank.N} lapse stories, treat this as directional.` : ""}</p>}
        </div>
      </section>

      <section className="x-sec" aria-labelledby="opp-t">
        <h2 className="x-h2" id="opp-t">The opportunity, in one line</h2>
        <p className="x-lede">Payment failure is not the most common complaint: {DRIVER[vol[0].driver].toLowerCase()} is ({vol[0].n} vs {base.rows.find((r) => r.driver === "PAY").n} of {LAPSE_N}). It ranks first because a failed instalment sits closest to an exit (three failures cancel a SIP) and is the most fixable inside the app.</p>
        <div className="x-grid x-g3">{base.rows.slice(0, 3).map((r) => (
          <Link key={r.driver} href={`/opportunities#${r.driver}`} className="x-card click x-sec" style={{ textDecoration: "none", color: "inherit", gap: 6 }}>
            <span className="x-small">Rank {r.rank} · score {r.score.toFixed(1)}</span><DriverPill d={r.driver} />
            <span className="x-num">{r.n} of {LAPSE_N} lapse stories ({r.share.toFixed(1)}%) · {r.sources} of 5 platforms</span>
            <span className="x-small">Exit {r.exit} · addressability {r.addr} · first-hand {Math.round(r.fh * 100)}%</span>
          </Link>))}
        </div>
        <p className="x-note info">Stability: payment failure stayed first in {DS.stability.bootstrap.kept} of {DS.stability.bootstrap.of} bootstrap resamples of the 352 stories, and in {DS.stability.nudge.kept} of {DS.stability.nudge.of} runs with the weights nudged ±0.15. With the weights removed, it ranks {rankDrivers(RECORDS, { b: 0, c: 0, d: 0 }).rows.find((r) => r.driver === "PAY").rank}th. <Link href="/opportunities#sensitivity">Try it yourself →</Link></p>
      </section>

      <section className="x-grid x-g4" aria-label="Modules">
        {[["/evidence", "Evidence Explorer", "Search and filter all 450 records; open any one."], ["/themes", "Insight Analysis", "Each driver: sub-themes, platforms, counterexamples."], ["/segments", "Segment Explorer", "Only attributes people actually stated."], ["/agent", "Research Agent", "Ask a question; get counts, IDs and contradictions."], ["/quality", "AI Quality", "60 human labels, disagreements, codebook changes, review."], ["/methodology", "Methodology", "12 questions about how this was built, answered."], ["/opportunities", "Opportunity Ranking", "Volume vs score, full calculation, scenarios."], ["/check", "Investor check", "The investor-facing tool built on the same data."]].map(([h, t, d]) => (
          <Link key={h} href={h} className="x-card click" style={{ textDecoration: "none", color: "inherit" }}><b>{t} →</b><p className="x-small" style={{ marginTop: 4 }}>{d}</p></Link>))}
      </section>
    </div>
  );
}
