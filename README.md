# SIP Continuation · Groww case study

A first SIP can end without anyone deciding to stop it. This app holds:

- `/engine`: the AI discovery engine (19,005 public posts; payment failure ranks first).
- `/companion`: the SIP Companion MVP. A status card plus an AI companion whose replies pass 9 coded safety checks and a confidence bar before they are shown. Otherwise a safe reply built from the SIP's data is shown.
- `/eval`: the release gate. 27 locked scenarios run on the live model; a deployment is promoted only if it passes.
- `/metrics`: live, aggregate-only usage and user-test results (Supabase).

## Environment variables (Vercel)
- `ANTHROPIC_API_KEY`: server-side only. Set a spend limit on the key.
- `ANTHROPIC_MODEL`: defaults to `claude-haiku-5-5`.
- `EVAL_TOKEN`: lets the release script run `/api/eval` and record results.

## Eval-gated release
1. Push → Vercel builds a preview.
2. `POST {preview}/api/eval` with header `x-eval-token`.
3. Promote the preview to production only if the response says `"passed": true`.

Independent concept, not affiliated with Groww. Not investment advice.
