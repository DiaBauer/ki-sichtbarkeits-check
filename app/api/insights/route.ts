import { seal, unseal } from "@/lib/gate";
import { generateInsights, MODEL } from "@/lib/insights";
import type { ScanResult } from "@/lib/scan";
import { clientIp, limited } from "@/lib/ratelimit";

export const maxDuration = 120;

export async function POST(req: Request) {
  if (limited("insights:" + clientIp(req), 12, 60 * 60 * 1000)) {
    return Response.json({ error: "Zu viele Analysen in kurzer Zeit. Bitte versuchen Sie es in einer Stunde erneut." }, { status: 429 });
  }
  const { scanToken } = (await req.json().catch(() => ({}))) as { scanToken?: string };
  let scan: Extract<ScanResult, { ok: true }> & { t: number };
  try {
    scan = unseal(scanToken || "");
  } catch {
    return Response.json({ error: "Die Prüfung ist abgelaufen. Bitte starten Sie sie neu." }, { status: 400 });
  }
  if (Date.now() - scan.t > 30 * 60 * 1000) {
    return Response.json({ error: "Die Prüfung ist abgelaufen. Bitte starten Sie sie neu." }, { status: 400 });
  }

  try {
    const started = Date.now();
    const { insights, usage } = await generateInsights(scan);
    console.log(
      JSON.stringify({ evt: "insights", host: scan.host, model: MODEL, ms: Date.now() - started, in: usage.inputTokens, out: usage.outputTokens }),
    );
    const sorted = [...insights.massnahmen];
    const free = {
      unternehmen: insights.unternehmen,
      kurzbefund: insights.kurzbefund,
      inhaltScore: insights.inhaltScore,
      inhaltBegruendung: insights.inhaltBegruendung,
      antwortScore: insights.antwortScore,
      antwortBegruendung: insights.antwortBegruendung,
      massnahmen: sorted.slice(0, 3),
      counts: { fragen: insights.fragen.length, keywords: insights.keywords.length, massnahmen: sorted.length },
    };
    const gated = {
      zielgruppen: insights.zielgruppen,
      fragen: insights.fragen,
      keywords: insights.keywords,
      massnahmen: sorted,
      schemaVorschlag: insights.schemaVorschlag,
    };
    return Response.json({ insights: free, gatedToken: seal({ gated, url: scan.url, brand: scan.brand }) });
  } catch (e) {
    console.error("insights failed", e);
    return Response.json({ error: "Die KI-Auswertung ist fehlgeschlagen. Bitte versuchen Sie es in einer Minute erneut." }, { status: 502 });
  }
}
