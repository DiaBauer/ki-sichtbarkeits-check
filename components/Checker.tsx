"use client";

import { useEffect, useRef, useState } from "react";
import type { Brand } from "@/lib/brand";
import { CATEGORY_META, CATEGORY_ORDER, CategoryKey, Finding, Status } from "@/lib/categories";
import { grade, tone } from "@/lib/score";
import { TEXTE } from "@/lib/consent";
import type { ReportData } from "@/lib/report-types";
import Seal from "./Seal";
import HeroVisual from "./HeroVisual";
import { ChecksOverview } from "./ChecksOverview";
import type { Tone } from "@/lib/score";
import {
  AlertTriangle, BadgeCheck, Bot, CalendarCheck, Check, CheckCircle2, Code2, Copy, FileSearch, Hash, HelpCircle, Info, ListChecks,
  Loader2, Mail, MessageCircleQuestion, Quote, ScanSearch, ShieldCheck, Users, Wrench, XCircle, type LucideIcon,
} from "lucide-react";

const CAT_ICON: Record<CategoryKey, LucideIcon> = {
  lesbarkeit: Bot,
  inhalt: ShieldCheck,
  technik: Quote,
  antworten: MessageCircleQuestion,
  schema: Code2,
  marke: BadgeCheck,
};
const STATUS_ICON: Record<Status, LucideIcon> = { ok: CheckCircle2, warn: AlertTriangle, fail: XCircle, unknown: HelpCircle, info: Info };

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

type Scan = { url: string; host: string; brand: string; findings: Finding[] };
type Massnahme = ReportData["massnahmen"][number];
type FreeInsights = Pick<ReportData, "gesamt" | "note" | "vorlaeufig" | "kategorien" | "befunde" | "unternehmen" | "kurzbefund" | "massnahmen" | "grenzen"> & {
  counts: { fragen: number; suchbegriffe: number; massnahmen: number; zielgruppen: number };
};
type ZweckStatus = "ausstehend" | "bestaetigt" | "mail_fehlt";
type LeadAntwort = { gated: ReportData; bericht: { link: string; mailVersandt: boolean }; kit?: ZweckStatus; newsletter?: ZweckStatus };

type Phase = "idle" | "scanning" | "analyzing" | "done" | "error";

const SCAN_STEPS = [
  "Seite abrufen, wie ein KI-Crawler sie sieht",
  "robots.txt, Sitemap und Indexierbarkeit prüfen",
  "Strukturierte Daten und Profile lesen",
  "Textabschnitte auf Zitierfähigkeit bewerten",
];
const AI_STEP = "Inhalte, Zielgruppen und Kundenfragen auswerten";

const PHASE_LABEL = { problem: "Kennt nur das Problem", loesung: "Sucht eine Lösung", anbieter: "Vergleicht Anbieter" };
const STATUS_WORD: Record<Status, string> = { ok: "erfüllt", warn: "teilweise", fail: "nicht erfüllt", unknown: "nicht geprüft", info: "Hinweis" };

async function post<T>(path: string, body: unknown, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({ error: "Unerwartete Antwort vom Server." }));
  if (!res.ok) throw new Error(data.error || "Unbekannter Fehler.");
  return data as T;
}

export default function Checker({ brand, initialUrl }: { brand: Brand; initialUrl: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [scan, setScan] = useState<Scan | null>(null);
  const [insights, setInsights] = useState<FreeInsights | null>(null);
  const [gatedToken, setGatedToken] = useState<string | null>(null);
  const [lead, setLead] = useState<LeadAntwort | null>(null);
  const [testmodus, setTestmodus] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase !== "scanning") return;
    setStep(0);
    const id = setInterval(() => setStep((s) => Math.min(s + 1, SCAN_STEPS.length - 1)), 1800);
    return () => clearInterval(id);
  }, [phase]);

  async function run(e?: React.FormEvent) {
    e?.preventDefault();
    if (phase === "scanning" || phase === "analyzing") return;
    setError(null);
    setScan(null);
    setInsights(null);
    setLead(null);
    setGatedToken(null);
    setTestmodus(false);
    setPhase("scanning");
    let gotScan = false;
    try {
      const s = await post<{ scan: Scan; scanToken: string }>("/api/scan", { url });
      setScan(s.scan);
      gotScan = true;
      setPhase("analyzing");
      setTimeout(() => reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      const i = await post<{ insights: FreeInsights; gatedToken: string; testmodus?: boolean }>("/api/insights", { scanToken: s.scanToken });
      setInsights(i.insights);
      setTestmodus(!!i.testmodus);
      setGatedToken(i.gatedToken);
      setPhase("done");
    } catch (err) {
      setError((err as Error).message);
      setPhase(gotScan ? "done" : "error");
    }
  }

  const kat = Object.fromEntries((insights?.kategorien ?? []).map((k) => [k.key, k])) as Partial<Record<CategoryKey, FreeInsights["kategorien"][number]>>;
  const total = insights?.gesamt ?? null;
  const g = total !== null ? grade(total) : null;
  const segments: Partial<Record<CategoryKey, Tone | "unknown">> = Object.fromEntries(
    Object.values(kat).map((k) => [k!.key, k!.punkte === null ? "unknown" : tone(k!.punkte)]),
  );
  const befunde = insights?.befunde ?? scan?.findings ?? [];
  const sichtbar = befunde.filter((f) => f.status !== "info");
  const hinweise = befunde.filter((f) => f.status === "info");
  const busy = phase === "scanning" || phase === "analyzing";

  return (
    <main>
      <div className="hero-band" id="check">
      <section className="hero wrap hero-grid">
        <div className="hero-copy">
        <h1>Versteht KI, was Ihr Unternehmen anbietet?</h1>
        <p className="lede">
          Immer mehr Kunden fragen ChatGPT, Perplexity oder Google, statt selbst zu suchen. Dieser Check prüft, ob Ihre
          Website dort als Quelle auftauchen kann, und sagt Ihnen, was Sie ändern müssen.
        </p>
        <form className="urlform" onSubmit={run}>
          <label htmlFor="url" className="sr-only">
            Webadresse
          </label>
          <input
            id="url"
            inputMode="url"
            autoComplete="url"
            placeholder="ihre-firma.de"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={busy}
            required
          />
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? <Loader2 size={20} className="spin" aria-hidden="true" /> : <ScanSearch size={20} aria-hidden="true" />}
            {busy ? "Prüfung läuft" : "Website prüfen"}
          </button>
        </form>
        <ul className="assurances">
          <li><Check size={16} aria-hidden="true" /> Kostenlos</li>
          <li><Check size={16} aria-hidden="true" /> Ohne Anmeldung</li>
          <li><Check size={16} aria-hidden="true" /> Ergebnis in etwa einer Minute</li>
        </ul>
        {error && phase === "error" && <p className="error" role="alert">{error}</p>}
        </div>
        <HeroVisual />
      </section>
      </div>

      {phase === "scanning" && (
        <section className="wrap progress" aria-live="polite">
          <ol>
            {SCAN_STEPS.map((s, i) => (
              <li key={s} className={i < step ? "done" : i === step ? "active" : ""}>
                {s}
              </li>
            ))}
            <li>{AI_STEP}</li>
          </ol>
        </section>
      )}

      {scan && (
        <div ref={reportRef} className="report wrap" aria-live="polite">
          <div className="report-head">
            <Seal note={g?.note ?? null} score={total} segments={segments} host={scan.host} />
            <div className="report-title">
              <p className="report-kicker">Prüfbericht für {scan.host}</p>
              <h2>
                {g ? (
                  <>
                    Note {g.note}: {g.label}
                    {insights?.vorlaeufig ? " (vorläufig)" : ""}
                  </>
                ) : insights ? (
                  "Zu wenig prüfbar für eine Note"
                ) : (
                  "Auswertung läuft"
                )}
              </h2>
              {insights ? (
                <>
                  <p className="report-company">
                    {insights.unternehmen.name}, {insights.unternehmen.branche}
                    {insights.unternehmen.region ? `, ${insights.unternehmen.region}` : ""}
                  </p>
                  <p className="report-summary">{insights.kurzbefund}</p>
                  {testmodus && <p className="error" role="note">Testmodus: Die KI-Auswertung ist in dieser Vorschau abgeschaltet. Inhalts- und Antwortwerte sind Platzhalter.</p>}
                  {insights.vorlaeufig && (
                    <p className="report-summary pending-text">Vorläufig: Ein Teil der Prüfpunkte war nicht abrufbar und fließt nicht in die Note ein.</p>
                  )}
                </>
              ) : phase === "analyzing" ? (
                <p className="report-summary pending-text">
                  Die technische Prüfung ist abgeschlossen. Jetzt werden Inhalte, Zielgruppen und Kundenfragen ausgewertet.
                  Das dauert noch etwa 30 bis 60 Sekunden.
                </p>
              ) : null}
              {error && <p className="error" role="alert">{error} <button className="linkbtn" onClick={() => run()}>Erneut versuchen</button></p>}
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
                {CATEGORY_ORDER.map((k) => {
                  const v = kat[k]?.punkte ?? undefined;
                  const nichtGeprueft = kat[k] !== undefined && kat[k]!.punkte === null;
                  return (
                    <tr key={k}>
                      <th scope="row">
                        <span className="cat-name">
                          {(() => {
                            const Icon = CAT_ICON[k];
                            return <Icon size={17} className="cat-icon" aria-hidden="true" />;
                          })()}
                          {CATEGORY_META[k].label}
                        </span>
                        <span className="cat-explain">
                          {kat[k]?.begruendung || CATEGORY_META[k].explain}
                        </span>
                      </th>
                      <td className="num">{CATEGORY_META[k].weight} %</td>
                      <td className="barcol">
                        <div className={`bar ${v === undefined ? "bar-pending" : tone(v)}`}>
                          <span style={{ width: `${v ?? 0}%` }} />
                        </div>
                      </td>
                      <td className="num strong">{nichtGeprueft ? "n. g." : v ?? "…"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className="block">
            <H3 icon={FileSearch}>Einzelbefunde</H3>
            <ul className="findings">
              {sichtbar.map((f) => {
                const Icon = STATUS_ICON[f.status];
                return (
                <li key={f.id} className={f.status}>
                  <Icon size={20} className="mark" aria-hidden="true" />
                  <div>
                    <p className="f-label">
                      {f.label} <span className="sr-only">({STATUS_WORD[f.status]})</span>
                    </p>
                    <p className="f-detail">{f.detail}</p>
                  </div>
                </li>
                );
              })}
            </ul>
            {hinweise.length > 0 && (
              <>
                <p className="block-intro"><strong>Hinweise ohne Einfluss auf die Note</strong></p>
                <ul className="findings">
                  {hinweise.map((f) => (
                    <li key={f.id} className="info">
                      <Info size={20} className="mark" aria-hidden="true" />
                      <div>
                        <p className="f-label">{f.label} <span className="sr-only">(Hinweis)</span></p>
                        <p className="f-detail">{f.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {insights && (
            <section className="block">
              <H3 icon={Wrench}>Die drei wichtigsten Maßnahmen</H3>
              <Measures items={insights.massnahmen} />
            </section>
          )}

          {insights && gatedToken && !lead && (
            <LeadGate brand={brand} gatedToken={gatedToken} counts={insights.counts} onUnlock={setLead} />
          )}

          {lead && <Freigeschaltet lead={lead} />}
          {lead && <Full gated={lead.gated} />}

          {insights && (
            <section className="block">
              <H3 icon={Info}>Grenzen dieser Prüfung</H3>
              <ul className="steps-list">
                {insights.grenzen.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </section>
          )}

          {insights && (
            <section className="cta">
              <h3>{brand.ctaHeadline}</h3>
              <p>{brand.ctaText}</p>
              <a className="btn-primary" href={brand.ctaUrl}>
                <CalendarCheck size={20} aria-hidden="true" />
                {brand.ctaLabel}
              </a>
            </section>
          )}
        </div>
      )}

      {phase === "idle" && <ChecksOverview />}
    </main>
  );
}

function Measures({ items, start = 1 }: { items: Massnahme[]; start?: number }) {
  return (
    <ol className="measures" start={start}>
      {items.map((m) => (
        <li key={m.titel}>
          <p className="m-title">{m.titel}</p>
          <p className="m-why">Befund: {m.befund}</p>
          <p className="m-how">{m.wie}</p>
          <p className="m-meta">
            {CATEGORY_META[m.kategorie]?.label}, Aufwand {m.aufwand}
          </p>
        </li>
      ))}
    </ol>
  );
}

function LeadGate({
  brand,
  gatedToken,
  counts,
  onUnlock,
}: {
  brand: Brand;
  gatedToken: string;
  counts: FreeInsights["counts"];
  onUnlock: (l: LeadAntwort) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [kit, setKit] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setErr(null);
    try {
      const r = await post<LeadAntwort>("/api/lead", { name, email, kit, newsletter, gatedToken }, { "x-geo-brand": brand.id });
      onUnlock(r);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="gate">
      <div className="gate-head">
        <span className="gate-lock" aria-hidden="true"><Mail size={22} /></span>
        <h3>Vollständigen Bericht per E-Mail erhalten</h3>
      </div>
      <p>Der vollständige Bericht enthält zusätzlich:</p>
      <ul className="gate-list">
        <li><Check size={18} aria-hidden="true" />{counts.zielgruppen} Zielgruppen, die aus Ihren Inhalten abgeleitet sind</li>
        <li><Check size={18} aria-hidden="true" />{counts.fragen} Fragen, die Interessenten einer KI stellen könnten</li>
        <li><Check size={18} aria-hidden="true" />{counts.suchbegriffe} Suchbegriffe als Ausgangspunkt für Ihre Inhalte</li>
        <li><Check size={18} aria-hidden="true" />alle {counts.massnahmen} Maßnahmen mit Bezug zum jeweiligen Befund</li>
        <li><Check size={18} aria-hidden="true" />einen Vorschlag für strukturierte Daten (JSON-LD)</li>
      </ul>
      <form className="gate-form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="lead-name">Vorname (optional)</label>
          <input id="lead-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
        </div>
        <div className="field">
          <label htmlFor="lead-email">E-Mail-Adresse</label>
          <input id="lead-email" type="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <p className="consent-info">
          {TEXTE.bericht} Details in der <a href={brand.privacyUrl}>Datenschutzerklärung</a>.
        </p>
        <label className="consent">
          <input type="checkbox" checked={kit} onChange={(e) => setKit(e.target.checked)} />
          <span><strong>Selbst umsetzen?</strong> Das SEO- & GEO-KI-Selbstoptimierungs-Kit ist in Vorbereitung. Optional: {TEXTE.kit}</span>
        </label>
        <label className="consent">
          <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} />
          <span>Optional: {TEXTE.newsletter}</span>
        </label>
        {err && <p className="error" role="alert">{err}</p>}
        <button type="submit" className="btn-primary" disabled={sending}>
          {sending ? <Loader2 size={18} className="spin" aria-hidden="true" /> : <Mail size={18} aria-hidden="true" />}
          {sending ? "Wird gesendet" : "Bericht anzeigen und zusenden"}
        </button>
      </form>
    </section>
  );
}

const ZWECK_TEXT: Record<ZweckStatus, string> = {
  ausstehend: "Bitte bestätigen Sie den Link in der E-Mail, die wir Ihnen gerade geschickt haben.",
  bestaetigt: "Bereits bestätigt.",
  mail_fehlt: "Konnte gerade nicht eingetragen werden, weil der E-Mail-Versand nicht verfügbar ist.",
};

function Freigeschaltet({ lead }: { lead: LeadAntwort }) {
  return (
    <section className="block" role="status">
      <H3 icon={Mail}>Ihr vollständiger Bericht</H3>
      <p className="block-intro">
        {lead.bericht.mailVersandt
          ? "Wir haben Ihnen den Link zu diesem Bericht per E-Mail geschickt. Er ist 30 Tage abrufbar."
          : lead.bericht.link
            ? "Der E-Mail-Versand ist gerade nicht verfügbar. Speichern Sie sich diesen Link, er ist 30 Tage abrufbar: "
            : "Der Bericht wird unten angezeigt. Der E-Mail-Versand ist gerade nicht verfügbar."}
        {!lead.bericht.mailVersandt && lead.bericht.link && <a href={lead.bericht.link}>{lead.bericht.link}</a>}
      </p>
      {lead.kit && <p className="block-intro">Kit-Benachrichtigung: {ZWECK_TEXT[lead.kit]}</p>}
      {lead.newsletter && <p className="block-intro">Monatliches Update: {ZWECK_TEXT[lead.newsletter]}</p>}
    </section>
  );
}

function Full({ gated }: { gated: ReportData }) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <section className="block">
        <H3 icon={Users}>Mögliche Zielgruppen</H3>
        <p className="block-intro">Aus Ihren Website-Inhalten abgeleitet. Es sind Annahmen, keine Marktdaten.</p>
        <ul className="audiences">
          {gated.zielgruppen.map((z) => (
            <li key={z.name}>
              <div className="aud-head">
                <p className="aud-name">{z.name}</p>
              </div>
              <p className="aud-desc">{z.beschreibung}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="block">
        <H3 icon={MessageCircleQuestion}>Fragen, die Interessenten einer KI stellen könnten</H3>
        <p className="block-intro">
          Für diese Fragen sollte Ihre Website eine klare, zitierfähige Antwort liefern. Sortiert danach, wie weit der Kunde in
          seiner Entscheidung ist.
        </p>
        {(["problem", "loesung", "anbieter"] as const).map((ph) => {
          const list = gated.fragen.filter((f) => f.phase === ph);
          if (!list.length) return null;
          return (
            <div key={ph} className="qgroup">
              <h4>{PHASE_LABEL[ph]}</h4>
              <ul className="questions">
                {list.map((f) => (
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

      <section className="block">
        <H3 icon={Hash}>Suchbegriffe</H3>
        <p className="block-intro">Ausgangspunkt für Ihre Inhalte, ohne Suchvolumendaten.</p>
        <p className="keywords">
          {gated.suchbegriffe.map((k) => (
            <span key={k}>{k}</span>
          ))}
        </p>
      </section>

      {gated.massnahmen.length > 3 && (
        <section className="block">
          <H3 icon={Wrench}>Weitere Maßnahmen</H3>
          <Measures items={gated.massnahmen.slice(3)} start={4} />
        </section>
      )}

      <section className="block">
        <H3 icon={Code2}>Vorschlag für strukturierte Daten</H3>
        <p className="block-intro">
          Prüfen Sie jeden Wert: Strukturierte Daten müssen dem sichtbaren Inhalt Ihrer Seite entsprechen. Einbetten in{" "}
          <code>&lt;script type=&quot;application/ld+json&quot;&gt;</code>, Werte in eckigen Klammern ersetzen.
        </p>
        <div className="code">
          <button
            className="copy"
            onClick={() => {
              navigator.clipboard.writeText(gated.schemaVorschlag).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }}
          >
            {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            {copied ? "Kopiert" : "Code kopieren"}
          </button>
          <pre>{gated.schemaVorschlag}</pre>
        </div>
      </section>
    </>
  );
}
