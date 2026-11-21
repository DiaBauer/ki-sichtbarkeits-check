// Unsubscribes kit notification and newsletter of an address.
// POST { t } from /e/abmelden, or POST ?t=… as RFC 8058 one-click from mail programs.
// GET never unsubscribes (link scanners); it only redirects to the confirmation page.
import { rpc } from "@/lib/db";
import { istToken, sha256Hex } from "@/lib/tokens";
import { newsletterKontaktAbmelden } from "@/lib/mail";

export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

async function tokenAus(req: Request): Promise<string | null> {
  const q = new URL(req.url).searchParams.get("t");
  if (q) return q;
  const typ = req.headers.get("content-type") || "";
  try {
    const text = (await req.text()).slice(0, 2048);
    if (typ.includes("application/json")) {
      const v = JSON.parse(text) as { t?: unknown };
      return typeof v.t === "string" ? v.t : null;
    }
    return new URLSearchParams(text).get("t");
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const t = await tokenAus(req);
  if (!istToken(t)) return json({ ok: false, error: "Der Abmeldelink ist unvollständig. Bitte öffnen Sie den Link aus der E-Mail erneut." }, 400);
  try {
    const r = await rpc<{ zweck: string; email: string }[]>("geo_abmelden", { p_verw_hash: sha256Hex(t) });
    const zeile = Array.isArray(r) ? r[0] : null;
    if (!zeile) {
      return json({ ok: false, error: "Der Link ist ungültig oder wurde durch einen neueren Link ersetzt. Bitte nutzen Sie den Link aus Ihrer neuesten E-Mail oder fordern Sie unter „Meine Daten“ einen neuen Link an." });
    }
    await newsletterKontaktAbmelden(zeile.email);
    return json({ ok: true });
  } catch (e) {
    console.error("abmelden: fehlgeschlagen", (e as Error).message);
    return json({ ok: false, error: "Die Abmeldung ist gerade nicht möglich. Bitte versuchen Sie es später erneut." }, 500);
  }
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const t = u.searchParams.get("t");
  const ziel = new URL("/e/abmelden", u.origin);
  if (t) ziel.searchParams.set("t", t);
  return Response.redirect(ziel, 303);
}
