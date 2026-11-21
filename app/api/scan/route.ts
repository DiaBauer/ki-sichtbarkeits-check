import { normalizeUrl, scanSite } from "@/lib/scan";
import { seal } from "@/lib/gate";
import { erlaubt, ipSubjekt } from "@/lib/ratelimit";

export const maxDuration = 60;

export async function POST(req: Request) {
  const raw = await req.text().catch(() => "");
  if (raw.length > 4096) return Response.json({ error: "Anfrage zu groß." }, { status: 413 });
  let url = "";
  try {
    url = String((JSON.parse(raw || "{}") as { url?: unknown }).url ?? "");
  } catch {}
  const target = normalizeUrl(url);
  if (!target) return Response.json({ error: "Bitte geben Sie eine gültige Webadresse ein, zum Beispiel ihre-firma.de." }, { status: 400 });

  if (!(await erlaubt("scan", ipSubjekt(req), 20, 60 * 60))) {
    return Response.json({ error: "Zu viele Prüfungen in kurzer Zeit. Bitte versuchen Sie es in einer Stunde erneut." }, { status: 429 });
  }

  const scan = await scanSite(target);
  if (!scan.ok) return Response.json({ error: scan.error + " Prüfen Sie die Adresse und versuchen Sie es erneut." }, { status: 422 });

  const { context: _context, facts: _facts, ...publicScan } = scan;
  return Response.json({ scan: publicScan, scanToken: seal({ scan, t: Date.now() }) });
}
