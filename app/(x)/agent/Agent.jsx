"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SUGGESTED } from "@/lib/discovery/agent";
import { DRIVER, DRIVER_SHORT } from "@/lib/discovery/core";
import { Head, useEvidence, SrcTag } from "@/components/x/ui";

function Part({ n, title, children }) { return <div className="x-part"><b aria-hidden="true">{n}</b><div><h3>{title}</h3>{children}</div></div>; }

function Answer({ a }) {
  const { open } = useEvidence();
  const Ex = ({ x }) => x.id
    ? <li><button className="x-id" onClick={() => open(x.id)}>{x.id}</button> <span className="x-small">{x.src} · {DRIVER_SHORT[x.driver]}</span>{x.why && <span className="x-small"> · {x.why}</span>}<br /><q style={{ quotes: "none", fontFamily: "var(--display)" }}>{x.text}</q></li>
    : <li>{x.text}</li>;
  return (
    <article className="x-card x-answer" aria-live="polite">
      <div className="x-row" style={{ justifyContent: "space-between" }}><p className="x-small">Q: {a.question}</p>
        <span className={"x-pill " + (a.insufficient ? "warn" : a.refused ? "bad" : "ok")}>{a.insufficient ? "Insufficient evidence" : a.refused ? "Out of scope" : a.mode === "grounded+model" ? "Grounded · wording by model" : "Grounded in the dataset"}</span></div>
      <Part n="1" title="Direct finding"><p style={{ fontSize: "1.05rem" }}>{a.finding}</p>{a.findingGrounded && <details className="x-details x-small"><summary>Original grounded wording</summary>{a.findingGrounded}</details>}</Part>
      {a.quant.length > 0 && <Part n="2" title="Quantitative evidence"><div className="x-tablewrap"><table className="x-table"><thead><tr><th>Measure</th><th className="n">Count</th><th className="n">Of</th><th className="n">%</th></tr></thead><tbody>
        {a.quant.map((q, i) => <tr key={i}><td>{q.label}{q.note && <div className="x-small">{q.note}</div>}</td><td className="n">{q.n}</td><td className="n">{q.of}</td><td className="n">{q.pct || "—"}</td></tr>)}
      </tbody></table></div>
        {a.weights && <p className="x-small" style={{ marginTop: 6 }}>{a.weights.map((w) => `${DRIVER[w.driver]}: exit ${w.exit} (${w.exitWhy}) · addressability ${w.addr} (${w.addrWhy})`).join(" — ")}</p>}</Part>}
      {a.examples.length > 0 && <Part n="3" title="Supporting examples"><ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 10 }}>{a.examples.map((x, i) => <Ex key={i} x={x} />)}</ul></Part>}
      {a.contradictions.length > 0 && <Part n="4" title="Contradictory evidence"><ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 10 }}>{a.contradictions.map((x, i) => <Ex key={i} x={x} />)}</ul></Part>}
      {a.interpretation && <Part n="5" title="Interpretation"><p><SrcTag k="inference" /> {a.interpretation.replace(/^Inference:\s*/, "")}</p></Part>}
      {a.limitations.length > 0 && <Part n="6" title="Limitations"><ul style={{ margin: 0, paddingLeft: 18 }}>{a.limitations.map((l, i) => <li key={i} className="x-small" style={{ color: "var(--ink-2)" }}>{l}</li>)}</ul></Part>}
      {a.followUp && <Part n="7" title="Research follow-up"><p>{a.followUp}</p></Part>}
    </article>
  );
}

export default function Agent() {
  const sp = useSearchParams(); const [q, setQ] = useState(""); const [busy, setBusy] = useState(false);
  const [list, setList] = useState([]); const [err, setErr] = useState(null); const [status, setStatus] = useState(null); const ran = useRef(false);
  useEffect(() => { fetch("/api/agent").then((r) => r.json()).then(setStatus).catch(() => setStatus({ grounded: true, live: false, err: true })); }, []);
  async function ask(question) {
    const text = (question ?? q).trim(); if (!text || busy) return;
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/agent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: text }) });
      const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `The agent returned ${r.status}.`);
      setList((x) => [j, ...x].slice(0, 6)); setQ("");
    } catch (e) { setErr({ msg: e.message === "Failed to fetch" ? "The agent couldn't be reached. Check your connection and try again." : e.message, text }); }
    finally { setBusy(false); }
  }
  useEffect(() => { const pre = sp.get("q"); if (pre && !ran.current) { ran.current = true; ask(pre); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="x-page">
      <Head eyebrow="AI Research Agent" title="Ask the evidence">Ask a research question about the 450 records. Every answer gives counts with their denominator, real record IDs, evidence that cuts the other way, and its limits. If the data can't answer, it says so.</Head>
      <div className="x-note info"><b>How it works.</b> The server picks an analysis for your question and computes every number from the dataset at the time you ask. Each example is a real record you can open. {status ? (status.live ? `When live AI is available, ${status.model} may rephrase the finding; the rewrite is rejected if it adds any number or ID that isn't in the computed answer.` : "Live AI is off on this deployment, so answers are fully deterministic.") : ""} Public posts are treated as data and never as instructions. Questions are rate-limited to 20 a minute.</div>
      <form className="x-card x-sec" onSubmit={(e) => { e.preventDefault(); ask(); }}>
        <label className="x-label" style={{ fontSize: ".9rem" }}>Your question<textarea className="x-ta" value={q} maxLength={400} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }} placeholder="e.g. What do investors do when they are unsure whether an instalment succeeded?" /></label>
        <div className="x-row" style={{ justifyContent: "space-between" }}><span className="x-small">{q.length}/400 · Don't include personal details</span><button className="x-btn pri" disabled={busy || !q.trim()}>{busy ? "Analysing…" : "Ask"}</button></div>
        <div className="x-chips" aria-label="Suggested questions">{SUGGESTED.map((s) => <button type="button" key={s} className="x-chip" onClick={() => ask(s)} disabled={busy}>{s}</button>)}</div>
      </form>
      {busy && <div className="x-skel" aria-label="Loading answer" />}
      {err && <div className="x-note bad" role="alert">{err.msg} <button className="x-btn" onClick={() => ask(err.text)}>Try again</button></div>}
      {list.map((a, i) => <Answer key={list.length - i} a={a} />)}
    </div>
  );
}
