"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DS, RECORDS, RANKED, LAPSE_N, DRIVER, DRIVER_SHORT, DEF, COLOR, SRC, SRC_ORDER, STAGE, EMO, countBy, pct, rankDrivers } from "@/lib/discovery/core";
import { Head, Bars, EvidenceCard, useEvidence, IdChips, Dot, SrcTag } from "@/components/x/ui";

// Sub-themes are phrase matches on the excerpt, computed in the browser. A record can sit in several.
const SUB = {
  PAY: [["Low balance on debit day", /insufficient|low balance|balance|funds/i], ["Mandate or autopay trouble", /mandate|autopay|auto pay|nach|upi/i], ["Bounce charge or penalty", /charge|penalty|fee/i], ["Money debited, units not shown", /(debited|deducted)[^.]{0,60}(not|no|without)[^.]{0,30}(units|allot|invest|reflect)/i], ["SIP auto-cancelled", /cancel/i]],
  STOP: [["Returns disappointing", /return|loss|negative|red|minus/i], ["Needs the money", /emergency|need (the )?money|urgent|loan|emi|wedding|house/i], ["Switching fund or platform", /switch|another fund|other fund|zerodha|coin|kuvera|paytm|direct plan/i], ["Asking whether to stop", /should i|what (should|to) do/i]],
  EXPECT: [["Compares with FD or savings", /\bfd\b|fixed deposit|saving/i], ["Portfolio in the red", /red|negative|loss|minus|down/i], ["Anchored on a rate (12%, 15%)", /1[0-5] ?%/i], ["Impatient about time", /month|year|still|only/i]],
  AMOUNT: [["EMI, loan or debt", /\bemi\b|loan|debt|credit card/i], ["Job or income change", /job|salary|income|layoff/i], ["Wants a lower amount", /reduce|lower|decrease|less amount/i], ["Monthly expenses", /expense|rent|bill|afford/i]],
  PAUSE: [["Uses the pause feature", /pause/i], ["Skips an instalment", /skip/i], ["Plans to restart", /restart|resume|start again|continue after/i]],
  TRUST: [["Units or allotment delayed", /allot|units|nav/i], ["Redemption or withdrawal", /redeem|redemption|withdraw/i], ["Mismatch or missing money", /mismatch|missing|wrong|discrepan|not (showing|reflect)/i], ["Support unresponsive", /support|customer care|no response|ticket|complain/i]],
  CONFUSE: [["NAV or units", /\bnav\b|units/i], ["Returns figure (XIRR, absolute)", /xirr|absolute|returns? (shown|showing)|percentage/i], ["Order or instalment status", /status|pending|processing|order/i]],
  OUTSIDE: [["Creator or video", /youtube|video|creator|influencer|sir/i], ["Friends or family", /friend|family|father|mother|brother/i], ["Asks strangers what to do", /should i|what to do|suggest|advice/i]]
};
const LIMITS = {
  PAY: "Counts fell from 74 to 52 when codebook v1.2 stopped treating set-up questions as failures. Most stories don't say whether the SIP ended.",
  STOP: "The tie rule moves any story that states a stop into STOP, so STOP absorbs cases whose underlying cause is returns or money.",
  EXPECT: "Returns talk is often about markets, not the product. Many are questions rather than lapses.",
  AMOUNT: "Money circumstances are rarely stated in full; phrase matches undercount them.",
  PAUSE: "A pause that never restarts looks like a stop, but the text rarely says what happened next.",
  TRUST: "Concentrated in app-store reviews, which skew to angry one-star posts. Mostly operations, not product.",
  CONFUSE: "Narrowed in v1.2 to in-app confusion only, so general concept questions are excluded.",
  OUTSIDE: "Small (10). Help-seeking with a problem is coded to the problem."
};

export default function Themes() {
  const sp = useSearchParams(); const { open } = useEvidence();
  const [d, setD] = useState(() => { const h = typeof window !== "undefined" ? window.location.hash.slice(1) : ""; return RANKED.includes(h) ? h : "PAY"; });
  const src = sp.get("src") || "";
  const pool = useMemo(() => RECORDS.filter((r) => !src || r.src === src), [src]);
  const lapse = pool.filter((r) => r.lapse); const its = lapse.filter((r) => r.driver === d);
  const fh = its.filter((r) => r.firstHand).length;
  const support = [...its].sort((a, b) => (b.golden.some((g) => g.agree) - a.golden.some((g) => g.agree)) || (b.firstHand - a.firstHand) || (Object.keys(b.sig).length - Object.keys(a.sig).length)).slice(0, 4);
  const contra = [
    ...its.filter((r) => r.sig.outcome && r.sig.outcome.v === "Continued").map((r) => ({ r, why: "Coded here, but says they continued" })),
    ...pool.filter((r) => r.golden.some((g) => g.ai === d && g.human !== d)).map((r) => ({ r, why: `AI said ${DRIVER_SHORT[d]}; human said ${DRIVER_SHORT[r.golden.find((g) => g.ai === d && g.human !== d).human]}` })),
    ...pool.filter((r) => r.override && r.override.from === d).map((r) => ({ r, why: `Was ${DRIVER_SHORT[d]} in v1.1; moved to ${DRIVER_SHORT[r.driver]} (${r.override.rule})` }))
  ];
  const outcomes = countBy(its, (r) => r.sig.outcome?.v || "Not stated");
  const row = rankDrivers(pool).rows.find((x) => x.driver === d);
  return (
    <div className="x-page">
      <Head eyebrow="Insight Analysis" title="What each lapse driver looks like up close">Pick a driver to see how many stories support it, where they come from, the sub-themes inside it, and the records that cut against it.{src ? ` Showing ${SRC[src]} only.` : ""}</Head>
      {src && <p className="x-note info">Filtered to {SRC[src]} ({lapse.length} lapse stories). <Link href="/themes">Show all platforms</Link></p>}
      <div className="x-tabs" role="tablist" aria-label="Lapse drivers">{RANKED.map((k) => <button key={k} role="tab" aria-selected={d === k} onClick={() => { setD(k); history.replaceState(null, "", "#" + k); }}><Dot d={k} />{DRIVER_SHORT[k]} <span className="x-num">{lapse.filter((r) => r.driver === k).length}</span></button>)}</div>

      <section className="x-grid x-g3" aria-live="polite">
        <div className="x-card x-sec" style={{ gridColumn: "span 1" }}>
          <h2 className="x-h2" style={{ color: COLOR[d] }}>{DRIVER[d]}</h2>
          <p style={{ fontSize: ".92rem" }}>{DEF[d]}</p>
          <dl className="x-dl" style={{ gridTemplateColumns: "1fr auto" }}>
            <dt>Stories</dt><dd className="x-num">{its.length}</dd>
            <dt>Share of {lapse.length} lapse stories</dt><dd className="x-num">{pct(its.length, lapse.length)}</dd>
            <dt>Share of all {pool.length} coded</dt><dd className="x-num">{pct(its.length, pool.length)}</dd>
            <dt>First-hand</dt><dd className="x-num">{fh} of {its.length} ({pct(fh, its.length, 0)})</dd>
            <dt>Opportunity rank</dt><dd className="x-num">{row?.rank} of 8</dd>
          </dl>
          <Link className="x-btn pri" href={`/evidence?driver=${d}${src ? "&src=" + src : ""}`}>Open all {its.length} records</Link>
        </div>
        <div className="x-card x-sec"><h3 className="x-h3">Platforms (n = {its.length})</h3><Bars rows={SRC_ORDER.map((k) => ({ key: k, label: SRC[k], value: its.filter((r) => r.src === k).length, color: COLOR[d] }))} max={its.length || 1} fmt={(r) => `${r.value} · ${pct(r.value, its.length || 1, 0)}`} />
          <h3 className="x-h3">Stage (AI-coded)</h3><Bars rows={Object.keys(STAGE).map((k) => ({ key: k, label: STAGE[k], value: its.filter((r) => r.stage === k).length, color: "var(--ink-2)" }))} max={its.length || 1} />
        </div>
        <div className="x-card x-sec"><h3 className="x-h3">Common sub-themes <SrcTag k="explicit" /></h3>
          <p className="x-small">Phrase matches on the excerpt. A record can match several or none. Select one to see the records.</p>
          {(SUB[d] || []).map(([label, re]) => { const m = its.filter((r) => re.test(r.text)); return (
            <button key={label} className="x-bar" style={{ gridTemplateColumns: "minmax(0,1fr) 70px" }} onClick={() => m[0] && open(m[0].id)} title="Opens the first matching record"><span>{label}</span><span className="v">{m.length} · {pct(m.length, its.length || 1, 0)}</span></button>); })}
          <h3 className="x-h3">What they say they did <SrcTag k="explicit" /></h3>
          <Bars rows={Object.entries(outcomes).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ key: k, label: k, value: v, color: k === "Not stated" ? "var(--line-2)" : "var(--teal)" }))} max={its.length || 1} />
          <p className="x-small">These outcomes co-occur with the driver; they don't show it caused them.</p>
        </div>
      </section>

      <section className="x-sec"><h2 className="x-h2">Supporting excerpts</h2><p className="x-small">Human-checked records first, then first-hand records with explicit phrases.</p>
        {support.length ? <div className="x-grid x-g2">{support.map((r) => <EvidenceCard key={r.id} r={r} onOpen={open} />)}</div> : <p className="x-small">No records for this driver on this platform.</p>}
      </section>

      <section className="x-grid x-g2">
        <div className="x-card x-sec"><h2 className="x-h2">Contradictory and boundary cases ({contra.length})</h2>
          {contra.length === 0 ? <p className="x-small">No counterexamples found by the three checks (stated continuation, human disagreement, rule change).</p> :
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>{contra.slice(0, 8).map(({ r, why }, i) => <li key={r.id + i}><button className="x-id" onClick={() => open(r.id)}>{r.id}</button> <span style={{ fontSize: ".9rem" }}>{why}</span></li>)}</ul>}
          {contra.length > 8 && <p className="x-small">{contra.length - 8} more: filter the Evidence Explorer by “Human disagreed with AI” or “Changed by codebook v1.2 rule”.</p>}
        </div>
        <div className="x-card x-sec"><h2 className="x-h2">Known limitations</h2><p>{LIMITS[d]}</p><p className="x-small">All shares are of public stories, not of investors. Co-occurring phrases (for example a job loss and a stop in the same post) do not establish that one causes the other.</p></div>
      </section>

      <section className="x-sec" aria-labelledby="syn-t"><h2 className="x-h2" id="syn-t">Analyst synthesis across drivers</h2>
        <p className="x-small">Written by the research team from the coded records. Each claim lists the records it rests on, so you can check it.</p>
        <div className="x-card">{DS.findings.map((f) => <div key={f.q} className="x-qa"><b>{f.q}</b><p style={{ fontSize: ".95rem" }}>{f.a}</p><div className="x-row"><SrcTag k="inference" /><IdChips ids={f.c} /></div></div>)}</div>
      </section>
    </div>
  );
}
