import { sb } from "@/lib/supabase";
import { BY_ID, ALL_DRIVERS } from "@/lib/discovery/core";
import { rateLimited, PII } from "@/lib/server";

export const runtime = "nodejs";
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

// Append-only review log. A review never edits the dataset: the AI label it was made against is stored with it.
export async function GET(req) {
  const id = new URL(req.url).searchParams.get("id");
  let qy = sb().from("review_events").select("id,evidence_id,action,ai_label,human_label,rationale,codebook_version,created_at").order("created_at", { ascending: false }).limit(id ? 50 : 100);
  if (id) { if (!BY_ID[id]) return json({ error: "Unknown evidence ID" }, 400); qy = qy.eq("evidence_id", id); }
  const { data, error } = await qy;
  if (error) return json({ error: "The review log could not be read right now.", rows: [] }, 503);
  return json({ rows: data });
}

export async function POST(req) {
  if (rateLimited(req, "review", 10)) return json({ error: "Too many reviews in a minute." }, 429);
  let b; try { b = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  const rec = BY_ID[b?.evidence_id];
  if (!rec) return json({ error: "Unknown evidence ID" }, 400);
  if (!["approve", "correct", "flag"].includes(b.action)) return json({ error: "Action must be approve, correct or flag" }, 400);
  const human = b.action === "approve" ? rec.driver : b.action === "correct" ? b.human_label : null;
  if (b.action === "correct" && (!ALL_DRIVERS.includes(human) || human === rec.driver)) return json({ error: "Pick a different label to correct to." }, 400);
  const rationale = typeof b.rationale === "string" ? b.rationale.trim().slice(0, 280) : "";
  if ((b.action !== "approve") && rationale.length < 5) return json({ error: "Add a short rationale for a correction or a flag." }, 400);
  if (PII.test(rationale)) return json({ error: "Remove the number that looks like personal data." }, 400);
  const row = { evidence_id: rec.id, action: b.action, ai_label: rec.driver, human_label: human, rationale: rationale || null, codebook_version: "v1.2", reviewer: null };
  const { error } = await sb().from("review_events").insert(row);
  if (error) return json({ error: "The review could not be saved right now. Nothing was changed." }, 503);
  return json({ ok: true, saved: { ...row, created_at: new Date().toISOString() } });
}
