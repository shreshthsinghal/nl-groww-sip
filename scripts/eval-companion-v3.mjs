// Rule-based + retrieval engine (no model) on the v3.2 sets: development (107) and locked held-out (25), reported separately.
// Live results are produced on a frozen deployment (they need the server-side key): see docs/EVAL_V32_FINAL.md.
// 3.1 results are preserved in lib/companion/eval_v31_*.json.
import { writeFileSync } from "node:fs";
import { CASES, runCase, summarise } from "../lib/companion/evalrun.mjs";
import { HOLDOUT } from "../lib/companion/evalset_v3_holdout.mjs";
const run = async (set) => { const rows = []; for (const c of set) rows.push(await runCase(c, null)); return rows; };
const dev = await run(CASES), hold = await run(HOLDOUT);
const out = { when: new Date().toISOString(), system: "rule-based + retrieval engine (no model)", dataset: "v3.2", dev: { summary: summarise(dev), rows: dev }, holdout: { summary: summarise(hold), rows: hold } };
writeFileSync(new URL("../lib/companion/eval_v32_rule.json", import.meta.url), JSON.stringify(out, null, 1));
for (const [k, s] of [["dev", out.dev.summary], ["holdout", out.holdout.summary]]) console.log(k, JSON.stringify({ pass: s.pass, critical: s.criticalCases, intent: s.intent, citation: s.citation, prohibited: s.prohibitedShown, fails: s.criticalFailures }));
[...dev, ...hold].filter((r) => !r.pass).forEach((r) => console.log("FAIL", r.id, r.q, "|", r.fails.join("; ").slice(0, 120)));
