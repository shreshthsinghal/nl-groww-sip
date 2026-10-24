/* Investor-facing patterns behind the discovery engine. Facts are sourced; options describe what exists, never what to choose. */

export const TOTAL = 450; // first-hand stories labelled from 19,005 public posts
export const COUNTS = { TRUST: 64, EXPECT: 58, STOP: 57, PAY: 52, AMOUNT: 38, CONFUSE: 40, PAUSE: 33 };

const SRC = {
  rule: ["Taurus Mutual Fund, uniform SIP cancellation FAQ (rule in force since 1 Apr 2024)", "https://taurusmutualfund.com/sites/default/files/downloads/FAQs_on_Uniform_SIP_cancellation.pdf"],
  fees: ["Kotak Mutual Fund: why did my SIP instalment fail (Jul 2026)", "https://www.kotakmf.com/Information/blogs/why-did-sip-installment-failed"],
  groww15: ["Groww help: why did my SIP fail", "https://groww.in/help/mutual-funds/order/why-did-my-installment-fail--25"],
  skip: ["Groww help: pause your upcoming SIPs", "https://groww.in/help/mutual-funds/order/can-i-pause-sip-for-next-month"],
  edit: ["Groww blog: how to edit an SIP", "https://groww.in/blog/how-to-edit-sip-on-groww"],
  risko: ["SEBI riskometer, explained by Tata Mutual Fund", "https://www.tatamutualfund.com/blogs/what-mutual-fund-riskometer-learn-about-different-risk-levels"],
  cas: ["AMFI: Consolidated Account Statement", "https://www.amfiindia.com/investor-corner/investor-center/cas.html"],
  redeem: ["SEBI redemption timelines, reported by Cafemutual", "https://cafemutual.com/news/industry/28015-mfs-to-settle-redemption-proceeds-within-3-working-days-failure-to-attract-penalty"],
  scores: ["SEBI SCORES complaint portal", "https://scores.sebi.gov.in/"],
  sebi: ["SEBI investor website", "https://investor.sebi.gov.in/"]
};

export const PATTERNS = {
  PAY: {
    name: "Payments not going through",
    short: "A payment failed",
    lead: "Of all the patterns we found, this is the one most often linked to a SIP ending without anyone deciding to stop it.",
    facts: [
      ["Three failed instalments in a row cancel a monthly SIP automatically. This has applied across fund houses since April 2024.", SRC.rule],
      ["One successful instalment breaks the run. A skipped instalment doesn't count as a failure.", SRC.rule],
      ["Banks can charge a fee when an auto-debit bounces. Each bank sets its own amount.", SRC.fees],
      ["Groww's help pages list 15 different reasons an instalment can fail, from low balance to KYC and autopay issues.", SRC.groww15]
    ],
    options: [
      ["Pay the missed instalment yourself", "Ends the run of failures straight away."],
      ["Move the SIP date", "To a day or two after your income usually arrives."],
      ["Check the autopay status", "A pending or rejected mandate fails every month until it's fixed."],
      ["Skip next month's instalment", "If you know the money won't be there. A skip isn't a failure."]
    ],
    companion: true
  },
  AMOUNT: {
    name: "The monthly amount feels too high",
    short: "Money is tight",
    lead: "When money gets tight, SIPs tend to end through missed payments rather than a decision.",
    facts: [
      ["You can change the amount or date of an existing SIP on Groww.", SRC.edit],
      ["You can skip an upcoming instalment. A skip doesn't count towards auto-cancellation.", SRC.skip],
      ["Missed debits do count: three in a row cancel the SIP.", SRC.rule]
    ],
    options: [
      ["Lower the amount for now", "You can raise it again later."],
      ["Skip a month", "Better than letting the payment fail."],
      ["Move the date after payday", "So the money is there when the debit runs."],
      ["Stop the SIP", "If it no longer fits. What you've already invested stays invested."]
    ],
    companion: true
  },
  EXPECT: {
    name: "Returns feel disappointing",
    short: "Returns look bad",
    lead: "This is one of the most common worries in the first year of investing.",
    facts: [
      ["Fund values move with the market. Every scheme has a SEBI riskometer that shows its risk level, from Low to Very High.", SRC.risko],
      ["Early on, only a few instalments are invested, so a short market fall can turn the whole portfolio red.", null],
      ["A friend's return depends on when they started, which fund they hold and for how long, so the numbers rarely compare.", null],
      ["Stopping a SIP ends future payments. It doesn't sell the units you already hold.", SRC.rule]
    ],
    options: [
      ["Look up your fund's riskometer", "It's in the scheme's factsheet. It shows the risk you signed up for."],
      ["Read SEBI's investor guide", "Plain-language explainers on risk and returns."],
      ["Ask a SEBI-registered adviser", "If you want a recommendation for your situation. This tool doesn't give one."]
    ]
  },
  PAUSE: {
    name: "Paused or skipped, and unsure what's next",
    short: "I paused or skipped",
    lead: "Pauses meant to be short sometimes never restart. It usually happens because no one is reminded.",
    facts: [
      ["On Groww, you skip an upcoming instalment from Edit SIP in My SIPs.", SRC.skip],
      ["A skipped instalment doesn't count as a failed debit.", SRC.rule]
    ],
    options: [
      ["Check your next debit date", "In My SIPs, so you know when it restarts."],
      ["Set your own reminder", "For the week before the restart."],
      ["Adjust the amount before it restarts", "If your situation has changed."]
    ]
  },
  TRUST: {
    name: "Worried about your money or units",
    short: "Worried about my money",
    lead: "Delays and mismatches are stressful. There are official records you can check yourself.",
    facts: [
      ["A Consolidated Account Statement lists every mutual fund you hold across all apps. You can get one from MF Central, CAMS or KFintech.", SRC.cas],
      ["Fund houses must pay out redemptions within 3 working days for most schemes (5 for overseas funds), or pay a penalty.", SRC.redeem],
      ["If the app doesn't resolve a complaint, SEBI's SCORES portal takes investor complaints.", SRC.scores]
    ],
    options: [
      ["Download your CAS", "Check that the units match what the app shows."],
      ["Raise a ticket with the app", "Note the date and order ID."],
      ["Escalate on SCORES", "If it isn't resolved."]
    ]
  },
  CONFUSE: {
    name: "The numbers don't make sense",
    short: "Confused by the numbers",
    lead: "Many people stop trusting their SIP because the screen is hard to read, not because anything is wrong.",
    facts: [
      ["Apps often show two returns. Absolute return is total gain as a percentage. XIRR is yearly and accounts for when each instalment went in. Early on, the two can look very different.", null],
      ["Your Consolidated Account Statement is the official record of units and value.", SRC.cas]
    ],
    options: [
      ["Read SEBI's explainers", "On returns and how they are shown."],
      ["Check your CAS", "Compare it with the app."]
    ]
  }
};

export const STOP_FACTS = [
  ["Stopping a SIP only ends future payments. What you've invested stays invested until you redeem it.", SRC.rule],
  ["If it's a short squeeze, you can also skip a month or lower the amount.", SRC.edit]
];
export const STOP_CAUSES = [["EXPECT", "Returns are disappointing"], ["AMOUNT", "Money is tight"], ["PAY", "Payments keep failing"], ["TRUST", "I don't trust the app"], ["CONFUSE", "I don't understand it"], ["DONE", "I just don't need it any more"]];
export const STARTERS = [["PAY", "My SIP payment failed"], ["AMOUNT", "Money is tight this month"], ["EXPECT", "My returns are red"], ["STOP", "I'm thinking of stopping"], ["PAUSE", "I paused and lost track"], ["TRUST", "My units or money are missing"]];
export const SOURCE = { AS: "App Store review", PS: "Play Store review", RD: "Reddit post", YT: "YouTube comment", TQ: "TradingQ&A post" };

const KW = {
  PAY: /fail|bounc|declin|reject|autopay|auto pay|mandate|nach|upi|debit|not deduct|deduct|payment|kyc|missed|cancelled automatically|disappear/i,
  AMOUNT: /emi|salary|job|tight|afford|expense|paise|income|loan|rent|fees|reduce|lower|too much|can't pay|cannot pay|no money|broke/i,
  EXPECT: /return|red\b|loss|negative|minus|down|profit|growth|\bfd\b|friend|disappoint|crash|fall|falling|not growing|-\d/i,
  STOP: /stop|cancel|quit|exit|redeem|withdraw all|band kar|done with|close (my|the) sip/i,
  PAUSE: /pause|skip|break|resume|restart|forgot/i,
  TRUST: /units|allot|missing|redemption|withdraw|stuck|not credited|statement|fraud|scam|safe|disappeared money|money gone/i,
  CONFUSE: /xirr|understand|confus|what does|meaning|which number|\bnav\b|cagr|absolute/i
};

export function keywordPattern(text) {
  const t = text || ""; const hits = Object.keys(KW).filter((k) => KW[k].test(t));
  if (!hits.length) return { pattern: "NONE", confidence: 0.3 };
  const causes = hits.filter((k) => k !== "STOP");
  if (hits.includes("STOP") && causes.length) return { pattern: causes[0], confidence: 0.6, stopping: true };
  return { pattern: hits[0], confidence: hits.length === 1 ? 0.7 : 0.55, stopping: hits[0] === "STOP" };
}

const STOPW = new Set("i me my the a an and or to of in on for is it was this that with have has had be am are but not so at from just its im i'm can will do did get got".split(" "));
const toks = (s) => (s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOPW.has(w)).map((w) => w.replace(/(ing|ed|es|s)$/, ""));
export function rankStories(stories, pattern, text, n = 3) {
  const q = new Set(toks(text));
  return stories.filter((s) => s.driver === pattern)
    .map((s) => { const w = toks(s.excerpt); const ov = w.filter((x) => q.has(x)).length; return { s, score: ov * 10 + (s.stage === "EARLY" || s.stage === "ONBOARD" ? 2 : 0) + Number(s.date.slice(0, 4)) / 1000 }; })
    .sort((a, b) => b.score - a.score).slice(0, n).map((x) => x.s);
}
