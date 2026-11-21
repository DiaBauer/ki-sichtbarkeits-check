import type { CategoryKey } from "./categories";

export type BefundStatus = "ok" | "warn" | "fail" | "unknown" | "info";

/** Full report as stored (geo_bericht.daten) and rendered on /bericht/[token]. No personal data. */
export type ReportData = {
  url: string;
  host: string;
  erstellt: string; // ISO
  gesamt: number | null; // 0–100, null if too little could be checked
  note: number | null; // 1–6
  vorlaeufig: boolean; // true if less than 80 % of the weight could be checked
  kategorien: { key: CategoryKey; label: string; gewicht: number; punkte: number | null; begruendung: string }[];
  befunde: { id: string; label: string; status: BefundStatus; detail: string }[];
  unternehmen: { name: string; branche: string; angebot: string; region: string | null };
  kurzbefund: string;
  massnahmen: { titel: string; befund: string; wie: string; kategorie: CategoryKey; aufwand: string }[];
  zielgruppen: { name: string; beschreibung: string }[];
  fragen: { frage: string; phase: "problem" | "loesung" | "anbieter" }[];
  suchbegriffe: string[];
  schemaVorschlag: string;
  grenzen: string[]; // limits of the analysis, always shown
};
