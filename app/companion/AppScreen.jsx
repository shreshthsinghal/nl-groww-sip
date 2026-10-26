"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, TriangleAlert, CircleCheck, Clock, CircleStop, Info, ArrowUp, MessageCircle, LayoutList, ShieldCheck, ShieldAlert, ExternalLink, CreditCard, CalendarDays, Minus, SkipForward, BookOpen, Wallet, X, History } from "lucide-react";
import { fmt, fmtShort, fmtDay, inr, ordinal } from "@/lib/companion/model.mjs";

const OPT_ICON = { PAY_MISSED: CreditCard, ONE_TIME: Wallet, CHANGE_DATE: CalendarDays, LOWER_AMOUNT: Minus, SKIP_NEXT: SkipForward, STOP: CircleStop, EXPLAIN: BookOpen };
const ACT_LABEL = { PAY_MISSED: "Pay missed instalment", ONE_TIME: "One-time investment", CHANGE_DATE: "Change date", LOWER_AMOUNT: "Lower amount", SKIP_NEXT: "Skip next instalment", STOP: "Stop SIP", EXPLAIN: "About this status" };
const STATUS_ICON = { alert: TriangleAlert, check: CircleCheck, clock: Clock, stop: CircleStop };
export const PII = /\b[A-Z]{5}\d{4}[A-Z]\b|\b\d{9,18}\b/i;

export const MODE = {
  live: ["ok", "Checked · live AI"], demo: ["ok", "Checked · rule-based demo answer, not live AI"], guard: ["ok", "Checked · answered without AI"],
  fallback: ["warn", "Safe fallback · the AI's answer was held back"], provider_down: ["warn", "AI unavailable · checked rule-based answer"],
  offline: ["warn", "Offline · checked on this device"], blocked: ["warn", "Safe reply"]
};

function Status({ s, v }) {
  const Icon = STATUS_ICON[v.icon] || Info;
  const n = v.n;
  return (
    <section className={"cx-status t-" + v.tone} aria-labelledby="cx-st-h">
      <div className="cx-st-top">
        <span className="cx-pill"><Icon size={16} aria-hidden="true" />{v.label}</span>
        <span className="cx-amt"><b>{inr(s.amount)}</b> a month</span>
      </div>
      <h2 id="cx-st-h">{v.headline}</h2>
      <dl className="cx-facts">
        <div><dt>Started</dt><dd>{fmt(s.start)} · {s.inst.length} instalments</dd></div>
        <div><dt>Missed in a row</dt><dd className="cx-miss"><span className="cx-steps" aria-hidden="true">{[0, 1, 2].map((i) => <i key={i} className={i < n ? "on" : ""} />)}</span>{n} of 3</dd></div>
        <div><dt>Last attempt</dt><dd>{v.la ? fmtShort(v.la.date) + " · " + ({ paid: "Paid", failed: "Failed", pending: "Pending", late: "Paid late" }[v.la.result] || "—") : "—"}</dd></div>
        <div><dt>Next instalment</dt><dd>{v.nx ? fmtDay(v.nx) : "None"}</dd></div>
      </dl>
    </section>
  );
}

function Story({ v, onOpen }) {
  return (
    <section className="cx-story" aria-label="What happened and what it means">
      <div><h3>What happened</h3><p>{v.happened}</p></div>
      <div><h3>What it means</h3><p>{v.means}</p></div>
      <div><h3>What you can do</h3><p>{v.next}</p></div>
      <button type="button" className="cx-link" onClick={() => onOpen("EXPLAIN")}>How we know this<ChevronRight size={16} aria-hidden="true" /></button>
    </section>
  );
}

function Options({ opts, onOpen }) {
  return (
    <section className="cx-opts" aria-labelledby="cx-op-h">
      <h3 id="cx-op-h">Your options</h3>
      <p className="cx-optsub">Every option is reviewed before anything changes. Nothing here is real.</p>
      <ul>
        {opts.filter((o) => o.id !== "EXPLAIN").map((o) => { const I = OPT_ICON[o.id]; return (
          <li key={o.id}><button type="button" className={o.available ? "" : "na"} onClick={() => onOpen(o.id)} aria-describedby={"cx-o-" + o.id}>
            <span className="ic"><I size={18} aria-hidden="true" /></span>
            <span className="tx"><b>{o.title}</b><span id={"cx-o-" + o.id}>{o.available ? o.sub : o.sub}</span></span>
            <ChevronRight size={18} aria-hidden="true" />
          </button></li>); })}
      </ul>
    </section>
  );
}

function Timeline({ rows }) {
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(-5);
  const ICON = { paid: CircleCheck, failed: TriangleAlert, pending: Clock, recovered: CircleCheck, scheduled: CalendarDays, skipped: SkipForward, action: History };
  return (
    <section className="cx-tl" aria-labelledby="cx-tl-h">
      <h3 id="cx-tl-h">History</h3>
      <ol>
        {shown.map((r, i) => { const I = ICON[r.kind] || Info; return (
          <li key={r.date + r.kind + i} className={"k-" + r.kind}><span className="dot"><I size={15} aria-hidden="true" /></span><span className="d">{fmtShort(r.date)}</span><span className="t"><b>{r.title}</b><span>{r.detail}</span></span></li>); })}
      </ol>
      {rows.length > 5 && <button type="button" className="cx-link" aria-expanded={all} onClick={() => setAll(!all)}>{all ? "Show recent only" : "Show all " + rows.length + " events"}</button>}
    </section>
  );
}

function Answer({ m, onOpen }) {
  const a = m.res.answer, [cls, label] = MODE[m.res.mode] || MODE.blocked;
  const sec = [["What we know", a.known], ["What it means", a.means], ["What you can do", a.todo], ["Not certain yet", a.uncertain]].filter(([, x]) => x && x.length);
  const passed = m.res.checks.filter((c) => c.ok).length;
  return (
    <article className={"cx-ans" + (m.stale ? " stale" : "")} aria-label="Companion answer">
      {sec.map(([h, x]) => <div key={h} className={"sec" + (h === "Not certain yet" ? " unc" : "")}><h4>{h}</h4><p>{x.join(" ")}</p></div>)}
      {m.res.sources && m.res.sources.length > 0 && <div className="cx-srcs"><span>Sources</span>{m.res.sources.map((x) => <a key={x.id} href={x.url} target="_blank" rel="noopener noreferrer">{x.title}<ExternalLink size={13} aria-hidden="true" /></a>)}</div>}
      {!m.stale && a.actions && a.actions.length > 0 && <div className="cx-acts">{a.actions.map((x) => <button key={x} type="button" onClick={() => onOpen(x)}>{ACT_LABEL[x] || x}</button>)}</div>}
      <p className={"cx-verify " + cls}>{cls === "ok" ? <ShieldCheck size={16} aria-hidden="true" /> : <ShieldAlert size={16} aria-hidden="true" />}<span>{label} · {passed} of {m.res.checks.length} checks passed</span></p>
      {m.res.note && m.res.mode !== "demo" && <p className="cx-anote">{m.res.note}</p>}
      <details className="cx-checks"><summary>See the checks</summary><ul>{m.res.checks.map((c) => <li key={c.k} className={c.ok ? "ok" : "no"}>{c.ok ? "✓" : "✕"} {c.label}{c.d ? " — " + c.d : ""}</li>)}</ul></details>
    </article>
  );
}

function Chat({ chat, busy, sugg, onAsk, onOpen, err, setErr, live, focusKey }) {
  const [q, setQ] = useState("");
  const end = useRef(null), input = useRef(null);
  const logRef = useRef(null);
  useEffect(() => {
    const box = logRef.current; if (!box) return;
    const smooth = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    const lastBot = [...box.querySelectorAll(".cx-ans,.cx-err")].pop();
    const lastMsg = chat[chat.length - 1];
    if (!busy && lastMsg && lastMsg.role === "bot" && lastBot) box.scrollTo({ top: lastBot.offsetTop - 12, behavior: smooth });
    else box.scrollTo({ top: box.scrollHeight, behavior: smooth });
  }, [chat.length, busy]);
  useEffect(() => { if (focusKey) input.current && input.current.focus({ preventScroll: true }); }, [focusKey]);
  const pii = PII.test(q);
  function send(text) { if (busy) return; const t = (text ?? q).trim(); if (!t) { setErr("Type a question, or pick one of the suggestions."); return; } if (PII.test(t)) { setErr("That looks like a PAN, phone or account number. It's never needed here, so please remove it."); return; } setErr(""); setQ(""); onAsk(t); }
  return (
    <div className="cx-chat">
      <div className="cx-chat-h">
        <span className="cx-av" aria-hidden="true"><MessageCircle size={18} /></span>
        <div><b>SIP Companion</b><span>{live === null ? "Checking AI…" : live ? "Live AI · answers checked before you see them" : "Rule-based demo · answers checked before you see them"}</span></div>
      </div>
      <div className="cx-log" ref={logRef} role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation">
        {chat.length === 0 && (
          <div className="cx-empty">
            <p className="h">Ask about this SIP in your own words.</p>
            <p>Answers use this SIP's status and Groww's help pages. It can't give investment advice or make changes for you.</p>
          </div>
        )}
        {chat.map((m) => m.role === "user" ? <p key={m.id} className={"cx-me" + (m.stale ? " stale" : "")}>{m.text}</p>
          : m.role === "sys" ? <p key={m.id} className="cx-sys" role="note">{m.text}</p>
          : m.role === "err" ? <div key={m.id} className="cx-err"><p>{m.text}</p>{m.retry && <button type="button" className="cx-btn ghost sm" onClick={() => onAsk(m.retry)}>Try again</button>}</div>
          : <Answer key={m.id} m={m} onOpen={onOpen} />)}
        {busy && <p className="cx-typing" aria-label="Checking an answer"><i /><i /><i /><span>Writing and checking an answer…</span></p>}
        {!busy && <div className="cx-sugg" role="group" aria-label="Suggested questions">{sugg.map((t) => <button key={t} type="button" onClick={() => send(t)}>{t}</button>)}</div>}
        <div ref={end} />
      </div>
      <form className="cx-compose" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <label htmlFor="cx-q" className="sr">Ask about this SIP</label>
        <input id="cx-q" ref={input} autoComplete="off" maxLength={300} placeholder="Ask about this SIP" value={q} aria-invalid={pii || !!err} aria-describedby="cx-q-h"
          onChange={(e) => { setQ(e.target.value); setErr(PII.test(e.target.value) ? "That looks like a PAN, phone or account number. It's never needed here, so please remove it." : ""); }} />
        <button type="submit" aria-label="Send question" disabled={busy || pii}><ArrowUp size={20} aria-hidden="true" /></button>
      </form>
      <p id="cx-q-h" className={"cx-qh" + (err ? " err" : "")} role="status">{err || "Information, not investment advice."}</p>
    </div>
  );
}

export default function AppScreen(p) {
  const { s, v, opts, tl, layout, tab, setTab, intro, dismissIntro, children } = p;
  const chatEl = <Chat chat={p.chat} busy={p.busy} sugg={p.sugg} onAsk={p.onAsk} onOpen={p.onOpen} err={p.err} setErr={p.setErr} live={p.live} focusKey={p.focusKey} />;
  const overview = (
    <div className="cx-ov">
      <Status s={s} v={v} />
      <Story v={v} onOpen={p.onOpen} />
      <Options opts={opts} onOpen={p.onOpen} />
      {layout !== "web" && <button type="button" className="cx-askcard" onClick={() => setTab("ask")}><MessageCircle size={20} aria-hidden="true" /><span><b>Questions about this SIP?</b><span>Ask SIP Companion in your own words</span></span><ChevronRight size={18} aria-hidden="true" /></button>}
      <Timeline rows={tl} />
      <p className="cx-disc">Information, not investment advice. Illustrative demo data: nothing is paid or changed.</p>
    </div>
  );
  if (layout === "web") {
    return (
      <div className="cx-web">
        <div className="cx-web-top"><b className="cx-logo"><i aria-hidden="true" />Groww-style app</b><span>Mutual funds</span><span aria-current="page">My SIPs</span><span className="cx-demo-tag">Demo data</span></div>
        <div className="cx-web-body">
          <div className="cx-web-main">
            <p className="cx-crumb">My SIPs <ChevronRight size={14} aria-hidden="true" /> Sample fund (illustrative)</p>
            {overview}
          </div>
          <aside className="cx-web-side" aria-label="SIP Companion">{chatEl}</aside>
        </div>
        {children}
      </div>
    );
  }
  return (
    <div className="cx-app">
      <header className="cx-app-h">
        {tab === "ask" ? <button type="button" className="cx-ib" aria-label="Back to SIP details" onClick={() => setTab("overview")}><ChevronLeft size={22} aria-hidden="true" /></button> : <span className="cx-ib deco" aria-hidden="true"><ChevronLeft size={22} /></span>}
        <div className="cx-app-t"><b>{tab === "ask" ? "SIP Companion" : "SIP details"}</b><span>Sample fund (illustrative)</span></div>
        <span className="cx-demo-tag">Demo</span>
      </header>
      <div className="cx-app-body">{tab === "ask" ? chatEl : <div className="cx-scroll">{overview}</div>}</div>
      <nav className="cx-tabs" aria-label="App sections">
        <button type="button" aria-current={tab === "overview" ? "page" : undefined} onClick={() => setTab("overview")}><LayoutList size={20} aria-hidden="true" /><span>Overview</span></button>
        <button type="button" aria-current={tab === "ask" ? "page" : undefined} onClick={() => setTab("ask")}><MessageCircle size={20} aria-hidden="true" /><span>Ask Companion</span>{p.unread > 0 && tab !== "ask" && <i className="cx-badge" aria-label="New answer" />}</button>
      </nav>
      {intro && tab === "overview" && (
        <div className="cx-pop" role="dialog" aria-labelledby="cx-pop-t" aria-describedby="cx-pop-d">
          <button type="button" className="cx-ib" aria-label="Dismiss introduction" onClick={dismissIntro}><X size={18} aria-hidden="true" /></button>
          <p id="cx-pop-t" className="h"><MessageCircle size={18} aria-hidden="true" />Meet SIP Companion</p>
          <p id="cx-pop-d">When an instalment slips, it explains what happened and what you can do. Answers are checked before you see them.</p>
          <button type="button" className="cx-link" onClick={() => { dismissIntro(); setTab("ask"); }}>Ask a question<ChevronRight size={16} aria-hidden="true" /></button>
        </div>
      )}
      {children}
    </div>
  );
}
