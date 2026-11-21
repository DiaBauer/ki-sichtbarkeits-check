// Lead flow: delivers the full report (always) and handles the optional, separate
// consents for the kit notification and the newsletter (double opt-in each).
// The report is never coupled to kit/newsletter.
import { unseal } from "@/lib/gate";
import { rpc } from "@/lib/db";
import { umgebung } from "@/lib/server-key";
import { herkunftAusRequest, basisUrl } from "@/lib/herkunft";
import { erlaubt, ipSubjekt } from "@/lib/ratelimit";
import { CONSENT_VERSION, TEXTE } from "@/lib/consent";
import type { ReportData } from "@/lib/report-types";
import { bereinigeName, leseJson, neuerToken, pruefeEmail, sha256Hex, type ZweckEinwilligung } from "@/lib/tokens";
import { berichtMail, doiMail, mailKonfiguriert, sendeMail } from "@/lib/mail";

export const dynamic = "force-dynamic";

const MAX_BODY = 200 * 1024;
const TOKEN_MAX_ALTER_MS = 60 * 60 * 1000;

type Versiegelt = { bericht: ReportData; url: string; t: number };
type KontaktZeile = { status: string; doi_noetig: boolean; verwaltungs_token_neu: boolean };
type ZweckStatus = "ausstehend" | "bestaetigt" | "mail_fehlt";

function fehler(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function ersteZeile<T>(v: T[] | T | null): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export async function POST(req: Request) {
  const body = await leseJson(req, MAX_BODY);
  if (!body) return fehler("Die Anfrage konnte nicht gelesen werden. Bitte laden Sie die Seite neu und versuchen Sie es erneut.", 400);

  const geprueft = pruefeEmail(body.email);
  if (!geprueft) return fehler("Bitte geben Sie eine gültige E-Mail-Adresse ein.", 400);
  const email: string = geprueft;
  const name = bereinigeName(body.name);
  const willKit = body.kit === true;
  const willNewsletter = body.newsletter === true;

  if (!(await erlaubt("lead", ipSubjekt(req), 10, 60 * 60))) {
    return fehler("Zu viele Anfragen. Bitte versuchen Sie es in einer Stunde erneut.", 429);
  }

  let daten: Versiegelt;
  try {
    daten = unseal<Versiegelt>(typeof body.gatedToken === "string" ? body.gatedToken : "");
  } catch {
    return fehler("Die Analyse ist abgelaufen oder ungültig. Bitte starten Sie die Prüfung neu.", 400);
  }
  const alter = Date.now() - Number(daten?.t);
  if (!Number.isFinite(alter) || alter > TOKEN_MAX_ALTER_MS || alter < -5 * 60 * 1000) {
    return fehler("Die Analyse ist älter als 60 Minuten. Bitte starten Sie die Prüfung neu.", 400);
  }
  const bericht = daten.bericht;
  if (!bericht || typeof bericht !== "object" || !Array.isArray(bericht.kategorien)) {
    return fehler("Die Analyse ist unvollständig. Bitte starten Sie die Prüfung neu.", 400);
  }

  const herkunft = herkunftAusRequest(req);
  const umg = umgebung();
  const basis = basisUrl(req);
  const mailAn = mailKonfiguriert();

  // Per recipient: at most 3 report mails per day, so the form cannot be used to flood a third party.
  // The report itself is still shown on the page.
  const proEmailOk = await erlaubt("lead_mail", sha256Hex("mail|" + email), 3, 24 * 60 * 60);
  if (!proEmailOk) {
    return Response.json({ gated: bericht, bericht: { link: "", mailVersandt: false } }, { headers: { "Cache-Control": "no-store" } });
  }

  // 1. Store the report under a fresh report token.
  const berichtToken = neuerToken();
  let berichtGespeichert = false;
  try {
    await rpc("geo_bericht_speichern", {
      p_token_hash: sha256Hex(berichtToken),
      p_email: email,
      p_url: String(daten.url || bericht.url || "").slice(0, 500),
      p_herkunft: herkunft,
      p_umgebung: umg,
      p_daten: bericht,
    });
    berichtGespeichert = true;
  } catch (e) {
    console.error("lead: bericht speichern fehlgeschlagen", (e as Error).message);
  }

  // 2. Contact for report delivery (information, not consent).
  const verwToken = neuerToken();
  const verwHash = sha256Hex(verwToken);
  try {
    await rpc<KontaktZeile[]>("geo_kontakt_setzen", {
      p_email: email,
      p_zweck: "bericht",
      p_umgebung: umg,
      p_herkunft: herkunft,
      p_name: name,
      p_text: TEXTE.bericht,
      p_version: CONSENT_VERSION,
      p_doi_hash: null,
      p_verw_hash: verwHash,
    });
  } catch (e) {
    console.error("lead: kontakt bericht fehlgeschlagen", (e as Error).message);
  }

  // 3. Make sure the management token we send is valid (it may otherwise belong to an older row).
  let verwGueltig = false;
  try {
    verwGueltig = (await rpc<boolean>("geo_verwaltungs_token_erneuern", { p_email: email, p_umgebung: umg, p_verw_hash: verwHash })) === true;
  } catch (e) {
    console.error("lead: verwaltungs-token fehlgeschlagen", (e as Error).message);
  }
  const loeschLink = verwGueltig ? `${basis}/e/loeschen?t=${verwToken}` : `${basis}/e/datenanfrage`;
  const abmeldeLink = `${basis}/e/abmelden?t=${verwToken}`;
  const abmeldeApi = `${basis}/api/abmelden?t=${verwToken}`;

  // 4. Report link mail.
  const berichtLink = berichtGespeichert ? `${basis}/bericht/${berichtToken}` : "";
  let mailVersandt = false;
  if (berichtGespeichert && mailAn) {
    const m = berichtMail({ host: String(bericht.host || "Ihre Website"), berichtLink, loeschLink });
    mailVersandt = (await sendeMail({ an: email, ...m })).versandt;
  }

  // 5. Optional consents, each with its own double opt-in.
  async function einwilligung(zweck: ZweckEinwilligung): Promise<ZweckStatus> {
    // Without mail delivery no confirmation is possible: do not store a pending consent.
    if (!mailAn || !verwGueltig) return "mail_fehlt";
    const doiToken = neuerToken();
    try {
      const zeile = ersteZeile(
        await rpc<KontaktZeile[]>("geo_kontakt_setzen", {
          p_email: email,
          p_zweck: zweck,
          p_umgebung: umg,
          p_herkunft: herkunft,
          p_name: name,
          p_text: TEXTE[zweck],
          p_version: CONSENT_VERSION,
          p_doi_hash: sha256Hex(doiToken),
          p_verw_hash: verwHash,
        }),
      );
      if (!zeile) return "mail_fehlt";
      // Neutral answer: do not reveal whether the address had already confirmed.
      if (zeile.status === "bestaetigt") return "ausstehend";
      if (!zeile.doi_noetig) return "ausstehend"; // confirmation mail was sent less than 10 minutes ago
      const m = doiMail({ zweck, bestaetigenLink: `${basis}/e/bestaetigen?t=${doiToken}`, abmeldeLink, loeschLink });
      const r = await sendeMail({ an: email, ...m, abmeldeUrl: abmeldeApi });
      return r.versandt ? "ausstehend" : "mail_fehlt";
    } catch (e) {
      console.error(`lead: kontakt ${zweck} fehlgeschlagen`, (e as Error).message);
      return "mail_fehlt";
    }
  }

  const antwort: {
    gated: ReportData;
    bericht: { link: string; mailVersandt: boolean };
    kit?: ZweckStatus;
    newsletter?: ZweckStatus;
  } = { gated: bericht, bericht: { link: berichtLink, mailVersandt } };
  if (willKit) antwort.kit = await einwilligung("kit");
  if (willNewsletter) antwort.newsletter = await einwilligung("newsletter");

  return Response.json(antwort, { headers: { "Cache-Control": "no-store" } });
}
