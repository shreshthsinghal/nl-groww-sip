"use client";
import { useEffect, useState } from "react";

const STEPS = [
  { d: "Day 0", t: "First debit fails", s: "Silent, or a vague SMS" },
  { d: "~Day 30", t: "Second fails", s: "Same reason, still unexplained" },
  { d: "~Day 60", t: "Third fails", s: "SIP cancelled automatically" }
];

export default function StrikeDemo() {
  const [n, setN] = useState(3);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let i = 0; setN(0);
    const id = setInterval(() => { i = (i + 1) % 5; setN(Math.min(i, 3)); }, 1100);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="strike-demo" aria-label="Timeline: a first failed debit, a second about 30 days later, and a third about 60 days later, after which the SIP is cancelled automatically.">
      <p className="eyebrow">The 60-day window</p>
      <div className="timeline">
        {STEPS.map((x, k) => (
          <div key={k} className={k < n ? "hit" : ""}><b>{x.d}</b>{x.t}<br /><span className="note">{x.s}</span></div>
        ))}
      </div>
      <p className="note">Three failed debits in a row cancel a monthly SIP (industry rule since April 2024). In our evidence, payment failure is the top-ranked leak.</p>
    </div>
  );
}
