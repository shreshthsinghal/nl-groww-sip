# Handoff: unify logo + restore deck visuals (written 6 Nov 2026, 19:45 IST)

Paste the "Prompt for the new session" at the bottom into a fresh Claude session attached to the
same project. Everything that session needs is in this branch (`deck-handoff` of `shreshthsinghal/nl-groww-sip`).

## Owner decisions (already made)
1. **One logo everywhere: the green tile.** Rounded square, fill `#007A59`, white rising polyline
   `13,37 23,27 30,32 43,19` (viewBox 0 0 56 56, stroke 5, round caps/joins), **no pink dot**.
   This is the mark the redesigned Companion already uses (`app/companion/Chat.jsx` → `GrowwMark`).
2. **Deck keeps its "Groww" wordmark** next to the mark (top-right of every slide). Only the mark changes to green.
   The apps keep their product names ("SIP Companion", "SIP Discovery Engine").
3. Only the logo changes colour. Do not recolour the deck palette or the engine UI.

## Task A: logo in the apps (code change + deploy; keep the change minimal)
Logo locations found (branch `companion-ui-groww`; check `engine-2.1` too, it is a separate branch):
| File | What to change |
|---|---|
| `components/Nav.js` line ~19 `brand-mark` svg | rect fill `#4127A0` → `#007A59`; remove the `<circle … fill="#FF7A8E">` |
| `app/icon.svg` (favicon, both sites) | same: green fill, no dot |
| `app/research/Research.jsx` line ~72 `de-mark` svg | same |
| `app/companion/groww.css` lines ~213–214 | the `body:has(.cx.cz) .brand-mark` override becomes redundant; can stay or be removed |
| any other `4127A0` + `FF7A8E` mark on `engine-2.1` (`git grep -n "FF7A8E" origin/engine-2.1`) | same |
Do NOT touch backend, API routes, prompts, checks, env vars, eval data.

**Deploy (important):** production deploys come from branches, not `main`.
- Companion project `prj_7G3xodIVWnoAHELJxUwoL7C9wK5G`: production = `companion-ui-groww` @ 23cf859.
  Commit the logo change on `companion-ui-groww`, then create a production deployment from that branch (Vercel MCP `create_deployment`, gitSource ref `companion-ui-groww`, target production).
- Engine project `prj_DhK2SfyEecZIviADxj8vw37pwg4Z`: production = `engine-2.1` @ 0619c87. Apply the same logo change on `engine-2.1`, deploy from it.
- Team `team_ScO71oFjWr2rjpwG6VhWKeep`. **Never push `main`** (it would redeploy both sites from old code).
- Live AI is ON in both apps (DISCOVERY_LIVE_AI_ENABLED=true, ENGINE_LIVE=1, COMPANION_LIVE=1). Do not change env vars. Verify the logo with page GETs only, no AI calls.

## Task B: deck: green logo + restore visuals from the old deck
Files in this branch:
- `deck/src/head.js` + `deck/src/slides.js`: pptxgenjs source. Build: `cat head.js slides.js > build.js && node build.js` (needs `npm i -g pptxgenjs`; `head.js` line 5 requires `/mnt/skills/public/pptx/scripts/apply_theme.js`: adjust the path if the skill lives elsewhere). Output name `Groww_PM_Fellowship_Final.pptx`; also export `NL_Groww.pdf` (LibreOffice: `soffice --headless --convert-to pdf`).
- `deck/src/img/`: all images used by slides.js (illustrations, icons, Companion screenshots `shot_n1-3.png` = new UI).
- `deck/src/audit.py`: regenerates `Groww_PM_Fellowship_Claim_Audit.xlsx` (data rows inside). Update it for any changed claim.
- `deck/output/`: the current approved deck (PPTX, PDF, claim audit) and the stale speaker-notes / Q&A PDFs.
- `deck/reference/NL_Groww_Final_OLD_with_visuals.pptx`: **the owner's older version with more visual elements.**

Logo in the deck: `mark()` in `head.js` (~line 88) draws the tile with `K.pur` and a pink dot (`K.pink`).
Change the tile fill to `007A59` and delete the dot. Keep the "Groww" wordmark.

Visual restoration: compare each of the 10 slides in the OLD deck with the current one (render both to PNG and look).
The owner says visual elements were removed. Bring back the useful ones (illustrations, icons, diagrams, photos)
and fit the current, approved content around them. Old deck slide titles for orientation:
1 GROWTH TEAM · SIP CONTINUATION CASE STUDY (1 picture) · 2 Continuation depends on five critical investor moments (5) ·
3 19,005 conversations, distilled into 8 scored lapse drivers (1) · 4 Trust leads in volume, payment failure in addressability (2) ·
5 Five interviews reveal how investors protect SIP continuity (3) · 6 Cash-flow disruption exposes a need for clearer next steps (1) ·
7 Support investors before and after a missed debit (1) · 8 Companion turns SIP status into understandable choices (4) ·
9 More first SIPs stay active, with no pressure to pay (1) · 10 Clearer SIP decisions, never pressure to pay (1).
The old deck's slide ORDER/CONTENT is older: keep the CURRENT content and figures (they are audited); only restore visuals.
Where text must be cut to make room, cut wording, not facts or limitations.

## Non-negotiable deck rules
- 10 slides max; **every text run ≥ 14 pt** (check with python-pptx); PDF < 40 MB; file name NL_Groww.pdf.
- No fellow name or email anywhere (slides, notes, metadata; author "NL_Groww").
- Keep every figure and limitation as in the current deck (e.g. slide 9: 23/25 is a *machine-scored post-fix regression*
  on the same 25 inspected cases; 18/18 live answers passed automated checks but human review found H016, scored as a pass,
  was a false "must pay before cancelling" claim; H019 separate wording concern; H021/H025 still failing; engine live = 1 smoke test,
  not an evaluation; 26/26 and 7/10 are deterministic-only).
- Slide 8 screenshots are rule-based mode and must stay labelled so; production build 23cf859.
- Slide 10 keeps eligibility (code) and real-transaction (simulation) as separate safeguards.
- Render every slide and inspect for overflow/overlap before delivering. Update the claim audit for anything changed.

## Still out of date (not part of this task unless asked)
Speaker notes PDF and Q&A prep PDF predate the 6 Nov updates. AI Evidence Log public link still not provided.

## Prompt for the new session
> Read `deck/HANDOFF.md` on branch `deck-handoff` of shreshthsinghal/nl-groww-sip (clone it) and do Task A and Task B.
> Decisions are final: green tile logo everywhere, the deck keeps the "Groww" wordmark. Work efficiently: targeted edits only,
> no live AI calls, never push `main`. Deliver the updated PPTX, NL_Groww.pdf and claim audit, and confirm both app deployments.
