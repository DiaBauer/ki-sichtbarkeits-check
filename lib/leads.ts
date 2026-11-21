// Lead storage: Supabase table geo_leads when configured, otherwise the
// runtime log (so no lead is lost before the database is set up).
export async function storeLead(lead: Record<string, unknown>) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    // No database configured yet: keep the lead in the runtime log so it is not lost.
    console.log(JSON.stringify({ evt: "lead", ...lead }));
    return;
  }
  const res = await fetch(`${url}/rest/v1/geo_leads`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(lead),
  });
  if (!res.ok) {
    console.error("lead insert failed", res.status, await res.text());
    console.log(JSON.stringify({ evt: "lead", ...lead }));
  }
}

