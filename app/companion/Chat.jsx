"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, ShieldCheck, ShieldAlert, ExternalLink, Info, CircleCheck, BookOpen, Shuffle, Mic, SendHorizontal, CornerDownLeft } from "lucide-react";
import { FACTS, SOURCES } from "@/lib/companion/base.mjs";
import { SOURCE_META } from "@/lib/companion/kb.mjs";
import { SCENARIOS, fmtShort, fmtDay, inr, ordinal, lastAttempt, consecutive } from "@/lib/companion/model.mjs";
import { OPT_ICON, STATUS_ICON, Timeline } from "./Overview";

export const PII = /\b[A-Z]{5}\d{4}[A-Z]\b|\b\d{9,18}\b/i;
const PII_MSG = "That looks like a PAN, phone or account number. It's never needed here, so please remove it.";
export const EXPLORE = "Explore another situation";

/* How each answer was produced, in plain words. "ok" answers passed every check. */
export const MODE = {
  demo: ["ok", "Checked · composed by the rule-based and retrieval engine from this SIP's data and verified help pages"], guard: ["ok", "Checked · answered by the safety guard"],
  live: ["ok", "Checked · written live by AI (Groq free tier), then checked"], fallback: ["ok", "Checked · the live AI's draft failed a check, so the rule-based engine answered"], provider_down: ["ok", "Checked · live AI unavailable (free-tier limit or slow), so the rule-based engine answered"],
  offline: ["warn", "Offline · checked on this device"], blocked: ["warn", "Safe reply"]
};
const SHORT = { PAY_MISSED: "Pay missed instalment", ONE_TIME: "One-time investment", CHANGE_DATE: "Change date", LOWER_AMOUNT: "Lower amount", SKIP_NEXT: "Skip next", STOP: "Stop SIP" };

/* Scenario-aware starter questions. Each goes through the same engine and checks as typed messages. */
export function starterQuestions(s) {
  const la = lastAttempt(s), n = consecutive(s);
  if (s.stopped) return ["What happens to what I've invested?", "Can I start again later?", "How do I withdraw?"];
  if (la && la.result === "pending") return ["Why does it say pending?", "Should I pay it again?", "What happens if it fails?"];
  if (la && la.result === "failed") {
    const known = la.reason && la.reason.state === "confirmed";
    if (!known) return ["Why did the payment fail?", "What should I check first?", "Can I change my SIP date?"];
    if (n >= 2) return ["Why did my last instalment fail?", "What happens if I miss the next one?", "What if money is tight this month?"];
    return ["Does one missed instalment cancel my SIP?", "Can I still resolve it?", "Can I change my SIP date?"];
  }
  if (s.tight) return ["What if I cannot afford this month's SIP?", "Can I lower the future amount?", "Can I change the payment date?"];
  return ["When is my next instalment?", "What happens if I want to pause?", "What is a SIP?"];
}

/* Typeahead: questions people ask plus the demo situations, matched to what's being typed. */
const EXTRA_Q = ["What does my status mean?", "When is my next instalment?", "Can I skip next month?", "How do I stop my SIP?", "Will I be charged a fee?", "Can I lower the future amount?", "Can I change my SIP date?", "What happens to what I've invested?", "What is a SIP?", "What is NAV?", "How do I withdraw?", "Is my money guaranteed?", "What is an exit load?", "What is the minimum SIP amount?", "Can I reduce my SIP to ₹1,500?", "Can I move my SIP to the 5th?"];
const SIT_WORDS = { A: "two missed miss misses row failed fail insufficient balance cancel", B: "unknown reason failed fail why bank", C: "tight money afford salary short cash broke", D: "one missed miss failed first", E: "pending processing waiting debit today result" };
const words = (t) => String(t).toLowerCase().match(/[a-z0-9]{2,}/g) || [];
function score(text, qw) { const tw = words(text); return qw.reduce((n, w) => n + (tw.some((x) => x.startsWith(w) || w.startsWith(x)) ? 1 : 0), 0); }
export function typeahead(s, q, asked) {
  const qw = words(q);
  const pool = [...new Set(starterQuestions(s).concat(EXTRA_Q))].filter((t) => !asked.includes(t));
  const qs = qw.length ? pool.map((t) => [t, score(t, qw)]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([t]) => t) : starterQuestions(s).filter((t) => !asked.includes(t));
  const sits = SCENARIOS.map((x) => [x, qw.length ? score(x.title + " " + x.blurb + " " + SIT_WORDS[x.id], qw) : 1]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([x]) => x);
  return { qs: qs.slice(0, 4), sits: sits.slice(0, qw.length ? 2 : 5) };
}

/* Plain-language reason line. Only a confirmed reason is stated as fact. */
export function reasonLine(s) {
  const la = lastAttempt(s);
  if (s.stopped) return "Stopped on " + fmtShort(s.stopped) + " (simulated)";
  if (!la) return "No instalments yet";
  if (la.result === "pending") return "Result pending: the bank hasn't replied yet";
  if (la.result === "failed") return la.reason && la.reason.state === "confirmed" ? "Reason: insufficient balance (confirmed)" : "Reason: not confirmed yet";
  if (la.result === "late") return "Last instalment paid with Pay Now (simulated)";
  return "Every instalment so far has been paid";
}

/* The case study's original Groww-style mark: violet tile, rising line, pink dot. Not Groww's real logo. */
export function GrowwMark({ size = 36 }) {
  return <svg width={size} height={size} viewBox="0 0 56 56" focusable="false" aria-hidden="true"><rect width="56" height="56" rx="16" fill="#4127A0" /><polyline points="12,38 22,28 29,33 42,18" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="42" cy="18" r="5" fill="#FF7A8E" /></svg>;
}

/* The companion's face: a glowing orb that breathes, blinks, and looks around while it works. */
export function Orb({ size = 40, state = "idle", halo = false }) {
  return (
    <span className={"orb " + state + (halo ? " halo" : "")} style={{ "--o": size + "px" }} aria-hidden="true">
      <span className="orb-glow" /><span className="orb-ball"><span className="orb-face"><i /><i /><b /></span></span>
    </span>
  );
}
export const Avatar = ({ size = 30, busy }) => <Orb size={size} state={busy ? "think" : "idle"} />;

function Reveal({ open, children, id }) {
  return <div id={id} className={"cz-reveal" + (open ? " open" : "")} inert={!open}><div>{children}</div></div>;
}
const clock = (t) => (t ? new Date(t).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "");

/* Glass SIP card: amount, status, misses in a row and the reason; details expand on request. */
export function SipCard({ s, v, tl, open, onToggle, onDetails, id = "cz-sip" }) {
  const Icon = STATUS_ICON[v.icon] || Info;
  const showMeter = !s.stopped && (v.n > 0 || (v.la && v.la.result === "failed"));
  return (
    <section className={"glass cz-sip t-" + v.tone + (open ? " open" : "")} aria-label="Your SIP">
      <div className="cz-sip-top">
        <div><span className="cz-sip-k">Monthly SIP of</span><b className="cz-sip-v">{inr(s.amount)}</b></div>
        <span className="cz-tag"><Icon size={14} aria-hidden="true" />{v.label}</span>
      </div>
      {showMeter && <span className="cz-meter" role="img" aria-label={v.n + " of 3 missed in a row. 3 in a row cancels a monthly SIP."}>{[0, 1, 2].map((i) => <i key={i} className={i < v.n ? "on" : ""} />)}<em>{v.n} of 3 missed in a row</em></span>}
      <p className="cz-sip-r">{reasonLine(s)}</p>
      <button type="button" className="cz-sip-t" aria-expanded={open} aria-controls={id} onClick={onToggle}>{open ? "Hide details" : "View SIP details"}<ChevronDown size={16} aria-hidden="true" /></button>
      <Reveal open={open} id={id}>
        <div className="cz-sip-more">
          <dl>
            <div><dt>Next instalment</dt><dd>{v.nx ? inr(s.amount) + " on " + fmtDay(v.nx) : "None"}</dd></div>
            <div><dt>Last attempt</dt><dd>{v.la ? fmtShort(v.la.date) + " · " + ({ paid: "Paid", failed: "Didn't go through", pending: "Waiting for the bank", late: "Paid with Pay Now" }[v.la.result] || "—") : "—"}</dd></div>
            {v.pnOpen && <div><dt>Pay Now open until</dt><dd>{fmtDay(v.pn)}</dd></div>}
            <div><dt>Instalment day</dt><dd>{ordinal(s.day)} of each month</dd></div>
            <div><dt>Fund</dt><dd>Sample fund (illustrative)</dd></div>
          </dl>
          <Timeline rows={tl} max={4} title="Recent activity" />
          {onDetails && <button type="button" className="cx-link" onClick={onDetails}>All SIP details and options</button>}
        </div>
      </Reveal>
    </section>
  );
}

function SourceList({ ids }) {
  return (
    <ul className="cz-src-list">
      {ids.map((id) => (
        <li key={id}><p>{FACTS[id].text}</p>
          <span>{FACTS[id].src.map((k) => <a key={k} href={SOURCES[k].url} target="_blank" rel="noopener noreferrer">{SOURCES[k].title}<ExternalLink size={12} aria-hidden="true" /></a>)}</span>
          {FACTS[id].src[0] && SOURCE_META[FACTS[id].src[0]] && <small className="cz-src-meta">{SOURCE_META[FACTS[id].src[0]].org.split(" (")[0]} · checked {fmtShort(SOURCE_META[FACTS[id].src[0]].verified)} 2026</small>}</li>
      ))}
    </ul>
  );
}

/* Option tiles: every choice looks the same, so none is pushed. */
export function Tiles({ ids, opts, onOpen, label = "Options you can review" }) {
  const rows = ids.map((id) => opts.find((o) => o.id === id)).filter(Boolean).filter((o) => o.id !== "EXPLAIN");
  if (!rows.length) return null;
  return (
    <div className="cz-tiles" role="group" aria-label={label}>
      {rows.map((o, i) => { const I = OPT_ICON[o.id] || BookOpen; return (
        <button key={o.id} type="button" style={{ "--i": i }} className={o.available ? "" : "na"} onClick={() => onOpen(o.id)} title={o.sub}>
          <span className="ic"><I size={18} aria-hidden="true" /></span><span>{SHORT[o.id] || o.title}</span>
        </button>); })}
    </div>
  );
}

function Answer({ m, opts, onOpen, onInspect }) {
  const res = m.res, a = res.answer, [cls, label] = MODE[res.mode] || MODE.blocked;
  const [srcOpen, setSrcOpen] = useState(false);
  const paras = [].concat(a.known, a.means, a.todo).filter(Boolean);
  const passed = res.checks.filter((c) => c.ok).length;
  const srcIds = (a.sources || []).filter((id) => FACTS[id]);
  return (
    <div className="cz-ans">
      <div className="cz-bubble bot">
        {paras.map((p, i) => <p key={i} style={{ "--i": i }}>{p}</p>)}
        {a.uncertain && a.uncertain.length > 0 && <p className="cz-unc" style={{ "--i": paras.length }}><Info size={15} aria-hidden="true" /><span>{a.uncertain.join(" ")}</span></p>}
        <time className="cz-time">{clock(m.at)}</time>
      </div>
      <div className="cz-meta">
        <button type="button" className={"cz-verify " + cls} onClick={() => onInspect(m.id)} aria-label={label + ". " + passed + " of " + res.checks.length + " checks passed. Open how this answer was generated."}>
          {cls === "ok" ? <ShieldCheck size={15} aria-hidden="true" /> : <ShieldAlert size={15} aria-hidden="true" />}<span>{cls === "ok" ? "Checked" : label.split(" · ")[0]}</span><span className="n">{passed}/{res.checks.length}</span>
        </button>
        <span className={"cz-mode" + (res.mode === "live" ? " live" : "")}>{res.mode === "live" ? "Live AI" : res.mode === "provider_down" && (res.reason === "rate_limited" || res.reason === "busy") ? "Rule-based · AI limit reached" : res.mode === "provider_down" ? "Rule-based · AI unavailable" : res.mode === "fallback" ? "Rule-based · AI draft didn't pass checks" : res.mode === "demo" ? "Rule-based · verified sources" : res.mode === "guard" ? "Safety guard" : res.mode === "offline" ? "Offline" : "Safe reply"}</span>
      </div>
      {srcIds.length > 0 && (
        <div className={"glass cz-srcs" + (srcOpen ? " open" : "")}>
          <button type="button" aria-expanded={srcOpen} aria-controls={"src-" + m.id} onClick={() => setSrcOpen(!srcOpen)}><span>Sources <em>({srcIds.length})</em></span><ChevronDown size={18} aria-hidden="true" /></button>
          <Reveal open={srcOpen} id={"src-" + m.id}><SourceList ids={srcIds} /></Reveal>
        </div>
      )}
      {!m.stale && <Tiles ids={a.actions || []} opts={opts} onOpen={onOpen} />}
    </div>
  );
}

function Typing() {
  return (
    <div className="cz-row bot cz-msg" role="status">
      <Orb size={30} state="think" />
      <div className="cz-typing"><span className="dots" aria-hidden="true"><i /><i /><i /></span><span>Checking your SIP details…</span></div>
    </div>
  );
}

function useSpeech(onText, onFinal) {
  const rec = useRef(null), [on, setOn] = useState(false), [ok, setOk] = useState(false);
  useEffect(() => { setOk(typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition)); }, []);
  function toggle() {
    if (on) { rec.current && rec.current.stop(); return; }
    const R = window.SpeechRecognition || window.webkitSpeechRecognition; if (!R) return;
    const r = new R(); r.lang = "en-IN"; r.interimResults = true; r.maxAlternatives = 1;
    r.onresult = (e) => { const t = [...e.results].map((x) => x[0].transcript).join(" "); onText(t); if (e.results[e.results.length - 1].isFinal) onFinal(t); };
    r.onend = () => setOn(false); r.onerror = () => setOn(false);
    rec.current = r; setOn(true); try { r.start(); } catch { setOn(false); }
  }
  return { ok, on, toggle };
}

/* The conversation: greeting, messages, suggestions, typeahead and an anchored composer with voice input. */
export function Conversation({ s, v, tl, opts, chat, busy, sugg, onAsk, onOpen, onInspect, onExplore, onPick, ctxOpen, setCtxOpen, onDetails, showCard = true, focusKey }) {
  const [q, setQ] = useState(""), [err, setErr] = useState(""), [acOpen, setAcOpen] = useState(false), [hi, setHi] = useState(-1);
  const logRef = useRef(null), ta = useRef(null), prevLen = useRef(chat.length);
  const speech = useSpeech((t) => { setQ(t); setAcOpen(false); }, (t) => { const x = t.trim(); if (x && !PII.test(x)) { setQ(""); onAsk(x); } });

  useEffect(() => {
    const box = logRef.current; if (!box) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    if (chat.length <= 1 && !busy) { box.scrollTo({ top: 0 }); prevLen.current = chat.length; return; }
    const grew = chat.length > prevLen.current; prevLen.current = chat.length;
    const last = chat[chat.length - 1];
    if (busy) { box.scrollTo({ top: box.scrollHeight, behavior: motion }); return; }
    if (grew && last && last.role !== "user") {
      const el = box.querySelector('[data-mid="' + last.id + '"]');
      if (el) box.scrollTo({ top: Math.max(0, el.offsetTop - 12), behavior: motion });
    } else if (grew) box.scrollTo({ top: box.scrollHeight, behavior: motion });
  }, [chat, busy]);
  useLayoutEffect(() => { const t = ta.current; if (!t) return; t.style.height = ""; if (!q) return; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 120) + "px"; }, [q]);
  useEffect(() => { if (focusKey && ta.current) ta.current.focus({ preventScroll: true }); }, [focusKey]);

  function send(text) {
    if (busy) return;
    const t = (text ?? q).trim();
    if (!t) { setErr("Type a message, or pick a suggestion."); return; }
    if (PII.test(t)) { setErr(PII_MSG); return; }
    setErr(""); if (text === undefined) setQ(""); onAsk(t);
  }
  const pii = PII.test(q);
  const fresh = chat.length === 0;
  const asked = chat.filter((m) => m.role === "user").map((m) => m.text);
  const ac = typeahead(s, q, asked);
  const acItems = [...ac.qs.map((t) => ({ k: "q", t })), ...ac.sits.map((x) => ({ k: "s", x }))];
  const showAc = acOpen && !busy && acItems.length > 0 && !pii;
  function choose(it) { setAcOpen(false); setHi(-1); setQ(""); if (it.k === "q") send(it.t); else onPick(it.x.id); }
  function onKey(e) {
    if (!acOpen && e.key === "ArrowDown" && !busy) { e.preventDefault(); setAcOpen(true); return; }
    if (showAc && (e.key === "ArrowDown" || e.key === "ArrowUp")) { e.preventDefault(); const n = acItems.length; setHi((h) => (e.key === "ArrowDown" ? (h + 1) % n : (h - 1 + n) % n)); return; }
    if (e.key === "Escape" && showAc) { e.preventDefault(); setAcOpen(false); setHi(-1); return; }
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (showAc && hi >= 0) choose(acItems[hi]); else { setAcOpen(false); send(); } }
  }

  return (
    <div className={"cz-chat" + (fresh ? " fresh" : "")}>
      <div className="cz-log" ref={logRef} role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation with SIP Companion">
        {fresh ? (
          <div className="cz-hero">
            <Orb size={showCard ? 92 : 120} state="hello" halo />
            <h2 className="cz-hello">Hi! I'm your<br />SIP Companion</h2>
            <p className="cz-sub">Ask me anything about your SIP in your own words: missed payments, dates, your options, or how SIPs work.</p>
            {showCard && <SipCard s={s} v={v} tl={tl} open={ctxOpen} onToggle={() => setCtxOpen(!ctxOpen)} onDetails={onDetails} />}
            <div className="cz-chips" role="group" aria-label="Suggested questions">
              {sugg.map((t, i) => <button key={t} type="button" style={{ "--i": i }} onClick={() => send(t)}>{t}</button>)}
              <button type="button" className="alt" style={{ "--i": sugg.length }} onClick={onExplore}><Shuffle size={14} aria-hidden="true" />{EXPLORE}</button>
            </div>
            <p className="cz-trust"><ShieldCheck size={14} aria-hidden="true" />Every reply is checked against verified help pages. No fund tips, no return predictions, no real money moves.</p>
            <p className="cz-trust cz-ai-note"><Info size={14} aria-hidden="true" />Live AI runs on a free tier with a small per-minute limit. When it's used up or slow, replies come from the built-in rule-based and retrieval engine, checked the same way.</p>
          </div>
        ) : chat.map((m) => {
          if (m.role === "user") return <div key={m.id} data-mid={m.id} className={"cz-row me cz-msg" + (m.stale ? " stale" : "")}><div className="cz-me"><p className="cz-bubble me">{m.text}</p><time className="cz-time">{clock(m.at)}</time></div></div>;
          if (m.role === "sys") return <p key={m.id} data-mid={m.id} className="cz-sys cz-msg" role="note">{m.text}</p>;
          if (m.role === "err") return <div key={m.id} data-mid={m.id} className="cz-row bot cz-msg"><Orb size={30} /><div className="cz-bubble bot err"><p>{m.text}</p>{m.retry && <button type="button" className="cx-btn ghost sm" onClick={() => onAsk(m.retry)}>Try again</button>}</div></div>;
          if (m.role === "switch") return (
            <div key={m.id} data-mid={m.id} className="cz-row bot cz-msg"><Orb size={30} />
              <div className="cz-ans"><div className="cz-bubble bot"><p><b>New situation: {m.title}.</b> {m.v.happened}</p><p>{m.v.means}</p><p>Ask me anything about it.</p><time className="cz-time">{clock(m.at)}</time></div></div></div>);
          if (m.role === "situations") return (
            <div key={m.id} data-mid={m.id} className="cz-row bot cz-msg"><Orb size={30} />
              <div className="cz-ans"><div className="cz-bubble bot"><p>Here are the illustrative situations I can walk you through. Picking one starts a fresh conversation about that SIP.</p><time className="cz-time">{clock(m.at)}</time></div>
                <div className="cz-sits" role="group" aria-label="Demo situations">
                  {SCENARIOS.map((x, i) => (
                    <button key={x.id} type="button" style={{ "--i": i }} disabled={m.stale} aria-current={x.id === m.current ? "true" : undefined} onClick={() => onPick(x.id)}>
                      <Shuffle size={16} aria-hidden="true" /><span><b>{x.title}{x.id === m.current ? " · current" : ""}</b><em>{x.blurb}</em></span>
                    </button>))}
                </div></div></div>);
          if (m.role === "event") return (
            <div key={m.id} data-mid={m.id} className="cz-row bot cz-msg"><Orb size={30} />
              <div className="cz-ans"><div className="cz-bubble bot event"><p className="cz-done"><CircleCheck size={17} aria-hidden="true" /><b>{m.text}</b></p><p className="cz-simnote">Simulated. No money moved and no real SIP changed.</p><time className="cz-time">{clock(m.at)}</time></div>
                {!m.stale && <Tiles ids={opts.filter((o) => o.available).map((o) => o.id)} opts={opts} onOpen={onOpen} label="What you can do now" />}</div></div>);
          return <div key={m.id} data-mid={m.id} className={"cz-row bot cz-msg" + (m.stale ? " stale" : "")}><Orb size={30} /><Answer m={m} opts={opts} onOpen={onOpen} onInspect={onInspect} /></div>;
        })}
        {busy && <Typing />}
      </div>
      <div className="cz-dock">
        {showAc && (
          <div className="cz-ac" id="cz-ac" role="listbox" aria-label="Suggestions">
            {ac.qs.length > 0 && <p className="cz-ac-h" aria-hidden="true">{q.trim() ? "Questions like yours" : "Try asking"}</p>}
            {ac.qs.map((t, i) => <div key={t} id={"cz-ac-" + i} role="option" aria-selected={hi === i} className={"cz-ac-i" + (hi === i ? " on" : "")} onMouseDown={(e) => { e.preventDefault(); choose({ k: "q", t }); }}><CornerDownLeft size={14} aria-hidden="true" /><span>{t}</span></div>)}
            {ac.sits.length > 0 && <p className="cz-ac-h" aria-hidden="true">Explore a situation</p>}
            {ac.sits.map((x, j) => { const i = ac.qs.length + j; return <div key={x.id} id={"cz-ac-" + i} role="option" aria-selected={hi === i} className={"cz-ac-i sit" + (hi === i ? " on" : "")} onMouseDown={(e) => { e.preventDefault(); choose({ k: "s", x }); }}><Shuffle size={14} aria-hidden="true" /><span><b>{x.title}</b><em>{x.blurb}</em></span></div>; })}
          </div>
        )}
        {!fresh && !busy && sugg.length > 0 && (
          <div className="cz-follow" role="group" aria-label="Follow-up suggestions" key={sugg.join("|")}>
            {sugg.map((t, i) => <button key={t} type="button" style={{ "--i": i }} onClick={() => send(t)}>{t}</button>)}
            <button type="button" className="alt" style={{ "--i": sugg.length }} onClick={onExplore}><Shuffle size={14} aria-hidden="true" />{EXPLORE}</button>
          </div>
        )}
        <form className={"cz-compose" + (speech.on ? " rec" : "")} onSubmit={(e) => { e.preventDefault(); setAcOpen(false); send(); }}>
          {speech.ok && <button type="button" className="cz-mic" aria-pressed={speech.on} aria-label={speech.on ? "Stop voice input" : "Ask by voice"} onClick={speech.toggle} disabled={busy}><Mic size={19} aria-hidden="true" /></button>}
          <label htmlFor="cz-q" className="sr">Type your question</label>
          <textarea id="cz-q" ref={ta} rows={1} maxLength={300} placeholder={speech.on ? "Listening…" : "Type your question…"} value={q} autoComplete="off" enterKeyHint="send"
            role="combobox" aria-expanded={showAc} aria-controls="cz-ac" aria-autocomplete="list" aria-activedescendant={showAc && hi >= 0 ? "cz-ac-" + hi : undefined}
            aria-invalid={pii || !!err} aria-describedby="cz-q-h"
            onClick={() => setAcOpen(true)} onBlur={() => { setAcOpen(false); setHi(-1); }}
            onChange={(e) => { setQ(e.target.value); setAcOpen(true); setHi(-1); setErr(PII.test(e.target.value) ? PII_MSG : ""); }}
            onKeyDown={onKey} />
          <button type="submit" className="cz-send" aria-label={busy ? "Preparing an answer" : "Send"} disabled={busy || pii || !q.trim()}>{busy ? <span className="cz-spin" aria-hidden="true" /> : <SendHorizontal size={19} aria-hidden="true" />}</button>
        </form>
        <p id="cz-q-h" className={"cz-hint" + (err ? " err" : "")} role="status">{err || "Information, not investment advice · Live AI on a free tier; rule-based replies when the limit is reached"}</p>
      </div>
    </div>
  );
}
