import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EAktion, { type Aktion } from "@/components/EAktion";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ihre Daten | KI-Sichtbarkeits-Check",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const TEXTE: Record<Aktion, { titel: string; text: string[] }> = {
  bestaetigen: {
    titel: "Anmeldung bestätigen",
    text: [
      "Bitte bestätigen Sie mit dem Button, dass Sie die angeforderten E-Mails erhalten möchten. Erst mit Ihrer Bestätigung wird die Anmeldung wirksam.",
      "Wenn Sie das nicht angefordert haben, schließen Sie diese Seite einfach. Ohne Bestätigung erhalten Sie nichts.",
    ],
  },
  abmelden: {
    titel: "Abmelden",
    text: [
      "Mit dem Button melden Sie diese E-Mail-Adresse von der Kit-Benachrichtigung und vom monatlichen Update ab.",
      "Bereits angeforderte Prüfberichte bleiben bis zu ihrem Ablauf nach 30 Tagen abrufbar. Wenn Sie alle Daten löschen möchten, nutzen Sie den Löschlink aus der E-Mail oder „Meine Daten“.",
    ],
  },
  loeschen: {
    titel: "Daten löschen",
    text: [
      "Mit dem Button löschen Sie alle Daten, die wir zu dieser E-Mail-Adresse beim KI-Sichtbarkeits-Check gespeichert haben: Kontaktdaten, Anmeldungen und gespeicherte Prüfberichte. Die Berichtslinks funktionieren danach nicht mehr.",
      "Die Löschung kann nicht rückgängig gemacht werden. Ein pseudonymisierter Protokolleintrag über die Löschung bleibt als Nachweis erhalten.",
    ],
  },
  datenanfrage: {
    titel: "Meine Daten",
    text: [
      "Hier können Sie die Löschung Ihrer Daten anfordern. Geben Sie dazu die E-Mail-Adresse ein, mit der Sie den Check genutzt haben. Wir senden Ihnen einen Link, mit dem Sie die Löschung bestätigen.",
      "Für eine Auskunft über die gespeicherten Daten wenden Sie sich bitte an die im Impressum genannte Kontaktadresse.",
    ],
  },
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ aktion: string }>;
  searchParams: Promise<{ t?: string | string[] }>;
}) {
  const { aktion } = await params;
  if (!(aktion in TEXTE)) notFound();
  const a = aktion as Aktion;
  const sp = await searchParams;
  const t = typeof sp.t === "string" ? sp.t : null;
  const inhalt = TEXTE[a];
  return (
    <main className="wrap" style={{ maxWidth: 720, padding: "56px 20px" }}>
      <p>
        <a href="/">KI-Sichtbarkeits-Check</a>
      </p>
      <section className="block">
        <h1 className="h3">{inhalt.titel}</h1>
        {inhalt.text.map((p) => (
          <p key={p} className="block-intro">
            {p}
          </p>
        ))}
        <EAktion aktion={a} token={t} />
      </section>
      <p style={{ marginTop: 32 }}>
        <a href="/datenschutz">Datenschutzhinweise</a>
      </p>
    </main>
  );
}
