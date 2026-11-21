import { dbKey } from "./server-key";

// All writes/reads go through SECURITY DEFINER functions that require dbKey().
// The publishable key alone cannot read or change any table.
const SUPABASE_URL = process.env.SUPABASE_URL || "https://fsvrvvcnzvoroitnovih.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_Udd4FR1cuF3mjuZc1Tzwhw_LZszWolg";

export async function rpc<T = unknown>(fn: string, params: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ p_key: dbKey(), ...params }),
    cache: "no-store",
  });
  if (!res.ok) {
    // Never log request params (may contain personal data); status + function name only.
    throw new Error(`db ${fn} ${res.status}`);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}
