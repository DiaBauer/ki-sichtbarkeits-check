"use client";

import { useState } from "react";
import {
  BadgeCheck, Bot, Check, Code2, FileSearch, Loader2, Mail, MessageCircleQuestion, Quote, Rocket, ShieldCheck,
  Sparkles, TrendingUp, type LucideIcon,
} from "lucide-react";
import type { Brand } from "@/lib/brand";

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

const STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: FileSearch, title: "Website prüfen", text: "Note, Einzelbefunde und die drei wichtigsten Maßnahmen, sofort und kostenlos." },
  { icon: Sparkles, title: "Bericht freischalten", text: "Zielgruppen, Kundenfragen, Suchbegriffe, alle Maßnahmen und fertiger Code. Gegen Ihre E-Mail-Adresse." },
  { icon: Rocket, title: "Umsetzen", text: "Selbst, mit Ihrem Team oder mit uns. Wir setzen die Maßnahmen um und prüfen danach erneut." },
  { icon: TrendingUp, title: "Sichtbarkeit ausbauen", text: "Monatlich messen, ob ChatGPT & Co. Sie nennen, und neue Antwortinhalte ergänzen." },
];

export function NextSteps() {
  return (
    <section className="wrap steps">
      <div className="section-head">
        <h2>So geht es weiter</h2>
        <p>Vom ersten Check bis zur Empfehlung durch KI-Systeme, in vier Schritten.</p>
      </div>
      <ol className="steps-list">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <span className="step-num">{i + 1}</span>
            <s.icon size={22} className="step-icon" aria-hidden="true" />
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Pricing({ brand }: { brand: Brand }) {
  return (
    <section className="wrap pricing" id="preise">
      <div className="section-head">
        <h2>Leistungen und Preise</h2>
        <p>Der Check und der vollständige Bericht sind kostenlos. Bei der Umsetzung unterstützen wir Sie gern.</p>
      </div>
      <ul className="plans">
        {brand.plans.map((p) => (
          <li key={p.name} className={p.highlight ? "plan plan-hl" : "plan"}>
            {p.highlight && <p className="plan-badge">Am häufigsten gewählt</p>}
            <h3>{p.name}</h3>
            <p className="plan-summary">{p.summary}</p>
            <p className="plan-price">{p.price}</p>
            <p className="plan-unit">{p.unit}</p>
            <ul>
              {p.features.map((f) => (
                <li key={f}>
                  <Check size={16} aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
            <a className={p.highlight ? "btn-primary" : "btn-secondary"} href={p.cta.href}>
              {p.cta.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Newsletter({ brand }: { brand: Brand }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, consent, site: brand.id, source: "newsletter" }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setState("done");
    } else {
      setState("error");
      setMsg(data.error || "Die Anmeldung hat nicht geklappt. Bitte versuchen Sie es erneut.");
    }
  }

  return (
    <section className="wrap">
      <div className="newsletter">
        <div className="nl-text">
          <span className="gate-lock" aria-hidden="true">
            <Mail size={22} />
          </span>
          <div>
            <h2>KI-Sichtbarkeit: das monatliche Update</h2>
            <p>
              Was sich bei ChatGPT, Perplexity und Google AI Overviews ändert und was Sie daraus für Ihre Website machen
              sollten. Einmal im Monat, jederzeit abbestellbar.
            </p>
          </div>
        </div>
        {state === "done" ? (
          <p className="nl-done" role="status">
            <Check size={18} aria-hidden="true" /> Danke! Sie sind angemeldet.
          </p>
        ) : (
          <form className="nl-form" onSubmit={submit}>
            <label htmlFor="nl-email" className="sr-only">
              E-Mail-Adresse
            </label>
            <div className="nl-row">
              <input
                id="nl-email"
                type="email"
                required
                placeholder="ihre@firma.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <button className="btn-primary" type="submit" disabled={state === "sending"}>
                {state === "sending" ? <Loader2 size={18} className="spin" aria-hidden="true" /> : <Mail size={18} aria-hidden="true" />}
                Anmelden
              </button>
            </div>
            <label className="consent">
              <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>
                Ich möchte den Newsletter von {brand.name} erhalten. Abmeldung jederzeit möglich. Details in der{" "}
                <a href={brand.privacyUrl}>Datenschutzerklärung</a>.
              </span>
            </label>
            {state === "error" && (
              <p className="error" role="alert">
                {msg}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
