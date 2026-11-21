import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutzhinweise | KI-Sichtbarkeits-Check",
  robots: { index: false, follow: true },
};

const IMPRESSUM = "https://ki.services/impressum";

// Set to the approval date once the open legal decisions are made. Until then the page is marked as a draft.
const FREIGEGEBEN_AM: string | null = null;

export default function Datenschutz() {
  return (
    <main className="wrap" style={{ maxWidth: 820, padding: "48px 20px 80px" }}>
      <p>
        <a href="/">KI-Sichtbarkeits-Check</a>
      </p>
      {!FREIGEGEBEN_AM && (
        <p className="error" role="note">
          <strong>Entwurf.</strong> Diese Hinweise werden derzeit rechtlich geprüft und können sich noch ändern.
        </p>
      )}

      <h1>Datenschutzhinweise für den KI-Sichtbarkeits-Check</h1>
      <p>
        Diese Hinweise gelten für das Werkzeug „KI-Sichtbarkeits-Check“, das unter den Domains von agenticweb.studio,
        KI.services und marketing-studio.ai angeboten wird. Sie beschreiben, welche Daten wir bei der Nutzung verarbeiten, zu
        welchem Zweck und wie lange.
      </p>

      <h2>1. Verantwortliche Stelle</h2>
      <p>
        Verantwortlich ist der im <a href={IMPRESSUM}>Impressum von KI.services</a> genannte Anbieter, auch für die Nutzung über
        agenticweb.studio und marketing-studio.ai. Dort finden Sie auch die Kontaktdaten für Datenschutzanfragen.
      </p>

      <h2>2. Prüfung einer Website</h2>
      <p>
        Wenn Sie eine Webadresse prüfen lassen, rufen wir die Startseite, bis zu zwei Unterseiten und weitere öffentlich
        abrufbare Dateien der Website ab (zum Beispiel robots.txt, Sitemap, strukturierte Daten) und werten sie technisch sowie
        mit KI aus. Dafür ist keine Anmeldung nötig. Wir verarbeiten dabei die geprüfte Adresse und die öffentlich abrufbaren
        Inhalte, nicht Ihre E-Mail-Adresse. Ergebnisse der KI-Auswertung speichern wir bis zu 3 Tage, ohne Bezug zu Ihrer Person,
        damit dieselbe Website nicht mehrfach ausgewertet werden muss.
      </p>
      <p>Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Durchführung der von Ihnen angeforderten Prüfung).</p>

      <h2>3. Schutz vor Missbrauch</h2>
      <p>
        Um die Zahl der Anfragen je Anschluss zu begrenzen, speichern wir Ihre IP-Adresse nicht im Klartext, sondern nur als
        gesalzenen Hashwert zusammen mit einem Zeitstempel. Diese Einträge werden nach etwa 2 Tagen gelöscht. Rechtsgrundlage ist
        Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse ist der Schutz des kostenlosen Angebots vor Missbrauch und
        übermäßigen Kosten.
      </p>
      <p>
        Unser Hosting-Anbieter verarbeitet beim Aufruf der Seiten technisch notwendige Verbindungsdaten (u. a. IP-Adresse,
        Zeitpunkt, aufgerufene Adresse), um die Seiten auszuliefern und den Betrieb abzusichern.
      </p>

      <h2>4. Zustellung des Prüfberichts per E-Mail</h2>
      <p>
        Wenn Sie den vollständigen Bericht anfordern, verarbeiten wir Ihre E-Mail-Adresse und, falls angegeben, Ihren Vornamen.
        Wir senden Ihnen einen Link zum Bericht. Der Bericht ist 30 Tage über diesen Link abrufbar; danach ist er nicht mehr abrufbar und wird gelöscht. Wir
        verwenden Ihre Adresse für diesen Zweck nicht für Werbung. Pro E-Mail-Adresse versenden wir höchstens drei Berichte am
        Tag.
      </p>
      <p>Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Bereitstellung des angeforderten Berichts).</p>

      <h2>5. Kit-Benachrichtigung und monatliches Update (nur mit Einwilligung)</h2>
      <p>
        Unabhängig vom Bericht können Sie zwei Dinge gesondert anfordern: eine einmalige Benachrichtigung, sobald das SEO- &
        GEO-KI-Selbstoptimierungs-Kit verfügbar ist, und das monatliche Update zur KI-Sichtbarkeit. Beides ist freiwillig und
        keine Voraussetzung für den Bericht.
      </p>
      <p>
        Wir nutzen das Double-Opt-in-Verfahren: Erst wenn Sie den Link in unserer Bestätigungs-E-Mail aufrufen und die Anmeldung
        bestätigen, ist sie wirksam. Der Bestätigungslink gilt 7 Tage. Zum Nachweis Ihrer Einwilligung protokollieren wir den
        Wortlaut und die Version des Einwilligungstextes sowie die Zeitpunkte der Anmeldung, des Versands der Bestätigungs-E-Mail,
        der Bestätigung und gegebenenfalls der Abmeldung. Im Ereignisprotokoll steht Ihre E-Mail-Adresse nur pseudonymisiert (als
        Hashwert).
      </p>
      <p>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung); für das Protokoll Art. 6 Abs. 1 lit. c i. V. m. Art. 7 Abs. 1
        DSGVO (Nachweis der Einwilligung).
      </p>
      <p>
        Widerruf: Sie können Ihre Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen, über den Abmeldelink in jeder
        E-Mail oder über die im Impressum genannte Kontaktadresse.
      </p>

      <h2>6. Empfänger und Auftragsverarbeiter</h2>
      <ul>
        <li>
          <strong>Vercel</strong> (USA) – Hosting der Website; die Server-Funktionen laufen in der Region Frankfurt.
        </li>
        <li>
          <strong>Supabase</strong> (USA) – Datenbank; die Daten liegen in der Region Frankfurt (eu-central-1).
        </li>
        <li>
          <strong>Anthropic</strong> (USA) – KI-Auswertung der öffentlich abrufbaren Website-Inhalte. Es werden keine
          E-Mail-Adressen oder Namen übermittelt.
        </li>
        <li>
          <strong>Resend</strong> (USA) – Versand der E-Mails über die Region EU (Irland).
        </li>
      </ul>

      <h2>7. Cookies und Tracking</h2>
      <p>
        Dieses Werkzeug setzt keine Tracking- oder Analyse-Cookies und bindet keine Werbe- oder Analysedienste ein. Schriftarten
        werden vom eigenen Server ausgeliefert.
      </p>

      <h2>8. Ihre Rechte</h2>
      <ul>
        <li>Auskunft über die zu Ihnen gespeicherten Daten (Art. 15 DSGVO)</li>
        <li>Berichtigung (Art. 16 DSGVO) und Löschung (Art. 17 DSGVO)</li>
        <li>Einschränkung der Verarbeitung (Art. 18 DSGVO) und Datenübertragbarkeit (Art. 20 DSGVO)</li>
        <li>Widerspruch gegen Verarbeitungen auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO (Art. 21 DSGVO)</li>
        <li>Widerruf einer Einwilligung mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO)</li>
        <li>Beschwerde bei einer Datenschutz-Aufsichtsbehörde (Art. 77 DSGVO)</li>
      </ul>
      <p>
        Löschung: Über <a href="/e/datenanfrage">„Meine Daten“</a> können Sie einen Löschlink an Ihre E-Mail-Adresse anfordern.
        Mit diesem Link löschen Sie Kontaktdaten, Anmeldungen und gespeicherte Prüfberichte zu dieser Adresse. Ein
        pseudonymisierter Eintrag über die Löschung bleibt als Nachweis erhalten. Für Auskunft und alle anderen Anliegen wenden Sie
        sich an die im <a href={IMPRESSUM}>Impressum</a> genannte Kontaktadresse.
      </p>

      {FREIGEGEBEN_AM && <p style={{ marginTop: 40 }}>Stand: {FREIGEGEBEN_AM}</p>}
    </main>
  );
}
