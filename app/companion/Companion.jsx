"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Smartphone, Monitor, ShieldCheck, ShieldAlert, ArrowRight, X, ScanSearch, ChevronLeft, ChevronDown, ChevronRight, Info } from "lucide-react";
import { SCENARIOS, byId, initState, apply, describe, options, snapshot, timeline, fmtShort, fmtDay, inr, ordinal } from "@/lib/companion/model.mjs";
import { retrieve, availableActions } from "@/lib/companion/answer.mjs";
import { converse, entities } from "@/lib/companion/converse.mjs";
import { validate } from "@/lib/companion/validate.mjs";
import { FACTS, SOURCES } from "@/lib/companion/base.mjs";
import { Conversation, SipCard, MODE, EXPLORE, starterQuestions, reasonLine } from "./Chat";
import Overview, { OPT_ICON } from "./Overview";
import Flow from "./Flow";
import { sb } from "@/lib/supabase";

let uid = 0; const nid = () => ++uid;
const NEEDS_EDIT = { CHANGE_DATE: 1, LOWER_AMOUNT: 1 };
function useMedia(q) {
  const [m, setM] = useState(false);
  useEffect(() => { const mq = matchMedia(q); const f = () => setM(mq.matches); f(); mq.addEventListener("change", f); return () => mq.removeEventListener("change", f); }, [q]);
  return m;
}
function anonId() { try { let a = localStorage.getItem("sipc-anon"); if (!a) { a = crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now(); localStorage.setItem("sipc-anon", a); } return a; } catch { return "anon-" + Date.now(); } }
const srcList = (ids) => ids.flatMap((id) => (FACTS[id] ? FACTS[id].src : [])).filter((x, i, a) => a.indexOf(x) === i).map((k) => ({ id: k, ...SOURCES[k] }));
const opening = () => [];

/* Readable versions of the structured facts the answer engine sees. */
const STATUS_TXT = { ACTIVE: "Active", PROCESSING: "Result pending", LAST_INSTALMENT_FAILED: "Last instalment didn't go through", STOPPED: "Stopped" };
const RESULT_TXT = { paid: "Paid", failed: "Didn't go through", pending: "Waiting for the bank", paid_after_retry: "Paid with Pay Now", skipped: "Skipped" };
const REASON_TXT = { confirmed: "Not enough money in the linked account on the debit date (confirmed)", unknown: "Not confirmed", pending: "Waiting for the bank" };
function factRows(snap) {
  const la = snap.last_attempt;
  return [
    ["Amount", inr(snap.amount) + " a month"], ["Instalment day", ordinal(snap.instalment_day) + " of each month"], ["Months running", String(snap.months_running)],
    ["Status", STATUS_TXT[snap.status] || snap.status], ["Missed in a row", String(snap.consecutive_failures)],
    la && ["Last attempt", fmtShort(la.date) + " · " + (RESULT_TXT[la.result] || la.result)],
    la && la.reason && ["Reason", REASON_TXT[la.reason] || la.reason],
    ["Next instalment", snap.next_instalment ? fmtDay(snap.next_instalment) : "None"],
    snap.pay_now_until && ["Pay Now open until", fmtDay(snap.pay_now_until)],
    snap.user_context && ["Context", "You said money is tight this month"],
    snap.stopped_on && ["Stopped on", fmtShort(snap.stopped_on)]
  ].filter(Boolean);
}

/* "How this answer was generated": kept out of the conversation, one tap away. */
function Inspector({ entry, scenario, snap, onClose }) {
  const box = useRef(null);
  useEffect(() => {
    const opener = document.activeElement; box.current && box.current.querySelector("button").focus();
    const k = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", k);
    return () => { document.removeEventListener("keydown", k); opener && opener.focus && opener.focus({ preventScroll: true }); };
  }, [onClose]);
  const res = entry && entry.res;
  const [cls, label] = res ? (MODE[res.mode] || MODE.blocked) : ["ok", ""];
  return (
    <div className="cz-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="cz-drawer" role="dialog" aria-modal="true" aria-labelledby="cz-ins-t" ref={box}>
        <header><h2 id="cz-ins-t">How this answer was generated</h2><button type="button" className="cx-ib" aria-label="Close" onClick={onClose}><X size={20} aria-hidden="true" /></button></header>
        <div className="cz-drawer-b">
          <ol className="cz-pipe" aria-label="Answer pipeline">
            {["Your message and the recent conversation", "This SIP's demo data", "Verified help pages", "Conversation engine composes a reply", "15 checks", "Shown, or safe fallback"].map((t, i) => <li key={t}><span>{i + 1}</span>{t}</li>)}
          </ol>
          {!res ? <p className="cz-muted">Ask a question and this panel shows exactly how its answer was produced and checked.</p> : (<>
            <section><h3>Question</h3><p>“{entry.q}”</p></section>
            <section><h3>How it was produced</h3><p className={"cz-modeline " + cls}>{cls === "ok" ? <ShieldCheck size={16} aria-hidden="true" /> : <ShieldAlert size={16} aria-hidden="true" />}{label}</p>
              {res.note && <p className="cz-muted">{res.note}</p>}
              {res.attempts && res.attempts.length > 0 && <p className="cz-muted">Attempts: {res.attempts.map((x, i) => "#" + (i + 1) + " " + (x.error ? "AI service error (" + x.error.replace(/_/g, " ") + ")" : x.passed ? "passed" : "failed " + x.failed.length + " check" + (x.failed.length > 1 ? "s" : ""))).join(" · ")}{res.attempts.length > 1 ? " · retried once" : ""}</p>}
            </section>
            <section><h3>Checks · {res.checks.filter((c) => c.ok).length} of {res.checks.length} passed</h3>
              <ul className="cz-checks">{res.checks.map((c) => <li key={c.k} className={c.ok ? "ok" : "no"}><span aria-hidden="true">{c.ok ? "✓" : "✕"}</span><span>{c.label}{c.d ? <em> · {c.d}</em> : null}</span><span className="sr">{c.ok ? " passed" : " failed"}</span></li>)}</ul></section>
            {res.answer.sources && res.answer.sources.filter((id) => FACTS[id]).length > 0 && <section><h3>Verified material used</h3><ul className="cz-src-list">{res.answer.sources.filter((id) => FACTS[id]).map((id) => <li key={id}><p>{FACTS[id].text}</p><span>{FACTS[id].src.map((k) => <a key={k} href={SOURCES[k].url} target="_blank" rel="noopener noreferrer">{SOURCES[k].title}</a>)}</span></li>)}</ul></section>}
          </>)}
          <section><h3>SIP facts available · {scenario}</h3><dl className="cz-kv">{factRows(snap).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl><p className="cz-muted">Illustrative demo data. No names, PAN or account numbers are part of it.</p></section>
          <a className="cx-link" href="/built#evaluation">Full evaluation and test results<ArrowRight size={16} aria-hidden="true" /></a>
        </div>
      </aside>
    </div>
  );
}


const SHORT_OPT = { PAY_MISSED: "Pay missed instalment", ONE_TIME: "One-time investment", CHANGE_DATE: "Change date", LOWER_AMOUNT: "Lower amount", SKIP_NEXT: "Skip next instalment", STOP: "Stop SIP" };

export default function Companion() {
  const [sid, setSid] = useState("A");
  const [s, setS] = useState(() => initState("A"));
  const [chat, setChat] = useState(() => opening());
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState("web");
  const [tab, setTab] = useState("chat");
  const [flow, setFlow] = useState(null);
  const [inspect, setInspect] = useState(null); // message id or "latest"
  const [toast, setToast] = useState("");
  const [ctxOpen, setCtxOpen] = useState(false);
  const [headOpen, setHeadOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [focusKey, setFocusKey] = useState(0);
  const ver = useRef(0), anon = useRef(null), sRef = useRef(s), chatRef = useRef(chat);
  const mobile = useMedia("(max-width: 759px)");
  const rail = useMedia("(min-width: 1100px)");
  sRef.current = s; chatRef.current = chat;

  useEffect(() => {
    anon.current = anonId();
    const u = new URLSearchParams(location.search);
    const qs = (u.get("s") || "").toUpperCase();
    if (byId[qs]) { setSid(qs); setS(initState(qs)); }
    if (u.get("view") === "web") setPreview("web");
    if (u.get("view") === "app") setPreview("app");
    log("load", { moment: qs || "A" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 3200); return () => clearTimeout(t); }, [toast]);

  function log(type, data) { try { sb().from("events").insert({ anon_id: anon.current || "anon-unknown", moment: "C2-" + (sid || "A"), type, data: { surface: "companion3", ...(data || {}) } }).then(() => {}, () => {}); } catch {} }
  function mark(k) { setS((x) => (x.done[k] ? x : { ...x, done: { ...x.done, [k]: true } })); }

  /* A new situation or a reset starts a fresh conversation, so no answer about another SIP stays on screen. */
  function restart(id, how) {
    ver.current++;
    const st = initState(id);
    setSid(id); setS(st); setFlow(null); setBusy(false); setInspect(null); setCtxOpen(false); setHeadOpen(false); setTab("chat");
    setChat(how === "switch" ? [{ id: nid(), role: "switch", title: byId[id].title, v: describe(st), at: Date.now() }] : opening());
    if (how === "reset") setToast("Started a new conversation");
  }
  function pick(id) { restart(id, "switch"); log("scenario", { to: id }); }
  function reset() { restart(sid, "reset"); log("reset", {}); }
  function explore() {
    if (busy) return;
    setChat((c) => [...c.map((m) => (m.role === "situations" ? { ...m, stale: true } : m)), { id: nid(), role: "user", text: EXPLORE, at: Date.now() }, { id: nid(), role: "situations", current: sid, at: Date.now() }]);
    log("explore", {});
  }

  function openFlow(kind, pre = {}) {
    const day = pre.day && pre.day >= 1 && pre.day <= 28 && pre.day !== sRef.current.day ? pre.day : null;
    const amount = pre.amount && pre.amount < sRef.current.amount && pre.amount >= 100 ? String(pre.amount) : "";
    const ready = (kind === "CHANGE_DATE" && day) || (kind === "LOWER_AMOUNT" && amount);
    setFlow({ kind, step: NEEDS_EDIT[kind] && !ready ? "edit" : "review", day, amount });
    mark(kind === "EXPLAIN" ? "understood" : "reviewed"); log("tap_option", { option: kind });
  }
  function confirm() {
    const next = apply(sRef.current, flow.kind, { day: flow.day, amount: Number(String(flow.amount || 0).replace(/[,₹\s]/g, "")) });
    const text = next.log[next.log.length - 1].text.replace(" (simulated)", "");
    setS(next); setFlow({ ...flow, step: "done", result: text + "." });
    setChat((c) => [...c.map((m) => (m.role === "bot" || m.role === "event" || m.role === "switch" ? { ...m, stale: true } : m)), { id: nid(), role: "event", text: text + " (simulated).", at: Date.now() }]);
    setToast(text + " (simulated)"); log("action", { what: flow.kind });
  }

  /* Conversation memory sent with each message: who said what, the topic, and any open offer. */
  const historyOf = (c) => c.slice(-10).flatMap((m) => m.role === "user" ? [{ role: "user", text: m.text }] : m.role === "bot" ? [{ role: "bot", intent: m.res.answer.intent, offer: m.res.answer.offer || undefined, text: [].concat(m.res.answer.known || [], m.res.answer.means || []).join(" ").slice(0, 240) }] : []);

  async function ask(q) {
    if (busy) return;
    const v = ver.current, st = sRef.current, history = historyOf(chatRef.current);
    setTab("chat"); setHeadOpen(false);
    setChat((c) => [...c, { id: nid(), role: "user", text: q, at: Date.now() }]);
    setBusy(true); mark("understood"); log("ask", { len: q.length });
    const t0 = Date.now();
    let res = null, fail = null;
    try {
      const r = await fetch("/api/assist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ q, state: st, history }) });
      const j = await r.json().catch(() => ({ error: "bad_response" }));
      if (j.error) fail = j.error; else res = j;
    } catch { fail = "network"; }
    // Keep "Checking your SIP details…" readable. A display pause only: the reply is already final.
    const wait = 550 - (Date.now() - t0); if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    if (v !== ver.current) return;
    if (fail === "rate_limited") { setChat((c) => [...c, { id: nid(), role: "err", text: "That's a lot of messages in a minute. Wait a moment, then try again.", retry: q, at: Date.now() }]); setBusy(false); return; }
    if (!res) { // server unreachable: the same engine and checks run on this device
      const a = converse(st, q, history); const ids = [...new Set(retrieve(a.intent).concat(a.sources))]; const ent = entities(q);
      const val = validate(a, snapshot(st), q, { retrieved: ids, actions: availableActions(st), extraNums: [ent.amount, ent.day] });
      res = { mode: "offline", answer: a, checks: val.checks, passed: val.passed, sources: srcList(a.sources), note: "The server couldn't be reached, so this reply was composed and checked on this device." };
    }
    setChat((c) => [...c, { id: nid(), role: "bot", res, q, at: Date.now() }]);
    setBusy(false);
    if (res.answer && res.answer.ui && res.answer.ui.open) setTimeout(() => openFlow(res.answer.ui.open, res.answer.ui), 380);
    log("reply", { mode: res.mode, passed: res.passed, intent: res.answer && res.answer.intent });
  }

  const v = useMemo(() => describe(s), [s]);
  const opts = useMemo(() => options(s), [s]);
  const tl = useMemo(() => timeline(s), [s]);
  const snap = useMemo(() => snapshot(s), [s]);
  const asked = chat.filter((m) => m.role === "user").map((m) => m.text);
  const lastBot = [...chat].reverse().find((m) => m.role === "bot");
  const sugg = useMemo(() => {
    const base = chat.length === 0 ? starterQuestions(s) : (lastBot && lastBot.res.answer.follow && lastBot.res.answer.follow.length ? lastBot.res.answer.follow : starterQuestions(s));
    return base.filter((t) => !asked.includes(t)).slice(0, 3);
  }, [s, chat]); // eslint-disable-line react-hooks/exhaustive-deps
  const bots = chat.filter((m) => m.role === "bot");
  const inspected = inspect === null ? null : inspect === "latest" ? bots[bots.length - 1] : chat.find((m) => m.id === inspect);
  const layout = mobile ? "app" : preview;
  const summary = inr(s.amount) + " SIP · " + v.label + (v.n > 0 && !s.stopped ? " · " + v.n + " of 3 missed" : "");
  const toChat = () => { setTab("chat"); setFocusKey(Date.now()); };
  const started = chat.length > 0;

  const flowEl = flow && <Flow flow={flow} s={s} view={v} setFlow={setFlow} onClose={() => setFlow(null)} onConfirm={confirm} onOpen={openFlow} onAsk={ask} onReset={reset} />;
  const convo = (web) => tab === "details"
    ? <div className="cx-scroll cz-details"><Overview s={s} v={v} opts={opts} tl={tl} onOpen={openFlow} onAsk={toChat} /></div>
    : <Conversation s={s} v={v} tl={tl} opts={opts} chat={chat} busy={busy} sugg={sugg} onAsk={ask} onOpen={openFlow}
        onInspect={(id) => setInspect(id)} onExplore={explore} onPick={pick} ctxOpen={ctxOpen} setCtxOpen={setCtxOpen}
        onDetails={() => setTab("details")} showCard={!(web && rail)} focusKey={focusKey} />;

  /* Compact identity header once the conversation has started; the SIP card drops down from the subtitle. */
  const head = (web) => (tab === "details" ? (
    <header className="cz-head2"><button type="button" className="cx-ib" aria-label="Back to the conversation" onClick={toChat}><ChevronLeft size={22} aria-hidden="true" /></button><b>SIP details</b><span /></header>
  ) : started ? (
    <header className={"cz-head2" + (web ? " web" : "")}>
      <span />
      <div className="cz-idc">
        <b>{web ? "Conversation" : "SIP Companion"}</b>
        {web && rail ? <span className="cz-subl">{summary}</span> :
          <button type="button" className="cz-subl btn" aria-expanded={headOpen} aria-controls="cz-headcard" onClick={() => setHeadOpen(!headOpen)}><span className={"cz-dot t-" + v.tone} aria-hidden="true" />{summary}<ChevronDown size={14} aria-hidden="true" /></button>}
      </div>
      <button type="button" className="cx-ib cz-hreset" aria-label="Start a new conversation" title="New conversation" onClick={reset}><RotateCcw size={18} aria-hidden="true" /></button>
    </header>
  ) : (
    <header className={"cz-head2 bare" + (web ? " web" : "")}><span /><div className="cz-idc"><b>{web ? "Conversation" : "SIP Companion"}</b></div><button type="button" className="cx-ib cz-hreset" aria-label="Start a new conversation" title="New conversation" onClick={reset}><RotateCcw size={18} aria-hidden="true" /></button></header>
  ));
  const headCard = started && tab === "chat" && !(layout === "web" && rail) && (
    <div className={"cz-headcard" + (headOpen ? " open" : "")} id="cz-headcard" inert={!headOpen}><div><SipCard s={s} v={v} tl={tl} open={ctxOpen} onToggle={() => setCtxOpen(!ctxOpen)} onDetails={() => setTab("details")} id="cz-sip2" /></div></div>
  );

  const appScreen = (
    <div className="cx-app cz-app">
      {head(false)}{headCard}
      <div className="cx-app-body">{convo(false)}</div>
      {flowEl}
    </div>
  );
  /* Independent-prototype disclosure and the reviewer controls share one compact bar. */
  const disclosure = (
    <span className="cz-disc"><Info size={15} aria-hidden="true" /><span className="cz-long">Independent case-study prototype · not a Groww product</span><span className="cz-short">Independent prototype · not Groww</span><span className="cx-demo-tag">Demo data</span></span>
  );
  const controls = (
    <div className="cz-tools" role="toolbar" aria-label="Reviewer controls">
      <div className="cx-seg" role="group" aria-label="Preview">
        <button type="button" aria-pressed={preview === "app"} onClick={() => setPreview("app")}><Smartphone size={15} aria-hidden="true" />App</button>
        <button type="button" aria-pressed={preview === "web"} onClick={() => setPreview("web")}><Monitor size={15} aria-hidden="true" />Web</button>
      </div>
      <button type="button" className="cx-btn ghost sm" onClick={() => setInspect("latest")} aria-label="How answers are checked" title="How answers are checked"><ScanSearch size={15} aria-hidden="true" />Checks</button>
    </div>
  );
  const webScreen = (
    <div className="cx-web cz-webapp">
      <nav className="cz-appnav" aria-label="Prototype">
        {disclosure}
        <span className="cz-sp" />
        {controls}
      </nav>
      <div className={"cz-webgrid" + (rail ? " rail" : "")}>
        {rail && (
          <aside className="cz-panel" aria-label="Your SIP and options">
            <SipCard s={s} v={v} tl={tl} open={railOpen} onToggle={() => setRailOpen(!railOpen)} onDetails={() => setTab("details")} id="cz-sip3" />
            <section className="cz-panel-opts" aria-labelledby="cz-opts-h">
              <h2 id="cz-opts-h">Available options</h2>
              <div className="cz-panel-acts">
                {opts.filter((o) => o.available && o.id !== "EXPLAIN").map((o) => { const I = OPT_ICON[o.id]; return <button key={o.id} type="button" onClick={() => openFlow(o.id)} title={o.sub}>{I && <I size={17} aria-hidden="true" />}<span>{SHORT_OPT[o.id] || o.title}</span><ChevronRight size={16} aria-hidden="true" /></button>; })}
              </div>
              <p className="cz-panel-n">Each option opens a review first. Nothing changes until you confirm, and nothing here is real.</p>
            </section>
          </aside>
        )}
        <section className="cz-webmain" aria-label="SIP Companion conversation">{head(true)}{headCard}{convo(true)}</section>
      </div>
      {flowEl}
    </div>
  );

  return (
    <div className={"cx cz" + (mobile ? " is-mobile" : "")}>
      {!mobile && layout === "app" && <div className="cz-bar">{disclosure}<span className="cz-sp" />{controls}</div>}
      <div className={"cz-stage " + layout + (mobile ? " mob" : "")}>
        {mobile ? appScreen : layout === "app" ? (
          <div className="cx-phone"><div className="cx-phone-scr"><div className="cx-sb" aria-hidden="true"><span>9:41</span><i className="island" /><span className="sig">5G ▮</span></div>{appScreen}</div></div>
        ) : webScreen}
      </div>
      <p className="cx-toast" role="status" aria-live="polite">{toast}</p>
      {inspect !== null && <Inspector entry={inspected} scenario={byId[sid].title} snap={snap} onClose={() => setInspect(null)} />}
    </div>
  );
}

