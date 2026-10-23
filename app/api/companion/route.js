import C from "@/lib/core";
import { callClaude, extractJSON, rateLimited, PII, MODEL, hasKey } from "@/lib/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const STATUS = ["ACTIVE", "FAILED", "PAUSED", "CANCELLED", "STOPPED"];
const REASONS = [null, "INSUFFICIENT_FUNDS", "MANDATE_PENDING", "MANDATE_REJECTED", "BANK_TECHNICAL", "KYC_HOLD"];
const isDate = (v) => v == null || /^\d{4}-\d{2}-\d{2}$/.test(v);

function cleanEvent(e) {
  if (!e || typeof e !== "object") return null;
  const ev = {
    today: isDate(e.today) && e.today ? e.today : "2026-10-23",
    sip_amount: Math.max(100, Math.min(1000000, Math.round(Number(e.sip_amount) || 0))),
    frequency: "monthly",
    status: STATUS.includes(e.status) ? e.status : "ACTIVE",
    reason_code: REASONS.includes(e.reason_code) ? e.reason_code : null,
    consecutive_failures: Math.max(0, Math.min(3, Math.round(Number(e.consecutive_failures) || 0))),
    last_debit_date: isDate(e.last_debit_date) ? e.last_debit_date : null,
    next_debit_date: isDate(e.next_debit_date) ? e.next_debit_date : null,
    months_running: Math.max(0, Math.min(240, Math.round(Number(e.months_running) || 0)))
  };
  if (e.stated_income_day != null) ev.stated_income_day = Math.max(1, Math.min(31, Math.round(Number(e.stated_income_day))));
  if (e.portfolio_return_pct != null && isFinite(Number(e.portfolio_return_pct))) ev.portfolio_return_pct = Math.round(Number(e.portfolio_return_pct) * 10) / 10;
  if (ev.status === "STOPPED") ev.status = "ACTIVE";
  return ev;
}

export async function POST(req) {
  if (rateLimited(req, "companion", 20)) return Response.json({ error: "rate_limited" }, { status: 429 });
  let body; try { body = await req.json(); } catch { return Response.json({ error: "bad_request" }, { status: 400 }); }
  const msg = typeof body.msg === "string" ? body.msg.trim().slice(0, 280) : "";
  const ev = cleanEvent(body.event);
  if (!msg || !ev) return Response.json({ error: "bad_request" }, { status: 400 });
  if (PII.test(msg)) {
    const g = C.gate(null, ev, msg);
    return Response.json({ source: "safe", reason: "pii", gate: g, out: null });
  }
  const t0 = Date.now();
  let out = null, reason = null;
  try {
    const text = await callClaude(C.buildPrompt(ev, msg), { maxTokens: 450 });
    out = extractJSON(text);
    if (!out) reason = "unparseable";
  } catch (e) { reason = e.code || "upstream_error"; }
  const g = C.gate(out, ev, msg);
  return Response.json({ source: out ? "live" : "safe", reason, model: hasKey() ? MODEL : null, ms: Date.now() - t0, out, gate: g });
}
