# Discovery Engine 2.1 — release report (5 Nov 2026)

## Deployment
- Production: https://nl-groww-engine.vercel.app — deployment `dpl_ED8FeFiaa6e4NfKZSfByHRX5s1Y3`, branch `engine-2.1`, commit `c5672a4`.
- Deployed as an engine-only production build from the branch (promoting the preview returned HTTP 422). The SIP Companion was not redeployed: its production stays on `231973d` and its environment was not changed.
- `engine-2.1` is not yet on `main`. It merges cleanly. The scheduled Companion run (6 Nov) merges it before pushing `main`, so the engine is not reverted.

## Live AI status: disabled for the whole release
- Flag: `DISCOVERY_LIVE_AI_ENABLED=false`, set only on the engine Vercel project (production, preview and development). Only the exact value `true` enables live AI, and that requires the owner's explicit approval.
- When the flag is off on `SITE=engine`, `callClaude`, `liveFor` and the Groq client all refuse with `live_disabled`. The engine also builds no synthesis prompt.
- `GET /api/agent` on production returns `live:false`, `mode:"deterministic"`, `models:[]` and status "Deterministic research mode · Live AI temporarily disabled". The status is shown on the Research Assistant page.
- No Groq or other LLM inference request was made from the Discovery Engine in this work: no health checks, no live evaluations, no test questions.
- The production check used five deterministic `POST /api/agent` calls (overview, advice decline, first-hand count, and a multi-turn follow-up). Runtime logs show `mode:"deterministic"` for each, with 0–34 ms server time.
- The live-synthesis path (`lib/discovery/live.js`) is implemented but untested against a real model. Its contract tests use mocked generators only and must not be reported as live AI evaluation.

## What changed, by section of the brief
| Area | Status |
|---|---|
| Sampling and selection transparency | Done. Methodology has a `#sampling` section answering the ten questions. Wherever a step wasn't recorded, it says "not recorded". |
| Rejected-records audit | Done, without fabrication. 16,487 records were removed by the filters and 2,068 passed the filters but were not coded. Neither set was retained and no reasons were stored, so no rejection categories or examples are shown. |
| Representativeness warning | Shown on Overview, Methodology, Opportunities and in the assistant's limits: the coded sample prioritises mechanisms and is not a prevalence estimate. |
| AI quality by round | Done. κ was 0.15, 0.29 and 0.50 across the three rounds; round-3 raw agreement was 11/20. Label types: 450 AI, 60 human-checked, 38 with disagreement, 29 reconciled, 0 independently adjudicated. |
| Evidence Explorer denominators and provenance | Done. Shows the filters applied, the selection boundary and the denominator. |
| Reproducible scoring and sensitivity | Done. A per-driver breakdown shows each score's components, scales, supporting and challenging IDs, and the threshold that would change the order. Scores are recomputed from the records on every build: 0 of 8 mismatch. |
| Investor Check grounding and privacy | Done. Answers are split into: what similar investors reported, what official sources say, what we can't verify, and what you can check next. Privacy text now says what is actually stored (anonymous Supabase events and request logs) and that no AI provider is used while live AI is off. |
| Offline evaluation | Done. See below. |

## Offline evaluation (deterministic engine; network calls trapped: 0)
| Set | Result | Notes |
|---|---|---|
| Development (26 questions) | 26/26 | Citations, quotes and denominators valid 26/26; unsafe 0; multi-turn 4/4. **Tuned on: not independent validation.** |
| Locked held-out (10 questions, hash in `docs/ENGINE_HOLDOUT_LOCK.txt`) | **7/10** (first run 6/10) | Unsafe 0. The 6→7 change came from fixing a scorer label mismatch ("injection" vs "blocked"), not from changing the engine. |

- Held-out failures, left unfixed (no tuning on held-out):
  - EH02: "Was the sample random?"
  - EH03: "What percentage of investors lapse?"
  - EH06: "Continuers vs lapsers".
- Total questions: 36. No result here comes from a live model.
- The data-integrity and flag tests all pass. They cover:
  - counts: 19,005 collected; 62% Reddit; 450 coded; 409 first-hand; 352/50/48;
  - driver counts and score recomputation;
  - κ by round;
  - Investor Check constants matching the data;
  - the kill switch.

## Limitations
- The 2,518 → 450 selection is undocumented and cannot be reproduced.
- 390 of the 450 labels are AI-only. First-hand status was never human-checked.
- Reddit makes up 62% of everything collected. The coded set is mostly lapse stories by design.
- Held-out accuracy is 7/10 on a small set, so this is not a validated research assistant.

## Re-enabling live AI later (owner approval required)
1. Set `DISCOVERY_LIVE_AI_ENABLED=true` on the engine project, keeping `GROQ_API_KEY` server-side.
2. Redeploy the engine.
3. Run the locked held-out set once, live, and report it separately from the mocked contract tests.

Live AI must not switch on automatically.
