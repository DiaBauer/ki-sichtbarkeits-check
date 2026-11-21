export type Brand = {
  id: "agenticweb" | "marketingstudio";
  name: string;
  accent: string;
  accentInk: string;
  ctaHeadline: string;
  ctaText: string;
  ctaLabel: string;
  ctaUrl: string;
  privacyUrl: string;
  imprintUrl: string;
};

export const BRANDS: Record<Brand["id"], Brand> = {
  agenticweb: {
    id: "agenticweb",
    name: "agenticweb.studio",
    accent: "#17bfcf",
    accentInk: "#0f1726",
    ctaHeadline: "Sie möchten, dass KI Sie empfiehlt?",
    ctaText:
      "Wir setzen die Maßnahmen aus diesem Prüfbericht für Sie um: strukturierte Daten, Antwortseiten, llms.txt und eine Website, die KI-Systeme verstehen.",
    ctaLabel: "Erstgespräch vereinbaren",
    ctaUrl: "https://agenticweb.studio/#kontakt",
    privacyUrl: "https://agenticweb.studio/datenschutz",
    imprintUrl: "https://agenticweb.studio/impressum",
  },
  marketingstudio: {
    id: "marketingstudio",
    name: "marketing-studio.ai",
    accent: "#17bfcf",
    accentInk: "#0f1726",
    ctaHeadline: "Sie möchten von KI-Suchen Anfragen bekommen?",
    ctaText:
      "Wir machen aus diesem Prüfbericht einen Umsetzungsplan: Inhalte, die Kundenfragen beantworten, saubere Markendaten und messbare Sichtbarkeit in ChatGPT & Co.",
    ctaLabel: "Erstgespräch vereinbaren",
    ctaUrl: "https://marketing-studio.ai/#kontakt",
    privacyUrl: "https://marketing-studio.ai/datenschutz",
    imprintUrl: "https://marketing-studio.ai/impressum",
  },
};

export function brandFor(host: string | null, override?: string | null): Brand {
  if (override === "marketingstudio" || override === "agenticweb") return BRANDS[override];
  if (host && host.includes("marketing-studio")) return BRANDS.marketingstudio;
  return BRANDS.agenticweb;
}
