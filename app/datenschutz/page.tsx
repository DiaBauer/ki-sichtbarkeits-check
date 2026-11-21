import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutzhinweise (Entwurf) | KI-Sichtbarkeits-Check",
  robots: { index: false, follow: true },
};

const IMPRESSUM = "https://ki.services/impressum";

function Pruefen({ children }: { children: React.ReactNode }) {
  return <mark>[PRÜFEN: {children}]</mark>;
}

export default function Datenschutz() {
  return (
    <main className="wrap" style={{ maxWidth: 820, padding: "48px 20px 80px" }}>
      <p>
        <a href="/">KI-Sichtbarkeits-Check</a>
      </p>
      <p className="error" role="note">
        <strong>Entwurf – rechtliche Prüfung ausstehend.</strong> Dieser Text ist noch nicht rechtlich geprüft. Mit [PRÜFEN: …]
        markierte Stellen müssen vor der Veröffentlichung ergänzt oder bestätigt werden.
      </p>

      <h1>Datenschutzhinweise für den KI-Sichtbarkeits-Check</h1>
      <p>
        Diese Hinweise gelten für das Werkzeug „KI-Sichtbarkeits-Check“, das unter den Domains von agenticweb.studio,
        KI.services und marketing-studio.ai angeboten wird. Sie beschreiben, welche Daten wir bei der Nutzung verarbeiten, zu
        welchem Zweck und wie lange.
      </p>

      <h2>1. Verantwortliche Stelle</h2>
      <p>
        Verantwortlich ist der im <a href={IMPRESSUM}>Impressum von KI.services</a> genannte Anbieter. Dort finden Sie auch die
        Kontaktdaten für Datenschutzanfragen. <Pruefen>Verantwortlichen für alle drei Marken bestätigen; ggf. Datenschutzbeauftragten benennen</Pruefen>
      </p>

      <h2>2. Prüfung einer Website</h2>
      <p>
        Wenn Sie eine Webadresse prüfen lassen, rufen wir diese Adresse und weitere öffentlich abrufbare Inhalte der Website ab
        (zum Beispiel robots.txt, llms.txt, Sitemap, strukturierte Daten) und werten sie technisch sowie mit KI aus. Dafür ist
        keine Anmeldung nötig. Wir verarbeiten dabei die geprüfte Adresse und die öffentlich abrufbaren Inhalte, nicht Ihre
        E-Mail-Adresse.
      </p>
      <p>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Durchführung der von Ihnen angeforderten Prüfung) bzw. Art. 6 Abs. 1 lit. f
        DSGVO. <Pruefen>Rechtsgrundlage festlegen; Hinweis, falls auf geprüften Seiten personenbezogene Daten Dritter stehen</Pruefen>
      </p>

      <h2>3. Schutz vor Missbrauch</h2>
      <p>
        Um die Zahl der Anfragen je Anschluss zu begrenzen, speichern wir Ihre IP-Adresse nicht im Klartext, sondern nur als
        gesalzenen Hashwert zusammen mit einem Zähler. Diese Einträge werden nach höchstens 2 Tagen gelöscht. Rechtsgrundlage ist
        Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse ist der Schutz des kostenlosen Angebots vor Missbrauch und
        übermäßigen Kosten.
      </p>
      <p>
        Unser Hosting-Anbieter verarbeitet beim Aufruf der Seiten technisch notwendige Verbindungsdaten (u. a. IP-Adresse,
        Zeitpunkt, aufgerufene Adresse). <Pruefen>Umfang und Speicherdauer der Server-Logs bei Vercel</Pruefen>
      </p>

      <h2>4. Zustellung des Prüfberichts per E-Mail</h2>
      <p>
        Wenn Sie den vollständigen Bericht anfordern, verarbeiten wir Ihre E-Mail-Adresse und, falls angegeben, Ihren Vornamen.
        Wir senden Ihnen einen Link zum Bericht. Der Bericht selbst wird 30 Tage gespeichert und ist in dieser Zeit über den Link
        abrufbar; danach wird er gelöscht. Wir verwenden Ihre Adresse für diesen Zweck nicht für Werbung.
      </p>
      <p>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Bereitstellung des angeforderten Berichts). Speicherdauer der Kontaktangabe
        für die Berichtszustellung: <Pruefen>Frist festlegen und technisch umsetzen (derzeit keine automatische Löschung der Kontaktzeile)</Pruefen>
      </p>

      <h2>5. Kit-Benachrichtigung und monatliches Update (nur mit Einwilligung)</h2>
      <p>
        Unabhängig vom Bericht können Sie zwei Dinge gesondert anfordern: eine einmalige Benachrichtigung, sobald das SEO- &
        GEO-KI-Selbstoptimierungs-Kit verfügbar ist, und das monatliche Update zur KI-Sichtbarkeit. Beides ist freiwillig und
        keine Voraussetzung für den Bericht.
      </p>
      <p>
        Wir nutzen das Double-Opt-in-Verfahren: Erst nachdem Sie den Link in unserer Bestätigungs-E-Mail angeklickt und die
        Anmeldung bestätigt haben, ist sie wirksam. Zum Nachweis Ihrer Einwilligung protokollieren wir den Wortlaut und die
        Version des Einwilligungstextes, den Zeitpunkt der Anmeldung, des Versands der Bestätigungs-E-Mail, der Bestätigung und
        gegebenenfalls der Abmeldung. Im Ereignisprotokoll steht Ihre E-Mail-Adresse nur pseudonymisiert (als Hashwert).
      </p>
      <p>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung); für das Protokoll Art. 6 Abs. 1 lit. c i. V. m. Art. 7 Abs. 1
        DSGVO bzw. Art. 6 Abs. 1 lit. f DSGVO (Nachweis der Einwilligung). Unbestätigte Anmeldungen:{" "}
        <Pruefen>Löschfrist für nicht bestätigte Anmeldungen festlegen und umsetzen</Pruefen>. Speicherdauer des Protokolls:{" "}
        <Pruefen>Frist festlegen</Pruefen>
      </p>
      <p>
        Widerruf: Sie können Ihre Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen, über den Abmeldelink in jeder
        E-Mail oder über die im Impressum genannte Kontaktadresse.
      </p>

      <h2>6. Empfänger und Auftragsverarbeiter</h2>
      <ul>
        <li>
          <strong>Vercel Inc.</strong> – Hosting der Website; die Server-Funktionen laufen in der Region Frankfurt.{" "}
          <Pruefen>AV-Vertrag, Drittlandbezug (US-Unternehmen), Rechtsgrundlage der Übermittlung</Pruefen>
        </li>
        <li>
          <strong>Supabase</strong> – Datenbank, Region Frankfurt (eu-central-1). <Pruefen>AV-Vertrag</Pruefen>
        </li>
        <li>
          <strong>Anthropic</strong> – KI-Auswertung der öffentlich abrufbaren Website-Inhalte. Es werden keine E-Mail-Adressen
          übermittelt. Die Verarbeitung kann in den USA erfolgen.{" "}
          <Pruefen>Vertragsgrundlage, Datenschutz-Rahmen (EU-US Data Privacy Framework / Standardvertragsklauseln), Speicherdauer beim Anbieter</Pruefen>
        </li>
        <li>
          <strong>Resend</strong> – Versand der E-Mails (Region EU). <Pruefen>AV-Vertrag, Drittlandbezug, Speicherdauer der Versandprotokolle</Pruefen>
        </li>
      </ul>

      <h2>7. Cookies und Tracking</h2>
      <p>
        Dieses Werkzeug setzt keine Tracking- oder Analyse-Cookies und bindet keine Werbe- oder Analysedienste ein. Schriftarten
        werden vom eigenen Server ausgeliefert. <Pruefen>bestätigen, dass im Vercel-Projekt keine Web Analytics / Speed Insights aktiv sind</Pruefen>
      </p>

      <h2>8. Ihre Rechte</h2>
      <ul>
        <li>Auskunft über die zu Ihnen gespeicherten Daten (Art. 15 DSGVO)</li>
        <li>Berichtigung (Art. 16 DSGVO) und Löschung (Art. 17 DSGVO)</li>
        <li>Einschränkung der Verarbeitung (Art. 18 DSGVO) und Datenübertragbarkeit (Art. 20 DSGVO)</li>
        <li>Widerspruch gegen Verarbeitungen auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO (Art. 21 DSGVO)</li>
        <li>Widerruf einer Einwilligung mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO)</li>
        <li>
          Beschwerde bei einer Datenschutz-Aufsichtsbehörde (Art. 77 DSGVO). <Pruefen>zuständige Aufsichtsbehörde benennen</Pruefen>
        </li>
      </ul>
      <p>
        Löschung: Über <a href="/e/datenanfrage">„Meine Daten“</a> können Sie einen Löschlink an Ihre E-Mail-Adresse anfordern.
        Mit diesem Link löschen Sie Kontaktdaten, Anmeldungen und gespeicherte Prüfberichte zu dieser Adresse. Ein
        pseudonymisierter Eintrag über die Löschung bleibt als Nachweis erhalten. Für Auskunft und alle anderen Anliegen wenden Sie
        sich an die im <a href={IMPRESSUM}>Impressum</a> genannte Kontaktadresse.
      </p>

      <p style={{ marginTop: 40 }}>
        Stand: <Pruefen>Datum nach rechtlicher Prüfung eintragen</Pruefen>
      </p>
    </main>
  );
}
