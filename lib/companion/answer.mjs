// Grounded answers for SIP Companion 2.0.
// classify() maps a question to an intent; retrieve() picks the verified facts that intent may use;
// compose() writes a structured answer from the scenario snapshot and those facts only.
// compose() is the demo engine when no live model is configured, and the safe fallback when a live answer fails the gate.
import { FACTS, LEX, fmtShort, fmtDay, inr, ordinal, daysBetween } from "./base.mjs";
import { describe, options, nextDate, lastAttempt, consecutive, payNowUntil, upcomingSkipped } from "./model.mjs";

const R = (re) => (q) => re.test(q);
const RULES = [
  ["SENSITIVE", (q) => LEX.PII.test(q) || /\b(otp|password|pin|cvv|pan (number|card)|my pan|aadhaar)\b/i.test(q)],
  ["OUT_OF_SCOPE", R(/\b(ignore (all |the |your )?(previous|above|prior) (instructions|rules)|system prompt|pretend you|jailbreak|developer mode)\b/i)],
  ["ADVICE", (q) => LEX.FUND_CS.test(q) || LEX.FUND_CI.test(q) || /\b(which fund|best fund|what fund|kaunsa fund|good fund|returns?\b|kitna return|guarant|will (it|my money|my sip|the money) (grow|double|go up|recover)|profit|safe to invest|should i (invest|continue|keep|stop investing|stay|buy|sell|switch|increase|redeem)|stay invested|good time to|recommend|is it worth|will (it|the market|my sip) (grow|recover|go up))/i.test(q)],
  ["CHARGES", R(/\b(charge[ds]?|fee|fees|penalty|fine|deduct(ed)? extra)\b/i)],
  ["PAUSE", R(/\b(pause|skip|break|hold)\b/i)],
  ["STOP", R(/\b(stop|cancel|close|band kar|end (the|my|this) sip|quit)\b/i)],
  ["CONSEQUENCE", R(/\b(in a row|two missed|2 missed|three|3 miss|third|consecutive|next one fails|happens if (the )?(next|it|this|another)[^?]*fail|get cancell?ed|be cancell?ed|auto(matically)?[- ]cancel)/i)],
  ["AFFORD", R(/\b(afford|tight|paise nahi|no money|short of (money|cash)|can'?t pay|cannot pay|unable to pay|emi|lost my job|less money)\b/i)],
  ["LOWER", R(/\b(lower|reduce|decrease|smaller|less) (the |my )?(amount|sip|instalment|installment)|\bamount\b.*\b(lower|reduce|decrease)/i)],
  ["CHANGE_DATE", R(/\b(change|move|shift) (the |my )?(sip |debit |instalment |installment )?date|different date/i)],
  ["NEXT_DATE", R(/\b(next (payment|instalment|installment|debit|date)|when (is|will) (the |my )?(next|it be debited)|payment date|debit date)\b/i)],
  ["WHY", R(/\b(why|reason|kyu|kyon|kaise|what happened|what went wrong|fail|check first|what should i check|pending|result|processing|was it|because|due to)\b/i)],
  ["STATUS", R(/\b(start (it )?again|restart|resume|start a new)\b/i)],
  ["PAY", R(/\b(pay|payment|pay now|retry)\b/i)],
  ["STATUS", R(/\b(status|mean|sip|instalment|installment|autopay|mandate|missed|what can i do|options?)\b/i)]
];
export function classify(q) { const t = String(q || ""); for (const [k, f] of RULES) if (f(t)) return k; return "OUT_OF_SCOPE"; }

const NEEDS = {
  WHY: ["CAUSES", "CANCEL_RULE", "PAY_NOW", "NOTIFY"], CONSEQUENCE: ["CANCEL_RULE", "SKIP_NOT_FAIL", "NOTIFY", "CANCEL_HOW"],
  AFFORD: ["SKIP", "SKIP_NOT_FAIL", "EDIT", "CANCEL_HOW", "CANCEL_7D"], PAUSE: ["SKIP", "SKIP_NOT_FAIL"],
  STOP: ["CANCEL_HOW", "CANCEL_7D", "CANCEL_FINAL", "SKIP"], CHARGES: ["CHARGES"], PAY: ["PAY_NOW", "ONE_TIME", "CANCEL_RULE"],
  LOWER: ["EDIT"], CHANGE_DATE: ["EDIT"], NEXT_DATE: ["EDIT", "SKIP_NOT_FAIL"], STATUS: ["CANCEL_RULE", "PAY_NOW", "CAUSES", "SKIP_NOT_FAIL", "CANCEL_7D", "CANCEL_HOW"],
  ADVICE: ["NO_ADVICE"], SENSITIVE: [], OUT_OF_SCOPE: []
};
export function retrieve(intent) { return (NEEDS[intent] || []).filter((id) => FACTS[id]); }

const has = (s, id) => options(s).some((o) => o.id === id && o.available);
export function availableActions(s) { return options(s).filter((o) => o.available).map((o) => o.id); }

export function compose(s, q) {
  const intent = classify(q), d = describe(s), la = lastAttempt(s), n = consecutive(s), nx = nextDate(s), pn = d.pnOpen ? payNowUntil(s) : null;
  const reasonState = la && la.result === "failed" ? (la.reason && la.reason.state === "confirmed" ? "confirmed" : "unknown") : la && la.result === "pending" ? "pending" : "none";
  const a = { intent, known: [], means: [], todo: [], uncertain: [], sources: [], actions: [] };
  const amt = la ? inr(la.amount) : inr(s.amount);
  const within7 = nx && daysBetween(s.today, nx) <= 7;
  const missLine = n === 0 ? "No instalments are currently missed in a row." : n + " instalment" + (n > 1 ? "s" : "") + " in a row " + (n > 1 ? "haven't" : "hasn't") + " been paid.";

  if (s.stopped && !["ADVICE", "SENSITIVE", "OUT_OF_SCOPE"].includes(intent)) {
    a.known.push("You stopped this SIP on " + fmtShort(s.stopped) + " in this demo."); a.means.push(FACTS.CANCEL_HOW.text); a.todo.push("Use Reset to restore the demo. In the real app a cancellation can't be undone, though you could start a new SIP."); a.sources.push("CANCEL_HOW", "CANCEL_FINAL"); a.actions.push("EXPLAIN");
    return a;
  }
  switch (intent) {
    case "SENSITIVE":
      a.known.push("Please don't share PAN, account numbers, OTPs or passwords here. This companion never needs them.");
      a.todo.push("Ask your question without those details and I'll answer from this SIP's status."); a.decline = true; break;
    case "OUT_OF_SCOPE":
      a.known.push("I can only help with this SIP's status, payments and the options in the app.");
      a.todo.push("Try one of the suggested questions, or see Groww Help for anything else."); a.decline = true; a.actions.push("EXPLAIN"); break;
    case "ADVICE":
      a.known.push("I can't recommend funds, predict returns or tell you whether to continue.");
      a.todo.push("I can explain this SIP's status and the options in the app. SEBI's investor website explains how SIPs work.");
      a.sources.push("NO_ADVICE"); a.actions.push("EXPLAIN"); a.decline = true; break;
    case "CHARGES":
      a.known.push("Groww doesn't charge for a failed SIP order."); a.means.push("Your bank may charge a fee when an instalment fails for low balance, and the amount varies by bank.");
      a.todo.push("Your bank can tell you its fee."); a.uncertain.push("This demo has no information about any fee your bank charged."); a.sources.push("CHARGES"); break;
    case "PAUSE":
      a.known.push(nx ? "The next instalment is " + inr(s.amount) + " on " + fmtDay(nx) + "." : "There's no upcoming instalment to skip.");
      a.means.push("Groww lets you skip an upcoming instalment from Edit SIP. A skipped instalment isn't counted as a failure, and instalments continue the month after.");
      if (has(s, "SKIP_NEXT")) { a.todo.push("Use Skip the next instalment to see what changes before you confirm."); a.actions.push("SKIP_NEXT"); }
      a.uncertain.push("Groww's help pages describe skipping one instalment; I couldn't confirm a longer pause."); a.sources.push("SKIP", "SKIP_NOT_FAIL"); break;
    case "STOP":
      if (within7) {
        a.known.push("The next instalment is due on " + fmtDay(nx) + ", within 7 days."); a.means.push(FACTS.CANCEL_7D.text);
        a.todo.push("If you don't want that instalment taken, you can skip it, and stop after it has passed."); a.sources.push("CANCEL_7D", "SKIP"); a.actions.push("SKIP_NEXT");
      } else {
        a.known.push("You can stop this SIP from the SIPs tab."); a.means.push("Stopping ends future instalments. What you've invested stays invested until you choose to redeem it. A cancellation can't be undone, but you can start a new SIP later.");
        a.todo.push("Use Stop this SIP to review it before confirming. Lowering the amount or skipping a month are also there if they suit you better.");
        a.sources.push("CANCEL_HOW", "CANCEL_FINAL"); a.actions.push("STOP", "LOWER_AMOUNT", "SKIP_NEXT");
      }
      break;
    case "CONSEQUENCE":
      a.known.push(missLine); a.means.push(FACTS.CANCEL_RULE.text.split(". ")[0] + ".");
      if (n === 2) a.means.push("If the " + fmtShort(nx) + " instalment also fails, this SIP would be cancelled automatically. What you've invested stays invested either way.");
      else if (n === 1) a.means.push("With 1 missed, nothing changes yet.");
      a.todo.push(n > 0 ? "A paid instalment ends the run of misses. Skipping an instalment isn't counted as a failure." : "Skipping an instalment isn't counted as a failure.");
      if (n > 0) a.todo.push("Fund houses send an email or SMS after a failed instalment, so it's worth checking those.");
      a.sources.push("CANCEL_RULE", "SKIP_NOT_FAIL"); if (n > 0) a.sources.push("NOTIFY", "CANCEL_HOW");
      if (has(s, "PAY_MISSED")) a.actions.push("PAY_MISSED"); if (has(s, "SKIP_NEXT")) a.actions.push("SKIP_NEXT"); break;
    case "AFFORD": {
      a.known.push(nx ? "The next instalment is " + inr(s.amount) + " on " + fmtDay(nx) + "." : "There's no upcoming instalment.");
      if (n > 0) a.known.push(missLine);
      a.means.push("You don't have to pay an instalment you can't afford. A skipped instalment isn't counted as a failure, and a lower amount applies to future instalments.");
      a.todo.push("You can skip the next instalment, lower future instalments, move the date" + (within7 ? "." : ", or stop the SIP.") + (within7 ? " Stopping isn't possible within 7 days of an instalment." : ""));
      a.uncertain.push("Whether an amount or date change is processed before " + (nx ? fmtShort(nx) : "the next instalment") + " depends on the processing time the app shows when you confirm.");
      a.sources.push("SKIP_NOT_FAIL", "EDIT"); a.sources.push(within7 ? "CANCEL_7D" : "CANCEL_HOW");
      ["SKIP_NEXT", "LOWER_AMOUNT", "CHANGE_DATE", "STOP"].forEach((x) => has(s, x) && a.actions.push(x)); break; }
    case "LOWER":
      a.known.push("Future instalments are " + inr(s.amount) + " a month now."); a.means.push("You can change the amount from Edit SIP, then Edit Amount & Date. A new amount applies to future instalments, not to one that already failed.");
      a.uncertain.push("Each fund sets its own minimum, and the app shows the processing time when you confirm."); a.sources.push("EDIT"); a.actions.push("LOWER_AMOUNT"); break;
    case "CHANGE_DATE":
      a.known.push("Instalments are on the " + ordinal(s.day) + " of each month" + (nx ? "; the next is " + fmtDay(nx) + "." : "."));
      a.means.push("You can change the date from Edit SIP, then Edit Amount & Date. A date just after your income arrives can make a low balance less likely.");
      a.uncertain.push("The app shows the processing time when you confirm, so a change may not apply to an instalment that is very close."); a.sources.push("EDIT"); a.actions.push("CHANGE_DATE"); break;
    case "NEXT_DATE":
      a.known.push(nx ? "The next instalment is " + inr(s.amount) + " on " + fmtDay(nx) + "." : "There's no upcoming instalment.");
      if (upcomingSkipped(s).length) a.known.push("The " + fmtShort(upcomingSkipped(s)[0]) + " instalment is skipped.");
      a.means.push("Instalments are on the " + ordinal(s.day) + " of each month.");
      a.todo.push("You can change the date from Edit SIP, then Edit Amount & Date."); a.sources.push("EDIT"); a.actions.push("CHANGE_DATE"); break;
    case "PAY":
      if (reasonState === "pending") { a.known.push("The " + fmtShort(la.date) + " instalment is still being processed."); a.means.push("It hasn't failed, so there's nothing to pay separately."); a.uncertain.push("Whether it went through isn't known yet."); a.todo.push("Check back once the status updates. Investing separately now could mean investing twice for this month."); a.actions.push("EXPLAIN"); }
      else if (pn) { a.known.push("Pay Now is open until " + fmtDay(pn) + " for the " + fmtShort(la.date) + " instalment of " + amt + "."); a.means.push("Paying it ends the run of missed instalments."); a.todo.push("Only pay if the money is comfortably there. Skipping the next instalment or lowering the amount are fine choices too."); a.sources.push("PAY_NOW", "CANCEL_RULE"); a.actions.push("PAY_MISSED", "SKIP_NEXT", "LOWER_AMOUNT"); }
      else if (reasonState === "unknown") { a.known.push("Pay Now is shown for failures caused by insufficient balance, and this failure's reason hasn't been confirmed."); a.means.push("You can make a one-time investment in the fund from the dashboard instead, though some funds don't allow it."); a.uncertain.push("Whether a one-time investment counts as the missed instalment isn't confirmed in Groww's help pages."); a.sources.push("PAY_NOW", "ONE_TIME"); if (has(s, "ONE_TIME")) a.actions.push("ONE_TIME"); a.actions.push("EXPLAIN"); }
      else { a.known.push("No instalment is waiting to be paid."); a.means.push(nx ? "The next instalment is " + inr(s.amount) + " on " + fmtDay(nx) + "." : "There are no upcoming instalments."); a.sources.push("EDIT"); }
      break;
    case "WHY":
      if (reasonState === "confirmed") {
        a.known.push("The " + fmtShort(la.date) + " instalment of " + amt + " didn't go through. The bank reported insufficient balance on the debit date." + (n >= 2 ? " The instalment before it failed for the same reason." : ""));
        a.means.push(n >= 2 ? "That's 2 in a row. A monthly SIP is cancelled automatically after 3 in a row, so the " + fmtShort(nx) + " instalment matters." : "That's 1 missed instalment. A monthly SIP is only cancelled after 3 in a row.");
        if (pn) a.todo.push("Pay Now is open until " + fmtDay(pn) + ". You could also move the date to just after your income arrives.");
        else a.todo.push("You could move the date to just after your income arrives, or lower future instalments.");
        a.sources.push("CANCEL_RULE"); if (pn) a.sources.push("PAY_NOW");
        ["PAY_MISSED", "CHANGE_DATE", "LOWER_AMOUNT"].forEach((x) => has(s, x) && a.actions.push(x));
      } else if (reasonState === "unknown") {
        a.known.push("We couldn't complete the " + fmtShort(la.date) + " instalment of " + amt + ".");
        a.means.push("That's 1 missed instalment in a row. A monthly SIP is only cancelled after 3 in a row, so nothing changes yet.");
        a.todo.push("Check your KYC status, your autopay (mandate) status and your bank balance on " + fmtShort(la.date) + ". Groww lists 15 possible causes across KYC, payment and scheme rules.");
        a.uncertain.push("The exact reason hasn't been confirmed yet, so I can't tell you which one applies.");
        a.sources.push("CAUSES", "CANCEL_RULE"); a.actions.push("EXPLAIN"); if (has(s, "ONE_TIME")) a.actions.push("ONE_TIME");
      } else if (reasonState === "pending") {
        a.known.push("The " + fmtShort(la.date) + " instalment was attempted today and is waiting for the bank's result.");
        a.means.push("It hasn't failed. Nothing has been missed so far."); a.uncertain.push("Whether it went through isn't known yet."); a.todo.push("Check back once the status updates."); a.actions.push("EXPLAIN");
      } else {
        a.known.push(la && la.result === "late" ? "The " + fmtShort(la.date) + " instalment failed and was then paid with Pay Now in this demo." : "None of this SIP's recent instalments have failed.");
        a.means.push(missLine); a.todo.push(nx ? "The next instalment is " + inr(s.amount) + " on " + fmtDay(nx) + "." : "There are no upcoming instalments."); a.actions.push("EXPLAIN");
      }
      break;
    default: // STATUS
      a.known.push(d.happened); a.means.push(d.means); a.todo.push(d.next); a.sources.push(...d.src);
      if (reasonState === "unknown") a.uncertain.push("The exact reason hasn't been confirmed yet.");
      if (reasonState === "pending") a.uncertain.push("Whether today's instalment went through isn't known yet.");
      availableActions(s).filter((x) => x !== "EXPLAIN").slice(0, 3).forEach((x) => a.actions.push(x));
  }
  a.sources = [...new Set(a.sources)]; a.actions = [...new Set(a.actions)];
  return a;
}

export function answerText(a) { return [].concat(a.known, a.means, a.todo, a.uncertain).join(" "); }

/* Suggested questions follow the state, so an unknown reason gets different prompts from a confirmed one. */
export function suggestions(s) {
  const la = lastAttempt(s), n = consecutive(s), nx = nextDate(s);
  if (s.stopped) return ["What happens to what I've invested?", "Can I start again later?"];
  if (la && la.result === "pending") return ["Why does it say pending?", "Should I pay it again?", "What happens if it fails?", "How can I check my next payment date?"];
  if (la && la.result === "failed") {
    const known = la.reason && la.reason.state === "confirmed";
    if (!known) return ["Why did this instalment fail?", "What should I check first?", "Will I be charged a fee?", "Can I pay the missed instalment?"];
    if (n >= 2) return ["Why did this instalment fail?", "What does two missed instalments in a row mean?", "Can I pay the missed instalment?", "What can I do if I cannot afford the next instalment?"];
    return ["Why did this instalment fail?", "What happens if the next one fails too?", "Can I pay the missed instalment?", "How can I check my next payment date?"];
  }
  if (s.tight) return ["What can I do if I cannot afford the next instalment?", "What happens if I skip?", "Can I stop this SIP now?", "Can I lower the amount?"];
  return ["How can I check my next payment date?", "What happens if I want to pause?", "Can I lower the amount?", nx ? "What does my status mean?" : "What does my status mean?"];
}
