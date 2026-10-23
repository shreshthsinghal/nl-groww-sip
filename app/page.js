import Link from "next/link";
import { ArrowRight, Radar, Smartphone, ShieldCheck, Activity } from "lucide-react";
import StrikeDemo from "@/components/StrikeDemo";
import { sb } from "@/lib/supabase";

export const revalidate = 60;

async function latestEval() {
  try {
    const { data } = await sb().from("eval_runs").select("created_at,passed,full_pass,n,unsafe_shown,model").order("created_at", { ascending: false }).limit(1);
    return data && data[0];
  } catch { return null; }
}

export default async function Home() {
  const ev = await latestEval();
  return (
    <div className="page">
      <section className="hero" aria-labelledby="h1">
        <div className="sh" style={{ gap: 16 }}>
          <p className="eyebrow">Groww · 12-month SIP continuation for first-time investors</p>
          <h1 id="h1" className="big">A first SIP can end without anyone deciding to stop it.</h1>
          <p className="lede">We read 19,005 public posts with an AI discovery engine. Payment failure ranked first, and stayed first through three rounds of human checks. The fix we built is a companion that explains a missed instalment and offers real options. It only speaks when its reply passes nine safety checks.</p>
          <div className="chain" aria-label="How the thinking moved">
            <span>Business metric</span><i>→</i><span>Product outcomes</span><i>→</i><span>AI discovery</span><i>→</i><span>Primary research</span><i>→</i><span>Problem</span><i>→</i><span className="on">MVP</span>
          </div>
        </div>
        <StrikeDemo />
      </section>

      <section aria-labelledby="h2" className="sh" style={{ gap: 16 }}>
        <h2 id="h2" className="sec">Four ways in</h2>
        <div className="tiles">
          <a className="tile" href="/engine/index.html">
            <span className="tag"><Radar size={16} aria-hidden="true" />Part 1 · AI discovery engine</span>
            <h3>Why first SIPs leak, ranked from real evidence</h3>
            <p>19,005 posts from App Store, Play Store, YouTube, TradingQ&amp;A and Reddit. Every claim links to its source. Run the classifier or ask the evidence yourself.</p>
            <span className="go">Open the engine <ArrowRight size={16} aria-hidden="true" /></span>
          </a>
          <Link className="tile" href="/companion">
            <span className="tag"><Smartphone size={16} aria-hidden="true" />Part 5 · MVP</span>
            <h3>SIP Companion</h3>
            <p>A status card that shows “2 of 3 missed”, and an AI that explains why and offers only options that exist. With undo on every action, and no advice.</p>
            <span className="go">Try the prototype <ArrowRight size={16} aria-hidden="true" /></span>
          </Link>
          <Link className="tile" href="/eval">
            <span className="tag"><ShieldCheck size={16} aria-hidden="true" />AI quality</span>
            <h3>The release gate</h3>
            <p>27 locked scenarios run against the live model. A release ships only if 85% pass, no unsafe reply reaches a user, and needless safe replies stay at 20% or less.</p>
            <span className="go">
              {ev ? <span className={"badge " + (ev.passed ? "ok" : "bad")}>{ev.passed ? "Passing" : "Holding"} · {ev.full_pass}/{ev.n}</span> : <span className="badge idle">Awaiting first live run</span>}
              <ArrowRight size={16} aria-hidden="true" />
            </span>
          </Link>
          <Link className="tile" href="/metrics">
            <span className="tag"><Activity size={16} aria-hidden="true" />Parts 6 and 7</span>
            <h3>Live metrics and user tests</h3>
            <p>Real usage of the companion: questions asked, safe-reply rate, actions taken, undos, and the results of moderated user tests.</p>
            <span className="go">See the dashboard <ArrowRight size={16} aria-hidden="true" /></span>
          </Link>
        </div>
      </section>

      <section aria-labelledby="h3" className="sh" style={{ gap: 14 }}>
        <h2 id="h3" className="sec">How it’s built</h2>
        <div className="stack">
          <div><b>Server-side AI</b>Every reply is generated on the server and checked before you see it. No account needed.</div>
          <div><b>Eval-gated releases</b>A new version is promoted only after the golden set passes on it.</div>
          <div><b>Private by design</b>No names or accounts. PAN-like text is blocked before it is sent.</div>
          <div><b>Measured</b>Anonymous events and test sessions feed the metrics page. Aggregates only.</div>
        </div>
        <p className="disc">An independent concept for a product case study about Groww, not affiliated with or endorsed by Groww. Sample data only; nothing here moves money. Information, not investment advice.</p>
      </section>
    </div>
  );
}
