import { generateText, Output } from "ai";
import { z } from "zod";
import type { ScanResult } from "./scan";

export const MODEL = "anthropic/claude-sonnet-5.5";

export const insightSchema = z.object({
  unternehmen: z.object({
    name: z.string(),
    branche: z.string().describe("Branche in 2–4 Wörtern"),
    angebot: z.string().describe("Was das Unternehmen anbietet, ein Satz"),
    region: z.string().nullable().describe("Region/Stadt, falls erkennbar"),
  }),
  kurzbefund: z.string().describe("Zwei Sätze: wie KI-Systeme die Seite heute wahrnehmen und was das größte Hindernis ist"),
  inhaltScore: z.number().int().min(0).max(100),
  inhaltBegruendung: z.string().describe("Ein Satz"),
  antwortScore: z.number().int().min(0).max(100),
  antwortBegruendung: z.string().describe("Ein Satz"),
  zielgruppen: z
    .array(
      z.object({
        name: z.string().describe("Kurzer, prägnanter Name der Zielgruppe"),
        beschreibung: z.string().describe("Ein Satz: wer sie sind und was sie suchen"),
        anteil: z.number().int().min(5).max(80).describe("Geschätzter Anteil in Prozent; alle zusammen 100"),
      }),
    )
    .length(3),
  fragen: z
    .array(
      z.object({
        frage: z.string().describe("Natürlich formulierte Frage, wie ein Kunde sie ChatGPT oder Perplexity stellt"),
        phase: z.enum(["problem", "loesung", "anbieter"]),
      }),
    )
    .min(12)
    .max(15),
  keywords: z.array(z.object({ begriff: z.string(), relevanz: z.number().int().min(1).max(100) })).min(10).max(14),
  massnahmen: z
    .array(
      z.object({
        titel: z.string().describe("Konkrete Maßnahme als Handlungsanweisung, max. 9 Wörter"),
        warum: z.string().describe("Ein Satz: welches Problem das löst"),
        wie: z.string().describe("Ein bis zwei Sätze: konkret, was zu tun ist"),
        kategorie: z.enum(["citability", "brand", "content", "technical", "schema", "answer"]),
        aufwand: z.enum(["gering", "mittel", "hoch"]),
        wirkung: z.enum(["hoch", "mittel"]),
      }),
    )
    .min(6)
    .max(8),
  schemaVorschlag: z.string().describe("Fertiges JSON-LD (Organization bzw. passender Typ + WebSite) für die Startseite, nur das JSON, ohne Script-Tag. Unbekannte Werte als Platzhalter in eckigen Klammern."),
});

export type Insights = z.infer<typeof insightSchema>;

export async function generateInsights(scan: Extract<ScanResult, { ok: true }>) {
  const f = scan.facts;
  const facts = [
    `URL: ${scan.url}`,
    `Erkannter Markenname: ${scan.brand}`,
    `Titel: ${f.title || "—"}`,
    `Meta-Beschreibung: ${f.metaDesc || "—"}`,
    `Sprache: ${f.lang || "unbekannt"}`,
    `Wörter im HTML: ${f.wordCount}`,
    `H1: ${f.h1.join(" | ") || "—"}`,
    `Überschriften: ${f.headings.join(" | ") || "—"}`,
    `Als Frage formulierte Überschriften: ${f.questionHeadings.length}`,
    `Schema-Typen (JSON-LD): ${f.schemaTypes.join(", ") || "keine"}`,
    `Verlinkte Profile: ${f.profiles.join(", ") || "keine"}`,
    `Wikipedia-Eintrag gefunden: ${f.wikipedia ? "ja" : "nein"}`,
    `llms.txt: ${f.llmsTxt ? "ja" : "nein"}`,
    `Impressum: ${f.hasImpressum ? "ja" : "nein"}, Datenschutz: ${f.hasPrivacy ? "ja" : "nein"}, Über-uns/Team: ${f.hasAbout ? "ja" : "nein"}`,
    `Blockierte KI-Crawler: ${f.crawlers.filter((c) => c.status === "blocked").map((c) => c.bot).join(", ") || "keine"}`,
    `Bisherige Teilwerte (0–100): Zitierfähigkeit ${scan.scores.citability}, Markenautorität ${scan.scores.brand}, Technik ${scan.scores.technical}, Strukturierte Daten ${scan.scores.schema}`,
  ].join("\n");

  const pages = [
    `=== Startseite (${scan.url}) ===\n${scan.context.homeText}`,
    ...scan.context.subPages.map((p) => `=== Unterseite (${p.url}) ===\n${p.text}`),
  ].join("\n\n");

  const { output, usage } = await generateText({
    model: MODEL,
    output: Output.object({ schema: insightSchema }),
    system: `Du bist GEO-Analyst (Generative Engine Optimization) für den deutschsprachigen Markt. Du bewertest, wie gut eine Website von KI-Suchsystemen (ChatGPT, Perplexity, Google AI Overviews, Claude, Gemini) verstanden, zitiert und empfohlen werden kann.

Regeln:
- Schreibe auf Deutsch, in der Sie-Form, sachlich und konkret. Kein Marketing-Jargon, keine Übertreibungen, keine Floskeln.
- Stütze jede Aussage auf die gelieferten Fakten und Seitentexte. Erfinde keine Zahlen, Kunden oder Auszeichnungen.
- inhaltScore bewertet E-E-A-T: erkennbare Erfahrung (Projekte, Fallbeispiele, Zahlen), Expertise (benannte Personen mit Qualifikation), Autorität (Referenzen, Erwähnungen), Vertrauen (Impressum, Kontakt, Transparenz, Aktualität). Dünne oder austauschbare Texte: unter 40. Gute, belegte Inhalte: 70+.
- antwortScore bewertet, ob die Seite konkrete Kundenfragen direkt beantwortet: Frage-Überschriften, kurze Definitionen, Preise/Ablauf/Dauer, FAQ, Vergleiche. Reine Werbetexte ohne Antworten: unter 35.
- Kundenfragen: so, wie echte Interessenten sie einer KI stellen würden, bevor sie einen Anbieter kennen. Verteile auf die Phasen problem (kennt nur das Problem), loesung (sucht eine Art von Lösung), anbieter (vergleicht Anbieter). Keine Fragen, die den Firmennamen enthalten.
- Keywords: Begriffe und Phrasen, unter denen die Zielgruppe sucht, nicht nur Einzelwörter.
- Maßnahmen: nach Wirkung sortiert, die wichtigste zuerst. Jede Maßnahme muss für genau diese Website gelten, nicht allgemein.`,
    prompt: `Fakten aus der technischen Prüfung:\n${facts}\n\nSeitentexte:\n${pages}`,
  });

  return { insights: output, usage };
}
