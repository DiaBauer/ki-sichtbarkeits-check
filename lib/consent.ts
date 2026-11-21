// Consent and information texts. Every stored consent records CONSENT_VERSION and the exact text.
// Change the version whenever a text changes.
export const CONSENT_VERSION = "2026-11-21-v1";

export const TEXTE = {
  // Not a consent: information on the purpose (report delivery, Art. 6 (1) (b) GDPR).
  bericht:
    "Wir verwenden Ihre E-Mail-Adresse ausschließlich, um Ihnen den Link zu diesem Prüfbericht zuzusenden und ihn 30 Tage für Sie bereitzuhalten. Keine Werbung ohne Ihre gesonderte Einwilligung.",
  kit:
    "Ja, informieren Sie mich einmalig per E-Mail, sobald das SEO- & GEO-KI-Selbstoptimierungs-Kit verfügbar ist. Ich erhalte zuerst eine E-Mail zur Bestätigung. Widerruf jederzeit über den Link in jeder E-Mail.",
  newsletter:
    "Ja, ich möchte das monatliche Update zur KI-Sichtbarkeit per E-Mail erhalten. Ich erhalte zuerst eine E-Mail zur Bestätigung. Abmeldung jederzeit über den Link in jeder E-Mail.",
} as const;

export type Zweck = keyof typeof TEXTE;
