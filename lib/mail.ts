// E-mail delivery via Resend (EU region, domain ki.services).
// Never log addresses, tokens or links: only status codes and generic reasons.

const RESEND_API = "https://api.resend.com";
const STANDARD_ABSENDER = "KI-Sichtbarkeits-Check <check@ki.services>";
const IMPRESSUM = "https://ki.services/impressum";

export type MailErgebnis = { versandt: true } | { versandt: false; grund: "nicht_konfiguriert" | "fehler" };

export function mailKonfiguriert(): boolean {
  return !!process.env.RESEND_API_KEY;
}

type Nachricht = {
  an: string;
  betreff: string;
  text: string;
  html: string;
  /** https URL for List-Unsubscribe (POST one-click). Required for kit/newsletter mails. */
  abmeldeUrl?: string;
};

export async function sendeMail(n: Nachricht): Promise<MailErgebnis> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { versandt: false, grund: "nicht_konfiguriert" };
  const headers: Record<string, string> = {};
  if (n.abmeldeUrl) {
    headers["List-Unsubscribe"] = `<${n.abmeldeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }
  try {
    const res = await fetch(`${RESEND_API}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || STANDARD_ABSENDER,
        to: [n.an],
        subject: n.betreff,
        text: n.text,
        html: n.html,
        ...(Object.keys(headers).length ? { headers } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`mail: resend status ${res.status}`);
      return { versandt: false, grund: "fehler" };
    }
    return { versandt: true };
  } catch {
    console.error("mail: resend nicht erreichbar");
    return { versandt: false, grund: "fehler" };
  }
}

// ---------- Optional: Resend contacts (only if RESEND_SEGMENT_NEWSLETTER is set; best effort) ----------

async function resendKontakt(method: string, pfad: string, body?: unknown) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !process.env.RESEND_SEGMENT_NEWSLETTER) return;
  try {
    const res = await fetch(`${RESEND_API}${pfad}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!res.ok && res.status !== 404) console.error(`mail: resend contacts status ${res.status}`);
  } catch {
    // best effort, ignore
  }
}

/** After a confirmed newsletter DOI: add the contact to the configured Resend segment. */
export async function newsletterKontaktAnlegen(email: string) {
  const segment = process.env.RESEND_SEGMENT_NEWSLETTER;
  if (!segment) return;
  await resendKontakt("POST", "/contacts", { email, unsubscribed: false, segments: [{ id: segment }] });
}

/** After unsubscribing: mark the Resend contact as unsubscribed (if it exists). */
export async function newsletterKontaktAbmelden(email: string) {
  await resendKontakt("PATCH", `/contacts/${encodeURIComponent(email)}`, { unsubscribed: true });
}

/** After deletion: remove the Resend contact (if it exists). */
export async function newsletterKontaktLoeschen(email: string) {
  await resendKontakt("DELETE", `/contacts/${encodeURIComponent(email)}`);
}

// ---------- Templates ----------

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

type Absatz = string | { link: string; label: string };

function baue(betreff: string, absaetze: Absatz[], fuss: Absatz[]): Omit<Nachricht, "an" | "abmeldeUrl"> {
  const textTeil = (a: Absatz) => (typeof a === "string" ? a : `${a.label}:\n${a.link}`);
  const htmlTeil = (a: Absatz, klein = false) =>
    typeof a === "string"
      ? `<p style="margin:0 0 14px;${klein ? "font-size:13px;color:#555;" : ""}">${esc(a)}</p>`
      : `<p style="margin:0 0 14px;${klein ? "font-size:13px;" : ""}"><a href="${esc(a.link)}" style="color:#0b6f7a;">${esc(a.label)}</a></p>`;
  const impressum = `KI.services – Impressum: ${IMPRESSUM}`;
  const text = [...absaetze.map(textTeil), "--", ...fuss.map(textTeil), impressum].join("\n\n");
  const html = `<!doctype html><html lang="de"><body style="margin:0;padding:24px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a;">
<div style="max-width:560px;margin:0 auto;">
${absaetze.map((a) => htmlTeil(a)).join("\n")}
<hr style="border:none;border-top:1px solid #ddd;margin:24px 0 16px;">
${fuss.map((a) => htmlTeil(a, true)).join("\n")}
<p style="margin:0;font-size:13px;color:#555;">KI.services – <a href="${IMPRESSUM}" style="color:#555;">Impressum</a></p>
</div></body></html>`;
  return { betreff, text, html };
}

export function berichtMail(o: { host: string; berichtLink: string; loeschLink: string }) {
  return baue(
    `Ihr Prüfbericht für ${o.host}`,
    [
      "Guten Tag,",
      `hier ist der Link zu Ihrem Prüfbericht des KI-Sichtbarkeits-Checks für ${o.host}. Der Bericht ist 30 Tage abrufbar und lässt sich über die Druckfunktion als PDF speichern.`,
      { link: o.berichtLink, label: "Prüfbericht öffnen" },
      "Sie erhalten diese E-Mail, weil Sie den Bericht auf unserer Website angefordert haben. Wir verwenden Ihre Adresse ausschließlich für die Zustellung dieses Berichts. Werbung erhalten Sie nur, wenn Sie dem gesondert zugestimmt und dies per E-Mail bestätigt haben.",
    ],
    [{ link: o.loeschLink, label: "Bericht und gespeicherte Daten zu dieser Adresse löschen" }],
  );
}

const ZWECK_INFO = {
  kit: {
    betreff: "Bitte bestätigen: Benachrichtigung zum SEO- & GEO-KI-Selbstoptimierungs-Kit",
    text: "Sie haben angefragt, einmalig per E-Mail informiert zu werden, sobald das SEO- & GEO-KI-Selbstoptimierungs-Kit verfügbar ist.",
  },
  newsletter: {
    betreff: "Bitte bestätigen: monatliches Update zur KI-Sichtbarkeit",
    text: "Sie haben angefragt, das monatliche Update zur KI-Sichtbarkeit per E-Mail zu erhalten.",
  },
} as const;

export function doiMail(o: { zweck: "kit" | "newsletter"; bestaetigenLink: string; abmeldeLink: string; loeschLink: string }) {
  const z = ZWECK_INFO[o.zweck];
  return baue(
    z.betreff,
    [
      "Guten Tag,",
      z.text,
      "Bitte bestätigen Sie Ihre Anmeldung über den folgenden Link. Der Link ist 7 Tage gültig.",
      { link: o.bestaetigenLink, label: "Anmeldung bestätigen" },
      "Wenn Sie das nicht angefordert haben, ignorieren Sie diese E-Mail einfach. Ohne Bestätigung senden wir Ihnen keine weiteren E-Mails zu diesem Zweck.",
    ],
    [
      { link: o.abmeldeLink, label: "Abmelden (Kit-Benachrichtigung und Update)" },
      { link: o.loeschLink, label: "Alle gespeicherten Daten zu dieser Adresse löschen" },
    ],
  );
}

export function loeschMail(o: { loeschLink: string }) {
  return baue(
    "Löschung Ihrer Daten beim KI-Sichtbarkeits-Check",
    [
      "Guten Tag,",
      "Sie haben die Löschung der Daten angefordert, die wir zu dieser E-Mail-Adresse beim KI-Sichtbarkeits-Check gespeichert haben (Prüfberichte, Kit-Benachrichtigung, Update-Anmeldung).",
      "Bitte bestätigen Sie die Löschung über den folgenden Link. Erst nach Ihrer Bestätigung wird gelöscht.",
      { link: o.loeschLink, label: "Löschung bestätigen" },
      "Wenn Sie das nicht angefordert haben, ignorieren Sie diese E-Mail. Es wird dann nichts gelöscht.",
    ],
    [],
  );
}
