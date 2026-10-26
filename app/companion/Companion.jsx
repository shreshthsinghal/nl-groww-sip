"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Smartphone, Monitor, ShieldCheck, ShieldAlert, Check, Circle, ArrowRight, Info } from "lucide-react";
import { SCENARIOS, byId, initState, apply, describe, options, snapshot, timeline, fmtShort } from "@/lib/companion/model.mjs";
import { compose, retrieve, availableActions, suggestions } from "@/lib/companion/answer.mjs";
import { validate } from "@/lib/companion/validate.mjs";
import { FACTS, SOURCES } from "@/lib/companion/base.mjs";
import AppScreen, { MODE } from "./AppScreen";
import Flow, { TITLES } from "./Flow";
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

export default function Companion() {
  const [sid, setSid] = useState("A");
  const [s, setS] = useState(() => initState("A"));
  const [chat, setChat] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [preview, setPreview] = useState("app");
  const [tab, setTab] = useState("overview");
  const [flow, setFlow] = useState(null);
  const [intro, setIntro] = useState(false);
  const [live, setLive] = useState(null);
  const [last, setLast] = useState(null);
  const [toast, setToast] = useState("");
  const [unread, setUnread] = useState(0);
  const [focusKey, setFocusKey] = useState(0);
  const ver = useRef(0), anon = useRef(null), sRef = useRef(s);
  const mobile = useMedia("(max-width: 759px)");
  sRef.current = s;

  useEffect(() => {
    anon.current = anonId();
    const u = new URLSearchParams(location.search);
    const qs = (u.get("s") || "").toUpperCase(); if (byId[qs]) { setSid(qs); setS(initState(qs)); }
    if (u.get("view") === "web") setPreview("web");
    if (u.get("tab") === "ask") setTab("ask");
    try { if (!localStorage.getItem("cx-intro-seen") && u.get("intro") !== "0") setIntro(true); } catch { setIntro(true); }
    fetch("/api/assist").then((r) => r.json()).then((j) => setLive(!!j.live), () => setLive(false));
    log("load", { moment: qs || "A" });
  }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 3200); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { if (tab === "ask") setUnread(0); }, [tab]);

  function log(type, data) { try { sb().from("events").insert({ anon_id: anon.current || "anon-unknown", moment: "C2-" + (sid || "A"), type, data: { surface: "companion2", ...(data || {}) } }).then(() => {}, () => {}); } catch {} }
  function mark(k) { setS((x) => (x.done[k] ? x : { ...x, done: { ...x.done, [k]: true } })); }
  function dismissIntro() { setIntro(false); try { localStorage.setItem("cx-intro-seen", "1"); } catch {} }

  function load(id) {
    if (id === sid) return;
    ver.current++;
    setSid(id); setS(initState(id)); setFlow(null); setErr(""); setBusy(false);
    setChat((c) => c.length ? c.map((m) => ({ ...m, stale: true })).concat([{ id: nid(), role: "sys", text: "Switched to “" + byId[id].title + "”. Answers below use this scenario; earlier ones were about the previous one." }]) : c);
    setToast("Scenario: " + byId[id].title); log("scenario", { to: id });
  }
  function reset() {
    ver.current++;
    setS(initState(sid)); setChat([]); setFlow(null); setErr(""); setBusy(false); setLast(null); setTab("overview"); setUnread(0);
    setToast("Demo reset to its starting state"); log("reset", {});
  }
  function openFlow(kind) {
    setFlow({ kind, step: NEEDS_EDIT[kind] ? "edit" : "review", day: null, amount: "" });
    if (kind === "EXPLAIN") mark("understood"); else mark("reviewed");
    log("tap_option", { option: kind });
  }
  function confirm() {
    const next = apply(sRef.current, flow.kind, { day: flow.day, amount: Number(String(flow.amount || 0).replace(/[,₹\s]/g, "")) });
    const text = next.log[next.log.length - 1].text;
    setS(next); setFlow({ ...flow, step: "done", result: text.replace(" (simulated)", ".") });
    setToast(text); log("action", { what: flow.kind });
  }

  async function ask(q) {
    if (busy) return;
    const v = ver.current, st = sRef.current;
    setChat((c) => [...c, { id: nid(), role: "user", text: q }]);
    setBusy(true); setErr(""); mark("understood"); log("ask", { len: q.length });
    let res = null, fail = null;
    try {
      const r = await fetch("/api/assist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ q, state: st }) });
      const j = await r.json().catch(() => ({ error: "bad_response" }));
      if (j.error) fail = j.error; else res = j;
    } catch { fail = "network"; }
    if (v !== ver.current) return; // scenario changed or demo reset while waiting: drop the stale answer
    if (fail === "rate_limited") { setChat((c) => [...c, { id: nid(), role: "err", text: "Too many questions in a minute. Wait a moment, then try again.", retry: q }]); setBusy(false); return; }
    if (!res) { // server unreachable: answer on this device with the same engine and the same checks
      const a = compose(st, q); const ids = [...new Set(retrieve(a.intent).concat(a.sources))];
      const val = validate(a, snapshot(st), q, { retrieved: ids, actions: availableActions(st) });
      res = { mode: "offline", answer: a, checks: val.checks, passed: val.passed, sources: srcList(a.sources), note: "The server couldn't be reached" + (fail && fail !== "network" ? " (" + fail + ")" : "") + ", so this answer was written and checked on this device." };
    }
    setChat((c) => [...c, { id: nid(), role: "bot", res }]);
    setLast({ ...res, q, at: Date.now() }); setBusy(false);
    setUnread((u) => u + 1);
    log("reply", { mode: res.mode, passed: res.passed, intent: res.answer && res.answer.intent });
  }

  const v = useMemo(() => describe(s), [s]);
  const opts = useMemo(() => options(s), [s]);
  const tl = useMemo(() => timeline(s), [s]);
  const sugg = useMemo(() => suggestions(s).filter((t) => !chat.some((m) => m.role === "user" && !m.stale && m.text === t)).slice(0, 4), [s, chat]);
  const snap = useMemo(() => snapshot(s), [s]);
  const layout = mobile ? "app" : preview;

  const screen = (
    <AppScreen s={s} v={v} opts={opts} tl={tl} layout={layout} tab={tab} setTab={(t) => { setTab(t); if (t === "ask") setFocusKey(Date.now()); }}
      chat={chat} busy={busy} sugg={sugg} onAsk={(q) => { setTab("ask"); ask(q); }} onOpen={openFlow} err={err} setErr={setErr} live={live} focusKey={focusKey}
      intro={intro} dismissIntro={dismissIntro} unread={unread}>
      {flow && <Flow flow={flow} s={s} view={v} setFlow={setFlow} onClose={() => setFlow(null)} onConfirm={confirm} onOpen={openFlow} onAsk={(q) => { setTab("ask"); ask(q); }} onReset={reset} />}
    </AppScreen>
  );

  return (
    <div className={"cx" + (mobile ? " is-mobile" : "") + (layout === "web" ? " web-mode" : "")}>
      <aside className="cx-rail" aria-label="Demo controls">
        <div className="cx-rail-h"><p className="cx-eyebrow">MVP · interactive demo</p><h1>SIP Continuation Companion</h1><p>Helps a first-time investor understand a slipped instalment and choose what to do, without pressure.</p></div>
        <fieldset className="cx-scen">
          <legend>Demo scenario</legend>
          {SCENARIOS.map((x) => (
            <label key={x.id} className={x.id === sid ? "on" : ""}>
              <input type="radio" name="cx-scen" value={x.id} checked={x.id === sid} onChange={() => load(x.id)} />
              <span><b>{x.title}</b><span>{x.blurb}</span></span>
            </label>
          ))}
        </fieldset>
        <select className="cx-scen-m" aria-label="Demo scenario" value={sid} onChange={(e) => load(e.target.value)}>{SCENARIOS.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</select>
        <button type="button" className="cx-btn ghost cx-reset" onClick={reset}><RotateCcw size={16} aria-hidden="true" />Reset demo</button>
        <div className="cx-railnote">
          <p><Info size={16} aria-hidden="true" /><span>Illustrative data, not a real Groww account. The demo date is 26 Oct 2026. Nothing is paid or changed.</span></p>
          <p className={live ? "ok" : ""}>{live ? <ShieldCheck size={16} aria-hidden="true" /> : <ShieldAlert size={16} aria-hidden="true" />}<span>{live === null ? "Checking the AI connection…" : live ? "Live AI is on. Every answer is checked before it's shown." : "Live AI isn't configured, so answers come from a rule-based engine. They're labelled as such and pass the same checks."}</span></p>
        </div>
        <section className="cx-check" aria-labelledby="cx-ck-h">
          <h2 id="cx-ck-h">In this session</h2>
          <ul>{[["understood", "Understood what happened"], ["reviewed", "Reviewed an option"], ["chose", "Made a choice (simulated)"]].map(([k, t]) => <li key={k} className={s.done[k] ? "on" : ""}>{s.done[k] ? <Check size={16} aria-hidden="true" /> : <Circle size={16} aria-hidden="true" />}<span>{t}</span><span className="sr">{s.done[k] ? " (done)" : " (not yet)"}</span></li>)}</ul>
        </section>
        <a className="cx-built" href="/built#evaluation">How it's built and evaluated<ArrowRight size={16} aria-hidden="true" /></a>
      </aside>

      <section className="cx-stage" aria-label="Product preview">
        <div className="cx-ctl">
          <span className="cx-ctl-t"><b>Companion</b> Preview</span>
          <div className="cx-seg" role="group" aria-label="Preview mode">
            <button type="button" aria-pressed={preview === "app"} onClick={() => setPreview("app")}><Smartphone size={16} aria-hidden="true" />App</button>
            <button type="button" aria-pressed={preview === "web"} onClick={() => setPreview("web")}><Monitor size={16} aria-hidden="true" />Web</button>
          </div>
        </div>
        {layout === "app" ? (
          <div className="cx-phone">
            <div className="cx-phone-scr">
              <div className="cx-sb" aria-hidden="true"><span>9:41</span><i className="island" /><span className="sig">5G ▮</span></div>
              {screen}
            </div>
          </div>
        ) : (
          <div className="cx-browser">
            <div className="cx-browser-bar" aria-hidden="true"><i /><i /><i /><span>groww.in/mutual-funds/user/sips · demo</span></div>
            <div className="cx-browser-scr">{screen}</div>
          </div>
        )}
        <p className="cx-toast" role="status" aria-live="polite">{toast}</p>
      </section>

      <aside className="cx-insp" aria-label="Behind the latest answer">
        <h2>Behind the latest answer</h2>
        {!last ? <p className="cx-insp-empty">Ask a question to see how its answer was produced and checked. Diagnostics stay here, apart from the answer itself.</p> : (
          <>
            <p className={"cx-insp-mode " + ((MODE[last.mode] || MODE.blocked)[0])}>{(MODE[last.mode] || MODE.blocked)[1]}</p>
            <dl className="cx-kv">
              <div><dt>Question</dt><dd>“{last.q}”</dd></div>
              <div><dt>Intent</dt><dd>{last.answer.intent}</dd></div>
              <div><dt>Source</dt><dd>{last.mode === "live" ? "Model " + last.model : last.mode === "offline" ? "This device" : "Rule-based engine"}</dd></div>
              {last.attempts && <div><dt>Attempts</dt><dd>{last.attempts.map((x, i) => "#" + (i + 1) + " " + (x.error ? "error: " + x.error : x.passed ? "passed" : "failed " + x.failed.join(", "))).join(" · ")}</dd></div>}
            </dl>
            <ul className="cx-insp-checks">{last.checks.map((c) => <li key={c.k} className={c.ok ? "ok" : "no"}><span aria-hidden="true">{c.ok ? "✓" : "✕"}</span>{c.label}{c.d ? <em> {c.d}</em> : null}</li>)}</ul>
          </>
        )}
        <h2>Scenario data the AI sees</h2>
        <dl className="cx-kv small">
          {Object.entries(snap).filter(([, x]) => x !== null && !(Array.isArray(x) && !x.length)).map(([k, x]) => <div key={k}><dt>{k.replace(/_/g, " ")}</dt><dd>{typeof x === "object" ? Object.entries(x).filter(([, y]) => y !== null).map(([a, b]) => a.replace(/_/g, " ") + ": " + b).join(" · ") : String(x)}</dd></div>)}
        </dl>
        <p className="cx-insp-empty">No names, PAN or account numbers are part of it.</p>
      </aside>
    </div>
  );
}
