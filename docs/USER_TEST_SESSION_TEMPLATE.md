# SIP Companion — user test session record (P03, P04, P05)

One copy per participant. Fill it in **during or straight after a real session**. If a session didn't happen, leave the file blank and mark it "Not run". Never fill it from memory of a different session, or from guesses.

Tasks and pass bars were pre-registered on 27 Oct 2026 (`claude/mvp/user_test_plan.md`). **Do not change them.**

**Do not collect:** names, phone numbers, PAN, account or folio numbers, portfolio screenshots, or screenshots of the participant's real Groww app.

---

## Session details
| Field | Entry |
|---|---|
| Participant code | P0_ |
| Date and time (IST) | |
| Moderator | (initials only) |
| Format | In person / video call |
| Device and browser | e.g. Android phone, Chrome |
| Companion URL used | https://nl-groww-sip.vercel.app/companion |
| Build shown at `/api/assist` (field `build`) | |
| Recording | None / audio only (with consent) / notes only |
| Consent read aloud and agreed | Yes / No (if No, stop) |

## Screener (confirm segment)
| Question | Answer |
|---|---|
| First SIP started within the last 12 months? | Yes / No |
| SIP status today | Active / paused / stopped / had a failed instalment |
| Ever missed, skipped, paused or stopped an instalment? | |
| Income pattern (fixed salary / variable / stipend / other) | |

## Reminder read to participant
"This is a prototype with made-up SIPs. Nothing you tap touches a real account or moves real money. It doesn't give investment advice. Please think aloud."

## Tasks
For each task, record the time from the moment the prompt is read until completion. Mark a step as a *pause* when it lasts more than 5 seconds.

| Task | Scen. | Prompt read aloud | Measure | Result (raw) | Pass bar | Met? |
|---|---|---|---|---|---|---|
| T1 | A | "What's happened to this SIP?" | Says a 3rd miss cancels it, unprompted | Said it: Yes / No | ≥ 4 of 5 | |
| T2 | A | "Keep this SIP running." | Reaches a review screen for any fix; time in s | Reached: Y / N · ___ s · which fix: | ≥ 4 of 5, median < 60 s | |
| T3 | C | "Money's tight for 2 months. Do what you'd do." | Saw 2+ options before choosing | Options seen: ___ · chose: ___ | 5 of 5 | |
| T4 | A | "Now stop this SIP." | Time to find Stop vs time to find Pay (T2) | Stop ___ s vs Pay ___ s | Stop ≤ Pay | |
| T5 | B | "Ask why, then which fund to pick." | Pushiness rating 1–5 (participant) | ___ / 5 | Everyone ≤ 2 | |

**Per-task notes.** For each task, record:
- the first tap;
- each pause over 5 s, with where it happened;
- the participant's own words for a failed debit;
- any moment they thought something real happened.

- T1:
- T2:
- T3:
- T4:
- T5:

## Answer quality observed
For each Companion reply that the participant relied on, record:
- the mode shown under the reply (Live AI / fallback / safety guard);
- anything the participant found wrong, confusing or pushy.

| # | Task | Question typed | Mode shown | Issue (if any) |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |

## Ratings (1 = strongly disagree, 5 = strongly agree; bar = median ≥ 4)
| Statement | Rating |
|---|---|
| I understood what happened to my SIP. | |
| I felt in control of what to do. | |
| I'd use this if my SIP had a problem. | |

## Closing questions
- What would make you more likely to keep your SIP going?
- What do you do today when you're unsure about your SIP? (outside the app)
- Anything that felt like advice or pressure?

## Moderator summary (after the session)
- Biggest problem observed:
- Quote worth keeping (verbatim, no identifying details):
- Change suggested for the next iteration:

## Integrity check
- [ ] This record describes a session that actually took place on the date above.
- [ ] No personal or financial identifiers were collected.
- [ ] Results were entered without being edited to meet a pass bar.
