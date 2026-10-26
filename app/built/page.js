import Link from "next/link";
import { sb } from "@/lib/supabase";

export const revalidate = 60;
export const metadata = { title: "How it's built · SIP Continuation", description: "The research, the AI quality gate, the companion lab and the live metrics behind the two tools." };

async function latestEval() {
  try { const { data } = await sb().from("eval_runs").select("passed,full_pass,n").order("created_at", { ascending: false }).limit(1); return data && data[0]; } catch { return null; }
}

export default async function Built() {
  const ev = await latestEval();
  const rows = [
    ["/research", "Research workspace", "For the product team: the ranked leaks, all 450 stories with filters, an ask box that cites its sources, a classifier for new feedback, and the method.", true],
    ["/design", "Design in Figma", "Clickable prototypes of the Companion and the Engine, and the design file with tokens, components and every screen state."],
    ["/eval", "Quality gate", ev ? `Latest live run: ${ev.full_pass}/${ev.n} scenarios passed, ${ev.passed ? "shipped" : "held"}.` : "27 locked scenarios. A release ships only if it passes them on the live model."],
    ["/lab", "Companion lab", "Every reply's safety checks, recorded and live modes, and the console for moderated user tests."],
    ["/metrics", "Live metrics", "What visitors do with the companion, and results from user tests. Aggregates only."]
  ];
  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <header className="sh" style={{ gap: 12 }}>
        <h1 className="big" style={{ fontSize: "clamp(2rem,4.4vw,2.8rem)" }}>How it's built</h1>
        <p className="lede">For reviewers. The two tools are kept simple on purpose. Here is the evidence and machinery behind them.</p>
      </header>
      <ul className="built">
        {rows.map(([h, t, d, raw]) => (
          <li key={h}>{raw ? <a href={h}><b>{t}</b><span>{d}</span></a> : <Link href={h}><b>{t}</b><span>{d}</span></Link>}</li>
        ))}
      </ul>
    </div>
  );
}
