"use client";
import { Fragment, createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BY_ID, DRIVER, DRIVER_SHORT, DEF, COLOR, SRC, STAGE, SEG, EMO, SIG_FIELDS, WHY_WEIGHT, ALL_DRIVERS, RANKED, TIE_RULE, fmtDate, validation } from "@/lib/discovery/core";

/* ---------- small pieces ---------- */
export const Dot = ({ d }) => <i style={{ background: COLOR[d] }} aria-hidden="true" />;
export const DriverPill = ({ d, short }) => <span className="x-pill"><Dot d={d} />{short ? DRIVER_SHORT[d] : DRIVER[d]}</span>;
export function Kpi({ value, label, def }) { return <div className="x-card x-kpi"><b>{value}</b><span>{label}</span>{def && <small>{def}</small>}</div>; }
export function Head({ eyebrow, title, children }) { return <header className="x-head"><div className="x-eyebrow">{eyebrow}</div><h1 className="x-h1">{title}</h1>{children && <p className="x-lede">{children}</p>}</header>; }
export const SrcTag = ({ k }) => <span className={"x-src " + k}>{{ explicit: "Stated in text", ai: "AI interpretation", human: "Human correction", unknown: "Not extracted", inference: "Inference" }[k]}</span>;

/** Horizontal bars. Values are always real counts; the label carries the denominator. */
export function Bars({ rows, max, onPick, picked, fmt = (r) => r.value }) {
  const m = max || Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="x-bars" role={onPick ? "group" : undefined}>
      {rows.map((r) => {
        const inner = <><span style={{ minWidth: 0 }}>{r.label}</span><span className="t" aria-hidden="true"><i style={{ width: (r.value / m) * 100 + "%", background: r.color || "var(--acc)" }} /></span><span className="v">{fmt(r)}</span></>;
        return onPick
          ? <button key={r.key} className="x-bar" aria-pressed={picked === r.key} onClick={() => onPick(r.key)} aria-label={`${r.label}: ${fmt(r)}. Select to filter.`}>{inner}</button>
          : <div key={r.key} className="x-bar">{inner}</div>;
      })}
    </div>
  );
}

/* ---------- the structured view of one record ---------- */
// Each field says where it came from. Nothing is filled in by guessing; gaps are shown as gaps.
export function structured(r) {
  const s = r.sig, g = r.golden[r.golden.length - 1], humanDriver = g && !g.agree ? g.human : null;
  const fromSig = (f) => (s[f] ? { v: s[f].v, src: "explicit", ev: `"${s[f].phrase}"` } : null);
  return [
    ["What happened", fromSig("payment") || fromSig("money") || { v: "Not extracted", src: "unknown" }],
    ["What they expected", r.driver === "EXPECT" ? { v: "Returns higher or faster than shown", src: "ai", ev: "From the driver label" } : { v: "Not extracted", src: "unknown" }],
    ["What they experienced", { v: `${DRIVER[r.driver]}${r.emotion ? ` · feeling ${EMO[r.emotion]?.toLowerCase() || r.emotion.toLowerCase()}` : ""}`, src: "ai" }],
    ["What they did next", fromSig("outcome") || { v: "Not stated", src: "unknown" }],
    ["What they misunderstood", r.driver === "CONFUSE" ? { v: "Something on an app screen or status", src: "ai" } : { v: "Not extracted", src: "unknown" }],
    ["Workaround or help used", fromSig("help") || { v: "Not stated", src: "unknown" }],
    ["Underlying friction", humanDriver ? { v: `${DRIVER[humanDriver]} (human) · AI said ${DRIVER[r.driver]}`, src: "human" } : r.override ? { v: `${DRIVER[r.driver]} (was ${DRIVER[r.override.from]} in v1.1)`, src: "human", ev: r.override.rule } : { v: DRIVER[r.driver], src: "ai" }],
    ["Possible continuation consequence", WHY_WEIGHT[r.driver] ? { v: WHY_WEIGHT[r.driver].exit, src: "inference", ev: "From the codebook's exit weight for this driver, not from this person" } : { v: "Not a lapse driver", src: "unknown" }]
  ];
}

/* ---------- evidence card ---------- */
export function EvidenceCard({ r, onOpen }) {
  const v = validation(r);
  return (
    <article className="x-card x-ev">
      <div className="meta">
        <button className="x-id" onClick={() => onOpen(r.id)} aria-label={`Open evidence ${r.id}`}>{r.id}</button>
        <span>{SRC[r.src]}</span>·<span>{fmtDate(r)}</span>{r.stars && <>·<span>{r.stars}★</span></>}
      </div>
      <q>{r.text}</q>
      <div className="x-row" style={{ gap: 6 }}>
        <DriverPill d={r.driver} />
        <span className="x-pill">{STAGE[r.stage]}</span>
        <span className={"x-pill " + (r.firstHand ? "ok" : "warn")}>{r.firstHand ? "First-hand" : "Second-hand or unclear"}</span>
        <span className={"x-pill " + (v.key === "golden" ? (v.agree ? "ok" : "bad") : v.key === "override" ? "warn" : "")}>{v.label}</span>
        {Object.entries(r.sig).slice(0, 2).map(([f, s]) => <span key={f} className="x-pill acc" title={`Stated: "${s.phrase}"`}>{s.v}</span>)}
      </div>
      <div className="x-row" style={{ justifyContent: "space-between" }}>
        <button className="x-btn" onClick={() => onOpen(r.id)}>Details and review</button>
        <a className="x-small" href={r.url} target="_blank" rel="noopener noreferrer">{r.urlKind === "post" ? "Open original post ↗" : r.urlKind === "video" ? "Open the video ↗ (comment link not kept)" : "Open app listing ↗ (review link not kept)"}</a>
      </div>
    </article>
  );
}

/* ---------- drawer + review ---------- */
const EvidenceCtx = createContext({ open: () => {} });
export const useEvidence = () => useContext(EvidenceCtx);

export function EvidenceProvider({ children }) {
  const [id, setId] = useState(null);
  const open = useCallback((x) => setId(x), []);
  return <EvidenceCtx.Provider value={{ open }}>{children}{id && BY_ID[id] && <Drawer r={BY_ID[id]} onClose={() => setId(null)} onOpen={open} />}</EvidenceCtx.Provider>;
}

function Drawer({ r, onClose }) {
  const ref = useRef(null); const v = validation(r);
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose(); document.addEventListener("keydown", k);
    const prev = document.activeElement; ref.current?.focus(); document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = ""; prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="x-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="x-drawer" role="dialog" aria-modal="true" aria-labelledby="drw-t" tabIndex={-1} ref={ref}>
        <header><div><div className="x-eyebrow">Evidence record</div><h2 className="x-h2" id="drw-t">{r.id} · {SRC[r.src]}</h2></div><button className="x-btn" onClick={onClose} aria-label="Close">Close</button></header>
        <blockquote style={{ margin: 0 }} className="x-card flat"><q style={{ quotes: "none", fontFamily: "var(--display)", fontSize: "1.1rem" }}>{r.text}</q><p className="x-small" style={{ marginTop: 8 }}>Excerpt as stored by the coder; "..." marks a cut. Full context is at the source.</p></blockquote>
        <dl className="x-dl">
          <dt>Platform</dt><dd>{SRC[r.src]}{r.stars ? ` · ${r.stars}★ rating` : ""}</dd>
          <dt>Original URL</dt><dd><a href={r.url} target="_blank" rel="noopener noreferrer">{r.url}</a><br /><span className="x-small">{r.urlKind === "post" ? "Links to the post itself." : r.urlKind === "video" ? "Links to the video; the comment-level link was not kept." : "Links to the app listing; the review-level link was not kept."}</span></dd>
          <dt>Date</dt><dd>{fmtDate(r)}{r.dateApprox ? " (YouTube shows relative dates, so this is approximate)" : ""}</dd>
          <dt>Collected</dt><dd>October 2026 snapshot, labels at codebook v1.2. Exact collection timestamps per record were not stored.</dd>
          <dt>Topic</dt><dd>Relevant: passed the SIP-continuation filter{r.lapse ? "; counts as a lapse story (in the 352)" : `; not a lapse driver (${DRIVER[r.driver]})`}</dd>
          <dt>First-hand</dt><dd>{r.firstHand ? "Yes: the writer describes their own experience (STRONG)" : "No or unclear: second-hand, general or advice (WEAK)"} <SrcTag k="ai" /></dd>
          <dt>Stage</dt><dd>{STAGE[r.stage]} <SrcTag k={r.stage === "UNKNOWN" ? "unknown" : "ai"} /></dd>
          <dt>Segment</dt><dd>{r.seg ? <>{SEG[r.seg]} <SrcTag k="ai" /> <span className="x-small">coded only when the text says so</span></> : <>Not stated <SrcTag k="unknown" /></>}</dd>
          <dt>Confidence</dt><dd>No per-record confidence was computed, so none is shown.</dd>
        </dl>
        <section className="x-sec"><h3 className="x-h3">Label history</h3>
          <div className="x-tablewrap"><table className="x-table"><thead><tr><th>Step</th><th>Label</th><th>By</th></tr></thead><tbody>
            {r.golden.filter((g) => g.aiPrev).map((g) => <tr key={"p" + g.round}><td>Codebook v1.0</td><td>{DRIVER[g.aiPrev]}</td><td>AI engine</td></tr>)}
            <tr><td>Codebook v1.1</td><td>{DRIVER[r.d11]}</td><td>AI engine{r.override ? " (reconstructed from the override log)" : ""}</td></tr>
            {r.golden.map((g) => <tr key={g.round}><td>Golden round {g.round} ({g.codebook})</td><td>Human: {DRIVER[g.human]} · AI: {DRIVER[g.ai]}{g.live ? ` · live model: ${DRIVER[g.live]}` : ""}</td><td>{g.agree ? <span className="x-pill ok">Agreed</span> : <span className="x-pill bad">{g.error}</span>}</td></tr>)}
            <tr><td><b>Codebook v1.2 (current)</b></td><td><b>{DRIVER[r.driver]}</b></td><td>{r.override ? `Rule change: ${r.override.rule}` : "AI engine, unchanged"}</td></tr>
          </tbody></table></div>
          <p className="x-small">History is append-only. Earlier labels are kept, and reviews below never overwrite them.</p>
        </section>
        <section className="x-sec"><h3 className="x-h3">Structured reading</h3>
          <dl className="x-dl">{structured(r).map(([k, f]) => <Fragment key={k}><dt>{k}</dt><dd>{f.v} <SrcTag k={f.src} />{f.ev && <div className="x-small">{f.ev}</div>}</dd></Fragment>)}</dl>
        </section>
        <section className="x-sec"><h3 className="x-h3">Why this label: codebook v1.2</h3>
          <p style={{ fontSize: ".92rem" }}><b>{DRIVER[r.driver]}.</b> {DEF[r.driver]}</p><p className="x-small">{TIE_RULE}</p>
          <p className="x-small">Validation: {v.label}{v.detail ? ` · ${v.detail}` : ""}. The original model's rationale per record was not stored; the definition above is the rule applied.</p>
          {RANKED.includes(r.driver) && <Link className="x-btn" href={`/opportunities#${r.driver}`}>See the {DRIVER_SHORT[r.driver].toLowerCase()} opportunity this record supports →</Link>}
        </section>
        <Review r={r} />
      </aside>
    </div>
  );
}

function Review({ r }) {
  const [rows, setRows] = useState(null); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [action, setAction] = useState("approve"); const [label, setLabel] = useState(""); const [why, setWhy] = useState(""); const [ok, setOk] = useState("");
  useEffect(() => { let live = true; fetch("/api/reviews?id=" + r.id).then((x) => x.json()).then((j) => live && setRows(j.rows || [])).catch(() => live && setRows([])); return () => { live = false; }; }, [r.id]);
  async function submit(e) {
    e.preventDefault(); setErr(""); setOk(""); setBusy(true);
    try {
      const res = await fetch("/api/reviews", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ evidence_id: r.id, action, human_label: label, rationale: why }) });
      const j = await res.json(); if (!res.ok) throw new Error(j.error || "Could not save");
      setRows((x) => [j.saved, ...(x || [])]); setOk("Saved to the review log. The AI label was kept as it was."); setWhy(""); setLabel("");
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }
  return (
    <section className="x-sec" aria-labelledby="rv-t"><h3 className="x-h3" id="rv-t">Human review</h3>
      <p className="x-small">Approve the AI label, correct it, or flag uncertainty. Each review is a new row stored with the AI label it was made against, the codebook version and a timestamp. Nothing in the dataset is overwritten.</p>
      <form onSubmit={submit} className="x-card flat x-sec" style={{ gap: 10 }}>
        <div className="x-seg" role="group" aria-label="Review action">{[["approve", "Approve"], ["correct", "Correct"], ["flag", "Flag uncertain"]].map(([k, l]) => <button type="button" key={k} aria-pressed={action === k} onClick={() => setAction(k)}>{l}</button>)}</div>
        {action === "correct" && <label className="x-label">Correct label<select className="x-select" value={label} onChange={(e) => setLabel(e.target.value)} required><option value="">Choose…</option>{ALL_DRIVERS.filter((d) => d !== r.driver).map((d) => <option key={d} value={d}>{DRIVER[d]}</option>)}</select></label>}
        <label className="x-label">Rationale {action === "approve" ? "(optional)" : "(required)"}<textarea className="x-ta" maxLength={280} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="One or two sentences, citing the codebook rule" /></label>
        <div className="x-row"><button className="x-btn pri" disabled={busy}>{busy ? "Saving…" : "Save review"}</button><span className="x-small">AI label: {DRIVER[r.driver]} · codebook v1.2</span></div>
        {ok && <p className="x-note ok" role="status">{ok}</p>}{err && <p className="x-note bad" role="alert">{err}</p>}
      </form>
      {rows === null ? <div className="x-skel" style={{ height: 40 }} /> : rows.length === 0 ? <p className="x-small">No community reviews of this record yet.</p> :
        <div className="x-tablewrap"><table className="x-table"><thead><tr><th>When</th><th>Action</th><th>AI → human</th><th>Rationale</th></tr></thead><tbody>
          {rows.map((x, i) => <tr key={x.id || i}><td className="x-small">{new Date(x.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td><td>{x.action}</td><td>{DRIVER_SHORT[x.ai_label]}{x.human_label && x.human_label !== x.ai_label ? " → " + DRIVER_SHORT[x.human_label] : ""}</td><td>{x.rationale || "—"}</td></tr>)}
        </tbody></table></div>}
    </section>
  );
}

export function IdChips({ ids }) { const { open } = useEvidence(); return <span className="x-chips">{ids.map((id) => <button key={id} className="x-id" onClick={() => open(id)}>{id}</button>)}</span>; }
