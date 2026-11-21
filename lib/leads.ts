// Lead storage in Supabase (project "kampagnen-cockpit", table geo_leads).
// Writes go through the SECURITY DEFINER function geo_lead_einfuegen, which can
// only insert. That is why the public (publishable) key is enough here; no
// secret key is needed. If the insert fails, the lead is kept in the runtime log.
const SUPABASE_URL = process.env.SUPABASE_URL || "https://fsvrvvcnzvoroitnovih.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_Udd4FR1cuF3mjuZc1Tzwhw_LZszWolg";

export type Lead = {
  email: string;
  name?: string | null;
  checked_url?: string | null;
  brand_detected?: string | null;
  score?: number | null;
  site?: string | null;
  source?: string | null;
  newsletter?: boolean;
};

export async function storeLead(lead: Lead) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/geo_lead_einfuegen`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        p_email: lead.email,
        p_name: lead.name ?? null,
        p_checked_url: lead.checked_url ?? null,
        p_brand_detected: lead.brand_detected ?? null,
        p_score: lead.score ?? null,
        p_site: lead.site ?? null,
        p_source: lead.source ?? null,
        p_newsletter: !!lead.newsletter,
      }),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  } catch (e) {
    console.error("lead insert failed", e);
    console.log(JSON.stringify({ evt: "lead", ...lead }));
  }
}
