"use client";

import { useState } from "react";
import { BellRing, Check, FileSearch, Loader2, Mail, MailCheck, RefreshCw, Wrench, type LucideIcon } from "lucide-react";
import type { Brand } from "@/lib/brand";
import { TEXTE } from "@/lib/consent";

const STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: FileSearch, title: "Website prüfen", text: "Note, Einzelbefunde und die wichtigsten Maßnahmen. Kostenlos, in etwa einer Minute." },
  { icon: MailCheck, title: "Bericht per E-Mail erhalten", text: "Den vollständigen Bericht erhalten Sie als Link per E-Mail. Er ist 30 Tage abrufbar und lässt sich als PDF speichern." },
  { icon: Wrench, title: "Selbst umsetzen oder anfragen", text: "Setzen Sie die Maßnahmen selbst um (ein Kit dafür ist in Vorbereitung) oder fragen Sie eine einmalige Umsetzung an." },
  { icon: RefreshCw, title: "Erneut prüfen", text: "Prüfen Sie Ihre Website nach den Änderungen erneut und vergleichen Sie die Befunde." },
];

export function NextSteps() {
  return (
    <section className="wrap steps">
      <div className="section-head">
        <h2>So geht es weiter</h2>
        <p>Vom ersten Check bis zur Umsetzung, in vier Schritten.</p>
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

type AnmeldeZustand = "idle" | "sending" | "done" | "mail_fehlt" | "error";

const ERFOLG = "Fast geschafft: Bitte bestätigen Sie Ihre Anmeldung über den Link in der E-Mail.";
const MAIL_FEHLT = "Der E-Mail-Versand ist gerade nicht verfügbar. Ihre Anmeldung wurde deshalb nicht gespeichert. Bitte versuchen Sie es später erneut.";

function useAnmeldung(zweck: "kit" | "newsletter") {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<AnmeldeZustand>("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) return;
    setState("sending");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, zweck }),
      });
      const data = (await res.json().catch(() => ({}))) as { status?: string; error?: string };
      if (res.ok && data.status === "pruefen_sie_ihr_postfach") setState("done");
      else if (res.ok && data.status === "mail_fehlt") setState("mail_fehlt");
      else {
        setState("error");
        setMsg(data.error || "Die Anmeldung hat nicht geklappt. Bitte versuchen Sie es erneut.");
      }
    } catch {
      setState("error");
      setMsg("Keine Verbindung. Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.");
    }
  }
  return { email, setEmail, consent, setConsent, state, msg, submit };
}

function AnmeldeFormular({ zweck, id, button }: { zweck: "kit" | "newsletter"; id: string; button: string }) {
  const a = useAnmeldung(zweck);
  if (a.state === "done") {
    return (
      <p className="nl-done" role="status">
        <Check size={18} aria-hidden="true" /> {ERFOLG}
      </p>
    );
  }
  return (
    <form className="nl-form" onSubmit={a.submit}>
      <label htmlFor={id} className="sr-only">
        E-Mail-Adresse
      </label>
      <div className="nl-row">
        <input
          id={id}
          type="email"
          required
          placeholder="ihre@firma.de"
          value={a.email}
          onChange={(e) => a.setEmail(e.target.value)}
          autoComplete="email"
        />
        <button className="btn-primary" type="submit" disabled={a.state === "sending"}>
          {a.state === "sending" ? <Loader2 size={18} className="spin" aria-hidden="true" /> : <Mail size={18} aria-hidden="true" />}
          {button}
        </button>
      </div>
      <label className="consent">
        <input type="checkbox" required checked={a.consent} onChange={(e) => a.setConsent(e.target.checked)} />
        <span>
          {TEXTE[zweck]} Details in den <a href="/datenschutz">Datenschutzhinweisen</a>.
        </span>
      </label>
      {a.state === "mail_fehlt" && (
        <p className="error" role="status">
          {MAIL_FEHLT}
        </p>
      )}
      {a.state === "error" && (
        <p className="error" role="alert">
          {a.msg}
        </p>
      )}
    </form>
  );
}

export function Weitermachen({ brand }: { brand: Brand }) {
  return (
    <section className="wrap pricing" id="weitermachen">
      <div className="section-head">
        <h2>Nach dem Bericht: so können Sie weitermachen</h2>
        <p>Der Check und der Bericht sind kostenlos. Für die Umsetzung haben Sie zwei Wege.</p>
      </div>
      <ul className="plans">
        <li className="plan">
          <p className="plan-badge">In Vorbereitung</p>
          <h3>Selber umsetzen</h3>
          <p className="plan-summary">Verbessern Sie die Sichtbarkeit Ihrer Website selbst – Schritt für Schritt mit KI.</p>
          <p>
            Das SEO- & GEO-KI-Selbstoptimierungs-Kit enthält Anleitungen, Checklisten und erprobte Prompts für Claude, Codex und
            ChatGPT. Es ist noch nicht verfügbar. Auf Wunsch informieren wir Sie einmalig, sobald es so weit ist.
          </p>
          <h4>Benachrichtigen, sobald verfügbar</h4>
          <AnmeldeFormular zweck="kit" id="kit-email" button="Benachrichtigen" />
        </li>
        <li className="plan">
          <h3>KI-gestützt umsetzen</h3>
          <p className="plan-summary">Optionaler, einmaliger Umsetzungsservice auf Anfrage.</p>
          <ul>
            <li>
              <Check size={16} aria-hidden="true" />
              Erst nach Prüfung von Website, technischem Zugriff und Aufwand
            </li>
            <li>
              <Check size={16} aria-hidden="true" />
              Einmalige Leistung, kein Abo
            </li>
            <li>
              <Check size={16} aria-hidden="true" />
              Keine Garantie für Platzierungen oder Nennungen in KI-Systemen
            </li>
          </ul>
          <a className="btn-secondary" href={brand.kontaktUrl}>
            Anfrage stellen
          </a>
        </li>
      </ul>
    </section>
  );
}

export function Newsletter() {
  return (
    <section className="wrap">
      <div className="newsletter">
        <div className="nl-text">
          <span className="gate-lock" aria-hidden="true">
            <BellRing size={22} />
          </span>
          <div>
            <h2>KI-Sichtbarkeit: das monatliche Update</h2>
            <p>
              Was sich bei ChatGPT, Perplexity und Google AI Overviews ändert und was das für Websites bedeuten kann. Einmal im Monat,
              jederzeit abbestellbar.
            </p>
          </div>
        </div>
        <AnmeldeFormular zweck="newsletter" id="nl-email" button="Anmelden" />
      </div>
    </section>
  );
}
