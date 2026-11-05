import Link from "next/link";
import { sb } from "@/lib/supabase";
import R from "@/lib/companion/eval_results.json";
import { CHECKS } from "@/lib/companion/validate.mjs";
import { SOURCES } from "@/lib/companion/base.mjs";
import { SCENARIOS } from "@/lib/companion/model.mjs";

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

      <section className="sh" id="about" style={{ gap: 14, scrollMarginTop: 80 }} aria-labelledby="ab-h">
        <p className="eyebrow">About the prototype</p>
        <h2 id="ab-h" className="sec">What SIP Companion does</h2>
        <p className="note">SIP Companion is a chat assistant inside a Groww-style app for first-time mutual fund investors. It explains one SIP in plain words: its status, missed instalments, payment dates, the options available and what each option leads to. When an instalment slips, it lays out paying, changing the date, lowering the amount, skipping and stopping side by side, with no pressure towards any of them. It never recommends funds, predicts returns or tells anyone whether to invest.</p>
        <h3 className="sec" style={{ fontSize: "1.25rem" }}>How to use it</h3>
        <ul className="limits">
          <li><b>Start from the greeting.</b> Pick a suggested question, type anything in your own words, or tap the microphone to speak (in browsers that support it). Follow-ups like "why?" or "yes" continue the same conversation.</li>
          <li><b>Check an answer.</b> Each answer carries a Checked badge and a source count. The badge opens "How this answer was generated"; the sources expand to the verified help-page text and links.</li>
          <li><b>See the SIP.</b> The glass card on the greeting (and under "Let's review your SIP" once you start chatting, or in the side panel on the web) shows the amount, status, misses in a row and the reason, confirmed or not. "View SIP details" opens the timeline, next instalment and Pay Now window.</li>
          <li><b>Try an option.</b> Every option is reviewed first, then confirmed or cancelled. The result is simulated: no money moves and no real SIP changes.</li>
          <li><b>Change the situation.</b> Choose "Explore another situation" in the chat, or start typing: matching questions and situations appear above the message box. A new situation starts a fresh conversation. App and Web previews share one conversation.</li>
        </ul>
        <h3 className="sec" style={{ fontSize: "1.25rem" }}>The {SCENARIOS.length} illustrative situations</h3>
        <ul className="limits">{SCENARIOS.map((x) => <li key={x.id}><b>{x.title}.</b> {x.blurb}.</li>)}</ul>
        <p className="note">All data is illustrative: a sample fund, a fixed demo date of 26 Oct 2026, no names, PAN or account numbers.</p>
        <h3 className="sec" style={{ fontSize: "1.25rem" }}>Live AI, with a rule-based engine behind it</h3>
        <p className="note"><b>Live AI (since 5 Nov 2026).</b> Questions about the SIP are drafted by a Groq-hosted model (Qwen 3.8 27B first, GPT-OSS 20B second) on Groq's <b>free tier</b>. The key stays on the server. Each draft gets at most 5 seconds and must pass the same {CHECKS.length} checks. <b>Free-tier disclaimer:</b> the free tier allows only a few answers a minute. When that limit is used up, the model is slow, or a draft fails a check, the reply comes from the rule-based and retrieval engine below, and the answer says so ("Rule-based · AI limit reached"). Greetings, thanks and "yes/no" to the Companion's own offers always use the engine, because they depend on the conversation's memory.</p>
        <p className="note">The rule-based and retrieval engine runs on this site and needs no API key. It handles each message in four steps:</p>
        <ul className="limits">
          <li><b>Understand.</b> It reads your message and the last ten turns. It recognises greetings, thanks and how you're feeling, a "yes" or "no" to its own last question, follow-ups like "why?", "how?" or "what about next month?", and amounts or dates you type ("₹1,500", "1.5k", "the 5th").</li>
          <li><b>Retrieve.</b> It pulls this SIP's data and the verified facts the reply needs: Groww Help pages for product rules, plus AMFI and SEBI material for SIP basics such as NAV, withdrawals, exit loads and lock-ins.</li>
          <li><b>Compose.</b> It writes the reply from those facts, with varied wording, a next step it offers ("Want to review lowering it to ₹1,500?") and follow-up suggestions. Saying yes opens that review already filled in.</li>
          <li><b>Check.</b> The same {CHECKS.length} checks decide whether the reply is shown. If it doesn't match a topic, the engine searches example questions; if nothing is close, it says it isn't sure and offers the nearest questions instead of guessing.</li>
        </ul>
        <p className="note">The engine itself is not a large language model: its wording comes from the engine's phrasing, not from free generation, and topics outside SIPs are politely declined. While it works, the chat says "Checking your SIP details…", held for about half a second so it can be read; the reply is final before it appears.</p>
      </section>

      <section className="sh" id="evaluation" style={{ gap: 16, scrollMarginTop: 80 }} aria-labelledby="ev-h">
        <p className="eyebrow">Companion 2.0 · grounding and the answer gate</p>
        <h2 id="ev-h" className="sec">Every answer is checked before anyone sees it</h2>
        <ol className="flowline">
          <li><b>Context</b><span>The illustrative SIP's status as structured data: dates, amounts, failures, reason state. No names, PAN or account numbers.</span></li>
          <li><b>Retrieve</b><span>Only the verified product facts the question needs, each tied to a Groww Help or AMFI page.</span></li>
          <li><b>Compose</b><span>A live Groq model (free tier) drafts the answer from those facts; when the free limit is reached, the on-site engine composes it instead. Answers come as what we know / what it means / what you can do / what is still uncertain, with headings only when they help.</span></li>
          <li><b>Validate</b><span>{CHECKS.length} deterministic checks. A model's own confidence is never counted.</span></li>
          <li><b>Retry or fall back</b><span>One retry with the failed checks named; then a checked rule-based answer, labelled as a fallback.</span></li>
        </ol>
        <details className="panel"><summary><b>The {CHECKS.length} checks</b></summary><ul className="checklist">{CHECKS.map(([k, l]) => <li key={k}><code>{k}</code> {l}</li>)}</ul></details>

        <h3 className="sec" style={{ fontSize: "1.25rem" }}>The interface: conversation first</h3>
        <ul className="limits">
          <li><b>The Companion opens as a chat.</b> A short greeting says what it helps with, offers scenario-aware starter questions and "Explore another situation", and states that answers are checked, give no fund tips or return predictions, and move no real money. A compact SIP card above it shows amount, status, misses in a row and the confirmed or unconfirmed reason; full details expand on request.</li>
          <li><b>Answers adapt to the question.</b> Short answers stay short; fuller ones are split into what we know, what it means, what you can do and what's still uncertain, with option cards and an expandable source list.</li>
          <li><b>Starter questions follow the scenario</b> (a confirmed miss, an unknown reason, a tight month, one miss, a pending debit) and go through the same engine and checks as typed questions.</li>
          <li><b>"How this answer was generated"</b> opens from each answer's Checked chip: the question, how it was produced, all {CHECKS.length} checks, the verified material used and the SIP facts available. Nothing in the browser can skip the checks; offline answers are checked on the device with the same code.</li>
          <li><b>Every option is a real, simulated flow</b>: pay the missed instalment, change the date, lower the amount, skip the next one, or stop. Each is reviewed, then confirmed or cancelled, and the result says no money moved. Stopping has no extra steps. Changing the scenario or resetting clears the conversation.</li>
          <li><b>App and Web previews</b> render the same components and share one conversation: a phone app, and a desktop page with the SIP and its options in a side panel. Light and dark themes, keyboard use and reduced motion are supported.</li>
          <li><b>Honest waiting states.</b> Answers arrive in well under a second, so the "Checking your SIP details…" indicator is held for at least 0.55 s to stay readable. The answer is already final by then; nothing is streamed or typed out to look like live AI.</li>
        </ul>

        <h3 className="sec" style={{ fontSize: "1.25rem" }}>Results from the last run</h3>
        <p className="note">Run {when(R.ranAt)} IST with <code>npm run eval:companion</code> on the shipped code. Release bar: golden pass ≥ 85%, zero unsafe answers shown, every red-team answer blocked.</p>
        <div className="stats">
          <div className={"stat " + (g.passed / g.n >= R.bars.goldenPass ? "ok" : "bad")}><b>{g.passed}/{g.n}</b><span>Golden questions fully passed ({pct(g.passed, g.n)})</span><small>Safety checks plus expected content</small></div>
          <div className={"stat " + (g.unsafeShown === 0 ? "ok" : "bad")}><b>{g.unsafeShown}</b><span>Unsafe answers shown</span><small>Bar: 0</small></div>
          <div className={"stat " + (red.blocked === red.n ? "ok" : "bad")}><b>{red.blocked}/{red.n}</b><span>Unsafe model answers blocked</span><small>Each replaced by a checked fallback</small></div>
          {R.dialogues && <div className={"stat " + (R.dialogues.unsafeShown === 0 ? "ok" : "bad")}><b>{R.dialogues.turnsPassed}/{R.dialogues.turns}</b><span>Conversation turns as expected</span><small>{R.dialogues.n} multi-turn dialogues: small talk, "yes", "why?", amounts, dates, SIP basics</small></div>}
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
          <li><b>No language model is involved.</b> On 1 Nov 2026 we tried free hosted models (Gemma 4, Gemini 3.5 Flash-Lite); they were rate-limited or took about 20 seconds per reply, and the project has no budget for a paid key, so the live-AI path was removed. The golden results measure the on-site engine. The red-team tests feed fake unsafe drafts to the checks to prove they block them.</li>
          <li><b>The golden questions were written by the same team as the engine.</b> They check behaviour we designed for; real users will phrase things differently. User tests are the next check.</li>
          <li><b>The checks are pattern-based.</b> They catch the failure modes listed above reliably, but a reworded unsafe claim could slip past. That's why a failed check never retries more than once and the fallback is always rule-based.</li>
          <li><b>Some product details are unconfirmed</b> and the Companion says so: whether a one-time investment counts as a missed instalment, whether Groww offers a pause longer than one skipped instalment, and how long an amount or date change takes to process. The Pay Now window counts weekends but not bank holidays.</li>
        </ul>
        <p className="note">Product facts checked on 26 Oct 2026 against: {Object.values(SOURCES).map((s, i) => <span key={s.url}>{i ? " · " : ""}<a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a></span>)}.</p>
      </section>
    </div>
  );
}
