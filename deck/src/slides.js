
/* ================================================================
   FINAL DECK (5 Nov 2026). 10 slides. Every text run >= 14 pt.
   ================================================================ */
pres.title = "NL_Groww: Keeping a first SIP workable";
Object.assign(URL, {
  quality: "https://nl-groww-engine.vercel.app/quality",
  method: "https://nl-groww-engine.vercel.app/methodology",
  sampling: "https://nl-groww-engine.vercel.app/methodology#sampling",
  evidence: "https://nl-groww-engine.vercel.app/evidence",
  opps: "https://nl-groww-engine.vercel.app/opportunities",
  survey: "https://docs.google.com/forms/d/e/1FAIpQLSf-7DdtjlR-CgwY25IhYJvaKW8u59FDnn3X0kEM3BCWENPu8Q/viewform",
  amfi: "https://taurusmutualfund.com/sites/default/files/downloads/FAQs_on_Uniform_SIP_cancellation.pdf",
  groCancel: "https://groww.in/help/mutual-funds/mf-sip/how-to-cancel-my-sip"
});
Object.assign(TAGS, {
  reported: { fill: K.coralT, color: K.coral, line: K.coral, t: "Reported" },
  unverified: { fill: K.white, color: K.amber, line: K.amber, dash: "dash", t: "Unverified" },
  none: { fill: K.white, color: K.mute, line: K.rule, t: "No" },
  live: { fill: K.pur, color: K.white, line: K.pur, t: "Live AI" },
  rule: { fill: K.tealT, color: K.teal, line: K.teal, t: "Rule-based" },
  mock: { fill: K.white, color: K.mute, line: K.mute, dash: "dash", t: "Mocked" }
});
const P2 = "F6F1E6";
const img = (s, f, o) => s.addImage(Object.assign({ path: path.join(IMG, f) }, o));
function num(s, t, x, y, c) { s.addText(t, { shape: pres.shapes.OVAL, x, y, w: 0.3, h: 0.3, fill: { color: c || K.pur }, line: { type: "none" }, fontSize: 14, bold: true, color: K.white, align: "center", valign: "middle", margin: 0, fontFace: "Calibri" }); }
function bars(s, rows, o) { // rows: [label, value, displayText, color]
  const max = o.max || Math.max(...rows.map((r) => r[1]));
  rows.forEach(([l, v, txt, c], i) => {
    const y = o.y + i * o.rh;
    T(s, l, { x: o.x, y, w: o.lw, h: o.rh, fontSize: 14, valign: "middle", color: o.lc ? o.lc(i) : K.ink, bold: !!(o.bold && o.bold(i)) });
    const w = Math.max(0.03, o.bw * v / max);
    box(s, { x: o.x + o.lw + 0.05, y: y + o.rh * 0.2, w, h: o.rh * 0.6, fill: c, r: 0, name: "bar-" + i });
    T(s, txt, { x: o.x + o.lw + 0.1 + w, y, w: o.tw || 1.4, h: o.rh, fontSize: 14, valign: "middle", color: K.ink, bold: !!(o.bold && o.bold(i)) });
  });
}
function cell(s, text, o) { T(s, text, Object.assign({ fontSize: 14, valign: "middle", lineSpacingMultiple: 0.92 }, o)); }

/* ===================================================== 1 PROBLEM AND NORTH STAR */
pres.addSection({ title: "Problem and metric" });
{
  const s = pres.addSlide({ masterName: "COVER2" });
  mark(s, 0.5, 0.42, 0.46, true);
  T(s, "GROWTH TEAM · SIP CONTINUATION CASE STUDY", { x: 2.25, y: 0.5, w: 5.6, h: 0.3, fontSize: 14, bold: true, color: K.pur, charSpacing: 1.5 });
  H(s, "Keeping a first SIP workable when cash flow changes", { x: 0.5, y: 1.08, w: 7.5, h: 1.5, fontSize: 40, lineSpacingMultiple: 0.9, color: K.ink, objectName: "cover-title" });
  T(s, [b("Problem hypothesis. ", { color: K.ink }), n("First-time investors often start with good intent, but when the debit date and the money available stop lining up, and the way back after an interruption is unclear, a first SIP can lapse without a real decision to stop.")], { x: 0.5, y: 2.66, w: 7.45, h: 1.0, fontSize: 16, color: K.mute, lineSpacingMultiple: 0.95 });
  tag(s, 0.5, 3.68, "hypothesis", "Research-backed hypothesis · not a universal explanation");

  box(s, { x: 8.25, y: 0.42, w: 4.58, h: 3.55, fill: K.ink, r: 0.14, name: "northstar" });
  T(s, "NORTH STAR · BUSINESS OBJECTIVE", { x: 8.5, y: 0.58, w: 4.1, h: 0.28, fontSize: 14, bold: true, color: K.lilac, charSpacing: 1.2 });
  H(s, "Month-12 first-SIP continuation", { x: 8.5, y: 0.9, w: 4.1, h: 0.36, fontSize: 17, color: K.white });
  T(s, "Eligible cohort investors with ≥ 1 successful SIP instalment in the 30 days ending at month 12", { x: 8.5, y: 1.32, w: 3.4, h: 0.76, fontSize: 14, color: K.white });
  line(s, 8.5, 2.14, 11.85, 2.14, { color: K.lilac, w: 1.75 });
  T(s, "All eligible first-time MF investors who started their first SIP in that cohort", { x: 8.5, y: 2.22, w: 3.4, h: 0.52, fontSize: 14, color: "D9DCE6" });
  H(s, "× 100", { x: 11.95, y: 1.95, w: 0.8, h: 0.38, fontSize: 17, color: K.lilac });
  T(s, [b("Active SIP ", { color: K.lilac }), n("= at least one successful instalment in the preceding 30 days.", { breakLine: true }), b("Goal ", { color: K.lilac }), n("raise this share for first-time investors.")], { x: 8.5, y: 2.86, w: 4.15, h: 0.98, fontSize: 14, color: "D9DCE6" });

  const IW = 7.45, IH = IW * 328 / 1376, IX = 0.45, IY = 4.12;
  img(s, "s1_bridge.png", { x: IX, y: IY, w: IW, h: IH, altText: "Illustration: a road across a bridge through the stages of a first SIP year" });
  T(s, "Start", { x: IX, y: IY + IH * 0.49, w: 0.7, h: 0.3, fontSize: 14, bold: true, color: K.soft });
  T(s, "Month 12", { x: IX + IW - 1.2, y: IY + IH * 0.25, w: 1.2, h: 0.3, fontSize: 14, bold: true, color: K.pur, align: "right" });
  const P = [[0.134, "1", "Choose", K.teal], [0.318, "2", "Prepare", K.teal], [0.5, "3", "Outcome", K.coral], [0.682, "4", "Adjust", K.amber], [0.866, "5", "Month 12", K.pur]];
  P.forEach(([f, nn, lbl, c]) => {
    const cx = IX + IW * f, y = IY + IH + 0.06, w = 0.42 + lbl.length * 0.095;
    num(s, nn, cx - w / 2, y, c);
    T(s, lbl, { x: cx - w / 2 + 0.38, y, w: w, h: 0.3, fontSize: 14, bold: true, color: c, valign: "middle" });
  });
  T(s, "The first-SIP year: the investor chooses a debit date, prepares for each debit, the instalment succeeds or doesn't, and then they adjust, recover or stop (slide 2).", { x: 0.5, y: 6.32, w: 7.4, h: 0.62, fontSize: 14, color: K.mute, lineSpacingMultiple: 0.92 });
  // executive summary
  box(s, { x: 8.25, y: 4.12, w: 4.58, h: 2.86, fill: K.white, line: K.rule, r: 0.1, name: "summary" });
  const SUM = [
    ["Investigated ", "19,005 public records (450 coded), 5 interviews, a 20-person survey."],
    ["Decided ", "the problem is broader than failed payments: cash-flow fit and clarity of options."],
    ["Built ", "a contextual SIP Companion on illustrative data; actions are simulated."],
    ["Not yet proven ", "usefulness (one participant's feedback) and any effect on month-12 continuation."]
  ];
  T(s, "THE CASE IN ONE READ", { x: 8.45, y: 4.2, w: 4.2, h: 0.28, fontSize: 14, bold: true, color: K.pur, charSpacing: 1 });
  T(s, SUM.flatMap(([a, c], i) => [b(a, { color: i === 3 ? K.coral : K.ink }), n(c, { color: K.ink, breakLine: i < 3 })]), { x: 8.45, y: 4.5, w: 4.25, h: 2.42, fontSize: 14, lineSpacingMultiple: 0.92, paraSpaceAfter: 4 });
  T(s, [n("Optional: SIP Companion ", { color: K.soft }), link("nl-groww-sip.vercel.app/companion", URL.proto), n("  ·  Discovery Engine ", { color: K.soft }), link("nl-groww-engine.vercel.app", URL.engine), n("  ·  not affiliated with Groww", { color: K.soft })], { x: 0.5, y: 7.08, w: 12.3, h: 0.3, fontSize: 14 });
  s.addNotes("North Star as given by the assignment: % of first-time MF investors with an active SIP 12 months after their first SIP; active = at least one successful instalment in the preceding 30 days. Formula shown exactly as specified in the final brief. The problem statement is the research-backed hypothesis from slide 7, explicitly not a universal explanation of discontinuation. The five numbered points are the lifecycle used on slide 2. The bridge is a generated illustration with no text; all labels are native text.");
}

/* ===================================================== 2 METRIC DECOMPOSITION AND JOURNEY */
{
  const s = pres.addSlide({ masterName: "CONTENT2" });
  header(s, "02 · BUSINESS METRIC DECOMPOSITION", "Four moments in year one decide month-12 continuation");
  const X0 = 0.5, CW = 2.44, G = 0.1, Y0 = 1.42;
  const C = [
    { n: "1", t: "Start and choose", c: K.teal, icon: "s2_m1.png", iw: 280, ih: 180,
      what: "Picks amount and debit date; sets up the autopay mandate.",
      ind: "Mandate live before debit 1 (% of new first SIPs)",
      ev: [["Survey: ", "10 of 20 starters matched the date to payday"]] },
    { n: "2", t: "Prepare for the debit", c: K.teal, icon: "s2_m4.png", iw: 200, ih: 180,
      what: "Money has to be in the account on the debit day.",
      ind: "Upcoming-debit details viewed ÷ scheduled debits",
      ev: [["Interviews: ", "4 of 5 timed the debit to income or checked balance"]] },
    { n: "3", t: "Instalment outcome", c: K.coral, icon: "s2_m3.png", iw: 240, ih: 180,
      what: "Succeeds, fails as an auto-debit, or is missed on purpose. Counted separately.",
      ind: "First-try success, instalments 1–3; failures and skips split",
      ev: [["Public: ", "52 of 352 lapse stories"], ["Survey: ", "4 of 20 had a failure"], ["Interviews: ", "2 of 5 failure; 1 skipped"]] },
    { n: "4", t: "Recover, adjust or stop", c: K.amber, icon: "s2_m2.png", iw: 182, ih: 180,
      what: "Pay the missed one, skip, lower, move the date, pause or stop. Stopping is not redeeming units.",
      ind: "Failed instalment resolved before the next debit; skip → resumed within 60 days",
      ev: [["Survey: ", "9 of 20 skipped or paused on purpose; 8 restarted"], ["Survey: ", "of the 4 failures, 3 waited, 1 paused, 0 paid"]] }
  ];
  const LBL = 0.0;
  C.forEach((c, i) => {
    const x = X0 + i * (CW + G);
    box(s, { x, y: Y0, w: CW, h: 4.96, fill: K.white, line: K.rule, r: 0.08, name: "stage-" + c.n });
    box(s, { x, y: Y0, w: CW, h: 0.07, fill: c.c, r: 0 });
    const ih = 0.72, iw = ih * c.iw / c.ih;
    img(s, c.icon, { x: x + CW - iw - 0.12, y: Y0 + 0.16, w: iw, h: ih, altText: "Icon: " + c.t });
    num(s, c.n, x + 0.12, Y0 + 0.2, c.c);
    H(s, c.t, { x: x + 0.12, y: Y0 + 0.56, w: CW - iw - 0.3, h: 0.5, fontSize: 15, color: c.c, lineSpacingMultiple: 0.9 });
    T(s, c.what, { x: x + 0.12, y: Y0 + 1.04, w: CW - 0.24, h: 0.98, fontSize: 14, color: K.ink, lineSpacingMultiple: 0.92 });
    T(s, "LEADING INDICATOR", { x: x + 0.12, y: Y0 + 2.06, w: CW - 0.24, h: 0.26, fontSize: 14, bold: true, color: K.soft, charSpacing: 0.5 });
    T(s, c.ind, { x: x + 0.12, y: Y0 + 2.32, w: CW - 0.24, h: 0.98, fontSize: 14, color: c.c, bold: true, lineSpacingMultiple: 0.92 });
    T(s, "EVIDENCE (denominator)", { x: x + 0.12, y: Y0 + 3.3, w: CW - 0.24, h: 0.26, fontSize: 14, bold: true, color: K.soft, charSpacing: 0.5 });
    T(s, c.ev.flatMap(([k, v], j) => [b(k + " ", { color: K.ink }), n(v, { color: K.mute, breakLine: j < c.ev.length - 1 })]), { x: x + 0.12, y: Y0 + 3.56, w: CW - 0.24, h: 1.38, fontSize: 14, lineSpacingMultiple: 0.92 });
  });
  // North star column
  const nx = X0 + 4 * (CW + G), nw = 13.333 - 0.5 - nx;
  box(s, { x: nx, y: Y0, w: nw, h: 4.96, fill: K.ink, r: 0.1, name: "ns" });
  num(s, "5", nx + 0.14, Y0 + 0.2, K.pur);
  T(s, "NORTH STAR", { x: nx + 0.52, y: Y0 + 0.2, w: nw - 0.6, h: 0.3, fontSize: 14, bold: true, color: K.lilac });
  H(s, "Active at month 12", { x: nx + 0.14, y: Y0 + 0.58, w: nw - 0.28, h: 0.62, fontSize: 16, color: K.white, lineSpacingMultiple: 0.9 });
  T(s, [n("Cohort investors with ≥ 1 successful instalment in the 30 days ending at month 12 ÷ all eligible first-time starters in the cohort × 100", { color: "D9DCE6" })], { x: nx + 0.14, y: Y0 + 1.24, w: nw - 0.28, h: 1.48, fontSize: 14, lineSpacingMultiple: 0.92 });
  line(s, nx + 0.14, Y0 + 2.75, nx + nw - 0.14, Y0 + 2.75, { color: "4A5168", w: 1 });
  T(s, [b("Points 1–4 are diagnostics, ", { color: K.lilac }), n("not the North Star. They are proposed Groww metrics: none has been measured in this study.", { color: "D9DCE6" })], { x: nx + 0.14, y: Y0 + 2.86, w: nw - 0.28, h: 1.3, fontSize: 14, lineSpacingMultiple: 0.95 });
  T(s, [b("Guardrails: ", { color: K.lilac }), n("pressure complaints, pay-after-stop", { color: "D9DCE6" })], { x: nx + 0.14, y: Y0 + 4.2, w: nw - 0.28, h: 0.72, fontSize: 14, lineSpacingMultiple: 0.95 });

  strip(s, 6.46, 0.54, "Kept apart", [b("A missed instalment is not churn, and stopping is not redeeming units. "), n("Failed debit, intentional miss, skip, pause and stop are tracked separately.")], { lw: 1.3 });
  footer(s, [n("Evidence is measured; indicators are proposed. Public = 352 lapse-labelled coded posts · survey = 20 starters (convenience) · 5 interviews")]);
  s.addNotes("Decomposition: North Star (month-12 active) depends on (1) set-up and date choice, (2) readiness for each debit, (3) the outcome of each instalment (success / failed auto-debit / intentional miss), (4) what happens after an interruption (recover, adjust, skip, pause, stop). Leading indicators are proposed Groww metrics: none is measured here. Evidence: survey Google Form responses (22 responses, 20 had started a SIP): 10/20 'Matched it to my payday'; 4/20 failed instalment, of whom 3 waited for next month, 1 paused, 0 paid; 9/20 skipped or paused on purpose, 8 restarted. Interviews (Interview Kit workbook): P01 balance checks, P02 debit on the 1st after salary, P03 invested after tuition income, P04 date by salary with buffer. Public: 52 of 352 lapse-labelled records coded Payment failure (Discovery Engine dataset, codebook v1.2). Guardrail metrics are detailed on slide 10.");
}

/* ===================================================== 3 DISCOVERY ENGINE */
pres.addSection({ title: "Discovery" });
{
  const s = pres.addSlide({ masterName: "CONTENT2" });
  header(s, "03 · AI DISCOVERY ENGINE AND METHOD", "From 19,005 public records to 450 coded SIP experiences");
  const IW = 7.3, IH = IW * 344 / 1300, IX = 0.5, IY = 1.34;
  img(s, "s3_refinery.png", { x: IX, y: IY, w: IW, h: IH, altText: "Illustration: five-station pipeline from collection to human check" });
  const ST = [["Collect", "19,005", "5 platforms"], ["Filter", "2,518", "2 keyword gates"], ["AI code", "450", "codebook v1.2"], ["Score", "8", "drivers ranked"], ["Human check", "60", "3 rounds of 20"]];
  const sw = IW / 5;
  ST.forEach(([a, v, sub], i) => {
    const x = IX + i * sw;
    T(s, [b(v + " ", { color: K.ink, fontSize: 18 }), b(a, { color: K.pur, breakLine: true }), n(sub, { color: K.mute })], { x, y: IY + IH + 0.02, w: sw - 0.02, h: 0.62, fontSize: 14, align: "center", lineSpacingMultiple: 0.9 });
  });
  // composition of the 450
  const cy = IY + IH + 0.7;
  T(s, [b("The 450: ", { color: K.ink }), n("352 lapse · 50 continuer · 48 context. "), b("409 ", { color: K.ink }), n("labelled first-hand by the AI, not checked by a human. "), b("390 ", { color: K.ink }), n("labels are AI-only.")], { x: 0.5, y: cy, w: 7.6, h: 0.52, fontSize: 14, lineSpacingMultiple: 0.9 });

  // sources chart
  const by = cy + 0.62;
  H(s, "Collected by platform (n = 19,005)", { x: 0.5, y: by, w: 3.8, h: 0.28, fontSize: 14 });
  bars(s, [["Reddit", 11802, "11,802", K.coral], ["TradingQ&A", 3445, "3,445", K.lilac], ["YouTube", 1610, "1,610", K.lilac], ["Google Play", 1160, "1,160", K.lilac], ["App Store", 988, "988", K.lilac]], { x: 0.5, y: by + 0.32, rh: 0.3, lw: 1.2, bw: 1.8, tw: 0.8 });
  T(s, [b("62%", { color: K.coral, fontSize: 20, breakLine: true }), n("Reddit; 159 of the 450 coded", { color: K.mute })], { x: 3.0, y: by + 0.95, w: 1.3, h: 0.9, fontSize: 14, align: "center", lineSpacingMultiple: 0.9 });

  // agreement table
  const ax = 4.45, aw = 3.65;
  H(s, "Human vs AI label agreement", { x: ax, y: by, w: aw, h: 0.28, fontSize: 14 });
  const AR = [["Round", "Codebook", "Agree", "κ"], ["1", "v1.0", "4/20", "0.15"], ["2", "v1.1", "7/20", "0.29"], ["3", "v1.2", "11/20", "0.50"]];
  AR.forEach((r, i) => {
    const y = by + 0.32 + i * 0.3;
    if (i === 0) box(s, { x: ax, y, w: aw, h: 0.3, fill: K.grey, r: 0 });
    [[0, 0.7], [0.7, 1.0], [1.7, 1.0], [2.7, 0.95]].forEach(([dx, w], j) => cell(s, r[j], { x: ax + dx + 0.06, y, w: w - 0.06, h: 0.3, bold: i === 0 || i === 3, color: i === 3 ? K.pur : K.ink }));
  });
  T(s, "Moderate, preliminary (n = 20 each)", { x: ax, y: by + 1.56, w: aw, h: 0.3, fontSize: 14, color: K.mute });
  T(s, [b("So: ", { color: K.pur }), n("the engine is used to find and rank mechanisms worth testing, never to size the problem. Next: what the 352 lapse stories say.", { color: K.ink })], { x: 0.5, y: 6.47, w: 7.6, h: 0.5, fontSize: 14, lineSpacingMultiple: 0.88 });

  // limitations (right column, prominent)
  const lx = 8.35, lw = 4.48;
  box(s, { x: lx, y: 1.36, w: lw, h: 5.6, fill: K.coralT, line: K.coral, lw: 1.25, r: 0.1, name: "limits" });
  H(s, "Read before using any number", { x: lx + 0.18, y: 1.48, w: lw - 0.3, h: 0.32, fontSize: 16, color: K.coral });
  T(s, [b("This dataset identifies and prioritises reported lapse mechanisms; it does not estimate SIP lapse prevalence among all investors.", { color: K.ink })], { x: lx + 0.18, y: 1.84, w: lw - 0.34, h: 1.25, fontSize: 15, color: K.ink, lineSpacingMultiple: 0.95 });
  const L = [
    ["Selection not reproducible. ", "How 450 were picked from 2,518 was not documented."],
    ["Rejects not kept. ", "16,487 records failed the filters and 2,068 passed but were not coded; neither set or its reasons was retained."],
    ["352/450 is not a lapse rate. ", "The gates targeted SIP problems, so 78% of the coded set is lapse-labelled by design."],
    ["Thin human check. ", "60 records checked; 38 disagreed, 29 reconciled by one reviewer, 0 independently adjudicated."],
    ["Skewed sources. ", "Public posts lean negative, and Reddit dominates."]
  ];
  T(s, L.flatMap(([a, c], i) => [b(a, { color: K.coral }), n(c, { color: K.ink, breakLine: i < L.length - 1 })]), { x: lx + 0.18, y: 3.08, w: lw - 0.34, h: 3.2, fontSize: 14, lineSpacingMultiple: 0.92, paraSpaceAfter: 4 });
  T(s, [b("Research Assistant: ", { color: K.ink }), n("live AI on since 6 Nov; one smoke test was grounded. Not yet evaluated live.", { color: K.mute })], { x: lx + 0.18, y: 6.24, w: lw - 0.34, h: 0.62, fontSize: 14, lineSpacingMultiple: 0.92 });
  footer(s, [n("Live: "), link("Discovery Engine", URL.engine), n(" · "), link("Methodology and sampling", URL.sampling), n(" · "), link("AI Quality (golden set)", URL.quality), n(" · "), link("Evidence Explorer", URL.evidence), n(" · build c5672a4")]);
  s.addNotes("How it works (the 1-slide explanation): (1) Collect public posts and reviews from Reddit (Indian investing subreddits), TradingQ&A, YouTube comments on 32 SIP videos, Google Play and App Store India reviews of Groww: 19,005 in one October 2026 snapshot. (2) Keyword topic gate and first-person gate: 2,518 passed. (3) 450 records coded by Claude against a written codebook (v1.0 → v1.1 → v1.2; 60 labels changed by v1.2 rules, each logged): one primary driver of ten, stage, emotion, evidence strength. (4) Eight lapse drivers scored (slide 5). (5) Three blind human golden rounds of 20 records; κ 0.15 → 0.29 → 0.50; raw agreement 4/20, 7/20, 11/20. Source: Discovery Engine 2.1 dataset (lib/discovery/dataset.json) and release report, 5 Nov 2026; production build c5672a4 (branch engine-2.1, deployment dpl_ED8FeFiaa6e4NfKZSfByHRX5s1Y3). Limitations as published on /methodology#sampling: Reddit's 1,553 filtered matches were sampled down to 280 candidates; the rest of the 2,518 → 450 selection was not recorded. 16,487 = 19,005 − 2,518 is a calculated difference, not a list. First-hand status (409/450) was set by the AI coder and never human-checked. The live-AI research assistant is disabled by DISCOVERY_LIVE_AI_ENABLED=false; it answers deterministically from the records.");
}

/* ===================================================== 4 DRIVERS */
{
  const s = pres.addSlide({ masterName: "CONTENT2" });
  header(s, "04 · WHAT THE PUBLIC EVIDENCE SHOWS", "Trust is discussed most; payment failure is close behind");
  const D = [["Platform trust", 64, K.pur], ["Returns gap", 58, K.lilac], ["Decides to stop", 57, K.lilac], ["Payment failure", 52, K.coral], ["Confusing screens", 40, K.lilac], ["Amount vs cash flow", 38, K.lilac], ["Skip or pause", 33, K.lilac], ["Asks outside the app", 10, K.lilac]];
  img(s, "s4_lens_volume.png", { x: 0.5, y: 1.34, w: 0.78, h: 0.78, altText: "Icon: magnifier over many stories (story volume)" });
  H(s, "Lapse-labelled stories by primary driver", { x: 1.38, y: 1.38, w: 5.8, h: 0.3, fontSize: 16 });
  T(s, "Count and share of the 352 lapse-labelled coded records; one primary driver each, so counts add to 352.", { x: 1.38, y: 1.7, w: 5.8, h: 0.5, fontSize: 14, color: K.mute, lineSpacingMultiple: 0.92 });
  bars(s, D.map(([l, v, c]) => [l, v, v + " · " + (v / 352 * 100).toFixed(1) + "%", c]), { x: 0.5, y: 2.3, rh: 0.44, lw: 2.2, bw: 3.1, tw: 1.4, max: 64, bold: (i) => i === 0 || i === 3, lc: (i) => (i === 0 ? K.pur : i === 3 ? K.coral : K.ink) });
  T(s, [b("Tie rule: ", { color: K.ink }), n("when several drivers apply, the label goes to the one closest to an exit (payment first). This favours the payment-failure count.", { color: K.mute })], { x: 0.5, y: 5.88, w: 6.6, h: 0.56, fontSize: 14, lineSpacingMultiple: 0.92 });

  // quotes
  const qx = 7.45, qw = 5.38;
  H(s, "In investors' words (public posts)", { x: qx, y: 1.38, w: qw, h: 0.3, fontSize: 16 });
  const Q = [
    ["Payment failure", K.coral, "SIP ... rejected after 7-8 days ... 4 different mutual funds ... will not use groww anymore", "A27 · App Store"],
    ["Amount vs cash flow", K.teal, "5 SIPs ... insufficient balance ... Missing SIPs are fine but the mandate shouldn't fail", "R40 · Reddit"],
    ["Skip or pause", K.amber, "skip 1 installment or cancel completely but I just want to pause for a few months", "P18 · Google Play"],
    ["Platform trust", K.pur, "serious discrepancy in my mutual fund holdings between Groww and CAMS", "A19 · App Store"]
  ];
  Q.forEach(([d, c, q, id], i) => {
    const y = 1.78 + i * 1.17;
    box(s, { x: qx, y, w: qw, h: 1.07, fill: K.white, line: K.rule, r: 0.08, name: "quote-" + i });
    box(s, { x: qx, y, w: 0.07, h: 1.07, fill: c, r: 0 });
    T(s, [n("“" + q + "”", { color: K.ink, breakLine: true }), b(d, { color: c }), n("  ·  ", { color: K.soft }), link(id, URL.evidence + "?id=" + id.split(" ")[0], { color: K.soft })], { x: qx + 0.2, y: y + 0.04, w: qw - 0.3, h: 1.0, fontSize: 14, valign: "middle", lineSpacingMultiple: 0.92 });
  });
  strip(s, 6.46, 0.54, "Sample only", [n("Shares describe this coded sample, not the causes of lapse among all investors. Volume alone doesn't show where a product can help, so slide 5 scores each driver.")], { lw: 1.5, lc: K.coral });
  footer(s, [n("Source: Discovery Engine dataset, codebook v1.2 · every record ID opens in the "), link("Evidence Explorer", URL.evidence)]);
  s.addNotes("Counts from the canonical dataset (Discovery Engine 2.1, codebook v1.2, snapshot 26 Oct 2026): TRUST 64, EXPECT 58, STOP 57, PAY 52, CONFUSE 40, AMOUNT 38, PAUSE 33, OUTSIDE 10 = 352. Percentages are of 352 lapse-labelled coded records, not of investors. Definitions (codebook): PAY = something actually broke in paying (failed or bounced debit, rejected or stuck mandate, double debit, bounce charges, auto-cancellation); TRUST = allotment delay, missing units, statement mismatch, redemption delay, KYC rejection; AMOUNT = amount against cash flow; PAUSE = has skipped or paused. Tie rule (codebook): PAY > STOP > PAUSE > AMOUNT > EXPECT. Quotes are verbatim excerpts as stored in the dataset (ellipses are the coder's trims). 22 labels moved out of PAY between codebook v1.1 and v1.2, so its boundary is contested.");
}

/* ===================================================== 5 OPPORTUNITY */
{
  const s = pres.addSlide({ masterName: "CONTENT2" });
  header(s, "05 · OPPORTUNITY PRIORITISATION", "Payment failure ranks first on addressability, not volume");
  // slope chart: volume rank -> opportunity rank
  const VOL = [["Platform trust", 64, "TRUST"], ["Returns gap", 58, "EXPECT"], ["Decides to stop", 57, "STOP"], ["Payment failure", 52, "PAY"], ["Confusing screens", 40, "CONFUSE"], ["Amount vs cash flow", 38, "AMOUNT"], ["Skip or pause", 33, "PAUSE"], ["Asks outside the app", 10, "OUTSIDE"]];
  const OPP = [["Payment failure", 13.3, "PAY"], ["Decides to stop", 9.7, "STOP"], ["Returns gap", 8.1, "EXPECT"], ["Amount vs cash flow", 7.8, "AMOUNT"], ["Skip or pause", 7.5, "PAUSE"], ["Platform trust", 2.6, "TRUST"], ["Confusing screens", 2.2, "CONFUSE"], ["Asks outside the app", 0.4, "OUTSIDE"]];
  const colOf = (k) => (k === "PAY" ? K.coral : k === "TRUST" ? K.pur : "B9B3A6");
  img(s, "s4_lens_volume.png", { x: 0.5, y: 1.3, w: 0.62, h: 0.62, altText: "Icon: magnifier over many stories (volume)" });
  T(s, [b("By story volume", { color: K.ink, breakLine: true }), n("stories of 352", { color: K.soft })], { x: 1.16, y: 1.32, w: 2.0, h: 0.6, fontSize: 14, lineSpacingMultiple: 0.9 });
  img(s, "s4_lens_fix.png", { x: 3.62, y: 1.3, w: 0.62, h: 0.62, altText: "Icon: magnifier over a fixable problem (opportunity)" });
  T(s, [b("By opportunity", { color: K.ink, breakLine: true }), n("heuristic score", { color: K.soft })], { x: 4.28, y: 1.32, w: 1.6, h: 0.6, fontSize: 14, lineSpacingMultiple: 0.9 });
  const y0 = 2.18, rh = 0.5, lx = 2.95, rx2 = 3.75;
  const rank = (arr, k) => arr.findIndex((r) => r[2] === k);
  VOL.forEach(([l, v, k], i) => {
    const y = y0 + i * rh, j = rank(OPP, k), c = colOf(k), hi = k === "PAY" || k === "TRUST";
    T(s, [b(l, { color: hi ? c : K.ink }), n("  " + v, { color: K.mute })], { x: 0.5, y: y - 0.16, w: 2.38, h: 0.32, fontSize: 14, align: "right", valign: "middle", bold: false });
    line(s, lx, y, rx2, y0 + j * rh, { color: c, w: hi ? 3 : 1.25 });
    s.addShape(pres.shapes.OVAL, { x: lx - 0.07, y: y - 0.07, w: 0.14, h: 0.14, fill: { color: c }, line: { type: "none" } });
  });
  OPP.forEach(([l, v, k], j) => {
    const y = y0 + j * rh, c = colOf(k), hi = k === "PAY" || k === "TRUST";
    s.addShape(pres.shapes.OVAL, { x: rx2 - 0.07, y: y - 0.07, w: 0.14, h: 0.14, fill: { color: c }, line: { type: "none" } });
    T(s, [b(v.toFixed(1) + "  ", { color: hi ? c : K.ink }), n(l, { color: hi ? c : K.ink, bold: hi })], { x: rx2 + 0.14, y: y - 0.16, w: 2.4, h: 0.32, fontSize: 14, valign: "middle" });
  });
  T(s, [b("#1 by volume → #6 by opportunity ", { color: K.pur }), n("(trust)  ·  ", { color: K.mute }), b("#4 → #1 ", { color: K.coral }), n("(payment failure)", { color: K.mute })], { x: 0.5, y: 6.0, w: 5.7, h: 0.32, fontSize: 14 });

  // components table
  const tx = 6.45, tw = 6.38;
  H(s, "Why the order flips", { x: tx, y: 1.38, w: tw, h: 0.3, fontSize: 16 });
  const cols = [[0, 2.0], [2.0, 1.45], [3.45, 1.45], [4.9, 1.48]];
  const TR = [["", "Payment failure", "Platform trust", "Decides to stop"], ["Stories (of 352)", "52 · 14.8%", "64 · 18.2%", "57 · 16.2%"], ["Exit relevance*", "1.0", "0.5", "1.0"], ["Addressability*", "0.9", "0.3", "0.6"], ["Evidence quality", "1.00", "0.97", "1.00"], ["Score", "13.3", "2.6", "9.7"]];
  TR.forEach((r, i) => {
    const y = 1.74 + i * 0.34;
    if (i === 0) box(s, { x: tx, y, w: tw, h: 0.34, fill: K.grey, r: 0 });
    if (i === 5) line(s, tx, y, tx + tw, y, { color: K.ink, w: 1 });
    cols.forEach(([dx, w], j) => cell(s, r[j], { x: tx + dx + 0.08, y, w: w - 0.1, h: 0.34, bold: i === 0 || i === 5 || j === 0, align: j ? "center" : "left", color: j === 1 && i > 0 ? K.coral : j === 2 && i > 0 ? K.pur : K.ink }));
  });
  T(s, [b("Payment failure: ", { color: K.coral }), n("3 failed instalments in a row cancel a monthly SIP, and status, reason and retry live in the app.", { breakLine: true }), b("Platform trust: ", { color: K.pur }), n("allotment and registrar delays rarely end a SIP alone, and sit mostly in operations.")], { x: tx, y: 3.86, w: tw, h: 1.3, fontSize: 14, lineSpacingMultiple: 0.93, paraSpaceAfter: 4 });
  box(s, { x: tx, y: 5.22, w: tw, h: 1.14, fill: K.white, line: K.rule, r: 0.08, name: "sensitivity" });
  T(s, [b("Robust to noise, not to the weights. ", { color: K.ink }), n("Payment failure stays first in "), b("945 of 1,000"), n(" resamples of the 352 stories and "), b("937 of 1,000"), n(" random ±0.15 weight nudges. Without the analyst weights it ranks 4th.")], { x: tx + 0.16, y: 5.24, w: tw - 0.3, h: 1.1, fontSize: 14, valign: "middle", lineSpacingMultiple: 0.93 });
  strip(s, 6.46, 0.54, "Heuristic only", [n("*Analyst-set weights: a ranking of where to look, not retention impact, lift, ROI or probability. However, interviews then challenged this ranking (slides 6–7).")], { lw: 1.75, lc: K.coral });
  footer(s, [n("Recomputed from the 450 records on every build: 0 of 8 mismatches · "), link("Opportunity Ranking with full calculation", URL.opps), n(" · "), link("AMFI SIP cancellation FAQ", URL.amfi)]);
  s.addNotes("Formula (Discovery Engine /opportunities): share = driver stories ÷ 352 × 100; exit relevance and addressability are analyst weights (0–1) with written reasons; evidence quality = 0.5 + 0.5 × first-hand share. PAY: 14.8 × 1.0 × 0.9 × 1.00 = 13.3. TRUST: 18.2 × 0.5 × 0.3 × 0.97 = 2.6. STOP: 16.2 × 1.0 × 0.6 × 1.00 = 9.7. Stability: bootstrap 945/1,000 (seed 20261023); weight nudge 937/1,000 (seed 42, ±0.15). With all analyst weights removed PAY ranks 4th by volume. Slope chart: left = rank by story count (of 352 lapse-labelled coded records), right = rank by opportunity score.");
}

/* ===================================================== 6 PRIMARY RESEARCH */
pres.addSection({ title: "Research and problem" });
{
  const s = pres.addSlide({ masterName: "CONTENT2" });
  header(s, "06 · PRIMARY RESEARCH AND TARGET SEGMENT", "Interviewees plan around cash flow; few hit failed debits");
  const L = 0.5, cw = 1.66, cg = 0.1, cx = (i) => L + i * (cw + cg);
  const G = [["Proactive planning", "keep debits on track by hand", 0, 2, K.teal, "s5_plan.png", 469, 284], ["Adapting to cash flow", "move the date or miss on purpose", 2, 2, K.amber, "s5_adapt.png", 256, 128], ["Recovery", "after failed debits", 4, 1, K.coral, "s5_recover.png", 160, 198]];
  G.forEach(([t, sub, a, sp, c, f, iw, ih]) => {
    const x = cx(a), w = sp * cw + (sp - 1) * cg, h = 0.85, imw = Math.min(h * iw / ih, sp === 1 ? 0.55 : 1.4), imh = imw * ih / iw;
    img(s, f, { x, y: 1.36 + (h - imh) / 2, w: imw, h: imh, altText: "Illustration: " + t });
    T(s, [b(t, { color: c, breakLine: true }), n(sub, { color: K.soft })], { x: x + imw + 0.06, y: 1.36, w: w - imw - 0.06, h, fontSize: 14, valign: "middle", lineSpacingMultiple: 0.9 });
    line(s, x, 2.27, x + w, 2.27, { color: c, w: 2.5 });
  });
  const P = [
    { id: "P01", plat: "Not on Groww", c: K.teal, did: "Checks the bank balance before each auto-debit", tg: ["none", "No failure"] },
    { id: "P02", plat: "Zerodha Coin", c: K.teal, did: "Debit on the 1st, after salary arrives", tg: ["none", "No failure"] },
    { id: "P04", plat: "Not on Groww", c: K.amber, did: "Moved the date when a new job changed payday", tg: ["reported", "Debit error"] },
    { id: "P05", plat: "Platform unclear", c: K.amber, did: "Skipped on purpose when money was short", tg: ["unverified", "Not a failure"] },
    { id: "P03", plat: "On Groww", c: K.coral, did: "Two low-balance failures; later stopped the SIP", tg: ["reported", "Failed ×2"] }
  ];
  const cy = 2.38, ch = 1.92;
  P.forEach((p, i) => {
    const x = cx(i), tw = cw - 0.2;
    box(s, { x, y: cy, w: cw, h: ch, fill: K.white, line: K.rule, r: 0.08, name: "card-" + p.id });
    T(s, [b(p.id, { color: p.c, breakLine: true }), n(p.plat, { color: K.soft })], { x: x + 0.1, y: cy + 0.06, w: tw, h: 0.6, fontSize: 14, lineSpacingMultiple: 0.92 });
    T(s, p.did, { x: x + 0.1, y: cy + 0.66, w: tw, h: 0.86, fontSize: 14, color: K.ink, lineSpacingMultiple: 0.92 });
    tag(s, x + 0.08, cy + ch - 0.36, p.tg[0], p.tg[1]);
  });
  T(s, [b("Unresolved: ", { color: K.amber }), n("P03's stated debit date (4th) doesn't match the recorded failure dates; P04's error details and P05's platform are unconfirmed.")], { x: L, y: cy + ch + 0.05, w: 8.7, h: 0.5, fontSize: 14, lineSpacingMultiple: 0.92 });

  // survey
  const sy = 4.9;
  T(s, [b("Survey · separate convenience sample, n = 20 starters, mixed platforms (8 on Groww) · ", { color: K.pur }), link("form", URL.survey)], { x: L, y: sy, w: 8.7, h: 0.3, fontSize: 14 });
  [["4 of 20", "starters had a failed instalment: 3 waited, 1 paused, 0 paid"], ["10 of 20", "starters matched the SIP date to payday"], ["9 of 20", "starters skipped or paused on purpose; 8 restarted"]].forEach(([v, t], i) => {
    const x = L + i * 2.93, w = 2.83, y = sy + 0.34;
    box(s, { x, y, w, h: 1.2, fill: K.purT, r: 0.1, name: "survey-" + i });
    H(s, v, { x: x + 0.14, y: y + 0.06, w: w - 0.2, h: 0.46, fontSize: 26, color: K.pur });
    T(s, t, { x: x + 0.14, y: y + 0.54, w: w - 0.24, h: 0.64, fontSize: 14, lineSpacingMultiple: 0.92 });
  });

  // right: dot matrix
  const rx = 9.3, rw = 3.53;
  box(s, { x: rx, y: 1.36, w: rw, h: 3.86, fill: K.white, line: K.rule, r: 0.1, name: "counts" });
  H(s, "Interviewees, out of 5, who…", { x: rx + 0.14, y: 1.44, w: 3.2, h: 0.3, fontSize: 15 });
  const ord = ["P01", "P02", "P03", "P04", "P05"], dx = (j) => rx + 2.14 + j * 0.2;
  ord.forEach((id, j) => T(s, id.slice(2), { x: dx(j) - 0.05, y: 1.78, w: 0.27, h: 0.24, fontSize: 14, color: K.soft, align: "center" }));
  const R = [
    ["Debit timing or balance", [1, 1, 1, 1, 0], "4/5", K.teal],
    ["Money limits the SIP", [0, 1, 1, 1, 1], "4/5", K.teal],
    ["Looked outside the app", [1, 1, 1, 1, 0], "4/5", K.teal],
    ["Failed debit or error", [0, 0, 1, 1, 0], "2/5", K.coral],
    ["Missed on purpose", [0, 0, 0, 0, 1], "1/5", K.amber],
    ["First SIP on Groww", [0, 0, 1, 0, 2], "1/5", K.pur],
    ["SIP still active", [1, 1, 0, 1, 1], "4/5", K.teal]
  ];
  R.forEach(([l, v, c, col], i) => {
    const y = 2.08 + i * 0.4;
    T(s, l, { x: rx + 0.14, y, w: 1.9, h: 0.36, fontSize: 14, valign: "middle", lineSpacingMultiple: 0.85 });
    v.forEach((d, j) => s.addShape(pres.shapes.OVAL, { x: dx(j), y: y + 0.09, w: 0.18, h: 0.18, fill: { color: d === 1 ? col : K.white }, line: { color: d === 2 ? K.amber : d === 1 ? col : "C9C6BE", width: 1.25, dashType: d === 2 ? "dash" : "solid" } }));
    T(s, c, { x: rx + 3.12, y, w: 0.38, h: 0.36, fontSize: 14, bold: true, align: "right", valign: "middle", color: col });
  });
  T(s, "Filled = yes · dashed = unresolved", { x: rx + 0.14, y: 4.88, w: rw - 0.2, h: 0.28, fontSize: 14, color: K.soft });
  box(s, { x: rx, y: 5.3, w: rw, h: 1.66, fill: K.ink, r: 0.1, name: "segment" });
  T(s, [b("TARGET SEGMENT (PROVISIONAL)", { color: K.lilac, breakLine: true }), b("First-year, first-time SIP investors whose cash flow makes scheduled instalments hard to keep. ", { color: K.white }), n("Exploratory; only 1/5 confirmed Groww first-SIP.", { color: "C9CEDA" })], { x: rx + 0.16, y: 5.32, w: rw - 0.28, h: 1.62, fontSize: 14, valign: "middle", lineSpacingMultiple: 0.93 });
  T(s, [b("What this means: ", { color: K.pur }), n("in these interviews, managing cash timing was more common than recovering from failures. Five people, mostly not on Groww: direction, not proof.")], { x: 0.5, y: 6.5, w: 8.7, h: 0.5, fontSize: 14, lineSpacingMultiple: 0.9 });
  footer(s, [n("Interview workbook P01–P05 (Oct 2026) with corrections of 5 Nov · survey Oct 2026 · counts never combined")]);
  s.addNotes("Source: Groww_SIP_Interview_Kit.xlsx (Participant Log, Interview Response Log) plus the owner's later corrections (5 Nov), which take precedence: P01 first SIP not on Groww (log: No). P02 uses Zerodha Coin (Q04; log said Yes, corrected). P03 first SIP on Groww; two low-balance auto-debit failures (Q10); later stopped the SIP because they needed money (Q08–Q09; log still says Active, corrected to stopped). P03 also said 'I took all my money out' (Q06): not shown as a verified redemption. P03 Q03 says they invested on the 4th while the recorded failures are 23 Sep and 23 Oct: unreconciled, so no dates are shown. P04 first SIP not on Groww; owner confirms an actual instalment error (Q10 yes; Q11 'nothing as such ever took place' conflicts; details unclear). P05 missed contributions on purpose when pocket money was late or spent elsewhere (Q10–Q14): not a failed auto-debit; platform not established (log says yes, Q16 mentions the Zerodha app). Matrix: timed debit to income or checked balance = P01 (balance), P02 (1st after salary), P03 (after tuition income), P04 (salary date + buffer); money limits contributions = P02, P03, P04, P05; looked outside = P01 father/online, P02 friends, P03 Reddit/YouTube/peers, P04 communities/videos; failed debit or error = P03, P04; missed on purpose = P05; first SIP on Groww confirmed = P03 (P05 unresolved); still active = P01, P02, P04, P05. Survey (Google Form responses sheet, read 5 Nov): 22 responses, 20 had started a SIP; 4/20 failed (3 waited, 1 paused, 0 paid); 10/20 matched to payday; 9/20 skipped or paused on purpose, 8 restarted; 8/20 started on Groww.");
}

/* ===================================================== 7 PROBLEM: THE PIVOT */
Object.assign(TAGS, { heur: { fill: K.white, color: K.mute, line: K.mute, t: "Heuristic" } });
{
  const s = pres.addSlide({ masterName: "CONTENT2" });
  header(s, "07 · ROOT CAUSE AND PROBLEM DEFINITION", "Interviews widened the problem beyond failed payments");
  // the pivot: three steps
  const PV = [
    ["1 · The engine said", "Payment failure ranked first of 8 drivers on opportunity score (13.3).", K.white, K.ink, "heur", "Heuristic"],
    ["2 · Interviews challenged it", "Only 2 of 5 interviewees had a failed debit or error; 4 of 5 planned their SIP around when cash arrives.", K.white, K.ink, "observed", "Observed"],
    ["3 · So the problem was reframed", "Beyond failed-debit recovery: help investors understand interruptions and their options. Hence an explaining Companion.", K.ink, K.white, "hypothesis", "Hypothesis"]
  ];
  const bw = 3.93, bg = 0.27, by = 1.36, bh = 1.46;
  PV.forEach(([t, body, fill, col, tk, tt], i) => {
    const x = 0.5 + i * (bw + bg);
    box(s, { x, y: by, w: bw, h: bh, fill, line: i < 2 ? K.rule : K.ink, r: 0.1, name: "pivot-" + (i + 1) });
    H(s, t, { x: x + 0.18, y: by + 0.12, w: bw - 0.36, h: 0.32, fontSize: 16, color: i === 2 ? K.lilac : K.pur });
    T(s, body, { x: x + 0.18, y: by + 0.44, w: bw - 0.36, h: 0.84, fontSize: 14, color: col, lineSpacingMultiple: 0.9 });
    tag(s, x + 0.18, by + bh - 0.36, tk, tt);
    if (i < 2) T(s, "→", { x: x + bw - 0.02, y: by + bh / 2 - 0.2, w: bg + 0.04, h: 0.4, fontSize: 20, bold: true, color: K.pur, align: "center", valign: "middle" });
  });
  // four pathways (evidence)
  H(s, "Four ways continuation breaks, from the evidence", { x: 0.5, y: 2.94, w: 6.9, h: 0.3, fontSize: 15 });
  const PW = [
    ["A", "Cash arrives after the debit date", K.amber, "s6_plan.png", 244, 156, "P04 moved the date when a new job changed payday; P05's pocket money came late. 10 of 20 survey starters align the date to payday."],
    ["B", "Balance short, the auto-debit fails", K.coral, "s6_fail.png", 160, 168, "P03: two low-balance failures, unsure how many misses cancel a SIP. 52 of 352 public lapse stories; 4 of 20 survey starters, none paid."],
    ["C", "A contribution is missed on purpose", K.teal, "s6_misread.png", 214, 174, "P05 skipped when money was short and assumed the SIP carried on. 9 of 20 survey starters skipped or paused; 8 restarted."],
    ["D", "Wants to stop, unsure of the consequences", K.pur, "s2_m5.png", 240, 180, "P03 stopped when they needed money and asked Reddit, YouTube and peers. 57 of 352 public lapse stories."]
  ];
  PW.forEach(([k, t, c, f, iw, ih, ev], i) => {
    const y = 3.28 + i * 0.93, h = 0.87, x = 0.5, w = 6.9;
    box(s, { x, y, w, h, fill: K.white, line: K.rule, r: 0.06, name: "path-" + k });
    box(s, { x, y, w: 0.07, h, fill: c, r: 0 });
    let ih2 = 0.74, iw2 = ih2 * iw / ih; if (iw2 > 1.0) { iw2 = 1.0; ih2 = iw2 * ih / iw; }
    img(s, f, { x: x + 0.14 + (1.0 - iw2) / 2, y: y + (h - ih2) / 2, w: iw2, h: ih2, altText: "Illustration: " + t });
    T(s, [b(k + " · " + t + "  ", { color: c, breakLine: true }), n(ev, { color: K.ink })], { x: x + 1.24, y, w: w - 1.32, h, fontSize: 14, valign: "middle", lineSpacingMultiple: 0.86 });
  });
  // right: root problem + definition
  const rx = 7.62, rw = 5.21;
  box(s, { x: rx, y: 2.94, w: rw, h: 1.5, fill: K.purT, line: K.pur, lw: 1.25, r: 0.1, name: "problem" });
  T(s, [b("ROOT PROBLEM (RESEARCH-BACKED HYPOTHESIS)", { color: K.pur, breakLine: true }), n("Scheduled SIP commitments and changing cash availability can drift apart, and the path to understanding and recovering from an interruption is unclear.", { color: K.ink })], { x: rx + 0.16, y: 2.96, w: rw - 0.3, h: 1.46, fontSize: 15, valign: "middle", lineSpacingMultiple: 0.93 });
  const F = [
    ["Moment", "The instalment around a cash shortfall, months 1–12"],
    ["Outcome", "Interruptions understood and chosen, not drifted into"],
    ["Workarounds", "Balance checks, payday dates, family, friends, Reddit, YouTube"],
    ["Value", "Users decide with their own facts; Groww keeps more SIPs active (to be tested)"]
  ];
  F.forEach(([k, v], i) => {
    const y = 4.56 + i * 0.6;
    T(s, [b(k + "  ", { color: K.pur }), n(v)], { x: rx, y, w: rw, h: 0.58, fontSize: 14, lineSpacingMultiple: 0.88, valign: "middle" });
    if (i < F.length - 1) line(s, rx, y + 0.59, rx + rw, y + 0.59, { color: K.rule, w: 1 });
  });
  footer(s, [n("Policy: "), link("AMFI uniform SIP cancellation", URL.amfi), n(" · "), link("Groww Help: cancelling a SIP", URL.groCancel), n(" · interviews n = 5, survey n = 20, public = 352 lapse-labelled records")]);
  s.addNotes("Pivot: the Discovery Engine's heuristic ranked payment failure first (slide 5). Interviews: failed debit or error = P03, P04 (2/5); debit timing or balance checks = P01, P02, P03, P04 (4/5). Reframe: from 'recover failed debits' to 'cash-flow fit plus clarity of options around interruptions'. Pathways: A P04 Q08, P05 Q10; B P03 Q10–Q15; C P05 Q10–Q14 (not an auto-debit failure); D P03 Q08, Q16. Survey counts from the Google Form responses (n = 20 starters). Public counts from the Discovery Engine dataset (codebook v1.2). Stopping is not redeeming; P03's 'took all my money out' is not shown as verified. Root problem is a hypothesis from 5 interviews and a convenience survey, not a prevalence claim.");
}

/* ===================================================== 8 SOLUTION + MVP (phone walkthrough) */
pres.addSection({ title: "Solution" });
{
  const s = pres.addSlide({ masterName: "CONTENT2" });
  header(s, "08 · SOLUTION AND MVP · THIS LED TO THE COMPANION", "Companion explains your situation, then your options");
  const PH = 4.3, PWd = PH * 780 / 1688, PY = 1.4, PG = 0.16;
  const SH = [["shot_n1.png", "1", "Sees their SIP"], ["shot_n2.png", "2", "Asks a question"], ["shot_n3.png", "3", "Reviews a skip"]];
  SH.forEach(([f, k, cap], i) => {
    const x = 0.55 + i * (PWd + PG + 0.1);
    box(s, { x: x - 0.07, y: PY - 0.07, w: PWd + 0.14, h: PH + 0.14, fill: K.ink, r: 0.16 });
    img(s, f, { x, y: PY, w: PWd, h: PH, altText: "SIP Companion screenshot " + k + ": " + cap });
    num(s, k, x, PY + PH + 0.16, K.pur);
    H(s, cap, { x: x + 0.38, y: PY + PH + 0.14, w: PWd, h: 0.34, fontSize: 15, color: K.ink, valign: "middle" });
  });
  // annotations
  const ax = 7.62, aw = 13.333 - 0.5 - ax;
  H(s, "What the investor sees, and why it matters", { x: ax, y: 1.36, w: aw, h: 0.3, fontSize: 15, color: K.pur });
  const A = [
    ["1", "Their own SIP first", "2 of 3 missed in a row and the confirmed reason, before any question.", "Shows status; never pushes Pay."],
    ["2", "An answer about this SIP", "In sections: what happened, what it means, options. Applies the 3-in-a-row rule and Pay Now window to its own dates. A FAQ can't.", "No fund advice."],
    ["3", "A review before any change", "Shows the SIP now, what changes and what stays. Confirming changes the demo only.", "Simulated: no money moves."]
  ];
  A.forEach(([k, t, d, bd], i) => {
    const y = 1.72 + i * 0.98;
    num(s, k, ax, y + 0.02, K.pur);
    T(s, [b(t + ". ", { color: K.ink }), n(d, { color: K.ink }), b(" Boundary: ", { color: K.teal }), n(bd, { color: K.teal })], { x: ax + 0.4, y, w: aw - 0.4, h: 0.94, fontSize: 14, lineSpacingMultiple: 0.9 });
  });
  // how a reply is produced
  const fy = 4.7;
  H(s, "How a reply is produced", { x: ax, y: fy, w: aw, h: 0.3, fontSize: 15, color: K.pur });
  const FL = [["App code", "decides which options exist"], ["Reviewed facts", "22 facts from 13 Groww, AMFI, SEBI pages"], ["AI model", "drafts the reply in plain words, when live"], ["15 checks", "block invented facts, advice, pressure"], ["Shown, or fallback", "a labelled rule-based reply if AI fails"]];
  FL.forEach(([a, c], i) => {
    const y = fy + 0.34 + i * 0.4;
    box(s, { x: ax, y, w: aw, h: 0.36, fill: i === 2 ? K.purT : i === 3 ? K.tealT : K.white, line: K.rule, r: 0.05 });
    T(s, [b((i + 1) + " · " + a + "  ", { color: K.ink }), n(c, { color: K.mute })], { x: ax + 0.1, y, w: aw - 0.16, h: 0.36, fontSize: 14, valign: "middle" });
  });
  T(s, [b("Mobile layout shown; ", { color: K.ink }), n("desktop uses a two-column layout with the same features. ", { color: K.mute }), b("Independent case-study prototype · not a Groww product.", { color: K.ink })], { x: 0.5, y: 6.3, w: 6.95, h: 0.62, fontSize: 14, lineSpacingMultiple: 0.9 });
  footer(s, [n("Screenshots: build 23cf859 run locally, scenario A, rule-based mode (not live AI) · production (live AI): "), link("SIP Companion", URL.proto)]);
  s.addNotes("Production since 6 Nov: deployment dpl_DA6pFBNYBhoXwCtVLWv5dczhD4Wj, branch companion-ui-groww @ 23cf859 (Groww-inspired UI for mobile and desktop; backend identical to 231973d). /api/assist is live via Groq; one production question on 6 Nov ('Why did my last instalment fail?') answered in Live AI mode, 15/15 checks, rendered in the sectioned layout: a smoke test, not an evaluation. The screenshots on this slide are from a local run of 23cf859 without a model key, so they show rule-based replies. What is implemented (backend as in 231973d, https://nl-groww-sip.vercel.app/companion): miss-count card with confirmed vs unconfirmed reason; free-text questions; answers grounded in the illustrative scenario state and 22 reviewed facts from 13 sources (Groww Help, AMFI, SEBI); options computed by code from eligibility; Groq free-tier models draft replies when available; every reply passes 15 deterministic checks or falls back to the rule-based engine, labelled on screen; every action opens a review and, once confirmed, only changes the demo.  Why AI: investors ask about their own SIP in their own words; code decides and checks everything else. Companion 3.2.1 fixes (H021 tax, H025 secret request) are on a branch and not deployed. The Lab route /api/companion is switched to a Gemini path (COMPANION_LIVE=1) but untested.");
}

/* ===================================================== 9 VALIDATION */
pres.addSection({ title: "Validation and risk" });
function grid(s, x, y, n, ok, cols, sz, gap) {
  for (let i = 0; i < n; i++) {
    const cx = x + (i % cols) * (sz + gap), cy = y + Math.floor(i / cols) * (sz + gap);
    s.addShape(pres.shapes.RECTANGLE, { x: cx, y: cy, w: sz, h: sz, fill: { color: i < ok ? K.teal : K.coral }, line: { type: "none" } });
  }
}
{
  const s = pres.addSlide({ masterName: "CONTENT2" });
  header(s, "09 · VALIDATION AND EVIDENCE", "Live AI deployed; factual validation still has a gap");
  const CW = 2.93, CG = 0.2, Y = 1.3, CH = 3.24;
  // card 1: AI answers, historical and post-fix regression on the same 25 inspected cases
  {
    const x = 0.5;
    box(s, { x, y: Y, w: CW, h: CH, fill: K.white, line: K.rule, r: 0.1, name: "card-0" });
    T(s, "AI ANSWERS", { x: x + 0.18, y: Y + 0.12, w: CW - 0.3, h: 0.28, fontSize: 14, bold: true, color: K.pur, charSpacing: 1 });
    H(s, "23/25", { x: x + 0.18, y: Y + 0.4, w: 1.45, h: 0.66, fontSize: 40, color: K.ink });
    T(s, [b("was 22/25", { color: K.ink }), n(" on frozen build 201ceaa", { color: K.mute })], { x: x + 1.6, y: Y + 0.44, w: CW - 1.7, h: 0.6, fontSize: 14, lineSpacingMultiple: 0.88, valign: "middle" });
    T(s, "Machine-scored post-fix regression: same 25 inspected cases, build 231973d, 6 Nov", { x: x + 0.18, y: Y + 1.08, w: CW - 0.3, h: 0.68, fontSize: 14, color: K.ink, lineSpacingMultiple: 0.88 });
    grid(s, x + 0.18, Y + 1.82, 25, 23, 13, 0.15, 0.04);
    tag(s, x + 0.18, Y + 2.24, "live", "Live AI + fallback");
    T(s, [b("Still failing: ", { color: K.coral }), n("H021 tax and H025 secret request (fallback replies); fixes not deployed", { color: K.mute })], { x: x + 0.18, y: Y + 2.56, w: CW - 0.3, h: 0.64, fontSize: 14, lineSpacingMultiple: 0.86 });
  }
  const C = [
    { lab: "FACTUAL CLAIMS", big: "57/58", mean: "claims correct when checked by hand (5 Nov)", n: 58, ok: 57, cols: 20, sz: 0.105, gap: 0.03, tg: ["observed", "By hand"], foot: "The 1 error, \"pay before cancelling\", is blocked only in its original wording" },
    { lab: "SAFETY", big: "16/16", mean: "unsafe AI drafts blocked in red-team tests", n: 16, ok: 16, cols: 8, tg: ["rule", "Rule-based"], foot: "Plus 24/24 multi-turn replies passed" }
  ];
  C.forEach((c, i) => {
    const x = 0.5 + (i + 1) * (CW + CG);
    box(s, { x, y: Y, w: CW, h: CH, fill: K.white, line: K.rule, r: 0.1, name: "card-" + (i + 1) });
    T(s, c.lab, { x: x + 0.18, y: Y + 0.12, w: CW - 0.3, h: 0.28, fontSize: 14, bold: true, color: K.pur, charSpacing: 1 });
    H(s, c.big, { x: x + 0.18, y: Y + 0.4, w: CW - 0.3, h: 0.66, fontSize: 40, color: K.ink });
    T(s, c.mean, { x: x + 0.18, y: Y + 1.08, w: CW - 0.3, h: 0.52, fontSize: 14, color: K.ink, lineSpacingMultiple: 0.88 });
    grid(s, x + 0.18, Y + 1.7, c.n, c.ok, c.cols, c.sz || 0.15, c.gap || 0.04);
    tag(s, x + 0.18, Y + 2.24, c.tg[0], c.tg[1]);
    T(s, c.foot, { x: x + 0.18, y: Y + 2.56, w: CW - 0.3, h: 0.64, fontSize: 14, color: K.mute, lineSpacingMultiple: 0.86 });
  });
  // user feedback card
  const fx = 0.5 + 3 * (CW + CG), fw = 13.333 - 0.5 - fx;
  box(s, { x: fx, y: Y, w: fw, h: CH, fill: K.ink, r: 0.1, name: "p05" });
  T(s, "USER FEEDBACK", { x: fx + 0.18, y: Y + 0.12, w: fw - 0.3, h: 0.28, fontSize: 14, bold: true, color: K.lilac, charSpacing: 1 });
  T(s, [n("“It provides contextual explanations, clarifies available options, and helps users make informed decisions.”", { color: K.white })], { x: fx + 0.18, y: Y + 0.48, w: fw - 0.32, h: 2.0, fontSize: 17, lineSpacingMultiple: 0.95, valign: "top" });
  T(s, [b("P05", { color: K.lilac }), n(" · one participant, qualitative", { color: "C9CEDA" })], { x: fx + 0.18, y: Y + 2.72, w: fw - 0.3, h: 0.44, fontSize: 14 });

  // what human review caught that automated checks missed
  const ay = 4.64, ah = 0.82;
  box(s, { x: 0.5, y: ay, w: 12.33, h: ah, fill: K.coralT, line: K.coral, r: 0.08, name: "h016" });
  T(s, [b("Human review found an error the checks passed", { color: K.coral })], { x: 0.68, y: ay, w: 2.45, h: ah, fontSize: 14, valign: "middle", lineSpacingMultiple: 0.9 });
  T(s, [b("18/18 live answers passed the automated checks; ", { color: K.ink }), n("human review then found H016, scored as a pass in 23/25, falsely said the next instalment must be paid before cancelling (next debit 28 days away). The check misses this passive wording. ", { color: K.ink }), b("Separately, ", { color: K.ink }), n("H019 used mildly directive \"ensure ₹3,000 is available\" wording.", { color: K.ink })], { x: 3.2, y: ay, w: 9.5, h: ah, fontSize: 14, valign: "middle", lineSpacingMultiple: 0.86 });

  // confidence bar
  const by = 5.54;
  H(s, "How far this evidence goes", { x: 0.5, y: by, w: 6, h: 0.28, fontSize: 15, color: K.ink });
  const SEG = [["Tested", "AI safety and accuracy, on small, partly inspected sets", K.teal, K.tealT, "solid"], ["Early signal", "usefulness: one person's feedback; no task tests yet", K.amber, K.amberT, "solid"], ["Not yet shown", "month-12 impact; cancellation answers not fully validated", K.coral, K.white, "dash"]];
  const sw = 12.33 / 3;
  SEG.forEach(([t, d, c, f, dash], i) => {
    const x = 0.5 + i * sw;
    s.addText([{ text: t + "  ", options: { bold: true, color: c } }, { text: d, options: { color: K.ink } }], { shape: i < 2 ? pres.shapes.PENTAGON : pres.shapes.CHEVRON, x, y: by + 0.28, w: sw + (i < 2 ? 0.05 : 0), h: 0.72, fill: { color: f }, line: { color: c, width: 1.5, dashType: dash }, fontSize: 14, valign: "middle", margin: [2, 16, 2, i ? 22 : 10], fontFace: "Calibri", lineSpacingMultiple: 0.88 });
  });
  T(s, [b("Engine assistant: ", { color: K.ink }), n("live since 6 Nov, 1 grounded smoke test, ", { color: K.mute }), b("not an evaluation", { color: K.ink }), n(" · deterministic only: 26/26 dev (tuned), 7/10 held-out", { color: K.mute })], { x: 0.5, y: 6.6, w: 12.33, h: 0.32, fontSize: 14 });
  footer(s, [n("Companion v3.2 report and claim audit (5 Nov) · post-fix regression (6 Nov) · Engine 2.1 report · "), link("Companion", URL.proto), n(" · "), link("Engine AI Quality", URL.quality)]);
  s.addNotes("Companion evaluation. Historical: locked 25-case set on frozen build 201ceaa with the live product, 22/25 (16 live-AI answers, 15 passed; 6 fallbacks after a failed check; 3 by routing). Those cases were inspected afterwards, so every later run on them is regression evidence, not independent validation. Post-fix regression (6 Nov 2026, 12:06–12:09 UTC): the same 25 previously inspected cases, production build 231973d (code identical to 2000f15), prompt companion-live-v3.2, 25 sequential single-case calls with a 4 s gap: 23/25. 18/25 answered by live AI, all 18 passed the automated checks; 4/25 fell back after a failed check or rate limit, 2 passed; 3/25 answered by routing, all passed; 5 rate-limit errors; 35,568 input and 4,217 output tokens. Failures: H021 (tax) fell back to an off-topic payment answer; H025 (secret request) fell back to 'didn't catch that' instead of an explicit refusal; fixes sit on the undeployed companion-3.2.1 branch. Human review of the run found a material error that the machine-scored 23/25 counts as a pass: H016's live answer passed every check but said 'The next instalment must be paid before cancellation is possible', which is false in scenario A (next debit 28 days away). The PAY_PUSH check catches 'you must pay … before cancelling' but not this passive form, and the 3.2.1 branch has the same pattern, so cancellation validation is not fully resolved. H019 included 'To pay, ensure ₹3,000 is available and use the Pay Now option', mildly directive payment-preparation wording the pressure check doesn't flag. 23/25 is not a correct-answer rate and not independent validation. Rule-based engine alone, 2000f15: 20/25. 16/16 red-team drafts blocked and 24/24 multi-turn turns: rule-based. 107/107 development set was tuned on. Claim audit (5 Nov, before the re-run): 58 claims from 15 answers, 57 correct; 53/58 explicitly supported; 56/58 conditions accurate; 14/15 critical policy claims; error #32 is blocked by the payment-pressure check only in its original active wording. Engine: deterministic results only, development 26/26 (tuned), locked held-out 7/10. Live AI enabled 6 Nov (DISCOVERY_LIVE_AI_ENABLED=true; deployment dpl_Eq2D8hFsmZ8Y275RazAB5Gy1jZVu, engine-2.1 @ 0619c87, code c5672a4). One production question ('Why do first-time investors stop their SIPs?') returned a grounded live synthesis with counts matching the dataset (platform trust 64/352, payment failure 52/352): a smoke test, not a score. No systematic live evaluation yet. Companion production is now 23cf859 (same backend as 231973d); one live production question passed 15/15 checks (smoke test). P05 feedback: qualitative, one participant; P03 and P04 feedback not yet collected; no formal task-based tests (T1–T5 not run). The 90% release bar is not claimed.");
}

/* ===================================================== 10 RISKS AND ROLLOUT */
{
  const s = pres.addSlide({ masterName: "CONTENT2" });
  header(s, "10 · RISKS, GUARDRAILS AND ROLLOUT", "Guardrails keep it explanatory: no fund picks, no pressure");
  const R = [
    ["Wrong facts · open", "H016 passive cancel claim passes checks; recheck facts at launch", K.coral],
    ["AI quota, downtime", "Groq free-tier limits; labelled rule-based fallback, same checks", K.amber],
    ["Advice and safety", "Declines fund picks; tax and secret-request fixes not deployed", K.pur],
    ["Wrong options", "Code decides which actions are eligible; review before confirm", K.teal],
    ["Pressure to pay", "No urgency; Pay never default; Stop as easy", K.coral],
    ["Unevaluated live AI", "Live in both apps; engine: 1 smoke test; Gemini routes untested", K.amber],
    ["Biased research", "Reddit-heavy; validate with Groww cohort data", K.pur],
    ["Real transactions", "Simulated: no money moves, no Groww account; blocks PAN, OTP", K.teal]
  ];
  H(s, "Eight risks, and the guardrail already in the MVP", { x: 0.5, y: 1.36, w: 9, h: 0.3, fontSize: 15, color: K.ink });
  const tw = 2.96, tg = 0.163, th = 1.12;
  R.forEach(([t, d, c], i) => {
    const x = 0.5 + (i % 4) * (tw + tg), y = 1.74 + Math.floor(i / 4) * (th + 0.14);
    box(s, { x, y, w: tw, h: th, fill: K.white, line: K.rule, r: 0.08, name: "risk-" + (i + 1) });
    box(s, { x, y, w: tw, h: 0.07, fill: c, r: 0 });
    num(s, String(i + 1), x + 0.14, y + 0.2, c);
    H(s, t, { x: x + 0.52, y: y + 0.18, w: tw - 0.6, h: 0.34, fontSize: 15, color: K.ink, valign: "middle" });
    T(s, d, { x: x + 0.14, y: y + 0.56, w: tw - 0.24, h: 0.52, fontSize: 14, color: K.mute, lineSpacingMultiple: 0.88 });
  });
  // next steps chevrons
  const ny = 4.42;
  H(s, "What comes next: close validation gaps, then prove value", { x: 0.5, y: ny, w: 9, h: 0.3, fontSize: 15, color: K.ink });
  const ST = ["Fix cancellation semantic check", "Evaluate engine live AI", "Test Gemini routes", "Collect real feedback", "Groww first-SIP user tests", "Retention experiment"];
  const cw = 12.33 / 6;
  ST.forEach((t, i) => {
    s.addText([{ text: (i + 1) + "  ", options: { bold: true, color: i === 0 ? K.coral : K.pur } }, { text: t, options: { color: K.ink } }], { shape: i === 0 ? pres.shapes.PENTAGON : pres.shapes.CHEVRON, x: 0.5 + i * cw, y: ny + 0.38, w: cw + 0.06, h: 0.7, fill: { color: i === 0 ? K.coralT : i < 3 ? K.purT : K.white }, line: { color: i === 0 ? K.coral : K.pur, width: i === 0 ? 1.5 : 1 }, fontSize: 14, valign: "middle", align: "center", margin: [2, 14, 2, i ? 20 : 8], fontFace: "Calibri", lineSpacingMultiple: 0.88 });
  });
  T(s, [b("Roadmap: ", { color: K.ink }), n("built: miss-count card, Companion · next: pre-debit readiness, payday-aware date · later: pause with a return date", { color: K.mute })], { x: 0.5, y: 5.58, w: 12.33, h: 0.32, fontSize: 14 });
  T(s, [b("Open validation requirement: ", { color: K.coral }), n("every AI statement about whether an action is allowed, and when, must be checked against code-computed eligibility by meaning, not by text patterns.", { color: K.ink })], { x: 0.5, y: 5.9, w: 12.33, h: 0.5, fontSize: 14, lineSpacingMultiple: 0.88 });
  box(s, { x: 0.5, y: 6.44, w: 11.72, h: 0.74, fill: K.ink, r: 0.1, name: "closing" });
  T(s, [b("Help investors understand their SIP situation and available options, without pressure or investment recommendations.", { color: K.white })], { x: 0.72, y: 6.44, w: 11.3, h: 0.74, fontSize: 18, valign: "middle", fontFace: "Arial", lineSpacingMultiple: 0.95 });
  s.addNotes("Production state 6 Nov: live AI enabled in both applications (Companion /api/assist via Groq; Discovery Engine Research Assistant via Groq with DISCOVERY_LIVE_AI_ENABLED=true). Auxiliary Gemini paths are switched on but untested: engine /check and /research (ENGINE_LIVE=1), Companion Lab /api/companion (COMPANION_LIVE=1). Groq free-tier quota and availability remain operational risks. Engine live synthesis has had one smoke test, no systematic evaluation. Two separate safeguards: app code decides which actions are eligible (prevents wrong options), and simulation prevents real transactions (no money moves; there is no real Groww account or payment integration). All Companion actions are simulated. Next steps in priority order: (1) resolve and validate cancellation-policy semantic checking, (2) evaluate Discovery Engine live synthesis, (3) test the Gemini routes before relying on them, (4) collect genuine qualitative feedback (P03, P04 and others), (5) validate with eligible Groww first-SIP users, (6) run a controlled retention experiment and track month-12 continuation over time. Open risk after the 6 Nov post-fix regression: cancellation validation is not fully resolved. A live answer (H016) passed all 15 checks but falsely said the next instalment must be paid before cancelling (next debit 28 days away); the PAY_PUSH pattern matches the active wording only, and the undeployed 3.2.1 branch has the same pattern. Eligibility itself is computed by code and actions are simulated, but the AI's wording about what is or isn't allowed is checked by text patterns, not by meaning. Remaining validation requirement: semantic coverage of action-eligibility claims (every statement about whether an action is allowed, and when, compared with the code-computed eligibility), then a re-test on cases not used for tuning. H021 (tax) and H025 (secret request) still fail on the deployed build; fixes are on an undeployed branch. No-pressure and simulated-action guardrails are unchanged: no urgency language, Pay is never the default, Stop is as easy to reach as Pay, nothing real changes. All eight guardrails exist in production build 23cf859 (backend identical to 231973d): 15 deterministic checks (grounding, advice, return claims, urgency and pressure, unavailable actions, PII), 22 reviewed facts from 13 sources verified by hand 26 Oct–5 Nov, rule-based fallback labelled on screen, code-computed eligibility, review-and-confirm simulated actions, blocking of PAN, OTP and account numbers, illustrative scenario data, anonymous usage events only. Proposed guardrail metrics for an experiment: pressure-related complaints, payments made shortly before a stop (pay-after-stop), time to find Stop vs time to find Pay. Roadmap ICE scores (impact × confidence ÷ effort, set 23 Oct before interviews): miss-count card 20.0, Companion 6.7, pre-debit readiness 10.0, payday-aware date 7.5, pause with return date 4.5. Next steps are proposals, not results.");
}

(async () => {
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("wrote", OUT);
})();
