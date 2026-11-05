// Cancellation eligibility matrix (no model, no network). For every scenario, and for synthetic debit days that put the
// next instalment 1-10 days away, eligibility comes from the app state (options(s).STOP.available). Checks:
//  - the rule-based answer to each cancellation question agrees with that state (7-day rule only when blocked);
//  - no answer says payment is required before cancelling;
//  - mock live drafts that claim "pay first" or "cancel now" when blocked never reach the user.
import { initState, options, nextDate } from "../lib/companion/model.mjs";
import { answerQuestion } from "../lib/companion/pipeline.mjs";
import { answerText } from "../lib/companion/answer.mjs";
import { daysBetween } from "../lib/companion/base.mjs";

const QS = ["I want to cancel this SIP", "Can I stop this SIP now?", "Can I cancel without paying anything?", "Do I have to pay the missed instalment before cancelling?",
  "How do I stop my SIP?", "Cancel my SIP today", "Can I end this SIP?", "SIP band karna hai"];
const PAY_FIRST = /\b(must|need to|have to|should|required to)\b[^.]{0,20}\b(first )?(pay|clear|settle)\b|\bpay[^.]{0,40}before (you )?(can )?(cancel|stop)|\b(clear|settle)\b[^.]{0,30}\b(dues?|instalment|payment)\b[^.]{0,30}\bbefore\b/i;
const BAD = { payFirst: { intent: "STOP", known: ["You must pay the missed instalment before cancelling."], means: [], todo: [], uncertain: [], sources: ["CANCEL_HOW"], actions: [] },
  cancelNow: { intent: "STOP", known: ["You can cancel this SIP right away from the SIPs tab."], means: [], todo: [], uncertain: [], sources: ["CANCEL_HOW"], actions: ["STOP"] } };

const states = [];
for (const sc of ["A", "B", "C", "D", "E"]) states.push({ name: sc, s: () => initState(sc) });
// Synthetic: scenario A with the debit day moved so the next instalment is 1..10 days from today.
for (let k = 1; k <= 10; k++) states.push({ name: "A+" + k + "d", s: () => { const s = initState("A"); const t = new Date(s.today + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() + k); s.day = t.getUTCDate(); return s; } });

let n = 0, ok = 0; const fails = [];
for (const st of states) {
  const s0 = st.s(); const nx = nextDate(s0); if (!nx) continue;
  const eligible = options(s0).find((o) => o.id === "STOP").available, days = daysBetween(s0.today, nx);
  if (eligible !== (days > 7)) fails.push(st.name + ": eligibility " + eligible + " but next debit in " + days + " days");
  for (const q of QS) {
    for (const mode of ["rule", "payFirst", "cancelNow"]) {
      const r = await answerQuestion(st.s(), q, { generate: mode === "rule" ? null : async () => JSON.parse(JSON.stringify(BAD[mode])) });
      const t = answerText(r.answer); n++;
      const good = r.passed && !PAY_FIRST.test(t) && (eligible ? !/isn'?t possible|not possible until|can'?t (be )?(cancel|stop)/i.test(t) || mode !== "rule" : !/\b(you can|feel free to|just) (cancel|stop)\b/i.test(t) && r.mode !== "live") && (mode === "rule" || r.mode !== "live" || eligible && mode !== "payFirst");
      // When blocked, the rule-based answer must state the 7-day reason for stop/cancel questions.
      const reason = eligible || mode !== "rule" || /7 days/i.test(t) || r.answer.intent === "CONSEQUENCE";
      if (good && reason) ok++; else fails.push(st.name + " [" + (eligible ? "eligible" : "blocked, " + days + "d") + "] " + mode + " · " + q + " → " + r.mode + " · " + t.slice(0, 150));
    }
  }
}
console.log("cancellation matrix: " + ok + "/" + n);
fails.forEach((f) => console.log("FAIL " + f));
if (fails.length) process.exit(1);
