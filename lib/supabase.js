import { createClient } from "@supabase/supabase-js";

// Publishable (anon) key: safe to ship. Row-level security lets the public add events and test sessions,
// read eval runs, and call an aggregate-only metrics function. Nothing else.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://aejgflhtxhmfbfkcwtrz.supabase.co";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY || "sb_publishable_lEGpfgqvascwRP9KRwDlMQ_mWZnl1Vz";

let client = null;
export function sb() {
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  return client;
}
