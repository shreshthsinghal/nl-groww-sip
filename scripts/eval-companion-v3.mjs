// Offline run of the v3 answer-quality set against the rule-based + retrieval engine (no model).
// Live results are produced on the deployment (they need the server-side key) and saved to lib/companion/eval_v32_live.json (3.1 runs preserved as eval_v31_*.json).
import { writeFileSync } from "node:fs";
import { CASES, runCase, summarise } from "../lib/companion/evalrun.mjs";
const rows = []; for (const c of CASES) rows.push(await runCase(c, null));
const sum = summarise(rows);
writeFileSync(new URL("../lib/companion/eval_v32_rule.json", import.meta.url), JSON.stringify({ when: new Date().toISOString(), system: "rule-based + retrieval engine (no model)", summary: sum, rows }, null, 1));
console.log(JSON.stringify(sum, null, 1));
rows.filter((r) => !r.pass && !r.held).forEach((r) => console.log("FAIL", r.id, r.cat, r.sc, r.q, "|", r.fails.join("; "), "|", r.text.slice(0, 160)));
console.log("held-out failures (not inspected for tuning):", rows.filter((r) => !r.pass && r.held).map((r) => r.id).join(" "));
