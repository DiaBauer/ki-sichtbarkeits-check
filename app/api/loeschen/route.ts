// Deletion: POST { t } deletes all contacts and reports of the address (in this environment).
// POST { email } requests a deletion link by mail; the answer is always the same.
import { rpc } from "@/lib/db";
import { umgebung } from "@/lib/server-key";
import { erlaubt, ipSubjekt } from "@/lib/ratelimit";
import { istToken, leseJson, neuerToken, pruefeEmail, sha256Hex } from "@/lib/tokens";
import { loeschMail, mailKonfiguriert, newsletterKontaktLoeschen, sendeMail } from "@/lib/mail";

export const dynamic = "force-dynamic";

const ANTWORT = "Falls Daten zu dieser Adresse vorliegen, erhalten Sie eine E-Mail mit einem Löschlink.";

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const body = await leseJson(req, 4 * 1024);
  if (!body) return json({ ok: false, error: "Die Anfrage konnte nicht gelesen werden." }, 400);

  if (body.t !== undefined) {
    const t = body.t;
    if (!istToken(t)) return json({ ok: false, error: "Der Löschlink ist unvollständig. Bitte öffnen Sie den Link aus der E-Mail erneut." }, 400);
    try {
      const hash = sha256Hex(t);
      // Read the address first (for the optional Resend cleanup); geo_abmelden only changes kit/newsletter, which are deleted next anyway.
      let email: string | null = null;
      if (process.env.RESEND_SEGMENT_NEWSLETTER) {
        const r = await rpc<{ zweck: string; email: string }[]>("geo_abmelden", { p_verw_hash: hash });
        email = Array.isArray(r) && r[0] ? r[0].email : null;
      }
      const n = Number(await rpc<number>("geo_loeschen", { p_verw_hash: hash })) || 0;
      if (n === 0) {
        return json({ ok: false, geloescht: 0, error: "Der Link ist ungültig, wurde bereits verwendet oder durch einen neueren Link ersetzt. Sie können unter „Meine Daten“ einen neuen Löschlink anfordern." });
      }
      if (email) await newsletterKontaktLoeschen(email);
      return json({ ok: true, geloescht: n });
    } catch (e) {
      console.error("loeschen: fehlgeschlagen", (e as Error).message);
      return json({ ok: false, error: "Die Löschung ist gerade nicht möglich. Bitte versuchen Sie es später erneut." }, 500);
    }
  }

  const email = pruefeEmail(body.email);
  if (!email) return json({ ok: false, error: "Bitte geben Sie eine gültige E-Mail-Adresse ein." }, 400);
  if (!(await erlaubt("loeschen", ipSubjekt(req), 5, 60 * 60))) {
    return json({ ok: false, error: "Zu viele Anfragen. Bitte versuchen Sie es in einer Stunde erneut." }, 429);
  }
  if (!mailKonfiguriert()) {
    return json({
      ok: false,
      error: "Der E-Mail-Versand ist gerade nicht verfügbar. Bitte wenden Sie sich für Ihre Löschanfrage an die im Impressum genannte Kontaktadresse.",
    });
  }
  const token = neuerToken();
  try {
    const gesetzt = (await rpc<boolean>("geo_verwaltungs_token_erneuern", { p_email: email, p_umgebung: umgebung(), p_verw_hash: sha256Hex(token) })) === true;
    if (gesetzt) {
      const basis = new URL(req.url).origin;
      await sendeMail({ an: email, ...loeschMail({ loeschLink: `${basis}/e/loeschen?t=${token}` }) });
    }
  } catch (e) {
    console.error("loeschen: anfrage fehlgeschlagen", (e as Error).message);
    return json({ ok: false, error: "Die Anfrage ist gerade nicht möglich. Bitte versuchen Sie es später erneut." }, 500);
  }
  return json({ ok: true, hinweis: ANTWORT });
}
