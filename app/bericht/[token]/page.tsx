import type { Metadata } from "next";
import { rpc } from "@/lib/db";
import { istToken, sha256Hex } from "@/lib/tokens";
import type { ReportData } from "@/lib/report-types";
import BerichtAnsicht from "@/components/BerichtAnsicht";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prüfbericht | KI-Sichtbarkeits-Check",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Gelesen = { daten: ReportData; url: string; erstellt: string; gueltig_bis: string | null };

function Meldung({ titel, text }: { titel: string; text: string }) {
  return (
    <main className="wrap" style={{ maxWidth: 720, padding: "56px 20px" }}>
      <section className="block">
        <h1 className="h3">{titel}</h1>
        <p className="block-intro">{text}</p>
        <a className="btn-primary" href="/">
          Neue Prüfung starten
        </a>
      </section>
    </main>
  );
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!istToken(token)) {
    return <Meldung titel="Bericht nicht gefunden" text="Der Link ist unvollständig oder ungültig. Bitte öffnen Sie den Link direkt aus der E-Mail." />;
  }
  let gelesen: Gelesen | null = null;
  try {
    const r = await rpc<Gelesen | Gelesen[] | null>("geo_bericht_lesen", { p_token_hash: sha256Hex(token) });
    gelesen = Array.isArray(r) ? (r[0] ?? null) : r;
  } catch (e) {
    console.error("bericht: lesen fehlgeschlagen", (e as Error).message);
    return <Meldung titel="Bericht gerade nicht abrufbar" text="Der Bericht kann im Moment nicht geladen werden. Bitte versuchen Sie es in einigen Minuten erneut." />;
  }
  if (!gelesen || !gelesen.daten) {
    return (
      <Meldung
        titel="Bericht abgelaufen oder nicht vorhanden"
        text="Prüfberichte sind 30 Tage abrufbar und werden danach gelöscht. Der Bericht kann auch auf Ihren Wunsch gelöscht worden sein. Sie können Ihre Website jederzeit erneut prüfen."
      />
    );
  }
  return (
    <main>
      <BerichtAnsicht bericht={gelesen.daten} gueltigBis={gelesen.gueltig_bis} />
      <footer className="footer">
        <div className="wrap footer-inner">
          <p className="footer-links">
            <a href="https://ki.services/impressum">Impressum</a>
            <a href="/datenschutz">Datenschutz</a>
            <a href="/e/datenanfrage">Meine Daten</a>
          </p>
        </div>
      </footer>
    </main>
  );
}
