"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUp, ChevronDown, ShieldCheck, ShieldAlert, ExternalLink, Info, CircleCheck, BookOpen, ChevronRight, Shuffle } from "lucide-react";
import { FACTS, SOURCES } from "@/lib/companion/base.mjs";
import { SCENARIOS, fmtShort, fmtDay, inr, ordinal, lastAttempt, consecutive } from "@/lib/companion/model.mjs";
import { OPT_ICON, STATUS_ICON, Timeline } from "./Overview";

export const PII = /\b[A-Z]{5}\d{4}[A-Z]\b|\b\d{9,18}\b/i;
const PII_MSG = "That looks like a PAN, phone or account number. It's never needed here, so please remove it.";
export const EXPLORE = "Explore another situation";

/* How each answer was produced, in plain words. "ok" answers passed every check. */
export const MODE = {
  live: ["ok", "Checked · written by live AI"], demo: ["ok", "Checked · guided answer (rule-based, not live AI)"], guard: ["ok", "Checked · answered without AI"],
  fallback: ["warn", "Safe fallback · the AI's draft was held back"], provider_down: ["warn", "AI unavailable · checked guided answer"],
  offline: ["warn", "Offline · checked on this device"], blocked: ["warn", "Safe reply"]
};

/* Scenario-aware starter questions. Each one is answered by the same engine and checks as typed questions. */
export function starterQuestions(s) {
  const la = lastAttempt(s), n = consecutive(s);
  if (s.stopped) return ["What happens to what I've invested?", "Can I start again later?", "What does my status mean?"];
  if (la && la.result === "pending") return ["Why does it say pending?", "Should I pay it again?", "What happens if it fails?", "When will I know the result?"];
  if (la && la.result === "failed") {
    const known = la.reason && la.reason.state === "confirmed";
    if (!known) return ["Why did the payment fail?", "How can I find the reason?", "What happens to my next instalment?", "Can I change my SIP date?"];
    if (n >= 2) return ["Why did my last instalment fail?", "What happens if I miss the next one?", "What if money is tight this month?", "Will my existing investments be affected?", "Can I change my SIP date?"];
    return ["Does one missed instalment cancel my SIP?", "Can I still resolve it?", "What happens next month?", "Can I change my SIP date?"];
  }
  if (s.tight) return ["What if I cannot afford this month's SIP?", "Can I lower the future amount?", "Can I change the payment date?", "What happens if I pause or stop?"];
  return ["When is my next instalment?", "What happens if I want to pause?", "Can I lower the future amount?", "What does my status mean?"];
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
  return <svg width={size} height={size} viewBox="0 0 56 56" focusable="false"><rect width="56" height="56" rx="16" fill="#4127A0" /><polyline points="12,38 22,28 29,33 42,18" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="42" cy="18" r="5" fill="#FF7A8E" /></svg>;
}
export function Avatar({ size = 36, alive = false, busy = false }) {
  return <span className={"cz-av" + (alive ? " alive" : "") + (busy ? " busy" : "")} style={{ width: size, height: size }} aria-hidden="true"><GrowwMark size={size} /></span>;
}

/* Smoothly expanding region. Closed content is inert, so it can't be tabbed into. */
function Reveal({ open, children, id }) {
  return <div id={id} className={"cz-reveal" + (open ? " open" : "")} inert={!open}><div>{children}</div></div>;
}

/* Compact SIP context: amount, status, misses in a row, reason. Full details expand on request. */
export function ContextCard({ s, v, tl, open, onToggle, onDetails, rail }) {
  const Icon = STATUS_ICON[v.icon] || Info;
  const showMeter = !s.stopped && (v.n > 0 || (v.la && v.la.result === "failed"));
  const rid = rail ? "cz-ctx-rail" : "cz-ctx-more";
  return (
    <section className={"cz-ctx t-" + v.tone + (open ? " open" : "") + (rail ? " rail" : "")} aria-label="Your SIP">
      <div className="cz-ctx-row">
        <div className="cz-ctx-amt"><b>{inr(s.amount)}</b><span>/month</span></div>
        <span className="cx-pill"><Icon size={15} aria-hidden="true" />{v.label}</span>
      </div>
      <div className="cz-ctx-row sub">
        {showMeter && <span className="cz-meter" role="img" aria-label={v.n + " of 3 missed in a row. 3 in a row cancels a monthly SIP."}>{[0, 1, 2].map((i) => <i key={i} className={i < v.n ? "on" : ""} />)}<em>{v.n} of 3 missed in a row</em></span>}
        <span className="cz-ctx-r">{reasonLine(s)}</span>
        <button type="button" className="cz-ctx-t" aria-expanded={open} aria-controls={rid} onClick={onToggle}>{open ? "Hide details" : "View SIP details"}<ChevronDown size={16} aria-hidden="true" /></button>
      </div>
      <Reveal open={open} id={rid}>
        <div className="cz-ctx-more">
          <dl>
            <div><dt>Next instalment</dt><dd>{v.nx ? inr(s.amount) + " on " + fmtDay(v.nx) : "None"}</dd></div>
            <div><dt>Last attempt</dt><dd>{v.la ? fmtShort(v.la.date) + " · " + ({ paid: "Paid", failed: "Didn't go through", pending: "Waiting for the bank", late: "Paid with Pay Now" }[v.la.result] || "—") : "—"}</dd></div>
            {v.pnOpen && <div><dt>Pay Now open until</dt><dd>{fmtDay(v.pn)}</dd></div>}
            <div><dt>Instalment day</dt><dd>{ordinal(s.day)} of each month</dd></div>
          </dl>
          <Timeline rows={tl} max={4} title="Recent activity" />
          {onDetails && <button type="button" className="cx-link" onClick={onDetails}>All SIP details and options<ChevronRight size={16} aria-hidden="true" /></button>}
          <p className="cz-ctx-demo">Illustrative demo data · not a real Groww account</p>
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
          <span>{FACTS[id].src.map((k) => <a key={k} href={SOURCES[k].url} target="_blank" rel="noopener noreferrer">{SOURCES[k].title}<ExternalLink size={12} aria-hidden="true" /></a>)}</span></li>
      ))}
    </ul>
  );
}

export function OptionRows({ ids, opts, onOpen, label = "Options you can review" }) {
  const rows = ids.map((id) => opts.find((o) => o.id === id)).filter(Boolean).filter((o) => o.id !== "EXPLAIN");
  if (!rows.length) return null;
  return (
    <div className="cz-opts" role="group" aria-label={label}>
      <p className="cz-lbl">{label}</p>
      {rows.map((o, i) => { const I = OPT_ICON[o.id] || BookOpen; return (
        <button key={o.id} type="button" style={{ "--i": i }} className={o.available ? "" : "na"} onClick={() => onOpen(o.id)}>
          <span className="ic"><I size={17} aria-hidden="true" /></span><span className="tx"><b>{o.title}</b><span>{o.sub}</span></span><ChevronRight size={16} aria-hidden="true" />
        </button>); })}
    </div>
  );
}

/* One assistant answer. Headings appear only when the answer has enough parts to need them. */
function Answer({ m, opts, onOpen, onInspect }) {
  const res = m.res, a = res.answer, [cls, label] = MODE[res.mode] || MODE.blocked;
  const [srcOpen, setSrcOpen] = useState(false);
  const blocks = [["What we know", a.known], ["What this means", a.means], ["What you can do", a.todo]].filter(([, x]) => x && x.length);
  const structured = blocks.length >= 3;
  const passed = res.checks.filter((c) => c.ok).length;
  const srcIds = (a.sources || []).filter((id) => FACTS[id]);
  return (
    <div className="cz-bubble bot">
      {blocks.map(([h, x], i) => <div key={i} className="cz-blk">{structured && i > 0 && <p className="cz-lbl">{h}</p>}<p>{x.join(" ")}</p></div>)}
      {a.uncertain && a.uncertain.length > 0 && <p className="cz-unc"><Info size={15} aria-hidden="true" /><span><b>Still uncertain. </b>{a.uncertain.join(" ")}</span></p>}
      {!m.stale && <OptionRows ids={a.actions || []} opts={opts} onOpen={onOpen} />}
      <div className="cz-meta">
        <button type="button" className={"cz-verify " + cls} onClick={() => onInspect(m.id)} aria-label={label + ". " + passed + " of " + res.checks.length + " checks passed. Open how this answer was generated."}>
          {cls === "ok" ? <ShieldCheck size={15} aria-hidden="true" /> : <ShieldAlert size={15} aria-hidden="true" />}<span>{cls === "ok" ? "Checked" : label.split(" · ")[0]}</span><span className="n">{passed}/{res.checks.length}</span>
        </button>
        {srcIds.length > 0 && (
          <button type="button" className="cz-srcbtn" aria-expanded={srcOpen} aria-controls={"src-" + m.id} onClick={() => setSrcOpen(!srcOpen)}>
            <BookOpen size={15} aria-hidden="true" />{srcIds.length} source{srcIds.length > 1 ? "s" : ""}<ChevronDown size={14} aria-hidden="true" className={srcOpen ? "up" : ""} />
          </button>
        )}
        <span className="cz-mode">{res.mode === "live" ? "Live AI" : res.mode === "demo" ? "Guided answer" : res.mode === "guard" ? "Safe reply" : res.mode === "offline" ? "Offline" : "Fallback"}</span>
      </div>
      {srcIds.length > 0 && <Reveal open={srcOpen} id={"src-" + m.id}><SourceList ids={srcIds} /></Reveal>}
    </div>
  );
}

function Typing({ live }) {
  return (
    <div className="cz-row bot cz-msg" role="status">
      <Avatar size={30} busy />
      <div className="cz-typing"><span className="dots" aria-hidden="true"><i /><i /><i /></span><span>{live ? "Writing an answer, then checking it…" : "Checking your SIP details…"}</span></div>
    </div>
  );
}

function Greeting({ sugg, onSend, onExplore }) {
  return (
    <div className="cz-greet">
      <Avatar size={46} alive />
      <h2 className="cz-g1">Hi! I'm your SIP Companion.</h2>
      <p className="cz-g2">Ask me, in your own words, about your SIP's status, missed instalments, payment dates, your options and what each one leads to.</p>
      {sugg && <div className="cz-sugg start" role="group" aria-label="Suggested questions">
        {sugg.map((t, i) => <button key={t} type="button" style={{ "--i": i }} onClick={() => onSend(t)}>{t}</button>)}
        <button type="button" className="alt" style={{ "--i": sugg.length }} onClick={onExplore}><Shuffle size={15} aria-hidden="true" />{EXPLORE}</button>
      </div>}
      <p className="cz-g3">Every answer is checked against verified help pages. No fund tips or return predictions, and nothing here moves real money.</p>
    </div>
  );
}

/* The conversation: messages, contextual suggestions and an anchored composer. */
export function Conversation({ s, v, tl, opts, chat, busy, live, sugg, onAsk, onOpen, onInspect, onExplore, onPick, ctxOpen, setCtxOpen, onDetails, showContext = true, focusKey }) {
  const [q, setQ] = useState(""), [err, setErr] = useState("");
  const logRef = useRef(null), ta = useRef(null), prevLen = useRef(chat.length);

  useEffect(() => {
    const box = logRef.current; if (!box) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    if (chat.length <= 1 && !busy) { box.scrollTo({ top: 0 }); prevLen.current = chat.length; return; } // a fresh conversation starts at the top
    const grew = chat.length > prevLen.current; prevLen.current = chat.length;
    const last = chat[chat.length - 1];
    if (busy) { box.scrollTo({ top: box.scrollHeight, behavior: motion }); return; }
    if (grew && last && last.role !== "user") {
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
  const fresh = chat.length === 1 && chat[0].role === "greet";

  return (
    <div className={"cz-chat" + (fresh ? " fresh" : "")}>
      {showContext && <div className="cz-ctxbar"><ContextCard s={s} v={v} tl={tl} open={ctxOpen} onToggle={() => setCtxOpen(!ctxOpen)} onDetails={onDetails} /></div>}
      <div className="cz-log" ref={logRef} role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation with SIP Companion">
        {chat.map((m) => {
          if (m.role === "greet") return <div key={m.id} data-mid={m.id} className="cz-greet-wrap"><Greeting sugg={fresh && !busy ? sugg : null} onSend={send} onExplore={onExplore} /></div>;
          if (m.role === "user") return <div key={m.id} data-mid={m.id} className={"cz-row me cz-msg" + (m.stale ? " stale" : "")}><p className="cz-bubble me">{m.text}</p></div>;
          if (m.role === "sys") return <p key={m.id} data-mid={m.id} className="cz-sys cz-msg" role="note">{m.text}</p>;
          if (m.role === "err") return <div key={m.id} data-mid={m.id} className="cz-row bot cz-msg"><Avatar size={30} /><div className="cz-bubble bot err"><p>{m.text}</p>{m.retry && <button type="button" className="cx-btn ghost sm" onClick={() => onAsk(m.retry)}>Try again</button>}</div></div>;
          if (m.role === "switch") return (
            <div key={m.id} data-mid={m.id} className="cz-row bot cz-msg"><Avatar size={30} />
              <div className="cz-bubble bot"><p className="cz-lbl">New situation · {m.title}</p><p>{m.v.happened}</p><p>{m.v.means}</p><p className="cz-simnote">Illustrative demo data. Ask me anything about it.</p></div></div>);
          if (m.role === "situations") return (
            <div key={m.id} data-mid={m.id} className="cz-row bot cz-msg"><Avatar size={30} />
              <div className="cz-bubble bot">
                <p>Here are the illustrative situations I can walk you through. Picking one starts a fresh conversation about that SIP.</p>
                <div className="cz-opts sit" role="group" aria-label="Demo situations">
                  {SCENARIOS.map((x, i) => (
                    <button key={x.id} type="button" style={{ "--i": i }} disabled={m.stale} aria-current={x.id === m.current ? "true" : undefined} onClick={() => onPick(x.id)}>
                      <span className="ic"><Shuffle size={16} aria-hidden="true" /></span><span className="tx"><b>{x.title}{x.id === m.current ? " · current" : ""}</b><span>{x.blurb}</span></span><ChevronRight size={16} aria-hidden="true" />
                    </button>))}
                </div>
              </div></div>);
          if (m.role === "event") return (
            <div key={m.id} data-mid={m.id} className="cz-row bot cz-msg"><Avatar size={30} />
              <div className="cz-bubble bot event"><p className="cz-done"><CircleCheck size={17} aria-hidden="true" /><b>{m.text}</b></p><p className="cz-simnote">Simulated. No money moved and no real SIP changed. Your SIP card shows the new demo status.</p>
                {!m.stale && <OptionRows ids={opts.filter((o) => o.available).map((o) => o.id)} opts={opts} onOpen={onOpen} label="What you can do now" />}</div></div>);
          return <div key={m.id} data-mid={m.id} className={"cz-row bot cz-msg" + (m.stale ? " stale" : "")}><Avatar size={30} /><Answer m={m} opts={opts} onOpen={onOpen} onInspect={onInspect} /></div>;
        })}
        {busy && <Typing live={live} />}
      </div>
      <div className="cz-dock">
        {!busy && !fresh && (
          <div className="cz-sugg" role="group" aria-label={fresh ? "Suggested questions" : "Follow-up suggestions"} key={sugg.join("|")}>
            {sugg.map((t, i) => <button key={t} type="button" style={{ "--i": i }} onClick={() => send(t)}>{t}</button>)}
            <button type="button" className="alt" style={{ "--i": sugg.length }} onClick={onExplore}><Shuffle size={15} aria-hidden="true" />{EXPLORE}</button>
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
        <p id="cz-q-h" className={"cz-hint" + (err ? " err" : "")} role="status">{err || "Information, not investment advice"}</p>
      </div>
    </div>
  );
}
