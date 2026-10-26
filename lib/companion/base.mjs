// Shared basics for SIP Companion 2.0: dates, money, the verified knowledge base, and the safety lexicon.
// Plain ESM with no imports so the app, the API route and the node eval script all load the same code.

export const TODAY = "2026-10-26"; // fixed demo date so every schedule stays coherent

/* ---------- dates and money (India) ---------- */
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const toD = (iso) => { const p = iso.split("-").map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2])); };
export const toISO = (d) => d.toISOString().slice(0, 10);
export const fmt = (iso) => { if (!iso) return "—"; const d = toD(iso); return d.getUTCDate() + " " + MON[d.getUTCMonth()] + " " + d.getUTCFullYear(); };
export const fmtShort = (iso) => { if (!iso) return "—"; const d = toD(iso); return d.getUTCDate() + " " + MON[d.getUTCMonth()]; };
export const fmtDay = (iso) => { const d = toD(iso); return DAY[d.getUTCDay()] + ", " + fmtShort(iso); };
export const monthName = (iso) => { const d = toD(iso); return ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][d.getUTCMonth()] + " " + d.getUTCFullYear(); };
export const daysBetween = (a, b) => Math.round((toD(b) - toD(a)) / 86400000);
export function monthDate(iso, addMonths, day) {
  const d = toD(iso); const y = d.getUTCFullYear(), m = d.getUTCMonth() + addMonths;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return toISO(new Date(Date.UTC(y, m, Math.min(day, last))));
}
export function addWorkingDays(iso, n) { // weekends only; bank holidays are not modelled
  let d = toD(iso), k = 0;
  while (k < n) { d = new Date(d.getTime() + 86400000); const w = d.getUTCDay(); if (w !== 0 && w !== 6) k++; }
  return toISO(d);
}
export const ordinal = (n) => n + (n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th");
export const inr = (n) => "₹" + Math.round(Number(n)).toLocaleString("en-IN");

/* ---------- verified sources (checked 26 Oct 2026) ---------- */
export const SOURCES = {
  GROWW_CANCELLED: { title: "Groww Help: Why was my SIP cancelled?", url: "https://groww.in/help/mutual-funds/order/why-was-my-order-cancelled--68" },
  GROWW_FAIL: { title: "Groww Help: Why did my SIP instalment fail?", url: "https://groww.in/help/mutual-funds/order/why-did-my-sip-installment-fail--36" },
  GROWW_MISSED: { title: "Groww Help: How do I pay a missed SIP instalment?", url: "https://groww.in/help/mutual-funds/mf-sip/how-do-i-pay-for-a-missed-installment-3" },
  GROWW_SKIP: { title: "Groww Help: Can I pause SIP for next month?", url: "https://groww.in/help/mutual-funds/order/can-i-pause-sip-for-next-month" },
  GROWW_EDIT: { title: "Groww Blog: How to edit a SIP on Groww", url: "https://groww.in/blog/how-to-edit-sip-on-groww" },
  GROWW_CANCEL: { title: "Groww Help: How can I cancel an ongoing SIP?", url: "https://groww.in/help/mutual-funds/mf-sip/how-to-cancel-my-sip" },
  GROWW_ECS: { title: "Groww Help: What are ECS charges?", url: "https://groww.in/help/mutual-funds/mf-autopay/what-are-ecs-charges--96" },
  AMFI_FAQ: { title: "Uniform SIP cancellation FAQ (AMFI process, via Taurus MF)", url: "https://taurusmutualfund.com/sites/default/files/downloads/FAQs_on_Uniform_SIP_cancellation.pdf" },
  SEBI: { title: "SEBI investor website", url: "https://investor.sebi.gov.in" }
};

/* Each fact is a sentence we may show, tied to the page that supports it. */
export const FACTS = {
  CANCEL_RULE: { src: ["GROWW_CANCELLED", "AMFI_FAQ"], text: "A monthly SIP is cancelled automatically after 3 instalments in a row aren't paid. For quarterly or longer SIPs, the limit is 2." },
  NOTIFY: { src: ["AMFI_FAQ"], text: "Fund houses tell investors by email or SMS after the first failed instalment, and again if the SIP is cancelled." },
  SKIP_NOT_FAIL: { src: ["AMFI_FAQ"], text: "A paused or skipped instalment isn't counted as a failure for automatic cancellation." },
  CAUSES: { src: ["GROWW_FAIL"], text: "Groww lists 15 possible causes in three groups: KYC and investor details, payment (autopay, mandate or balance), and scheme rules." },
  PAY_NOW: { src: ["GROWW_MISSED"], text: "If an instalment failed because of insufficient balance, a Pay Now option shows on the mutual fund dashboard for 2 working days." },
  ONE_TIME: { src: ["GROWW_MISSED"], text: "Otherwise you can make a one-time investment in the fund from the dashboard, though some funds don't allow it." },
  SKIP: { src: ["GROWW_SKIP"], text: "You can skip an upcoming instalment from My SIPs, then Edit SIP, then Skip Installment, and confirm the month being skipped." },
  EDIT: { src: ["GROWW_EDIT"], text: "You can change the SIP amount and date from Edit SIP, then Edit Amount & Date. The app shows an estimated processing time." },
  CANCEL_HOW: { src: ["GROWW_CANCEL"], text: "Cancelling stops future instalments. What you've invested stays invested until you choose to redeem it." },
  CANCEL_7D: { src: ["GROWW_CANCEL"], text: "A SIP can't be cancelled when its next instalment is due within 7 days; that instalment has to be paid first." },
  CANCEL_FINAL: { src: ["GROWW_CANCEL"], text: "A cancellation can't be undone, but you can start a new SIP in the same fund later." },
  CHARGES: { src: ["GROWW_ECS"], text: "Your bank may charge a fee when an instalment fails for low balance, and the amount varies by bank. Groww doesn't charge for a failed SIP order." },
  NO_ADVICE: { src: ["SEBI"], text: "This companion can't recommend funds, predict returns or tell you whether to invest. SEBI's investor website explains how SIPs work." }
};

/* ---------- safety lexicon (shared with the original companion gate) ---------- */
export const LEX = {
  FUND_CS: /\b(SBI|UTI|DSP|HDFC|ICICI|PPFAS|ABSL|HSBC|PGIM|LIC MF|ELSS)\b/,
  FUND_CI: /\b(parag parikh|nippon|axis (mutual|bluechip|small|mid|long)|kotak|mirae|quant (small|active|mid|mutual)|motilal|tata|franklin|aditya birla|canara robeco|bandhan|edelweiss|invesco|sundaram|mahindra manulife|baroda bnp|whiteoak|navi nifty|groww nifty|zerodha nifty|reliance|infosys|adani|nifty ?50 index fund|small[- ]cap fund|mid[- ]cap fund|large[- ]cap fund|flexi[- ]cap fund|index fund)/i,
  RETURN_A: /\b(will|would|could|can|should|expect(ed)?|likely|typically|usually|historically|on average|long[- ]term|over time)\b[^.]{0,50}\d+(\.\d+)?\s?%/i,
  RETURN_B: /\d+(\.\d+)?\s?%[^.]{0,50}\b(will|expected|likely|guaranteed|assured|typically|on average|per annum|p\.a|a year|annually)\b/i,
  RETURN_C: /\b(guaranteed?|assured returns?|risk[- ]free|sure[- ]shot|will (grow|double|multiply|recover)|always (grows?|recovers?)|markets? will (rise|recover|go up))\b/i,
  URGENCY: /(\b(hurry|act now|right now|immediately|urgent(ly)?|last chance|don'?t miss|before it'?s too late|limited time|now or never|missing out|fomo|you'?ll lose|you will lose|lose out|regret|everyone (else )?is investing|only \d+ (days?|hours?) left)\b|!)/i,
  ADVICE: /\b(you should (invest|continue|keep|stop|stay|buy|sell|switch|increase|start|pay)|i (would )?recommend|i suggest (that )?you|best (fund|option for you|time to)|don'?t stop|do not stop|good time to (invest|buy)|time in the market|buy the dip|switch to|invest more)\b|(^|[.!?]\s+|\b(should|must|better|need to|have to|important to|best to|just)\s+)(stay invested|keep investing)/i,
  PII: /\b[A-Z]{5}\d{4}[A-Z]\b|\b\d{9,18}\b/,
  ASKS_SENSITIVE: /(?<!\b(?:don'?t|do not|never|no need to|not)\s)\b(share|send|tell|give|enter|type)\b[^.]{0,40}\b(pan|otp|password|pin|cvv|card number|account number|aadhaar)\b/i,
  TX_CLAIM: /\b(i|we)('ve| have| just)? (paid|moved|changed|cancelled|canceled|stopped|paused|skipped|updated|debited|lowered|processed)\b|\byour (payment|instalment|sip) (has been|is now|was) (paid|made|processed|completed|successful|cancelled|stopped|changed)\b|\bdone for you\b/i,
  CAUSE: /\b(balance (was|is) (too )?low|low balance on|insufficient (balance|funds) (on|was|caused)|because (of )?(your )?(low|insufficient) balance|mandate was rejected|bank (had|has) a technical|kyc (is|was) (on hold|incomplete|expired) for you)\b/i,
  UNCERTAIN: /\b(not (been )?confirmed|isn'?t confirmed|hasn'?t been confirmed|not known|isn'?t known|unknown|not sure|can'?t (tell|confirm|see)|don'?t (know|have)|pending|not yet)\b/i
};
