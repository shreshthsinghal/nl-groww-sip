// SIP Companion 2.0 domain model: illustrative scenarios, derived status, fair options and simulated actions.
// Nothing here talks to a bank or a real account. Every action only changes this in-memory demo state.
import { TODAY, toD, fmt, fmtShort, fmtDay, monthDate, addWorkingDays, daysBetween, ordinal, inr } from "./base.mjs";

const IF = { state: "confirmed", code: "INSUFFICIENT_FUNDS" };
export const SCENARIOS = [
  { id: "A", key: "two-misses", title: "Two misses in a row", blurb: "Insufficient balance confirmed for Sep and Oct", start: "2026-03-23", day: 23, amount: 3000, over: { "2026-09-23": { result: "failed", reason: IF }, "2026-10-23": { result: "failed", reason: IF } } },
  { id: "B", key: "reason-unknown", title: "Failure reason unknown", blurb: "Oct instalment failed, cause not confirmed", start: "2026-03-23", day: 23, amount: 3000, over: { "2026-10-23": { result: "failed", reason: { state: "unknown", code: null } } } },
  { id: "C", key: "tight-month", title: "A financially tight month", blurb: "All paid so far; next instalment in 2 days", start: "2026-03-28", day: 28, amount: 3000, tight: true, over: {} },
  { id: "D", key: "one-miss", title: "One missed instalment", blurb: "Oct failed, insufficient balance confirmed", start: "2026-03-23", day: 23, amount: 3000, over: { "2026-10-23": { result: "failed", reason: IF } } },
  { id: "E", key: "processing", title: "Instalment processing", blurb: "Today's debit is still awaiting a result", start: "2026-03-26", day: 26, amount: 3000, over: { "2026-10-26": { result: "pending", reason: { state: "pending", code: null } } } }
];
export const byId = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));

export function initState(id) {
  const sc = byId[id];
  const inst = [];
  for (let k = 0; ; k++) {
    const date = monthDate(sc.start, k, sc.day);
    if (toD(date) > toD(TODAY)) break;
    const o = sc.over[date] || {};
    inst.push({ date, amount: sc.amount, result: o.result || "paid", reason: o.reason || null });
  }
  return { sid: id, today: TODAY, amount: sc.amount, start: sc.start, day: sc.day, inst, skipped: [], stopped: null, tight: !!sc.tight, oneTime: null, log: [], done: { understood: false, reviewed: false, chose: false } };
}

/* ---------- derived values ---------- */
export function lastAttempt(s) { for (let i = s.inst.length - 1; i >= 0; i--) if (s.inst[i].result !== "skipped") return s.inst[i]; return null; }
export function consecutive(s) {
  let n = 0;
  for (let i = s.inst.length - 1; i >= 0; i--) { const r = s.inst[i].result; if (r === "skipped" || r === "pending") continue; if (r === "failed") n++; else break; }
  return n;
}
export function nextDate(s) {
  if (s.stopped) return null;
  for (let k = 0; k < 24; k++) { const d = monthDate(s.today, k, s.day); if (toD(d) > toD(s.today) && !s.skipped.includes(d)) return d; }
  return null;
}
export function upcomingSkipped(s) { return s.skipped.filter((d) => toD(d) > toD(s.today)); }
export function payNowUntil(s) { const la = lastAttempt(s); return la && la.result === "failed" && la.reason && la.reason.code === "INSUFFICIENT_FUNDS" ? addWorkingDays(la.date, 2) : null; }
export function monthsRunning(s) { return s.inst.length; }

export function snapshot(s) { // the structured context the AI sees. No names, no account numbers.
  const la = lastAttempt(s), nx = nextDate(s);
  return {
    today: s.today, frequency: "monthly", amount: s.amount, instalment_day: s.day, started: s.start, months_running: monthsRunning(s),
    status: s.stopped ? "STOPPED" : la && la.result === "pending" ? "PROCESSING" : la && la.result === "failed" ? "LAST_INSTALMENT_FAILED" : "ACTIVE",
    consecutive_failures: consecutive(s),
    last_attempt: la ? { date: la.date, result: la.result === "late" ? "paid_after_retry" : la.result, reason: la.reason ? la.reason.state : null, reason_detail: la.reason && la.reason.state === "confirmed" ? la.reason.code : null } : null,
    next_instalment: nx, skipped_upcoming: upcomingSkipped(s), pay_now_until: payNowUntil(s) && toD(payNowUntil(s)) >= toD(s.today) && la.result === "failed" ? payNowUntil(s) : null,
    user_context: s.tight ? "User said money is tight this month" : null,
    one_time_investment: s.oneTime ? { date: s.oneTime, counts_as_instalment: "unconfirmed" } : null,
    stopped_on: s.stopped
  };
}

/* ---------- what the screen says ---------- */
export function describe(s) {
  const la = lastAttempt(s), n = consecutive(s), nx = nextDate(s), pn = payNowUntil(s);
  const pnOpen = pn && toD(pn) >= toD(s.today) && la.result === "failed";
  const amt = inr(la ? la.amount : s.amount);
  const v = { n, nx, la, pnOpen, pn };
  if (s.stopped) {
    return Object.assign(v, { tone: "neutral", label: "Stopped", icon: "stop", headline: "This SIP is stopped",
      happened: "You stopped this SIP on " + fmtShort(s.stopped) + ". This is a simulation: nothing changed in a real account.",
      means: "No more instalments will be taken. What you've invested stays invested until you choose to redeem it.",
      next: "In the real app a cancellation can't be undone, though you could start a new SIP later. Here, Reset restores the demo.", src: ["CANCEL_HOW", "CANCEL_FINAL"] });
  }
  if (la && la.result === "pending") {
    return Object.assign(v, { tone: "info", label: "Result pending", icon: "clock", headline: "Today's instalment is being processed",
      happened: "The " + fmtShort(la.date) + " instalment of " + amt + " was attempted today. The bank hasn't returned a result yet.",
      means: "Nothing has been missed so far. The status updates once the result is confirmed.",
      next: "There's nothing you need to do yet. Investing separately before the result is known could mean investing twice for this month.", src: [] });
  }
  if (la && la.result === "failed") {
    const known = la.reason && la.reason.state === "confirmed";
    const reasonLine = known ? " The bank reported insufficient balance on the debit date." : " The exact reason hasn't been confirmed yet.";
    const prev = n >= 2 ? " The " + fmtShort(s.inst[s.inst.length - 2].date) + " instalment also failed" + (s.inst[s.inst.length - 2].reason && s.inst[s.inst.length - 2].reason.state === "confirmed" ? " for the same reason." : ".") : "";
    const left = 3 - n;
    return Object.assign(v, {
      tone: "attention", label: n >= 2 ? "Needs attention" : "Instalment missed", icon: "alert",
      headline: n >= 2 ? n + " instalments missed in a row" : "This month's instalment didn't go through",
      happened: (known ? "The " + fmtShort(la.date) + " instalment of " + amt + " didn't go through." : "We couldn't complete the " + fmtShort(la.date) + " instalment of " + amt + ".") + reasonLine + prev,
      means: left === 1 ? "A monthly SIP is cancelled automatically after 3 instalments in a row aren't paid. If the " + fmtShort(nx) + " instalment also fails, this SIP would be cancelled. What you've invested stays invested either way."
        : "This is " + n + " missed instalment in a row. A monthly SIP is only cancelled automatically after 3 in a row, so nothing changes yet.",
      next: pnOpen ? "Pay Now is available until " + fmtDay(pn) + ". You can also change the date, lower future instalments, skip the next one or stop."
        : known ? "You can change the date, lower future instalments, skip the next one or stop." : "Start by checking the reason: KYC status, autopay status and your balance on the debit date are the usual places to look.",
      src: ["CANCEL_RULE"].concat(pnOpen ? ["PAY_NOW"] : known ? [] : ["CAUSES"])
    });
  }
  const sk = upcomingSkipped(s);
  if (sk.length) {
    return Object.assign(v, { tone: "ok", label: "Active", icon: "check", headline: "The " + fmtShort(sk[0]) + " instalment is skipped",
      happened: "You skipped the " + fmtShort(sk[0]) + " instalment (simulated). Earlier instalments are unchanged.",
      means: "A skipped instalment isn't counted as a failure. Instalments continue from " + fmtShort(nx) + ".",
      next: "Nothing else is needed. You can still change the date, lower the amount or stop.", src: ["SKIP_NOT_FAIL"] });
  }
  const recovered = la && la.result === "late";
  return Object.assign(v, { tone: "ok", label: "Active", icon: "check", headline: "Next instalment: " + inr(s.amount) + " on " + fmtShort(nx),
    happened: recovered ? "The " + fmtShort(la.date) + " instalment was paid with Pay Now (simulated)." : s.tight ? "Every instalment so far has been paid. You said money is tight this month." : "Every instalment so far has been paid.",
    means: recovered ? "Your missed-in-a-row count is back to 0." : "Nothing has been missed." + (s.tight ? " If you skip the " + fmtShort(nx) + " instalment, it isn't counted as a failure." : ""),
    next: s.tight ? "You can skip this month, lower future instalments or move the date. The app doesn't allow cancelling within 7 days of an instalment." : "Nothing is needed. You can change the date or amount whenever you like.",
    src: s.tight ? ["SKIP_NOT_FAIL", "CANCEL_7D"] : [] });
}

/* ---------- options: shown only when the scenario supports them ---------- */
export function options(s) {
  if (s.stopped) return [{ id: "EXPLAIN", title: "Read about this status", sub: "What stopping means and where it's documented", available: true }];
  const la = lastAttempt(s), nx = nextDate(s), pn = payNowUntil(s);
  const out = [];
  if (la && la.result === "failed" && pn && toD(pn) >= toD(s.today)) out.push({ id: "PAY_MISSED", title: "Pay the missed instalment", sub: inr(la.amount) + " · Pay Now open until " + fmtDay(pn), available: true, src: "PAY_NOW" });
  if (la && la.result === "failed" && (!la.reason || la.reason.state !== "confirmed") && !s.oneTime) out.push({ id: "ONE_TIME", title: "Make a one-time investment", sub: "Not offered by every fund; may not count as the missed instalment", available: true, src: "ONE_TIME" });
  out.push({ id: "CHANGE_DATE", title: "Change the instalment date", sub: "Now the " + ordinal(s.day) + " of each month", available: true, src: "EDIT" });
  out.push({ id: "LOWER_AMOUNT", title: "Lower future instalments", sub: "Now " + inr(s.amount) + " a month", available: true, src: "EDIT" });
  if (nx) out.push({ id: "SKIP_NEXT", title: "Skip the next instalment", sub: fmtShort(nx) + " · not counted as a failure", available: true, src: "SKIP" });
  const within7 = nx && daysBetween(s.today, nx) <= 7;
  out.push({ id: "STOP", title: "Stop this SIP", sub: within7 ? "Not possible until the " + fmtShort(nx) + " instalment has passed" : "Ends future instalments; what you've invested stays", available: !within7, why: within7 ? "Groww doesn't allow cancelling a SIP when its next instalment is due within 7 days. Skipping that instalment is possible." : null, src: within7 ? "CANCEL_7D" : "CANCEL_HOW" });
  out.push({ id: "EXPLAIN", title: "Read about this status", sub: "What we know, what we don't, and the sources", available: true });
  return out;
}

/* ---------- simulated actions ---------- */
export function validateAmount(raw, current) {
  const t = String(raw ?? "").replace(/[,₹\s]/g, "");
  if (!t) return "Enter an amount.";
  if (!/^\d+$/.test(t)) return "Use whole rupees only.";
  const v = Number(t);
  if (v < 100) return "This demo accepts ₹100 or more. Each fund sets its own minimum.";
  if (v >= current) return "Enter less than the current " + inr(current) + ".";
  if (v % 100 !== 0) return "Use a multiple of ₹100 in this demo.";
  return null;
}
export function previewDate(s, day) { const t = Object.assign({}, s, { day }); return nextDate(t); }

export function apply(prev, action, p = {}) {
  const s = JSON.parse(JSON.stringify(prev));
  const today = s.today;
  let text = "";
  if (action === "PAY_MISSED") { const la = lastAttempt(s); la.result = "late"; la.paidOn = today; text = "Paid " + inr(la.amount) + " for the " + fmtShort(la.date) + " instalment"; }
  else if (action === "ONE_TIME") { s.oneTime = today; text = "One-time investment of " + inr(p.amount || s.amount); }
  else if (action === "CHANGE_DATE") { const from = s.day; s.day = p.day; text = "Instalment date moved from the " + ordinal(from) + " to the " + ordinal(p.day); }
  else if (action === "LOWER_AMOUNT") { const from = s.amount; s.amount = Number(p.amount); text = "Future instalments lowered from " + inr(from) + " to " + inr(s.amount); }
  else if (action === "SKIP_NEXT") { const nx = nextDate(s); s.skipped.push(nx); text = "Skipped the " + fmtShort(nx) + " instalment"; }
  else if (action === "STOP") { s.stopped = today; text = "SIP stopped"; }
  else return prev;
  s.log.push({ date: today, action, text: text + " (simulated)" });
  s.done.chose = true; s.done.reviewed = true;
  return s;
}

/* ---------- timeline ---------- */
export function timeline(s) {
  const rows = s.inst.map((i) => ({
    date: i.date, kind: i.result === "late" ? "recovered" : i.result,
    title: i.result === "paid" ? "Instalment paid" : i.result === "failed" ? "Instalment failed" : i.result === "pending" ? "Instalment attempted, result pending" : i.result === "late" ? "Failed, then paid with Pay Now" : "Skipped",
    detail: i.result === "failed" ? (i.reason && i.reason.state === "confirmed" ? "Reason: insufficient balance (confirmed)" : "Reason not confirmed yet") : i.result === "late" ? "Paid on " + fmtShort(i.paidOn) + " · simulated" : inr(i.amount)
  }));
  s.log.forEach((l) => { if (l.action !== "PAY_MISSED") rows.push({ date: l.date, kind: "action", title: l.text, detail: "Your choice in this demo" }); });
  upcomingSkipped(s).forEach((d) => rows.push({ date: d, kind: "skipped", title: "Instalment skipped", detail: "Not counted as a failure" }));
  const nx = nextDate(s);
  if (nx) rows.push({ date: nx, kind: "scheduled", title: "Next instalment scheduled", detail: inr(s.amount) });
  return rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.kind === "action" ? 1 : -1));
}
export { fmt, fmtShort, fmtDay, inr, ordinal, daysBetween };
