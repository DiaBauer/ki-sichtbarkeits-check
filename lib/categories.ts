export type Status = "ok" | "warn" | "fail" | "unknown" | "info";
export type CategoryKey = "lesbarkeit" | "marke" | "inhalt" | "technik" | "schema" | "antworten";

/** A single check. weight 0 = information only (never affects the score). earned in 0..1, null = not checked. */
export type Finding = {
  id: string;
  kategorie: CategoryKey;
  label: string;
  status: Status;
  detail: string;
  gewicht: number;
  erreicht: number | null;
};

// Weights (sum 100). Documented in docs/BEWERTUNG.md.
export const CATEGORY_META: Record<CategoryKey, { label: string; weight: number; explain: string }> = {
  lesbarkeit: { label: "KI-Lesbarkeit", weight: 25, explain: "Dürfen und können Suchmaschinen und KI-Crawler Ihre Inhalte abrufen und verwerten?" },
  inhalt: { label: "Inhalt & Vertrauen", weight: 25, explain: "Erkennbare Erfahrung, Expertise, Belege und Transparenz (E-E-A-T)." },
  technik: { label: "Technische Grundlagen", weight: 15, explain: "Indexierbarkeit, Metadaten, Sitemap, HTTPS und mobile Darstellung." },
  antworten: { label: "Antwort-Struktur", weight: 15, explain: "Beantwortet die Seite konkrete Fragen Ihrer Kunden direkt und klar?" },
  schema: { label: "Strukturierte Daten", weight: 10, explain: "Maschinenlesbare Angaben zu Unternehmen und Angebot, passend zum sichtbaren Inhalt." },
  marke: { label: "Markenbelege", weight: 10, explain: "Ist Ihr Unternehmen über verlinkte Profile und Bewertungen eindeutig zuzuordnen?" },
};

export const CATEGORY_ORDER: CategoryKey[] = ["lesbarkeit", "inhalt", "technik", "antworten", "schema", "marke"];
