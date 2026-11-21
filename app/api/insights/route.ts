import { createHash } from "node:crypto";
import { after } from "next/server";
import { seal, unseal } from "@/lib/gate";
import { baueBericht, generateInsights, hatKiSchluessel, MODEL_ID, testInsights, type Insights } from "@/lib/insights";
import type { ScanResult } from "@/lib/scan";
import { erlaubt, ipSubjekt } from "@/lib/ratelimit";
import { rpc } from "@/lib/db";
import type { ReportData } from "@/lib/report-types";

export const maxDuration = 120;

const CACHE_S = 24 * 60 * 60;
const TAGES_LIMIT = Number(process.env.INSIGHTS_TAGESLIMIT || 200);

type OkScan = Extract<ScanResult, { ok: true }>;

/** Free part shown without e-mail. */
function freierTeil(b: ReportData) {
  return {
    gesamt: b.gesamt,
    note: b.note,
    vorlaeufig: b.vorlaeufig,
    kategorien: b.kategorien,
    befunde: b.befunde,
    unternehmen: b.unternehmen,
    kurzbefund: b.kurzbefund,
    massnahmen: b.massnahmen.slice(0, 3),
    grenzen: b.grenzen,
    counts: { fragen: b.fragen.length, suchbegriffe: b.suchbegriffe.length, massnahmen: b.massnahmen.length, zielgruppen: b.zielgruppen.length },
  };
}

export async function POST(req: Request) {
  const raw = await req.text().catch(() => "");
  if (raw.length > 400_000) return Response.json({ error: "Anfrage zu groß." }, { status: 413 });
  let scan: OkScan;
  let t = 0;
  try {
    const body = JSON.parse(raw || "{}") as { scanToken?: unknown };
    ({ scan, t } = unseal<{ scan: OkScan; t: number }>(String(body.scanToken ?? "")));
  } catch {
    return Response.json({ error: "Die Prüfung ist abgelaufen. Bitte starten Sie sie neu." }, { status: 400 });
  }
  if (!scan?.ok || Date.now() - t > 30 * 60 * 1000) {
    return Response.json({ error: "Die Prüfung ist abgelaufen. Bitte starten Sie sie neu." }, { status: 400 });
  }

  const testmodus = !hatKiSchluessel() && process.env.VERCEL_ENV !== "production";
  if (!hatKiSchluessel() && !testmodus) {
    console.error("insights: ANTHROPIC_API_KEY fehlt in Produktion");
    return Response.json({ error: "Die KI-Auswertung ist gerade nicht verfügbar. Bitte versuchen Sie es später erneut." }, { status: 503 });
  }

  let insights: Insights | null = null;
  const cacheKey = "ins:v2:" + createHash("sha256").update(scan.url).digest("hex");

  if (!testmodus) {
    try {
      insights = await rpc<Insights | null>("geo_cache_lesen", { p_schluessel: cacheKey, p_max_alter_s: CACHE_S });
    } catch {
      insights = null;
    }
  }

  if (!insights) {
    if (testmodus) {
      insights = testInsights(scan);
    } else {
      // Cost protection: per IP and global per day. Both fail closed (no AI call if the limiter is unreachable).
      if (!(await erlaubt("insights", ipSubjekt(req), 10, 60 * 60, true))) {
        return Response.json({ error: "Zu viele Analysen in kurzer Zeit. Bitte versuchen Sie es in einer Stunde erneut." }, { status: 429 });
      }
      if (!(await erlaubt("insights_global", "alle", TAGES_LIMIT, 24 * 60 * 60, true))) {
        return Response.json({ error: "Das Tageskontingent für Analysen ist erreicht. Bitte versuchen Sie es morgen erneut." }, { status: 429 });
      }
      try {
        const started = Date.now();
        const r = await generateInsights(scan);
        insights = r.insights;
        console.log(JSON.stringify({ evt: "insights", model: MODEL_ID, ms: Date.now() - started, in: r.usage.inputTokens, out: r.usage.outputTokens }));
        const zuCachen = insights;
        after(() => rpc("geo_cache_schreiben", { p_schluessel: cacheKey, p_daten: zuCachen }).catch(() => {}));
      } catch (e) {
        console.error("insights failed", (e as Error).message);
        return Response.json({ error: "Die KI-Auswertung ist fehlgeschlagen. Bitte versuchen Sie es in einer Minute erneut." }, { status: 502 });
      }
    }
  }

  const bericht = baueBericht(scan, insights, testmodus);
  return Response.json({ insights: freierTeil(bericht), testmodus, gatedToken: seal({ bericht, url: scan.url, t: Date.now() }) });
}
