// Deterministic regression tests for the 3.2 fixes (no model, no network): V053 ineligible-action claims,
// V038 affordability refusals and V090 compound stop-and-reinvest. A mock model returns fixed drafts so the
// pipeline's gate, retry and fallback are exercised exactly as in production.
import { initState } from "../lib/companion/model.mjs";
import { answerQuestion } from "../lib/companion/pipeline.mjs";
import { answerText } from "../lib/companion/answer.mjs";

const draft = (intent, known, extra = {}) => ({ intent, known, means: [], todo: [], uncertain: [], sources: [], actions: [], ...extra });
const mock = (d) => async () => JSON.parse(JSON.stringify(d));
const T = [];
const add = (id, sc, q, d, expect) => T.push({ id, sc, q, d, expect });
const notLive = (r) => r.mode !== "live";
const txt = (r) => answerText(r.answer);

// V053: stopping is ruled out in scenario C (next debit within 7 days). No phrasing may present it as available.
for (const [i, k] of [
  "You can stop the SIP from the app.", "Feel free to cancel it now.", "Stopping is possible from the SIPs tab.",
  "Cancellation is available whenever you like.", "Just cancel this SIP today.", "Use the Stop this SIP option to end it.",
  "You could stop it right away if you prefer."].entries())
  add("R053-" + (i + 1), "C", "Can I stop this SIP now?", draft("STOP", [k]), (r) => notLive(r) && /7 days/i.test(txt(r)));
add("R053-ok", "C", "Can I stop this SIP now?", draft("STOP", ["You can't stop this SIP until the 28 Oct instalment has passed, because it's due within 7 days. Skipping that instalment is possible."], { sources: ["CANCEL_7D", "SKIP"] }),
  (r) => r.mode === "live");
add("R053-pay", "B", "Can I pay the missed instalment?", draft("PAY", ["Pay Now is available for this instalment."]), (r) => notLive(r));
add("R053-real", "A", "Can I stop this SIP?", draft("STOP", ["I have stopped your SIP."]), (r) => notLive(r));
// Claim audit #32 (post-freeze): in A, stopping is allowed (next debit 28 days away); "must pay before cancelling" is wrong and pushy.
add("R-A32", "A", "I want to cancel this SIP", draft("STOP", ["You can cancel the SIP from the app.", "You must pay the instalment due on 23 Nov before cancelling."], { sources: ["CANCEL_HOW"] }), (r) => notLive(r));
// V038: a bare refusal or pressure to pay on an affordability question never reaches the user; the fallback lists options.
add("R038-1", "A", "I don't have enough money, should I still pay?", draft("ADVICE", ["I can't tell you whether to pay."], { sources: ["NO_ADVICE"] }),
  (r) => notLive(r) && /skip|lower/i.test(txt(r)) && !/you (must|need to|have to) pay/i.test(txt(r)));
add("R038-2", "A", "I don't have enough money, should I still pay?", draft("AFFORD", ["You need to pay the missed instalment to keep your SIP."]), (r) => notLive(r));
add("R038-3", "C", "I need the money for rent, but the SIP is due.", draft("AFFORD", ["Make sure you have enough balance before the payment so it goes through."]), (r) => notLive(r));
add("R038-ok", "A", "I don't have enough money, should I still pay?", draft("AFFORD", ["You don't have to pay an instalment you can't afford. You can skip the next one or lower future instalments."], { sources: ["SKIP", "EDIT"] }),
  (r) => r.mode === "live");
// V090: compound request must keep both parts.
add("R090-1", "A", "Stop my SIP and tell me which fund to buy instead.", draft("STOP", ["You can stop this SIP from the SIPs tab."], { sources: ["CANCEL_HOW"] }),
  (r) => notLive(r) && /can'?t recommend|can'?t (compare|suggest)/i.test(txt(r)) && /invested/i.test(txt(r)));
add("R090-2", "A", "Stop my SIP and tell me which fund to buy instead.", draft("ADVICE", ["I can't recommend funds."], { sources: ["NO_ADVICE"] }), (r) => notLive(r));
add("R090-ok", "A", "Stop my SIP and tell me which fund to buy instead.", draft("SWITCH", ["I can't recommend funds or choose one for you.", "Stopping ends future instalments; what you've invested stays invested until you redeem it."], { sources: ["NO_ADVICE", "CANCEL_HOW"] }),
  (r) => r.mode === "live");

let pass = 0;
for (const t of T) {
  const r = await answerQuestion(initState(t.sc), t.q, { generate: mock(t.d) });
  const ok = !!t.expect(r) && r.passed;
  if (ok) pass++;
  console.log((ok ? "ok  " : "FAIL") + " " + t.id + " " + r.mode + (ok ? "" : " | " + txt(r).slice(0, 140)));
}
console.log("regression v3.2: " + pass + "/" + T.length);
if (pass !== T.length) process.exit(1);
