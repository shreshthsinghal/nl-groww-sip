"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

// Each site has its own name and menu. Nothing links across to the other site from here.
const SITES = {
  prototype: { name: "SIP Companion", home: "/companion", links: [["/companion", "Prototype"], ["/built", "How it's built"]], built: ["/built", "/lab", "/eval", "/metrics", "/design"] },
  engine: { name: "SIP Discovery Engine", home: "/", links: [["/", "Engine"], ["/research", "Research"], ["/design", "Design"]], built: [] }
};

export default function Nav({ site = "prototype" }) {
  const p = usePathname();
  const S = SITES[site] || SITES.prototype;
  const isCur = (h) => (h === "/built" ? S.built.includes(p) : h === "/" ? p === "/" || p === "/engine" : p === h);
  return (
    <header className="topbar"><div className="topbar-in">
      <Link className="brand" href={S.home} aria-label={S.name + " home"}><i aria-hidden="true" />{S.name}</Link>
      <nav className="nav" aria-label="Main">
        {S.links.map(([h, l]) => <Link key={h} href={h} aria-current={isCur(h) ? "page" : undefined}>{l}</Link>)}
      </nav>
      <ThemeToggle />
    </div></header>
  );
}
