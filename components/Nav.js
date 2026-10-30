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
    links: [["/", "Overview"], ["/evidence", "Evidence Explorer"], ["/themes", "Insight Analysis"], ["/opportunities", "Opportunity Ranking"], ["/segments", "Segment Explorer"], ["/agent", "AI Research Agent"], ["/quality", "AI Quality"], ["/methodology", "Methodology"]],
    more: [["/check", "Investor check"], ["/research", "Earlier research view"], ["/design", "Design"]]
  }
};

export default function Nav({ site = "prototype" }) {
  const p = usePathname(); const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [p]);
  const S = SITES[site] || SITES.prototype;
  const isCur = (h) => (h === "/built" ? S.built.includes(p) : h === "/" ? p === "/" || p === "/overview" : h === "/check" ? p === "/check" || p === "/engine" : p === h);
  const links = [...S.links, ...(S.more || [])];
  return (
    <header className={"topbar" + (site === "engine" ? " topbar-x" : "")}><div className="topbar-in">
      <Link className="brand" href={S.home} aria-label={S.name + " home"}><i aria-hidden="true" />{S.name}</Link>
      {site === "engine" && <button type="button" className="menu-btn" aria-expanded={open} aria-controls="mainnav" onClick={() => setOpen(!open)}>{open ? "Close" : "Menu"}</button>}
      <nav id="mainnav" className={"nav" + (open ? " open" : "")} aria-label="Main">
        {links.map(([h, l]) => <Link key={h} href={h} aria-current={isCur(h) ? "page" : undefined} className={S.more?.some(([m]) => m === h) ? "nav-more" : undefined}>{l}</Link>)}
      </nav>
      <ThemeToggle />
    </div></header>
  );
}
