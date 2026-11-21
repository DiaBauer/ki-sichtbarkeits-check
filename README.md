# KI-Sichtbarkeits-Check

Kostenloser GEO-Check (Generative Engine Optimization) als Lead-Magnet für
**agenticweb.studio** und **marketing-studio.ai**, verlinkt von ki.services.
Eine Codebasis, das Branding wechselt automatisch nach Domain.

## Ablauf

1. Besucher gibt eine URL ein. `/api/scan` prüft deterministisch:
   KI-Crawler in robots.txt, Cloudflare-Sperre, llms.txt, Sitemap, Lesbarkeit ohne
   JavaScript, JSON-LD, sameAs-Profile, Wikipedia, Frage-Überschriften, Impressum/
   Datenschutz, HTTPS-Header, Zitierfähigkeit der Textabschnitte.
2. `/api/insights` lässt Claude Sonnet 5.5 (über Vercel AI Gateway) Inhalte,
   Antwort-Struktur, Zielgruppen, Kundenfragen, Suchbegriffe und Maßnahmen bewerten.
3. Ergebnis: Schulnote 1–6, Punkte in sechs gewichteten Bereichen, Einzelbefunde,
   drei Top-Maßnahmen.
4. Gegen E-Mail und Einwilligung (`/api/lead`) wird der vollständige Bericht freigeschaltet:
   Zielgruppen, Kundenfragen, Suchbegriffe, alle Maßnahmen, fertiges JSON-LD.
   Der gesperrte Teil liegt verschlüsselt beim Client (AES-GCM) und wird erst nach
   der Lead-Erfassung entschlüsselt.

Gewichtung: KI-Zitierfähigkeit 25 %, Markenautorität 20 %, Inhalt & Vertrauen 20 %,
Technik 15 %, Strukturierte Daten 10 %, Antwort-Struktur 10 %.

Die Prüfmethode basiert auf [geo-seo-claude](https://github.com/zubair-trabzada/geo-seo-claude)
(MIT) und wurde nach TypeScript portiert und um deutsche Sprachmuster erweitert.

## Einrichtung auf Vercel

1. Repository in Vercel importieren (Framework: Next.js; Region fra1 steht in vercel.json).
2. Umgebungsvariablen setzen:
   - `GATE_SECRET`: beliebige lange Zufallszeichenkette (Pflicht)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: für die Lead-Speicherung (optional;
     ohne sie landen Leads im Vercel-Log als `{"evt":"lead",...}`)
3. KI: `ANTHROPIC_API_KEY` setzen (direkte Abrechnung bei Anthropic, Modell
   claude-sonnet-5-5). Ohne Key wird das Vercel AI Gateway verwendet.
4. Domains verbinden, z. B. `check.agenticweb.studio` und `check.marketing-studio.ai`.
   Zum Testen der zweiten Marke ohne Domain: `?brand=marketingstudio`.

## Supabase-Tabelle

```sql
create table public.geo_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  email text not null,
  checked_url text not null,
  brand_detected text,
  score int,
  site text,
  consent_at timestamptz not null
);
alter table public.geo_leads enable row level security;
-- keine Policies: nur der Service-Role-Key (Server) darf schreiben/lesen
```

## Kosten pro Check

Gemessen wird im Log (`{"evt":"insights", in, out}`). Erwartung bei Sonnet 5.5
(2 $/10 $ pro Mio. Tokens): ca. 15–25 Tsd. Eingabe- und 3–4 Tsd. Ausgabe-Tokens,
also rund 0,07–0,09 $ pro vollständigem Check.

## Offen

- Impressum-/Datenschutz-Links in `lib/brand.ts` zeigen auf die künftigen Seiten der Marken.
- Ratelimit ist pro Server-Instanz; bei viel Traffic auf einen gemeinsamen Speicher umstellen.
- Double-Opt-in-Mail und Bericht als PDF (Bezahlstufe) folgen in Stufe 2.
