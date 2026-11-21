"use client";

import { useEffect, useRef, useState } from "react";
import type { Brand } from "@/lib/brand";
import { CATEGORY_META, CategoryKey, Finding, Status } from "@/lib/categories";
import { grade, tone, totalScore } from "@/lib/score";
import Seal from "./Seal";
import type { Tone } from "@/lib/score";
import {
  AlertTriangle, BadgeCheck, Bot, CalendarCheck, Check, CheckCircle2, Code2, Copy, FileSearch, Hash, ListChecks,
  Loader2, Lock, MessageCircleQuestion, Quote, ScanSearch, ShieldCheck, Users, Wrench, XCircle, type LucideIcon,
} from "lucide-react";

const CAT_ICON: Record<CategoryKey, LucideIcon> = {
  citability: Quote,
  brand: BadgeCheck,
  content: ShieldCheck,
  technical: Bot,
  schema: Code2,
  answer: MessageCircleQuestion,
};
const STATUS_ICON: Record<Status, LucideIcon> = { ok: CheckCircle2, warn: AlertTriangle, fail: XCircle };

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

type Scan = {
  url: string;
  host: string;
  brand: string;
  scores: Record<"citability" | "brand" | "technical" | "schema", number>;
  findings: Finding[];
  facts: { crawlers: { bot: string; critical: boolean; status: string }[] };
};
type Massnahme = { titel: string; warum: string; wie: string; kategorie: CategoryKey; aufwand: string; wirkung: string };
type FreeInsights = {
  unternehmen: { name: string; branche: string; angebot: string; region: string | null };
  kurzbefund: string;
  inhaltScore: number;
  inhaltBegruendung: string;
  antwortScore: number;
  antwortBegruendung: string;
  massnahmen: Massnahme[];
  counts: { fragen: number; keywords: number; massnahmen: number };
};
type Gated = {
  zielgruppen: { name: string; beschreibung: string; anteil: number }[];
  fragen: { frage: string; phase: "problem" | "loesung" | "anbieter" }[];
  keywords: { begriff: string; relevanz: number }[];
  massnahmen: Massnahme[];
  schemaVorschlag: string;
};

type Phase = "idle" | "scanning" | "analyzing" | "done" | "error";

const SCAN_STEPS = [
  "Seite abrufen, wie ein KI-Crawler sie sieht",
  "robots.txt, llms.txt und Sitemap prüfen",
  "Strukturierte Daten und Profile lesen",
  "Textabschnitte auf Zitierfähigkeit bewerten",
];
const AI_STEP = "Inhalte, Zielgruppen und Kundenfragen auswerten";

const PHASE_LABEL = { problem: "Kennt nur das Problem", loesung: "Sucht eine Lösung", anbieter: "Vergleicht Anbieter" };
const ORDER: CategoryKey[] = ["citability", "brand", "content", "technical", "schema", "answer"];
const STATUS_WORD: Record<Status, string> = { ok: "erfüllt", warn: "teilweise", fail: "nicht erfüllt" };

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
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
  const [gated, setGated] = useState<Gated | null>(null);
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
    setGated(null);
    setGatedToken(null);
    setPhase("scanning");
    let gotScan = false;
    try {
      const s = await post<{ scan: Scan; scanToken: string }>("/api/scan", { url });
      setScan(s.scan);
      gotScan = true;
      setPhase("analyzing");
      setTimeout(() => reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      const i = await post<{ insights: FreeInsights; gatedToken: string }>("/api/insights", { scanToken: s.scanToken });
      setInsights(i.insights);
      setGatedToken(i.gatedToken);
      setPhase("done");
    } catch (err) {
      setError((err as Error).message);
      setPhase(gotScan ? "done" : "error");
    }
  }

  const scores: Partial<Record<CategoryKey, number>> = scan
    ? { ...scan.scores, ...(insights ? { content: insights.inhaltScore, answer: insights.antwortScore } : {}) }
    : {};
  const complete = !!insights;
  const total = complete ? totalScore(scores) : null;
  const g = total !== null ? grade(total) : null;
  const segments: Partial<Record<CategoryKey, Tone>> = Object.fromEntries(
    Object.entries(scores).map(([k, v]) => [k, tone(v as number)]),
  );
  const busy = phase === "scanning" || phase === "analyzing";

  return (
    <main>
      <div className="hero-band">
      <section className="hero wrap">
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
                  </>
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
                {ORDER.map((k) => {
                  const v = scores[k];
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
                          {k === "content" && insights ? insights.inhaltBegruendung : k === "answer" && insights ? insights.antwortBegruendung : CATEGORY_META[k].explain}
                        </span>
                      </th>
                      <td className="num">{CATEGORY_META[k].weight} %</td>
                      <td className="barcol">
                        <div className={`bar ${v === undefined ? "bar-pending" : tone(v)}`}>
                          <span style={{ width: `${v ?? 0}%` }} />
                        </div>
                      </td>
                      <td className="num strong">{v ?? "…"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className="block">
            <H3 icon={FileSearch}>Einzelbefunde</H3>
            <ul className="findings">
              {scan.findings.map((f) => {
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
          </section>

          {insights && (
            <section className="block">
              <H3 icon={Wrench}>Die drei wichtigsten Maßnahmen</H3>
              <Measures items={insights.massnahmen} />
            </section>
          )}

          {insights && gatedToken && !gated && (
            <LeadGate brand={brand} gatedToken={gatedToken} counts={insights.counts} score={total ?? undefined} onUnlock={setGated} />
          )}

          {gated && <Full gated={gated} />}

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

      {phase === "idle" && (
        <section className="wrap explain">
          <h2>Was geprüft wird</h2>
          <dl>
            <div>
              <span className="explain-icon" aria-hidden="true"><Bot size={22} /></span>
              <dt>Ob KI Ihre Seite lesen darf und kann</dt>
              <dd>Sperren in der robots.txt, Seiten, die nur mit JavaScript funktionieren, fehlende Sitemap oder llms.txt.</dd>
            </div>
            <div>
              <span className="explain-icon" aria-hidden="true"><BadgeCheck size={22} /></span>
              <dt>Ob KI versteht, wer Sie sind</dt>
              <dd>Strukturierte Daten zu Ihrem Unternehmen, verknüpfte Profile, Einträge auf Wikipedia und Bewertungsportalen.</dd>
            </div>
            <div>
              <span className="explain-icon" aria-hidden="true"><Quote size={22} /></span>
              <dt>Ob Ihre Texte zitierfähig sind</dt>
              <dd>Klare Antworten auf Kundenfragen, belegte Aussagen, Zahlen, erkennbare Expertise.</dd>
            </div>
          </dl>
          <p className="method">
            Bewertet wird in sechs Bereichen, gewichtet nach ihrem Einfluss auf Zitate in KI-Antworten. Das Ergebnis ist eine
            Schulnote von 1 bis 6 und eine Liste konkreter Maßnahmen.
          </p>
        </section>
      )}
    </main>
  );
}

function Measures({ items, start = 1 }: { items: Massnahme[]; start?: number }) {
  return (
    <ol className="measures" start={start}>
      {items.map((m) => (
        <li key={m.titel}>
          <p className="m-title">{m.titel}</p>
          <p className="m-why">{m.warum}</p>
          <p className="m-how">{m.wie}</p>
          <p className="m-meta">
            {CATEGORY_META[m.kategorie]?.label}, Aufwand {m.aufwand}, Wirkung {m.wirkung}
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
  score,
  onUnlock,
}: {
  brand: Brand;
  gatedToken: string;
  counts: FreeInsights["counts"];
  score?: number;
  onUnlock: (g: Gated) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setErr(null);
    try {
      const r = await post<{ gated: Gated }>("/api/lead", { name, email, consent, gatedToken, score, site: brand.id });
      onUnlock(r.gated);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="gate">
      <div className="gate-head">
        <span className="gate-lock" aria-hidden="true"><Lock size={22} /></span>
        <h3>Vollständigen Bericht freischalten</h3>
      </div>
      <p>Der vollständige Bericht enthält zusätzlich:</p>
      <ul className="gate-list">
        <li><Check size={18} aria-hidden="true" />die drei Zielgruppen, die nach Ihrem Angebot suchen, mit geschätztem Anteil</li>
        <li><Check size={18} aria-hidden="true" />{counts.fragen} Fragen, die Ihre Kunden einer KI stellen, bevor sie einen Anbieter kennen</li>
        <li><Check size={18} aria-hidden="true" />{counts.keywords} Suchbegriffe, für die Sie als Quelle auftauchen sollten</li>
        <li><Check size={18} aria-hidden="true" />alle {counts.massnahmen} Maßnahmen, nach Wirkung sortiert</li>
        <li><Check size={18} aria-hidden="true" />fertige strukturierte Daten (JSON-LD) zum Einfügen in Ihre Website</li>
      </ul>
      <form className="gate-form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="lead-name">Vorname (optional)</label>
          <input id="lead-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
        </div>
        <div className="field">
          <label htmlFor="lead-email">E-Mail-Adresse</label>
          <input id="lead-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <label className="consent">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
          <span>
            Ich bin einverstanden, dass {brand.name} mich zu meinem Prüfbericht und passenden Angeboten per E-Mail kontaktiert.
            Die Einwilligung kann ich jederzeit widerrufen. Details in der <a href={brand.privacyUrl}>Datenschutzerklärung</a>.
          </span>
        </label>
        {err && <p className="error" role="alert">{err}</p>}
        <button type="submit" className="btn-primary" disabled={sending}>
          {sending ? <Loader2 size={18} className="spin" aria-hidden="true" /> : <Lock size={18} aria-hidden="true" />}
          {sending ? "Wird freigeschaltet" : "Bericht freischalten"}
        </button>
      </form>
    </section>
  );
}

function Full({ gated }: { gated: Gated }) {
  const [copied, setCopied] = useState(false);
  const maxRel = Math.max(...gated.keywords.map((k) => k.relevanz), 1);
  return (
    <>
      <section className="block">
        <H3 icon={Users}>Wer nach Ihrem Angebot sucht</H3>
        <ul className="audiences">
          {gated.zielgruppen.map((z) => (
            <li key={z.name}>
              <div className="aud-head">
                <p className="aud-name">{z.name}</p>
                <p className="aud-share">{z.anteil} %</p>
              </div>
              <div className="share">
                <span style={{ width: `${z.anteil}%` }} />
              </div>
              <p className="aud-desc">{z.beschreibung}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="block">
        <H3 icon={MessageCircleQuestion}>Fragen, die Ihre Kunden einer KI stellen</H3>
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
        <p className="keywords">
          {gated.keywords.map((k) => (
            <span key={k.begriff} style={{ fontSize: `${0.9 + (k.relevanz / maxRel) * 0.25}rem` }}>
              {k.begriff}
            </span>
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
        <H3 icon={Code2}>Strukturierte Daten zum Einfügen</H3>
        <p className="block-intro">
          Fügen Sie diesen Code in den Kopfbereich Ihrer Startseite ein, eingebettet in{" "}
          <code>&lt;script type=&quot;application/ld+json&quot;&gt;</code>. Ersetzen Sie die Werte in eckigen Klammern.
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
