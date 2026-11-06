"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

// Each site has its own name and menu. Nothing links across to the other site from here.
const SITES = {
  prototype: { name: "SIP Companion", home: "/companion", links: [["/companion", "Prototype"], ["/built", "How it's built"]], built: ["/built", "/lab", "/eval", "/metrics", "/design"] },
  engine: {
    name: "SIP Discovery Engine", home: "/", built: [],
    links: [["/", "Overview"], ["/evidence", "Evidence Explorer"], ["/themes", "Insight Analysis"], ["/opportunities", "Opportunity Ranking"], ["/segments", "Segment Explorer"], ["/agent", "Research Assistant"], ["/quality", "AI Quality"], ["/methodology", "Methodology"]],
    more: [["/check", "Investor check"], ["/research", "Earlier research view"], ["/design", "Design"]]
  }
};

// The case study's original Groww-style mark (violet tile, rising line, pink dot). Not Groww's real logo.
function Mark() {
  return <svg className="brand-mark" width="24" height="24" viewBox="0 0 56 56" aria-hidden="true" focusable="false"><rect width="56" height="56" rx="16" fill="#007A59" /><polyline points="12,38 22,28 29,33 42,18" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function Nav({ site = "prototype" }) {
  const p = usePathname(); const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [p]);
  const S = SITES[site] || SITES.prototype;
  const isCur = (h) => (h === "/built" ? S.built.includes(p) : h === "/" ? p === "/" || p === "/overview" : h === "/check" ? p === "/check" || p === "/engine" : p === h);
  const links = [...S.links, ...(S.more || [])];
  return (
    <header className={"topbar" + (site === "engine" ? " topbar-x" : "")}><div className="topbar-in">
      <Link className="brand" href={S.home} aria-label={S.name + " home"}><Mark />{S.name}</Link>
      {site === "engine" && <button type="button" className="menu-btn" aria-expanded={open} aria-controls="mainnav" onClick={() => setOpen(!open)}>{open ? "Close" : "Menu"}</button>}
      <nav id="mainnav" className={"nav" + (open ? " open" : "")} aria-label="Main">
        {links.map(([h, l]) => <Link key={h} href={h} aria-current={isCur(h) ? "page" : undefined} className={S.more?.some(([m]) => m === h) ? "nav-more" : undefined}>{l}</Link>)}
      </nav>
      <ThemeToggle />
    </div></header>
  );
}
