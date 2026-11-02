"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUp, ChevronDown, ShieldCheck, ShieldAlert, ExternalLink, Info, CircleCheck, BookOpen, ChevronRight } from "lucide-react";
import { FACTS, SOURCES } from "@/lib/companion/base.mjs";
import { fmtShort, fmtDay, inr, ordinal, lastAttempt, consecutive } from "@/lib/companion/model.mjs";
import { OPT_ICON, STATUS_ICON, Timeline } from "./Overview";

export const PII = /\b[A-Z]{5}\d{4}[A-Z]\b|\b\d{9,18}\b/i;
const PII_MSG = "That looks like a PAN, phone or account number. It's never needed here, so please remove it.";

/* How each answer was produced, in plain words. "ok" answers passed every check. */
export const MODE = {
  live: ["ok", "Checked · written by live AI"], demo: ["ok", "Checked · guided answer (rule-based, not live AI)"], guard: ["ok", "Checked · answered without AI"],
  fallback: ["warn", "Safe fallback · the AI's draft was held back"], provider_down: ["warn", "AI unavailable · checked guided answer"],
  offline: ["warn", "Offline · checked on this device"], blocked: ["warn", "Safe reply"]
};

/* Scenario-aware starter questions. Each one is answered by the same engine and gate as typed questions. */
export function starterQuestions(s) {
  const la = lastAttempt(s), n = consecutive(s);
  if (s.stopped) return ["What happens to what I've invested?", "Can I start again later?", "What does my status mean?"];
  if (la && la.result === "pending") return ["Why does it say pending?", "Should I pay it again?", "What happens if it fails?", "When will I know the result?"];
  if (la && la.result === "failed") {
    const known = la.reason && la.reason.state === "confirmed";
    if (!known) return ["Why did the payment fail?", "How can I find the reason?", "What should I check next?", "What happens to my next instalment?"];
    if (n >= 2) return ["Why did my last instalment fail?", "What happens if I miss the next one?", "What can I do now?", "Will my existing investments be affected?"];
    return ["Does one missed instalment cancel my SIP?", "Can I still resolve it?", "What happens next month?", "Why did my last instalment fail?"];
  }
  if (s.tight) return ["What if I cannot afford this month's SIP?", "Can I lower the future amount?", "Can I change the payment date?", "What happens if I pause or stop?"];
  return ["When is my next instalment?", "What happens if I want to pause?", "Can I lower the future amount?", "What does my status mean?"];
}

/* Plain-language reason line. Only a confirmed reason is stated as fact. */
export function reasonLine(s) {
  const la = lastAttempt(s);
  if (s.stopped) return "Stopped on " + fmtShort(s.stopped) + " in this demo";
  if (!la) return "No instalments yet";
  if (la.result === "pending") return "Result not known yet: the bank hasn't replied";
  if (la.result === "failed") return la.reason && la.reason.state === "confirmed" ? "Reason: not enough money in the linked account on the debit date (confirmed)" : "Reason: not confirmed yet";
  if (la.result === "late") return "Last instalment paid with Pay Now (simulated)";
  return "Every instalment so far has been paid";
}

/* The original Groww-style mark used across the case study: violet tile, rising line, pink dot. Not Groww's real logo. */
export function GrowwMark({ size = 36 }) {
  return <svg width={size} height={size} viewBox="0 0 56 56" focusable="false"><rect width="56" height="56" rx="16" fill="#4127A0" /><polyline points="12,38 22,28 29,33 42,18" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="42" cy="18" r="5" fill="#FF7A8E" /></svg>;
}

export function Avatar({ size = 36 }) {
  return <span className="cz-av" style={{ width: size, height: size }} aria-hidden="true"><GrowwMark size={size} /></span>;
}

/* Compact, expandable SIP context. Friendly labels only, no internal codes. */
export function ContextCard({ s, v, tl, open, onToggle, onDetails, static: fixed }) {
  const Icon = STATUS_ICON[v.icon] || Info;
  const failedOrPending = v.la && (v.la.result === "failed" || v.la.result === "pending");
  return (
    <section className={"cz-ctx t-" + v.tone + (open ? " open" : "")} aria-label="This SIP">
      <div className="cz-ctx-top">
        <div className="cz-ctx-amt"><span>Monthly SIP</span><b>{inr(s.amount)}</b></div>
        <span className="cx-pill"><Icon size={15} aria-hidden="true" />{v.label}</span>
      </div>
      <p className="cz-ctx-h">{v.headline}</p>
      {(v.n > 0 || failedOrPending) && !s.stopped && (
        <div className="cz-meter" role="img" aria-label={v.n + " of 3 missed in a row; 3 in a row cancels a monthly SIP"}>
          {[0, 1, 2].map((i) => <i key={i} className={i < v.n ? "on" : ""} />)}<span>{v.n} of 3 missed in a row</span>
        </div>
      )}
      <p className="cz-ctx-r">{reasonLine(s)}</p>
      <p className="cz-ctx-n">{v.nx ? <>Next instalment: <b>{inr(s.amount)}</b> on <b>{fmtDay(v.nx)}</b></> : "No upcoming instalment"}</p>
      {!fixed && <button type="button" className="cz-ctx-t" aria-expanded={open} onClick={onToggle}>{open ? "Hide details" : "Details"}<ChevronDown size={16} aria-hidden="true" /></button>}
      {(open || fixed) && (
        <div className="cz-ctx-more">
          <dl>
            <div><dt>Last attempt</dt><dd>{v.la ? fmtShort(v.la.date) + " · " + ({ paid: "Paid", failed: "Didn't go through", pending: "Waiting for the bank", late: "Paid with Pay Now" }[v.la.result] || "—") : "—"}</dd></div>
            {v.pnOpen && <div><dt>Pay Now open until</dt><dd>{fmtDay(v.pn)}</dd></div>}
            <div><dt>Instalment day</dt><dd>{ordinal(s.day)} of each month</dd></div>
          </dl>
          <Timeline rows={tl} max={4} title="Recent activity" />
          {onDetails && <button type="button" className="cx-link" onClick={onDetails}>Open full SIP details<ChevronRight size={16} aria-hidden="true" /></button>}
        </div>
      )}
      <p className="cz-ctx-demo">Illustrative demo data · not a real Groww account</p>
    </section>
  );
}

function SourceList({ ids }) {
  const facts = ids.filter((id) => FACTS[id]);
  if (!facts.length) return null;
  return (
    <ul className="cz-src-list">
      {facts.map((id) => (
        <li key={id}><p>{FACTS[id].text}</p>
          <span>{FACTS[id].src.map((k) => <a key={k} href={SOURCES[k].url} target="_blank" rel="noopener noreferrer">{SOURCES[k].title}<ExternalLink size={12} aria-hidden="true" /></a>)}</span></li>
      ))}
    </ul>
  );
}

function OptionRows({ ids, opts, onOpen }) {
  const rows = ids.map((id) => opts.find((o) => o.id === id)).filter(Boolean).filter((o) => o.id !== "EXPLAIN");
  if (!rows.length) return null;
  return (
    <div className="cz-opts" role="group" aria-label="Options you can review">
      <p className="cz-lbl">Options you can review</p>
      {rows.map((o) => { const I = OPT_ICON[o.id] || BookOpen; return (
        <button key={o.id} type="button" className={o.available ? "" : "na"} onClick={() => onOpen(o.id)}>
          <span className="ic"><I size={17} aria-hidden="true" /></span><span className="tx"><b>{o.title}</b><span>{o.sub}</span></span><ChevronRight size={16} aria-hidden="true" />
        </button>); })}
    </div>
  );
}

/* One assistant answer. Structure adapts to how much there is to say. */
function Answer({ m, opts, onOpen, onInspect }) {
  const res = m.res, a = res.answer, [cls, label] = MODE[res.mode] || MODE.blocked;
  const [srcOpen, setSrcOpen] = useState(false);
  const blocks = [["", a.known], ["What this means", a.means], ["What you can do", a.todo]].filter(([, x]) => x && x.length);
  const structured = blocks.length >= 3;
  const passed = res.checks.filter((c) => c.ok).length;
  const srcIds = a.sources || [];
  return (
    <div className="cz-bubble bot">
      {blocks.map(([h, x], i) => <div key={i} className="cz-blk">{structured && h && <p className="cz-lbl">{h}</p>}<p>{x.join(" ")}</p></div>)}
      {a.uncertain && a.uncertain.length > 0 && <p className="cz-unc"><Info size={15} aria-hidden="true" /><span><b>Not confirmed yet. </b>{a.uncertain.join(" ")}</span></p>}
      {!m.stale && <OptionRows ids={a.actions || []} opts={opts} onOpen={onOpen} />}
      {!m.stale && (a.actions || []).includes("EXPLAIN") && <button type="button" className="cx-link cz-small" onClick={() => onOpen("EXPLAIN")}>How we know what we know<ChevronRight size={15} aria-hidden="true" /></button>}
      <div className="cz-meta">
        <button type="button" className={"cz-verify " + cls} onClick={() => onInspect(m.id)} aria-label={label + ". " + passed + " of " + res.checks.length + " checks passed. Open how this answer was generated."}>
          {cls === "ok" ? <ShieldCheck size={15} aria-hidden="true" /> : <ShieldAlert size={15} aria-hidden="true" />}<span>{cls === "ok" ? "Checked" : label.split(" · ")[0]}</span><span className="n">{passed}/{res.checks.length}</span>
        </button>
        {srcIds.filter((id) => FACTS[id]).length > 0 && (
          <button type="button" className="cz-srcbtn" aria-expanded={srcOpen} onClick={() => setSrcOpen(!srcOpen)}>
            <BookOpen size={15} aria-hidden="true" />{srcIds.filter((id) => FACTS[id]).length} source{srcIds.filter((id) => FACTS[id]).length > 1 ? "s" : ""}<ChevronDown size={14} aria-hidden="true" className={srcOpen ? "up" : ""} />
          </button>
        )}
        <span className="cz-mode">{res.mode === "live" ? "Live AI" : res.mode === "demo" ? "Guided answer" : res.mode === "guard" ? "Safe reply" : res.mode === "offline" ? "Offline" : "Fallback"}</span>
      </div>
      {srcOpen && <SourceList ids={srcIds} />}
    </div>
  );
}

function Typing({ live }) {
  return (
    <div className="cz-row bot cz-msg" aria-live="polite">
      <Avatar size={30} />
      <div className="cz-typing"><span className="dots" aria-hidden="true"><i /><i /><i /></span><span>{live ? "Writing and checking an answer…" : "Checking this SIP's details…"}</span></div>
    </div>
  );
}

/* The conversation: messages, starter questions and an anchored composer. */
export function Conversation({ s, v, tl, opts, chat, busy, live, sugg, onAsk, onOpen, onInspect, ctxOpen, setCtxOpen, onDetails, showContext = true, focusKey, compact }) {
  const [q, setQ] = useState(""), [err, setErr] = useState("");
  const logRef = useRef(null), ta = useRef(null), prevLen = useRef(chat.length);

  useEffect(() => {
    const box = logRef.current; if (!box) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    const grew = chat.length > prevLen.current; prevLen.current = chat.length;
    const last = chat[chat.length - 1];
    if (chat.length <= 2 && !busy) { box.scrollTo({ top: 0 }); prevLen.current = chat.length; return; } // a fresh conversation starts at the top
    if (busy) { box.scrollTo({ top: box.scrollHeight, behavior: motion }); return; }
    if (grew && last && (last.role === "bot" || last.role === "event")) {
      const el = box.querySelector('[data-mid="' + last.id + '"]');
      if (el) box.scrollTo({ top: Math.max(0, el.offsetTop - 12), behavior: motion });
    } else if (grew) box.scrollTo({ top: box.scrollHeight, behavior: motion });
  }, [chat, busy]);
  useLayoutEffect(() => { const t = ta.current; if (!t) return; t.style.height = ""; if (!q) return; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 132) + "px"; }, [q]);
  useEffect(() => { if (focusKey && ta.current) ta.current.focus({ preventScroll: true }); }, [focusKey]);

  function send(text) {
    if (busy) return;
    const t = (text ?? q).trim();
    if (!t) { setErr("Type a question, or pick one of the suggestions."); return; }
    if (PII.test(t)) { setErr(PII_MSG); return; }
    setErr(""); if (text === undefined) setQ(""); onAsk(t);
  }
  const pii = PII.test(q);

  return (
    <div className={"cz-chat" + (compact ? " compact" : "")}>
      <div className="cz-log" ref={logRef} role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation with SIP Companion">
        {showContext && <ContextCard s={s} v={v} tl={tl} open={ctxOpen} onToggle={() => setCtxOpen(!ctxOpen)} onDetails={onDetails} />}
        {chat.map((m) => {
          if (m.role === "user") return <div key={m.id} data-mid={m.id} className={"cz-row me cz-msg" + (m.stale ? " stale" : "")}><p className="cz-bubble me">{m.text}</p></div>;
          if (m.role === "sys") return <p key={m.id} data-mid={m.id} className="cz-sys cz-msg" role="note">{m.text}</p>;
          if (m.role === "err") return <div key={m.id} data-mid={m.id} className="cz-row bot cz-msg"><Avatar size={30} /><div className="cz-bubble bot err"><p>{m.text}</p>{m.retry && <button type="button" className="cx-btn ghost sm" onClick={() => onAsk(m.retry)}>Try again</button>}</div></div>;
          if (m.role === "event") return (
            <div key={m.id} data-mid={m.id} className="cz-row bot cz-msg"><Avatar size={30} />
              <div className="cz-bubble bot event"><p className="cz-done"><CircleCheck size={17} aria-hidden="true" /><b>{m.text}</b></p><p className="cz-simnote">Simulated. No money moved and no real SIP changed. The SIP card above shows the new demo status.</p>
                {!m.stale && <OptionRows ids={opts.filter((o) => o.available).map((o) => o.id)} opts={opts} onOpen={onOpen} />}</div></div>);
          if (m.role === "intro") return (
            <div key={m.id} data-mid={m.id} className="cz-row bot cz-msg"><Avatar size={30} />
              <div className="cz-bubble bot intro">
                <p><b>Hi, I'm your SIP Companion.</b></p>
                <p>I explain this SIP's status, missed instalments, upcoming payments and the options you have. Ask in your own words, and I'll tell you what's known, what it means and what you can do next.</p>
                <ul className="cz-scope">
                  <li><CircleCheck size={15} aria-hidden="true" /><span>I use this demo SIP's details and Groww and AMFI help pages, and every answer is checked before you see it.</span></li>
                  <li><CircleCheck size={15} aria-hidden="true" /><span>You stay in control. Paying, changing, skipping and stopping are shown side by side, and nothing here moves real money.</span></li>
                  <li><Info size={15} aria-hidden="true" /><span>I don't recommend funds or stocks, predict returns or decide whether you should invest.</span></li>
                </ul>
              </div>
            </div>);
          if (m.role === "summary") return (
            <div key={m.id} data-mid={m.id} className="cz-row bot cz-msg"><Avatar size={30} />
              <div className="cz-bubble bot">
                <p className="cz-lbl">Here's where this SIP stands</p>
                <p>{m.v.happened}</p>
                <p>{m.v.means}</p>
                {!m.stale && <OptionRows ids={opts.filter((o) => o.available).map((o) => o.id)} opts={opts} onOpen={onOpen} />}
                {!m.stale && <button type="button" className="cx-link cz-small" onClick={() => onOpen("EXPLAIN")}>How we know what we know<ChevronRight size={15} aria-hidden="true" /></button>}
              </div>
            </div>);
          return <div key={m.id} data-mid={m.id} className={"cz-row bot cz-msg" + (m.stale ? " stale" : "")}><Avatar size={30} /><Answer m={m} opts={opts} onOpen={onOpen} onInspect={onInspect} /></div>;
        })}
        {busy && <Typing live={live} />}
      </div>
      <div className="cz-dock">
        {!busy && sugg.length > 0 && (
          <div className="cz-sugg" role="group" aria-label="Suggested questions" key={sugg.join("|")}>
            {sugg.map((t) => <button key={t} type="button" onClick={() => send(t)}>{t}</button>)}
          </div>
        )}
        <form className="cz-compose" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <label htmlFor="cz-q" className="sr">Ask anything about your SIP</label>
          <textarea id="cz-q" ref={ta} rows={1} maxLength={300} placeholder="Ask about your SIP…" value={q} autoComplete="off" enterKeyHint="send"
            aria-invalid={pii || !!err} aria-describedby="cz-q-h"
            onChange={(e) => { setQ(e.target.value); setErr(PII.test(e.target.value) ? PII_MSG : ""); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} />
          <button type="submit" className="cz-send" aria-label={busy ? "Preparing an answer" : "Send question"} disabled={busy || pii || !q.trim()}>{busy ? <span className="cz-spin" aria-hidden="true" /> : <ArrowUp size={20} aria-hidden="true" />}</button>
        </form>
        <p id="cz-q-h" className={"cz-hint" + (err ? " err" : "")} role="status">{err || "Information, not investment advice."}</p>
      </div>
    </div>
  );
}
