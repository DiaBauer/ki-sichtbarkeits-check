"use client";

import { BadgeCheck, Bot, Check, Code2, MessageCircleQuestion, Quote, ShieldCheck, type LucideIcon } from "lucide-react";

type Area = { icon: LucideIcon; name: string; weight: number; checks: string[] };

const AREAS: Area[] = [
  {
    icon: Bot,
    name: "KI-Lesbarkeit",
    weight: 25,
    checks: [
      "Zugriff für Google, Bing und die Such-Crawler von ChatGPT, Perplexity, Claude",
      "Inhalt ohne JavaScript lesbar",
      "Textabschnitte auf Zitierfähigkeit bewertet",
      "Hinweise zu Trainings-Crawlern und Cloudflare-Regeln",
    ],
  },
  {
    icon: ShieldCheck,
    name: "Inhalt & Vertrauen",
    weight: 25,
    checks: [
      "Erfahrung: Projekte, Fallbeispiele, Zahlen",
      "Expertise: benannte Personen mit Qualifikation",
      "Belege statt Werbeversprechen",
      "Impressum, Kontakt, Datenschutz verlinkt",
    ],
  },
  {
    icon: Quote,
    name: "Technische Grundlagen",
    weight: 15,
    checks: [
      "Indexierbarkeit, Seitentitel und Beschreibung",
      "Sitemap und robots.txt",
      "HTTPS und mobile Darstellung",
      "Hinweise zu Antwortzeit und Sicherheits-Headern",
    ],
  },
  {
    icon: MessageCircleQuestion,
    name: "Antwort-Struktur",
    weight: 15,
    checks: [
      "Überschriften als Kundenfragen",
      "Direkte Antworten und Definitionen",
      "Ablauf, Dauer und Preisrahmen genannt",
    ],
  },
  {
    icon: Code2,
    name: "Strukturierte Daten",
    weight: 10,
    checks: [
      "Angaben zu Unternehmen und Leistungen",
      "Technisch fehlerfreies JSON-LD",
      "Abgleich mit dem sichtbaren Inhalt",
    ],
  },
  {
    icon: BadgeCheck,
    name: "Markenbelege",
    weight: 10,
    checks: [
      "Verlinkte Profile wie LinkedIn, YouTube, XING",
      "Verlinkte Bewertungsprofile",
      "Verknüpfte Profile in den strukturierten Daten",
    ],
  },
];

export function ChecksOverview() {
  return (
    <section className="wrap checks">
      <div className="section-head">
        <h2>Was geprüft wird</h2>
        <p>
          Rund 25 Prüfpunkte in sechs Bereichen zu den technischen und inhaltlichen Voraussetzungen, damit Suchmaschinen
          und KI-Assistenten Ihre Website verstehen und als Quelle nutzen können. Die technische Prüfung läuft automatisch,
          Inhalte bewertet Claude, ein KI-Modell von Anthropic. Ob KI-Systeme Sie tatsächlich nennen, misst der Check nicht.
        </p>
      </div>
      <dl className="stats">
        <div>
          <dt>Prüfbereiche</dt>
          <dd>6</dd>
        </div>
        <div>
          <dt>Einzelprüfungen</dt>
          <dd>~25</dd>
        </div>
        <div>
          <dt>Such- und KI-Crawler geprüft</dt>
          <dd>12</dd>
        </div>
        <div>
          <dt>Kundenfragen im Bericht</dt>
          <dd>bis 14</dd>
        </div>
      </dl>
      <ul className="areas">
        {AREAS.map((a) => (
          <li key={a.name}>
            <div className="area-head">
              <span className="explain-icon">
                <a.icon size={22} aria-hidden="true" />
              </span>
              <div>
                <h3>{a.name}</h3>
                <p className="area-weight">{a.weight} % der Gesamtnote</p>
              </div>
            </div>
            <ul className="area-checks">
              {a.checks.map((c) => (
                <li key={c}>
                  <Check size={16} aria-hidden="true" />
                  {c}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

