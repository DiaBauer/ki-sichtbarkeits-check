import { CATEGORY_META, CATEGORY_ORDER, CategoryKey, Finding } from "./categories";

/** Category score 0–100 from its weighted checks; null if nothing could be checked. */
export function kategoriePunkte(findings: Finding[], key: CategoryKey): number | null {
  let w = 0;
  let sum = 0;
  for (const f of findings) {
    if (f.kategorie !== key || f.gewicht <= 0 || f.erreicht === null) continue;
    w += f.gewicht;
    sum += f.gewicht * Math.max(0, Math.min(1, f.erreicht));
  }
  return w > 0 ? Math.round((sum / w) * 100) : null;
}

/** Weighted total over categories that could be scored. Unknown categories are left out, not counted as 0. */
export function gesamt(punkte: Partial<Record<CategoryKey, number | null>>) {
  let sum = 0;
  let w = 0;
  for (const k of CATEGORY_ORDER) {
    const v = punkte[k];
    if (typeof v === "number") {
      sum += v * CATEGORY_META[k].weight;
      w += CATEGORY_META[k].weight;
    }
  }
  return { gesamt: w ? Math.round(sum / w) : null, gepruefterAnteil: w / 100 };
}

// German school grade 1 (sehr gut) – 6 (ungenügend)
export function grade(score: number) {
  if (score >= 90) return { note: 1, label: "sehr gut" };
  if (score >= 75) return { note: 2, label: "gut" };
  if (score >= 60) return { note: 3, label: "befriedigend" };
  if (score >= 45) return { note: 4, label: "ausreichend" };
  if (score >= 30) return { note: 5, label: "mangelhaft" };
  return { note: 6, label: "ungenügend" };
}

// Four-step traffic light: green, yellow, orange, red
export type Tone = "ok" | "mid" | "warn" | "fail";
export function tone(score: number): Tone {
  return score >= 70 ? "ok" : score >= 55 ? "mid" : score >= 40 ? "warn" : "fail";
}

/** Fixed limits of the analysis, shown with every report. */
export const GRENZEN = [
  "Geprüft werden technische und inhaltliche Voraussetzungen. Ob ChatGPT, Perplexity oder Google Ihre Website tatsächlich nennen, misst dieser Check nicht.",
  "Analysiert werden die Startseite und bis zu zwei Unterseiten, so wie sie ohne JavaScript ausgeliefert werden.",
  "Google gibt an, dass für AI Overviews und AI Mode keine besonderen Optimierungen nötig sind; es gelten die üblichen Grundlagen für die Google-Suche.",
  "Zielgruppen, Kundenfragen und Suchbegriffe sind aus Ihren Website-Inhalten abgeleitet. Es sind Annahmen, keine Markt- oder Suchvolumendaten.",
  "Punkte, die nicht abrufbar waren, werden als „nicht geprüft“ geführt und fließen nicht in die Note ein.",
  "Die Bewertung ersetzt keine Rechts- oder individuelle SEO-Beratung und ist kein Rankingversprechen.",
];
