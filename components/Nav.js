"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [["/", "Overview"], ["/engine", "Discovery engine"], ["/companion", "Companion MVP"], ["/eval", "Quality gate"], ["/metrics", "Live metrics"]];

export default function Nav() {
  const p = usePathname();
  return (
    <header className="topbar"><div className="topbar-in">
      <Link className="brand" href="/"><i aria-hidden="true" />SIP Continuation</Link>
      <nav className="nav" aria-label="Main">
        {LINKS.map(([h, l]) => h === "/engine"
          ? <a key={h} href="/engine/index.html">{l}</a>
          : <Link key={h} href={h} aria-current={p === h ? "page" : undefined}>{l}</Link>)}
      </nav>
    </div></header>
  );
}
