"use client";
import { useState } from "react";
import { ChevronRight, TriangleAlert, CircleCheck, Clock, CircleStop, Info, CreditCard, CalendarDays, Minus, SkipForward, BookOpen, Wallet, History, MessageCircle } from "lucide-react";
import { fmt, fmtShort, fmtDay, inr } from "@/lib/companion/model.mjs";

export const OPT_ICON = { PAY_MISSED: CreditCard, ONE_TIME: Wallet, CHANGE_DATE: CalendarDays, LOWER_AMOUNT: Minus, SKIP_NEXT: SkipForward, STOP: CircleStop, EXPLAIN: BookOpen };
export const STATUS_ICON = { alert: TriangleAlert, check: CircleCheck, clock: Clock, stop: CircleStop };

function Status({ s, v }) {
  const Icon = STATUS_ICON[v.icon] || Info;
  return (
    <section className={"cx-status t-" + v.tone} aria-labelledby="cz-ov-h">
      <div className="cx-st-top">
        <span className="cx-pill"><Icon size={16} aria-hidden="true" />{v.label}</span>
        <span className="cx-amt"><b>{inr(s.amount)}</b> a month</span>
      </div>
      <h2 id="cz-ov-h">{v.headline}</h2>
      <dl className="cx-facts">
        <div><dt>Started</dt><dd>{fmt(s.start)} · {s.inst.length} instalments</dd></div>
        <div><dt>Missed in a row</dt><dd className="cx-miss"><span className="cx-steps" aria-hidden="true">{[0, 1, 2].map((i) => <i key={i} className={i < v.n ? "on" : ""} />)}</span>{v.n} of 3</dd></div>
        <div><dt>Last attempt</dt><dd>{v.la ? fmtShort(v.la.date) + " · " + ({ paid: "Paid", failed: "Failed", pending: "Pending", late: "Paid late" }[v.la.result] || "—") : "—"}</dd></div>
        <div><dt>Next instalment</dt><dd>{v.nx ? fmtDay(v.nx) : "None"}</dd></div>
      </dl>
    </section>
  );
}

export function OptionList({ opts, onOpen, title = "Your options", sub = "Each option is reviewed before anything changes. Nothing here is real." }) {
  return (
    <section className="cx-opts" aria-label={title}>
      {title && <h3>{title}</h3>}
      {sub && <p className="cx-optsub">{sub}</p>}
      <ul>
        {opts.filter((o) => o.id !== "EXPLAIN").map((o) => { const I = OPT_ICON[o.id]; return (
          <li key={o.id}><button type="button" className={o.available ? "" : "na"} onClick={() => onOpen(o.id)}>
            <span className="ic"><I size={18} aria-hidden="true" /></span>
            <span className="tx"><b>{o.title}</b><span>{o.sub}</span></span>
            <ChevronRight size={18} aria-hidden="true" />
          </button></li>); })}
      </ul>
    </section>
  );
}

export function Timeline({ rows, max = 5, title = "History" }) {
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(-max);
  const ICON = { paid: CircleCheck, failed: TriangleAlert, pending: Clock, recovered: CircleCheck, scheduled: CalendarDays, skipped: SkipForward, action: History };
  return (
    <section className="cx-tl" aria-label={title}>
      {title && <h3>{title}</h3>}
      <ol>
        {shown.map((r, i) => { const I = ICON[r.kind] || Info; return (
          <li key={r.date + r.kind + i} className={"k-" + r.kind}><span className="dot"><I size={15} aria-hidden="true" /></span><span className="d">{fmtShort(r.date)}</span><span className="t"><b>{r.title}</b><span>{r.detail}</span></span></li>); })}
      </ol>
      {rows.length > max && <button type="button" className="cx-link" aria-expanded={all} onClick={() => setAll(!all)}>{all ? "Show recent only" : "Show all " + rows.length + " events"}</button>}
    </section>
  );
}

/* The secondary "SIP details" view. The Companion conversation is the primary screen. */
export default function Overview({ s, v, opts, tl, onOpen, onAsk }) {
  return (
    <div className="cx-ov">
      <Status s={s} v={v} />
      <section className="cx-story" aria-label="What happened and what it means">
        <div><h3>What happened</h3><p>{v.happened}</p></div>
        <div><h3>What it means</h3><p>{v.means}</p></div>
        <div><h3>What you can do</h3><p>{v.next}</p></div>
        <button type="button" className="cx-link" onClick={() => onOpen("EXPLAIN")}>How we know this<ChevronRight size={16} aria-hidden="true" /></button>
      </section>
      <OptionList opts={opts} onOpen={onOpen} />
      <button type="button" className="cx-askcard" onClick={onAsk}><MessageCircle size={20} aria-hidden="true" /><span><b>Questions about this SIP?</b><span>Ask SIP Companion in your own words</span></span><ChevronRight size={18} aria-hidden="true" /></button>
      <Timeline rows={tl} />
      <p className="cx-disc">Information, not investment advice. Illustrative demo data: nothing is paid or changed.</p>
    </div>
  );
}
