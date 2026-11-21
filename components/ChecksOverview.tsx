"use client";

import { BadgeCheck, Bot, Check, Code2, MessageCircleQuestion, Quote, ShieldCheck, type LucideIcon } from "lucide-react";

type Area = { icon: LucideIcon; name: string; weight: number; checks: string[] };

const AREAS: Area[] = [
  {
    icon: Quote,
    name: "KI-Zitierfähigkeit",
    weight: 25,
    checks: [
      "Zugriff für 11 KI-Crawler, darunter GPTBot, ClaudeBot, PerplexityBot",
      "Versteckte Sperren durch Cloudflare",
      "llms.txt und llms-full.txt",
      "Jeder Textabschnitt auf Zitierbarkeit bewertet",
    ],
  },
  {
    icon: BadgeCheck,
    name: "Markenautorität",
    weight: 20,
    checks: [
      "Eintrag auf Wikipedia (deutsch und englisch)",
      "Profile auf LinkedIn, YouTube, XING",
      "Bewertungsportale wie ProvenExpert, Trustpilot",
      "Verknüpfte Profile in den strukturierten Daten",
    ],
  },
  {
    icon: ShieldCheck,
    name: "Inhalt & Vertrauen",
    weight: 20,
    checks: [
      "Erfahrung: Projekte, Fallbeispiele, Zahlen",
      "Expertise: benannte Personen mit Qualifikation",
      "Belege statt Werbeversprechen",
      "Impressum, Kontakt, Datenschutz",
    ],
  },
  {
    icon: Bot,
    name: "Technik",
    weight: 15,
    checks: [
      "Lesbarkeit ohne JavaScript",
      "Sitemap, robots.txt, Indexierung",
      "HTTPS und fünf Sicherheits-Header",
      "Ladezeit, Mobilfähigkeit, Canonical",
    ],
  },
  {
    icon: Code2,
    name: "Strukturierte Daten",
    weight: 10,
    checks: [
      "Organisation bzw. lokales Unternehmen",
      "Leistungen, Produkte, Personen",
      "FAQ, Breadcrumbs, Website-Angaben",
      "Gültigkeit des JSON-LD",
    ],
  },
  {
    icon: MessageCircleQuestion,
    name: "Antwort-Struktur",
    weight: 10,
    checks: [
      "Überschriften als Kundenfragen",
      "Direkte Antworten, Definitionen",
      "Preise, Ablauf und Dauer genannt",
      "Eignung für ChatGPT, Perplexity, Google AI Overviews",
    ],
  },
];

export function ChecksOverview() {
  return (
    <section className="wrap checks">
      <div className="section-head">
        <h2>Was geprüft wird</h2>
        <p>
          Über 25 Einzelprüfungen in sechs Bereichen, gewichtet nach ihrem Einfluss darauf, ob KI-Systeme Ihre Website
          zitieren. Die technische Prüfung läuft automatisch, Inhalte und Zielgruppen bewertet Claude, ein KI-Modell von
          Anthropic.
        </p>
      </div>
      <dl className="stats">
        <div>
          <dt>Prüfbereiche</dt>
          <dd>6</dd>
        </div>
        <div>
          <dt>Einzelprüfungen</dt>
          <dd>25+</dd>
        </div>
        <div>
          <dt>KI-Crawler geprüft</dt>
          <dd>11</dd>
        </div>
        <div>
          <dt>Kundenfragen im Bericht</dt>
          <dd>bis 15</dd>
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

