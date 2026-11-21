import { parse, HTMLElement } from "node-html-parser";
import { pageCitability, Passage } from "./citability";

const UA =
  "Mozilla/5.0 (compatible; KI-Sichtbarkeits-Check/1.0; +https://agenticweb.studio)";

import { CategoryKey, Finding, Status } from "./categories";
export type { CategoryKey, Finding, Status };
export { CATEGORY_META } from "./categories";

const CRITICAL_CRAWLERS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "PerplexityBot", "Google-Extended"];
const SECONDARY_CRAWLERS = ["anthropic-ai", "Applebot-Extended", "Amazonbot", "CCBot", "meta-externalagent"];

async function get(url: string, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,*/*;q=0.8", "Accept-Language": "de-DE,de;q=0.9,en;q=0.6" },
      redirect: "follow",
      signal: ctrl.signal,
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, url: res.url, headers: res.headers, body: body.slice(0, 3_000_000), ms: Date.now() - started };
  } catch (e) {
    return { ok: false, status: 0, url, headers: new Headers(), body: "", ms: Date.now() - started, error: String(e) };
  } finally {
    clearTimeout(t);
  }
}

export function normalizeUrl(input: string): string | null {
  let s = input.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    if (!u.hostname.includes(".")) return null;
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || /^(\d+\.){3}\d+$/.test(host) || host.endsWith(".internal") || host.endsWith(".local")) return null;
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

function visibleText(root: HTMLElement) {
  const clone = parse(root.toString());
  clone.querySelectorAll("script,style,noscript,svg,template,iframe").forEach((n) => n.remove());
  return clone;
}

function extractPassages(root: HTMLElement): Passage[] {
  const body = visibleText(root);
  const main = body.querySelector("main") || body.querySelector("article") || body.querySelector("body") || body;
  main.querySelectorAll("nav,footer,header,form,aside").forEach((n) => n.remove());
  const passages: Passage[] = [];
  let heading: string | null = null;
  let buf: string[] = [];
  const flush = () => {
    const text = buf.join("\n").replace(/[ \t]+/g, " ").trim();
    if (text) passages.push({ heading, text });
    buf = [];
  };
  const walk = (el: HTMLElement) => {
    for (const child of el.childNodes) {
      if (!(child instanceof HTMLElement)) continue;
      const tag = child.tagName?.toLowerCase();
      if (!tag) continue;
      if (/^h[1-4]$/.test(tag)) {
        flush();
        heading = child.text.trim().replace(/\s+/g, " ");
      } else if (["p", "li", "td", "blockquote", "dd", "dt"].includes(tag)) {
        const t = child.text.trim().replace(/\s+/g, " ");
        if (t) buf.push(t);
      } else {
        walk(child);
      }
    }
  };
  walk(main);
  flush();
  return passages;
}

function parseRobots(content: string) {
  const groups: { agents: string[]; rules: { allow: boolean; path: string }[] }[] = [];
  let current: (typeof groups)[number] | null = null;
  let lastWasAgent = false;
  const sitemaps: string[] = [];
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const [k, ...rest] = line.split(":");
    const key = k.trim().toLowerCase();
    const val = rest.join(":").trim();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(val.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (key === "sitemap") sitemaps.push(val);
      else if ((key === "disallow" || key === "allow") && current) current.rules.push({ allow: key === "allow", path: val });
    }
  }
  const statusFor = (bot: string): "allowed" | "blocked" | "partial" => {
    const g = groups.find((g) => g.agents.includes(bot.toLowerCase())) || groups.find((g) => g.agents.includes("*"));
    if (!g) return "allowed";
    if (g.rules.some((r) => !r.allow && r.path === "/") && !g.rules.some((r) => r.allow && r.path === "/")) return "blocked";
    if (g.rules.some((r) => !r.allow && r.path && r.path !== "")) return "partial";
    return "allowed";
  };
  return { statusFor, sitemaps, cloudflareManaged: /begin cloudflare managed content/i.test(content) };
}

function collectJsonLd(root: HTMLElement) {
  const items: Record<string, unknown>[] = [];
  let invalid = 0;
  for (const s of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(s.text.trim());
      const push = (x: unknown) => {
        if (Array.isArray(x)) x.forEach(push);
        else if (x && typeof x === "object") {
          const o = x as Record<string, unknown>;
          if (Array.isArray(o["@graph"])) (o["@graph"] as unknown[]).forEach(push);
          items.push(o);
        }
      };
      push(data);
    } catch {
      invalid++;
    }
  }
  const types = new Set<string>();
  const sameAs = new Set<string>();
  for (const it of items) {
    const t = it["@type"];
    (Array.isArray(t) ? t : [t]).forEach((x) => typeof x === "string" && types.add(x));
    const sa = it["sameAs"];
    (Array.isArray(sa) ? sa : sa ? [sa] : []).forEach((x) => typeof x === "string" && sameAs.add(x));
  }
  return { count: items.length, invalid, types: [...types], sameAs: [...sameAs] };
}

const PROFILE_HOSTS: Record<string, string> = {
  "linkedin.com": "LinkedIn",
  "youtube.com": "YouTube",
  "xing.com": "XING",
  "instagram.com": "Instagram",
  "facebook.com": "Facebook",
  "x.com": "X",
  "twitter.com": "X",
  "tiktok.com": "TikTok",
  "github.com": "GitHub",
  "wikipedia.org": "Wikipedia",
  "trustpilot.com": "Trustpilot",
  "provenexpert.com": "ProvenExpert",
  "kununu.com": "kununu",
  "g2.com": "G2",
};

function profileOf(href: string) {
  try {
    const h = new URL(href).hostname.replace(/^www\./, "").replace(/^[a-z]{2}\./, "");
    for (const [k, v] of Object.entries(PROFILE_HOSTS)) if (h === k || h.endsWith("." + k)) return v;
  } catch {}
  return null;
}

async function wikipediaHit(name: string) {
  if (!name || name.length < 3) return false;
  for (const lang of ["de", "en"]) {
    const r = await get(
      `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent('"' + name + '"')}&srlimit=3&format=json&srprop=`,
      6000,
    );
    try {
      const j = JSON.parse(r.body);
      const hits: { title: string }[] = j?.query?.search || [];
      if (hits.some((h) => h.title.toLowerCase().includes(name.toLowerCase()))) return true;
    } catch {}
  }
  return false;
}

function brandName(root: HTMLElement, host: string) {
  const og = root.querySelector('meta[property="og:site_name"]')?.getAttribute("content")?.trim();
  if (og) return og;
  const title = root.querySelector("title")?.text.trim() || "";
  const parts = title.split(/\s[|–—-]\s/).map((s) => s.trim()).filter(Boolean);
  const short = parts.sort((a, b) => a.length - b.length)[0];
  if (short && short.length <= 40) return short;
  return host.replace(/^www\./, "").split(".")[0];
}

export type ScanResult = Awaited<ReturnType<typeof scanSite>>;

export async function scanSite(targetUrl: string) {
  const page = await get(targetUrl, 15000);
  if (!page.body || page.status >= 400 || page.status === 0) {
    return { ok: false as const, error: page.status ? `Die Seite antwortet mit Status ${page.status}.` : "Die Seite ist nicht erreichbar." };
  }
  const finalUrl = new URL(page.url || targetUrl);
  const origin = finalUrl.origin;
  const host = finalUrl.hostname;
  const root = parse(page.body, { comment: false });

  const [robotsRes, llmsRes, llmsFullRes, sitemapRes] = await Promise.all([
    get(origin + "/robots.txt", 8000),
    get(origin + "/llms.txt", 8000),
    get(origin + "/llms-full.txt", 8000),
    get(origin + "/sitemap.xml", 8000),
  ]);

  const findings: Finding[] = [];
  const add = (id: string, label: string, status: Status, detail: string) => findings.push({ id, label, status, detail });

  // ---------- Content basics ----------
  const textRoot = visibleText(root);
  const bodyText = (textRoot.querySelector("body") || textRoot).text.replace(/\s+/g, " ").trim();
  const wordCount = bodyText ? bodyText.split(" ").length : 0;
  const scripts = root.querySelectorAll("script").length;
  const spaShell = wordCount < 120 && (root.querySelector("#root") || root.querySelector("#__next") || root.querySelector("#app") || scripts > 3);

  const title = root.querySelector("title")?.text.trim() || "";
  const metaDesc = root.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() || "";
  const robotsMeta = (root.querySelector('meta[name="robots"]')?.getAttribute("content") || "").toLowerCase();
  const lang = root.querySelector("html")?.getAttribute("lang") || "";
  const canonical = root.querySelector('link[rel="canonical"]')?.getAttribute("href") || "";
  const viewport = !!root.querySelector('meta[name="viewport"]');
  const h1s = root.querySelectorAll("h1").map((h) => h.text.trim()).filter(Boolean);
  const headings = root.querySelectorAll("h1,h2,h3").map((h) => h.text.trim().replace(/\s+/g, " ")).filter(Boolean).slice(0, 60);
  const questionHeadings = headings.filter((h) => h.endsWith("?"));
  const brand = brandName(root, host);

  // ---------- Links ----------
  const anchors = root.querySelectorAll("a[href]").map((a) => ({ href: a.getAttribute("href") || "", text: a.text.trim().toLowerCase() }));
  const abs = (h: string) => {
    try {
      return new URL(h, origin).toString();
    } catch {
      return "";
    }
  };
  const has = (re: RegExp) => anchors.some((a) => re.test(a.text) || re.test(a.href.toLowerCase()));
  const hasImpressum = has(/impressum|imprint|legal-notice/);
  const hasPrivacy = has(/datenschutz|privacy/);
  const hasAbout = has(/über uns|ueber-uns|about|team|wir sind/);
  const hasContact = has(/kontakt|contact/) || /mailto:|tel:/.test(page.body);
  const profiles = new Set<string>();
  anchors.forEach((a) => {
    const p = profileOf(abs(a.href));
    if (p) profiles.add(p);
  });

  // Internal pages worth reading for context
  const internal = [...new Set(anchors.map((a) => abs(a.href)).filter((u) => u.startsWith(origin) && !/#|\.(pdf|jpg|png|zip)$/i.test(u) && u !== finalUrl.toString() && !/(impressum|datenschutz|privacy|agb|cookie|legal|login|warenkorb|cart)/i.test(u)))];
  const prefer = /(leistung|angebot|service|ueber|über|about|produkt|loesung|lösung|team)/i;
  const subUrls = [...internal.filter((u) => prefer.test(u)), ...internal].filter((v, i, a) => a.indexOf(v) === i).slice(0, 2);

  // ---------- Schema ----------
  const ld = collectJsonLd(root);
  ld.sameAs.forEach((s) => {
    const p = profileOf(s);
    if (p) profiles.add(p);
  });
  const hasType = (...t: string[]) => ld.types.some((x) => t.includes(x));
  const hasMicrodata = !!root.querySelector("[itemscope]");

  // ---------- Robots / crawlers ----------
  const robotsExists = robotsRes.ok && !/<html/i.test(robotsRes.body.slice(0, 500));
  const robots = parseRobots(robotsExists ? robotsRes.body : "");
  const crawlerStatus = [...CRITICAL_CRAWLERS, ...SECONDARY_CRAWLERS].map((bot) => ({
    bot,
    critical: CRITICAL_CRAWLERS.includes(bot),
    status: robots.statusFor(bot),
  }));
  const blockedCritical = crawlerStatus.filter((c) => c.critical && c.status === "blocked");
  const blockedSecondary = crawlerStatus.filter((c) => !c.critical && c.status === "blocked");
  const sitemapReferenced = robots.sitemaps.length > 0;
  const sitemapExists = sitemapReferenced || (sitemapRes.ok && /<(urlset|sitemapindex)/i.test(sitemapRes.body.slice(0, 2000)));

  const looksLikeText = (r: { ok: boolean; body: string; headers: Headers }) =>
    r.ok && r.body.trim().length > 20 && !/<html|<!doctype/i.test(r.body.slice(0, 300));
  const llmsExists = looksLikeText(llmsRes);
  const llmsFull = looksLikeText(llmsFullRes);
  const llmsValid = llmsExists && /^#\s+\S/m.test(llmsRes.body) && /\[.+\]\(https?:\/\/.+\)/.test(llmsRes.body);

  // ---------- Headers ----------
  const hdr = (k: string) => page.headers.get(k);
  const https = finalUrl.protocol === "https:";
  const security = {
    hsts: !!hdr("strict-transport-security"),
    csp: !!hdr("content-security-policy"),
    xfo: !!hdr("x-frame-options") || /frame-ancestors/i.test(hdr("content-security-policy") || ""),
    xcto: !!hdr("x-content-type-options"),
    referrer: !!hdr("referrer-policy"),
  };

  // ---------- Brand knowledge ----------
  const wiki = await wikipediaHit(brand).catch(() => false);

  // ---------- Citability ----------
  const passages = extractPassages(root);
  const cit = pageCitability(passages, brand);

  // ================= SCORING =================
  // Crawler access (from geo-ai-visibility rubric)
  let crawlerScore = 100 - blockedCritical.length * 15 - blockedSecondary.length * 5 - (sitemapReferenced ? 0 : 10);
  if (robots.cloudflareManaged) crawlerScore -= 5;
  crawlerScore = Math.max(0, crawlerScore);
  const llmsScore = !llmsExists ? 0 : !llmsValid ? 30 : llmsFull ? 90 : 60;
  const citability = Math.round(Math.min(100, cit.score) * 0.45 + crawlerScore * 0.35 + llmsScore * 0.2);

  // Technical
  let technical = 0;
  technical += spaShell ? 0 : wordCount > 300 ? 25 : 15;
  technical += (title ? 5 : 0) + (metaDesc ? 5 : 0) + (robotsMeta.includes("noindex") ? 0 : 5);
  technical += (robotsExists ? 7 : 0) + (sitemapExists ? 8 : 0);
  technical += https ? 10 : 0;
  technical += (security.hsts ? 3 : 0) + (security.csp ? 2 : 0) + (security.xfo ? 2 : 0) + (security.xcto ? 2 : 0) + (security.referrer ? 1 : 0);
  technical += viewport ? 10 : 0;
  technical += page.ms < 1500 ? 10 : page.ms < 3500 ? 6 : 2;
  technical += (lang ? 3 : 0) + (canonical ? 4 : 0) + (h1s.length === 1 ? 3 : h1s.length > 1 ? 1 : 0);
  technical = Math.min(100, technical);

  // Schema
  let schema = 0;
  if (hasType("Organization", "Corporation", "LocalBusiness", "ProfessionalService", "OnlineBusiness")) schema += 25;
  if (ld.sameAs.length >= 3) schema += 15;
  else if (ld.sameAs.length > 0) schema += 8;
  if (hasType("WebSite")) schema += 10;
  if (hasType("Service", "Product", "Offer", "SoftwareApplication", "Course")) schema += 15;
  if (hasType("Person")) schema += 10;
  if (hasType("FAQPage", "QAPage")) schema += 10;
  if (hasType("BreadcrumbList")) schema += 5;
  if (hasType("Article", "BlogPosting", "WebPage", "AboutPage")) schema += 5;
  if (ld.count > 0 && ld.invalid === 0) schema += 5;
  if (ld.count === 0 && hasMicrodata) schema = Math.max(schema, 10);
  schema = Math.min(100, schema);

  // Brand authority (deterministic signals)
  let brandScore = 0;
  if (wiki) brandScore += 30;
  if (profiles.has("LinkedIn")) brandScore += 12;
  if (profiles.has("YouTube")) brandScore += 15;
  if (profiles.has("XING")) brandScore += 5;
  const socialCount = ["Instagram", "Facebook", "X", "TikTok", "GitHub"].filter((p) => profiles.has(p)).length;
  brandScore += Math.min(socialCount * 5, 15);
  if (["Trustpilot", "ProvenExpert", "kununu", "G2"].some((p) => profiles.has(p))) brandScore += 15;
  if (ld.sameAs.length >= 3) brandScore += 8;
  brandScore = Math.min(100, brandScore);

  // ================= FINDINGS =================
  if (blockedCritical.length) add("crawlers", "KI-Crawler", "fail", `${blockedCritical.map((c) => c.bot).join(", ")} ${blockedCritical.length === 1 ? "wird" : "werden"} in der robots.txt blockiert. ${blockedCritical.length === 1 ? "Dieses System kann" : "Diese Systeme können"} Sie nicht zitieren.`);
  else add("crawlers", "KI-Crawler", "ok", "Alle wichtigen KI-Crawler (ChatGPT, Claude, Perplexity, Google) dürfen die Seite lesen.");
  if (robots.cloudflareManaged) add("cloudflare", "Cloudflare-Sperre", "warn", "Die robots.txt wird von Cloudflare verwaltet. Diese Funktion sperrt KI-Crawler oft, ohne dass es auffällt.");
  if (spaShell) add("ssr", "Lesbarkeit ohne JavaScript", "fail", `Ohne JavaScript sind nur ${wordCount} Wörter sichtbar. KI-Crawler führen meist kein JavaScript aus und sehen eine fast leere Seite.`);
  else add("ssr", "Lesbarkeit ohne JavaScript", wordCount > 300 ? "ok" : "warn", `${wordCount} Wörter direkt im HTML lesbar.`);
  add("llms", "llms.txt", llmsExists ? (llmsValid ? "ok" : "warn") : "fail", llmsExists ? (llmsValid ? "Vorhanden und gültig aufgebaut." : "Vorhanden, aber nicht im erwarteten Format (Überschrift und Linkliste).") : "Fehlt. Die Datei gibt KI-Systemen eine Übersicht Ihrer wichtigsten Inhalte.");
  add("sitemap", "Sitemap", sitemapExists ? (sitemapReferenced ? "ok" : "warn") : "fail", sitemapExists ? (sitemapReferenced ? "Vorhanden und in der robots.txt verlinkt." : "Vorhanden, aber nicht in der robots.txt verlinkt.") : "Keine XML-Sitemap gefunden.");
  add("org-schema", "Organisation als strukturierte Daten", hasType("Organization", "Corporation", "LocalBusiness", "ProfessionalService", "OnlineBusiness") ? "ok" : "fail", hasType("Organization", "Corporation", "LocalBusiness", "ProfessionalService", "OnlineBusiness") ? `Gefunden: ${ld.types.slice(0, 6).join(", ")}.` : ld.count ? `Nur ${ld.types.join(", ")} gefunden, keine Angaben zur Organisation.` : "Keine JSON-LD-Daten. KI-Systeme müssen raten, wer hinter der Seite steht.");
  add("sameas", "Verknüpfte Profile (sameAs)", ld.sameAs.length >= 3 ? "ok" : ld.sameAs.length ? "warn" : "fail", ld.sameAs.length ? `${ld.sameAs.length} Profile in den strukturierten Daten verknüpft.` : "Keine Profile verknüpft. So kann KI Ihre Marke nicht eindeutig zuordnen.");
  add("questions", "Fragen als Überschriften", questionHeadings.length >= 3 ? "ok" : questionHeadings.length ? "warn" : "fail", questionHeadings.length ? `${questionHeadings.length === 1 ? "Eine Überschrift ist" : questionHeadings.length + " Überschriften sind"} als Frage formuliert.${questionHeadings.length < 3 ? " Mehr Frage-Antwort-Blöcke erhöhen die Chance auf Zitate." : ""}` : "Keine Überschrift ist als Frage formuliert. KI-Systeme suchen gezielt nach Frage-Antwort-Blöcken.");
  add("wiki", "Wikipedia", wiki ? "ok" : "warn", wiki ? `„${brand}“ ist auf Wikipedia zu finden.` : `Kein Wikipedia-Eintrag zu „${brand}“ gefunden. Wikipedia ist eine der wichtigsten Quellen für KI-Wissen.`);
  add("profiles", "Präsenz auf Plattformen", profiles.size >= 3 ? "ok" : profiles.size ? "warn" : "fail", profiles.size ? `Verlinkt: ${[...profiles].join(", ")}.` : "Keine Profile auf LinkedIn, YouTube oder Bewertungsportalen verlinkt.");
  add("trust", "Impressum & Datenschutz", hasImpressum && hasPrivacy ? "ok" : "warn", hasImpressum && hasPrivacy ? "Beide Seiten sind verlinkt." : `Nicht gefunden: ${[!hasImpressum && "Impressum", !hasPrivacy && "Datenschutz"].filter(Boolean).join(", ")}.`);
  add("https", "HTTPS & Sicherheit", https && security.hsts ? "ok" : https ? "warn" : "fail", https ? `HTTPS aktiv. ${Object.values(security).filter(Boolean).length} von 5 Sicherheits-Headern gesetzt.` : "Die Seite läuft ohne HTTPS.");
  add("meta", "Titel & Beschreibung", title && metaDesc ? "ok" : "warn", title && metaDesc ? `Titel: „${title.slice(0, 70)}“` : `Fehlt: ${[!title && "Seitentitel", !metaDesc && "Meta-Beschreibung"].filter(Boolean).join(", ")}.`);
  if (robotsMeta.includes("noindex")) add("noindex", "Indexierung", "fail", "Die Seite ist per noindex von Suchmaschinen ausgeschlossen.");

  // Sub pages for context (text only, short)
  const subPages = await Promise.all(
    subUrls.map(async (u) => {
      const r = await get(u, 8000);
      if (!r.ok) return null;
      const t = (visibleText(parse(r.body)).querySelector("body")?.text || "").replace(/\s+/g, " ").trim();
      return { url: u, text: t.slice(0, 3500) };
    }),
  );

  return {
    ok: true as const,
    url: finalUrl.toString(),
    host,
    brand,
    fetchedMs: page.ms,
    scores: { citability, brand: brandScore, technical, schema },
    findings,
    facts: {
      title,
      metaDesc,
      lang,
      wordCount,
      h1: h1s.slice(0, 3),
      headings: headings.slice(0, 40),
      questionHeadings,
      schemaTypes: ld.types,
      sameAs: ld.sameAs.length,
      profiles: [...profiles],
      wikipedia: wiki,
      llmsTxt: llmsExists,
      crawlers: crawlerStatus,
      hasImpressum,
      hasPrivacy,
      hasAbout,
      hasContact,
      citabilityPassages: cit.passages,
      citabilityRaw: cit.score,
    },
    context: {
      homeText: bodyText.slice(0, 9000),
      subPages: subPages.filter(Boolean) as { url: string; text: string }[],
    },
  };
}
