import { herkunftAusHost, type Herkunft } from "./herkunft";

export type Brand = {
  id: Herkunft;
  name: string;
  accent: string;
  accentInk: string;
  kontaktUrl: string;
  impressumUrl: string;
  datenschutzUrl: string;
  // Used by components/Checker.tsx.
  ctaHeadline: string;
  ctaText: string;
  ctaLabel: string;
  ctaUrl: string;
  privacyUrl: string;
  imprintUrl: string;
};

// Provisional: one imprint for all brands until each brand has its own legal pages.
const IMPRESSUM = "https://ki.services/impressum";
const DATENSCHUTZ = "/datenschutz";

const CTA_TEXT =
  "Sie können die Maßnahmen aus diesem Bericht selbst umsetzen. Ein SEO- & GEO-KI-Selbstoptimierungs-Kit mit Anleitungen und Prompts ist in Vorbereitung. Wenn Sie Unterstützung möchten, können Sie eine einmalige Umsetzung anfragen; wir prüfen vorher Website, Zugriff und Aufwand.";

function marke(id: Herkunft, name: string, kontaktUrl: string, ctaHeadline: string): Brand {
  return {
    id,
    name,
    accent: "#17bfcf",
    accentInk: "#0f1726",
    kontaktUrl,
    impressumUrl: IMPRESSUM,
    datenschutzUrl: DATENSCHUTZ,
    ctaHeadline,
    ctaText: CTA_TEXT,
    ctaLabel: "Umsetzung anfragen",
    ctaUrl: kontaktUrl,
    privacyUrl: DATENSCHUTZ,
    imprintUrl: IMPRESSUM,
  };
}

export const BRANDS: Record<Herkunft, Brand> = {
  agenticweb: marke("agenticweb", "agenticweb.studio", "https://agenticweb.studio/#kontakt", "Wie geht es nach dem Bericht weiter?"),
  kiservices: marke("kiservices", "KI.services", "https://ki.services/#kontakt", "Wie geht es nach dem Bericht weiter?"),
  marketingstudio: marke("marketingstudio", "marketing-studio.ai", "https://marketing-studio.ai/#kontakt", "Wie geht es nach dem Bericht weiter?"),
};

/** Brand from the Host header; a ?brand= override is only honoured via the herkunft whitelist (test domains). */
export function brandFor(host: string | null, override?: string | null): Brand {
  return BRANDS[herkunftAusHost(host, override)];
}
