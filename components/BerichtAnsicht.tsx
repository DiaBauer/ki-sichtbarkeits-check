"use client";

import { useState } from "react";
import {
  AlertTriangle, CheckCircle2, Check, Code2, Copy, FileSearch, Hash, Info, ListChecks, MessageCircleQuestion, ShieldAlert,
  Users, Wrench, XCircle, HelpCircle, type LucideIcon,
} from "lucide-react";
import type { BefundStatus, ReportData } from "@/lib/report-types";
import { DruckenButton } from "./EAktion";

const STATUS_ICON: Record<BefundStatus, LucideIcon> = {
  ok: CheckCircle2,
  warn: AlertTriangle,
  fail: XCircle,
  unknown: HelpCircle,
  info: Info,
};
const STATUS_WORT: Record<BefundStatus, string> = {
  ok: "erfüllt",
  warn: "teilweise erfüllt",
  fail: "nicht erfüllt",
  unknown: "nicht geprüft",
  info: "Hinweis",
};
const PHASE: Record<ReportData["fragen"][number]["phase"], string> = {
  problem: "Problem verstehen",
  loesung: "Lösungswege vergleichen",
  anbieter: "Anbieter auswählen",
};

function ton(p: number) {
  return p >= 70 ? "ok" : p >= 55 ? "mid" : p >= 40 ? "warn" : "fail";
}

function H3({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <h3 className="h3">
      <span className="h3-icon" aria-hidden="true">
        <Icon size={18} strokeWidth={2} />
      </span>
      {children}
    </h3>
  );
}

function datum(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function BerichtAnsicht({ bericht: b, gueltigBis }: { bericht: ReportData; gueltigBis: string | null }) {
  const [kopiert, setKopiert] = useState(false);
  const kategorien = Array.isArray(b.kategorien) ? b.kategorien : [];
  const kategorieLabel = (k: string) => kategorien.find((c) => c.key === k)?.label || k;
  const notenText =
    b.note === null || b.note === undefined
      ? "Note nicht ermittelbar"
      : `Note ${b.note}${b.vorlaeufig ? " (vorläufig)" : ""}`;

  return (
    <div className="report wrap">
      <div className="report-head">
        <div className="report-title">
          <p className="report-kicker">Prüfbericht für {b.host}</p>
          <h1 className="h3" style={{ fontSize: "2rem" }}>
            {notenText}
          </h1>
          {b.gesamt !== null && b.gesamt !== undefined && <p className="report-company">{b.gesamt} von 100 Punkten</p>}
          {b.vorlaeufig && b.note !== null && (
            <p className="block-intro">
              Vorläufig: Weniger als 80 % der Prüfbereiche (nach Gewicht) konnten geprüft werden. Die Note ist deshalb nur eingeschränkt
              aussagekräftig.
            </p>
          )}
          {b.note === null && (
            <p className="block-intro">Es konnte zu wenig geprüft werden, um eine Note zu vergeben. Die Einzelbefunde unten gelten trotzdem.</p>
          )}
          {b.unternehmen?.name && (
            <p className="report-company">
              {b.unternehmen.name}
              {b.unternehmen.branche ? `, ${b.unternehmen.branche}` : ""}
              {b.unternehmen.region ? `, ${b.unternehmen.region}` : ""}
            </p>
          )}
          {b.kurzbefund && <p className="report-summary">{b.kurzbefund}</p>}
          <p className="block-intro">
            Geprüfte Adresse: {b.url}
            {datum(b.erstellt) && <> · erstellt am {datum(b.erstellt)}</>}
            {datum(gueltigBis) && <> · abrufbar bis {datum(gueltigBis)}</>}
          </p>
          <DruckenButton />
        </div>
      </div>

      <section className="block">
        <H3 icon={ListChecks}>Bewertung nach Prüfbereichen</H3>
        <table className="cats">
          <thead>
            <tr>
              <th scope="col">Bereich</th>
              <th scope="col" className="num">Gewicht</th>
              <th scope="col" className="barcol">Ergebnis</th>
              <th scope="col" className="num">Punkte</th>
            </tr>
          </thead>
          <tbody>
            {kategorien.map((k) => (
              <tr key={k.key}>
                <th scope="row">
                  <span className="cat-name">{k.label}</span>
                  {k.begruendung && <span className="cat-explain">{k.begruendung}</span>}
                </th>
                <td className="num">{k.gewicht} %</td>
                <td className="barcol">
                  {k.punkte === null ? (
                    <span className="cat-explain">nicht geprüft</span>
                  ) : (
                    <div className={`bar ${ton(k.punkte)}`}>
                      <span style={{ width: `${Math.max(0, Math.min(100, k.punkte))}%` }} />
                    </div>
                  )}
                </td>
                <td className="num strong">{k.punkte === null ? "–" : k.punkte}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {b.befunde?.length > 0 && (
        <section className="block">
          <H3 icon={FileSearch}>Einzelbefunde</H3>
          <ul className="findings">
            {b.befunde.map((f) => {
              const Icon = STATUS_ICON[f.status] || Info;
              return (
                <li key={f.id} className={f.status}>
                  <Icon size={20} className="mark" aria-hidden="true" />
                  <div>
                    <p className="f-label">
                      {f.label} <span className="cat-explain">({STATUS_WORT[f.status] || f.status})</span>
                    </p>
                    <p className="f-detail">{f.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {b.massnahmen?.length > 0 && (
        <section className="block">
          <H3 icon={Wrench}>Maßnahmen</H3>
          <ol className="measures">
            {b.massnahmen.map((m) => (
              <li key={m.titel}>
                <p className="m-title">{m.titel}</p>
                {m.befund && <p className="m-why">Befund: {m.befund}</p>}
                <p className="m-how">{m.wie}</p>
                <p className="m-meta">
                  {kategorieLabel(m.kategorie)}, Aufwand {m.aufwand}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {(b.zielgruppen?.length > 0 || b.fragen?.length > 0) && (
        <section className="block">
          <H3 icon={Users}>Zielgruppen und Kundenfragen</H3>
          <p className="block-intro">
            <strong>Aus Ihren Website-Inhalten abgeleitet – Annahmen, keine Messung.</strong> Diese Angaben beruhen auf einer
            KI-Auswertung der öffentlich abrufbaren Inhalte Ihrer Website, nicht auf Such- oder Nutzungsdaten.
          </p>
          {b.zielgruppen?.length > 0 && (
            <ul className="audiences">
              {b.zielgruppen.map((z) => (
                <li key={z.name}>
                  <div className="aud-head">
                    <p className="aud-name">{z.name}</p>
                  </div>
                  <p className="aud-desc">{z.beschreibung}</p>
                </li>
              ))}
            </ul>
          )}
          {(["problem", "loesung", "anbieter"] as const).map((ph) => {
            const liste = (b.fragen || []).filter((f) => f.phase === ph);
            if (!liste.length) return null;
            return (
              <div key={ph} className="qgroup">
                <h4>{PHASE[ph]}</h4>
                <ul className="questions">
                  {liste.map((f) => (
                    <li key={f.frage}>
                      <MessageCircleQuestion size={18} aria-hidden="true" />
                      <span>{f.frage}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      )}

      {b.suchbegriffe?.length > 0 && (
        <section className="block">
          <H3 icon={Hash}>Suchbegriffe</H3>
          <p className="block-intro">Aus Ihren Website-Inhalten abgeleitet – Annahmen, keine Messung von Suchvolumen oder Rankings.</p>
          <ul>
            {b.suchbegriffe.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      )}

      {b.schemaVorschlag && (
        <section className="block">
          <H3 icon={Code2}>Strukturierte Daten (JSON-LD), Vorschlag</H3>
          <p className="block-intro">
            Vor dem Einsatz prüfen und Werte in eckigen Klammern ersetzen. Einbinden im Kopfbereich der Startseite in{" "}
            <code>&lt;script type=&quot;application/ld+json&quot;&gt;</code>.
          </p>
          <div className="code">
            <button
              className="copy"
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(b.schemaVorschlag).then(() => {
                  setKopiert(true);
                  setTimeout(() => setKopiert(false), 2000);
                });
              }}
            >
              {kopiert ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              {kopiert ? "Kopiert" : "Code kopieren"}
            </button>
            <pre>{b.schemaVorschlag}</pre>
          </div>
        </section>
      )}

      <section className="block">
        <H3 icon={ShieldAlert}>Grenzen dieser Analyse</H3>
        {b.grenzen?.length > 0 ? (
          <ul>
            {b.grenzen.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        ) : (
          <p className="block-intro">Dieser Bericht ist eine automatisierte Momentaufnahme und keine Garantie für Sichtbarkeit in KI-Systemen.</p>
        )}
      </section>
    </div>
  );
}
