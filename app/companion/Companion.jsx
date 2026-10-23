"use client";
import { useEffect, useRef, useState } from "react";
import C from "@/lib/core";
import G from "@/lib/scenarios.json";
import REC from "@/lib/recorded.json";
import { sb } from "@/lib/supabase";

const S = G.scenarios;
const byId = Object.fromEntries(S.map((s) => [s.id, s]));
const clone = (o) => JSON.parse(JSON.stringify(o));
const MON = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const fd = (iso) => { if (!iso) return "—"; const p = iso.split("-"); return parseInt(p[2], 10) + " " + MON[parseInt(p[1], 10) - 1]; };
const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");
const addMonths = (iso, n) => { const p = iso.split("-").map(Number); return new Date(Date.UTC(p[0], p[1] - 1 + n, p[2])).toISOString().slice(0, 10); };
const setDay = (iso, d) => { const p = iso.split("-"); return p[0] + "-" + p[1] + "-" + String(d).padStart(2, "0"); };
const PII = /\b[A-Z]{5}\d{4}[A-Z]\b|\b\d{10,18}\b/i;

const REASON = { INSUFFICIENT_FUNDS: "The account balance was too low on the debit date.", MANDATE_PENDING: "Autopay approval wasn't complete yet.", MANDATE_REJECTED: "The bank rejected the autopay mandate.", BANK_TECHNICAL: "A technical problem at the bank.", KYC_HOLD: "Your KYC needs attention." };
const LABEL = { PAY_NOW: "Pay this instalment now", RETRY_MANDATE: "Set up autopay again", CHANGE_DATE: "Move the SIP date", REDUCE_AMOUNT: "Lower the amount", PAUSE_WITH_DATE: "Pause with a restart date", RESUME_SIP: "Restart now", RESTART_SIP: "Start the SIP again", STOP_SIP: "Stop the SIP", CONTACT_SUPPORT: "Talk to support", LEARN_SEBI: "Read SEBI's investor guide" };
const SHORT = { PAY_NOW: "Pay now", RETRY_MANDATE: "Fix autopay", CHANGE_DATE: "Change date", REDUCE_AMOUNT: "Lower amount", PAUSE_WITH_DATE: "Pause", RESUME_SIP: "Restart", RESTART_SIP: "Start again", STOP_SIP: "Stop" };
const NAME = { schema: "valid reply", no_funds: "no fund names", no_return_claims: "no return promises", no_urgency: "no urgency", no_advice: "no advice", grounded_numbers: "real numbers only", no_pii_echo: "no personal data", options_available: "valid options", length: "short enough" };
const GROUPS = [["Fix this payment", ["PAY_NOW", "RETRY_MANDATE"]], ["Change the plan", ["CHANGE_DATE", "REDUCE_AMOUNT", "PAUSE_WITH_DATE", "RESUME_SIP", "RESTART_SIP"]], ["Step back", ["STOP_SIP"]], ["Get help", ["CONTACT_SUPPORT", "LEARN_SEBI"]]];
const MOMENTS = [
  { id: "F1", t: "First missed instalment", d: "Low balance on the debit date", more: ["What can I do now?", "Will I be charged?"] },
  { id: "F4", t: "Second miss in a row", d: "One more and it's cancelled", more: ["How do I stop this happening?", "What does cancelled mean for my money?"] },
  { id: "F2", t: "Brand-new SIP", d: "Autopay not approved yet", more: ["Do I need to do anything?"] },
  { id: "F8", t: "Cancelled after 3 misses", d: "The SIP disappeared", more: ["Is my money gone?"] },
  { id: "M2", t: "A new EMI", d: "The amount feels too high", more: ["Can I lower it for a few months?"] },
  { id: "P2", t: "Paused SIP", d: "Wants to restart early", more: ["When will it restart on its own?"] },
  { id: "S1", t: "Wants to stop", d: "Has decided", more: ["What happens to what I've invested?"] },
  { id: "E1", t: "Red for 6 months", d: "Thinking of stopping", more: ["Is this normal?", "Which fund is better?"] }
];
const TASKS = [
  { k: "T1", moment: "F4", text: "This SIP has a problem. Find out what happened.", q: { text: "If the next instalment also fails, what happens?", opts: ["Nothing, it just waits", "The SIP is cancelled automatically", "The app charges a penalty", "Not sure"], correct: 1 } },
  { k: "T2", moment: null, text: "Now do something so next month's instalment is more likely to go through.", success: ["PAY_NOW", "CHANGE_DATE", "REDUCE_AMOUNT", "PAUSE_WITH_DATE"] },
  { k: "T3", moment: "M1", text: "Imagine money will be tight for the next 2 months. Do what you would actually do with this SIP." },
  { k: "T4", moment: "A1", text: "Ask the assistant which fund you should pick.", q: { text: "How pushy did the assistant feel? (1 = not at all, 5 = very)", likert: true } }
];
const POST = [["understood", "I understood what happened to my SIP"], ["control", "I felt in control of what to do"], ["use", "I'd use this if my SIP had a problem"]];
const SFX = { ok: [[587, 0, 0.12]], safe: [[440, 0, 0.16]], done: [[660, 0, 0.11], [880, 0.1, 0.16]], undo: [[880, 0, 0.1], [660, 0.09, 0.15]], warn: [[330, 0, 0.16]] };

let uid = 0; const nid = () => ++uid;
function anonId() { try { let a = localStorage.getItem("sipc-anon"); if (!a) { a = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()); localStorage.setItem("sipc-anon", a); } return a; } catch { return "anon-" + Date.now(); } }

function Sheet({ title, children, okText, onOk, onClose }) {
  const box = useRef(null), okRef = useRef(null);
  useEffect(() => {
    const opener = document.activeElement;
    okRef.current && okRef.current.focus();
    return () => { if (opener && opener.isConnected && opener.focus) opener.focus(); };
  }, []);
  function onKey(e) {
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    if (e.key === "Tab") {
      const f = [...box.current.querySelectorAll("button,a[href],input")].filter((x) => !x.disabled);
      if (!f.length) return; const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  }
  return (
    <div className="sheet" onKeyDown={onKey} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={box} role="dialog" aria-modal="true" aria-label={title}>
        <h3>{title}</h3>
        {children}
        <div className="acts"><button className="secondary" type="button" onClick={onClose}>Cancel</button><button ref={okRef} className="primary" type="button" onClick={onOk}>{okText || "Confirm"}</button></div>
      </div>
    </div>
  );
}

export default function Companion() {
  const [mode, setMode] = useState("explore");
  const [momentId, setMomentId] = useState("F4");
  const [sip, setSip] = useState(() => clone(byId.F4.event));
  const [pristine, setPristine] = useState(true);
  const [asked, setAsked] = useState({});
  const [chat, setChat] = useState([]);
  const [busy, setBusy] = useState(false);
  const [showEx, setShowEx] = useState(false);
  const [big, setBig] = useState(false);
  const [snd, setSnd] = useState(false);
  const [trace, setTrace] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [forceRec, setForceRec] = useState(false);
  const [live, setLive] = useState("unknown");
  const [q, setQ] = useState("");
  const [qWarn, setQWarn] = useState("");
  const [evalRun, setEvalRun] = useState(null);
  const [test, setTest] = useState(null);
  const [sessions, setSessions] = useState(null);
  const [lastUndo, setLastUndo] = useState(null);
  const scrollRef = useRef(null), actx = useRef(null), testRef = useRef(null), anon = useRef(null);
  const sc = byId[momentId];

  useEffect(() => {
    anon.current = anonId();
    try { setBig(localStorage.getItem("sipc-big") === "1"); setSnd(localStorage.getItem("sipc-snd") === "1"); } catch {}
    sb().from("eval_runs").select("created_at,passed,full_pass,n,unsafe_shown,needless_fallback,answerable,intent_ok,model").order("created_at", { ascending: false }).limit(1).then(({ data }) => { if (data && data[0]) setEvalRun(data[0]); }, () => {});
    logEvent("load", { moment: "F4" });
  }, []);
  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [chat, busy]);

  function tone(seq) {
    if (!snd) return;
    try { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; actx.current = actx.current || new AC(); const a = actx.current, t0 = a.currentTime;
      seq.forEach(([f, t, d]) => { const o = a.createOscillator(), g = a.createGain(); o.type = "sine"; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t0 + t); g.gain.exponentialRampToValueAtTime(0.05, t0 + t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + t + d); o.connect(g); g.connect(a.destination); o.start(t0 + t); o.stop(t0 + t + d + 0.03); });
    } catch {}
  }
  function logEvent(type, data) {
    const t = testRef.current;
    if (t && t.task) t.events.push({ t: Math.round(performance.now() - t.t0), task: t.task.k, type, ...data });
    try { sb().from("events").insert({ anon_id: anon.current || "anon-unknown", session_code: t ? t.code : null, moment: momentId, type, data: data || {} }).then(() => {}, () => {}); } catch {}
  }

  function load(id, silent) {
    setMomentId(id); setSip(clone(byId[id].event)); setPristine(true); setAsked({}); setChat([]); setShowEx(false); setTrace(null); setLastUndo(null);
    if (!silent) logEvent("load", { moment: id });
  }
  function addSys(text, undo) { const id = nid(); setChat((c) => [...c, { id, kind: "sys", text, undo }]); if (undo) setLastUndo(id); }

  async function ask(textIn) {
    const text = (textIn || "").trim();
    if (busy || !text) return;
    if (PII.test(text)) { setQWarn("That looks like a PAN, phone or account number. Remove it; the assistant never needs it."); tone(SFX.warn); logEvent("pii_blocked", {}); return; }
    const wasPristine = pristine;
    setAsked((a) => ({ ...a, [text]: 1 }));
    setChat((c) => [...c, { id: nid(), kind: "user", text }]);
    logEvent("ask", { text: text.slice(0, 200) });
    let g, source;
    if (forceRec) {
      const out = wasPristine && text === sc.msg && REC[sc.id] ? REC[sc.id] : null;
      g = C.gate(out, sip, text);
      source = out ? "Recorded AI reply from eval run 2" : "Safe reply (recorded mode has no recording for this question)";
    } else {
      setBusy(true);
      try {
        const r = await fetch("/api/companion", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event: sip, msg: text }) });
        const j = await r.json();
        if (j.gate) {
          g = j.gate;
          if (j.source === "live") { setLive("on"); source = "Live AI reply (" + (j.model || "Claude") + ", " + Math.round((j.ms || 0) / 100) / 10 + " s)"; }
          else { if (j.reason === "no_key") setLive("off"); source = j.reason === "no_key" ? "Safe reply (live AI isn't switched on yet)" : j.reason === "pii" ? "Safe reply (personal data was blocked)" : "Safe reply (the AI call didn't finish: " + (j.reason || "error") + ")"; }
        } else { g = C.gate(null, sip, text); source = j.error === "rate_limited" ? "Safe reply (too many questions in a minute)" : "Safe reply (the request failed)"; }
      } catch { g = C.gate(null, sip, text); source = "Safe reply (no connection)"; }
      setBusy(false);
    }
    setChat((c) => [...c, { id: nid(), kind: "bot", g, source }]);
    setTrace({ g, source });
    tone(g.usedFallback ? SFX.safe : SFX.ok);
    logEvent("reply", { decision: g.usedFallback ? g.decision || "safe" : "shown", source: source.slice(0, 40), intent: g.out ? g.out.intent : null });
  }

  function act(o) {
    logEvent("tap_option", { option: o });
    if (o === "LEARN_SEBI") { window.open("https://investor.sebi.gov.in", "_blank", "noopener"); logEvent("action", { what: o }); return; }
    const init = { kind: o };
    if (o === "CHANGE_DATE") init.pick = parseInt((sip.next_debit_date || "2026-11-05").split("-")[2], 10);
    if (o === "REDUCE_AMOUNT") { const a = sip.sip_amount, amts = []; [0.25, 0.5, 0.75].forEach((f) => { const v = Math.max(100, Math.round(a * f / 100) * 100); if (!amts.includes(v) && v < a) amts.push(v); }); init.amts = amts; init.pick = amts[amts.length - 1]; }
    if (o === "PAUSE_WITH_DATE") init.pick = 2;
    setSheet(init);
  }
  function confirm() {
    const s = clone(sip), prev = clone(sip), k = sheet.kind; let msg = "", extra = {};
    if (k === "PAY_NOW") { s.status = "ACTIVE"; s.consecutive_failures = 0; s.reason_code = null; msg = "Paid " + inr(s.sip_amount) + ". Missed count is back to 0."; }
    if (k === "RETRY_MANDATE") { s.status = "ACTIVE"; s.reason_code = null; msg = "Autopay approval requested."; }
    if (k === "CHANGE_DATE") { if (s.next_debit_date) s.next_debit_date = setDay(s.next_debit_date, sheet.pick); msg = "SIP date moved to the " + sheet.pick + "th of each month."; extra = { day: sheet.pick, afterIncome: s.stated_income_day ? sheet.pick > s.stated_income_day : null }; }
    if (k === "REDUCE_AMOUNT") { s.sip_amount = sheet.pick; msg = "Monthly amount is now " + inr(sheet.pick) + "."; extra = { to: sheet.pick }; }
    if (k === "PAUSE_WITH_DATE") { s.next_debit_date = addMonths(s.next_debit_date, sheet.pick); s.status = "PAUSED"; s.consecutive_failures = 0; msg = "Paused. Restarts on " + fd(s.next_debit_date) + "."; extra = { months: sheet.pick }; }
    if (k === "RESUME_SIP") { s.status = "ACTIVE"; s.next_debit_date = "2026-11-07"; msg = "Restarted. Next payment on " + fd(s.next_debit_date) + "."; }
    if (k === "RESTART_SIP") { s.status = "ACTIVE"; s.consecutive_failures = 0; s.next_debit_date = "2026-11-" + s.last_debit_date.split("-")[2]; msg = "Started again. Next payment on " + fd(s.next_debit_date) + "."; }
    if (k === "STOP_SIP") { s.status = "STOPPED"; msg = "SIP stopped."; }
    if (k === "CONTACT_SUPPORT") { msg = "Support request opened."; }
    setSip(s); setPristine(false); setSheet(null);
    addSys(msg + " (demo, nothing real changed)", { prev, type: k });
    tone(SFX.done); logEvent("action", { what: k, ...extra });
  }
  function undo(item) {
    setSip(item.undo.prev); setLastUndo(null);
    setChat((c) => c.map((x) => (x.id === item.id ? { ...x, undone: true } : x)));
    addSys("Undone. The SIP is back as it was.");
    tone(SFX.undo); logEvent("undo", { what: item.undo.type });
  }

  /* ---------- user test ---------- */
  function startTest(code) {
    if (!/^P\d{1,2}$/.test(code)) return "Use a code like P1. No names.";
    const t = { code, t0: performance.now(), idx: 0, task: TASKS[0], ts: performance.now(), events: [], res: {}, post: {}, ans: null };
    testRef.current = t; setTest({ ...t }); load(TASKS[0].moment, true); logEvent("task_start", {}); return null;
  }
  function finishTask(gaveUp) {
    const t = testRef.current, T = t.task, ms = Math.round(performance.now() - t.ts);
    const mine = t.events.filter((e) => e.task === T.k);
    const r = { ms, gaveUp, chosen: mine.filter((e) => e.type === "action").map((e) => e.what), asks: mine.filter((e) => e.type === "ask").length, replies: mine.filter((e) => e.type === "reply").map((e) => e.decision) };
    if (T.q && T.q.opts) { r.answer = t.ans; r.correct = t.ans === T.q.correct; }
    if (T.q && T.q.likert) r.pushy = t.ans;
    if (T.success) r.success = !gaveUp && r.chosen.some((a) => T.success.includes(a));
    if (T.k === "T4") r.asked = r.asks > 0;
    t.res[T.k] = r; logEvent("task_end", { ms });
    t.idx++; t.ans = null;
    if (t.idx < TASKS.length) { t.task = TASKS[t.idx]; t.ts = performance.now(); if (t.task.moment) load(t.task.moment, true); logEvent("task_start", {}); }
    else t.task = { k: "POST" };
    setTest({ ...t });
  }
  async function saveTest(comment) {
    const t = testRef.current;
    const { error } = await sb().from("test_sessions").insert({ code: t.code, mode: forceRec ? "recorded" : "live", results: t.res, post: t.post, comment: (comment || "").slice(0, 800) || null });
    if (error) return "Couldn't save: " + error.message;
    testRef.current = null; setTest(null); loadSessions(); return null;
  }
  async function loadSessions() {
    try { const { data } = await sb().rpc("metrics_summary"); setSessions((data && data.session_rows) || []); } catch { setSessions([]); }
  }
  useEffect(() => { if (mode === "test" && sessions === null) loadSessions(); }, [mode]);

  const allowed = C.allowedOptions(sip.status === "STOPPED" ? { ...sip, status: "ACTIVE" } : sip);
  const chips = (pristine ? [sc.msg] : []).concat((MOMENTS.find((m) => m.id === momentId) || { more: [] }).more).filter((t) => !asked[t]);
  const pill = sip.status === "FAILED" ? ["bad", "Instalment missed"] : sip.status === "PAUSED" ? ["warn", "Paused"] : sip.status === "CANCELLED" ? ["bad", "Cancelled"] : sip.status === "STOPPED" ? ["idle", "Stopped"] : ["ok", "On track"];
  const nMiss = Math.min(3, sip.consecutive_failures || 0);
  const liveLabel = forceRec ? "Recorded" : live === "off" ? "Safe replies" : "Live AI";

  return (
    <div className="page" style={{ gap: 22 }}>
      <header style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <p className="eyebrow">Part 5 · MVP · SIP Companion</p>
        <h1 className="big" style={{ fontSize: "clamp(1.9rem,4.2vw,2.8rem)" }}>When a SIP slips, it says what happened and what you can do, and nothing more.</h1>
        <p className="disc">An independent concept prototype for a product case study about Groww, not affiliated with or endorsed by Groww. Sample data only: no accounts, no real payments. Information, not investment advice.</p>
        <div className="tabs" role="tablist" aria-label="Mode">
          <button className="tab" role="tab" type="button" aria-selected={mode === "explore"} onClick={() => setMode("explore")}>Explore</button>
          <button className="tab" role="tab" type="button" aria-selected={mode === "test"} onClick={() => setMode("test")}>Run a user test</button>
        </div>
      </header>

      {mode === "explore" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <p className="note">Pick a moment from the research. Each one loads a sample SIP in that situation.</p>
          <div className="moments">
            {MOMENTS.map((m) => <button key={m.id} className="moment" type="button" aria-pressed={momentId === m.id} onClick={() => load(m.id)}><b>{m.t}</b>{m.d}</button>)}
          </div>
        </div>
      )}

      <div className="main">
        <div className="phone"><div className={"screen" + (big ? " big" : "")}>
          <div className="status"><span>9:41</span><span>SIP Companion · concept</span></div>
          <div className="apphead">
            <div><b>Your SIP</b><br /><span>Sample data</span></div>
            <div className="hd">
              <span className={"pill " + (liveLabel === "Live AI" ? "ok" : "idle")}>{liveLabel}</span>
              <button className="ib" type="button" aria-pressed={big} aria-label="Larger text" onClick={() => { setBig(!big); try { localStorage.setItem("sipc-big", !big ? "1" : "0"); } catch {} }}>Aa</button>
              <button className="ib" type="button" aria-pressed={snd} aria-label="Sound" onClick={() => { const v = !snd; setSnd(v); try { localStorage.setItem("sipc-snd", v ? "1" : "0"); } catch {} }}>{snd ? "Sound on" : "Sound"}</button>
            </div>
          </div>
          <div className="scroll" ref={scrollRef}>
            <div className="sip" aria-live="polite">
              <div className="top"><div><div className="amt">{inr(sip.sip_amount)}</div><div className="sub">Monthly SIP · running {sip.months_running} months</div></div><span className={"pill " + pill[0]}>{pill[1]}</span></div>
              {(sip.status === "FAILED" || sip.status === "CANCELLED") && (<>
                <button className="strikebtn" type="button" aria-expanded={showEx} aria-controls="strikeEx" onClick={() => setShowEx(!showEx)}>
                  <div className="dots" aria-hidden="true">{[0, 1, 2].map((i) => <span key={i} className={"dot" + (i < nMiss ? " on" : "")} />)}</div>
                  <span><u>{sip.status === "CANCELLED" ? "3 of 3 missed in a row" : nMiss + " of 3 missed in a row"}</u>{sip.status === "CANCELLED" ? ". Cancelled automatically." : ". At 3, the SIP is cancelled automatically."}</span>
                </button>
                <p className="explain" id="strikeEx" hidden={!showEx}>A miss is an instalment that didn't go through. Three misses in a row cancel a monthly SIP automatically (an industry rule since April 2024). One successful payment resets the count to 0. A pause doesn't count as a miss.</p>
                <p className="reason">{sip.reason_code ? REASON[sip.reason_code] : "The bank hasn't shared the exact reason yet."}</p>
              </>)}
              {sip.status === "PAUSED" && <p className="reason">Paused. Restarts on {fd(sip.next_debit_date)}. A pause doesn't count as a missed instalment.</p>}
              {sip.status === "STOPPED" && <p className="reason">Stopped. Units you already bought stay in your account.</p>}
              <div className="row"><span>{sip.status === "FAILED" ? "Last attempt" : "Last payment"}</span><span>{fd(sip.last_debit_date)}</span></div>
              <div className="row"><span>Next payment</span><span>{sip.status === "CANCELLED" || sip.status === "STOPPED" ? "None" : fd(sip.next_debit_date)}</span></div>
              {sip.status !== "STOPPED" && (
                <div className="quick" role="group" aria-label="Manage this SIP"><span>Manage</span>
                  {C.allowedOptions(sip).filter((o) => SHORT[o]).map((o) => <button key={o} type="button" onClick={() => act(o)}>{SHORT[o]}</button>)}
                </div>
              )}
            </div>
            <div className="chat" role="log" aria-live="polite" aria-label="Conversation about this SIP">
              <h3>Ask about this SIP</h3>
              {chat.map((it) => {
                if (it.kind === "user") return <div key={it.id} className="b user">{it.text}</div>;
                if (it.kind === "sys") return <div key={it.id} className="b sys">{it.text}{it.undo && !it.undone && <button className="undo" type="button" disabled={lastUndo !== it.id} onClick={() => undo(it)}>Undo</button>}</div>;
                const shown = it.g.shown, ops = (shown.options || []).filter((o) => allowed.includes(o));
                return (
                  <div key={it.id} style={{ display: "contents" }}>
                    <div className="b bot">{shown.message}
                      <div className="meta"><span className={"pill " + (it.g.usedFallback ? "warn" : "ok")}>{it.g.usedFallback ? "Safe reply" : "Checked ✓"}</span><button type="button" onClick={() => setTrace({ g: it.g, source: it.source })}>Why this reply?</button></div>
                    </div>
                    {ops.length > 0 && <div className="opts">{GROUPS.map(([label, list]) => { const mine = list.filter((o) => ops.includes(o)); if (!mine.length) return null; return (
                      <div key={label} style={{ display: "contents" }}><p className="glabel">{label}</p>{mine.map((o) => <button key={o} className={"opt" + (o === "STOP_SIP" ? " exit" : "")} type="button" onClick={() => act(o)}>{LABEL[o]}</button>)}</div>); })}</div>}
                  </div>
                );
              })}
              {busy && <div className="typing">Checking your SIP…</div>}
            </div>
          </div>
          <div className="chipwrap" style={{ padding: "0 12px 8px", background: "var(--screen)" }}><div className="chips">{chips.map((t) => <button key={t} className="chip" type="button" onClick={() => ask(t)}>{t}</button>)}</div></div>
          <form className="composer" onSubmit={(e) => { e.preventDefault(); if (PII.test(q)) { tone(SFX.warn); return; } const v = q; setQ(""); ask(v); }}>
            <label htmlFor="q" style={{ position: "absolute", left: -9999 }}>Your question</label>
            <input id="q" autoComplete="off" maxLength={280} placeholder="Ask about this SIP" aria-describedby="qWarn" value={q} onChange={(e) => { setQ(e.target.value); setQWarn(PII.test(e.target.value) ? "That looks like a PAN, phone or account number. Remove it; the assistant never needs it." : ""); }} />
            <button type="submit" disabled={busy || !!qWarn}>Send</button>
          </form>
          <div className="qwarn" id="qWarn" role="status">{qWarn}</div>
          <div className="foot">Information only, not investment advice. Learn more at <a href="https://investor.sebi.gov.in" target="_blank" rel="noopener">investor.sebi.gov.in</a></div>
          {sheet && (
            <Sheet title={LABEL[sheet.kind]} okText={{ PAY_NOW: "Pay " + inr(sip.sip_amount), RETRY_MANDATE: "Send request", CHANGE_DATE: "Move date", REDUCE_AMOUNT: "Lower amount", PAUSE_WITH_DATE: "Pause", RESUME_SIP: "Restart", RESTART_SIP: "Start again", STOP_SIP: "Stop SIP", CONTACT_SUPPORT: "Open support" }[sheet.kind]} onOk={confirm} onClose={() => setSheet(null)}>
              {sheet.kind === "PAY_NOW" && <p>Pay {inr(sip.sip_amount)} once, for the instalment that didn't go through. Your missed count goes back to 0.</p>}
              {sheet.kind === "RETRY_MANDATE" && <p>We'd send an approval request to your bank app. Approve it there to finish.</p>}
              {sheet.kind === "CHANGE_DATE" && (<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <p className="note">Pick the day of the month for future payments.</p>
                {sip.stated_income_day && <p className="sug">You said income usually arrives on the {sip.stated_income_day}th. The {Math.min(28, sip.stated_income_day + 1)}th is the day after.</p>}
                <div className="grid">{Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <button key={d} type="button" className={d === sheet.pick ? "sel" : ""} aria-pressed={d === sheet.pick} onClick={() => setSheet({ ...sheet, pick: d })}>{d}</button>)}</div>
              </div>)}
              {sheet.kind === "REDUCE_AMOUNT" && (<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <p className="note">Choose a new monthly amount. You can raise it again any time.</p>
                <div className="grid">{sheet.amts.map((v) => <button key={v} type="button" className={v === sheet.pick ? "sel" : ""} aria-pressed={v === sheet.pick} onClick={() => setSheet({ ...sheet, pick: v })}>{inr(v)}</button>)}</div>
              </div>)}
              {sheet.kind === "PAUSE_WITH_DATE" && (<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <p className="note">No payments during the pause, and it doesn't count as a missed instalment. It restarts on its own.</p>
                <div className="grid">{[1, 2, 3].map((n) => <button key={n} type="button" className={n === sheet.pick ? "sel" : ""} aria-pressed={n === sheet.pick} onClick={() => setSheet({ ...sheet, pick: n })}>{n} {n === 1 ? "month" : "months"}</button>)}</div>
              </div>)}
              {sheet.kind === "RESUME_SIP" && <p>Payments restart from the next SIP date.</p>}
              {sheet.kind === "RESTART_SIP" && <p>Same amount, starting from next month. You can change the date first if you like.</p>}
              {sheet.kind === "STOP_SIP" && <p>No more payments. Units you already bought stay in your account. You can undo this.</p>}
              {sheet.kind === "CONTACT_SUPPORT" && <p>In the real app this would open support, with this SIP's details attached so you don't repeat them.</p>}
            </Sheet>
          )}
        </div></div>

        {mode === "explore" ? (
          <div className="side">
            <div className="cpanel">
              <p className="eyebrow">Under the hood</p>
              <div className="src"><span className={"pill " + (forceRec ? "idle" : live === "off" ? "warn" : "ok")}>{forceRec ? "Recorded mode" : live === "off" ? "Live AI off" : "Live AI on"}</span>
                <span className="note">{forceRec ? "Replies are real AI outputs from eval run 2, replayed and checked again." : live === "off" ? "The server has no AI key yet, so every answer is the safe reply." : "Each reply is generated on the server, then checked before you see it."}</span></div>
              <label className="toggle"><input type="checkbox" checked={forceRec} onChange={(e) => setForceRec(e.target.checked)} /> Use recorded replies from the eval run instead</label>
            </div>
            <div className="cpanel">
              <p className="eyebrow">Last reply, checked</p>
              {!trace ? <p className="note">Ask something in the phone, or tap a suggested question. Each reply's checks show up here.</p> : (<>
                <div className="kv">
                  <span>Reply came from</span><span>{trace.source}</span>
                  <span>What the AI heard</span><span>{trace.g.out ? trace.g.out.intent : "(no AI reply)"}</span>
                  <span>Confidence</span><span>{trace.g.out && typeof trace.g.out.confidence === "number" ? trace.g.out.confidence.toFixed(2) + (trace.g.confident ? " (meets 0.70)" : " (below 0.70)") : "–"}</span>
                  <span>Decision</span><span>{!trace.g.out ? "Safe reply shown" : trace.g.usedFallback ? "Safe reply shown (" + trace.g.decision + ")" : "AI reply shown"}</span>
                </div>
                <div className="checks">
                  {!trace.g.out && <span className="ok" style={{ gridColumn: "1/-1" }}>No AI reply to check. These checks ran on the safe reply that was shown:</span>}
                  {(trace.g.out ? trace.g.safety : C.safetyChecks({ intent: "OUT_OF_SCOPE", confidence: 1, fallback: false, ...trace.g.shown }, sip, "").filter((c) => c.k !== "schema")).map((c) => <span key={c.k} className={c.ok ? "ok" : "no"} title={c.d || ""}>{NAME[c.k]}{c.ok ? "" : ": " + c.d}</span>)}
                </div>
              </>)}
            </div>
            <div className="cpanel">
              <p className="eyebrow">Release gate · {evalRun ? "latest live run" : "eval run 2, 23 Oct"}</p>
              <div className="cstats">
                {evalRun ? (<>
                  <div><b>{evalRun.full_pass}/{evalRun.n}</b><span>scenarios fully passed</span></div><div><b>{evalRun.unsafe_shown}</b><span>unsafe replies shown</span></div>
                  <div><b>{Math.round(evalRun.needless_fallback / Math.max(1, evalRun.answerable) * 100)}%</b><span>needless safe replies</span></div><div><b>{Math.round(evalRun.intent_ok / evalRun.n * 100)}%</b><span>needs understood</span></div>
                </>) : (<>
                  <div><b>25/27</b><span>scenarios fully passed</span></div><div><b>0</b><span>unsafe replies shown</span></div><div><b>4%</b><span>needless safe replies</span></div><div><b>100%</b><span>needs understood</span></div>
                </>)}
              </div>
              <p className="note">Every reply passes 9 coded checks and a 0.7 confidence bar before it is shown. If any check fails, you see a safe reply built from the SIP's own data. <a href="/eval">See the quality gate</a></p>
            </div>
            <div className="cpanel"><details className="ux"><summary>How this prototype is designed</summary><dl>
              <dt>User-centred</dt><dd>Each moment comes from the research, in the words people used.</dd>
              <dt>Information architecture</dt><dd>Options grouped: fix this payment, change the plan, step back, get help.</dd>
              <dt>Clarity</dt><dd>Plain dates and amounts. Tap the dots to see what "missed in a row" means.</dd>
              <dt>Flexibility</dt><dd>Ask, tap a suggestion, or use "Manage" without chatting.</dd>
              <dt>Reversing actions</dt><dd>Every action has Undo, stopping included.</dd>
              <dt>Error prevention</dt><dd>PAN-like text is caught before sending. Unsafe AI replies are swapped for the safe reply.</dd>
              <dt>Accessibility</dt><dd>Keyboard and screen-reader friendly, Esc closes sheets, Aa for larger text, status always in words.</dd>
              <dt>Sound</dt><dd>Optional soft tones. Off by default.</dd>
            </dl></details></div>
          </div>
        ) : (
          <TestConsole test={test} startTest={startTest} finishTask={finishTask} saveTest={saveTest} setAns={(v) => { testRef.current.ans = v; setTest({ ...testRef.current }); }} setPost={(k, v) => { testRef.current.post[k] = v; setTest({ ...testRef.current }); }} sessions={sessions} />
        )}
      </div>
    </div>
  );
}

function TestConsole({ test, startTest, finishTask, saveTest, setAns, setPost, sessions }) {
  const [code, setCode] = useState(""), [msg, setMsg] = useState(""), [comment, setComment] = useState("");
  let body;
  if (!test) body = (<>
    <p className="eyebrow">Moderated user test</p>
    <p>Four tasks, about 8 minutes. You run it on this screen while the participant uses the phone, in person or on a screen share.</p>
    <ul className="note" style={{ margin: 0, paddingLeft: 18 }}><li>Use a code like P1, never a name.</li><li>Read each task aloud, then stay quiet. Note where they hesitate.</li><li>Don't explain the app. If they're stuck for 2 minutes, mark it as given up.</li></ul>
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <label htmlFor="tcode" className="note">Participant code</label>
      <input id="tcode" className="code" placeholder="P1" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
      <button className="cbtn" type="button" onClick={() => setMsg(startTest(code.trim()) || "")}>Start session</button>
    </div>
    <p className="note" role="status">{msg}</p>
  </>);
  else if (test.task.k !== "POST") { const T = test.task, i = TASKS.indexOf(T); body = (<>
    <p className="eyebrow">User test · {test.code}</p>
    <p className="note">Task {i + 1} of {TASKS.length}. Read it aloud, then let them use the phone. Stay quiet.</p>
    <div className="task">{T.text}</div>
    {T.q && T.q.opts && (<><p><b>Then ask: </b>{T.q.text}</p><div className="ans">{T.q.opts.map((o, k) => <button key={k} type="button" className={test.ans === k ? "sel" : ""} onClick={() => setAns(k)}>{o}</button>)}</div></>)}
    {T.q && T.q.likert && (<><p><b>Then ask: </b>{T.q.text}</p><div className="likert">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" className={test.ans === n ? "sel" : ""} onClick={() => setAns(n)}>{n}</button>)}</div></>)}
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button className="cbtn" type="button" onClick={() => finishTask(false)}>Task done</button><button className="cbtn quiet" type="button" onClick={() => finishTask(true)}>They gave up</button></div>
  </>); }
  else body = (<>
    <p className="eyebrow">User test · {test.code}</p>
    <p className="note">Last step. Ask each question; they answer from 1 (disagree) to 5 (agree).</p>
    {POST.map(([k, l]) => <div key={k} style={{ display: "flex", flexDirection: "column", gap: 6 }}><p>{l}</p><div className="likert">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" className={test.post[k] === n ? "sel" : ""} onClick={() => setPost(k, n)}>{n}</button>)}</div></div>)}
    <textarea aria-label="Comments" placeholder="Anything they said that stood out (no names or account details)" value={comment} onChange={(e) => setComment(e.target.value)} />
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><button className="cbtn" type="button" onClick={async () => { const e = await saveTest(comment); setMsg(e || "Saved."); if (!e) setComment(""); }}>Save session</button><span className="note" role="status">{msg}</span></div>
  </>);
  return (
    <div className="side">
      <div className="cpanel">{body}</div>
      <div className="cpanel sess"><p className="eyebrow">Sessions saved</p>
        {sessions === null ? <p className="note">Loading…</p> : !sessions.length ? <p className="note">No sessions yet.</p> : (
          <div className="tw"><table><thead><tr><th>Code</th><th>Knew the rule</th><th>Fixed it</th><th>T2 time</th><th>Tight month</th><th>Pushy</th><th>Understood</th><th>In control</th></tr></thead><tbody>
            {sessions.map((r, k) => { const R = r.results || {}, P = r.post || {}; return (
              <tr key={k}><td>{r.code}</td><td>{R.T1 ? (R.T1.correct ? "Yes" : "No") : "–"}</td><td>{R.T2 ? (R.T2.success ? "Yes" : "No") : "–"}</td><td>{R.T2 ? Math.round(R.T2.ms / 1000) + " s" : "–"}</td><td>{R.T3 ? (R.T3.chosen || []).join(", ") || "no action" : "–"}</td><td>{R.T4 && R.T4.pushy ? R.T4.pushy : "–"}</td><td>{P.understood || "–"}</td><td>{P.control || "–"}</td></tr>); })}
          </tbody></table></div>)}
      </div>
    </div>
  );
}
