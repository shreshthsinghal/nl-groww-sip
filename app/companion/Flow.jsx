"use client";
import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, CircleCheck, ExternalLink, Info } from "lucide-react";
import { FACTS, SOURCES } from "@/lib/companion/base.mjs";
import { lastAttempt, consecutive, nextDate, payNowUntil, previewDate, validateAmount, fmtShort, fmtDay, inr, ordinal, daysBetween } from "@/lib/companion/model.mjs";

export const TITLES = {
  PAY_MISSED: "Pay the missed instalment", ONE_TIME: "Make a one-time investment", CHANGE_DATE: "Change the instalment date",
  LOWER_AMOUNT: "Lower future instalments", SKIP_NEXT: "Skip the next instalment", STOP: "Stop this SIP", EXPLAIN: "About this status"
};

function Src({ id }) {
  const f = FACTS[id]; if (!f) return null;
  return <>{f.src.map((k) => <a key={k} className="cx-srclink" href={SOURCES[k].url} target="_blank" rel="noopener noreferrer">{SOURCES[k].title}<ExternalLink size={13} aria-hidden="true" /></a>)}</>;
}
function Rows({ rows }) {
  return <dl className="cx-sum">{rows.filter(Boolean).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;
}

/* A dialog that keeps focus inside, closes on Escape and returns focus to where it was opened. */
export default function Flow({ flow, s, view, onClose, onConfirm, onOpen, onAsk, onReset, setFlow }) {
  const box = useRef(null);
  useEffect(() => {
    const opener = document.activeElement;
    const f = box.current && box.current.querySelector("[data-autofocus]") || box.current && box.current.querySelector("button");
    f && f.focus();
    return () => { if (opener && opener.isConnected && opener.focus) opener.focus({ preventScroll: true }); };
  }, [flow.kind, flow.step]);
  function onKey(e) {
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    if (e.key !== "Tab") return;
    const f = [...box.current.querySelectorAll("button:not([disabled]),a[href],input,select,textarea,[tabindex='0']")];
    if (!f.length) return; const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  }
  const k = flow.kind, la = lastAttempt(s), nx = nextDate(s), n = consecutive(s), pn = payNowUntil(s);
  const within7 = nx && daysBetween(s.today, nx) <= 7;
  const amtErr = k === "LOWER_AMOUNT" ? validateAmount(flow.amount, s.amount) : null;
  let body = null, primary = null, back = null;

  if (flow.step === "done") {
    body = (
      <div className="cx-done">
        <CircleCheck size={40} aria-hidden="true" />
        <p className="cx-done-t">{flow.result}</p>
        <p className="cx-sim"><Info size={16} aria-hidden="true" />Simulated. No money moved and no real SIP changed.</p>
        <div className="cx-done-acts">
          <button type="button" className="cx-btn solid" data-autofocus onClick={onClose}>Back to the SIP</button>
          <button type="button" className="cx-btn ghost" onClick={() => { onClose(); onAsk("What does my status mean?"); }}>Ask about the new status</button>
          <button type="button" className="cx-btn quiet" onClick={() => { onClose(); onReset(); }}>Reset the demo</button>
        </div>
      </div>
    );
  } else if (k === "EXPLAIN") {
    const reason = la && la.result === "failed" ? (la.reason && la.reason.state === "confirmed" ? "confirmed" : "unknown") : la && la.result === "pending" ? "pending" : "none";
    body = (
      <div className="cx-explain">
        <section><h4>Status</h4><p>{view.label}. {view.headline}.</p></section>
        <section><h4>What we know</h4><p>{view.happened}</p><p className="cx-from">From this SIP's illustrative demo data.</p></section>
        <section><h4>What isn't known</h4><p>{reason === "unknown" ? "The exact reason for the " + fmtShort(la.date) + " failure hasn't been confirmed. Groww lists 15 possible causes across KYC, payment and scheme rules, so checking your KYC status, autopay status and balance on that date narrows it down." : reason === "pending" ? "Whether the " + fmtShort(la.date) + " instalment went through. The status updates once the bank responds." : "Nothing about this SIP's status is uncertain in the demo data. Bank fees, if any, aren't part of it."}</p>{reason === "unknown" && <Src id="CAUSES" />}</section>
        <section><h4>The rule that applies</h4><p>{FACTS.CANCEL_RULE.text} {n > 0 ? "This SIP has " + n + " in a row." : ""}</p><Src id="CANCEL_RULE" /></section>
        {n > 0 && <section><h4>Notifications</h4><p>{FACTS.NOTIFY.text}</p><Src id="NOTIFY" /></section>}
        <section><h4>Where this comes from</h4><p>The SIP details are illustrative demo data, not a real account. Product rules come from Groww Help and the AMFI process FAQ, checked on 26 Oct 2026.</p></section>
      </div>
    );
    primary = <button type="button" className="cx-btn solid" data-autofocus onClick={onClose}>Done</button>;
  } else if (k === "STOP" && within7) {
    body = (<>
      <p className="cx-lead">This SIP can't be stopped until the {fmtShort(nx)} instalment has passed.</p>
      <p>{FACTS.CANCEL_7D.text}</p><Src id="CANCEL_7D" />
      <p>If you don't want the {fmtShort(nx)} instalment taken, you can skip it. A skipped instalment isn't counted as a failure, and you can stop the SIP after that date.</p><Src id="SKIP_NOT_FAIL" />
    </>);
    primary = <button type="button" className="cx-btn solid" data-autofocus onClick={() => onOpen("SKIP_NEXT")}>Review skipping {fmtShort(nx)}</button>;
  } else if (flow.step === "edit" && k === "CHANGE_DATE") {
    const p = flow.day ? previewDate(s, flow.day) : null;
    body = (<>
      <p className="cx-lead">Pick the day of the month for future instalments.</p>
      <div className="cx-days" role="radiogroup" aria-label="Day of the month">
        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
          <button key={d} type="button" role="radio" aria-checked={flow.day === d} className={d === s.day ? "cur" : ""} aria-label={ordinal(d) + (d === s.day ? " (current)" : "")} onClick={() => setFlow({ ...flow, day: d })} {...(d === (flow.day || s.day) ? { "data-autofocus": true } : {})}>{d}</button>
        ))}
      </div>
      <p className="cx-note" aria-live="polite">{flow.day && flow.day !== s.day ? "The next instalment would be on " + fmtDay(p) + "." : "Currently the " + ordinal(s.day) + ". Days 29 to 31 aren't offered so every month has the date."}</p>
    </>);
    primary = <button type="button" className="cx-btn solid" disabled={!flow.day || flow.day === s.day} onClick={() => setFlow({ ...flow, step: "review" })}>Review change</button>;
  } else if (flow.step === "edit" && k === "LOWER_AMOUNT") {
    const quick = [500, 1000, 1500, 2000].filter((v) => v < s.amount);
    body = (<>
      <p className="cx-lead">Choose a lower amount for future instalments.</p>
      <label className="cx-field"><span>New monthly amount</span>
        <span className="cx-inr"><b aria-hidden="true">₹</b><input inputMode="numeric" autoComplete="off" value={flow.amount || ""} placeholder={String(Math.round(s.amount / 2))} aria-invalid={!!(flow.amount && amtErr)} aria-describedby="cx-amt-h" data-autofocus onChange={(e) => setFlow({ ...flow, amount: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter" && !amtErr) setFlow({ ...flow, step: "review" }); }} /></span>
      </label>
      <p id="cx-amt-h" className={"cx-note" + (flow.amount && amtErr ? " err" : "")} aria-live="polite">{flow.amount && amtErr ? amtErr : "Applies to future instalments only. Each fund sets its own minimum; this demo accepts multiples of ₹100 from ₹100."}</p>
      <div className="cx-quick" role="group" aria-label="Quick amounts">{quick.map((v) => <button key={v} type="button" aria-pressed={String(v) === String(flow.amount)} onClick={() => setFlow({ ...flow, amount: String(v) })}>{inr(v)}</button>)}</div>
    </>);
    primary = <button type="button" className="cx-btn solid" disabled={!!amtErr} onClick={() => setFlow({ ...flow, step: "review" })}>Review change</button>;
  } else {
    // review step for every action
    const rows = {
      PAY_MISSED: [["What changes", "The " + fmtShort(la.date) + " instalment of " + inr(la.amount) + " is paid. Missed in a row goes from " + n + " to 0."], ["What stays the same", "The " + ordinal(s.day) + " of the month and " + inr(s.amount) + " for future instalments."], ["Available until", pn ? fmtDay(pn) + " (Pay Now shows for 2 working days)" : "—"], ["Reversible here", "Yes, with Reset. A real payment can't be undone."]],
      ONE_TIME: [["What changes", "A one-time investment of " + inr(s.amount) + " in the same fund."], ["What stays the same", "Missed in a row stays at " + n + " in this demo."], ["Not confirmed", "Whether a one-time investment counts as the missed " + fmtShort(la.date) + " instalment. Some funds don't allow one-time investments."], ["Reversible here", "Yes, with Reset."]],
      CHANGE_DATE: [["What changes", "Future instalments move from the " + ordinal(s.day) + " to the " + ordinal(flow.day || s.day) + ". Next: " + fmtDay(previewDate(s, flow.day || s.day)) + "."], ["What stays the same", inr(s.amount) + " a month." + (n ? " Missed instalments stay missed." : "")], ["Not confirmed", "The app shows a processing time when you confirm, so a change may not apply to an instalment that is very close."], ["Reversible here", "Yes, change it again or Reset."]],
      LOWER_AMOUNT: [["What changes", "Future instalments go from " + inr(s.amount) + " to " + inr(Number(String(flow.amount || 0).replace(/[,₹\s]/g, ""))) + " a month."], ["What stays the same", "The " + ordinal(s.day) + " of the month." + (n ? " Missed instalments keep their original amount." : "")], ["Not confirmed", "The processing time the app shows, and this fund's minimum amount."], ["Reversible here", "Yes, you can raise it again or Reset."]],
      SKIP_NEXT: [["What changes", "The " + fmtShort(nx) + " instalment of " + inr(s.amount) + " won't be taken."], ["What stays the same", "Instalments continue the month after, at " + inr(s.amount) + "." + (n ? " Earlier missed instalments stay as they are; a skip doesn't add to them." : "")], ["Rule", "A skipped instalment isn't counted as a failure."], ["Reversible here", "Yes, with Reset."]],
      STOP: [["What changes", "No future instalments. The " + (nx ? fmtShort(nx) : "next") + " instalment won't be taken."], ["What stays the same", "What you've invested stays invested until you choose to redeem it."], ["In the real app", "A cancellation can't be undone, but you can start a new SIP in the same fund later."], ["Reversible here", "Yes, with Reset."]]
    }[k] || [];
    const src = { PAY_MISSED: "PAY_NOW", ONE_TIME: "ONE_TIME", CHANGE_DATE: "EDIT", LOWER_AMOUNT: "EDIT", SKIP_NEXT: "SKIP_NOT_FAIL", STOP: "CANCEL_HOW" }[k];
    body = (<>
      {k === "PAY_MISSED" && <p className="cx-lead">Only pay if the money is comfortably there. Skipping the next instalment or lowering the amount are fine choices too.</p>}
      {k === "STOP" && <p className="cx-lead">Here's exactly what stopping does, so you can decide.</p>}
      <Rows rows={rows} />
      <div className="cx-srcrow"><Src id={src} />{k === "STOP" && <Src id="CANCEL_FINAL" />}</div>
      <p className="cx-sim"><Info size={16} aria-hidden="true" />Simulation: confirming changes this demo only. No money moves and no real SIP changes.</p>
    </>);
    const label = { PAY_MISSED: "Pay " + inr(la ? la.amount : 0) + " (simulated)", ONE_TIME: "Invest " + inr(s.amount) + " (simulated)", CHANGE_DATE: "Change to the " + ordinal(flow.day || s.day) + " (simulated)", LOWER_AMOUNT: "Lower to " + inr(Number(String(flow.amount || 0).replace(/[,₹\s]/g, ""))) + " (simulated)", SKIP_NEXT: "Skip " + (nx ? fmtShort(nx) : "") + " (simulated)", STOP: "Stop the SIP (simulated)" }[k];
    primary = <button type="button" className="cx-btn solid" data-autofocus onClick={onConfirm}>{label}</button>;
    if (k === "CHANGE_DATE" || k === "LOWER_AMOUNT") back = () => setFlow({ ...flow, step: "edit" });
  }

  return (
    <div className="cx-scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cx-sheet" role="dialog" aria-modal="true" aria-labelledby="cx-sheet-t" ref={box} onKeyDown={onKey}>
        <div className="cx-sheet-h">
          {back ? <button type="button" className="cx-ib" aria-label="Back" onClick={back}><ChevronLeft size={20} aria-hidden="true" /></button> : <span className="cx-ib-sp" />}
          <h3 id="cx-sheet-t">{flow.step === "done" ? "Done" : TITLES[k]}</h3>
          <button type="button" className="cx-ib" aria-label="Close" onClick={onClose}><X size={20} aria-hidden="true" /></button>
        </div>
        <div className="cx-sheet-b">{body}</div>
        {flow.step !== "done" && <div className="cx-sheet-f">{k !== "EXPLAIN" && <button type="button" className="cx-btn ghost" onClick={back || onClose}>{back ? "Back" : "Cancel"}</button>}{primary}</div>}
      </div>
    </div>
  );
}
