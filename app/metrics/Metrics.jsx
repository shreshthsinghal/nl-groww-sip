"use client";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";

const LABEL = { PAY_NOW: "Paid now", CHANGE_DATE: "Moved the date", REDUCE_AMOUNT: "Lowered the amount", PAUSE_WITH_DATE: "Paused with a date", STOP_SIP: "Stopped", RESUME_SIP: "Restarted", RESTART_SIP: "Started again", RETRY_MANDATE: "Fixed autopay", CONTACT_SUPPORT: "Contacted support", LEARN_SEBI: "Opened SEBI guide" };
const med = (a) => { const b = a.filter((x) => typeof x === "number").sort((x, y) => x - y); if (!b.length) return null; const m = Math.floor(b.length / 2); return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };

export default function Metrics() {
  const [m, setM] = useState(null), [err, setErr] = useState(false), [at, setAt] = useState(null);
  async function load() {
    try { const { data, error } = await sb().rpc("metrics_summary"); if (error) throw error; setM(data); setErr(false); setAt(new Date()); } catch { setErr(true); }
  }
  useEffect(() => { load(); const id = setInterval(load, 20000); return () => clearInterval(id); }, []);

  const rows = (m && m.session_rows) || [];
  const t1 = rows.filter((r) => r.results && r.results.T1), t2 = rows.filter((r) => r.results && r.results.T2);
  const t3 = {}; rows.forEach((r) => { const c = r.results && r.results.T3 ? (r.results.T3.chosen || []) : null; if (c) (c.length ? c : ["NONE"]).forEach((x) => { t3[x] = (t3[x] || 0) + 1; }); });
  const acts = (m && m.actions) || {}; const maxA = Math.max(1, ...Object.values(acts));
  const safeRate = m && m.replies ? Math.round((m.safe_replies / m.replies) * 100) : null;

  return (
    <div className="page">
      <header className="sh" style={{ gap: 14 }}>
        <p className="eyebrow">Parts 6 and 7 · measured, not estimated</p>
        <h1 className="big" style={{ fontSize: "clamp(2rem,4.6vw,3rem)" }}>What people actually do with the companion.</h1>
        <p className="lede">Anonymous events from the live prototype and results from moderated user tests. Aggregates only: no names, no accounts, no message text is shown here.</p>
        <p className="note" role="status">{err ? "Couldn't load the numbers. Retrying." : at ? "Updated " + at.toLocaleTimeString("en-IN") + ". Refreshes every 20 seconds." : "Loading…"}</p>
      </header>

      <section className="sh" style={{ gap: 14 }} aria-labelledby="hu">
        <h2 id="hu" className="sec">Usage</h2>
        <div className="stats">
          <div className="stat"><b>{m ? m.visitors : "–"}</b><span>Visitors</span><small>Unique, anonymous</small></div>
          <div className="stat"><b>{m ? m.asks : "–"}</b><span>Questions asked</span><small>To the companion</small></div>
          <div className={"stat " + (safeRate != null && safeRate > 20 ? "bad" : "")}><b>{safeRate != null ? safeRate + "%" : "–"}</b><span>Safe-reply rate</span><small>Share of replies that fell back. Guardrail: 20% or less</small></div>
          <div className="stat"><b>{m ? m.undos : "–"}</b><span>Undos</span><small>Actions people reversed</small></div>
        </div>
        <div className="panel"><p className="eyebrow">What people chose to do</p>
          {Object.keys(acts).length ? <div className="bars">{Object.entries(acts).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
            <div className="bar" key={k}><span>{LABEL[k] || k}</span><i style={{ width: (v / maxA) * 100 + "%" }} /><em>{v}</em></div>))}</div>
            : <p className="note">No actions yet. Try the companion, then come back.</p>}
          <p className="note">Leading signal for the north star: the share of missed instalments people fix (pay now, move the date, lower the amount) rather than stop. Personal data blocked before sending: {m ? m.pii_blocked : "–"}.</p>
        </div>
      </section>

      <section className="sh" style={{ gap: 14 }} aria-labelledby="ht">
        <h2 id="ht" className="sec">User tests</h2>
        <div className="stats">
          <div className="stat"><b>{rows.length}</b><span>Sessions</span><small>Moderated, about 8 minutes each</small></div>
          <div className="stat"><b>{t1.length ? t1.filter((r) => r.results.T1.correct).length + "/" + t1.length : "–"}</b><span>Knew the 3-miss rule</span><small>Task 1, after reading the card</small></div>
          <div className="stat"><b>{t2.length ? t2.filter((r) => r.results.T2.success).length + "/" + t2.length : "–"}</b><span>Fixed the SIP</span><small>Task 2</small></div>
          <div className="stat"><b>{t2.length && med(t2.map((r) => r.results.T2.ms)) != null ? Math.round(med(t2.map((r) => r.results.T2.ms)) / 1000) + " s" : "–"}</b><span>Median time to fix</span><small>Task 2</small></div>
        </div>
        <div className="tw"><table>
          <thead><tr><th>Code</th><th>Knew the rule</th><th>Fixed it</th><th>Time to fix</th><th>Tight month choice</th><th>Pushy (1–5)</th><th>Understood (1–5)</th><th>In control (1–5)</th><th>Would use (1–5)</th></tr></thead>
          <tbody>{rows.length ? rows.map((r, k) => { const R = r.results || {}, P = r.post || {}; return (
            <tr key={k}><td>{r.code}</td><td>{R.T1 ? (R.T1.correct ? "Yes" : "No") : "–"}</td><td>{R.T2 ? (R.T2.success ? "Yes" : "No") : "–"}</td><td className="num">{R.T2 ? Math.round(R.T2.ms / 1000) + " s" : "–"}</td><td>{R.T3 ? ((R.T3.chosen || []).map((x) => LABEL[x] || x).join(", ") || "No action") : "–"}</td><td className="num">{R.T4 && R.T4.pushy ? R.T4.pushy : "–"}</td><td className="num">{P.understood || "–"}</td><td className="num">{P.control || "–"}</td><td className="num">{P.use || "–"}</td></tr>); })
            : <tr><td colSpan={9} className="note">No sessions yet. Run one from the companion's “Run a user test” tab.</td></tr>}</tbody>
        </table></div>
        {Object.keys(t3).length > 0 && <p className="note">Tight month (task 3): {Object.entries(t3).map(([k, v]) => (k === "NONE" ? "no action" : LABEL[k] || k) + " " + v).join(" · ")}.</p>}
      </section>

      <section className="sh" style={{ gap: 12 }} aria-labelledby="hm">
        <h2 id="hm" className="sec">The metric tree behind this page</h2>
        <div className="stack">
          <div><b>North star (lagging)</b>12-month continuation of first SIPs: still registered and at least 10 of 12 instalments paid.</div>
          <div><b>Leading</b>Missed instalments fixed before the third miss. Time to fix. Payment date moved after income.</div>
          <div><b>Guardrails</b>Pause-to-resume rate. Stop stays one tap. Safe-reply rate at 20% or less.</div>
          <div><b>AI quality</b>Unsafe replies shown: 0. Golden set: 85% or more. Personal data blocked before sending.</div>
        </div>
      </section>
    </div>
  );
}
