"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [["/engine", "Engine"], ["/companion", "Companion"], ["/built", "How it's built"]];
const BUILT = ["/built", "/lab", "/eval", "/metrics", "/research"];

export default function Nav() {
  const p = usePathname();
  return (
    <header className="topbar"><div className="topbar-in">
      <Link className="brand" href="/" aria-label="SIP Continuation home"><i aria-hidden="true" />SIP Continuation</Link>
      <nav className="nav" aria-label="Main">
        {LINKS.map(([h, l, raw]) => {
          const cur = h === "/built" ? BUILT.includes(p) : p === h;
          return <Link key={h} href={h} aria-current={cur ? "page" : undefined}>{l}</Link>;
        })}
      </nav>
    </div></header>
  );
}
