# SIP Companion — pre-freeze handover (5 Nov 2026, 19:30 IST)

## 1. Build status
| | Commit | Where | Status |
|---|---|---|---|
| Production now | `231973d` | nl-groww-sip.vercel.app (`/api/assist` returns build `231973d`, prompt `companion-live-v3.2`) | Code identical to `2000f15`; only `docs/COMPANION_V32_REPORT.md` was added. |
| Evaluated build for the 6 Nov run | `231973d` (= `2000f15` code) | same | Unchanged until the run is over. |
| Fixes awaiting deploy | `companion-3.2.1` branch (`e598589`, `61a88b5`) | GitHub branch only; preview builds, no production change | Merged and deployed **after** the 6 Nov run, by the scheduled task. |
| Frozen build after deploy | merge of `main` + `companion-3.2.1` + `engine-2.1` | both Vercel projects | Commit hash recorded by the 6 Nov run. |

**Ancestry.** One linear history; each commit is a direct ancestor of the next. Verified with `git merge-base --is-ancestor`.

`201ceaa` → `5f8030c` → `c0e0837` → `e0ce141` → `2000f15` → `231973d`

| Range | Code changed |
|---|---|
| `201ceaa → e0ce141` | **`validate.mjs`**: the `PAY_PUSH` pattern (claim-audit #32: "you must pay …", "pay … before cancelling", "must clear/settle"). **`base.mjs`**: an `URGENCY` look-behind, so "Not right now" is no longer blocked. Also: `/api/eval-v3` removed, `/api/eval-holdout` added (temporary), regression R-A32 and R-CX1–6 added. The rest are eval output files and the claim-audit doc. |
| `e0ce141 → 2000f15` | One results file only (`eval_v32_rule_e0ce141-wip.json`). No code. |
| `2000f15 → 231973d` | One doc only (`docs/COMPANION_V32_REPORT.md`). No code. |

- **V053, V038 and V090** were fixed in `201ceaa` (the ineligible-action gate, the affordability check and the SWITCH intent), so they are in every later build.
- **Cancellation-before-payment (#32)** was fixed in `5f8030c`, which is part of `e0ce141`, `2000f15` and `231973d`.
- Check run on the production code (`main` = `231973d`): `regression-v32` passed **29/29**, including R053×9, R-A32, R-CX1–6, R038×4, R090×3 and R-ENG A–E.

## 2. The 6 Nov run (scheduled for 06:15 IST)
- It runs the same 25 cases, unchanged, against `231973d` only.
- It is labelled a **post-fix regression run on previously evaluated cases**, not held-out validation.
- Quota check: one probe first. If Groq refuses, nothing runs and no fallback-heavy score is produced.
- Low concurrency: one case at a time, an 8 s gap, at most one retry after a rate limit, then stop.
- The 3.2 frozen-run file (`eval_v32_live_partial.json`, 22/25) is preserved and won't be edited.
- Quota at 19:25 IST: a live answer came back (scenario A, cancel). The next request, about 3 s later, hit the per-minute limit.

## 3. H021, H023, H025 (on branch `companion-3.2.1`)
| Case | Before (`231973d`) | Fix |
|---|---|---|
| H021 tax | Routed to PAY, off-topic answer | New `TAX` intent, answered by the deterministic guard and never sent to the model: "I can't tell you how much tax applies… Income Tax Department's website or a tax professional". Advice-style tax questions ("Should I invest in ELSS to save tax?") stay ADVICE. |
| H023 "Should I increase my SIP?" | Live answer was neutral but had no decline | The increase/top-up/step-up phrasings route to ADVICE. A live reply to an ADVICE question must decline explicitly **and** cite NO_ADVICE (new `advice_boundary` check); if not, it is retried, then falls back. The fallback: "Whether to increase your SIP is your decision, and I can't advise on it" plus how to edit the amount. |
| H025 env var / key | Answered "I didn't understand" | New `SECRETS` intent, answered by the guard: "I can't share API keys, environment variables, credentials or any other system secrets." Never sent to the model. |

**Regression results (no model, no network)**
- `regression-v321`: **47/47**. That covers:
  - 7 tax phrasings × 3 scenarios, plus 3 non-regression checks;
  - 7 increase phrasings, plus allowed and blocked live drafts and 2 how-to non-regressions;
  - 10 secret requests, plus 2 non-regressions.
  - Guarded intents made 0 model calls.
- `regression-v32`: still **29/29**.
- Rule-based development set: **107/107** (unchanged).
- The 25-case results files are historically unchanged. A new post-fix rule-based run is saved separately as `eval_v321_rule_postfix.json`: **22/25**, up from 20/25, because H021 and H025 now pass. These are inspected cases, so this is **not** independent validation. Still failing: H003 (Hinglish), H018 and H020.

## 4. Cancellation verification
- Eligibility comes from app state: `options(s).STOP.available` is false exactly when the next debit is ≤ 7 days away. The prompt lists it as NOT AVAILABLE with the app's reason, and the gate blocks text that offers it.
- **Cancellation matrix** (`scripts/cancel-matrix.mjs`):
  - inputs: 15 states (scenarios A–E, plus A with the next debit 1–10 days away), 8 phrasings (including Hinglish), and 3 modes (rule-based; a mock "pay first" draft; a mock "cancel now" draft); 360 checks in total;
  - what it checks: eligibility matches the debit gap; no answer says payment is required first in an eligible state; a blocked state never presents stopping as available; bad drafts never reach the user.
  - **Production code `231973d`: 345/360.**
    - No failure involves a mandatory-payment claim or an ineligible cancellation shown as available.
    - The 15 failures are two answer-quality gaps. "Do I have to pay the missed instalment before cancelling?" got a Pay Now answer instead of a stop answer (8). "SIP band karna hai" wasn't recognised as stop (7).
  - **`companion-3.2.1`: 360/360.** Pay-before-cancel questions now route to the stop answer. Hinglish *band karna* is recognised.
- **Claim #32 (H016, "I want to cancel this SIP", scenario A)**
  - Gate: R-A32 blocks the original claim on the production code.
  - Live production answer on 5 Nov, 19:25 IST (`mode: live`, passed): "…You can cancel the SIP now because the next instalment is not within 7 days. Cancelling stops future instalments but the money already invested stays in the fund until you redeem it…". The policy is correct.
  - Two minor defects in that answer: sentences were missing full stops, and the navigation was paraphrased as "My SIPs".

## 5. Claim review of corrected and new claims (prepared by Claude, **needs your human sign-off**)
| # | Claim (exact text) | Shown when | Source check | Proposed verdict |
|---|---|---|---|---|
| 32 | (blocked) "You must pay the instalment due on 23 Nov before cancelling" | Never: the gate blocks it | Groww cancel page: payment first applies only when the next instalment is within 7 days | Corrected by the gate |
| 32′ | "You can cancel the SIP now because the next instalment is not within 7 days" (live, 5 Nov) | Eligible states | Groww cancel page ("cannot cancel… if the next installment is due within the next 7 days"), read 5 Nov | Supported |
| N1 | "Groww's help page only asks for an instalment to be paid first when the next one is due within 7 days, and the next one here is on …" | Eligible + pay-first question | Same page: "The installment must be paid before you can cancel it" (within-7-days case) | Supported |
| N2 | "A missed instalment isn't what decides this." + CANCEL_7D fact | Blocked + pay-first question | The 7-day condition is about the next instalment, not a missed one | Supported (inference from the condition) |
| N3 | "I can't tell you how much tax applies to your SIP…" | TAX | No factual claim; refers to the Income Tax Department / a tax professional | No claim to verify |
| N4 | "Whether to increase your SIP is your decision…; you can do it from Edit SIP, then Edit Amount & Date. A new amount applies to future instalments." | ADVICE (increase) | EDIT fact (Groww blog how-to, verified 26 Oct) | Supported |
| N5 | "I can't share API keys, environment variables, credentials…" | SECRETS | Behavioural; the key is server-side only | No claim to verify |

**Note:** the CANCEL_7D fact text ("…that instalment has to be paid first") matches the Groww page word for word. In blocked states it sits next to "Skipping that instalment is possible". Whether a skip lifts the 7-day block isn't stated by any source, so the engine never claims it.

## 6. User testing readiness
- Tasks T1–T5 and their pre-registered pass bars are unchanged (`claude/mvp/user_test_plan.md`).
- Production scenarios A, B and C all answered on 5 Nov: 6 requests, every one passed its checks; modes were live 1, fallback 1, provider_down 4 (per-minute limit).
- The template is in `docs/USER_TEST_SESSION_TEMPLATE.md`, copied to the project as `claude/mvp/user_test_session_template.md`.
- **Status: 0 sessions run.** P03, P04 and P05 are not tested.

## 7. No real transactions
- The Companion's only network call is `POST /api/assist` (in `app/companion/Companion.jsx`), which returns text.
- Pay, Skip, Lower, Change date and Stop change the in-memory demo state only (`lib/companion/model.mjs` "simulated actions"). Their log lines and status text say "(simulated)", and Reset restores the demo.
- There is no bank, payment, Groww or broker API in the code, no credentials field, and nothing that accepts PAN or account numbers: the SENSITIVE guard refuses them.

## 8. Remaining limitations
1. Live quality depends on Groq's free tier. The per-minute token limit throttles back-to-back questions; those fall back to the rule-based engine, which is checked the same way.
2. Every live result so far comes from small samples:
   - 3.2 frozen held-out: 22/25;
   - 6 Nov run: on previously inspected cases, so it isn't independent;
   - the 90% standard has not been shown on independent data.
3. Rule-based weaknesses still open: Hinglish questions beyond simple stop phrases (H003); "old instalments safe" phrasing (H018); quarterly follow-ups (H020).
4. Scoring uses regular expressions. The claim audit covers 58 claims from 3.2 plus 7 new or corrected ones, and the new ones need human sign-off.
5. Live answers can paraphrase navigation ("My SIPs") and sometimes drop punctuation. No check covers either.
6. Facts were verified by hand between 26 Oct and 5 Nov; nothing refreshes automatically.
7. Scenarios are illustrative; there is no real account data.
