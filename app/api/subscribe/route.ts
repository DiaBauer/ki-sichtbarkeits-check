// Stand-alone sign-up for the kit notification or the newsletter (double opt-in).
// The answer never reveals whether the address is already known.
import { rpc } from "@/lib/db";
import { umgebung } from "@/lib/server-key";
import { herkunftAusRequest, basisUrl } from "@/lib/herkunft";
import { erlaubt, ipSubjekt } from "@/lib/ratelimit";
import { CONSENT_VERSION, TEXTE } from "@/lib/consent";
import { istZweckEinwilligung, leseJson, neuerToken, pruefeEmail, sha256Hex } from "@/lib/tokens";
import { doiMail, mailKonfiguriert, sendeMail } from "@/lib/mail";

export const dynamic = "force-dynamic";

type KontaktZeile = { status: string; doi_noetig: boolean; verwaltungs_token_neu: boolean };

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const body = await leseJson(req, 4 * 1024);
  if (!body) return json({ error: "Die Anfrage konnte nicht gelesen werden." }, 400);
  const email = pruefeEmail(body.email);
  if (!email) return json({ error: "Bitte geben Sie eine gültige E-Mail-Adresse ein." }, 400);
  const zweck = body.zweck;
  if (!istZweckEinwilligung(zweck)) return json({ error: "Unbekannte Anmeldung. Bitte laden Sie die Seite neu." }, 400);

  if (!(await erlaubt("subscribe", ipSubjekt(req), 5, 60 * 60))) {
    return json({ error: "Zu viele Anfragen. Bitte versuchen Sie es in einer Stunde erneut." }, 429);
  }
  // Without mail delivery no confirmation is possible: store nothing.
  if (!mailKonfiguriert()) return json({ status: "mail_fehlt" });

  const umg = umgebung();
  const basis = basisUrl(req);
  const doiToken = neuerToken();
  const verwToken = neuerToken();
  const verwHash = sha256Hex(verwToken);

  try {
    const r = await rpc<KontaktZeile[] | KontaktZeile>("geo_kontakt_setzen", {
      p_email: email,
      p_zweck: zweck,
      p_umgebung: umg,
      p_herkunft: herkunftAusRequest(req),
      p_name: null,
      p_text: TEXTE[zweck],
      p_version: CONSENT_VERSION,
      p_doi_hash: sha256Hex(doiToken),
      p_verw_hash: verwHash,
    });
    const zeile = Array.isArray(r) ? r[0] : r;
    if (zeile?.doi_noetig) {
      const gueltig = (await rpc<boolean>("geo_verwaltungs_token_erneuern", { p_email: email, p_umgebung: umg, p_verw_hash: verwHash })) === true;
      if (gueltig) {
        const m = doiMail({
          zweck,
          bestaetigenLink: `${basis}/e/bestaetigen?t=${doiToken}`,
          abmeldeLink: `${basis}/e/abmelden?t=${verwToken}`,
          loeschLink: `${basis}/e/loeschen?t=${verwToken}`,
        });
        await sendeMail({ an: email, ...m, abmeldeUrl: `${basis}/api/abmelden?t=${verwToken}` });
      }
    }
  } catch (e) {
    console.error("subscribe: fehlgeschlagen", (e as Error).message);
    return json({ error: "Die Anmeldung ist gerade nicht möglich. Bitte versuchen Sie es später erneut." }, 500);
  }
  // Same answer whether new, pending or already confirmed.
  return json({ status: "pruefen_sie_ihr_postfach" });
}
