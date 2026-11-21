import { normalizeUrl, scanSite } from "@/lib/scan";
import { seal } from "@/lib/gate";
import { clientIp, limited } from "@/lib/ratelimit";

export const preferredRegion = "fra1";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (limited("scan:" + clientIp(req), 20, 60 * 60 * 1000)) {
    return Response.json({ error: "Zu viele Prüfungen in kurzer Zeit. Bitte versuchen Sie es in einer Stunde erneut." }, { status: 429 });
  }
  const { url } = (await req.json().catch(() => ({}))) as { url?: string };
  const target = normalizeUrl(url || "");
  if (!target) return Response.json({ error: "Bitte geben Sie eine gültige Webadresse ein, zum Beispiel ihre-firma.de." }, { status: 400 });

  const scan = await scanSite(target);
  if (!scan.ok) return Response.json({ error: scan.error + " Prüfen Sie die Adresse und versuchen Sie es erneut." }, { status: 422 });

  const { context, ...publicScan } = scan;
  return Response.json({ scan: publicScan, scanToken: seal({ ...scan, t: Date.now() }) });
}
