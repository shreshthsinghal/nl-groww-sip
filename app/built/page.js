import Link from "next/link";
import { sb } from "@/lib/supabase";
import R from "@/lib/companion/eval_results.json";
import { CHECKS } from "@/lib/companion/validate.mjs";
import { SOURCES } from "@/lib/companion/base.mjs";

export const revalidate = 60;
export const metadata = { title: "How it's built · SIP Continuation", description: "The research, the Companion's grounding and answer gate, the evaluation results and their limits, and the live metrics." };

async function latestEval() {
  try { const { data } = await sb().from("eval_runs").select("passed,full_pass,n").order("created_at", { ascending: false }).limit(1); return data && data[0]; } catch { return null; }
}
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0) + "%";
const when = (d) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

export default async function Built() {
  const ev = await latestEval();
  const g = R.golden, red = R.redTeam, lg = R.legacy;
  const rows = [
    ["/companion", "SIP Continuation Companion (MVP)", "Five illustrative scenarios, fair options with simulated flows, and an assistant whose every answer passes the gate below.", true],
    ["/design", "Design in Figma", "The clickable Figma prototype of the Companion, and the design file with tokens, components and every screen state."],
    ["/eval", "Companion v1 quality gate", ev ? `Latest live run: ${ev.full_pass}/${ev.n} scenarios passed, ${ev.passed ? "shipped" : "held"}.` : "The 27 locked scenarios of the first companion and its run history."],
    ["/lab", "Companion v1 lab", "The first companion's per-reply checks, recorded and live modes, and the console for moderated user tests."],
    ["/metrics", "Live metrics", "What visitors do with the companion, and results from user tests. Aggregates only."]
  ];
  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <header className="sh" style={{ gap: 12 }}>
        <h1 className="big" style={{ fontSize: "clamp(2rem,4.4vw,2.8rem)" }}>How it's built</h1>
        <p className="lede">For reviewers: the machinery behind the Companion prototype, the evaluation results as they actually ran, and what they don't prove.</p>
      </header>
      <ul className="built">
        {rows.map(([h, t, d, raw]) => (
          <li key={h}>{raw ? <a href={h}><b>{t}</b><span>{d}</span></a> : <Link href={h}><b>{t}</b><span>{d}</span></Link>}</li>
        ))}
      </ul>

      <section className="sh" id="evaluation" style={{ gap: 16, scrollMarginTop: 80 }} aria-labelledby="ev-h">
        <p className="eyebrow">Companion 2.0 · grounding and the answer gate</p>
        <h2 id="ev-h" className="sec">Every answer is checked before anyone sees it</h2>
        <ol className="flowline">
          <li><b>Context</b><span>The illustrative SIP's status as structured data: dates, amounts, failures, reason state. No names, PAN or account numbers.</span></li>
          <li><b>Retrieve</b><span>Only the verified product facts the question needs, each tied to a Groww Help or AMFI page.</span></li>
          <li><b>Generate</b><span>A live model when an API key is configured; otherwise a rule-based engine that composes from the same facts. Answers come as known / means / what to do / not certain.</span></li>
          <li><b>Validate</b><span>{CHECKS.length} deterministic checks. A model's own confidence is never counted.</span></li>
          <li><b>Retry or fall back</b><span>One retry with the failed checks named; then a checked rule-based answer, labelled as a fallback.</span></li>
        </ol>
        <details className="panel"><summary><b>The {CHECKS.length} checks</b></summary><ul className="checklist">{CHECKS.map(([k, l]) => <li key={k}><code>{k}</code> {l}</li>)}</ul></details>

        <h3 className="sec" style={{ fontSize: "1.25rem" }}>Results from the last run</h3>
        <p className="note">Run {when(R.ranAt)} IST with <code>npm run eval:companion</code> on the shipped code. Release bar: golden pass ≥ 85%, zero unsafe answers shown, every red-team answer blocked.</p>
        <div className="stats">
          <div className={"stat " + (g.passed / g.n >= R.bars.goldenPass ? "ok" : "bad")}><b>{g.passed}/{g.n}</b><span>Golden questions fully passed ({pct(g.passed, g.n)})</span><small>Safety checks plus expected content</small></div>
          <div className={"stat " + (g.unsafeShown === 0 ? "ok" : "bad")}><b>{g.unsafeShown}</b><span>Unsafe answers shown</span><small>Bar: 0</small></div>
          <div className={"stat " + (red.blocked === red.n ? "ok" : "bad")}><b>{red.blocked}/{red.n}</b><span>Unsafe model answers blocked</span><small>Each replaced by a checked fallback</small></div>
          <div className="stat"><b>{pct(g.fallbacks, g.n)}</b><span>Fallback rate on golden questions</span><small>{g.byMode.guard || 0} of {g.n} answered by the guard (personal data or off-topic)</small></div>
        </div>
        <div className="tw"><table>
          <thead><tr><th>Pipeline test</th><th>Expected</th><th>Got</th><th>Result</th></tr></thead>
          <tbody>{R.pipeline.map((p) => <tr key={p.id}><td>{p.what}</td><td>{p.expect}</td><td>{p.got}</td><td>{p.pass ? "Pass" : "Fail"}</td></tr>)}</tbody>
        </table></div>
        <details className="panel"><summary><b>Red-team cases and the check that caught each</b></summary>
          <div className="tw"><table><thead><tr><th>Case</th><th>What the fake model did</th><th>Caught by</th></tr></thead>
            <tbody>{red.cases.map((c) => <tr key={c.id}><td>{c.id}</td><td>{c.what}</td><td>{c.firstFailed.join(", ")}</td></tr>)}</tbody></table></div>
        </details>
        <details className="panel"><summary><b>Golden questions ({g.n})</b></summary>
          <div className="tw"><table><thead><tr><th>ID</th><th>Scenario</th><th>Question</th><th>Answered by</th><th>Result</th></tr></thead>
            <tbody>{g.cases.map((c) => <tr key={c.id}><td>{c.id}</td><td>{c.scenario}</td><td>{c.q}</td><td>{c.mode}</td><td>{c.pass ? "Pass" : "Fail: " + c.fails.join("; ")}</td></tr>)}</tbody></table></div>
        </details>

        <h3 className="sec" style={{ fontSize: "1.25rem" }}>Companion v1, re-scored</h3>
        <p className="note">The first companion's 27-case golden set, scored from the recorded Claude run of 23 Oct with the v1 gate: <b>{lg.fullPass}/{lg.n}</b> fully passed ({pct(lg.fullPass, lg.n)}), <b>{lg.unsafeShown}</b> unsafe replies shown, <b>{lg.fallbacks}</b> safe fallbacks of which <b>{lg.needless}</b> was unnecessary, intent right in {lg.intentOk}/{lg.n}.</p>

        <h3 className="sec" style={{ fontSize: "1.25rem" }}>What these results don't show</h3>
        <ul className="limits">
          <li><b>The live model hasn't been evaluated on Companion 2.0.</b> No API key is configured on this deployment, so the golden results measure the rule-based engine. The red-team tests use fake model output to prove the gate blocks it; they don't measure how often a real model would fail.</li>
          <li><b>The golden questions were written by the same team as the engine.</b> They check behaviour we designed for; real users will phrase things differently. User tests are the next check.</li>
          <li><b>The checks are pattern-based.</b> They catch the failure modes listed above reliably, but a reworded unsafe claim could slip past. That's why a failed check never retries more than once and the fallback is always rule-based.</li>
          <li><b>Some product details are unconfirmed</b> and the Companion says so: whether a one-time investment counts as a missed instalment, whether Groww offers a pause longer than one skipped instalment, and how long an amount or date change takes to process. The Pay Now window counts weekends but not bank holidays.</li>
        </ul>
        <p className="note">Product facts checked on 26 Oct 2026 against: {Object.values(SOURCES).map((s, i) => <span key={s.url}>{i ? " · " : ""}<a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a></span>)}.</p>
      </section>
    </div>
  );
}
