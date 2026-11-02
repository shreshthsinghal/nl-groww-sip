// SIP Companion's conversation layer. No external AI and no API keys.
// It turns one message plus the recent conversation into a grounded, checked answer:
//   1. understand: small talk, feelings, yes/no to the last offer, follow-ups ("why?", "how?"), amounts and dates
//   2. retrieve: this SIP's data plus verified facts (answer.mjs for the SIP, a small knowledge base for general SIP questions)
//   3. compose: a conversational reply built from those facts, with varied wording and a natural next step
//   4. fall back: lexical retrieval over example questions, then an honest "did you mean…" instead of a canned refusal
// The result has the same shape as before, so the 15 checks in validate.mjs still decide what is shown.
import { FACTS } from "./base.mjs";
import { describe, options, lastAttempt, consecutive, nextDate, previewDate, fmtShort, fmtDay, inr, ordinal } from "./model.mjs";
import { classify, compose, availableActions } from "./answer.mjs";

/* ---------- helpers ---------- */
const norm = (q) => String(q || "").toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
const hash = (t) => { let h = 7; for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const pick = (arr, seed) => arr[seed % arr.length];
const STOP = new Set("the a an is are am i my me to of for and or on in it this that be do does did can could would should will what how why when which with about your you we our at by from if so not no yes ok please just".split(" "));
const toks = (t) => (norm(t).match(/[a-z₹0-9]+/g) || []).filter((w) => w.length > 1 && !STOP.has(w)).map((w) => w.replace(/(ing|ed|es|s)$/, ""));
const has = (s, id) => options(s).some((o) => o.id === id && o.available);
const blank = (intent) => ({ intent, known: [], means: [], todo: [], uncertain: [], sources: [], actions: [] });

/* ---------- entities ---------- */
export function entities(q) {
  const t = norm(q), out = {};
  const k = t.match(/(?:₹|rs\.?|inr)?\s?(\d+(?:\.\d+)?)\s?k\b/);
  const m = t.match(/(?:₹|rs\.?\s?|inr\s?)(\d[\d,]{1,7})/) || t.match(/\b(\d{1,2},\d{3}|\d{3,6})\b(?!\s*(st|nd|rd|th|%|years?|yrs?|months?))/);
  if (k) out.amount = Math.round(parseFloat(k[1]) * 1000);
  else if (m) { const v = parseInt(m[1].replace(/,/g, ""), 10); if (v >= 100 && v <= 1000000) out.amount = v; }
  const d = t.match(/\b(\d{1,2})(st|nd|rd|th)\b/) || t.match(/\b(?:date|day|on the|on)\s+(\d{1,2})\b(?!\s*(k|,|\d))/);
  if (d) { const v = parseInt(d[1], 10); if (v >= 1 && v <= 31) out.day = v; }
  return out;
}

/* ---------- conversational patterns ---------- */
const P = {
  greet: /^(hi+|hello+|hey+|hiya|yo|namaste|namaskar|good (morning|afternoon|evening)|hola|sup|what'?s up)\b[\s,.!?]*(there|companion|bot)?[\s,.!?]*$/,
  how: /^(how are you|how r u|how('?s| is) it going|how do you do|kaise ho|kya haal)\b/,
  who: /\b(who are you|what are you|your name|are you (a )?(bot|robot|human|real|ai|person)|are you chatgpt|is this (ai|a bot))\b/,
  can: /^(help|menu|what can you do|what do you do|how can you help|what can i ask|options please|what all can you)\b/,
  thanks: /^(thanks?|thank you|thx|ty|shukriya|dhanyavad|great,? thanks|ok thanks|thanks a lot)\b/,
  bye: /^(bye|goodbye|see you|see ya|cya|good night|tata)\b/,
  ack: /^(ok(ay)?|cool|nice|great|got it|alright|fine|hmm+|i see|makes sense|understood|noted|sounds good)[\s.!]*$/,
  yes: /^(yes|yeah|yep|yup|sure|ok(ay)? (sure|please|go ahead|do it|show me)|please do|go ahead|do it|show me|haan|ha|ji|tell me|why not|of course|please)[\s.!]*$/,
  no: /^(no|nope|nah|not now|no thanks|nahi|later|maybe later|skip it)[\s.!]*$/,
  feel: /\b(worried|scared|afraid|anxious|stress(ed)?|nervous|panic(king)?|upset|frustrat(ed|ing)|confus(ed|ing)|lost|overwhelm(ed)?|tension|dar lag|pareshan|sad|angry|annoyed)\b/,
  joke: /\b(joke|funny|cricket|weather|movie|song|recipe|news|politics|football|ipl)\b/,
  rude: /\b(stupid|useless|dumb|idiot|shut up|bakwas|worst)\b/,
  more: /^(why|why\??|why is that|how come|how|how\??|how do i do (that|it)|then\??|and\??|and then|what then|tell me more|more|explain|explain (that|more|please)|what do you mean|what does that mean|meaning|elaborate|go on|details?|like\??)[\s.?!]*$/,
  nextm: /\b(what about|and) (next month|the next one|next instalment|next installment)\b/
};

/* ---------- general SIP knowledge (retrieved by topic, every line tied to a fact) ---------- */
const LEARN = [
  { id: "sip_what", re: /\b(what is|what'?s|explain|meaning of|define|how does) (a |an )?sip\b|\bsip (meaning|kya hai)\b|\bhow (do|does) sips? work\b/, kw: "what is sip meaning systematic investment plan how work",
    build: (s) => ({ known: [FACTS.SIP_WHAT.text], means: [FACTS.UNITS_NAV.text], todo: ["Yours is " + inr(s.amount) + " on the " + ordinal(s.day) + " of each month."], sources: ["SIP_WHAT", "UNITS_NAV"] }), follow: ["What is NAV?", "Is my money guaranteed?", "Can I withdraw anytime?"] },
  { id: "nav", re: /\b(nav|net asset value|units?)\b/, kw: "nav net asset value units price allotted",
    build: () => ({ known: [FACTS.UNITS_NAV.text], means: ["So the same amount can buy more units when the NAV is lower and fewer when it is higher."], todo: ["The fund's page in the app shows its latest NAV and your units."], sources: ["UNITS_NAV"] }), follow: ["Why is my SIP value down?", "What is a SIP?"] },
  { id: "risk", re: /\b(guarantee[ds]?|safe|risky|risk|lose (my|all)|loss|losing|negative|red|down|fall(ing)?|crash|dropp?(ed|ing)?|minus|value (went|is) down)\b/, kw: "safe risk loss negative red down value fall crash guaranteed",
    build: () => ({ known: [FACTS.MARKET_RISK.text], means: ["Early months can look flat or negative while the value moves with the market. I can't predict how it will move."], todo: ["SEBI's investor website explains how SIPs behave over time. I can explain this SIP's payments and options."], sources: ["MARKET_RISK", "NO_ADVICE"] }), follow: ["What is NAV?", "What happens if I stop?", "What does my status mean?"] },
  { id: "redeem", re: /\b(withdraw(al)?|redeem|redemption|take (my |the )?money out|get (my )?money back|sell (my )?(units|fund|sip)|cash out|nikal)\b/, kw: "withdraw redeem money back sell units cash out",
    build: () => ({ known: [FACTS.REDEEM.text], means: [FACTS.EXIT_LOAD.text, FACTS.LOCKIN.text], todo: ["Stopping a SIP and withdrawing are separate: stopping ends future instalments, withdrawing sells units you hold."], sources: ["REDEEM", "EXIT_LOAD", "LOCKIN"] }), follow: ["What happens if I stop?", "What is an exit load?"] },
  { id: "exit", re: /\b(exit load|exit fee|load)\b/, kw: "exit load fee charge withdraw early",
    build: () => ({ known: [FACTS.EXIT_LOAD.text], means: ["It applies to withdrawals, not to skipping, pausing or stopping instalments."], todo: ["The fund's page shows its exit load before you redeem."], sources: ["EXIT_LOAD"] }), follow: ["How do I withdraw?", "Will I be charged a fee?"] },
  { id: "lock", re: /\b(lock[- ]?in|locked|tax[- ]?saving|80c|tax saver)\b/, kw: "lock in locked tax saving",
    build: () => ({ known: [FACTS.LOCKIN.text], means: ["Other funds usually have no lock-in, though an exit load may apply."], todo: ["The fund's page states whether it has a lock-in."], sources: ["LOCKIN", "EXIT_LOAD"] }), follow: ["How do I withdraw?", "What is an exit load?"] },
  { id: "min", re: /\b(minimum|min(imum)? amount|smallest|lowest (sip|amount)|how (low|little) can)\b/, kw: "minimum amount lowest smallest",
    build: (s) => ({ known: [FACTS.SIP_MIN.text], means: ["Yours is " + inr(s.amount) + " a month now. A lower amount applies to future instalments."], todo: ["You can change it from Edit SIP, then Edit Amount & Date."], sources: ["SIP_MIN", "EDIT"], actions: ["LOWER_AMOUNT"] }), follow: ["Can I lower the future amount?", "Can I change my SIP date?"] },
  { id: "autopay", re: /\b(autopay|auto ?debit|mandate|e-?mandate|nach|upi autopay|standing instruction)\b/, kw: "autopay mandate auto debit nach",
    build: (s) => ({ known: ["Instalments are taken by an automatic debit (autopay or mandate) from your bank on the " + ordinal(s.day) + " of each month."], means: [FACTS.CAUSES.text], todo: ["The SIP's page in the app shows the autopay status."], sources: ["CAUSES"] }), follow: ["Why did my last instalment fail?", "Can I change my SIP date?"] }
];

/* ---------- example questions for retrieval when nothing else matches ---------- */
const EXAMPLES = [
  ["WHY", "why did my payment fail what went wrong debit bounced reason instalment failed not deducted"],
  ["CONSEQUENCE", "what happens if i miss again will my sip be cancelled third miss consequence next one fails"],
  ["AFFORD", "cannot afford short of money tight month salary late low balance no cash broke"],
  ["PAUSE", "pause skip break hold one month not this month"],
  ["STOP", "stop cancel close end quit my sip"],
  ["LOWER", "lower reduce decrease amount smaller instalment"],
  ["CHANGE_DATE", "change move shift date day debit after salary payday"],
  ["NEXT_DATE", "next instalment when debit date upcoming schedule"],
  ["PAY", "pay missed instalment pay now retry make up"],
  ["CHARGES", "charges fee penalty fine bank deduct"],
  ["STATUS", "status what is happening my sip overview summary situation"],
  ...LEARN.map((l) => ["LEARN:" + l.id, l.kw])
];
const QUESTION_OF = { WHY: "Why did my last instalment fail?", CONSEQUENCE: "What happens if I miss the next one?", AFFORD: "What if money is tight this month?", PAUSE: "Can I skip next month?", STOP: "How do I stop my SIP?", LOWER: "Can I lower the future amount?", CHANGE_DATE: "Can I change my SIP date?", NEXT_DATE: "When is my next instalment?", PAY: "Can I pay the missed instalment?", CHARGES: "Will I be charged a fee?", STATUS: "What does my status mean?", "LEARN:sip_what": "What is a SIP?", "LEARN:nav": "What is NAV?", "LEARN:risk": "Is my money guaranteed?", "LEARN:redeem": "How do I withdraw?", "LEARN:exit": "What is an exit load?", "LEARN:lock": "What is a lock-in?", "LEARN:min": "What is the minimum SIP amount?", "LEARN:autopay": "What is autopay?" };
function nearest(q) {
  const qt = toks(q); if (!qt.length) return [];
  return EXAMPLES.map(([k, ex]) => { const et = toks(ex); const hit = qt.filter((w) => et.some((e) => e.startsWith(w) || w.startsWith(e))).length; return [k, hit / Math.sqrt(qt.length)]; })
    .filter(([, sc]) => sc > 0).sort((a, b) => b[1] - a[1]);
}

/* ---------- next-step suggestions by topic ---------- */
function followUps(s, intent) {
  const la = lastAttempt(s), failed = la && la.result === "failed";
  const F = {
    WHY: [failed ? "What happens if I miss the next one?" : "When is my next instalment?", "Can I change my SIP date?", "What if money is tight this month?"],
    CONSEQUENCE: ["How can I avoid that?", "Can I skip next month?", "Will my existing investments be affected?"],
    AFFORD: ["What happens if I skip?", "Can I lower the future amount?", "Can I change my SIP date?"],
    PAUSE: ["When is my next instalment?", "What happens if I stop instead?"],
    STOP: ["What happens to what I've invested?", "Can I skip instead?", "How do I withdraw?"],
    LOWER: ["What is the minimum SIP amount?", "Can I change my SIP date?"],
    CHANGE_DATE: ["When is my next instalment?", "Can I lower the future amount?"],
    NEXT_DATE: ["Can I change my SIP date?", "What if money is tight this month?"],
    PAY: ["What happens if I don't pay it?", "Can I skip next month?"],
    CHARGES: ["Why did my last instalment fail?", "Can I change my SIP date?"],
    STATUS: [failed ? "Why did my last instalment fail?" : "When is my next instalment?", "What are my options?", "What is a SIP?"],
    ADVICE: ["What does my status mean?", "Is my money guaranteed?"],
    CHAT: ["What does my status mean?", failed ? "Why did my last instalment fail?" : "When is my next instalment?", "What is a SIP?"]
  };
  return (F[intent] || F.CHAT).slice(0, 3);
}

/* ---------- offers: what "yes" will do next ---------- */
function offerFor(s, a) {
  const n = consecutive(s), la = lastAttempt(s);
  switch (a.intent) {
    case "WHY": return la && la.result === "failed" ? { text: "Want me to go through what you can do before the next instalment?", kind: "intent", q: "What if money is tight this month?" } : null;
    case "CONSEQUENCE": return n > 0 ? { text: "Shall I lay out the ways to avoid another miss?", kind: "intent", q: "What if money is tight this month?" } : null;
    case "LOWER": return has(s, "LOWER_AMOUNT") ? { text: "Want to review a lower amount? Nothing changes until you confirm.", kind: "action", action: "LOWER_AMOUNT" } : null;
    case "CHANGE_DATE": return has(s, "CHANGE_DATE") ? { text: "Want to pick a new date and see when the next instalment would be?", kind: "action", action: "CHANGE_DATE" } : null;
    case "PAUSE": return has(s, "SKIP_NEXT") ? { text: "Want to review skipping it? Nothing changes until you confirm.", kind: "action", action: "SKIP_NEXT" } : null;
    case "CHAT": case "STATUS": return { text: "Want me to walk you through where this SIP stands?", kind: "intent", q: "What does my status mean?" };
    default: return null;
  }
}

/* ---------- the turn ---------- */
export function converse(s, q, history = []) {
  const t = norm(q), seed = hash(t) + history.length;
  const lastBot = [...history].reverse().find((h) => h.role === "bot");
  const lastIntent = lastBot && lastBot.intent, offer = lastBot && lastBot.offer;
  const ent = entities(q);
  const d = describe(s), la = lastAttempt(s), n = consecutive(s), nx = nextDate(s);
  const sum = "Your " + inr(s.amount) + " SIP: " + d.headline.replace(/\.$/, "").toLowerCase() + ".";
  const done = (a, extra = {}) => finish(s, a, { ...extra, ent });

  // 1. answer to the companion's own question
  if (P.yes.test(t) && offer) {
    if (offer.kind === "action") { const a = blank("CHAT"); a.known.push(pick(["Sure. I've opened it for you to review.", "Here it is. Take a look, then confirm or cancel."], seed)); a.todo.push("Nothing changes until you confirm, and it's only simulated in this demo."); a.actions.push(offer.action); return done(a, { ui: { open: offer.action, amount: offer.amount, day: offer.day }, noOffer: true }); }
    if (offer.q) return converse(s, offer.q, history.concat([{ role: "user", text: offer.q }]));
  }
  if (P.no.test(t) && offer) { const a = blank("CHAT"); a.known.push(pick(["No problem.", "Sure, no rush.", "Okay."], seed) + " Ask me anything else about your SIP whenever you like."); return done(a, { noOffer: true }); }

  // 2. small talk
  if (P.greet.test(t)) { const a = blank("CHAT"); a.known.push(pick(["Hi, good to see you.", "Hello. I'm here to help with your SIP.", "Hey there."], seed) + " " + sum); a.todo.push("Ask me anything about it, or about how SIPs work."); return done(a); }
  if (P.how.test(t)) { const a = blank("CHAT"); a.known.push("I'm doing well, thanks for asking. I'm a software companion, so I'm always ready to look at your SIP."); a.means.push(sum); return done(a); }
  if (P.who.test(t)) { const a = blank("CHAT"); a.known.push("I'm SIP Companion, a software assistant, not a person and not a financial adviser."); a.means.push("I answer from this SIP's details and verified help pages, and every reply is checked before you see it."); a.todo.push("I can explain your status, missed instalments, dates and the options you have."); return done(a); }
  if (P.can.test(t)) { const a = blank("CHAT"); a.known.push("I can explain why an instalment failed, what happens next, your payment dates, and what each option leads to: paying, moving the date, lowering the amount, skipping or stopping."); a.means.push("I can also explain SIP basics like NAV, withdrawals and lock-ins."); a.todo.push("I can't recommend funds or predict returns."); a.sources.push("NO_ADVICE"); return done(a); }
  if (P.thanks.test(t)) { const a = blank("CHAT"); a.known.push(pick(["You're welcome.", "Happy to help.", "Anytime."], seed) + " Is there anything else about your SIP you'd like to check?"); return done(a, { noOffer: true }); }
  if (P.bye.test(t)) { const a = blank("CHAT"); a.known.push(pick(["Take care.", "Bye for now.", "See you."], seed) + " Your SIP details will be here whenever you come back."); return done(a, { noOffer: true }); }
  if (P.ack.test(t)) { const a = blank("CHAT"); a.known.push(pick(["Okay.", "Got it.", "Sure."], seed) + (lastIntent ? " Anything else you'd like to know about it?" : " What would you like to look at?")); return done(a, { followFrom: lastIntent, noOffer: true }); }
  if (P.rude.test(t)) { const a = blank("CHAT"); a.known.push("Sorry this has been frustrating. Let me try to be more useful."); a.means.push(sum); a.todo.push("Tell me what you'd like to sort out, in your own words."); return done(a); }

  // 3. follow-ups that lean on the last topic
  if (lastIntent && (P.more.test(t) || P.nextm.test(t))) {
    if (P.nextm.test(t)) return converse(s, la && la.result === "failed" ? "What happens if I miss the next one?" : "When is my next instalment?", history);
    if (/^how/.test(t) && ["LOWER", "CHANGE_DATE", "PAUSE", "STOP", "PAY", "AFFORD"].includes(lastIntent)) return done(howTo(s, lastIntent));
    const deeper = more(s, lastIntent); if (deeper) return done(deeper, { lead: "Sure." });
  }

  // 4. feelings come first, then the facts
  const domain = classify(q);
  if (P.feel.test(t) && ["OUT_OF_SCOPE", "STATUS"].includes(domain)) {
    const a = compose(s, la && la.result === "failed" ? "What can I do if I cannot afford the next instalment?" : "What does my status mean?");
    a.known.unshift(pick(["That's completely understandable.", "It makes sense to feel that way.", "Let's look at it together."], seed) + " Here's what's actually happening.");
    return done(a);
  }

  // 5. amounts and dates the user typed
  if (ent.amount && !ent.day && ["LOWER", "STATUS", "OUT_OF_SCOPE", "AFFORD", "PAY"].includes(domain) && !/\b(fee|charge|penalt)/.test(t)) return done(amountTurn(s, ent.amount));
  if (ent.day && (domain === "CHANGE_DATE" || /\b(date|day|move|shift|debit)\b/.test(t))) return done(dayTurn(s, ent.day));

  // 6. general SIP knowledge
  const topic = LEARN.find((l) => l.re.test(t));
  if (topic && ["OUT_OF_SCOPE", "STATUS", "WHY"].includes(domain) && !(topic.id === "risk" && domain === "WHY" && /\b(fail|instalment|installment|payment|debit)\b/.test(t))) return done(learn(s, topic), { follow: topic.follow });

  // 7. the SIP-specific engine
  if (domain !== "OUT_OF_SCOPE") return done(compose(s, q));

  // 8. off-topic, then retrieval, then an honest clarifying question
  if (P.joke.test(t)) { const a = blank("OUT_OF_SCOPE"); a.known.push("That's outside what I know, I'm afraid. I stick to SIPs, and this one in particular."); a.todo.push("Ask me about your payments, dates or options, or how SIPs work."); a.decline = true; return done(a); }
  const near = nearest(q);
  if (near.length && near[0][1] >= 0.7) {
    const k = near[0][0];
    if (k.startsWith("LEARN:")) { const tp = LEARN.find((l) => "LEARN:" + l.id === k); return done(learn(s, tp), { follow: tp.follow }); }
    return done(compose(s, QUESTION_OF[k]), { lead: "Here's what I can tell you." });
  }
  const a = blank("CLARIFY");
  a.known.push(pick(["I'm not sure I understood that.", "I didn't quite catch what you meant.", "I'm not certain what you're asking."], seed) + " I can help with this SIP's payments, dates and options, and with SIP basics.");
  a.todo.push(near.length ? "Did you mean one of the questions below?" : "Try asking in a different way, or pick a question below.");
  return done(a, { follow: (near.length ? near.slice(0, 3).map(([k]) => QUESTION_OF[k]) : followUps(s, "CHAT")).filter(Boolean), noOffer: true });
}

function learn(s, tp) { const b = tp.build(s); const a = blank("LEARN"); a.known = b.known || []; a.means = b.means || []; a.todo = b.todo || []; a.sources = b.sources || []; a.actions = (b.actions || []).filter((x) => has(s, x)); return a; }

function amountTurn(s, amt) {
  const a = blank("LOWER"); const nx = nextDate(s);
  if (amt < s.amount) {
    a.known.push("Yes, you can lower future instalments from " + inr(s.amount) + " to " + inr(amt) + ".");
    a.means.push("The change applies to future instalments" + (nx ? ", so the " + fmtShort(nx) + " instalment would be " + inr(amt) + " if it's processed in time." : ".") + " It doesn't change anything already paid or missed.");
    a.uncertain.push("Each fund sets its own minimum, and the app shows the processing time when you confirm.");
    a.sources.push("EDIT"); if (has(s, "LOWER_AMOUNT")) a.actions.push("LOWER_AMOUNT");
    return { ...a, _offer: has(s, "LOWER_AMOUNT") ? { text: "Want to review lowering it to " + inr(amt) + "? Nothing changes until you confirm.", kind: "action", action: "LOWER_AMOUNT", amount: amt } : null };
  }
  if (amt === s.amount) { a.known.push("Your SIP is already " + inr(s.amount) + " a month."); a.todo.push("You can change the amount from Edit SIP, then Edit Amount & Date."); a.sources.push("EDIT"); return a; }
  a.known.push("Raising it to " + inr(amt) + " is also done from Edit SIP, then Edit Amount & Date. The new amount applies to future instalments.");
  a.todo.push("Whether a higher amount suits you is your call; I can't advise on that."); a.sources.push("EDIT", "NO_ADVICE"); return a;
}

function dayTurn(s, day) {
  const a = blank("CHANGE_DATE");
  if (day > 28) { a.known.push("Dates from the 29th to the 31st aren't offered, so every month has the date."); a.todo.push("The 28th or the 1st are the closest options."); a.sources.push("EDIT"); return a; }
  if (day === s.day) { a.known.push("Your instalments are already on the " + ordinal(day) + "."); a.sources.push("EDIT"); return a; }
  const p = previewDate(s, day);
  a.known.push("Moving instalments to the " + ordinal(day) + " would make the next one " + (p ? fmtDay(p) : "next month") + ".");
  a.means.push("A date just after your income arrives can make a low balance less likely. You change it from Edit SIP, then Edit Amount & Date.");
  a.uncertain.push("The app shows the processing time when you confirm, so a very close instalment may still use the old date.");
  a.sources.push("EDIT"); if (has(s, "CHANGE_DATE")) a.actions.push("CHANGE_DATE");
  return { ...a, _offer: has(s, "CHANGE_DATE") ? { text: "Want to review moving it to the " + ordinal(day) + "?", kind: "action", action: "CHANGE_DATE", day } : null };
}

function howTo(s, intent) {
  const a = blank(intent === "AFFORD" ? "PAUSE" : intent);
  const steps = { LOWER: ["EDIT", "LOWER_AMOUNT"], CHANGE_DATE: ["EDIT", "CHANGE_DATE"], PAUSE: ["SKIP", "SKIP_NEXT"], AFFORD: ["SKIP", "SKIP_NEXT"], STOP: ["CANCEL_HOW", "STOP"], PAY: ["PAY_NOW", "PAY_MISSED"] }[intent];
  a.known.push("Here's how, step by step: " + FACTS[steps[0]].text);
  a.todo.push("You can also review it right here first; nothing changes until you confirm, and it's simulated in this demo.");
  a.sources.push(steps[0]); if (has(s, steps[1])) a.actions.push(steps[1]);
  return a;
}

function more(s, intent) {
  const n = consecutive(s), la = lastAttempt(s);
  const a = blank(intent);
  switch (intent) {
    case "CONSEQUENCE": a.known.push(FACTS.CANCEL_RULE.text); a.means.push(FACTS.NOTIFY.text); a.todo.push(FACTS.SKIP_NOT_FAIL.text); a.sources.push("CANCEL_RULE", "NOTIFY", "SKIP_NOT_FAIL"); return a;
    case "STATUS":
      if (la && la.result === "pending") return more(s, "PENDING");
      if (la && la.result === "failed") return more(s, "WHY");
      a.known.push(FACTS.SIP_WHAT.text); a.means.push(FACTS.SKIP_NOT_FAIL.text); a.sources.push("SIP_WHAT", "SKIP_NOT_FAIL"); return a;
    case "PENDING":
      a.intent = "CONSEQUENCE"; a.known.push("If the bank confirms the debit, nothing else happens and the next instalment follows as usual.");
      a.means.push("If it fails, that would be 1 missed instalment. " + FACTS.CANCEL_RULE.text.split(". ")[0] + ".");
      a.todo.push(FACTS.NOTIFY.text); a.uncertain.push("Whether today's instalment went through isn't known yet."); a.sources.push("CANCEL_RULE", "NOTIFY"); return a;
    case "WHY": if (la && la.result === "failed" && !(la.reason && la.reason.state === "confirmed")) {
      a.known.push(FACTS.CAUSES.text); a.means.push("The fund house usually emails or texts after a failed instalment, and that message or your bank statement can show which one applied.");
      a.todo.push("If it turns out to be the balance, moving the date to just after your income arrives can help."); a.uncertain.push("The exact reason hasn't been confirmed yet, so I can't say which cause applies.");
      a.sources.push("CAUSES", "NOTIFY"); if (has(s, "CHANGE_DATE")) a.actions.push("CHANGE_DATE"); return a; }
    if (la && la.result === "failed" && la.reason && la.reason.state === "confirmed") { a.known.push("The bank reported that the linked account didn't have enough money on the debit date, so the instalment couldn't be collected."); a.means.push(FACTS.CAUSES.text); a.todo.push("Moving the date to just after your income arrives is one way people avoid this."); a.sources.push("CAUSES"); if (has(s, "CHANGE_DATE")) a.actions.push("CHANGE_DATE"); return a; } return compose(s, "What should I check first?");
    case "STOP": a.known.push(FACTS.CANCEL_HOW.text); a.means.push(FACTS.CANCEL_FINAL.text); a.todo.push(FACTS.SKIP.text); a.sources.push("CANCEL_HOW", "CANCEL_FINAL", "SKIP"); return a;
    case "PAUSE": case "AFFORD": a.known.push(FACTS.SKIP_NOT_FAIL.text); a.means.push(FACTS.SKIP.text); a.todo.push(FACTS.EDIT.text); a.sources.push("SKIP_NOT_FAIL", "SKIP", "EDIT"); if (has(s, "SKIP_NEXT")) a.actions.push("SKIP_NEXT"); return a;
    case "LOWER": case "CHANGE_DATE": a.known.push(FACTS.EDIT.text); a.means.push(FACTS.SIP_MIN.text); a.sources.push("EDIT", "SIP_MIN"); return a;
    case "PAY": a.known.push(FACTS.PAY_NOW.text); a.means.push(FACTS.ONE_TIME.text); a.todo.push(n > 0 ? "Paying ends the run of missed instalments; skipping the next one is also not counted as a failure." : "Nothing is waiting to be paid right now."); a.sources.push("PAY_NOW", "ONE_TIME"); if (n > 0) a.sources.push("SKIP_NOT_FAIL"); return a;
    case "LEARN": a.known.push(FACTS.MARKET_RISK.text); a.means.push(FACTS.UNITS_NAV.text); a.sources.push("MARKET_RISK", "UNITS_NAV"); return a;
    default: return compose(s, "What does my status mean?");
  }
}

/* Adds the conversational parts: an opening line when useful, an offer, and next-step suggestions. */
function finish(s, a0, { lead, follow, ui, noOffer, ent, followFrom } = {}) {
  const a = { ...a0, known: [...a0.known], means: [...a0.means], todo: [...a0.todo], uncertain: [...a0.uncertain], sources: [...new Set(a0.sources)], actions: [...new Set(a0.actions)].filter((x) => availableActions(s).includes(x)) };
  if (lead) a.known[0] = lead + " " + (a.known[0] || "");
  const offer = noOffer ? null : (a0._offer !== undefined ? a0._offer : offerFor(s, a));
  if (offer) a.todo.push(offer.text);
  delete a._offer;
  a.offer = offer ? { kind: offer.kind, q: offer.q, action: offer.action, amount: offer.amount, day: offer.day } : null;
  a.follow = (follow || followUps(s, followFrom || a.intent)).slice(0, 3);
  if (ui) a.ui = ui;
  return a;
}
