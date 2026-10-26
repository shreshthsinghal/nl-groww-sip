"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, X, Download, ListOrdered, Layers, BookOpen, MessageSquareText, Tags, FileJson, FileSpreadsheet } from "lucide-react";
import R from "@/lib/research.json";
import { keywordPattern } from "@/lib/patterns";
import { sb } from "@/lib/supabase";

const D = {
  PAY: "Payment failure", STOP: "Decides to stop", EXPECT: "Expectation gap", AMOUNT: "Amount vs cash", PAUSE: "Skip or pause",
  TRUST: "Platform trust", CONFUSE: "Confusing screens", OUTSIDE: "Asks outside the app", KEEP: "Kept going", OTHER: "Other"
};
const SRC = { RD: "Reddit", TQ: "TradingQ&A", YT: "YouTube", PS: "Play Store", AS: "App Store" };
const STAGE = { ONBOARD: "Setting up", EARLY: "First 6 months", LATER: "After 6 months", UNKNOWN: "Stage unknown" };
const EMO = { ANXIOUS: "Anxious", DISAPPOINTED: "Disappointed", ANGRY: "Angry", CONFUSED: "Confused", CALM: "Calm", POSITIVE: "Positive" };
const SEG = { SALARIED: "Salaried", IRREGULAR_INCOME: "Irregular income", STUDENT: "Student", FAMILY_MONEY: "Family money", INFLUENCER_LED: "Started via a creator", TIER2_HINT: "Outside a metro" };
const RANKED = ["PAY", "STOP", "EXPECT", "AMOUNT", "PAUSE", "TRUST", "CONFUSE", "OUTSIDE"];
const W = Object.fromEntries(R.ranking.map((r) => [r.driver, { exit: r.exit, addr: r.addr }]));
const META = {
  PAY: { t: "Payments fail, and nobody explains why", d: "An instalment, mandate or autopay fails or is rejected. The reason, the fix and how close the SIP is to cancelling stay unclear.", q: "What would a first-timer need to see on the day a debit fails to fix it before the next one?", ex: "Three misses in a row cancel the SIP automatically.", ad: "Status, reasons, retries and the debit date are inside the app." },
  STOP: { t: "A decision to stop, made alone", d: "The investor cancels, redeems or exits, often without seeing a smaller step such as lowering the amount or pausing.", q: "Which alternatives were visible at the moment they decided to stop?", ex: "Ends the SIP directly.", ad: "Some reasons, like a goal reached or a fund switch, sit outside the product." },
  EXPECT: { t: "Early red months break a 12% promise", d: "Returns in the first months are flat or red against a number set by friends, creators or calculators.", q: "Where did the expected number come from, and when did it first feel broken?", ex: "Often, but not always, leads to stopping.", ad: "The app shapes what is shown in year one, not what markets do." },
  AMOUNT: { t: "The amount stops fitting the month", d: "A job loss, EMI or expense makes the instalment too big, and lowering it is hard or unclear.", q: "How do people try to lower a SIP, and where do they give up?", ex: "A tight month usually ends in a skip or a stop.", ad: "Amount, date and step-down are product decisions." },
  PAUSE: { t: "A skip or pause with no way back", d: "They skip or pause to get through a month, then the restart is unclear or forgotten.", q: "Do paused SIPs restart on time, and what reminds people?", ex: "A pause that never restarts is an exit.", ad: "Pause length, return date and reminders are in the app." },
  TRUST: { t: "Platform trust wobbles", d: "Units arrive late, statements don't match or a redemption is slow, and worry turns into suspicion of the platform.", q: "Does a trust scare change what people do with their SIP, or only how they feel?", ex: "Rarely ends a SIP on its own.", ad: "Mostly operations: allotment, registrar and bank timelines." },
  CONFUSE: { t: "Numbers that move without a reason", d: "Screens show returns, mandate limits or totals the investor can't interpret.", q: "Which number on which screen first made them doubt the SIP?", ex: "Confusion feeds other exits more than it causes one.", ad: "Labels and explanations can change; the numbers can't." },
  OUTSIDE: { t: "Asking strangers what to do", d: "Unsure, they post their SIP, months and losses on YouTube or Reddit and ask whether to stop.", q: "What answer were they looking for that the app didn't give them?", ex: "A signal of doubt rather than an exit.", ad: "The app can explain, but cannot give advice." }
};
const TABS = [["ranked", "Ranked areas", ListOrdered], ["sources", "Source breakdown", Layers], ["ask", "Ask the evidence", MessageSquareText], ["classify", "Classify feedback", Tags], ["method", "Methodology", BookOpen]];
const BY_ID = Object.fromEntries(R.items.map((i) => [i.id, i]));
const TOTAL = R.items.length;
const PII = /\b[A-Z]{5}\d{4}[A-Z]\b|\b\d{10,18}\b/i;
const EXAMPLES = [
  "My SIP got rejected twice because UPI autopay failed and nobody told me, now it says cancelled",
  "Sir 8 mahine se SIP chal rahi hai abhi bhi minus me hai, band kar du kya?",
  "I lost my job last month and want to reduce my SIP from 5000 to 1000 for a while, but the app only lets me skip or cancel"
];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDate = (d) => { const a = d.startsWith("~"); const p = d.replace("~", "").split("-"); return (a ? "About " : "") + (p[1] ? MON[+p[1] - 1] + " " : "") + p[0] + (p[2] && !a ? "" : ""); };
const yearOf = (d) => +d.replace("~", "").slice(0, 4);
const YEARS = { "2026": "2026", "2025": "2025", "2024": "2024", "2023": "2023", old: "2022 and earlier" };
const STAGES = { early: "Setting up or first 6 months", LATER: "After 6 months" };
const NOF = { src: "", year: "", stage: "", strong: false };
const pct = (x) => (x >= 10 ? x.toFixed(1) : x.toFixed(1)) + "%";
function anonId() { try { let a = localStorage.getItem("sipc-anon"); if (!a) { a = crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now(); localStorage.setItem("sipc-anon", a); } return a; } catch { return "anon-" + Date.now(); } }

function Tag({ d, small }) { return <span className={"rs-tag" + (small ? " sm" : "")} data-d={d}><i aria-hidden="true" />{D[d] || d}</span>; }

function applyFilters(f) {
  return R.items.filter((i) => (!f.src || i.src === f.src)
    && (!f.year || (f.year === "old" ? yearOf(i.date) <= 2022 : yearOf(i.date) === +f.year))
    && (!f.stage || (f.stage === "early" ? (i.stage === "ONBOARD" || i.stage === "EARLY") : i.stage === f.stage))
    && (!f.strong || i.evidence === "STRONG"));
}
function rankAreas(items) {
  const ranked = items.filter((i) => RANKED.includes(i.driver)); const N = ranked.length;
  const rows = RANKED.map((d) => {
    const its = ranked.filter((i) => i.driver === d); const n = its.length;
    const share = N ? (n / N) * 100 : 0; const strong = n ? its.filter((i) => i.evidence === "STRONG").length / n : 0;
    const ev = 0.5 + 0.5 * strong; const score = share * W[d].exit * W[d].addr * ev;
    const bySrc = {}; its.forEach((i) => { bySrc[i.src] = (bySrc[i.src] || 0) + 1; });
    const early = n ? its.filter((i) => i.stage === "ONBOARD" || i.stage === "EARLY").length / n : 0;
    return { d, n, share, strong, ev, score: Math.round(score * 10) / 10, bySrc, sources: Object.keys(bySrc).length, early, its };
  }).sort((a, b) => b.score - a.score || b.n - a.n);
  let last = null, rank = 0; rows.forEach((r, k) => { if (!last || r.score !== last.score) rank = k + 1; r.rank = rank; last = r; });
  return { rows, N };
}
function count(list, key) { const m = {}; list.forEach((i) => { const v = i[key]; if (v) v.split(/[,;|]/).filter(Boolean).forEach((x) => { m[x] = (m[x] || 0) + 1; }); }); return Object.entries(m).sort((a, b) => b[1] - a[1]); }
function download(name, type, body) { const u = URL.createObjectURL(new Blob([body], { type })); const a = document.createElement("a"); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); }
const q = (x) => '"' + String(x ?? "").replace(/"/g, '""') + '"';

function Mark() {
  return <svg className="de-mark" width="40" height="40" viewBox="0 0 56 56" aria-hidden="true"><rect width="56" height="56" rx="16" fill="#4127A0" /><polyline points="12,38 22,28 29,33 42,18" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="42" cy="18" r="5" fill="#FF7A8E" /></svg>;
}

export default function Research() {
  const [tab, setTab] = useState("ranked");
  const [f, setF] = useState(NOF);
  const [sel, setSel] = useState("PAY");
  const [open, setOpen] = useState(null);
  const [live, setLive] = useState(null);
  const [exp, setExp] = useState(false);
  const anon = useRef(null);

  useEffect(() => {
    anon.current = anonId();
    const pick = () => { const h = (location.hash || "").slice(1); if (TABS.some((t) => t[0] === h)) setTab(h); };
    pick(); window.addEventListener("hashchange", pick);
    fetch("/api/research").then((r) => r.json()).then((j) => setLive(!!j.live), () => setLive(false));
    return () => window.removeEventListener("hashchange", pick);
  }, []);
  useEffect(() => { const k = (e) => { if (e.key === "Escape") { setOpen(null); setExp(false); } }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);

  const items = useMemo(() => applyFilters(f), [f]);
  const ranking = useMemo(() => rankAreas(items), [items]);

  function go(t) { setTab(t); try { history.replaceState(null, "", "#" + t); } catch {} window.scrollTo({ top: 0 }); log("tap_option", { option: "tab:" + t }); }
  function log(type, data) { try { sb().from("events").insert({ anon_id: anon.current || "anon-unknown", moment: "RESEARCH", type, data: { surface: "research", ...data } }).then(() => {}, () => {}); } catch {} }

  const showFilters = tab === "ranked" || tab === "sources";
  return (
    <div className="de">
      <header className="de-head">
        <div className="de-brand">
          <Mark />
          <div><p className="de-name"><b>Groww</b> <span>Discovery Engine</span></p><p className="de-tag">Why first-time investors' first SIPs lapse.</p></div>
        </div>
        <div className="de-actions">
          <span className={"rs-live " + (live ? "on" : "")}>{live === null ? "Checking AI…" : live ? "Live AI on" : "Live AI off · saved answers"}</span>
          <button type="button" className="de-export" onClick={() => setExp(true)}><Download size={16} aria-hidden="true" /> Export</button>
        </div>
      </header>
      <nav className="de-tabs" role="tablist" aria-label="Research views">
        {TABS.map(([id, l, Icon]) => <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => go(id)}><Icon size={16} aria-hidden="true" />{l}</button>)}
      </nav>
      <main className="de-body">
        {tab === "ranked" && <Hero k="First SIPs · public investor evidence" h="Small misses. Real exits." p="Explore why first-time investors' SIPs lapse, what they say in their own words, and where the product can step in." status />}
        {tab === "ranked" && <Kpis />}
        {tab === "sources" && <Hero k="Source breakdown · reviews, forums and comments" h="Different sources. The same leaks." p="See which problems recur across channels, and where the evidence is still concentrated." />}
        {showFilters && <Filters f={f} setF={setF} items={items} ranking={ranking} />}
        {tab === "ranked" && <Ranked ranking={ranking} sel={sel} setSel={setSel} log={log} />}
        {tab === "sources" && <Sources items={items} ranking={ranking} />}
        {tab === "ask" && <Ask live={live} openItem={setOpen} log={log} />}
        {tab === "classify" && <Classify live={live} log={log} />}
        {tab === "method" && <Method />}
      </main>
      <footer className="de-foot">
        <p>Public posts only · Sample patterns, not population estimates · Snapshot coded October 2026.</p>
      </footer>
      {open && <Drawer item={BY_ID[open]} onClose={() => setOpen(null)} />}
      {exp && <Export f={f} items={items} ranking={ranking} onClose={() => setExp(false)} log={log} />}
    </div>
  );
}

function Hero({ k, h, p, status }) {
  return (
    <section className="de-hero">
      <div><p className="de-k">{k}</p><h1>{h}</h1><p className="de-sub">{p}</p></div>
      {status && <span className="de-status"><i aria-hidden="true" />Snapshot complete</span>}
    </section>
  );
}

function Kpis() {
  const kept = R.items.filter((i) => i.driver === "KEEP").length; const ranked = R.items.filter((i) => RANKED.includes(i.driver)).length;
  const k = [["Public posts collected", "19,005", "Reddit, TradingQ&A, YouTube, Play Store, App Store"], ["Passed the filters", "2,518", "About a SIP, told first-hand"], ["Stories coded", String(TOTAL), `${ranked} lapse, ${kept} continuers, ${TOTAL - ranked - kept} context`], ["Lapse stories ranked", String(ranked), "The denominator for every share"], ["Areas ranked", "8", "Ways a first SIP leaks"], ["Human–AI agreement", "κ 0.50", "Moderate, after 3 codebook rounds"]];
  return <div className="de-kpis">{k.map(([l, v, s], i) => <div key={l} className={"de-kpi" + (i === 0 ? " hl" : "")}><p className="l">{l}</p><p className="v">{v}</p><p className="s">{s}</p></div>)}</div>;
}

function Filters({ f, setF, items, ranking }) {
  const set = (k, v) => setF({ ...f, [k]: v });
  const on = f.src || f.year || f.stage || f.strong;
  return (
    <div className="de-filters" role="group" aria-label="Filter evidence">
      <span className="de-fl">Filter evidence</span>
      <label><span>Source</span><select value={f.src} onChange={(e) => set("src", e.target.value)}><option value="">All sources</option>{Object.entries(SRC).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      <label><span>Published</span><select value={f.year} onChange={(e) => set("year", e.target.value)}><option value="">All dates</option>{Object.entries(YEARS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      <label><span>Stage</span><select value={f.stage} onChange={(e) => set("stage", e.target.value)}><option value="">All stages</option>{Object.entries(STAGES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      <label className="de-check"><input type="checkbox" checked={f.strong} onChange={(e) => set("strong", e.target.checked)} /><span>First-hand only</span></label>
      {on && <button type="button" className="de-clear" onClick={() => setF(NOF)}>Clear</button>}
      <p className="de-count" role="status">{items.length} stories · {ranking.N} ranked · {ranking.rows.filter((r) => r.n).length} areas</p>
    </div>
  );
}

/* ---------------- Ranked areas ---------------- */
function Ranked({ ranking, sel, setSel, log }) {
  const [mode, setMode] = useState("score");
  const detail = useRef(null);
  const rows = ranking.rows;
  const cur = rows.find((r) => r.d === sel) || rows[0];
  const max = Math.max(...rows.map((r) => (mode === "score" ? r.score : mode === "n" ? r.n : r.share)), 0.0001);
  function pick(d) { setSel(d); log("tap_option", { option: "area:" + d }); if (window.innerWidth < 900 && detail.current) detail.current.scrollIntoView({ behavior: "smooth", block: "start" }); }
  if (!ranking.N) return <p className="rs-empty">No stories match these filters. Clear a filter to see the ranking.</p>;
  return (
    <div className="de-grid">
      <aside className="de-list" aria-label="Opportunity areas">
        <div className="de-lh"><h2>Opportunity areas</h2><span>{rows.filter((r) => r.n).length} areas</span></div>
        <div className="de-seg" role="group" aria-label="Rank by">
          {[["score", "Score"], ["n", "Stories"], ["share", "% of ranked"]].map(([k, l]) => <button key={k} type="button" aria-pressed={mode === k} onClick={() => setMode(k)}>{l}</button>)}
        </div>
        <ol>
          {rows.map((r) => { const v = mode === "score" ? r.score : mode === "n" ? r.n : r.share; return (
            <li key={r.d}><button type="button" aria-current={r.d === cur.d} onClick={() => pick(r.d)} data-d={r.d}>
              <span className="no">{String(r.rank).padStart(2, "0")}</span>
              <span className="nm">{META[r.d].t}</span>
              <b>{mode === "share" ? pct(v) : v}</b>
              <span className="bar"><i style={{ width: (v / max) * 100 + "%" }} /></span>
            </button></li>); })}
        </ol>
        <p className="de-lnote">Score = share × ends the SIP × product can fix × evidence. Equal scores share a rank.</p>
      </aside>
      <section className="de-detail" ref={detail} aria-live="polite"><Area r={cur} N={ranking.N} /></section>
    </div>
  );
}

function Area({ r, N }) {
  const m = META[r.d]; const [shown, setShown] = useState(6);
  useEffect(() => setShown(6), [r.d, N]);
  const its = [...r.its].sort((a, b) => (a.evidence === b.evidence ? b.date.replace("~", "").localeCompare(a.date.replace("~", "")) : a.evidence === "STRONG" ? -1 : 1));
  const stages = count(r.its, "stage").filter(([k]) => k !== "UNKNOWN"); const feels = count(r.its, "emotion"); const segs = count(r.its, "seg");
  return (
    <>
      <div className="de-dtop" data-d={r.d}>
        <div className="de-badges"><span className="de-rank">Rank {String(r.rank).padStart(2, "0")}</span><span>Evidence across {r.sources} source{r.sources === 1 ? "" : "s"}</span><Tag d={r.d} small /></div>
        <h2>{m.t}</h2>
        <p className="de-desc">{m.d}</p>
        <div className="de-stats">
          <div><p className="l">Stories in this area</p><p className="v acc">{r.n}</p></div>
          <div><p className="l">Of ranked stories</p><p className="v">{pct(r.share)}</p></div>
          <div><p className="l">Opportunity score</p><p className="v">{r.score}</p></div>
        </div>
        <div className="de-calc" aria-label="How the score is built">
          <span><b>{r.share.toFixed(1)}</b> share</span><i>×</i><span title={m.ex}><b>{W[r.d].exit.toFixed(1)}</b> ends the SIP</span><i>×</i><span title={m.ad}><b>{W[r.d].addr.toFixed(1)}</b> product can fix</span><i>×</i><span title={`${Math.round(r.strong * 100)}% of these stories are first-hand`}><b>{r.ev.toFixed(2)}</b> evidence</span><i>=</i><span className="eq"><b>{r.score}</b></span>
        </div>
        <dl className="de-why"><div><dt>Ends the SIP</dt><dd>{m.ex}</dd></div><div><dt>Product can fix</dt><dd>{m.ad}</dd></div></dl>
        {stages.length > 0 && <div className="de-chips"><span className="lab">When</span>{stages.map(([k, v]) => <span key={k} className="chip">{STAGE[k]} <b>{v}</b></span>)}</div>}
        {feels.length > 0 && <div className="de-chips"><span className="lab">Feelings</span>{feels.map(([k, v]) => <span key={k} className="chip">{EMO[k]} <b>{v}</b></span>)}</div>}
        {segs.length > 0 && <div className="de-chips"><span className="lab">Who</span>{segs.map(([k, v]) => <span key={k} className="chip">{SEG[k] || k} <b>{v}</b></span>)}</div>}
        <div className="de-inv"><p className="t">What to investigate</p><p>{m.q}</p></div>
      </div>
      <div className="de-ev">
        <div className="de-evh"><h3>Evidence, in their words</h3><span>{r.n} {r.n === 1 ? "story" : "stories"}</span></div>
        {its.length === 0 ? <p className="rs-empty">No stories in this area under the current filters.</p> : (
          <ul>
            {its.slice(0, shown).map((i) => (
              <li key={i.id} className="de-card">
                <div className="meta"><span>{SRC[i.src]}</span><span>·</span><span>{fmtDate(i.date)}</span>{i.stars && <><span>·</span><span>{i.stars}★</span></>}<span className="pill">{STAGE[i.stage]}</span>{i.evidence === "WEAK" && <span className="pill weak">General opinion</span>}</div>
                <p className="qt">“{i.text}”</p>
                <div className="foot"><span className="feel">{EMO[i.emotion]}</span>{i.url && <a href={i.url} target="_blank" rel="noopener noreferrer">View source <ArrowUpRight size={14} aria-hidden="true" /></a>}</div>
                <details><summary>See coding notes</summary>
                  <dl><div><dt>ID</dt><dd>{i.id}</dd></div><div><dt>Area</dt><dd>{D[i.driver]}</dd></div><div><dt>Stage</dt><dd>{STAGE[i.stage]}</dd></div><div><dt>Feeling</dt><dd>{EMO[i.emotion]}</dd></div><div><dt>Evidence</dt><dd>{i.evidence === "STRONG" ? "First-hand and specific" : "General opinion"}</dd></div>{i.seg && <div><dt>Signals</dt><dd>{i.seg.split(/[,;|]/).filter(Boolean).map((x) => SEG[x] || x).join(", ")}</dd></div>}{i.date.startsWith("~") && <div><dt>Date</dt><dd>Approximate: comment age on the video</dd></div>}</dl>
                </details>
              </li>
            ))}
          </ul>
        )}
        {shown < its.length && <button type="button" className="rs-more" onClick={() => setShown(shown + 10)}>Show {Math.min(10, its.length - shown)} more</button>}
      </div>
    </>
  );
}

/* ---------------- Source breakdown ---------------- */
function Sources({ items, ranking }) {
  const [mode, setMode] = useState("rel");
  const kept = items.filter((i) => i.driver === "KEEP").length; const other = items.filter((i) => i.driver === "OTHER").length;
  const ranked = items.filter((i) => RANKED.includes(i.driver));
  const mix = Object.keys(SRC).map((s) => [s, ranked.filter((i) => i.src === s).length]);
  const rows = [...ranking.rows].filter((r) => r.n).sort((a, b) => b.n - a.n);
  const maxN = Math.max(...rows.map((r) => r.n), 1);
  return (
    <div className="de-stack">
      <section className="de-panel">
        <h2 className="de-h3">What makes up the {items.length} stories?</h2>
        <div className="de-comp">
          <div><b>{ranked.length}</b> lapse stories<span>used for ranking</span></div><i>+</i>
          <div><b>{kept}</b> continuer stories<span>not ranked</span></div><i>+</i>
          <div><b>{other}</b> context only<span>not ranked</span></div>
        </div>
        <p className="de-note">Each story gets one primary area, so the {ranked.length} lapse stories add up to the ranked total. Continuer stories, people saying why they kept going, stay beside the evidence as contrast.</p>
      </section>
      <div className="de-src">
        <section className="de-panel">
          <h2 className="de-h3">Source mix</h2>
          <p className="de-note">{ranked.length} ranked stories in this view</p>
          <ul className="de-mix">{mix.map(([s, n]) => <li key={s}><i data-s={s} aria-hidden="true" /><span>{SRC[s]}</span><b>{ranked.length ? pct((n / ranked.length) * 100) : "0%"}</b></li>)}</ul>
          <p className="de-note">Reddit was sampled down from 1,553 matching items to 280, so its weight here is a choice, not its true size.</p>
        </section>
        <section className="de-panel">
          <div className="de-sh"><h2 className="de-h3">Where each area comes from</h2>
            <div className="de-seg" role="group" aria-label="Show as">{[["rel", "Relative %"], ["n", "Story count"]].map(([k, l]) => <button key={k} type="button" aria-pressed={mode === k} onClick={() => setMode(k)}>{l}</button>)}</div></div>
          <p className="de-note">Each bar is one area. Relative % shows the source mix within that area; story count keeps bars to scale.</p>
          <ul className="de-stk">
            {rows.map((r) => (
              <li key={r.d}>
                <div className="lh"><p>{META[r.d].t}</p><span>{r.n} stories</span></div>
                <div className="track" style={{ width: mode === "n" ? (r.n / maxN) * 100 + "%" : "100%" }}>
                  {Object.keys(SRC).map((s) => { const v = r.bySrc[s] || 0; if (!v) return null; const w = (v / r.n) * 100; return <span key={s} data-s={s} style={{ width: w + "%" }} title={`${SRC[s]}: ${v}`}>{w >= 14 ? (mode === "n" ? v : Math.round(w) + "%") : ""}</span>; })}
                </div>
                <p className="lg">{Object.keys(SRC).filter((s) => r.bySrc[s]).map((s) => <span key={s}><i data-s={s} aria-hidden="true" />{SRC[s]} {mode === "n" ? r.bySrc[s] : pct((r.bySrc[s] / r.n) * 100)}</span>)}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/* ---------------- Export ---------------- */
function Export({ f, items, ranking, onClose, log }) {
  const ref = useRef(null);
  useEffect(() => { ref.current && ref.current.focus(); }, []);
  function json() {
    const out = { snapshot: "October 2026", filters: f, ranking: ranking.rows.map(({ its, ...r }) => ({ ...r, area: META[r.d].t })), stories: items };
    download("sip-discovery-engine.json", "application/json", JSON.stringify(out, null, 2)); log("tap_option", { option: "export:json" });
  }
  function csv() {
    const h = "id,source,date,area,stage,feeling,evidence,signals,excerpt,url\n";
    const b = items.map((i) => [i.id, SRC[i.src], i.date, D[i.driver], STAGE[i.stage], EMO[i.emotion], i.evidence, i.seg, i.text, i.url].map(q).join(",")).join("\n");
    download("sip-discovery-engine.csv", "text/csv", h + b); log("tap_option", { option: "export:csv" });
  }
  return (
    <div className="rs-scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="de-modal" role="dialog" aria-modal="true" aria-labelledby="exh" tabIndex={-1} ref={ref}>
        <div className="de-mh"><h2 id="exh">Export the research</h2><button type="button" aria-label="Close" onClick={onClose}><X size={18} /></button></div>
        <p className="de-note">Exports use the active filters: {items.length} stories.</p>
        <button type="button" className="de-dl" onClick={json}><FileJson size={22} aria-hidden="true" /><span><b>Evidence and analysis</b><span>JSON with every field, the ranking and the filter settings</span></span></button>
        <button type="button" className="de-dl" onClick={csv}><FileSpreadsheet size={22} aria-hidden="true" /><span><b>Evidence spreadsheet</b><span>CSV with one row per story</span></span></button>
        <p className="de-note">Excerpts are trimmed public posts. Names and handles are never included.</p>
      </div>
    </div>
  );
}

/* ---------------- Methodology ---------------- */
function Method() {
  const ranked = R.items.filter((i) => RANKED.includes(i.driver)).length; const kept = R.items.filter((i) => i.driver === "KEEP").length;
  const steps = [["Collect", "19,005 public posts, pulled in October 2026: Reddit (11,802), TradingQ&A (3,445), YouTube comments on 32 SIP videos (1,610), Play Store (1,160), App Store India (988)."], ["Filter", "A topic gate (SIP, mandate, instalment, pause, returns), then a first-person gate. 2,518 passed. Reddit's 1,553 matches were sampled to 280."], ["Code", "Claude gives each story one primary area, plus stage, feeling, signals and evidence strength, from a written codebook (v1.2)."], ["Check", "Three blind golden sets of 20 stories, coded by hand. Agreement rose from κ 0.15 to 0.29 to 0.50 as the codebook was tightened."], ["Rank", `${ranked} lapse stories form one ranking across 8 areas. ${kept} continuer stories stay beside the evidence as contrast.`]];
  const rules = ["One primary area per story. When two apply, take the one closest to the SIP ending: payment, then stop, then pause, then amount, then expectation.", "A payment story needs a real failure, rejection or cancellation. Questions about setting up a mandate are not failures.", "First-hand beats general. Advice to others (\"never stop your SIP!\") is coded as an outside voice with weak evidence.", "Keep the person's words apart from the coder's reading. Excerpts are trimmed with “…”, never reworded.", "Never invent context the text doesn't give. Unclear stage or area becomes Unknown or Other.", "YouTube dates are approximate: the comment's age on the video, not an exact date."];
  const limits = [["Loud is not common", "Public posts over-represent angry, engaged voices. Counts show where pain is loud, not how common it is. Groww's own instalment data is the real check."], ["Store reviews are not random", "Play Store gave its 1,160 'most relevant' reviews. App Store reviews span 2018 to 2026, and older ones may describe features that have changed."], ["One forum is another platform's", "TradingQ&A users are mostly on Zerodha Coin, so their posts count only for platform-neutral SIP mechanics."], ["One AI coder", "Agreement with a human reached κ 0.50, which is moderate. Treat counts as directional and read the stories."]];
  return (
    <>
      <section className="de-hero"><div><p className="de-k">Methodology</p><h1>How the evidence becomes a ranking.</h1><p className="de-sub">The collection, coding and counting rules behind this research.</p></div></section>
      <div className="de-meth">
        <aside className="de-panel de-steps"><h2 className="de-h3">From posts to evidence</h2>
          <ol>{steps.map(([t, d], k) => <li key={t}><span>{k + 1}</span><div><b>{t}</b><p>{d}</p></div></li>)}</ol></aside>
        <section className="de-panel de-read">
          <p className="de-k">Coded batch · October 2026</p>
          <h2>How to read this research</h2>
          <p className="de-lead">The question is why a first-time investor's first SIP stops before month 12, and which of those reasons the product can change. This dashboard ranks problem areas and the questions worth investigating. It does not measure how common each problem is across all investors.</p>
          <h3>One shared ranking</h3>
          <div className="de-formula"><p><b>Share</b> = stories in an area ÷ all ranked stories in the active filters × 100</p><p><b>Opportunity score</b> = share × ends the SIP (0–1) × product can fix (0–1) × evidence</p><p><b>Evidence</b> = 0.5 + 0.5 × the share of first-hand stories, so general opinions count half</p></div>
          <p className="de-note">The two weights are set once per area and shown on every area page, so nothing is hidden. Filters change the shares and scores; the weights stay fixed. Equal scores share a rank.</p>
          <h3>What is in this snapshot</h3>
          <div className="de-comp"><div><b>{ranked}</b> lapse stories<span>ranked</span></div><div><b>{kept}</b> continuers<span>contrast, not ranked</span></div><div><b>{TOTAL - ranked - kept}</b> context<span>not ranked</span></div></div>
          <h3>How much to trust the labels</h3>
          <div className="rs-kappa">{[["Round 1", 0.15, "Codebook v1"], ["Round 2", 0.29, "v1.1: clearer stop vs pause"], ["Round 3", 0.5, "v1.2: payment needs a real failure"]].map(([r, v, n]) => <div key={r}><span className="lab">{r}</span><span className="bar"><i style={{ width: v * 100 + "%" }} /></span><b>{v.toFixed(2)}</b><span className="note">{n}</span></div>)}</div>
          <p className="de-note">Payment failure stays first in 945 of 1,000 bootstrap resamples and 937 of 1,000 random nudges to the weights. Logged corrections: a finding that cited a story that doesn't exist, 22 set-up questions miscounted as failures, and 19 tie-rule misses.</p>
          <h3>Coding rules</h3>
          <ul className="de-rules">{rules.map((x) => <li key={x}>{x}</li>)}</ul>
          <h3>Limitations</h3>
          <dl className="rs-limits">{limits.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}</dl>
          <p className="de-note">The first version of this page is kept at <a href="/research-v1">/research-v1</a>. The investor-facing engine is at <a href="/engine">/engine</a>.</p>
        </section>
      </div>
    </>
  );
}

/* ---------------- Ask ---------------- */
function Ask({ live, openItem, log }) {
  const [q, setQ] = useState(""); const [busy, setBusy] = useState(false); const [res, setRes] = useState(null); const [err, setErr] = useState("");
  async function ask(text) {
    const s = (text ?? q).trim(); if (!s || busy) return;
    if (PII.test(s)) { setErr("That looks like a PAN, phone or account number. Remove it first."); return; }
    setQ(s); setErr(""); log("ask", { len: s.length });
    const saved = R.findings.find((x) => x.q === s);
    if (!live) {
      if (saved) { setRes({ text: saved.a, cited: saved.c, saved: true, q: s }); return; }
      setRes(null); setErr("Live AI isn't switched on yet. Pick one of the questions below for a saved answer."); return;
    }
    setBusy(true); setRes(null);
    try {
      const r = await fetch("/api/research", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "ask", q: s }) });
      const j = await r.json();
      if (j.error) { if (saved) setRes({ text: saved.a, cited: saved.c, saved: true, q: s }); else setErr(j.error === "rate_limited" ? "Too many questions in a minute. Wait a moment." : j.error === "pii" ? "Remove PAN, phone or account numbers first." : "The AI didn't answer. Try again, or pick a saved question."); }
      else setRes({ ...j, q: s });
    } catch { setErr("No connection. Try again."); }
    setBusy(false);
  }
  const parts = res ? res.text.split(/(\[[A-Z]\d+\])/g) : [];
  return (
    <div className="rs-stack narrow">
      <div className="rs-ph"><h3>Ask the evidence</h3><p>Answers come only from the {TOTAL} labelled stories, with each claim cited. Under three supporting stories, it says so instead of guessing. It never recommends funds.</p></div>
      <form className="rs-ask" onSubmit={(e) => { e.preventDefault(); ask(); }}>
        <label className="sr" htmlFor="rsq">Your question</label>
        <textarea id="rsq" rows={3} maxLength={300} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) ask(); }} placeholder="What happens just before a first-time investor's SIP payments start failing?" />
        <div className="rs-row"><p className="rs-err" role="status">{err}</p><button type="submit" className="rs-btn" disabled={busy || !q.trim()}>{busy ? "Reading the evidence…" : "Ask"}</button></div>
      </form>
      <div className="rs-sugg" role="group" aria-label="Suggested questions">{R.findings.map((x) => <button key={x.q} type="button" onClick={() => ask(x.q)}>{x.q}</button>)}</div>
      {res && (
        <section className="rs-answerbox" aria-live="polite">
          <p className="rs-k">{res.saved ? "Saved answer" : "Answer from " + (res.model || "Claude")}</p>
          <p className="rs-atext">{parts.map((p, k) => { const m = p.match(/^\[([A-Z]\d+)\]$/); if (m) return BY_ID[m[1]] ? <button key={k} type="button" className="rs-cite" onClick={() => openItem(m[1])}>{m[1]}</button> : <span key={k} className="rs-bad" title="Not a real story ID">{m[1]}?</span>; return <span key={k}>{p}</span>; })}</p>
          {res.saved && <div className="rs-cites">{res.cited.map((id) => <button key={id} type="button" onClick={() => openItem(id)}>{id}</button>)}</div>}
          {res.invalid && res.invalid.length > 0 && <p className="rs-warn">{res.invalid.length} citation{res.invalid.length > 1 ? "s" : ""} didn't match a real story and {res.invalid.length > 1 ? "are" : "is"} marked with “?”. Don't quote {res.invalid.length > 1 ? "them" : "it"}.</p>}
        </section>
      )}
    </div>
  );
}

/* ---------------- Classify ---------------- */
function Classify({ live, log }) {
  const [text, setText] = useState(EXAMPLES.join("\n")); const [busy, setBusy] = useState(false); const [rows, setRows] = useState(null); const [err, setErr] = useState(""); const [src, setSrc] = useState("");
  const lines = text.split(/\n+/).map((l) => l.replace(/^\s*[-*•\d.)]+\s*/, "").trim()).filter(Boolean);
  async function run() {
    if (busy || !lines.length) return;
    if (lines.length > 15) { setErr("Up to 15 lines at a time."); return; }
    if (lines.some((l) => PII.test(l))) { setErr("A line looks like it has a PAN, phone or account number. Remove it first."); return; }
    setErr(""); log("ask", { mode: "classify", n: lines.length });
    if (!live) { setRows(lines.map((line) => { const k = keywordPattern(line); return { line, relevant: k.pattern !== "NONE", driver: k.pattern === "NONE" ? "OTHER" : k.pattern, stage: "UNKNOWN", emotion: "", confidence: 0.4, why: "Keyword match only. Live AI is off.", kw: true }; })); setSrc("Keyword guess (live AI is off)"); return; }
    setBusy(true); setRows(null);
    try { const r = await fetch("/api/research", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "classify", lines }) }); const j = await r.json();
      if (j.error) setErr(j.error === "rate_limited" ? "Too many runs in a minute. Wait a moment." : j.error === "pii" ? "Remove PAN, phone or account numbers first." : "The AI didn't answer. Try again."); else { setRows(j.rows); setSrc("Labelled by " + j.model); }
    } catch { setErr("No connection. Try again."); }
    setBusy(false);
  }
  const counted = rows ? rows.filter((r) => r.relevant && r.confidence >= 0.7) : [];
  function csv() { const h = "line,relevant,driver,stage,emotion,confidence,why\n"; const b = rows.map((r) => [r.line, r.relevant, r.driver, r.stage, r.emotion, r.confidence, r.why].map((x) => '"' + String(x ?? "").replace(/"/g, '""') + '"').join(",")).join("\n"); const u = URL.createObjectURL(new Blob([h + b], { type: "text/csv" })); const a = document.createElement("a"); a.href = u; a.download = "sip-feedback-labels.csv"; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); }
  return (
    <div className="rs-stack">
      <div className="rs-ph"><h3>Classify new feedback</h3><p>Paste up to 15 reviews, tickets or comments, one per line, in any language including Hinglish. Each gets the same labels as the {TOTAL} stories. Labels under 0.7 confidence are held for human review.</p></div>
      <div className="rs-cls">
        <div className="rs-clsin">
          <label className="sr" htmlFor="rsl">Feedback lines</label>
          <textarea id="rsl" rows={8} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(); }} />
          <div className="rs-row"><p className={"rs-err" + (lines.length > 15 ? "" : " muted")} role="status">{err || `${lines.length} of 15 lines`}</p><button type="button" className="rs-btn" onClick={run} disabled={busy || !lines.length}>{busy ? "Labelling…" : "Label these lines"}</button></div>
        </div>
        {rows && (
          <div className="rs-clsout" aria-live="polite">
            <div className="rs-sum"><span><b>{counted.length}</b> counted</span><span><b>{rows.length - counted.length}</b> held for review or off-topic</span><span className="src">{src}</span><button type="button" className="rs-ghost" onClick={csv}><Download size={15} aria-hidden="true" /> Export CSV</button></div>
            <ul className="rs-labels">
              {rows.map((r, k) => { const held = !r.relevant || r.confidence < 0.7; return (
                <li key={k} className={held ? "held" : ""}>
                  <p className="rs-line">{r.line}</p>
                  <div className="rs-lm">{r.relevant ? <Tag d={r.driver} small /> : <span className="rs-tag sm off">Off-topic</span>}{r.stage && r.stage !== "UNKNOWN" && <span>{STAGE[r.stage]}</span>}{r.emotion && <span>{EMO[r.emotion]}</span>}
                    <span className="rs-conf" aria-label={`Confidence ${Math.round(r.confidence * 100)}%`}><i style={{ width: r.confidence * 100 + "%" }} /></span><span>{Math.round(r.confidence * 100)}%</span>{held && <span className="rs-review">Needs review</span>}</div>
                  {r.why && <p className="rs-why">{r.why}</p>}
                </li>); })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Drawer ---------------- */
function Drawer({ item, onClose }) {
  const ref = useRef(null);
  useEffect(() => { const prev = document.activeElement; ref.current && ref.current.focus(); return () => prev && prev.focus && prev.focus(); }, []);
  if (!item) return null;
  const cited = R.findings.filter((x) => x.c.includes(item.id));
  return (
    <div className="rs-scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="rs-drawer" role="dialog" aria-modal="true" aria-label={"Story " + item.id} tabIndex={-1} ref={ref}>
        <div className="rs-dh"><span className="id">{item.id}</span><button type="button" aria-label="Close" onClick={onClose}><X size={18} /></button></div>
        <p className="rs-dq">“{item.text}”</p>
        <dl className="rs-dl">
          <div><dt>Driver</dt><dd><Tag d={item.driver} /></dd></div>
          <div><dt>Source</dt><dd>{SRC[item.src]} · {fmtDate(item.date)}{item.stars ? " · " + item.stars + "★" : ""}</dd></div>
          <div><dt>Stage</dt><dd>{STAGE[item.stage]}</dd></div>
          <div><dt>Feeling</dt><dd>{EMO[item.emotion]}</dd></div>
          <div><dt>Evidence</dt><dd>{item.evidence === "STRONG" ? "First-hand and specific" : "General opinion"}</dd></div>
          {item.seg && <div><dt>Signals</dt><dd>{item.seg.split(/[,;|]/).filter(Boolean).join(", ").replace(/_/g, " ").toLowerCase()}</dd></div>}
          {cited.length > 0 && <div><dt>Cited in</dt><dd>{cited.map((c) => c.q).join("; ")}</dd></div>}
        </dl>
        {item.url && <a className="rs-btn ghost" href={item.url} target="_blank" rel="noopener noreferrer">Open the source <ArrowUpRight size={15} aria-hidden="true" /></a>}
        <p className="rs-note">Excerpts are trimmed with “...”. Names are never shown.</p>
      </aside>
    </div>
  );
}
