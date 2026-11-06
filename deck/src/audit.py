from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.worksheet.table import Table, TableStyleInfo

ENG = "Discovery Engine 2.1 dataset (lib/discovery/dataset.json, codebook v1.2, snapshot 26 Oct 2026; prod build c5672a4)"
ENGR = "docs/ENGINE_V21_REPORT.md (5 Nov 2026)"
METH = "nl-groww-engine.vercel.app/methodology#sampling (prod c5672a4)"
OPP = "nl-groww-engine.vercel.app/opportunities (prod c5672a4)"
KIT = "Groww_SIP_Interview_Kit.xlsx (Participant Log, Interview Response Log) + owner corrections 5 Nov"
SUR = "Survey Google Form responses sheet (22 responses, 20 starters), read 5 Nov"
CMP = "docs/COMPANION_V32_REPORT.md (5 Nov 2026)"
AUD = "docs/CLAIM_AUDIT_V32.md (5 Nov 2026)"
DEP = "Live check 5 Nov 19:47 IST: GET /api/assist build 231973d; GET engine /api/agent live:false"

PRODREF = "claude/mvp/production_live_ai_6nov.md (6 Nov 2026)"
rows = [
 # slide, claim, source, denominator, evidence type, limitation, verification
 (1, "North Star: eligible cohort investors with ≥1 successful SIP instalment in the 30 days ending at month 12 ÷ all eligible first-time MF investors who started their first SIP in that cohort × 100", "Assignment brief; final deck brief Part 4", "Cohort of first-time starters", "Definition", "Proposed metric definition; not measured in this study", "Verified"),
 (1, "Active SIP = at least one successful instalment in the preceding 30 days", "Assignment brief", "—", "Definition", "—", "Verified"),
 (1, "Problem hypothesis: debit date and money available stop lining up; unclear way back → lapse without a real decision", "Slides 6–7 synthesis (interviews, survey, engine)", "5 interviews; n=20 survey; 352 coded posts", "Synthesis", "Labelled 'Research-backed hypothesis · not a universal explanation'", "Verified (framed as hypothesis)"),
 (1, "We built a contextual SIP Companion; no fund recommendations, no return promises, no pressure; illustrative data, no real transactions", CMP + "; " + DEP, "—", "Deployment", "Prototype on illustrative scenarios", "Verified"),
 (2, "Survey: 10/20 matched the SIP date to payday", SUR, "20 starters", "Survey", "Convenience sample, mixed platforms", "Verified (recounted)"),
 (2, "Interviews: 4/5 timed the debit to income or checked balance (P01 balance, P02 1st after salary, P03 after tuition income, P04 salary + buffer)", KIT, "5 interviews", "Interview", "Exploratory; not all Groww first-SIP", "Verified"),
 (2, "Public: 52/352 payment-failure stories", ENG, "352 lapse-labelled coded records", "Public post (AI-coded)", "Sample share, not prevalence", "Verified"),
 (2, "Survey: 4/20 had a failed instalment; of those 3 waited, 1 paused, 0 paid", SUR, "20 starters / 4 with a failure", "Survey", "Small n", "Verified (recounted)"),
 (2, "Interviews: 2/5 failed debit or error (P03, P04); 1/5 skipped on purpose (P05)", KIT, "5 interviews", "Interview", "P04 details unclear (Q10 vs Q11); owner confirmed an actual error", "Verified with discrepancy noted"),
 (2, "Survey: 9/20 skipped or paused on purpose; 8 restarted", SUR, "20 starters / 9", "Survey", "Small n", "Verified (recounted)"),
 (2, "Leading indicators (mandate live before debit 1; pre-debit details viewed; first-try success; failure resolved before next debit; skip → resumed in 60 days) are proposed Groww metrics, none measured", "Deck design (proposal)", "—", "Proposal", "Not measured", "Verified (labelled as proposal)"),
 (3, "19,005 collected → 2,518 passed filters → 450 coded → 8 drivers → 60 human-checked", ENG + "; " + ENGR, "—", "System / dataset", "Selection 2,518→450 undocumented", "Verified"),
 (3, "The 450 = 352 lapse · 50 continuer · 48 context", ENG, "450", "Dataset", "—", "Verified"),
 (3, "409 labelled first-hand by the AI, not checked by a human; 390 labels AI-only", ENG + "; " + METH, "450", "Dataset", "First-hand accuracy not measured", "Verified"),
 (3, "Platform counts: Reddit 11,802; TradingQ&A 3,445; YouTube 1,610; Google Play 1,160; App Store 988; 62% Reddit", ENG, "19,005", "Dataset", "One October 2026 snapshot", "Verified (sum = 19,005; 11,802/19,005 = 62.1%)"),
 (3, "159 of the 450 coded are Reddit", METH, "450", "Dataset", "—", "Verified"),
 (3, "Agreement: R1 v1.0 4/20 κ0.15; R2 v1.1 7/20 κ0.29; R3 v1.2 11/20 κ0.50", ENG + " (rounds)", "20 per round", "Human validation", "Small n; moderate and preliminary", "Verified (κ 0.147/0.292/0.500 rounded)"),
 (3, "60 records checked; 38 disagreed, 29 reconciled by one reviewer, 0 independently adjudicated", ENGR, "60", "Human validation", "Reconciliation is not independent adjudication", "Verified"),
 (3, "Quote: 'The dataset is designed to identify and prioritise reported lapse mechanisms. It is not a representative estimate…'", METH, "—", "Disclosure", "—", "Verified (exact wording)"),
 (3, "16,487 failed the filters and 2,068 passed but were not coded; neither retained nor reasons stored", METH + "; " + ENGR, "19,005 / 2,518", "Disclosure", "16,487 is a calculated difference", "Verified"),
 (3, "78% of the coded set is lapse-labelled by design (352/450 is not a lapse rate)", METH, "450", "Disclosure", "—", "Verified (352/450 = 78.2%)"),
 (3, "Research Assistant: live AI on since 6 Nov; one smoke test was grounded; not yet evaluated live", "claude/mvp/production_live_ai_6nov.md (6 Nov 2026); Vercel deployments dpl_DA6pFBNYBhoXwCtVLWv5dczhD4Wj (Companion) and dpl_Eq2D8hFsmZ8Y275RazAB5Gy1jZVu (Engine)", "1 question", "Deployment + smoke test", "Operational status only; no systematic live evaluation; methodology limits unchanged", "Verified"),
 (4, "Driver counts: Trust 64, Returns gap 58, Decides to stop 57, Payment failure 52, Confusing screens 40, Amount vs cash flow 38, Skip or pause 33, Asks outside 10 (sum 352)", ENG + " (ranking)", "352", "Public post (AI-coded)", "Sample shares, not population causes", "Verified"),
 (4, "Shares 18.2% / 16.5% / 16.2% / 14.8% / 11.4% / 10.8% / 9.4% / 2.8%", "Computed n ÷ 352", "352", "Computed", "—", "Verified"),
 (4, "Tie rule: label goes to the driver closest to an exit (payment first), favouring payment-failure count", "lib/discovery/core.js TIE_RULE (PAY > STOP > PAUSE > AMOUNT > EXPECT)", "—", "Method", "—", "Verified"),
 (4, "Quotes A27, R40, P18, A19 (verbatim excerpts as stored)", ENG + " (records)", "—", "Public post", "Coder trims marked with …", "Verified"),
 (4, "50 continuer stories kept out of the 352", ENG, "450", "Dataset", "—", "Verified"),
 (5, "Scores: 13.3, 9.7, 8.1, 7.8, 7.5, 2.6, 2.2, 0.4", ENG + " (ranking); " + OPP, "352", "Heuristic", "Analyst-weighted; non-causal", "Verified (0 of 8 mismatches on recompute)"),
 (5, "Components PAY 14.8/1.0/0.9/1.00; TRUST 18.2/0.5/0.3/0.97; STOP 16.2/1.0/0.6/1.00", OPP, "352", "Heuristic", "Weights are analyst judgements", "Verified (TRUST evidence 0.5+0.5×0.94=0.97)"),
 (5, "Three failed instalments in a row cancel a monthly SIP (AMFI uniform process)", "AMFI uniform SIP cancellation FAQ (Taurus MF copy); engine WHY_WEIGHT", "—", "Policy source", "Secondary host of AMFI FAQ", "Verified"),
 (5, "Stability 945/1,000 bootstrap; 937/1,000 ±0.15 weight nudges", ENG + " (stability)", "1,000 runs each", "Sensitivity", "Run counts, not confidence intervals", "Verified"),
 (5, "With analyst weights removed, payment failure ranks 4th", OPP, "—", "Sensitivity", "Lead rests on weights", "Verified"),
 (6, "P01: first SIP not on Groww; checks balance before each debit; no failure", KIT, "—", "Interview", "—", "Verified"),
 (6, "P02: Zerodha Coin; debit on the 1st after salary; no failure", KIT + " (Q03, Q04)", "—", "Interview", "Log said Groww = Yes; corrected", "Corrected"),
 (6, "P04: first SIP not on Groww; moved date after job change; debit error", KIT + " (Q08, Q10)", "—", "Interview", "Q11 contradicts Q10; owner confirmed error", "Corrected (discrepancy kept)"),
 (6, "P05: platform unclear; skipped on purpose when money was short; not a failed debit", KIT + " (Q10–Q16)", "—", "Interview", "Platform unresolved (log yes, Q16 mentions Zerodha)", "Corrected"),
 (6, "P03: first SIP on Groww; two low-balance failures; later stopped the SIP", KIT + " (Q08–Q15)", "—", "Interview", "Debit date 4th vs failure dates unreconciled; 'took all my money out' not shown as verified redemption", "Corrected"),
 (6, "Matrix: debit timing or balance 4/5; money limits SIP 4/5; looked outside 4/5; failed debit or error 2/5; missed on purpose 1/5; first SIP on Groww 1/5; still active 4/5", KIT, "5", "Interview", "Exploratory", "Verified / corrected (failure 1/5→2/5; active 5/5→4/5)"),
 (6, "Survey: n = 20 starters, mixed platforms, 8 on Groww", SUR, "20", "Survey", "Convenience sample", "Verified (recounted)"),
 (6, "Target segment (provisional): first-year, first-time SIP investors whose cash flow makes scheduled instalments hard to keep", "Synthesis", "—", "Hypothesis", "Only 1/5 confirmed Groww first-SIP", "Verified (labelled provisional)"),
 (7, "Pathway A: P04 date moved after job change; P05 pocket money late; survey 10/20", KIT + "; " + SUR, "5; 20", "Interview + survey", "—", "Verified"),
 (7, "Pathway B: P03 two low-balance failures, unsure of rules; public 52/352; survey 4/20, 0 paid", KIT + "; " + ENG + "; " + SUR, "—", "Mixed", "—", "Verified"),
 (7, "Pathway C: P05 skipped and believed the SIP carried on; survey 9/20, 8 restarted", KIT + " (Q12–Q13); " + SUR, "—", "Interview + survey", "—", "Verified"),
 (7, "Pathway D: P03 stopped when money needed; looked to Reddit, YouTube, peers; public 57/352", KIT + " (Q08, Q16); " + ENG, "—", "Mixed", "Stopping ≠ redeeming", "Verified"),
 (7, "Root problem statement (hypothesis)", "Final brief Part 7 wording; synthesis", "—", "Hypothesis", "Not a universal fact", "Verified (framed as hypothesis)"),
 (7, "Evolution: engine ranked payment failure first; interviews 2/5 failure vs 4/5 timing", "Slides 5–6", "5", "Synthesis", "—", "Verified"),
 (8, "Production: companion-ui-groww @ 23cf859 (Groww-inspired UI; backend identical to 231973d) at nl-groww-sip.vercel.app", "claude/mvp/production_live_ai_6nov.md (6 Nov 2026); Vercel deployments dpl_DA6pFBNYBhoXwCtVLWv5dczhD4Wj (Companion) and dpl_Eq2D8hFsmZ8Y275RazAB5Gy1jZVu (Engine)", "—", "Deployment", "Deployed from branch; main not merged; 3.2.1 fixes not deployed", "Verified"),
 (8, "Companion /api/assist live via Groq; one production question answered in Live AI mode, 15/15 checks, sectioned layout (speaker notes)", "claude/mvp/production_live_ai_6nov.md (6 Nov 2026); Vercel deployments dpl_DA6pFBNYBhoXwCtVLWv5dczhD4Wj (Companion) and dpl_Eq2D8hFsmZ8Y275RazAB5Gy1jZVu (Engine)", "1 question", "Smoke test", "Not an evaluation; not shown as a score", "Verified"),
 (8, "22 reviewed facts from 13 sources; 15 checks per reply", "lib/companion/kb.mjs, validate.mjs; " + CMP, "—", "System", "—", "Verified"),
 (8, "Groq model drafts when available; labelled rule-based fallback", CMP + "; live probe 5 Nov 19:25 IST returned a live answer, next request rate-limited", "—", "Deployment", "Free-tier quota limits", "Verified"),
 (8, "Screenshots: build 23cf859 run locally, scenario A, rule-based mode (not live AI); new UI replaces old screenshots", "Playwright capture 6 Nov (390 px mobile)", "—", "Screenshot", "No model key locally, so rule-based replies; labelled as such", "Verified"),
 (8, "Mobile layout shown; desktop uses a two-column layout with the same features; independent case-study prototype · not a Groww product", "companion_ui_groww_preview.md; QA at 360–1440 px", "—", "Product description", "—", "Verified"),
 (8, "ICE: miss-count 20.0; Companion 6.7; pre-debit readiness 10.0; payday-aware date 7.5; pause with return date 4.5 (set 23 Oct, pre-interview)", "Opportunity tree artifact, 23 Oct; previous deck slide 7", "—", "Prioritisation", "Not rescored after interviews", "Verified"),
 (9, "Companion: 25 locked cases, frozen build 201ceaa, live product 22/25; live answers 15/16", CMP, "25 / 16", "System evaluation (live + fallback)", "Cases since inspected; now regression", "Verified"),
 (9, "Same 25, rule-based only, 2000f15: 20/25", CMP, "25", "System evaluation (rule-based)", "—", "Verified"),
 (9, "Red team 16/16 blocked; dialogue 24/24 turns", CMP, "16; 24", "System evaluation (rule-based)", "—", "Verified"),
 (9, "Development 107/107 (tuned on)", CMP, "107", "System evaluation (rule-based)", "Not independent", "Verified"),
 (9, "Machine-scored post-fix regression, 6 Nov: the same 25 previously inspected cases re-run on production build 231973d (prompt companion-live-v3.2): 23/25", "claude/mvp/companion_v32_postfix_regression.md (6 Nov 2026); results lib/companion/eval_v32_postfix_regression_231973d.json (branch eval-postfix-results, commit 1b6ae0a)", "25", "Regression (live + fallback)", "Cases inspected after the frozen run: regression evidence, not independent validation and not a correct-answer rate (H016 passed with a false claim)", "Verified"),
 (9, "18/18 live AI answers passed the automated checks (6 Nov run); human review then found one of them (H016) wrong", "claude/mvp/companion_v32_postfix_regression.md (6 Nov 2026); results lib/companion/eval_v32_postfix_regression_231973d.json (branch eval-postfix-results, commit 1b6ae0a)", "18 live of 25", "Regression (automated checks)", "Automated checks missed the H016 error; passing checks ≠ correct", "Verified"),
 (9, "H016 (scored as a pass in the machine-scored 23/25): a live answer falsely said the next instalment must be paid before cancelling, although the next debit was 28 days away; the check misses this passive wording", "claude/mvp/companion_v32_postfix_regression.md (6 Nov 2026); results lib/companion/eval_v32_postfix_regression_231973d.json (branch eval-postfix-results, commit 1b6ae0a)" + "; lib/companion/validate.mjs PAY_PUSH pattern (231973d and companion-3.2.1)", "1 answer", "Human review of regression output", "Material false policy claim; same pattern on undeployed 3.2.1 branch, so not fixed anywhere", "Verified"),
 (9, "H019 used mildly directive payment-preparation wording ('ensure ₹3,000 is available')", "claude/mvp/companion_v32_postfix_regression.md (6 Nov 2026); results lib/companion/eval_v32_postfix_regression_231973d.json (branch eval-postfix-results, commit 1b6ae0a)", "1 answer", "Human review of regression output", "Mild; pressure check does not flag it", "Verified"),
 (9, "Still failing on deployed build: H021 tax and H025 secret request (fallback replies); fixes not deployed", "claude/mvp/companion_v32_postfix_regression.md (6 Nov 2026); results lib/companion/eval_v32_postfix_regression_231973d.json (branch eval-postfix-results, commit 1b6ae0a)", "2 of 25", "Regression", "Fixes on undeployed branch companion-3.2.1", "Verified"),
 (9, "Title: 'Live AI deployed; factual validation still has a gap'", "Synthesis of rows above", "—", "Headline", "—", "Verified"),
 (9, "Engine assistant: live since 6 Nov, 1 grounded smoke test (64/352 trust, 52/352 payment failure matched dataset), not an evaluation; deterministic only: 26/26 dev (tuned), 7/10 held-out", PRODREF + "; " + ENGR, "1 question; 26; 10", "Smoke test + deterministic evaluation", "Smoke test is not a score; 7/10 applies to deterministic engine only", "Verified"),
 (9, "Evidence bar: month-12 impact and correct cancellation answers not yet shown", "claude/mvp/companion_v32_postfix_regression.md (6 Nov 2026); results lib/companion/eval_v32_postfix_regression_231973d.json (branch eval-postfix-results, commit 1b6ae0a)" + "; " + CMP, "—", "Status", "—", "Verified"),
 (9, "Engine: development 26/26 (tuned); locked held-out 7/10; fails EH02 sampling, EH03 % who lapse, EH06 continuers vs lapsers", ENGR, "26; 10", "System evaluation (deterministic)", "Deterministic only; no live evaluation; mocked tests not counted", "Verified"),
 (9, "Claims: 57/58 correct; 53/58 explicitly supported; 56/58 conditions accurate; 14/15 critical policy", AUD + "; " + CMP, "58; 15", "Human review", "One reviewer; 58 claims", "Verified"),
 (9, "The 1 error (#32, 'pay before cancelling') is blocked only in its original wording", "Commit 5f8030c (in production 231973d); regression R-A32 29/29 on 231973d; " + "claude/mvp/companion_v32_postfix_regression.md (6 Nov 2026); results lib/companion/eval_v32_postfix_regression_231973d.json (branch eval-postfix-results, commit 1b6ae0a)", "—", "Regression + human review", "Active wording blocked in a mocked-model test; passive rewording passed live checks on 6 Nov (H016)", "Verified (corrected 6 Nov)"),
 (9, "P05 quote: 'It provides contextual explanations, clarifies available options, and helps users make informed decisions.'", "Owner-provided P05 feedback (final brief Part 7)", "1 participant", "Qualitative feedback", "Not a usability score or retention result", "Verified (as provided)"),
 (9, "P03, P04 feedback not yet collected; no formal task-based tests", "Owner brief; no session records exist", "—", "Status", "Below assignment's 3-user ask", "Verified"),
 (9, "90% release bar not claimed (speaker notes only; 22/25 = 88% historical; 23/25 is regression, not validation)", CMP, "25", "Status", "Not shown on the slide face", "Verified"),
 (10, "Guardrails in MVP now (15 checks, reviewed facts, fallback, code-decided eligibility, simulated actions, PAN/OTP/account blocking, anonymous events)", CMP + "; source code 231973d", "—", "System", "—", "Verified"),
 (10, "Facts verified by hand 26 Oct–5 Nov; no automatic refresh", "lib/companion/kb.mjs SOURCE_META", "—", "System", "Groww cancel page re-read 5 Nov", "Verified"),
 (10, "Risks: Groq free-tier quota/availability; live AI in both apps; engine synthesis 1 smoke test; Gemini routes (/check, /research, Lab) on but untested; tax and secret-request fixes not deployed; all actions simulated; no Groww account or payment integration", PRODREF + "; " + "claude/mvp/companion_v32_postfix_regression.md", "—", "Status", "Gemini routes never exercised; not described as validated", "Verified"),
 (10, "Next steps 1–6: fix cancellation semantic check; evaluate engine live AI; test Gemini routes; collect real feedback; Groww first-SIP user tests; retention experiment", "Proposal (6 Nov release brief)", "—", "Proposal", "Not achieved results", "Verified (labelled as proposals)"),
 (10, "Risk 1 'Wrong facts · open': 15 checks + human audit, yet a reworded cancel claim got past", "claude/mvp/companion_v32_postfix_regression.md (6 Nov 2026); results lib/companion/eval_v32_postfix_regression_231973d.json (branch eval-postfix-results, commit 1b6ae0a)", "—", "Status", "Cancellation validation not fully resolved", "Verified"),
 (10, "Risk 4 'Wrong options': code decides which actions are eligible; review before confirm. Risk 5 unchanged: no urgency, Pay never default, Stop as easy", CMP + "; source code 231973d", "—", "System", "Wording about eligibility is checked by text patterns, not meaning", "Verified"),
 (10, "Risk 8 'Real transactions': simulated, no money moves, no Groww account; blocks PAN, OTP (separate safeguard from eligibility)", "Source code 231973d/23cf859 (simulated actions, PII block); " + PRODREF, "—", "System", "No real account or payment integration exists", "Verified"),
 (10, "Open validation requirement: every AI statement about whether an action is allowed, and when, must be checked against code-computed eligibility by meaning, not text patterns", "claude/mvp/companion_v32_postfix_regression.md (6 Nov 2026); results lib/companion/eval_v32_postfix_regression_231973d.json (branch eval-postfix-results, commit 1b6ae0a)", "—", "Requirement (proposal)", "Not built; derived from the H016 finding", "Verified (labelled as requirement)"),
 (10, "Next/monitor items and next validation steps (step 1: check eligibility claims by meaning; re-test)", "Proposal", "—", "Proposal", "Not achieved results", "Verified (labelled as proposals)"),
]

removed = [
 ("Old cover title 'A first SIP shouldn't end by accident.'", "Replaced", "Brief asked for a cash-flow-centred opening; new title states the hypothesis"),
 ("'Survivor sample: all 5 active per the log'", "Corrected", "P03 stopped (owner clarification); now 4/5 active"),
 ("'Failed auto-debit 1/5'", "Corrected", "P04 confirmed an actual instalment error → 2/5 failed debit or error; P05 moved to 'missed on purpose'"),
 ("P02 'Groww-eligible' (dashed/conflicting)", "Corrected", "P02 uses Zerodha Coin"),
 ("P05 'Missed twice when pocket money was late' tagged as possible failure", "Corrected", "Intentional missed contributions, not a failed auto-debit"),
 ("Slide 8 '25/27 LLM golden set, 37/37, 24/24, 16/16' and 'Live LLM off since 2 Nov'", "Removed / replaced", "Outdated; replaced by v3.2 results (22/25, 20/25, 107/107 tuned, 16/16, 24/24) with mode, build and tuning status"),
 ("Slide 9 'MVP user tests: 0 of 5 run; T1–T5 pass bars'", "Removed", "T1–T5 protocol not used; replaced by P05 qualitative feedback and explicit limitation"),
 ("Slide 9 proposed A/B 'recovery 40% → 45%; 1,534 per arm'", "Removed", "Not supported by evidence; experiment is listed as a next step without numbers"),
 ("Slide 10 'Stop if mismatch > 0.5%' thresholds", "Removed", "Proposed thresholds, not grounded in data"),
 ("Slide 3 '2,518 → 450 selection partly documented'", "Corrected", "Now 'not documented, cannot be reproduced' per Engine 2.1 methodology"),
 ("Slide 6 policy claim 'Funds due 4 days before debit'", "Removed", "Not needed for the argument; not re-verified for this deck"),
 ("Companion 3.2.1 metrics (47/47 regression, 360/360 cancellation matrix, 22/25 rule-based post-fix)", "Excluded", "3.2.1 is not deployed; brief says include only if deployed"),
 ("Any engine live-AI evaluation", "Excluded", "Live AI disabled; only mocked contract tests exist, which are not evaluation"),
 ("[5 Nov deck] Slide 9 'Post-fix live run on final build: Pending'", "Replaced", "Run completed 6 Nov: 23/25 on the same 25 inspected cases, shown as regression with H016, H019, H021, H025 findings"),
 ("[5 Nov deck] Slide 9 'The 1 error, \"pay before cancelling\", is now blocked'", "Corrected", "Blocked only in its original wording; the passive form passed live checks on 6 Nov (H016)"),
 ("[5 Nov deck] Slide 9 title 'Safeguards tested; retention impact not yet established'", "Replaced", "Now 'Most safeguards hold; a cancellation error slipped through'; month-12 impact stays in the 'Not yet shown' segment"),
 ("[5 Nov deck] Slide 9 'Not yet shown: live re-test of final build is pending'", "Replaced", "Now 'cancellation answers not fully validated'"),
 ("[5 Nov deck] Slide 10 risk 1 'Only reviewed facts; 15 checks; human audit'", "Corrected", "Marked open: a reworded cancel claim got past the checks"),
 ("[5 Nov deck] Slide 10 next step 1 'Live re-test of final build'", "Replaced", "Done 6 Nov; now 'Check eligibility claims by meaning; re-test'"),
 ("[6 Nov deck] Slide 3 'Research Assistant: deterministic answers only; live AI switched off since 5 Nov'", "Replaced", "Live AI enabled 6 Nov; one grounded smoke test; not yet evaluated live"),
 ("[6 Nov deck] Slide 8 old Companion UI screenshots and build 231973d", "Replaced", "New Groww-inspired UI screenshots from 23cf859 (rule-based, labelled); production build 23cf859"),
 ("[6 Nov deck] Slide 9 title 'Most safeguards hold; a cancellation error slipped through'", "Replaced", "'Live AI deployed; factual validation still has a gap'"),
 ("[6 Nov deck] Slide 9 'Discovery Engine assistant: 7/10 … deterministic (live AI off)'", "Corrected", "Live since 6 Nov; 7/10 and 26/26 labelled deterministic-only; smoke test not presented as a score"),
 ("[6 Nov deck v2] Slide 9 '23/25 … regression, not validation' and strip 'Human review caught what the checks missed'", "Clarified", "23/25 labelled machine-scored post-fix regression; strip states H016 was scored as a pass and found by later human review; H019 kept as a separate wording concern"),
 ("[6 Nov deck v2] Slide 10 risk 4 'Code decides eligibility; all actions simulated' and risk 8 'No real integration'", "Separated", "Risk 4 = eligibility decided by code (wrong options); risk 8 = simulation prevents real transactions; different safeguards"),
 ("[6 Nov deck] Slide 10 risks 'AI downtime', 'Stale policy', 'Privacy' and 5 next steps", "Replaced", "Quota, unevaluated live AI and no-integration risks added (stale-policy recheck folded into risk 1; privacy into risk 8); 6 prioritised next steps"),
]

wb = Workbook()
ws = wb.active; ws.title = "Claim audit"
hdr = ["Slide", "Exact claim", "Source", "Denominator", "Evidence type", "Confidence / limitation", "Verification"]
ws.append(hdr)
for r in rows: ws.append(list(r))
F = Font(name="Arial", size=10); FB = Font(name="Arial", size=10, bold=True, color="FFFFFF")
for c in ws[1]: c.font = FB; c.fill = PatternFill("solid", fgColor="4B2BA8"); c.alignment = Alignment(wrap_text=True, vertical="center")
for row in ws.iter_rows(min_row=2):
    for c in row: c.font = F; c.alignment = Alignment(wrap_text=True, vertical="top")
for col, w in zip("ABCDEFG", [7, 60, 48, 18, 20, 34, 26]): ws.column_dimensions[col].width = w
ws.freeze_panes = "B2"
n = len(rows) + 1
t = Table(displayName="ClaimAudit", ref=f"A1:G{n}"); t.tableStyleInfo = TableStyleInfo(name="TableStyleLight1", showRowStripes=True); ws.add_table(t)

w2 = wb.create_sheet("Corrected or removed")
w2.append(["Original claim (NL_Groww_Final, 2 Nov, unless marked 5 Nov)", "Action", "Reason"])
for r in removed: w2.append(list(r))
for c in w2[1]: c.font = FB; c.fill = PatternFill("solid", fgColor="4B2BA8")
for row in w2.iter_rows(min_row=2):
    for c in row: c.font = F; c.alignment = Alignment(wrap_text=True, vertical="top")
for col, w in zip("ABC", [60, 18, 70]): w2.column_dimensions[col].width = w

w3 = wb.create_sheet("Summary")
w3.append(["Measure", "Value", "Note"])
w3.append(["Claims audited", f"=COUNTA('Claim audit'!B2:B{n})", "Rows in the claim audit"])
w3.append(["Rows marked Verified*", f"=COUNTIF('Claim audit'!G2:G{n},\"Verified*\")", "Includes 'Verified (…)' variants"])
w3.append(["Rows marked Corrected*", f"=COUNTIF('Claim audit'!G2:G{n},\"Corrected*\")", "Participant corrections applied"])
w3.append(["Claims corrected or removed from old deck", f"=COUNTA('Corrected or removed'!A2:A{len(removed)+1})", ""])
w3.append(["Slides", 10, "PPTX and PDF"])
w3.append(["Minimum font size (pt)", 14, "Checked on every text run with python-pptx"])
for c in w3[1]: c.font = FB; c.fill = PatternFill("solid", fgColor="4B2BA8")
for row in w3.iter_rows(min_row=2):
    for c in row: c.font = F
for col, w in zip("ABC", [42, 12, 50]): w3.column_dimensions[col].width = w
wb.save("Groww_PM_Fellowship_Claim_Audit.xlsx")
print("rows", len(rows))
