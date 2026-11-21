import { storeLead } from "@/lib/leads";
import { clientIp, limited } from "@/lib/ratelimit";

export const preferredRegion = "fra1";

export async function POST(req: Request) {
  if (limited("sub:" + clientIp(req), 10, 60 * 60 * 1000)) {
    return Response.json({ error: "Zu viele Anfragen. Bitte versuchen Sie es später erneut." }, { status: 429 });
  }
  const body = (await req.json().catch(() => ({}))) as { email?: string; consent?: boolean; site?: string; source?: string };
  const email = (body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return Response.json({ error: "Bitte geben Sie eine gültige E-Mail-Adresse ein." }, { status: 400 });
  }
  if (!body.consent) {
    return Response.json({ error: "Bitte bestätigen Sie die Einwilligung zum Newsletter." }, { status: 400 });
  }
  await storeLead({
    email,
    newsletter: true,
    source: (body.source || "newsletter").slice(0, 40),
    site: (body.site || "").slice(0, 40),
  });
  return Response.json({ ok: true });
}
