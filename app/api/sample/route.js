// Server-side stand-in for the Claude viewer's `sample` capability, used by the discovery engine page.
// Only the engine's two prompt templates are accepted, so the key can't be used as a general chatbot.
import { callClaude, extractJSON, rateLimited, PII } from "@/lib/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED = [
  "You label investor feedback for a product discovery engine about why first-time mutual fund investors stop their SIPs in India.",
  "You answer product-discovery questions about why first-time SIP investors in India pause, reduce or stop their SIPs."
];

export async function POST(req) {
  if (rateLimited(req, "sample", 8)) return Response.json({ code: "rate_limited", message: "Too many runs. Wait a minute." }, { status: 429 });
  let body; try { body = await req.json(); } catch { return Response.json({ code: "bad_request" }, { status: 400 }); }
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  if (!ALLOWED.some((p) => prompt.startsWith(p)) || prompt.length > 90000) return Response.json({ code: "bad_request", message: "Only the engine's own tools can call this." }, { status: 400 });
  const userPart = prompt.includes("\nQuestion: ")
    ? prompt.split("\nQuestion: ")[1].split("Evidence items:")[0]
    : (prompt.split("Feedback lines:")[1] || "").split("Reply with only")[0];
  if (PII.test(userPart.slice(0, 6000))) return Response.json({ code: "pii", message: "Remove PAN, phone or account numbers first." }, { status: 400 });
  try {
    const text = await callClaude(prompt, { maxTokens: body.json ? 2500 : 700, timeoutMs: 55000 });
    if (body.json) { const v = extractJSON(text); return Response.json({ text, value: v }); }
    return Response.json({ text });
  } catch (e) {
    const code = e.code === "no_key" ? "unavailable" : e.code === "rate_limited" ? "rate_limited" : "upstream_error";
    return Response.json({ code, message: e.message }, { status: code === "unavailable" ? 503 : 502 });
  }
}
