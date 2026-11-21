"use client";

import { useState } from "react";
import { Check, Loader2, Mail, Printer } from "lucide-react";

export type Aktion = "bestaetigen" | "abmelden" | "loeschen" | "datenanfrage";

const ZWECK_TEXT: Record<string, string> = {
  kit: "Wir informieren Sie einmalig per E-Mail, sobald das SEO- & GEO-KI-Selbstoptimierungs-Kit verfügbar ist.",
  newsletter: "Sie erhalten ab jetzt das monatliche Update zur KI-Sichtbarkeit. Abmeldung jederzeit über den Link in jeder E-Mail.",
};

const KONFIG: Record<Exclude<Aktion, "datenanfrage">, { api: string; button: string; laeuft: string }> = {
  bestaetigen: { api: "/api/doi", button: "Anmeldung bestätigen", laeuft: "Wird bestätigt" },
  abmelden: { api: "/api/abmelden", button: "Jetzt abmelden", laeuft: "Wird abgemeldet" },
  loeschen: { api: "/api/loeschen", button: "Daten endgültig löschen", laeuft: "Wird gelöscht" },
};

type Zustand = { art: "bereit" } | { art: "laeuft" } | { art: "ok"; text: string } | { art: "fehler"; text: string };

async function sende(api: string, body: unknown): Promise<{ status: number; data: Record<string, unknown> }> {
  const res = await fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, data };
}

export default function EAktion({ aktion, token }: { aktion: Aktion; token: string | null }) {
  const [z, setZ] = useState<Zustand>({ art: "bereit" });
  const [email, setEmail] = useState("");

  if (aktion === "datenanfrage") {
    async function anfordern(e: React.FormEvent) {
      e.preventDefault();
      setZ({ art: "laeuft" });
      try {
        const { data } = await sende("/api/loeschen", { email });
        if (data.ok) setZ({ art: "ok", text: String(data.hinweis || "Falls Daten zu dieser Adresse vorliegen, erhalten Sie eine E-Mail mit einem Löschlink.") });
        else setZ({ art: "fehler", text: String(data.error || "Die Anfrage hat nicht geklappt. Bitte versuchen Sie es erneut.") });
      } catch {
        setZ({ art: "fehler", text: "Keine Verbindung. Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut." });
      }
    }
    if (z.art === "ok") {
      return (
        <p className="nl-done" role="status">
          <Check size={18} aria-hidden="true" /> {z.text}
        </p>
      );
    }
    return (
      <form className="gate-form" onSubmit={anfordern}>
        <div className="field">
          <label htmlFor="da-email">E-Mail-Adresse</label>
          <input id="da-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {z.art === "fehler" && (
          <p className="error" role="alert">
            {z.text}
          </p>
        )}
        <button className="btn-primary" type="submit" disabled={z.art === "laeuft"}>
          {z.art === "laeuft" ? <Loader2 size={18} className="spin" aria-hidden="true" /> : <Mail size={18} aria-hidden="true" />}
          Löschlink anfordern
        </button>
      </form>
    );
  }

  const k = KONFIG[aktion];

  if (!token) {
    return (
      <p className="error" role="alert">
        Dieser Link ist unvollständig. Bitte öffnen Sie den Link direkt aus der E-Mail oder kopieren Sie ihn vollständig in die
        Adresszeile.
      </p>
    );
  }

  async function ausfuehren() {
    setZ({ art: "laeuft" });
    try {
      const { data } = await sende(k.api, { t: token });
      if (!data.ok) {
        setZ({ art: "fehler", text: String(data.error || "Das hat nicht geklappt. Bitte versuchen Sie es später erneut.") });
        return;
      }
      if (aktion === "bestaetigen") {
        setZ({ art: "ok", text: `Vielen Dank, Ihre Anmeldung ist bestätigt. ${ZWECK_TEXT[String(data.zweck)] || ""}`.trim() });
      } else if (aktion === "abmelden") {
        setZ({
          art: "ok",
          text: "Sie sind abgemeldet. Sie erhalten keine Kit-Benachrichtigung und kein monatliches Update mehr. Bereits angeforderte Prüfberichte bleiben bis zu ihrem Ablauf abrufbar.",
        });
      } else {
        setZ({ art: "ok", text: "Ihre Daten wurden gelöscht: Kontaktdaten, Anmeldungen und gespeicherte Prüfberichte zu dieser Adresse." });
      }
    } catch {
      setZ({ art: "fehler", text: "Keine Verbindung. Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut." });
    }
  }

  if (z.art === "ok") {
    return (
      <p className="nl-done" role="status">
        <Check size={18} aria-hidden="true" /> {z.text}
      </p>
    );
  }
  return (
    <div>
      {z.art === "fehler" && (
        <p className="error" role="alert">
          {z.text}
        </p>
      )}
      <button className="btn-primary" type="button" onClick={ausfuehren} disabled={z.art === "laeuft"}>
        {z.art === "laeuft" && <Loader2 size={18} className="spin" aria-hidden="true" />}
        {z.art === "laeuft" ? k.laeuft : k.button}
      </button>
    </div>
  );
}

export function DruckenButton() {
  return (
    <button className="btn-secondary" type="button" onClick={() => window.print()}>
      <Printer size={18} aria-hidden="true" />
      Drucken / als PDF speichern
    </button>
  );
}
