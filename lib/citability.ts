// Port of geo-seo-claude scripts/citability_scorer.py (MIT, Zubair Trabzada),
// extended with German patterns. German capitalises every noun, so the
// original "proper noun" heuristic is replaced by a brand/number/entity check.

export type Passage = { heading: string | null; text: string };

const DEF_PATTERNS = [
  /\b\w+\s+is\s+(?:a|an|the)\s/i,
  /\b\w+\s+refers?\s+to\s/i,
  /\b\w+\s+(?:can be |are )?defined\s+as\s/i,
  /\b\w+\s+(?:ist|sind)\s+(?:ein|eine|einer|der|die|das)\s/i,
  /\b\w+\s+(?:bezeichnet|beschreibt|meint|bedeutet)\s/i,
  /\b(?:versteht man|spricht man von|kurz gesagt|einfach gesagt|mit anderen worten)\b/i,
];

const ATTRIBUTION =
  /(according to|research shows|studies? (?:show|found)|data shows|laut\s|gemäß\s|einer studie|studien zeigen|untersuchungen zeigen|daten zeigen|nach angaben)/i;

const PRONOUNS =
  /\b(it|they|them|their|this|that|these|those|es|sie|ihr|ihre|ihnen|dies|diese|dieser|dieses|jene|er|ihm|ihn)\b/gi;

const LIST_WORDS =
  /\b(first|second|finally|additionally|furthermore|erstens|zweitens|zunächst|außerdem|darüber hinaus|schließlich|anschließend)\b/i;

const ORIGINAL =
  /(our (?:research|study|data|analysis|survey)|we (?:found|analyzed|measured)|unsere (?:studie|analyse|daten|auswertung|umfrage)|wir haben (?:\d|über|mehr als)|in unseren projekten|aus unserer praxis)/i;

const CASE = /(case study|for example|fallstudie|praxisbeispiel|zum beispiel|beispielsweise|kundenprojekt|referenz)/i;

export function scorePassage(p: Passage, brand: string | null) {
  const text = p.text;
  const words = text.split(/\s+/).filter(Boolean);
  const wc = words.length;
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

  // 1. Answer block quality (30)
  let abq = 0;
  if (DEF_PATTERNS.some((r) => r.test(text))) abq += 15;
  const first60 = words.slice(0, 60).join(" ");
  if (/\b(is|are|ist|sind|bedeutet|heißt)\b|\d+\s?%|\d+\s?(€|euro|eur)|\$\d/i.test(first60)) abq += 10;
  if (p.heading && p.heading.trim().endsWith("?")) abq += 10;
  if (sentences.length) {
    const clear = sentences.filter((s) => {
      const n = s.split(/\s+/).filter(Boolean).length;
      return n >= 5 && n <= 25;
    }).length;
    abq += Math.round((clear / sentences.length) * 10);
  }
  if (ATTRIBUTION.test(text)) abq += 5;
  abq = Math.min(abq, 30);

  // 2. Self-containment (25)
  let sc = 0;
  if (wc >= 134 && wc <= 167) sc += 10;
  else if (wc >= 100 && wc <= 200) sc += 7;
  else if (wc >= 80 && wc <= 250) sc += 4;
  else if (wc >= 30 && wc <= 400) sc += 2;
  const pron = (text.match(PRONOUNS) || []).length;
  const ratio = wc ? pron / wc : 1;
  sc += ratio < 0.02 ? 8 : ratio < 0.04 ? 5 : ratio < 0.06 ? 3 : 0;
  let entity = 0;
  if (brand && text.toLowerCase().includes(brand.toLowerCase())) entity += 4;
  if (/\d/.test(text)) entity += 2;
  if (/\b[A-ZÄÖÜ]{2,}\b/.test(text)) entity += 1;
  sc += Math.min(entity, 7);
  sc = Math.min(sc, 25);

  // 3. Structural readability (20)
  let sr = 0;
  if (sentences.length) {
    const avg = wc / sentences.length;
    sr += avg >= 10 && avg <= 20 ? 8 : avg >= 8 && avg <= 25 ? 5 : 2;
  }
  if (LIST_WORDS.test(text)) sr += 4;
  if (/(\d+[.)]\s|\b(?:schritt|step|tipp|tip|punkt)\s+\d+)/i.test(text)) sr += 4;
  if (text.includes("\n")) sr += 4;
  sr = Math.min(sr, 20);

  // 4. Statistical density (15)
  let sd = 0;
  sd += Math.min((text.match(/\d+(?:[.,]\d+)?\s?%/g) || []).length * 3, 6);
  sd += Math.min((text.match(/(\d[\d.,]*\s?(€|euro|eur)|€\s?\d|\$\d)/gi) || []).length * 3, 5);
  sd += Math.min(
    (text.match(/\b\d[\d.,]*\s+(kunden|projekte|jahre|mitarbeiter|unternehmen|nutzer|users|customers|years|projects|stunden|tage)/gi) || []).length * 2,
    4,
  );
  if (/\b20(1\d|2\d)\b/.test(text)) sd += 2;
  sd = Math.min(sd, 15);

  // 5. Uniqueness (10)
  let us = 0;
  if (ORIGINAL.test(text)) us += 5;
  if (CASE.test(text)) us += 3;
  if (/\b[A-Z][a-z]+[A-Z]\w*|\b\w+\.(ai|io|de|com)\b/.test(text)) us += 2;
  us = Math.min(us, 10);

  return { score: abq + sc + sr + sd + us, wc };
}

export function pageCitability(passages: Passage[], brand: string | null) {
  const scored = passages
    .filter((p) => p.text.split(/\s+/).length >= 20)
    .map((p) => ({ ...p, ...scorePassage(p, brand) }))
    .sort((a, b) => b.score - a.score);
  if (!scored.length) return { score: 0, passages: 0, best: null as null | { heading: string | null; score: number } };
  const top = scored.slice(0, 5);
  const score = Math.round(top.reduce((s, p) => s + p.score, 0) / top.length);
  return { score, passages: scored.length, best: { heading: top[0].heading, score: top[0].score } };
}
