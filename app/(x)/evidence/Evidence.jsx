"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RECORDS, DRIVER, SRC, SRC_ORDER, STAGE, SEG, SIG_FIELDS, ALL_DRIVERS, applyFilters, expandQuery, yearOf, validation, countBy } from "@/lib/discovery/core";
import { Head, EvidenceCard, useEvidence } from "@/components/x/ui";

const KEYS = ["q", "src", "driver", "stage", "year", "fh", "val", "seg", "attr", "sort"];
const YEARS = Object.keys(countBy(RECORDS, (r) => (yearOf(r) <= 2022 ? "old" : String(yearOf(r))))).sort().reverse();
const ATTR_VALUES = Object.fromEntries(Object.keys(SIG_FIELDS).map((f) => [f, [...new Set(RECORDS.filter((r) => r.sig[f]).map((r) => r.sig[f].v))]]));
const PER = 20;

export default function Evidence() {
  const sp = useSearchParams(); const router = useRouter(); const { open } = useEvidence();
  const [f, setF] = useState(() => Object.fromEntries(KEYS.map((k) => [k, sp.get(k) || (k === "sort" ? "relevance" : "")])));
  const [q, setQ] = useState(f.q); const [page, setPage] = useState(1);
  useEffect(() => { const t = setTimeout(() => setF((x) => (x.q === q ? x : { ...x, q })), 220); return () => clearTimeout(t); }, [q]);
  useEffect(() => { const u = new URLSearchParams(); KEYS.forEach((k) => f[k] && !(k === "sort" && f.sort === "relevance") && u.set(k, f[k])); router.replace("/evidence" + (u.toString() ? "?" + u : ""), { scroll: false }); setPage(1); }, [f, router]);
  useEffect(() => { const id = sp.get("id"); if (id) open(id); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => {
    let r = applyFilters({ ...f, sig: "" });
    if (f.attr) { const [field, val] = f.attr.split(":"); r = r.filter((x) => (val === "__none" ? !x.sig[field] : x.sig[field] && x.sig[field].v === val)); }
    return r;
  }, [f]);
  const exp = f.q ? expandQuery(f.q) : null; const extra = exp ? exp.terms.filter((t) => !exp.words.includes(t)) : [];
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const active = KEYS.filter((k) => k !== "sort" && f[k]).length;
  const pages = Math.max(1, Math.ceil(rows.length / PER)); const shown = rows.slice((page - 1) * PER, page * PER);
  const sel = (k, label, opts, all = "All") => <label className="x-label">{label}<select className="x-select" value={f[k]} onChange={set(k)}><option value="">{all}</option>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>;

  return (
    <div className="x-page">
      <Head eyebrow="Evidence Explorer" title="Every coded record, searchable">All 450 records behind the findings. Search in plain words; SIP synonyms and common Hinglish are matched too. Filters combine, and the address bar keeps them, so a filtered view can be shared.</Head>
      <section className="x-card x-sec" aria-label="Search and filters">
        <label className="x-label" style={{ fontSize: ".9rem" }}>Search the evidence<input className="x-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. autopay failed, salary, band kar diya, R40" /></label>
        {extra.length > 0 && <p className="x-small">Also matching: {extra.slice(0, 10).join(", ")}{extra.length > 10 ? "…" : ""}</p>}
        <div className="x-filters">
          {sel("src", "Platform", SRC_ORDER.map((k) => [k, SRC[k]]))}
          {sel("driver", "AI label (driver)", ALL_DRIVERS.map((d) => [d, DRIVER[d]]))}
          {sel("stage", "Investor stage", Object.entries(STAGE))}
          {sel("year", "Post date", YEARS.map((y) => [y, y === "old" ? "2022 or earlier" : y]))}
          {sel("fh", "First-hand", [["yes", "First-hand"], ["no", "Second-hand or unclear"]])}
          {sel("val", "Human verification", [["golden", "Human-checked (golden set)"], ["disagree", "Human disagreed with AI"], ["override", "Changed by codebook v1.2 rule"], ["ai", "AI only, not reviewed"]])}
          {sel("seg", "Segment (stated)", Object.entries(SEG))}
          <label className="x-label">Attribute stated in text<select className="x-select" value={f.attr} onChange={set("attr")}><option value="">Any</option>
            {Object.entries(SIG_FIELDS).map(([fd, l]) => <optgroup key={fd} label={l}>{ATTR_VALUES[fd].map((v) => <option key={v} value={fd + ":" + v}>{v}</option>)}<option value={fd + ":__none"}>{l}: Not stated</option></optgroup>)}
          </select></label>
        </div>
        <div className="x-row" style={{ justifyContent: "space-between" }}>
          <label className="x-label" style={{ flex: "1 1 260px", maxWidth: 420 }}>Relevance<select className="x-select" disabled value="rel"><option value="rel">Relevant only: rejected records were not retained</option></select></label>
          <div className="x-row">
            <label className="x-label" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>Sort<select className="x-select" style={{ width: "auto" }} value={f.sort} onChange={set("sort")}><option value="relevance">{f.q ? "Best match" : "Newest (no search)"}</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="id">Evidence ID</option></select></label>
            <button className="x-btn" disabled={!active} onClick={() => { setQ(""); setF(Object.fromEntries(KEYS.map((k) => [k, k === "sort" ? "relevance" : ""]))); }}>Clear all filters{active ? ` (${active})` : ""}</button>
          </div>
        </div>
      </section>
      <div className="x-row" style={{ justifyContent: "space-between" }} aria-live="polite">
        <p><b className="x-num">{rows.length}</b> of {RECORDS.length} records{rows.length ? `, showing ${(page - 1) * PER + 1}–${Math.min(page * PER, rows.length)}` : ""}</p>
        {rows.length > 0 && <p className="x-small">Human-checked in this view: {rows.filter((r) => validation(r).key === "golden").length} · First-hand: {rows.filter((r) => r.firstHand).length}</p>}
      </div>
      {rows.length === 0 ? (
        <div className="x-card x-sec"><b>No records match.</b><p className="x-small">Nothing in the 450 coded records matches every filter. Try removing a filter or using different words. An empty result is a real answer here: it means the coded set has no such story, not that the experience never happens.</p></div>
      ) : (
        <div className="x-grid x-g2">{shown.map((r) => <EvidenceCard key={r.id} r={r} onOpen={open} />)}</div>
      )}
      {pages > 1 && <nav className="x-pager" aria-label="Pages"><button className="x-btn" disabled={page === 1} onClick={() => { setPage(page - 1); window.scrollTo({ top: 0 }); }}>← Previous</button><span className="x-num">Page {page} of {pages}</span><button className="x-btn" disabled={page === pages} onClick={() => { setPage(page + 1); window.scrollTo({ top: 0 }); }}>Next →</button></nav>}
    </div>
  );
}
