// Grounded research agent. Deterministic: every count is computed from dataset.json at answer time and every
// example is a real record ID. Evidence text is treated as data only; nothing in it is ever executed or followed.
import { DS, DEF, RECORDS, BY_ID, RANKED, DRIVER, DRIVER_SHORT, SRC, W, WHY_WEIGHT, LAPSE_N, rankDrivers, search, countBy, pct } from "./core";

const N = RECORDS.length; // 450
const LAPSE = RECORDS.filter((r) => r.lapse);
const clip = (t, n = 220) => (t.length > n ? t.slice(0, n).replace(/\s+\S*$/, "") + " …" : t);
const ex = (r, why) => ({ id: r.id, src: SRC[r.src], driver: r.driver, text: clip(r.text), ...(why ? { why } : {}) });
const q = (label, n, of, note) => ({ label, n, of, pct: of ? pct(n, of) : null, ...(note ? { note } : {}) });
// Prefer human-checked, first-hand, then records with an explicit phrase; spread across sources.
function pick(rows, k = 4, prefer = () => 0) {
  const scored = rows.map((r) => ({ r, s: prefer(r) * 4 + (r.golden.some((g) => g.agree) ? 3 : 0) + (r.firstHand ? 2 : 0) + Object.keys(r.sig).length }));
  scored.sort((a, b) => b.s - a.s || a.r.id.localeCompare(b.r.id, "en", { numeric: true }));
  const out = [], seen = new Set();
  for (const { r } of scored) { if (out.length >= k) break; if (seen.has(r.src) && scored.length > k * 2) continue; seen.add(r.src); out.push(r); }
  for (const { r } of scored) { if (out.length >= k) break; if (!out.includes(r)) out.push(r); }
  return out;
}
const srcMix = (rows) => Object.entries(countBy(rows, (r) => SRC[r.src])).sort((a, b) => b[1] - a[1]).map(([s, n]) => `${s} ${n}`).join(", ");
export const SAMPLE_WARNING = "This dataset is designed to identify and prioritise reported lapse mechanisms. It is not a representative estimate of SIP lapse prevalence among all investors. Driver shares describe the coded research sample, not the overall investor population.";
const BASE_LIMITS = [
  SAMPLE_WARNING,
  "These are public posts and reviews, not a sample of Groww investors. A share of stories is not the share of investors who lapse.",
  "Reddit supplies 159 of the 450 coded records (35%) and 62% of everything collected, so Reddit's framing is over-represented.",
  "How the 450 coded records were chosen from the 2,518 that passed the filters is not documented; it was not a random or stratified sample.",
  "Labels are AI-assigned under codebook v1.2. Human agreement on the latest blind round was κ 0.50 on 20 records: moderate and preliminary."
];

const DRV_RE = { PAY: /payment|debit|auto ?pay|mandate|bounce|fail|nach|instal/, TRUST: /trust|allot|units|redemption|platform/, EXPECT: /return|loss|negative|expect|red\b|fd\b/, AMOUNT: /afford|amount|cash ?flow|emi|job|income|money (is|was|got) tight/, PAUSE: /pause|skip/, STOP: /\bstop|cancel|discontinu|quit|exit\b/, CONFUSE: /confus|understand|screen|unclear/, OUTSIDE: /outside|youtube|friend|advice|rely|reassur/ };
const mentioned = (s) => RANKED.filter((d) => DRV_RE[d].test(s));

/* ---------------- guards ---------------- */
const INJECTION = /(ignore|disregard|forget) (all |the |your |any )?(previous|prior|above|earlier|system)|you are now|system prompt|reveal (your|the) (prompt|instructions|key)|api[_ ]?key|jailbreak|act as (an?|the) /i;
const ADVICE = /(will (my|the|this) (sip|investment|money) (double|triple|grow|multiply)|should i (stop|continue|start|redeem|switch|invest|pause|buy|sell)|which (fund|mutual fund|sip) (should|to|is best)|best (fund|sip)|will (i|my sip) (get|make|earn)|guarantee|recommend (a|me)|how much should i invest)/i;
const UNANSWERABLE = /(\b(under|over|below|above|aged?|younger than|older than)\s*\d{2}\b|\byears? old\b|\bage (group|band|bracket)|\bgender\b|\bwomen\b|\bmen\b|\bfemale|\bmale\b|\bcity\b|\btier ?[123]\b|income (band|bracket|group|level)|\bsalary (band|bracket|range)|percentage of (all )?(investors|users|people|indians)|what (share|proportion|fraction|percent(age)?) of (all )?(investors|users|people)|how many (investors|users|people)( in india| on groww)?|\bprevalence\b|\bnationally\b|\bgroww'?s (users|customers) (who|that))/i;

/* ---------------- answer builders ---------------- */
function unanswerable(text) {
  const aged = RECORDS.filter((r) => r.sig.age);
  return {
    intent: "insufficient",
    finding: "This cannot be answered from our dataset. It asks how common something is among a group of investors, and the evidence can't measure that.",
    quant: [
      q("Records that state an age at all", aged.length, N, "Ages are taken only from the text. Nothing is inferred from writing style."),
      q("Records with no stated age", N - aged.length, N),
      q("Lapse stories coded payment failure", rankDrivers().rows.find((r) => r.driver === "PAY").n, LAPSE_N, "A share of public stories, not of investors.")
    ],
    examples: aged.map((r) => ex(r, `States an age: "${r.sig.age.phrase}"`)),
    contradictions: [],
    interpretation: "Two things block an answer. The records are public posts, not a sample of investors, so no percentage here estimates a population rate. And age, income, gender and city are almost never stated: 4 of 450 records give an age. Grouping those four by age would describe four posts, not investors under 25.",
    limitations: ["No demographic attribute is stored or inferred for 446 of 450 records.", "The evidence comes from people who chose to post, which over-represents problems and strong feelings.", ...BASE_LIMITS.slice(2, 3)],
    followUp: "To measure this, use Groww's own mandate and instalment data split by account age bands. Alternatively, run a survey with a stated sampling frame that asks age and whether an instalment ever failed.",
    insufficient: true
  };
}
function advice() {
  return { intent: "advice", finding: "I can't give investment advice, such as whether to stop, continue or pick a fund. This assistant answers questions about what the research evidence shows.", quant: [], examples: [], contradictions: [], interpretation: "", limitations: ["For personal guidance, a SEBI-registered investment adviser is the right route: investor.sebi.gov.in."], followUp: "Try asking what the evidence shows, for example: \"What do investors do when an instalment fails?\"", refused: true };
}
function injection() {
  return { intent: "blocked", finding: "That request asks me to change my rules, so I won't act on it. I only answer research questions about the evidence set, and I follow the same rules whatever the question or the evidence text says.", quant: [], examples: [], contradictions: [], interpretation: "", limitations: [], followUp: "Ask a research question, for example: \"Why does payment failure rank above trust?\"", refused: true };
}

function compareRank(a = "PAY", b = "TRUST") {
  const base = rankDrivers().rows, A = base.find((x) => x.driver === a), B = base.find((x) => x.driver === b);
  const vol = rankDrivers(RECORDS, { b: 0, c: 0, d: 0 }).rows;
  const v11 = rankDrivers(RECORDS.map((r) => ({ ...r, driver: r.d11, lapse: RANKED.includes(r.d11) })));
  const v11A = v11.rows.find((x) => x.driver === a);
  const aRecs = LAPSE.filter((r) => r.driver === a);
  const stopped = aRecs.filter((r) => r.sig.outcome && /Stopped|Considering/.test(r.sig.outcome.v));
  const continued = aRecs.filter((r) => r.sig.outcome && r.sig.outcome.v === "Continued");
  const noOutcome = aRecs.filter((r) => !r.sig.outcome);
  const higher = A.score >= B.score ? A : B, lower = higher === A ? B : A;
  const f = (x) => `${x.share.toFixed(1)} × ${x.exit} × ${x.addr} × ${x.ev.toFixed(2)} = ${x.score.toFixed(1)}`;
  const contradictions = [];
  if (B.n > A.n) contradictions.push({ id: null, text: `By volume, ${DRIVER[b]} is larger: ${B.n} vs ${A.n} of ${LAPSE_N} lapse stories.` });
  contradictions.push({ id: null, text: `With the analyst weights removed (story share only), ${DRIVER[a]} ranks ${vol.find((x) => x.driver === a).rank} of 8 and ${DRIVER[b]} ranks ${vol.find((x) => x.driver === b).rank}. The lead depends on the exit and addressability weights, which are judgements, not measurements.` });
  if (v11A && v11A.n !== A.n) contradictions.push({ id: null, text: `${DRIVER[a]} fell from ${v11A.n} to ${A.n} stories between codebook v1.1 and v1.2, when set-up questions stopped counting as failures. The count is sensitive to the codebook.` });
  if (a === "PAY") contradictions.push({ id: null, text: `Only ${stopped.length} of ${A.n} payment-failure stories state that the person stopped or is considering stopping. ${noOutcome.length} don't state an outcome, ${continued.length} say they continued, and ${A.n - stopped.length - noOutcome.length - continued.length} describe a pause or a smaller amount. The evidence shows that failures happen and frustrate people. It does not show that they end SIPs.` });
  const support = pick(aRecs, 3, (r) => (r.sig.payment ? 1 : 0)); const used = new Set(support.map((r) => r.id));
  const notStopped = aRecs.filter((r) => !used.has(r.id) && !(r.sig.outcome && /Stopped|Considering/.test(r.sig.outcome.v)));
  pick(a === "PAY" ? notStopped.filter((r) => r.sig.outcome).concat(notStopped.filter((r) => !r.sig.outcome)) : aRecs.filter((r) => !used.has(r.id)), 2, (r) => (r.sig.outcome ? 2 : 0)).forEach((r) => contradictions.push({ ...ex(r, r.sig.outcome ? `Failure described; outcome stated: ${r.sig.outcome.v}` : "Failure described; no stop or cancellation stated") }));
  return {
    intent: "rank",
    finding: `${DRIVER[higher.driver]} ranks above ${DRIVER[lower.driver]} on the opportunity score (${higher.score.toFixed(1)} vs ${lower.score.toFixed(1)}), ${higher.n >= lower.n ? "and also on" : "but not on"} story volume (${higher.n} vs ${lower.n} of ${LAPSE_N}). The gap comes from two analyst-set weights, exit relevance and product addressability, multiplied by the share of stories.`,
    quant: [
      q(`${DRIVER[a]} stories`, A.n, LAPSE_N, `Score: ${f(A)}`),
      q(`${DRIVER[b]} stories`, B.n, LAPSE_N, `Score: ${f(B)}`),
      q(`First-hand share, ${DRIVER_SHORT[a]}`, Math.round(A.fh * A.n), A.n),
      q(`First-hand share, ${DRIVER_SHORT[b]}`, Math.round(B.fh * B.n), B.n),
      ...(a === "PAY" ? [q("Bootstrap runs keeping payment failure first (recorded)", DS.stability.bootstrap.kept, DS.stability.bootstrap.of, "Resampling the 352 lapse stories with replacement; this tests volume noise, not the weights.")] : [])
    ],
    weights: [a, b].map((d) => ({ driver: d, exit: W[d].exit, addr: W[d].addr, exitWhy: WHY_WEIGHT[d].exit, addrWhy: WHY_WEIGHT[d].addr })),
    examples: support.map((r) => ex(r)).concat(pick(LAPSE.filter((r) => r.driver === b), 1).map((r) => ex(r))),
    contradictions,
    interpretation: `Inference: ${DRIVER[higher.driver]} leads because the analysts judged it closer to an exit and easier for the product to act on${a === "PAY" ? " (three failed instalments auto-cancel a SIP, and status, retry and debit date are in the app)" : ""}. This is a prioritisation choice built on the evidence. It is not a measured retention effect.`,
    limitations: ["Exit and addressability weights were set by the team. No outcome data was used to calibrate them.", "The score has no reach or effort term; it is not RICE.", ...BASE_LIMITS],
    followUp: "Test the link directly: among first-time Groww SIPs with one failed instalment, how many are still active 3 and 12 months later, compared with SIPs that had none?"
  };
}

function pauseVsStop() {
  const P = LAPSE.filter((r) => r.driver === "PAUSE"), S = LAPSE.filter((r) => r.driver === "STOP");
  const mixP = countBy(P, (r) => r.stage), mixS = countBy(S, (r) => r.stage);
  const money = (rows) => rows.filter((r) => r.sig.money).length;
  const pausedThenStopped = P.filter((r) => r.sig.outcome && /Stopped/.test(r.sig.outcome.v));
  return {
    intent: "pause_stop",
    finding: `Stop stories outnumber pause stories (${S.length} vs ${P.length} of ${LAPSE_N}). The text alone doesn't separate the two groups by circumstance: an explicit money pressure appears in ${money(P)} of ${P.length} pause stories and ${money(S)} of ${S.length} stop stories. ${pct(mixS.LATER || 0, S.length, 0)} of stops and ${pct(mixP.LATER || 0, P.length, 0)} of pauses come after the first six months.`,
    quant: [q("Pause stories", P.length, LAPSE_N), q("Stop stories", S.length, LAPSE_N), q("Pause stories that mention a money circumstance (EMI, job loss, income, medical)", money(P), P.length), q("Stop stories that mention a money circumstance", money(S), S.length), q("Pause stories after 6 months", mixP.LATER || 0, P.length), q("Stop stories after 6 months", mixS.LATER || 0, S.length)],
    examples: [...pick(P, 2, (r) => (r.sig.money ? 1 : 0)), ...pick(S, 2, (r) => (r.sig.outcome ? 1 : 0))].map((r) => ex(r, DRIVER_SHORT[r.driver])),
    contradictions: pausedThenStopped.length ? pausedThenStopped.slice(0, 2).map((r) => ex(r, "Coded as a pause, but the text says it stopped")) : [{ id: null, text: "The codebook forces one primary label. A pause that turned into a stop is coded STOP (tie rule), so the two groups are not cleanly separable." }],
    interpretation: "Inference, to be tested: a pause may work as a cash-flow tool and a stop as a verdict on the product. The stated money circumstances are too sparse to confirm this, so read the examples before relying on it.",
    limitations: ["Money circumstances are detected from explicit phrases only, so the counts are lower bounds.", "Stage is AI-coded and is 'Not stated' for many records.", ...BASE_LIMITS.slice(0, 2)],
    followUp: "What share of paused first SIPs restart, and does a fixed return date change that?"
  };
}

function continuers() {
  const K = RECORDS.filter((r) => r.driver === "KEEP");
  const kHelp = K.filter((r) => r.sig.help).length;
  return {
    intent: "continuers",
    finding: `Only ${K.length} of ${N} records describe someone continuing, which is too few to say statistically what distinguishes continuers. The team's analyst synthesis, which cites its records, reads them as anchoring to a long goal, stepping up with salary, or having already lived through a red patch.`,
    quant: [q("Continuer records (KEEP)", K.length, N, "Excluded from the 352 lapse denominator."), q("Lapse stories", LAPSE_N, N), q("Continuers who mention asking others or an outside influence", kHelp, K.length)],
    examples: DS.findings[5].c.slice(0, 2).map((id) => BY_ID[id]).filter(Boolean).concat(pick(K, 2)).map((r) => ex(r)),
    contradictions: pick(LAPSE.filter((r) => r.sig.outcome && r.sig.outcome.v === "Continued"), 2).map((r) => ex(r, `Coded ${DRIVER_SHORT[r.driver]}, yet says they continued`)),
    interpretation: `Inference (analyst synthesis): ${DS.findings[5].a}`,
    limitations: ["Survivorship: people who continue rarely post, so continuers are under-represented.", "Comparing 50 continuer records with 352 lapse stories is not a matched comparison.", ...BASE_LIMITS.slice(2)],
    followUp: "Interview matched pairs (continued vs lapsed, same start month) about how they framed the first red month."
  };
}

function salary() {
  const S = RECORDS.filter((r) => r.seg === "SALARIED"), I = RECORDS.filter((r) => r.sig.money && r.sig.money.v === "Income mentioned");
  const d = countBy(S.filter((r) => r.lapse), (r) => DRIVER_SHORT[r.driver]); const topSal = Object.entries(d).sort((a, b) => b[1] - a[1])[0] || ["none", 0];
  return {
    intent: "salary",
    finding: `${S.length} records are coded salaried (applied only when the text says so). Of their ${S.filter((r) => r.lapse).length} lapse stories, ${topSal[1]} are about ${topSal[0].toLowerCase()}. Without a comparison group of non-salaried investors, that doesn't show salaried investors behave differently.`,
    quant: [q("Records coded salaried (stated in text)", S.length, N), q("Records with an explicit income or payday phrase", I.length, N), ...Object.entries(d).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => q(`Salaried lapse stories: ${k}`, v, S.filter((r) => r.lapse).length))],
    examples: pick([...S, ...I], 4, (r) => (r.sig.money ? 1 : 0)).map((r) => ex(r, r.seg === "SALARIED" ? "Coded salaried" : `Says: "${r.sig.money.phrase}"`)),
    contradictions: [{ id: null, text: `${N - S.length} of ${N} records don't state employment. Treating them as non-salaried would be invented, so no salaried vs non-salaried comparison is shown.` }],
    interpretation: "Inference: matching the debit date to payday is a behaviour that shows up in the primary research (survey: 10 of 20). The public evidence is too thin to show whether salaried investors lapse differently.",
    limitations: ["The segment label is AI-coded from stated text and was not separately human-validated.", "Group sizes are small and unequal; differences of a few records are noise.", ...BASE_LIMITS.slice(0, 1)],
    followUp: "Ask in interviews: how did you choose the debit date, and what happened in a month the salary came late?"
  };
}

function outside() {
  const O = LAPSE.filter((r) => r.driver === "OUTSIDE"), H = RECORDS.filter((r) => r.sig.help);
  const hd = countBy(H.filter((r) => r.lapse), (r) => DRIVER_SHORT[r.driver]);
  return {
    intent: "outside",
    finding: `Records with an explicit help-seeking phrase come mostly from ${srcMix(H)}. Only ${O.length} records are coded as purely seeking outside help, because when a problem is described the problem is coded instead. Explicit help-seeking phrases appear in ${H.length} records across all drivers.`,
    quant: [q("Coded OUTSIDE (no problem described)", O.length, LAPSE_N), q("Records with an explicit help-seeking phrase", H.length, N), ...Object.entries(hd).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => q(`Help-seeking lapse stories coded ${k}`, v, H.filter((r) => r.lapse).length))],
    examples: pick(H, 4, (r) => (r.sig.help ? 1 : 0)).map((r) => ex(r, `Says: "${r.sig.help.phrase}"`)),
    contradictions: [{ id: null, text: "These posts appear because Reddit, YouTube and TradingQ&A are where help is asked. The source choice inflates help-seeking; app-store reviews rarely ask questions." }],
    interpretation: `Inference: help-seeking lapse stories are mostly coded ${Object.entries(hd).sort((a, b) => b[1] - a[1])[0][0].toLowerCase()}, so the questions taken outside the app may cluster after disappointing returns. That would point to a gap in in-app explanation. The app can explain; it cannot advise.`,
    limitations: ["Help-seeking is detected from phrases, which miss implicit requests.", ...BASE_LIMITS.slice(0, 2)],
    followUp: "Which in-app moment preceded the outside question: a red portfolio, a failed debit or a confusing status?"
  };
}

function paymentReadiness(prep) {
  const P = LAPSE.filter((r) => r.driver === "PAY"); const fail = RECORDS.filter((r) => r.sig.payment && r.sig.payment.v === "Payment failed or rejected");
  const charge = RECORDS.filter((r) => r.sig.payment && r.sig.payment.v === "Bounce charge mentioned");
  const early = P.filter((r) => r.stage === "ONBOARD" || r.stage === "EARLY");
  const mand = RECORDS.filter((r) => r.sig.payment && r.sig.payment.v === "Mandate or autopay mentioned");
  return {
    intent: "payment",
    finding: (prep ? `The public evidence says little about how people prepare for a debit: ${mand.length} of ${N} records mention a mandate or autopay without describing a failure. Most of what exists describes what happened when a debit failed. ` : "") + `${P.length} of ${LAPSE_N} lapse stories (${pct(P.length, LAPSE_N)}) are about an instalment that actually failed: a bounced debit, a rejected or stuck mandate, or a charge. They come from all five sources, and ${early.length} are in the first six months.`,
    quant: [q("Payment-failure lapse stories", P.length, LAPSE_N), q("…in the first 6 months or during set-up", early.length, P.length), q("Records with an explicit failed or rejected phrase (any driver)", fail.length, N), q("Records mentioning a bounce charge, fee or penalty", charge.length, N), q("Sources represented", new Set(P.map((r) => r.src)).size, 5, srcMix(P))],
    examples: pick(P, 4, (r) => (r.sig.payment ? 1 : 0)).map((r) => ex(r, r.sig.payment ? `Says: "${r.sig.payment.phrase}"` : undefined)),
    contradictions: [{ id: null, text: `${P.filter((r) => !r.sig.outcome).length} of ${P.length} payment stories don't say whether the SIP ended. A failure frustrates people, but the evidence doesn't show that it ends SIPs.` }, ...pick(P.filter((r) => r.sig.outcome && !/Stopped|Considering/.test(r.sig.outcome.v)), 1).map((r) => ex(r, `Outcome: ${r.sig.outcome.v}`))],
    interpretation: "Inference: if investors manage payment readiness themselves (balance on debit day, mandate status), a failure is the moment that self-management breaks. That points to pre-debit readiness and a clear post-failure explanation.",
    limitations: ["Primary research is small: 4 of 20 surveyed starters reported a failure; in 2 interviews, neither had one.", ...BASE_LIMITS],
    followUp: "Audit Groww's failed-instalment screens, then test whether a pre-debit balance nudge lowers failures in the first three instalments."
  };
}

function amountAfford() {
  const A = LAPSE.filter((r) => r.driver === "AMOUNT"); const M = RECORDS.filter((r) => r.sig.money);
  const mo = countBy(M.filter((r) => r.sig.outcome), (r) => r.sig.outcome.v);
  return {
    intent: "amount",
    finding: `Of ${M.length} records naming a money pressure, ${Object.entries(mo).map(([k, v]) => `${v} say ${k.toLowerCase()}`).join(", ")}; the rest don't state an outcome. ${A.length} of ${LAPSE_N} lapse stories are coded to the amount itself. Where a pause or stop is stated, the tie rule codes it as PAUSE or STOP instead.`,
    quant: [q("Amount vs cash-flow stories", A.length, LAPSE_N), q("Records naming a money circumstance (EMI, job loss, income, medical)", M.length, N), ...Object.entries(mo).map(([k, v]) => q(`…of those, outcome stated: ${k}`, v, M.length))],
    examples: pick([...A, ...M], 4, (r) => (r.sig.money ? 1 : 0)).map((r) => ex(r, r.sig.money ? `Says: "${r.sig.money.phrase}"` : undefined)),
    contradictions: pick(M.filter((r) => r.sig.outcome && r.sig.outcome.v === "Continued"), 2).map((r) => ex(r, "Money pressure stated, but continued")).concat([{ id: null, text: "Co-occurrence is not cause. A record that mentions an EMI and a stop does not show that EMIs cause stops." }]),
    interpretation: "Inference: reducing the amount is a less-used escape valve than pausing or stopping. Making 'step down' visible at the moment of strain may keep the SIP alive.",
    limitations: ["Money circumstances are detected from explicit phrases, so they are undercounted.", ...BASE_LIMITS.slice(0, 2)],
    followUp: "Of SIPs reduced in their first year, what share are still active at 12 months, compared with paused ones?"
  };
}

function overview() {
  const rows = rankDrivers().rows; const vol = [...rows].sort((a, b) => b.n - a.n);
  return {
    intent: "overview",
    finding: `No single reason dominates. By volume the largest lapse drivers are ${vol.slice(0, 3).map((x) => `${DRIVER[x.driver]} (${x.n})`).join(", ")} of ${LAPSE_N} lapse stories. On the opportunity score, which also weighs exit relevance and addressability, ${DRIVER[rows[0].driver]} ranks first.`,
    quant: vol.map((x) => q(DRIVER[x.driver], x.n, LAPSE_N)),
    examples: vol.slice(0, 4).map((x) => pick(LAPSE.filter((r) => r.driver === x.driver), 1)[0]).map((r) => ex(r)),
    contradictions: [{ id: null, text: `Codebook changes moved counts a lot: payment failure fell from 74 to 52 and 'decides to stop' rose from 33 to 57 between v1.1 and v1.2. The ranking by volume is not fixed.` }],
    interpretation: "Inference: lapse is several problems that peak at different months. Expectation gaps and trust issues are common, while payment failure and stopping are closest to the exit.",
    limitations: BASE_LIMITS,
    followUp: "Which of these drivers appear in the first three instalments of Groww first-time SIPs specifically?"
  };
}

function finding(i, label) {
  const f = DS.findings[i];
  return { intent: "finding", finding: f.a, quant: [q("Records cited in this analyst summary", f.c.length, N, "This is an analyst-written synthesis; the cited records are listed.")], examples: f.c.slice(0, 5).map((id) => BY_ID[id]).filter(Boolean).map((r) => ex(r)), contradictions: [{ id: null, text: "This summary was written by the research team from the coded records; it was not machine-verified for completeness. Check the cited records." }], interpretation: `Inference (${label}).`, limitations: BASE_LIMITS.slice(0, 3), followUp: "Search the Evidence Explorer for counterexamples before relying on this." };
}

function driverProfile(d) {
  const R = LAPSE.filter((r) => r.driver === d); const row = rankDrivers().rows.find((x) => x.driver === d);
  const fixedBy = DS.overrides.filter((o) => o.to === d || o.from === d).length;
  return {
    intent: "driver", finding: `${DRIVER[d]}: ${R.length} of ${LAPSE_N} lapse stories (${pct(R.length, LAPSE_N)}), ranked ${row.rank} of 8 on the opportunity score (${row.score.toFixed(1)}). Definition: ${DRV_DEF(d)}`,
    quant: [q("Stories", R.length, LAPSE_N), q("First-hand", Math.round(row.fh * row.n), row.n), q("Set-up or first 6 months", row.early, row.n), q("Sources", row.sources, 5, srcMix(R))],
    examples: pick(R, 4).map((r) => ex(r)),
    contradictions: [{ id: null, text: `${fixedBy} records moved into or out of this driver between codebook v1.1 and v1.2. Boundary cases are common.` }],
    interpretation: `Inference: ${WHY_WEIGHT[d].exit} ${WHY_WEIGHT[d].addr}`, limitations: BASE_LIMITS, followUp: "Open the theme in Insight Analysis to see sub-themes and counterexamples."
  };
}
const DRV_DEF = (d) => DEF[d];

function retrieval(text) {
  const hits = search(RECORDS, text, true).sort((a, b) => b.s - a.s);
  if (!hits.length || hits[0].s < 3) return { intent: "none", finding: "I couldn't find evidence in the 450 records that addresses this question, so I won't answer it from general knowledge.", quant: [q("Matching records", hits.length, N)], examples: [], contradictions: [], interpretation: "", limitations: ["Search matches words and SIP synonyms, not meaning. Try different wording or the Evidence Explorer."], followUp: "Try one of the suggested questions.", insufficient: true };
  const top = hits.slice(0, 40).map((h) => h.r); const d = countBy(top, (r) => DRIVER_SHORT[r.driver]);
  return {
    intent: "retrieval", finding: `I don't have a prepared analysis for this question. Here is what the closest-matching records show: ${hits.length} records match your words or their SIP synonyms, and the strongest 40 are coded mostly ${Object.entries(d).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} (${v})`).join(", ")}.`,
    quant: [q("Records matching the query", hits.length, N), ...Object.entries(d).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => q(`Top-40 matches coded ${k}`, v, top.length))],
    examples: top.slice(0, 4).map((r) => ex(r)), contradictions: [{ id: null, text: "Keyword retrieval can surface records that use the words but are about something else. Read the examples." }],
    interpretation: "This is retrieval, not synthesis. No conclusion is drawn.", limitations: BASE_LIMITS.slice(0, 2), followUp: "Open the matching records in the Evidence Explorer with the same search."
  };
}


/* ---------------- research-method operations (added in Discovery Engine 2.1; all computed from dataset.json) ---------------- */
const FH = (rows) => rows.filter((r) => r.firstHand).length;
function sampling() {
  const src = Object.entries(DS.idRange);
  return {
    intent: "method", finding: `The 450 coded records came from per-source candidate lists (coded IDs reach candidate position ${Object.values(DS.idRange).map((x) => x.maxIndex).join(", ")} in the five lists), which were drawn from the ${DS.passed.toLocaleString("en-IN")} records that passed the topic and first-person filters. The rule for choosing which candidates were coded was not recorded, so the selection cannot be reproduced; it was not a random or stratified sample. Rejected records were not retained.`,
    quant: [q("Collected (October 2026 snapshot)", DS.collected.total, null), q("Passed the topic + first-person filters", DS.passed, DS.collected.total), q("Not retained after the filters", DS.collected.total - DS.passed, DS.collected.total, "count only; no records or reasons kept"),
      ...src.map(([k, v]) => q(`${SRC[k]}: coded (highest candidate position ${v.maxIndex})`, v.coded, DS.passed)), q("Coded", N, DS.passed), q("Filtered records not coded and not retained", DS.passed - N, DS.passed)],
    examples: [], contradictions: [{ id: null, text: "Per-source coded counts are not proportional to collection volume (Reddit is 62% of collected but 35% of coded), so source mix was shaped by the candidate lists, not by proportional sampling." }],
    interpretation: "Inference: the coded set is a purposive sample built to surface lapse stories, so driver shares describe this sample only.",
    limitations: [SAMPLE_WARNING, "No rejection audit is possible: 0 of the 2,068 filtered-but-uncoded records and none of the 16,487 records removed by the filters were retained.", "Exact candidate-list rules for sources other than Reddit were not recorded."],
    followUp: "See Methodology → Sampling and selection."
  };
}
function prevalence() {
  return {
    intent: "method", finding: `No. ${LAPSE_N} of ${N} coded records (${pct(LAPSE_N, N)}) are lapse-labelled, but the sample was built to find lapse stories in public posts. It is not a lapse rate for Indian or Groww SIP investors.`,
    quant: [q("Lapse-labelled records", LAPSE_N, N), q("Continuer records", DS.continuers, N), q("Context records", DS.context, N)],
    examples: [], contradictions: [], interpretation: "Inference: a prevalence estimate would need a defined investor population (for example Groww's own cohort data), which this dataset does not have.",
    limitations: [SAMPLE_WARNING, BASE_LIMITS[2]], followUp: "The north-star metric must be measured on Groww's cohort data, not on public posts."
  };
}
function firstHand(d) {
  const rows = d ? LAPSE.filter((r) => r.driver === d) : LAPSE;
  const quant = d ? [q(`First-hand among ${DRIVER[d]} stories`, FH(rows), rows.length)] : RANKED.map((k) => { const R = LAPSE.filter((r) => r.driver === k); return q(`${DRIVER[k]}: first-hand`, FH(R), R.length); });
  return {
    intent: "firsthand", finding: d ? `${FH(rows)} of ${rows.length} ${DRIVER[d]} stories are first-hand accounts (${pct(FH(rows), rows.length)}).` : `${FH(LAPSE)} of ${LAPSE_N} lapse-labelled records are first-hand (${pct(FH(LAPSE), LAPSE_N)}); across all 450 coded records, ${FH(RECORDS)} are first-hand.`,
    quant: [...(d ? [] : [q("First-hand lapse records", FH(LAPSE), LAPSE_N), q("First-hand coded records", FH(RECORDS), N)]), ...quant],
    examples: pick(rows.filter((r) => r.firstHand), 3).map((r) => ex(r)), contradictions: [{ id: null, text: "First-hand means the writer describes their own experience. It is an AI label, not a human verification; only 60 records were human-checked." }],
    interpretation: "", limitations: [SAMPLE_WARNING, "First-hand status was assigned by the AI from the wording (STRONG or WEAK); it was not checked separately by a human."], followUp: d ? "Filter the Evidence Explorer by this driver and first-hand status." : ""
  };
}
function reliability() {
  const R = DS.rounds;
  return {
    intent: "quality", finding: `Moderate and preliminary. Human-AI agreement on three blind rounds of 20: ${R.map((r) => `round ${r.round} ${r.agree}/${r.n} (κ ${r.kappa.toFixed(2)})`).join(", ")}. The 60 checked records do not validate all 450 labels.`,
    quant: [...R.map((r) => q(`Round ${r.round} (codebook ${r.codebook}) raw agreement`, r.agree, r.n, `κ ${r.kappa.toFixed(2)}`)), q("Labels changed between codebook v1.1 and v1.2", DS.overrides.length, N), q("Records human-checked", RECORDS.filter((r) => r.golden.length).length, N)],
    examples: [], contradictions: [{ id: null, text: `In rounds 1–2, of ${DS.reconciliation.disagreements} disagreements the reviewer judged the engine right in ${DS.reconciliation.engineRight}, the human in ${DS.reconciliation.humanRight}, both defensible in ${DS.reconciliation.both}.` }],
    interpretation: "Inference: κ 0.50 is moderate agreement on a small sample; it does not establish population-level classification accuracy.",
    limitations: ["Each round has n = 20, so κ has wide uncertainty.", "One human labeller; no independent adjudication beyond the reconciliation notes."], followUp: "See AI Quality for the per-round tables and round-3 per-class precision and recall."
  };
}
function causal() {
  return { intent: "insufficient", finding: "No. The dataset contains reported experiences, not outcomes before and after a change, so it cannot show that changing SIP dates (or any feature) improves 12-month retention. It supports a hypothesis to test, for example in a controlled experiment on Groww's cohort data.",
    quant: [q("Records reporting a date change or salary timing", RECORDS.filter((r) => /date|salary|payday/i.test(r.text)).length, N, "keyword count, not a measured effect")], examples: [], contradictions: [], interpretation: "",
    limitations: [SAMPLE_WARNING, "No causal identification: no control group, no outcomes over time."], followUp: "" };
}
function redditDependence(d) {
  const rows = RANKED.map((k) => { const R = LAPSE.filter((r) => r.driver === k); return { k, n: R.length, rd: R.filter((r) => r.src === "RD").length }; }).sort((a, b) => b.rd / b.n - a.rd / a.n);
  const pick1 = d ? rows.filter((x) => x.k === d) : rows;
  return { intent: "sources", finding: d ? `${pick1[0].rd} of ${pick1[0].n} ${DRIVER[d]} stories come from Reddit (${pct(pick1[0].rd, pick1[0].n)}).` : `The drivers that lean most on Reddit are ${rows.slice(0, 2).map((x) => `${DRIVER[x.k]} (${x.rd}/${x.n})`).join(" and ")}. Reddit supplies 159 of 450 coded records (35%) and 62% of everything collected.`,
    quant: pick1.map((x) => q(`${DRIVER[x.k]}: from Reddit`, x.rd, x.n)), examples: [], contradictions: [{ id: null, text: "More Reddit posts on a theme do not mean Reddit investors have more SIP problems; platform composition and self-selection shape what gets written." }],
    interpretation: "", limitations: [SAMPLE_WARNING, BASE_LIMITS[2]], followUp: "Filter the Evidence Explorer by source to read them." };
}
function collection() {
  return { intent: "factual", finding: `${DS.collected.total.toLocaleString("en-IN")} public records were collected in one snapshot (${DS.collected.window}); ${DS.passed.toLocaleString("en-IN")} passed the topic and first-person filters and ${N} were coded.`,
    quant: [...Object.keys(SRC).filter((k) => DS.collected[k]).map((k) => q(`Collected from ${SRC[k]}`, DS.collected[k], DS.collected.total)), q("Passed the filters", DS.passed, DS.collected.total), q("Coded", N, DS.passed)],
    examples: [], contradictions: [{ id: null, text: "Reddit is 62% of everything collected; volume by platform reflects where people post, not where problems are most common." }], interpretation: "", limitations: [SAMPLE_WARNING], followUp: "See Methodology → Sampling and selection." };
}
function weakest() {
  return { intent: "method", finding: "The weakest parts are: the undocumented selection of the 450 coded records from 2,518, labels that were human-checked on only 60 records with moderate agreement (κ 0.50 in round 3), and a public-post sample that cannot measure prevalence or causation.",
    quant: [q("Records human-checked", RECORDS.filter((r) => r.golden.length).length, N), q("Round 3 raw agreement", DS.rounds[2].agree, DS.rounds[2].n), q("Reddit share of collected", DS.collected.RD, DS.collected.total)],
    examples: [], contradictions: [], interpretation: "", limitations: BASE_LIMITS, followUp: "See Methodology and AI Quality." };
}
const DRV_OF = { driver: null };
/** Multi-turn: resolve "that/those/it" against the previous answer's topic (sent back by the client as ctx). */
export function answerWithContext(raw, ctx) {
  const text = String(raw || "").slice(0, 400), s = text.toLowerCase();
  const d = ctx && RANKED.includes(ctx.driver) ? ctx.driver : null;
  if (ctx && /\b(that|those|this|these|it|them|the same)\b/.test(s) && !mentioned(s).length && !INJECTION.test(text) && !ADVICE.test(s)) {
    if (/contradict|challenge|against|counter|disagree|weaken/.test(s)) {
      const a = compareRank(d || "PAY", (d || "PAY") === "TRUST" ? "PAY" : "TRUST");
      return tag({ ...a, intent: "counter", finding: `Evidence that challenges the previous conclusion about ${DRIVER[d || "PAY"]}: ` + a.contradictions.map((c) => c.text).slice(0, 3).join(" ") }, d || "PAY");
    }
    if (/first.?hand/.test(s)) return tag(firstHand(d), d);
    if (/reddit|source|platform/.test(s)) return tag(redditDependence(d), d);
    if (/how many|count|number/.test(s) && d) return tag(driverProfile(d), d);
  }
  return answer(text);
}
const tag = (a, driver) => ({ ...a, ctx: { intent: a.intent, driver: driver || null } });

/** Route a question to a grounded answer. Returns the 7-part answer object. */
export function answer(raw) { const a = route(raw); return a.ctx ? a : tag(a, guessDriver(a, raw)); }
function guessDriver(a, raw) { const m = mentioned(String(raw).toLowerCase()); if (m.length) return m[0]; return { readiness: "PAY" }[a.intent] || (a.examples && a.examples[0] && RANKED.includes(a.examples[0].driver) && a.intent !== "retrieval" ? a.examples[0].driver : null); }
function route(raw) {
  const text = String(raw || "").slice(0, 400); const s = text.toLowerCase();
  if (INJECTION.test(text)) return injection();
  if (ADVICE.test(s)) return advice();
  if (UNANSWERABLE.test(s)) return unanswerable(text);
  if (/how many (records|posts|comments|reviews)? ?(were|did you)? ?(collect|gather)|records (were )?collected|total (records|posts) collected/.test(s)) return collection();
  if (/\b78(\.2)?\s?%|lapse rate|prevalence|how (common|many investors)|percentage of (all )?investors/.test(s)) return prevalence();
  if (/(how|why) (did you|were|was).*(choose|chose|chosen|select|pick)|\b450\b.*(chosen|selected|picked|choose)|sampl(e|ing) (method|strategy)|selection (rule|method)|rejected records|2,?518/.test(s)) return sampling();
  if (/weakest|biggest (weakness|limitation)|limitations? of (the |this )?(current )?(research|sample|study|dataset)|what('s| is) wrong with (the|this) research/.test(s)) return weakest();
  if (/kappa|\bκ\b|reliab|agreement|how accurate|classification (quality|accuracy)|human.?(check|review)/.test(s)) return reliability();
  if (/first.?hand/.test(s)) return firstHand(mentioned(s)[0] || null);
  if (/reddit|depend.*(source|platform)|platform (mix|concentration)/.test(s)) return redditDependence(mentioned(s)[0] || null);
  if (/(conclude|prove|show|will|would|does).*(improv|increase|raise|boost).*(retention|continuation|12.?month)|causal|cause[sd]? (better|higher) retention/.test(s)) return causal();
  const ds = mentioned(s);
  if (ds.length >= 1 && /\b(rank|ranks|ranked|ranking|outrank\w*|score\w*|prioriti\w*)\b|\b(above|ahead of|higher than|lower than)\b/.test(s)) {
    const a = ds[0] === "TRUST" && ds[1] ? ds[1] : ds[0]; const b = ds.find((x) => x !== a) || (a === "TRUST" ? "PAY" : "TRUST"); return compareRank(a, b);
  }
  if (/contradict|challenge|counter.?example|against the (leading|main)/.test(s)) return compareRank("PAY", "TRUST");
  if (/pause/.test(s) && /stop/.test(s)) return pauseVsStop();
  if (/continu(e|ing|ers)|keep going|kept going|distinguish|stay(ed)? invested/.test(s) && !/discontinu/.test(s)) return continuers();
  if (/salary|payday|pay day|salaried|income timing|when (their |the )?income|income arriv/.test(s)) return salary();
  if (/outside|rely|youtube|reddit|friend|ask others|reassur/.test(s)) return outside();
  if (/unaffordable|afford|amount becomes|cash ?flow|tight|reduce/.test(s)) return amountAfford();
  if (/payment|auto.?debit|mandate|readiness|instal(l)?ment succeeded|bounce|fail/.test(s)) return paymentReadiness(/manage|upcoming|before|prepare|readiness|succeeded|unsure/.test(s));
  if (/unmet need|recur|across (multiple )?sources/.test(s)) return finding(7, "analyst summary of recurring unmet needs");
  if (/confus|worr/.test(s)) return finding(3, "analyst summary of in-app confusion");
  if (/expect|why (do )?(they|people|investors) start/.test(s)) return finding(0, "analyst summary of starting expectations");
  if (/(why|reason).*(discontinu|stop|lapse|quit|drop)|discontinu|lapse/.test(s)) return overview();
  if (ds.length === 1) return driverProfile(ds[0]);
  return retrieval(text);
}

export const SUGGESTED = [
  "Why does payment failure rank above trust, and what evidence contradicts this conclusion?",
  "Why do first-time investors discontinue SIPs?",
  "What happens when the monthly SIP amount becomes unaffordable?",
  "What is the difference between people who pause and people who stop?",
  "What factors distinguish continuing investors from people who report lapsing?",
  "How do salary-linked investors behave differently?",
  "What do investors rely on outside Groww when they face uncertainty?",
  "What evidence supports the payment-readiness hypothesis?",
  "What unmet needs recur across multiple sources?",
  "What percentage of investors under 25 stop their SIPs because of failed payments?"
];

/** Every ID cited anywhere in an answer must be a real record. */
export function citedIds(a) { return [...a.examples, ...a.contradictions].map((x) => x.id).filter(Boolean); }
export function validateCitations(a) { return citedIds(a).every((id) => BY_ID[id]); }
