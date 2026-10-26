"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Settings2, ArrowUp, X } from "lucide-react";
import C from "@/lib/core";
import G from "@/lib/scenarios.json";
import REC from "@/lib/recorded.json";
import { sb } from "@/lib/supabase";

const byId = Object.fromEntries(G.scenarios.map((s) => [s.id, s]));
const clone = (o) => JSON.parse(JSON.stringify(o));
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fd = (iso) => { if (!iso) return "None"; const p = iso.split("-"); return parseInt(p[2], 10) + " " + MON[parseInt(p[1], 10) - 1]; };
const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");
const addMonths = (iso, n) => { const p = iso.split("-").map(Number); return new Date(Date.UTC(p[0], p[1] - 1 + n, p[2])).toISOString().slice(0, 10); };
const setDay = (iso, d) => { const p = iso.split("-"); return p[0] + "-" + p[1] + "-" + String(d).padStart(2, "0"); };
const ord = (n) => n + (n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th");
const PII = /\b[A-Z]{5}\d{4}[A-Z]\b|\b\d{10,18}\b/i;

const REASON = { INSUFFICIENT_FUNDS: "Your balance was too low on the debit date.", MANDATE_PENDING: "Your bank hasn't approved autopay yet.", MANDATE_REJECTED: "Your bank rejected the autopay request.", BANK_TECHNICAL: "Your bank had a technical problem that day.", KYC_HOLD: "Your KYC needs updating before payments can go through." };
const LABEL = { PAY_NOW: "Pay this instalment now", RETRY_MANDATE: "Set up autopay again", CHANGE_DATE: "Move the SIP date", REDUCE_AMOUNT: "Lower the amount", PAUSE_WITH_DATE: "Pause with a restart date", RESUME_SIP: "Restart now", RESTART_SIP: "Start the SIP again", STOP_SIP: "Stop the SIP", CONTACT_SUPPORT: "Talk to support", LEARN_SEBI: "Read SEBI's investor guide" };
const SHORT = { PAY_NOW: "Pay now", RETRY_MANDATE: "Fix autopay", CHANGE_DATE: "Change date", REDUCE_AMOUNT: "Lower amount", PAUSE_WITH_DATE: "Pause", RESUME_SIP: "Restart", RESTART_SIP: "Start again", STOP_SIP: "Stop SIP", CONTACT_SUPPORT: "Get help" };
const PRIMARY = ["PAY_NOW", "RETRY_MANDATE", "RESUME_SIP", "RESTART_SIP", "CONTACT_SUPPORT"];
const OK = { PAY_NOW: (s) => "Pay " + inr(s.sip_amount), RETRY_MANDATE: () => "Send request", CHANGE_DATE: () => "Move date", REDUCE_AMOUNT: () => "Lower amount", PAUSE_WITH_DATE: () => "Pause", RESUME_SIP: () => "Restart", RESTART_SIP: () => "Start again", STOP_SIP: () => "Stop SIP", CONTACT_SUPPORT: () => "Open support" };
const GROUPS = [["Fix this payment", ["PAY_NOW", "RETRY_MANDATE"]], ["Change the plan", ["CHANGE_DATE", "REDUCE_AMOUNT", "PAUSE_WITH_DATE", "RESUME_SIP", "RESTART_SIP"]], ["Step back", ["STOP_SIP"]], ["Get help", ["CONTACT_SUPPORT", "LEARN_SEBI"]]];

/* Situations people described in reviews and interviews. Shown to visitors as a quiet picker under the phone. */
const SITUATIONS = [
  ["F4", "Missed twice in a row", ["Missed again. What happens now?", "How do I stop this happening?", "What does cancelled mean for my money?"]],
  ["F1", "First missed instalment", ["Why did my SIP fail this month?", "What can I do now?", "Will I be charged?"]],
  ["F2", "Brand-new SIP already failed", ["I set up my first SIP and it already says failed??", "Do I need to do anything?"]],
  ["F5", "Money was there, still failed", ["The money was in my account! Why did it fail?"]],
  ["F8", "SIP disappeared", ["My SIP disappeared from the app", "Is my money gone?"]],
  ["M2", "A new EMI started", ["My bike EMI started, 5000 is too much now", "Can I lower it for a few months?"]],
  ["M3", "Short of money this month", ["is mahine paise nahi hai, sip skip kar sakta hu?"]],
  ["P2", "Paused, want to restart", ["How do I restart my paused SIP before the pause ends?"]],
  ["E1", "Red for six months", ["My portfolio has been red for 6 months. Should I stop?", "Which fund is better?"]],
  ["S1", "Ready to stop", ["I want to stop my SIP.", "What happens to what I've invested?"]]
];
const SFX = { ok: [[587, 0, 0.12]], done: [[660, 0, 0.11], [880, 0.1, 0.16]], undo: [[880, 0, 0.1], [660, 0.09, 0.15]], warn: [[330, 0, 0.16]] };

let uid = 0; const nid = () => ++uid;
function anonId() { try { let a = localStorage.getItem("sipc-anon"); if (!a) { a = crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now(); localStorage.setItem("sipc-anon", a); } return a; } catch { return "anon-" + Date.now(); } }

function Sheet({ title, children, okText, onOk, onClose, danger }) {
  const box = useRef(null), first = useRef(null);
  useEffect(() => { const opener = document.activeElement; first.current && first.current.focus(); return () => { if (opener && opener.isConnected && opener.focus) opener.focus(); }; }, []);
  function onKey(e) {
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    if (e.key === "Tab") { const f = [...box.current.querySelectorAll("button,a[href],input,select")].filter((x) => !x.disabled); if (!f.length) return; const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
  }
  return (
    <div className="ap-sheet" onKeyDown={onKey} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={box} role="dialog" aria-modal="true" aria-label={title}>
        <div className="ap-sheet-h"><h3>{title}</h3><button ref={onOk ? null : first} className="ap-x" type="button" aria-label="Close" onClick={onClose}><X size={18} aria-hidden="true" /></button></div>
        {children}
        {onOk && <div className="ap-acts"><button className="ap-btn ghost" type="button" onClick={onClose}>Cancel</button><button ref={first} className={"ap-btn " + (danger ? "dark" : "solid")} type="button" onClick={onOk}>{okText}</button></div>}
      </div>
    </div>
  );
}

export default function Companion() {
  const [sid, setSid] = useState("F4");
  const [sip, setSip] = useState(() => clone(byId.F4.event));
  const [pristine, setPristine] = useState(true);
  const [asked, setAsked] = useState({});
  const [chat, setChat] = useState([]);
  const [busy, setBusy] = useState(false);
  const [why, setWhy] = useState(false);
  const [big, setBig] = useState(false);
  const [snd, setSnd] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [live, setLive] = useState("unknown");
  const [q, setQ] = useState("");
  const [warn, setWarn] = useState("");
  const [lastUndo, setLastUndo] = useState(null);
  const scrollRef = useRef(null), actx = useRef(null), anon = useRef(null), inputRef = useRef(null);
  const sc = byId[sid], sit = SITUATIONS.find((s) => s[0] === sid);

  useEffect(() => {
    anon.current = anonId();
    try { setBig(localStorage.getItem("sipc-big") === "1"); setSnd(localStorage.getItem("sipc-snd") === "1"); } catch {}
    fetch("/api/companion").then((r) => r.json()).then((j) => setLive(j.live ? "on" : "off"), () => setLive("off"));
    logEvent("load", { moment: "F4", surface: "app" });
  }, []);
  useEffect(() => { const el = scrollRef.current; if (el && chat.length) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }); }, [chat, busy]);

  function tone(seq) {
    if (!snd) return;
    try { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; actx.current = actx.current || new AC(); const a = actx.current, t0 = a.currentTime;
      seq.forEach(([f, t, d]) => { const o = a.createOscillator(), g = a.createGain(); o.type = "sine"; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t0 + t); g.gain.exponentialRampToValueAtTime(0.05, t0 + t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + t + d); o.connect(g); g.connect(a.destination); o.start(t0 + t); o.stop(t0 + t + d + 0.03); });
    } catch {}
  }
  function logEvent(type, data) { try { sb().from("events").insert({ anon_id: anon.current || "anon-unknown", session_code: null, moment: sid, type, data: { surface: "app", ...(data || {}) } }).then(() => {}, () => {}); } catch {} }

  function load(id) { setSid(id); setSip(clone(byId[id].event)); setPristine(true); setAsked({}); setChat([]); setWhy(false); setLastUndo(null); setSheet(null); logEvent("load", { moment: id }); if (scrollRef.current) scrollRef.current.scrollTop = 0; }
  function addSys(text, undo) { const id = nid(); setChat((c) => [...c, { id, kind: "sys", text, undo }]); if (undo) setLastUndo(id); }

  async function ask(textIn) {
    const text = (textIn || "").trim();
    if (busy || !text) return;
    if (PII.test(text)) { setWarn("That looks like a PAN, phone or account number. Please remove it. It's never needed here."); tone(SFX.warn); logEvent("pii_blocked", {}); return; }
    const wasPristine = pristine;
    setAsked((a) => ({ ...a, [text]: 1 }));
    setChat((c) => [...c, { id: nid(), kind: "user", text }]);
    logEvent("ask", { text: text.slice(0, 200) });
    setBusy(true);
    let g = null, src = "safe";
    if (live !== "off") {
      try {
        const r = await fetch("/api/companion", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event: sip, msg: text }) });
        const j = await r.json();
        if (j.gate) { g = j.gate; src = j.source; if (j.reason === "no_key") setLive("off"); }
      } catch {}
    }
    if (!g || src !== "live") {
      const rec = wasPristine && text === sc.msg && REC[sc.id] ? REC[sc.id] : null;
      if (rec) { g = C.gate(rec, sip, text); src = "recorded"; }
      else if (!g) g = C.gate(null, sip, text);
      await new Promise((r) => setTimeout(r, 450));
    }
    setBusy(false);
    setChat((c) => [...c, { id: nid(), kind: "bot", g }]);
    tone(SFX.ok);
    logEvent("reply", { decision: g.usedFallback ? g.decision || "safe" : "shown", source: src, intent: g.out ? g.out.intent : null });
  }

  function act(o) {
    logEvent("tap_option", { option: o });
    if (o === "LEARN_SEBI") { window.open("https://investor.sebi.gov.in", "_blank", "noopener"); logEvent("action", { what: o }); return; }
    const init = { kind: o };
    if (o === "CHANGE_DATE") init.pick = sip.stated_income_day ? Math.min(28, sip.stated_income_day + 1) : parseInt((sip.next_debit_date || "2026-11-05").split("-")[2], 10);
    if (o === "REDUCE_AMOUNT") { const a = sip.sip_amount, amts = []; [0.25, 0.5, 0.75].forEach((f) => { const v = Math.max(100, Math.round((a * f) / 100) * 100); if (!amts.includes(v) && v < a) amts.push(v); }); init.amts = amts; init.pick = amts[amts.length - 1]; }
    if (o === "PAUSE_WITH_DATE") init.pick = 2;
    setSheet(init);
  }
  function confirm() {
    const s = clone(sip), prev = clone(sip), k = sheet.kind; let msg = "", extra = {};
    if (k === "PAY_NOW") { s.status = "ACTIVE"; s.consecutive_failures = 0; s.reason_code = null; s.last_debit_date = s.today; msg = "Paid " + inr(s.sip_amount) + ". Your missed count is back to 0."; }
    if (k === "RETRY_MANDATE") { s.status = "ACTIVE"; s.reason_code = null; msg = "Approval request sent to your bank app."; }
    if (k === "CHANGE_DATE") { if (s.next_debit_date) s.next_debit_date = setDay(s.next_debit_date, sheet.pick); msg = "Your SIP date is now the " + ord(sheet.pick) + " of each month."; extra = { day: sheet.pick, afterIncome: s.stated_income_day ? sheet.pick > s.stated_income_day : null }; }
    if (k === "REDUCE_AMOUNT") { s.sip_amount = sheet.pick; msg = "Your monthly amount is now " + inr(sheet.pick) + "."; extra = { to: sheet.pick }; }
    if (k === "PAUSE_WITH_DATE") { s.next_debit_date = addMonths(s.next_debit_date, sheet.pick); s.status = "PAUSED"; s.consecutive_failures = 0; s.reason_code = null; msg = "Paused. It restarts on " + fd(s.next_debit_date) + "."; extra = { months: sheet.pick }; }
    if (k === "RESUME_SIP") { s.status = "ACTIVE"; s.next_debit_date = "2026-11-07"; msg = "Restarted. Next payment " + fd(s.next_debit_date) + "."; }
    if (k === "RESTART_SIP") { s.status = "ACTIVE"; s.consecutive_failures = 0; s.reason_code = null; s.next_debit_date = "2026-11-" + s.last_debit_date.split("-")[2]; msg = "Started again. Next payment " + fd(s.next_debit_date) + "."; }
    if (k === "STOP_SIP") { s.status = "STOPPED"; msg = "SIP stopped. What you've invested stays in your account."; }
    if (k === "CONTACT_SUPPORT") msg = "Support request opened with this SIP's details attached.";
    setSip(s); setPristine(false); setSheet(null); setWhy(false);
    addSys(msg, { prev, type: k });
    tone(SFX.done); logEvent("action", { what: k, ...extra });
  }
  function undo(item) {
    setSip(item.undo.prev); setLastUndo(null);
    setChat((c) => c.map((x) => (x.id === item.id ? { ...x, undone: true } : x)));
    addSys("Undone. Your SIP is back as it was.");
    tone(SFX.undo); logEvent("undo", { what: item.undo.type });
  }

  const allowed = C.allowedOptions(sip.status === "STOPPED" ? { ...sip, status: "ACTIVE" } : sip);
  const manage = sip.status === "STOPPED" ? [] : C.allowedOptions(sip).filter((o) => SHORT[o]);
  const primary = manage.find((o) => PRIMARY.includes(o) && (sip.status !== "ACTIVE" || o !== "CONTACT_SUPPORT"));
  const rest = manage.filter((o) => o !== primary && o !== "CONTACT_SUPPORT");
  const chips = (pristine ? [sc.msg] : []).concat(sit ? sit[2] : []).filter((t, i, a) => a.indexOf(t) === i && !asked[t]).slice(0, 3);
  const nMiss = Math.min(3, sip.consecutive_failures || 0);
  const trouble = sip.status === "FAILED" || sip.status === "CANCELLED";

  let headline, sub;
  if (sip.status === "FAILED") { headline = nMiss === 1 ? "This month's instalment didn't go through" : nMiss + " instalments missed in a row"; sub = REASON[sip.reason_code] || "Your bank hasn't shared the reason yet."; }
  else if (sip.status === "CANCELLED") { headline = "This SIP was cancelled after 3 missed instalments"; sub = "What you invested is still yours. You can start it again with the same amount."; }
  else if (sip.status === "PAUSED") { headline = "Paused until " + fd(sip.next_debit_date); sub = "A pause doesn't count as a missed instalment. It restarts on its own."; }
  else if (sip.status === "STOPPED") { headline = "This SIP is stopped"; sub = "No more payments. What you've invested stays in your account."; }
  else { headline = "On track"; sub = "Next payment of " + inr(sip.sip_amount) + " on " + fd(sip.next_debit_date) + "."; }

  return (
    <div className="ap-wrap">
      <div className="ap-phone">
        <div className={"ap-screen" + (big ? " big" : "")}>
          <header className="ap-top">
            <span className="ap-back" aria-hidden="true"><ChevronLeft size={20} /></span>
            <div className="ap-title"><b>Monthly SIP</b><span>Flexi cap · started {sip.months_running ? sip.months_running + " months ago" : "this month"}</span></div>
            <button className="ap-icon" type="button" aria-label="Display and sound settings" onClick={() => setSheet({ kind: "SETTINGS" })}><Settings2 size={18} aria-hidden="true" /></button>
          </header>

          <div className="ap-scroll" ref={scrollRef}>
            <section className={"ap-card s-" + sip.status.toLowerCase()} aria-live="polite" aria-label="SIP status">
              <div className="ap-amt"><b>{inr(sip.sip_amount)}</b><span>a month</span></div>

              {trouble && (
                <button className="ap-miss" type="button" aria-expanded={why} aria-controls="ap-why" aria-label={nMiss + " of 3 missed in a row. " + (sip.status === "CANCELLED" ? "What happened" : "What a third miss means")} onClick={() => setWhy(!why)}>
                  <span className="ap-dots" aria-hidden="true">{[0, 1, 2].map((i) => <i key={i} className={i < nMiss ? "on" : ""} />)}</span>
                  <span>{sip.status === "CANCELLED" ? "What happened" : "What a third miss means"}</span>
                </button>
              )}
              <h1 className="ap-h">{headline}</h1>
              <p className="ap-sub">{sub}</p>
              {trouble && (
                <p className="ap-why" id="ap-why" hidden={!why}>Three missed instalments in a row cancel a monthly SIP automatically. That's an industry rule since April 2024. One successful payment resets the count to 0, and a pause doesn't count as a miss.</p>
              )}

              {primary && <button className="ap-btn solid wide" type="button" onClick={() => act(primary)}>{primary === "PAY_NOW" ? "Pay " + inr(sip.sip_amount) + " now" : LABEL[primary]}</button>}
              {rest.length > 0 && (
                <div className="ap-more" role="group" aria-label="Other ways to manage this SIP">
                  {rest.map((o) => <button key={o} type="button" className={o === "STOP_SIP" ? "quiet" : ""} onClick={() => act(o)}>{SHORT[o]}</button>)}
                </div>
              )}

              <dl className="ap-rows">
                <div><dt>{sip.status === "FAILED" ? "Last attempt" : "Last payment"}</dt><dd>{fd(sip.last_debit_date)}</dd></div>
                <div><dt>Next payment</dt><dd>{sip.status === "CANCELLED" || sip.status === "STOPPED" ? "None" : fd(sip.next_debit_date)}</dd></div>
              </dl>
            </section>

            <section className="ap-chat" role="log" aria-live="polite" aria-label="Questions about this SIP">
              {chat.length === 0 && <p className="ap-hint">Questions about this SIP? Ask in your own words.</p>}
              {chat.map((it) => {
                if (it.kind === "user") return <div key={it.id} className="ap-b me">{it.text}</div>;
                if (it.kind === "sys") return <div key={it.id} className={"ap-b sys" + (it.undone ? " undone" : "")}><span>{it.text}</span>{it.undo && !it.undone && lastUndo === it.id && <button type="button" onClick={() => undo(it)}>Undo</button>}</div>;
                const shown = it.g.shown, ops = (shown.options || []).filter((o) => allowed.includes(o));
                return (
                  <div key={it.id} className="ap-turn">
                    <div className="ap-b them">{shown.message}</div>
                    {ops.length > 0 && <div className="ap-opts">{GROUPS.map(([label, list]) => { const mine = list.filter((o) => ops.includes(o)); if (!mine.length) return null; return (
                      <div key={label} className="ap-og"><p>{label}</p>{mine.map((o) => <button key={o} type="button" className={o === "STOP_SIP" ? "quiet" : ""} onClick={() => act(o)}>{LABEL[o]}</button>)}</div>); })}</div>}
                  </div>
                );
              })}
              {busy && <div className="ap-typing" aria-label="Writing a reply"><i /><i /><i /></div>}
            </section>
          </div>

          <div className="ap-dock">
            {chips.length > 0 && !busy && <div className="ap-chips">{chips.map((t) => <button key={t} type="button" onClick={() => ask(t)}>{t}</button>)}</div>}
            <form className="ap-ask" onSubmit={(e) => { e.preventDefault(); if (PII.test(q)) { tone(SFX.warn); return; } const v = q; setQ(""); ask(v); }}>
              <label htmlFor="ap-q" className="sr">Ask about this SIP</label>
              <input id="ap-q" ref={inputRef} autoComplete="off" maxLength={280} placeholder="Ask about this SIP" aria-describedby="ap-warn" value={q}
                onChange={(e) => { setQ(e.target.value); setWarn(PII.test(e.target.value) ? "That looks like a PAN, phone or account number. Please remove it. It's never needed here." : ""); }} />
              <button type="submit" aria-label="Send" disabled={busy || !q.trim() || !!warn}><ArrowUp size={18} aria-hidden="true" /></button>
            </form>
            <p className="ap-warn" id="ap-warn" role="status">{warn}</p>
            <p className="ap-fine">Information, not investment advice.</p>
          </div>

          {sheet && sheet.kind === "SETTINGS" && (
            <Sheet title="Display and sound" onClose={() => setSheet(null)}>
              <label className="ap-switch"><span>Larger text</span><input type="checkbox" checked={big} onChange={(e) => { setBig(e.target.checked); try { localStorage.setItem("sipc-big", e.target.checked ? "1" : "0"); } catch {} }} /></label>
              <label className="ap-switch"><span>Soft sounds</span><input type="checkbox" checked={snd} onChange={(e) => { setSnd(e.target.checked); try { localStorage.setItem("sipc-snd", e.target.checked ? "1" : "0"); } catch {} }} /></label>
            </Sheet>
          )}
          {sheet && sheet.kind !== "SETTINGS" && (
            <Sheet title={LABEL[sheet.kind]} okText={OK[sheet.kind](sip)} onOk={confirm} onClose={() => setSheet(null)} danger={sheet.kind === "STOP_SIP"}>
              {sheet.kind === "PAY_NOW" && <p>A one-time payment of {inr(sip.sip_amount)} for the instalment that didn't go through. Your missed count goes back to 0.</p>}
              {sheet.kind === "RETRY_MANDATE" && <p>We'll send an approval request to your bank app. Approve it there and you're done.</p>}
              {sheet.kind === "CHANGE_DATE" && (<>
                <p>Pick the day future payments go out.</p>
                {sip.stated_income_day && <p className="ap-tip">Your income usually arrives on the {ord(sip.stated_income_day)}. The {ord(Math.min(28, sip.stated_income_day + 1))} is the day after.</p>}
                <div className="ap-grid days">{Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <button key={d} type="button" aria-pressed={d === sheet.pick} onClick={() => setSheet({ ...sheet, pick: d })}>{d}</button>)}</div>
              </>)}
              {sheet.kind === "REDUCE_AMOUNT" && (<>
                <p>Choose a new monthly amount. You can raise it again any time.</p>
                <div className="ap-grid">{sheet.amts.map((v) => <button key={v} type="button" aria-pressed={v === sheet.pick} onClick={() => setSheet({ ...sheet, pick: v })}>{inr(v)}</button>)}</div>
              </>)}
              {sheet.kind === "PAUSE_WITH_DATE" && (<>
                <p>No payments during the pause, and it doesn't count as a miss. It restarts on its own.</p>
                <div className="ap-grid">{[1, 2, 3].map((n) => <button key={n} type="button" aria-pressed={n === sheet.pick} onClick={() => setSheet({ ...sheet, pick: n })}>{n} {n === 1 ? "month" : "months"}</button>)}</div>
              </>)}
              {sheet.kind === "RESUME_SIP" && <p>Payments restart from your next SIP date.</p>}
              {sheet.kind === "RESTART_SIP" && <p>Same amount, starting next month. You can change the date afterwards.</p>}
              {sheet.kind === "STOP_SIP" && <p>No more payments. What you've invested stays in your account, and you can undo this.</p>}
              {sheet.kind === "CONTACT_SUPPORT" && <p>Support opens with this SIP's details attached, so you don't have to explain it again.</p>}
            </Sheet>
          )}
        </div>
      </div>

      <aside className="ap-aside" aria-label="About this prototype">
        <label htmlFor="ap-sit">Try another situation</label>
        <select id="ap-sit" value={sid} onChange={(e) => load(e.target.value)}>
          {SITUATIONS.map(([id, t]) => <option key={id} value={id}>{t}</option>)}
        </select>
        <p>A working prototype with sample data. Nothing real is paid or changed. <a href="/design">See the design in Figma</a>.</p>
      </aside>
    </div>
  );
}
