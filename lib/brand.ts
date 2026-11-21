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
  plans: Plan[];
};

export type Plan = {
  name: string;
  price: string;
  unit: string;
  summary: string;
  features: string[];
  cta: { label: string; href: string };
  highlight?: boolean;
};

// Price proposals; adjust here. All prices net plus VAT.
function plans(contact: string): Plan[] {
  return [
    {
      name: "KI-Sichtbarkeits-Check",
      price: "0 €",
      unit: "kostenlos",
      summary: "Die Bestandsaufnahme in einer Minute.",
      features: ["Note und Punkte in sechs Prüfbereichen", "Alle technischen Einzelbefunde", "Die drei wichtigsten Maßnahmen"],
      cta: { label: "Jetzt prüfen", href: "#check" },
    },
    {
      name: "Vollständiger Bericht",
      price: "0 €",
      unit: "gegen E-Mail-Adresse",
      summary: "Alles, was Sie für die Umsetzung brauchen.",
      features: [
        "Zielgruppen mit geschätztem Anteil",
        "12–15 Kundenfragen nach Entscheidungsphase",
        "Suchbegriffe und alle Maßnahmen",
        "Fertige strukturierte Daten (JSON-LD)",
      ],
      cta: { label: "Bericht erstellen", href: "#check" },
    },
    {
      name: "Umsetzung",
      price: "ab 1.490 €",
      unit: "einmalig, zzgl. MwSt.",
      summary: "Wir machen Ihre Website zitierfähig.",
      features: [
        "Strukturierte Daten, llms.txt, Crawler-Freigaben",
        "Antwortseiten für Ihre wichtigsten Kundenfragen",
        "Profile und Markendaten verknüpft",
        "Erneuter Check nach der Umsetzung",
      ],
      cta: { label: "Erstgespräch buchen", href: contact },
      highlight: true,
    },
    {
      name: "Laufende Betreuung",
      price: "ab 390 €",
      unit: "pro Monat, zzgl. MwSt.",
      summary: "Sichtbarkeit messen und ausbauen.",
      features: [
        "Monatliche Messung in ChatGPT, Perplexity & Co.",
        "Neue Antwortinhalte jeden Monat",
        "Vergleich mit Ihren Wettbewerbern",
        "Monatlicher Bericht",
      ],
      cta: { label: "Anfragen", href: contact },
    },
  ];
}

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
    plans: plans("https://agenticweb.studio/#kontakt"),
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
    plans: plans("https://marketing-studio.ai/#kontakt"),
  },
};

export function brandFor(host: string | null, override?: string | null): Brand {
  if (override === "marketingstudio" || override === "agenticweb") return BRANDS[override];
  if (host && host.includes("marketing-studio")) return BRANDS.marketingstudio;
  return BRANDS.agenticweb;
}
