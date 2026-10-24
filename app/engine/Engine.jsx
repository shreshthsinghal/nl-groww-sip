"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PATTERNS, COUNTS, TOTAL, STOP_FACTS, STOP_CAUSES, STARTERS, SOURCE } from "@/lib/patterns";
import { sb } from "@/lib/supabase";

const PII = /\b[A-Z]{5}\d{4}[A-Z]\b|\b\d{10,18}\b/i;
const ORDER = ["TRUST", "EXPECT", "PAY", "CONFUSE", "AMOUNT", "PAUSE"];
const PLACEHOLDER = "For example: my SIP failed twice and I don't know why";

function anonId() { try { let a = localStorage.getItem("sipc-anon"); if (!a) { a = crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now(); localStorage.setItem("sipc-anon", a); } return a; } catch { return "anon-" + Date.now(); } }

export default function Engine() {
  const [text, setText] = useState("");
  const [warn, setWarn] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null); // {pattern, stopping, stories, asked}
  const [err, setErr] = useState("");
  const out = useRef(null), anon = useRef(null);

  useEffect(() => { anon.current = anonId(); log("load", {}); }, []);
  useEffect(() => { if (res && out.current) { out.current.focus({ preventScroll: true }); out.current.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); } }, [res && res.key]);

  function log(type, data) { try { sb().from("events").insert({ anon_id: anon.current || "anon-unknown", moment: "ENGINE", type, data: { surface: "engine", ...data } }).then(() => {}, () => {}); } catch {} }

  async function run(payload, asked) {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/checkup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const j = await r.json();
      if (j.error === "pii") { setWarn("That looks like a PAN, phone or account number. Please remove it."); setBusy(false); return; }
      if (j.error) throw new Error(j.error);
      setRes({ ...j, asked, key: Date.now() });
      log("reply", { pattern: j.pattern, stopping: !!j.stopping, source: j.source });
    } catch { setErr("That didn't go through. Check your connection and try again."); }
    setBusy(false);
  }
  function submit(e) {
    e && e.preventDefault();
    const t = text.trim(); if (!t || busy) return;
    if (PII.test(t)) { setWarn("That looks like a PAN, phone or account number. Please remove it."); return; }
    log("ask", { len: t.length });
    run({ text: t }, t);
  }
  function choose(p, label, stopping) {
    log("tap_option", { option: p });
    if (p === "STOP") { setRes({ pattern: "STOP", stopping: true, stories: [], asked: label, key: Date.now() }); return; }
    if (p === "DONE") { setRes({ pattern: "DONE", stopping: true, stories: [], asked: label, key: Date.now() }); return; }
    run({ text: res && res.asked && !STARTERS.some((s) => s[1] === res.asked) ? res.asked : label, pattern: p, stopping: !!stopping }, label);
  }

  const P = res && PATTERNS[res.pattern];
  return (
    <div className="eg">
      <section className="eg-ask" aria-labelledby="eg-h">
        <h1 id="eg-h">What's going on with your SIP?</h1>
        <p className="eg-sub">Describe it in your own words. We'll match it with 450 first-hand stories from investors and show you what's worth knowing.</p>
        <form onSubmit={submit} className="eg-form">
          <label htmlFor="eg-t" className="sr">Describe your situation</label>
          <textarea id="eg-t" rows={3} maxLength={400} placeholder={PLACEHOLDER} value={text} aria-describedby="eg-w"
            onChange={(e) => { setText(e.target.value); setWarn(PII.test(e.target.value) ? "That looks like a PAN, phone or account number. Please remove it." : ""); }}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e); }} />
          <div className="eg-row">
            <p id="eg-w" className="eg-warn" role="status">{warn || err}</p>
            <button type="submit" className="eg-go" disabled={busy || !text.trim() || !!warn}>{busy ? "Looking…" : "Find my pattern"}</button>
          </div>
        </form>
        <div className="eg-starts" role="group" aria-label="Or start from one of these">
          {STARTERS.map(([p, l]) => <button key={p} type="button" onClick={() => { setText(""); choose(p, l, p === "STOP"); }}>{l}</button>)}
        </div>
        <p className="eg-priv">Nothing you type is stored. Don't include account numbers or your PAN.</p>
      </section>

      {res && (
        <section className="eg-out" ref={out} tabIndex={-1} aria-live="polite" aria-label="Your result">
          {(res.pattern === "STOP") && (
            <div className="eg-block">
              <p className="eg-k">Before anything else</p>
              <h2 className="eg-name">What's making you think of stopping?</h2>
              <p className="eg-lead">Stopping is a valid choice. Knowing the reason shows you what else exists, if anything.</p>
              <div className="eg-starts">{STOP_CAUSES.map(([p, l]) => <button key={p} type="button" onClick={() => choose(p, l, true)}>{l}</button>)}</div>
            </div>
          )}

          {res.pattern === "DONE" && (
            <div className="eg-block">
              <h2 className="eg-name">Then stopping is a straightforward choice</h2>
              <ul className="eg-facts">{STOP_FACTS.slice(0, 1).map(([f, s]) => <li key={f}>{f}{s && <a href={s[1]} target="_blank" rel="noopener">{s[0]}</a>}</li>)}</ul>
              <p className="eg-lead">You stop a SIP from the SIP's page in your app. Nothing else needs to happen.</p>
            </div>
          )}

          {res.pattern === "NONE" && (
            <div className="eg-block">
              <h2 className="eg-name">We couldn't match that to a SIP situation</h2>
              <p className="eg-lead">Try describing what happened with the payment, the amount or the returns, or pick the closest one above.</p>
            </div>
          )}

          {P && (<>
            <div className="eg-block">
              <p className="eg-k">This sounds like</p>
              <h2 className="eg-name">{P.name}</h2>
              <p className="eg-lead">{P.lead}</p>
              <figure className="eg-chart" aria-label={`${COUNTS[res.pattern]} of ${TOTAL} first-hand stories describe this`}>
                <figcaption><b>{COUNTS[res.pattern]} of {TOTAL}</b> first-hand stories describe this.</figcaption>
                <ul>{ORDER.map((k) => (
                  <li key={k} className={k === res.pattern ? "on" : ""}><span>{PATTERNS[k].short}</span><i style={{ "--w": (COUNTS[k] / 64) * 100 + "%" }} /><em>{COUNTS[k]}</em></li>
                ))}</ul>
              </figure>
            </div>

            {res.stories && res.stories.length > 0 && (
              <div className="eg-block">
                <h3 className="eg-h3">People in the same spot</h3>
                <div className="eg-quotes">{res.stories.map((s) => (
                  <blockquote key={s.id}><p>{s.excerpt}</p><cite>{SOURCE[s.src]}, {s.date.slice(0, 4)}</cite></blockquote>
                ))}</div>
              </div>
            )}

            <div className="eg-block">
              <h3 className="eg-h3">Worth knowing</h3>
              <ul className="eg-facts">{(res.stopping ? STOP_FACTS.concat(P.facts) : P.facts).map(([f, s]) => (
                <li key={f}>{f}{s && <a href={s[1]} target="_blank" rel="noopener">{s[0]}</a>}</li>
              ))}</ul>
            </div>

            <div className="eg-block">
              <h3 className="eg-h3">What people in this spot can do</h3>
              <ul className="eg-opts">{P.options.map(([t, d]) => <li key={t}><b>{t}</b><span>{d}</span></li>)}</ul>
              {P.companion && <Link className="eg-cta" href="/companion">Try this on a sample SIP in the Companion</Link>}
              <p className="eg-fine">These describe what exists. They're not a recommendation. For advice on your situation, speak to a SEBI-registered investment adviser.</p>
            </div>
          </>)}

          {res.pattern !== "STOP" && (
            <div className="eg-block eg-other">
              <p>Not quite right?</p>
              <div className="eg-starts small">{ORDER.filter((k) => k !== res.pattern).map((k) => <button key={k} type="button" onClick={() => choose(k, PATTERNS[k].short, res.stopping)}>{PATTERNS[k].short}</button>)}</div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
