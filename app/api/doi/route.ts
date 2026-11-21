// Confirms a double opt-in. Only via POST (button on /e/bestaetigen), never via GET,
// so that link scanners in mail systems cannot confirm on the user's behalf.
import { rpc } from "@/lib/db";
import { istToken, leseJson, sha256Hex } from "@/lib/tokens";
import { newsletterKontaktAnlegen } from "@/lib/mail";

export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const body = await leseJson(req, 2 * 1024);
  const t = body?.t;
  if (!istToken(t)) return json({ ok: false, error: "Der Bestätigungslink ist unvollständig. Bitte öffnen Sie den Link aus der E-Mail erneut." }, 400);
  try {
    const r = await rpc<{ zweck: string; email: string }[]>("geo_doi_bestaetigen", { p_doi_hash: sha256Hex(t) });
    const zeile = Array.isArray(r) ? r[0] : null;
    if (!zeile) {
      return json({ ok: false, error: "Der Link ist abgelaufen, wurde bereits verwendet oder ist ungültig. Sie können sich auf der Startseite erneut anmelden." });
    }
    if (zeile.zweck === "newsletter") await newsletterKontaktAnlegen(zeile.email);
    return json({ ok: true, zweck: zeile.zweck });
  } catch (e) {
    console.error("doi: fehlgeschlagen", (e as Error).message);
    return json({ ok: false, error: "Die Bestätigung ist gerade nicht möglich. Bitte versuchen Sie es später erneut." }, 500);
  }
}
