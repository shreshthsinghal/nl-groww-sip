"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Search, X, Download } from "lucide-react";
import R from "@/lib/research.json";
import { keywordPattern } from "@/lib/patterns";
import { sb } from "@/lib/supabase";

const D = {
  PAY: "Payment failure", STOP: "Decides to stop", EXPECT: "Expectation gap", AMOUNT: "Amount vs cash", PAUSE: "Skip or pause",
  TRUST: "Platform trust", CONFUSE: "Confusing screens", OUTSIDE: "Asks outside the app", KEEP: "Kept going", OTHER: "Other"
};
const SRC = { RD: "Reddit", AS: "App Store", PS: "Play Store", YT: "YouTube", TQ: "TradingQ&A" };
const STAGE = { ONBOARD: "Setting up", EARLY: "First 6 months", LATER: "After 6 months", UNKNOWN: "Stage unknown" };
const EMO = { ANXIOUS: "Anxious", DISAPPOINTED: "Disappointed", ANGRY: "Angry", CONFUSED: "Confused", CALM: "Calm", POSITIVE: "Positive" };
const TABS = [["overview", "Overview"], ["evidence", "Evidence"], ["ask", "Ask"], ["classify", "Classify"], ["method", "Method"]];
const BY_ID = Object.fromEntries(R.items.map((i) => [i.id, i]));
const TOTAL = R.items.length;
const PII = /\b[A-Z]{5}\d{4}[A-Z]\b|\b\d{10,18}\b/i;
const EXAMPLES = [
  "My SIP got rejected twice because UPI autopay failed and nobody told me, now it says cancelled",
  "Sir 8 mahine se SIP chal rahi hai abhi bhi minus me hai, band kar du kya?",
  "I lost my job last month and want to reduce my SIP from 5000 to 1000 for a while, but the app only lets me skip or cancel"
];
const fmtDate = (d) => { const p = d.split("-"); return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+p[1] - 1] + " " + p[0]; };
function anonId() { try { let a = localStorage.getItem("sipc-anon"); if (!a) { a = crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now(); localStorage.setItem("sipc-anon", a); } return a; } catch { return "anon-" + Date.now(); } }

function Tag({ d, small }) { return <span className={"rs-tag" + (small ? " sm" : "")} data-d={d}><i aria-hidden="true" />{D[d] || d}</span>; }

export default function Research() {
  const [tab, setTab] = useState("overview");
  const [f, setF] = useState({ driver: "", src: "", stage: "", emotion: "", q: "" });
  const [open, setOpen] = useState(null);
  const [live, setLive] = useState(null);
  const anon = useRef(null);

  useEffect(() => {
    anon.current = anonId();
    const h = (location.hash || "").slice(1); if (TABS.some((t) => t[0] === h)) setTab(h);
    const onHash = () => { const x = (location.hash || "").slice(1); if (TABS.some((t) => t[0] === x)) setTab(x); };
    window.addEventListener("hashchange", onHash);
    fetch("/api/research").then((r) => r.json()).then((j) => setLive(!!j.live), () => setLive(false));
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => { const k = (e) => { if (e.key === "Escape") setOpen(null); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);

  function go(t) { setTab(t); try { history.replaceState(null, "", "#" + t); } catch {} window.scrollTo({ top: 0 }); log("tap_option", { option: "tab:" + t }); }
  function focus(next) { setF({ driver: "", src: "", stage: "", emotion: "", q: "", ...next }); go("evidence"); }
  function log(type, data) { try { sb().from("events").insert({ anon_id: anon.current || "anon-unknown", moment: "RESEARCH", type, data: { surface: "research", ...data } }).then(() => {}, () => {}); } catch {} }

  return (
    <div className="rs">
      <header className="rs-head">
        <div>
          <h1>Research</h1>
          <p>Why first SIPs lapse, from {TOTAL} first-hand stories in 19,005 public posts.</p>
        </div>
        <span className={"rs-live " + (live ? "on" : "")}>{live === null ? "Checking AI…" : live ? "Live AI on" : "Live AI off · saved answers"}</span>
      </header>
      <nav className="rs-tabs" role="tablist" aria-label="Research views">
        {TABS.map(([id, l]) => <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => go(id)}>{l}</button>)}
      </nav>
      <div className="rs-body">
        {tab === "overview" && <Overview focus={focus} openItem={setOpen} />}
        {tab === "evidence" && <Evidence f={f} setF={setF} openItem={setOpen} />}
        {tab === "ask" && <Ask live={live} openItem={setOpen} log={log} />}
        {tab === "classify" && <Classify live={live} log={log} />}
        {tab === "method" && <Method />}
      </div>
      {open && <Drawer item={BY_ID[open]} onClose={() => setOpen(null)} />}
    </div>
  );
}

/* ---------------- Overview ---------------- */
function Overview({ focus, openItem }) {
  const max = R.ranking[0].score;
  const srcs = Object.keys(SRC);
  const mx = R.matrix; const mmax = Math.max(...Object.values(mx).flatMap((r) => Object.values(r)));
  return (
    <div className="rs-stack">
      <section className="rs-answer" aria-labelledby="ans">
        <p className="rs-k">The answer</p>
        <h2 id="ans">Payment failure is the biggest fixable leak in first SIPs.</h2>
        <p>It ranks first on opportunity score (13.3, ahead of 9.7 for deciding to stop) and holds first in 945 of 1,000 resamples. Most of these stories describe a failure nobody explained, then an automatic cancellation.</p>
        <button type="button" className="rs-btn" onClick={() => focus({ driver: "PAY" })}>Read the 52 payment stories</button>
      </section>

      <section className="rs-panel" aria-labelledby="rank">
        <div className="rs-ph"><h3 id="rank">Where the 12-month metric leaks</h3><p>Opportunity score = share × how directly it ends the SIP × how much product can change it × evidence strength. Select a row to read its stories.</p></div>
        <ol className="rs-rank">
          {R.ranking.map((r, i) => (
            <li key={r.driver}>
              <button type="button" onClick={() => focus({ driver: r.driver })} aria-label={`${D[r.driver]}: score ${r.score}, ${r.n} stories. Read them.`}>
                <span className="rs-n">{i + 1}</span>
                <span className="rs-name"><Tag d={r.driver} /></span>
                <span className="rs-bar"><i data-d={r.driver} style={{ width: (r.score / max) * 100 + "%" }} /></span>
                <b>{r.score}</b>
                <span className="rs-meta">{r.n} stories · {r.share}%</span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <div className="rs-two">
        <section className="rs-panel" aria-labelledby="find">
          <div className="rs-ph"><h3 id="find">What the evidence says</h3><p>Answers to the discovery questions. Every claim cites real stories.</p></div>
          <div className="rs-finds">
            {R.findings.map((x, k) => (
              <details key={k} open={k === 2}>
                <summary>{x.q}</summary>
                <p>{x.a}</p>
                <div className="rs-cites">{x.c.map((id) => <button key={id} type="button" onClick={() => openItem(id)}>{id}</button>)}</div>
              </details>
            ))}
          </div>
        </section>
        <section className="rs-panel" aria-labelledby="mx">
          <div className="rs-ph"><h3 id="mx">Each source hears a different part</h3><p>Stories by driver and source. Darker cells hold more. Select a cell to read them.</p></div>
          <div className="rs-mx" role="table" aria-label="Stories by driver and source">
            <div role="row" className="rs-mxr hd"><span role="columnheader" />{srcs.map((s) => <span role="columnheader" key={s}>{SRC[s]}</span>)}</div>
            {["PAY", "STOP", "EXPECT", "AMOUNT", "PAUSE", "TRUST", "CONFUSE", "KEEP"].map((d) => (
              <div role="row" className="rs-mxr" key={d}>
                <span role="rowheader">{D[d]}</span>
                {srcs.map((s) => { const v = mx[d][s] || 0; const a = v / mmax; return (
                  <button role="cell" key={s} type="button" disabled={!v} onClick={() => focus({ driver: d, src: s })} aria-label={`${D[d]} in ${SRC[s]}: ${v}`} style={{ "--a": (0.08 + a * 0.92).toFixed(2) }} className={a > 0.5 ? "dk" : ""}>{v}</button>); })}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ---------------- Evidence ---------------- */
function Evidence({ f, setF, openItem }) {
  const [shown, setShown] = useState(30);
  const list = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    return R.items.filter((i) => (!f.driver || i.driver === f.driver) && (!f.src || i.src === f.src) && (!f.stage || i.stage === f.stage) && (!f.emotion || i.emotion === f.emotion) && (!q || i.text.toLowerCase().includes(q) || i.id.toLowerCase() === q))
      .sort((a, b) => (a.evidence === b.evidence ? b.date.localeCompare(a.date) : a.evidence === "STRONG" ? -1 : 1));
  }, [f]);
  useEffect(() => setShown(30), [f]);
  const set = (k, v) => setF({ ...f, [k]: v });
  const active = ["driver", "src", "stage", "emotion", "q"].filter((k) => f[k]);
  return (
    <div className="rs-stack">
      <div className="rs-drivers" role="group" aria-label="Filter by driver">
        <button type="button" aria-pressed={!f.driver} onClick={() => set("driver", "")}>All</button>
        {Object.keys(D).map((d) => <button key={d} type="button" aria-pressed={f.driver === d} onClick={() => set("driver", f.driver === d ? "" : d)} data-d={d}><i aria-hidden="true" />{D[d]}</button>)}
      </div>
      <div className="rs-filters">
        <label className="rs-search"><Search size={16} aria-hidden="true" /><span className="sr">Search stories</span><input value={f.q} onChange={(e) => set("q", e.target.value)} placeholder="Search words, e.g. autopay, EMI, red" />{f.q && <button type="button" aria-label="Clear search" onClick={() => set("q", "")}><X size={14} /></button>}</label>
        <Sel label="Source" v={f.src} on={(v) => set("src", v)} opts={SRC} all="All sources" />
        <Sel label="Stage" v={f.stage} on={(v) => set("stage", v)} opts={STAGE} all="All stages" />
        <Sel label="Feeling" v={f.emotion} on={(v) => set("emotion", v)} opts={EMO} all="All feelings" />
      </div>
      <div className="rs-count" role="status">
        <b>{list.length}</b> of {TOTAL} stories
        {active.length > 0 && <button type="button" onClick={() => setF({ driver: "", src: "", stage: "", emotion: "", q: "" })}>Clear filters</button>}
      </div>
      {list.length === 0 ? <p className="rs-empty">No stories match. Remove a filter or try a different word.</p> : (
        <ul className="rs-items">
          {list.slice(0, shown).map((i) => (
            <li key={i.id}><button type="button" onClick={() => openItem(i.id)}>
              <span className="rs-ex">“{i.text}”</span>
              <span className="rs-im"><Tag d={i.driver} small /><span>{SRC[i.src]} · {fmtDate(i.date)}</span><span>{STAGE[i.stage]}</span><span>{EMO[i.emotion]}</span>{i.evidence === "WEAK" && <span className="weak">General opinion</span>}<span className="id">{i.id}</span></span>
            </button></li>
          ))}
        </ul>
      )}
      {shown < list.length && <button type="button" className="rs-more" onClick={() => setShown(shown + 30)}>Show {Math.min(30, list.length - shown)} more</button>}
    </div>
  );
}
function Sel({ label, v, on, opts, all }) { return <label className="rs-sel"><span className="sr">{label}</span><select value={v} onChange={(e) => on(e.target.value)}><option value="">{all}</option>{Object.entries(opts).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>; }

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

/* ---------------- Method ---------------- */
function Method() {
  const steps = [["Collect", "19,005 public posts: Reddit (11,802), TradingQ&A (3,445), YouTube comments on 32 SIP videos (1,610), Play Store (1,160), App Store India (988). Pulled October 2026."], ["Filter", "Keyword match on SIP, mandate, instalment, pause and returns, then a first-person filter. 2,518 passed. Reddit, the largest source, was sampled to 280."], ["Label", "Claude tags each story with one driver, plus stage, segment, feeling and evidence strength, using a written codebook (v1.2)."], ["Score", "Opportunity = share × how directly it ends the SIP × how much product can change it × evidence strength."], ["Check", "Three blind golden sets of 20 stories, labelled by hand. Agreement rose from κ 0.15 to 0.29 to 0.50 as the codebook was tightened."]];
  const limits = [["Loud is not the same as common", "Public feedback over-represents angry, engaged voices. Counts show where pain is loud, not how common it is. Groww's own instalment data is the check."], ["Store reviews are not random", "Play Store reviews are the 1,160 'most relevant', not a random sample. App Store reviews span 2018–2026."], ["Reddit was sampled", "Of 1,553 Reddit items that passed the filters, 280 were labelled: every post with three or more lapse signals, plus seeded random samples."], ["One forum is another platform's", "TradingQ&A users are mostly Zerodha Coin investors. Their posts count only for platform-neutral SIP mechanics."], ["One AI coder, checked three times", "Agreement with a human coder reached κ 0.50, which is moderate. Treat counts as directional."]];
  return (
    <div className="rs-stack">
      <section className="rs-panel"><div className="rs-ph"><h3>How the engine works</h3><p>Five steps, from public posts to a ranked list.</p></div>
        <ol className="rs-steps">{steps.map(([t, d], k) => <li key={t}><span>{k + 1}</span><b>{t}</b><p>{d}</p></li>)}</ol></section>
      <div className="rs-two">
        <section className="rs-panel"><div className="rs-ph"><h3>How much to trust the labels</h3><p>Human–AI agreement on blind golden sets (Cohen's κ).</p></div>
          <div className="rs-kappa">{[["Round 1", 0.15, "Codebook v1"], ["Round 2", 0.29, "v1.1: clearer stop vs pause"], ["Round 3", 0.5, "v1.2: payment needs a real failure"]].map(([r, v, n]) => <div key={r}><span className="lab">{r}</span><span className="bar"><i style={{ width: v * 100 + "%" }} /></span><b>{v.toFixed(2)}</b><span className="note">{n}</span></div>)}</div>
          <p className="rs-note">Payment failure stays first in 945 of 1,000 bootstrap resamples and 937 of 1,000 random nudges to the weights.</p></section>
        <section className="rs-panel"><div className="rs-ph"><h3>Limits</h3><p>Read these before quoting a number.</p></div>
          <dl className="rs-limits">{limits.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}</dl></section>
      </div>
      <p className="rs-note">The full codebook, golden sets and every correction are in the AI Evidence Log. <a href="/research-v1/index.html">The first version of this page</a> is kept for reference.</p>
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
