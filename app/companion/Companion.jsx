"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Smartphone, Monitor, ShieldCheck, ShieldAlert, ArrowRight, X, MessageCircle, LayoutList, ChevronRight, ScanSearch, Info, ChevronLeft } from "lucide-react";
import { SCENARIOS, byId, initState, apply, describe, options, snapshot, timeline, fmtShort, fmtDay, inr, ordinal } from "@/lib/companion/model.mjs";
import { compose, retrieve, availableActions } from "@/lib/companion/answer.mjs";
import { validate } from "@/lib/companion/validate.mjs";
import { FACTS, SOURCES } from "@/lib/companion/base.mjs";
import { Conversation, ContextCard, Avatar, MODE, starterQuestions } from "./Chat";
import Overview, { OptionList } from "./Overview";
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
const opening = (s) => [{ id: nid(), role: "intro" }, { id: nid(), role: "summary", v: describe(s) }];

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
function Inspector({ entry, scenario, snap, live, onClose }) {
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
            {["Your question", "This SIP's demo data", "Verified help pages", live ? "Live AI writes a draft" : "Guided answer engine writes it", "15 checks", "Shown, or safe fallback"].map((t, i) => <li key={t}><span>{i + 1}</span>{t}</li>)}
          </ol>
          {!res ? <p className="cz-muted">Ask a question and this panel shows exactly how its answer was produced and checked.</p> : (<>
            <section><h3>Question</h3><p>“{entry.q}”</p></section>
            <section><h3>How it was produced</h3><p className={"cz-modeline " + cls}>{cls === "ok" ? <ShieldCheck size={16} aria-hidden="true" /> : <ShieldAlert size={16} aria-hidden="true" />}{label}{res.mode === "live" && res.model ? " · " + res.model : ""}</p>
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

export default function Companion() {
  const [sid, setSid] = useState("A");
  const [s, setS] = useState(() => initState("A"));
  const [chat, setChat] = useState(() => opening(initState("A")));
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState("app");
  const [tab, setTab] = useState("chat");
  const [flow, setFlow] = useState(null);
  const [live, setLive] = useState(null);
  const [inspect, setInspect] = useState(null); // message id or "latest"
  const [toast, setToast] = useState("");
  const [ctxOpen, setCtxOpen] = useState(false);
  const [focusKey, setFocusKey] = useState(0);
  const ver = useRef(0), anon = useRef(null), sRef = useRef(s);
  const mobile = useMedia("(max-width: 759px)");
  const wide = useMedia("(min-width: 1180px)");
  const webSide = useMedia("(min-width: 1100px)");
  sRef.current = s;

  useEffect(() => {
    anon.current = anonId();
    const u = new URLSearchParams(location.search);
    const qs = (u.get("s") || "").toUpperCase();
    if (byId[qs]) { setSid(qs); const st = initState(qs); setS(st); setChat(opening(st)); }
    if (u.get("view") === "web") setPreview("web");
    if (u.get("tab") === "details") setTab("details");
    fetch("/api/assist").then((r) => r.json()).then((j) => setLive(!!j.live), () => setLive(false));
    log("load", { moment: qs || "A" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 3200); return () => clearTimeout(t); }, [toast]);

  function log(type, data) { try { sb().from("events").insert({ anon_id: anon.current || "anon-unknown", moment: "C2-" + (sid || "A"), type, data: { surface: "companion2", ...(data || {}) } }).then(() => {}, () => {}); } catch {} }
  function mark(k) { setS((x) => (x.done[k] ? x : { ...x, done: { ...x.done, [k]: true } })); }

  function restart(id, why) {
    ver.current++;
    const st = initState(id);
    setSid(id); setS(st); setChat(opening(st)); setFlow(null); setBusy(false); setInspect(null); setCtxOpen(false); setTab("chat");
    setToast(why);
  }
  function load(id) { if (id === sid) return; restart(id, "New scenario: " + byId[id].title + ". The conversation restarted."); log("scenario", { to: id }); }
  function reset() { restart(sid, "Demo reset to its starting state"); log("reset", {}); }

  function openFlow(kind) {
    setFlow({ kind, step: NEEDS_EDIT[kind] ? "edit" : "review", day: null, amount: "" });
    mark(kind === "EXPLAIN" ? "understood" : "reviewed"); log("tap_option", { option: kind });
  }
  function confirm() {
    const next = apply(sRef.current, flow.kind, { day: flow.day, amount: Number(String(flow.amount || 0).replace(/[,₹\s]/g, "")) });
    const text = next.log[next.log.length - 1].text.replace(" (simulated)", "");
    setS(next); setFlow({ ...flow, step: "done", result: text + "." });
    setChat((c) => [...c.map((m) => (m.role === "summary" || m.role === "bot" || m.role === "event" ? { ...m, stale: true } : m)), { id: nid(), role: "event", text: text + " (simulated)." }]);
    setToast(text + " (simulated)"); log("action", { what: flow.kind });
  }

  async function ask(q) {
    if (busy) return;
    const v = ver.current, st = sRef.current;
    setTab("chat");
    setChat((c) => [...c, { id: nid(), role: "user", text: q }]);
    setBusy(true); mark("understood"); log("ask", { len: q.length });
    let res = null, fail = null;
    try {
      const r = await fetch("/api/assist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ q, state: st }) });
      const j = await r.json().catch(() => ({ error: "bad_response" }));
      if (j.error) fail = j.error; else res = j;
    } catch { fail = "network"; }
    if (v !== ver.current) return; // scenario changed or demo reset while waiting: drop the stale answer
    if (fail === "rate_limited") { setChat((c) => [...c, { id: nid(), role: "err", text: "That's a lot of questions in a minute. Wait a moment, then try again.", retry: q }]); setBusy(false); return; }
    if (!res) { // server unreachable: answer on this device with the same engine and the same checks
      const a = compose(st, q); const ids = [...new Set(retrieve(a.intent).concat(a.sources))];
      const val = validate(a, snapshot(st), q, { retrieved: ids, actions: availableActions(st) });
      res = { mode: "offline", answer: a, checks: val.checks, passed: val.passed, sources: srcList(a.sources), note: "The server couldn't be reached, so this answer was written and checked on this device." };
    }
    setChat((c) => [...c, { id: nid(), role: "bot", res, q }]);
    setBusy(false);
    log("reply", { mode: res.mode, passed: res.passed, intent: res.answer && res.answer.intent });
  }

  const v = useMemo(() => describe(s), [s]);
  const opts = useMemo(() => options(s), [s]);
  const tl = useMemo(() => timeline(s), [s]);
  const snap = useMemo(() => snapshot(s), [s]);
  const asked = chat.filter((m) => m.role === "user").map((m) => m.text);
  const sugg = useMemo(() => starterQuestions(s).filter((t) => !asked.includes(t)).slice(0, 3), [s, asked.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
  const bots = chat.filter((m) => m.role === "bot");
  const inspected = inspect === null ? null : inspect === "latest" ? bots[bots.length - 1] : chat.find((m) => m.id === inspect);
  const layout = mobile ? "app" : preview;
  const liveTxt = live === null ? "Connecting…" : live ? "Live AI · every answer checked" : "Guided answers · every answer checked";

  const convo = (extra) => (
    <Conversation s={s} v={v} tl={tl} opts={opts} chat={chat} busy={busy} live={live} sugg={sugg} onAsk={ask} onOpen={openFlow}
      onInspect={(id) => setInspect(id)} ctxOpen={ctxOpen} setCtxOpen={setCtxOpen} onDetails={() => setTab("details")} focusKey={focusKey} {...extra} />
  );
  const flowEl = flow && <Flow flow={flow} s={s} view={v} setFlow={setFlow} onClose={() => setFlow(null)} onConfirm={confirm} onOpen={openFlow} onAsk={ask} onReset={reset} />;

  const appScreen = (
    <div className="cx-app cz-app">
      <header className="cx-app-h cz-app-h">
        {tab === "details" ? <button type="button" className="cx-ib" aria-label="Back to the conversation" onClick={() => setTab("chat")}><ChevronLeft size={22} aria-hidden="true" /></button> : <Avatar size={38} />}
        <div className="cx-app-t cz-app-t"><b>{tab === "details" ? "SIP details" : "SIP Companion"}</b><span><i className={"cz-dot" + (live ? " live" : "")} aria-hidden="true" />{tab === "details" ? "Sample fund (illustrative)" : live === null ? "Connecting…" : live ? "Live AI · checked" : "Guided answers · checked"}</span></div>
        <span className="cx-demo-tag">Demo</span>
      </header>
      <div className="cx-app-body">
        {tab === "chat" ? convo() : <div className="cx-scroll"><Overview s={s} v={v} opts={opts} tl={tl} onOpen={openFlow} onAsk={() => { setTab("chat"); setFocusKey(Date.now()); }} /></div>}
      </div>
      <nav className="cx-tabs" aria-label="App sections">
        <button type="button" aria-current={tab === "chat" ? "page" : undefined} onClick={() => setTab("chat")}><MessageCircle size={20} aria-hidden="true" /><span>Companion</span></button>
        <button type="button" aria-current={tab === "details" ? "page" : undefined} onClick={() => setTab("details")}><LayoutList size={20} aria-hidden="true" /><span>SIP details</span></button>
      </nav>
      {flowEl}
    </div>
  );

  const webScreen = (
    <div className="cx-web cz-web">
      <div className="cx-web-top"><b className="cx-logo"><i aria-hidden="true" />Groww-style app</b><span>Mutual funds</span><span>My SIPs</span><span aria-current="page">SIP Companion</span><span className="cx-demo-tag">Demo data</span></div>
      <div className={"cx-web-body cz-web-body" + (webSide ? "" : " solo")}>
        <section className="cz-web-chat" aria-label="SIP Companion conversation">
          <header className="cz-web-h"><Avatar size={40} /><div><b>SIP Companion</b><span><i className={"cz-dot" + (live ? " live" : "")} aria-hidden="true" />{liveTxt}</span></div>
            <button type="button" className="cx-btn ghost sm" onClick={() => setInspect("latest")}><ScanSearch size={16} aria-hidden="true" />How answers are checked</button></header>
          {convo({ showContext: !webSide })}
        </section>
        {webSide && <aside className="cx-web-side cz-web-side" aria-label="This SIP">
          <ContextCard s={s} v={v} tl={tl} static />
          <OptionList opts={opts} onOpen={openFlow} sub="Reviewed before anything changes. Nothing here is real." />
        </aside>}
      </div>
      {flowEl}
    </div>
  );

  return (
    <div className={"cx cz" + (mobile ? " is-mobile" : "")}>
      <div className="cz-bar" role="toolbar" aria-label="Demo controls">
        <div className="cz-bar-t"><b>SIP Companion</b><span className="cz-tag">Interactive demo · illustrative data</span></div>
        <label className="cz-scen"><span>Scenario</span>
          <select value={sid} onChange={(e) => load(e.target.value)} aria-describedby="cz-scen-d">{SCENARIOS.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</select>
        </label>
        <span id="cz-scen-d" className="cz-scen-d">{byId[sid].blurb}</span>
        <button type="button" className="cx-btn ghost sm" onClick={reset}><RotateCcw size={16} aria-hidden="true" />Reset</button>
        {!mobile && <div className="cx-seg" role="group" aria-label="Preview">
          <button type="button" aria-pressed={preview === "app"} onClick={() => setPreview("app")}><Smartphone size={16} aria-hidden="true" />App</button>
          <button type="button" aria-pressed={preview === "web"} onClick={() => setPreview("web")}><Monitor size={16} aria-hidden="true" />Web</button>
        </div>}
        {!mobile && <button type="button" className="cx-btn ghost sm" onClick={() => setInspect("latest")} aria-label="How answers are checked"><ScanSearch size={16} aria-hidden="true" /><span className="cz-l">How answers are checked</span><span className="cz-s">Checks</span></button>}
      </div>

      {mobile ? <div className="cz-mobile">{appScreen}</div> : layout === "app" ? (
        <div className="cz-stage app">
          <div className="cx-phone"><div className="cx-phone-scr"><div className="cx-sb" aria-hidden="true"><span>9:41</span><i className="island" /><span className="sig">5G ▮</span></div>{appScreen}</div></div>
          {wide && (
            <aside className="cz-guide" aria-label="About this demo">
              <h2>What you're looking at</h2>
              <p>SIP Companion lives inside a Groww-style app. It explains a first-time investor's SIP in plain words, and lays out every choice fairly when an instalment slips.</p>
              <h3>Try asking</h3>
              <div className="cz-try">{starterQuestions(s).slice(0, 4).map((t) => <button key={t} type="button" onClick={() => ask(t)} disabled={busy}>{t}<ChevronRight size={15} aria-hidden="true" /></button>)}</div>
              <ul className="cz-facts">
                <li><ShieldCheck size={17} aria-hidden="true" /><span><b>Checked before you see it.</b> Every answer passes 15 checks: no advice, no invented reasons, real sources, no pressure.</span></li>
                <li><Info size={17} aria-hidden="true" /><span><b>{live ? "Live AI is on." : "Live AI is switched off."}</b> {live ? "Drafts come from the model and are held back if any check fails." : "Answers come from the guided rule-based engine and are labelled that way. The free models we tried took about 20 seconds per reply."}</span></li>
                <li><Info size={17} aria-hidden="true" /><span><b>Nothing is real.</b> Paying, changing, skipping and stopping are simulated on this demo SIP only.</span></li>
              </ul>
              <a className="cx-link" href="/built#evaluation">How it's built and evaluated<ArrowRight size={16} aria-hidden="true" /></a>
            </aside>
          )}
        </div>
      ) : (
        <div className="cz-stage web"><div className="cx-browser"><div className="cx-browser-bar" aria-hidden="true"><i /><i /><i /><span>groww.in/mutual-funds/user/sips/companion · demo</span></div><div className="cx-browser-scr">{webScreen}</div></div></div>
      )}

      <p className="cx-toast" role="status" aria-live="polite">{toast}</p>
      {inspect !== null && <Inspector entry={inspected} scenario={byId[sid].title} snap={snap} live={live} onClose={() => setInspect(null)} />}
    </div>
  );
}
