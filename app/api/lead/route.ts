import { unseal } from "@/lib/gate";
import { clientIp, limited } from "@/lib/ratelimit";

type Gated = { gated: unknown; url: string; brand: string };

async function storeLead(lead: Record<string, unknown>) {
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

export async function POST(req: Request) {
  if (limited("lead:" + clientIp(req), 10, 60 * 60 * 1000)) {
    return Response.json({ error: "Zu viele Anfragen. Bitte versuchen Sie es später erneut." }, { status: 429 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    email?: string;
    consent?: boolean;
    gatedToken?: string;
    score?: number;
    site?: string;
  };
  const email = (body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return Response.json({ error: "Bitte geben Sie eine gültige E-Mail-Adresse ein." }, { status: 400 });
  }
  if (!body.consent) {
    return Response.json({ error: "Bitte bestätigen Sie die Einwilligung, damit wir Ihnen den Bericht zusenden dürfen." }, { status: 400 });
  }
  let data: Gated;
  try {
    data = unseal<Gated>(body.gatedToken || "");
  } catch {
    return Response.json({ error: "Die Analyse ist abgelaufen. Bitte starten Sie die Prüfung neu." }, { status: 400 });
  }

  await storeLead({
    name: (body.name || "").trim().slice(0, 120) || null,
    email,
    checked_url: data.url,
    brand_detected: data.brand,
    score: typeof body.score === "number" ? body.score : null,
    site: (body.site || "").slice(0, 40),
    consent_at: new Date().toISOString(),
  });

  return Response.json({ gated: data.gated });
}
