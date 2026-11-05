# Claim-level grounding audit: frozen build 201ceaa (5 Nov 2026)

**Method.** I extracted 58 material factual claims from 15 answers produced by the frozen run (build 201ceaa, prompt companion-live-v3.2). The answers are 10 live AI answers (Qwen 3.8 27B or GPT-OSS 20B) and 5 rule-engine answers. Each claim was checked by hand against:
- the exact fact text in `lib/companion/base.mjs`,
- the source metadata in `lib/companion/kb.mjs` (all last verified 26 Oct–2 Nov 2026, 3–10 days before the audit),
- the scenario data (today = 26 Oct 2026).

**Columns:**
- **Correct:** is the claim true?
- **Supported:** does a reviewed fact the answer could cite support it?
- **Conditions:** are the conditions and exceptions represented accurately?
- **Applies:** does the claim fit this scenario?

This is a **human** check. It is separate from the automated "expected source cited" metric, which only checks that a case cited one expected fact ID.

| # | Case (mode) | Claim | Correct | Supported by | Conditions | Applies |
|---|---|---|---|---|---|---|
| 1 | H002 (live, D) | SIP has been running for 8 months | ✓ | scenario (Mar–Oct) | ✓ | ✓ |
| 2 | H002 | Each instalment buys units of the scheme | ✓ | UNITS_NAV (SEBI FAQ) | ✓ | ✓ |
| 3 | H002 | NAV is the market value of what the scheme holds | ✓ | UNITS_NAV | ✓ | ✓ |
| 4 | H002 | NAV changes every working day | ✓ | UNITS_NAV | ✓ | ✓ |
| 5 | H005 (live, E) | Running for 8 months | ✓ | scenario | ✓ | ✓ |
| 6 | H005 | Next instalment due 26 Nov | ✓ | scenario | ✓ | ✓ |
| 7 | H005 | Today's payment is being processed | ✓ | scenario (pending) | ✓ | ✓ |
| 8 | H005 | No failure recorded yet | ✓ | scenario | ✓ | ✓ |
| 9 | H005 | Final result not known yet (stated twice: a clarity defect) | ✓ | scenario | ✓ | ✓ |
| 10 | H007 (live, A) | Two instalments failed in a row | ✓ | scenario | ✓ | ✓ |
| 11 | H007 | A monthly SIP is cancelled after 3 consecutive failures | ✓ | CANCEL_RULE (Groww Help + AMFI) | ✓ (monthly) | ✓ |
| 12 | H007 | One more missed instalment triggers cancellation | ✓ | CANCEL_RULE | ✓ ("missed" here means failed; skips are covered in the next claim) | ✓ |
| 13 | H007 | Skipped instalments don't count toward the limit | ✓ | SKIP_NOT_FAIL (AMFI) | ✓ | ✓ (the citation wasn't checked: this wording slips past the `rules_cited` phrase list) |
| 14 | H010 (live, D) | October instalment failed due to low balance | ✓ | scenario (confirmed) | ✓ | ✓ |
| 15 | H010 | Pay Now available until 27 Oct | ✓ | PAY_NOW (2 working days from 23 Oct, a Friday) | ✓ | ✓ |
| 16 | H010 | Only worth it if the money is comfortably there | ✓ | product principle (not a policy) | n/a | ✓ |
| 17 | H010 | Pay Now button is on the dashboard | ✓ | PAY_NOW ("mutual fund dashboard") | ✓ | ✓ |
| 18 | H013 (engine, A) | Can lower future instalments ₹3,000 → ₹2,000 | ✓ | EDIT (Groww blog) | ✓ | ✓ |
| 19 | H013 | 23 Nov instalment would be ₹2,000 if processed in time | ✓ | EDIT + scenario | ✓ (timing hedged) | ✓ |
| 20 | H013 | Doesn't change anything already paid or missed | ✓ | partly: EDIT changes amount and date only; not stated explicitly | ✓ | ✓ |
| 21 | H013 | Each fund sets its own minimum | ✓ | SIP_MIN | ✓ | ✓ |
| 22 | H013 | App shows the processing time when you confirm | ✓ | EDIT ("estimated processing time") | ✓ | ✓ |
| 23 | H015 (engine, D) | Next instalment ₹3,000 on Mon, 23 Nov | ✓ | scenario (23 Nov 2026 is a Monday) | ✓ | ✓ |
| 24 | H015 | Skip an upcoming instalment from Edit SIP | ✓ | SKIP | ✓ | ✓ |
| 25 | H015 | A skipped instalment isn't counted as a failure | ✓ | SKIP_NOT_FAIL | ✓ | ✓ |
| 26 | H015 | Instalments continue the month after | ✓ | partly: SKIP confirms one month is skipped | ✓ | ✓ |
| 27 | H015 | A longer pause couldn't be confirmed | ✓ | honest limit (no source covers it) | ✓ | ✓ |
| 28 | H016 (live, A) | Next instalment due 23 Nov | ✓ | scenario | ✓ | ✓ |
| 29 | H016 | Cancelling stops future payments; invested money stays | ✓ | CANCEL_HOW | ✓ | ✓ |
| 30 | H016 | You can cancel the SIP from the app | ✓ | CANCEL_HOW; Stop is eligible in A (28 days to the next debit) | ✓ | ✓ |
| 31 | H016 | Can't be undone; can start a new SIP later | ✓ | CANCEL_FINAL | ✓ | ✓ |
| **32** | **H016** | **"You must pay the instalment due on 23 Nov before cancelling"** | **✗** | CANCEL_7D applies only when the next debit is within 7 days | **✗ condition misapplied** | **✗ (28 days away)** |
| 33 | H016 | Cancelling is blocked if the next payment is due within 7 days | ✓ | CANCEL_7D | ✓ | ✓ as a general rule |
| 34 | H017 (live, D) | Stopping prevents future instalments | ✓ | CANCEL_HOW | ✓ | ✓ |
| 35 | H017 | Money already invested stays invested | ✓ | CANCEL_HOW | ✓ | ✓ |
| 36 | H017 | Units aren't automatically returned to the bank | ✓ | CANCEL_HOW ("until you choose to redeem") | ✓ | ✓ |
| 37 | H017 | You must redeem to withdraw | ✓ | CANCEL_HOW, REDEEM | ✓ | ✓ |
| 38 | H017 | Redeem holdings in the app | ✓ | REDEEM (Groww Help) | ✓ | ✓ |
| 39 | H017 | Money usually reaches the bank in 3–4 working days | ✓ | REDEEM | ✓ ("usually") | ✓ |
| 40 | H018 (live, A) | Two consecutive failed instalments | ✓ | scenario | ✓ | ✓ |
| 41 | H018 | Units already bought remain invested after a failed instalment | ✓ | weak: true by construction (a failed debit buys nothing); no source says it directly | ✓ | ✓ |
| 42 | H018 | Options: pay, change date, lower, skip, stop | ✓ | app eligibility for A | ✓ | ✓ |
| 43 | H020 (live, A, follow-up) | Quarterly SIPs cancel after 2 consecutive misses | ✓ | CANCEL_RULE ("quarterly or longer: 2") | ✓ | ✓ (general rule; this SIP is monthly) |
| 44 | H023 (live, C) | SIP is ₹3,000 a month | ✓ | scenario | ✓ | ✓ |
| 45 | H023 | Next instalment on 28 Oct | ✓ | scenario (Wed) | ✓ | ✓ |
| 46 | H023 | Can change the amount to ₹5,000 | ✓ | EDIT | ✓ (no processing-time caveat; the 28 Oct debit is 2 days away) | ✓ (the case still fails: no advice decline) |
| 47 | V001 (live, C) | A SIP invests a fixed amount at regular intervals, usually monthly | ✓ | SIP_WHAT (AMFI) | ✓ | ✓ |
| 48 | V001 | Usually through an automatic bank debit | ✓ | SIP_WHAT | ✓ ("usually" kept) | ✓ |
| 49 | V004 (live, C) | A SIP can start from ₹500 a month | ✓ | SIP_MIN (AMFI note) | ~ AMFI attribution dropped; the next claim adds the fund condition | ✓ |
| 50 | V004 | Minimum depends on the fund | ✓ | SIP_MIN | ✓ | ✓ |
| 51 | V011 (engine fallback, A) | 23 Oct instalment of ₹3,000 didn't go through | ✓ | scenario | ✓ | ✓ |
| 52 | V011 | Bank reported insufficient balance | ✓ | scenario (confirmed) | ✓ | ✓ |
| 53 | V011 | The previous instalment failed for the same reason | ✓ | scenario (Sep, confirmed) | ✓ | ✓ |
| 54 | V011 | 2 in a row; a monthly SIP cancels after 3 in a row | ✓ | CANCEL_RULE | ✓ | ✓ |
| 55 | V011 | Pay Now is open until Tue, 27 Oct | ✓ | PAY_NOW + scenario | ✓ | ✓ |
| 56 | V014 (engine fallback, B) | 1 missed in a row; nothing changes yet | ✓ | scenario + CANCEL_RULE | ✓ | ✓ |
| 57 | V014 | Check KYC, autopay mandate and bank balance | ✓ | CAUSES (Groww Help) | ✓ | ✓ (reason unknown, so it's framed as checks) |
| 58 | V014 | Groww lists 15 possible causes in three groups | ✓ | CAUSES | ✓ | ✓ |

## Results (58 claims)
| Measure | Live AI claims (40) | Rule-engine claims (18) | All |
|---|---|---|---|
| Correct | 39/40 | 18/18 | **57/58 (98.3%)** |
| Supported by a reviewed fact or the scenario data (explicitly) | 37/40 | 16/18 | 53/58 (91.4%) |
| Conditions and exceptions accurate | 38/40 | 18/18 | 56/58 (96.6%) |
| Applicable to the scenario | 39/40 | 18/18 | 57/58 |
| Critical policy claims correct (cancellation rule, Pay Now window, 7-day rule, eligibility) | 10/11 | 4/4 | **14/15** |

The partly supported claims are #20, #26 and #41 (true but not stated by a source) and #16 and #27 (principle or limit statements). The condition issues are #32 (misapplied) and #49 (attribution dropped).

**Source currency.** Every cited fact was verified 26 Oct–2 Nov 2026. Two sources are secondary hosts:
- the AMFI cancellation FAQ, hosted by Taurus MF;
- the SEBI FAQ, hosted by freefincal.

The lock-in explainer (Angel One) was not used in any audited claim.

## Findings
1. **#32 is a real grounding failure the gate missed.** The model applied the 7-day cancellation condition to a debit 28 days away and told the user to pay first: wrong policy plus pressure to pay. A fix was added after the frozen run (see EVAL_V32_FINAL.md). It is **not** part of the evaluated build.
2. The `rules_cited` phrase list misses paraphrases ("do not count toward this limit"), so some correct policy claims go out without a forced citation (#13).
3. Duplicate sentences (#9) are a clarity defect; none of the checks looks for them.
