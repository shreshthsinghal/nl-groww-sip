// Grounded answers for SIP Companion 2.0.
// classify() maps a question to an intent; retrieve() picks the verified facts that intent may use;
// compose() writes a structured answer from the scenario snapshot and those facts only.
// compose() is the demo engine when no live model is configured, and the safe fallback when a live answer fails the gate.
import { FACTS, LEX, fmtShort, fmtDay, inr, ordinal, daysBetween } from "./base.mjs";
import { describe, options, nextDate, lastAttempt, consecutive, payNowUntil, upcomingSkipped } from "./model.mjs";

const R = (re) => (q) => re.test(q);
export const SWITCH_RE = /\b(stop|stopping|cancel|cancelling|exit|close|end|quit|redeem|withdraw)\b[^?.]*\b(buy|reinvest|re-invest|switch|invest (it |the money )?(in|into|somewhere|elsewhere)|start(ing)? (a |an )?(new |different |another |other )(sip|fund)|another (fund|sip|scheme)|different (fund|sip|scheme)|other (fund|sip|scheme)|somewhere else|elsewhere)\b/i;
export const PICK_RE = /\b(which|what|best|better|recommend|suggest|should i|tell me|pick|choose|good)\b/i;
export const INJECTION = /\b(ignore (all |the |your )?(previous|above|prior)? ?(instructions|rules)|system prompt|system instructions|pretend you|jailbreak|developer mode|api key|secret key|access token|(another|other) (user|person|investor)'?s?|someone else'?s)\b/i;
// Requests for system secrets (keys, environment variables, credentials): an explicit security refusal, never routed elsewhere.
export const SECRETS_RE = /(^|\s)(cat |print |show |read |open )?\.env\b|\b(env(ironment)?[ _-]?var(iable)?s?|process\.env|dot ?env|api[ _-]?keys?|[a-z][a-z0-9_]*_(key|token|secret)s?|secret[ _-]?keys?|(your|the|system|server|app'?s?|backend|groq|openai) (secrets?|credentials?|keys?|tokens?|passwords?)|access[ _-]?tokens?|bearer tokens?|auth(entication)? tokens?|(admin|server|database|db|root) passwords?|(api|groq|openai|supabase) (key|token|credentials?))\b/i;
// Tax questions: no verified tax facts, so a plain "can't answer" with where to look. Advice-style tax questions stay ADVICE.
export const TAX_RE = /\b(tax(es|ed|able|ation)?|capital gains?|ltcg|stcg|tds|80c|itr|income tax)\b/i;
// "Should I increase / top up / step up my SIP?" is a decision only the investor can make: advice boundary.
export const INCREASE_ADVICE_RE = /\b(should i|shall i|is it (a )?(good|wise|smart|better|right|sensible)( idea| time| move)?( to)?|would it be (a )?(wise|smart|better|good|sensible)( idea)?( to)?|do you think i should|is now (a )?good time to|worth it to|makes? sense to|recommend(ed)? (that i|to))\b[^?]{0,40}\b(increase|raise|top[- ]?up|step[- ]?up|add more|put more|invest more|double|bump( it)? up|go higher|higher amount|more money)\b/i;
const RULES = [
  ["SECRETS", R(SECRETS_RE)],
  ["SENSITIVE", (q) => LEX.PII.test(q) || /\b(otp|password|pin|cvv|pan (number|card)|my pan|aadhaar)\b/i.test(q)],
  ["OUT_OF_SCOPE", R(INJECTION)],
  // Compound request: stop (or exit) AND put the money or a new SIP somewhere else. Not plain STOP, not plain ADVICE.
  ["SWITCH", R(SWITCH_RE)],
  ["ADVICE", R(INCREASE_ADVICE_RE)],
  ["TAX", (q) => TAX_RE.test(q) && !/\b(should i|which (fund|one)|best|recommend|suggest|good (fund|option))\b/i.test(q)],
  ["ADVICE", (q) => LEX.FUND_CS.test(q) || LEX.FUND_CI.test(q) || /\b(all my savings|put (all|my) (savings|money)|best for me|which (one|option)[^?]* best|which fund|best fund|what fund|kaunsa fund|good fund|returns?\b|kitna return|guarant|will (it|my money|my sip|the money) (grow|double|go up|recover)|profit|safe to invest|should i (invest|continue|keep|stop investing|stay|buy|sell|switch|increase|redeem)|stay invested|good time to|recommend|is it worth|will (it|the market|my sip) (grow|recover|go up))/i.test(q)],
  ["PAY", R(/\bpay(ing)?\b[^?]*\b(stop|prevent|avoid|reset|end)\b[^?]*\bcancel|\brecovery\b|\brecover\b/i)],
  ["STOP", R(/\b(undo|reverse|revoke)\b[^?]*\bcancel|\bcancel[^?]*\b(undo|reverse|revoke)\b/i)],
  ["WHY", R(/\b(balance was (low|insufficient|not enough)|low balance on|error code|npci|bank reject)/i)],
  ["CONSEQUENCE", R(/(?=[^?]*\b(miss|missed|fail|failed|skip|skipped)\b)[^?]*\b(reduce|affect|lose|touch|change|cut)\b[^?]*\b(existing|my|old|past|already bought)\s+(units|investments?|money)\b|\bif (it|this|that) (does |also )?fail|\b(old|existing|previous|past) money\b|\bmoney (still )?there\b|\bquarterly\b[^?]*\bcancel|\bcancel[^?]*\bquarterly\b/i)],
  ["CHARGES", R(/\b(charge[ds]?|fee|fees|penalty|fine|deduct(ed)? extra)\b/i)],
  // Questions about what a miss leads to, even when they mention cancelling or the next instalment.
  ["CONSEQUENCE", R(/\b(does|will|would|can|could)\b[^?]*\b(miss(ed|ing)?|fail(ed|s|ing|ure)?)\b[^?]*\bcancel|\bwhat (happens|will happen)\b[^?]*\bif\b[^?]*\b(miss|fail|don'?t pay|can'?t pay)|\bwhat happens next( month)?\b|\b(existing|current|already)\s+(investments?|invested)|\binvested (money|amount)|\bwhat i('ve| have) (already )?invested|\blose (my|the) (money|investment)|\binvestments? (be |get )?affected/i)],
  ["PAUSE", R(/\b(pause|skip|break|hold)\b/i)],
  ["STOP", R(/\b(stop|cancel|close|band kar|end (the|my|this) sip|quit)\b/i)],
  ["CONSEQUENCE", R(/\b(in a row|two missed|2 missed|three|3 miss|third|consecutive|next one fails|happens if (the )?(next|it|this|another)[^?]*fail|get cancell?ed|be cancell?ed|auto(matically)?[- ]cancel)/i)],
  ["AFFORD", R(/\b((do ?n[o']?t|not) have enough|not enough (money|funds|balance|cash)|should i still pay|need the money for|salary (is )?(late|delayed)|afford|tight|paise nahi|no money|short of (money|cash)|can'?t pay|cannot pay|unable to pay|emi|lost my job|less money)\b/i)],
  ["LOWER", R(/\b(lower|reduce|decrease|smaller|less) (the |my )?(future )?(amount|sip|instalment|installment)|\b(lower|reduce|decrease)\b[^?]*\bamount\b|\bamount\b.*\b(lower|reduce|decrease)/i)],
  ["CHANGE_DATE", R(/\b(change|move|shift) (the |my )?(sip |debit |instalment |installment |payment )?date|different date|\b(move|shift|change|switch|push)\b[^?]*\b(sip|debit|instalment|installment|payment|it)\b[^?]*\b(to|after|before) (the )?(\d{1,2}(st|nd|rd|th)?|payday|pay ?day|salary|month[- ]end|start of)|\b(after|before) (my |the )?(payday|pay ?day|salary)|\b(salary|payday|paid|income)\b[^?]*\b(sip|debit|instalment|installment)\b[^?]*\b(after|later|come)\b/i)],
  ["NEXT_DATE", R(/\b(next (payment|instalment|installment|debit|date)|when (is|will) (the |my )?(next|it be debited)|payment date|debit date)\b/i)],
  ["WHY", R(/\b(why|reason|kyu|kyon|kaise|what happened|what went wrong|fail|check first|what should i check|pending|result|processing|was it|because|due to)\b/i)],
  ["STATUS", R(/\b(start (it )?again|restart|resume|start a new)\b/i)],
  ["PAY", R(/\b(pay|payment|pay now|retry|resolve|fix it|recover|make up|catch up)\b/i)],
  ["STATUS", R(/\b(status|mean|sip|instalment|installment|autopay|mandate|missed|what can i do|options?)\b/i)]
];
export function classify(q) { const t = String(q || ""); for (const [k, f] of RULES) if (f(t)) return k; return "OUT_OF_SCOPE"; }

const NEEDS = {
  WHY: ["CAUSES", "CANCEL_RULE", "PAY_NOW", "NOTIFY"], CONSEQUENCE: ["CANCEL_RULE", "SKIP_NOT_FAIL", "NOTIFY", "CANCEL_HOW"],
  AFFORD: ["SKIP", "SKIP_NOT_FAIL", "EDIT", "CANCEL_HOW", "CANCEL_7D"], PAUSE: ["SKIP", "SKIP_NOT_FAIL"],
  STOP: ["CANCEL_HOW", "CANCEL_7D", "CANCEL_FINAL", "SKIP"], CHARGES: ["CHARGES"], PAY: ["PAY_NOW", "ONE_TIME", "CANCEL_RULE", "SKIP", "SKIP_NOT_FAIL", "EDIT"],
  LOWER: ["EDIT"], CHANGE_DATE: ["EDIT"], NEXT_DATE: ["EDIT", "SKIP_NOT_FAIL"], STATUS: ["CANCEL_RULE", "PAY_NOW", "CAUSES", "SKIP_NOT_FAIL", "CANCEL_7D", "CANCEL_HOW"],
  ADVICE: ["NO_ADVICE"], TAX: [], SECRETS: [], SWITCH: ["NO_ADVICE", "CANCEL_HOW", "CANCEL_FINAL", "CANCEL_7D"], SENSITIVE: [], OUT_OF_SCOPE: []
};
export function retrieve(intent) { return (NEEDS[intent] || []).filter((id) => FACTS[id]); }

const has = (s, id) => options(s).some((o) => o.id === id && o.available);
export function availableActions(s) { return options(s).filter((o) => o.available).map((o) => o.id); }

export function compose(s, q) {
  const intent = classify(q), d = describe(s), la = lastAttempt(s), n = consecutive(s), nx = nextDate(s), pn = d.pnOpen ? payNowUntil(s) : null;
  const reasonState = la && la.result === "failed" ? (la.reason && la.reason.state === "confirmed" ? "confirmed" : "unknown") : la && la.result === "pending" ? "pending" : "none";
  const a = { intent, known: [], means: [], todo: [], uncertain: [], sources: [], actions: [] };
  const amt = la ? inr(la.amount) : inr(s.amount);
  if (intent === "SWITCH") { // two parts: decline choosing a fund, then neutral facts about stopping this SIP
    a.known.push(PICK_RE.test(q) ? FACTS.NO_ADVICE.text : "Whether and where to invest next is your decision; I can't compare or suggest funds. SEBI's investor website explains how SIPs work.");
    if (has(s, "STOP")) { a.means.push(FACTS.CANCEL_HOW.text); a.todo.push(FACTS.CANCEL_FINAL.text); a.sources.push("NO_ADVICE", "CANCEL_HOW", "CANCEL_FINAL"); a.actions.push("STOP"); }
    else { a.means.push(FACTS.CANCEL_7D.text + " Skipping that instalment is possible."); a.todo.push(FACTS.CANCEL_HOW.text); a.sources.push("NO_ADVICE", "CANCEL_7D", "CANCEL_HOW"); if (has(s, "SKIP_NEXT")) a.actions.push("SKIP_NEXT"); }
    a.decline = PICK_RE.test(q);
    return a;
  }
  const within7 = nx && daysBetween(s.today, nx) <= 7;
  const missLine = n === 0 ? "No instalments are currently missed in a row." : n + " instalment" + (n > 1 ? "s" : "") + " in a row " + (n > 1 ? "haven't" : "hasn't") + " been paid.";

  if (s.stopped && !["ADVICE", "SENSITIVE", "OUT_OF_SCOPE", "TAX", "SECRETS"].includes(intent)) {
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
    case "SECRETS":
      a.known.push("I can't share API keys, environment variables, credentials or any other system secrets. They stay on the server and I can't reveal them.");
      a.todo.push("I can help with this SIP's status, payments and the options in the app."); a.decline = true; a.actions.push("EXPLAIN"); break;
    case "TAX":
      a.known.push("I can't tell you how much tax applies to your SIP. Tax isn't covered by the verified facts I use, so I'd only be guessing.");
      a.todo.push("The Income Tax Department's website or a tax professional can help with this. I can explain this SIP's status, payments and options.");
      a.uncertain.push("I have no tax information for this SIP."); a.decline = true; a.actions.push("EXPLAIN"); break;
    case "ADVICE":
      if (INCREASE_ADVICE_RE.test(q)) {
        a.known.push("Whether to increase your SIP is your decision, and I can't advise on it.");
        a.means.push("If you decide to change the amount, you can do it from Edit SIP, then Edit Amount & Date. A new amount applies to future instalments.");
        a.todo.push("SEBI's investor website explains how SIPs work."); a.sources.push("NO_ADVICE", "EDIT"); a.actions.push("EXPLAIN"); a.decline = true; break;
      }
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
      else if (n === 1) a.means.push("With 1 missed, nothing changes yet. What you've invested stays invested.");
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
