import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function Home() {
  return (
    <div className="home">
      <section className="home-hero" aria-labelledby="h1">
        <h1 id="h1">Your first SIP shouldn't end by accident.</h1>
        <p>Many first SIPs end without anyone deciding to stop them. A payment fails, then another, and the third cancels the SIP. These two tools help you see it coming and fix it.</p>
      </section>
      <div className="doors">
        <Link className="door" href="/engine">
          <span className="door-k">Discovery engine</span>
          <b>Find out why SIPs like yours stop</b>
          <span>450 first-hand stories, drawn from 19,005 public posts.</span>
          <ArrowUpRight size={22} aria-hidden="true" />
        </Link>
        <Link className="door primary" href="/companion">
          <span className="door-k">Companion</span>
          <b>See what happened to a missed instalment, and fix it</b>
          <span>A working app prototype with sample data.</span>
          <ArrowUpRight size={22} aria-hidden="true" />
        </Link>
      </div>
      <p className="home-foot"><Link href="/built">How it's built</Link>: the research, the AI quality gate and the live metrics.</p>
    </div>
  );
}
