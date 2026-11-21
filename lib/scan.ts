import { parse, HTMLElement } from "node-html-parser";
import { pageCitability, Passage } from "./citability";
import { safeFetch, SafeResponse } from "./safe-fetch";
import type { CategoryKey, Finding, Status } from "./categories";

export type { CategoryKey, Finding, Status };
export { CATEGORY_META } from "./categories";

// Crawler, die Inhalte für Such- bzw. Antwortfunktionen abrufen. Eine Sperre schränkt die Sichtbarkeit ein.
const SUCH_CRAWLER = ["Googlebot", "Bingbot", "OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Claude-SearchBot"];
// Crawler vor allem für Modelltraining. Eine Sperre ist eine zulässige Geschäftsentscheidung: nur Hinweis.
const TRAINING_CRAWLER = ["GPTBot", "ClaudeBot", "Google-Extended", "Applebot-Extended", "CCBot", "meta-externalagent"];

export function normalizeUrl(input: string): string | null {
  let s = input.trim();
  if (!s || s.length > 2048 || /\s/.test(s)) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

function textOf(root: HTMLElement) {
  const clone = parse(root.toString());
  clone.querySelectorAll("script,style,noscript,svg,template,iframe").forEach((n) => n.remove());
  return clone;
}

function extractPassages(root: HTMLElement): Passage[] {
  const body = textOf(root);
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
      } else walk(child);
    }
  };
  walk(main);
  flush();
  return passages;
}

// robots.txt nach RFC 9309 (vereinfacht): spezifischste User-Agent-Gruppe, längste passende Regel für "/".
function parseRobots(content: string) {
  const groups: { agents: string[]; rules: { allow: boolean; path: string }[] }[] = [];
  let current: (typeof groups)[number] | null = null;
  let lastWasAgent = false;
  const sitemaps: string[] = [];
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const i = line.indexOf(":");
    if (i < 0) continue;
    const key = line.slice(0, i).trim().toLowerCase();
    const val = line.slice(i + 1).trim();
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
  const rootBlocked = (bot: string) => {
    const b = bot.toLowerCase();
    const g = groups.filter((x) => x.agents.includes(b));
    const use = g.length ? g : groups.filter((x) => x.agents.includes("*"));
    const rules = use.flatMap((x) => x.rules).filter((r) => r.path && "/".startsWith(r.path.replace(/\*$/, "")));
    if (!rules.length) return false;
    const best = rules.sort((a, b) => b.path.length - a.path.length || (a.allow ? -1 : 1))[0];
    return !best.allow;
  };
  return { rootBlocked, sitemaps, cloudflareManaged: /begin cloudflare managed content/i.test(content) };
}

function collectJsonLd(root: HTMLElement) {
  const items: Record<string, unknown>[] = [];
  let invalid = 0;
  let blocks = 0;
  for (const s of root.querySelectorAll('script[type="application/ld+json"]')) {
    blocks++;
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
  return { blocks, count: items.length, invalid, types: [...types], sameAs: [...sameAs], raw: items.slice(0, 8) };
}

const PROFILE_HOSTS: Record<string, string> = {
  "linkedin.com": "LinkedIn", "youtube.com": "YouTube", "xing.com": "XING", "instagram.com": "Instagram",
  "facebook.com": "Facebook", "x.com": "X", "twitter.com": "X", "tiktok.com": "TikTok", "github.com": "GitHub",
  "wikipedia.org": "Wikipedia", "trustpilot.com": "Trustpilot", "trustpilot.de": "Trustpilot", "provenexpert.com": "ProvenExpert",
  "kununu.com": "kununu", "g2.com": "G2", "google.com": "Google-Unternehmensprofil", "g.page": "Google-Unternehmensprofil",
};
const REVIEW = ["Trustpilot", "ProvenExpert", "kununu", "G2", "Google-Unternehmensprofil"];

function profileOf(href: string) {
  try {
    const u = new URL(href);
    const h = u.hostname.replace(/^www\./, "").replace(/^[a-z]{2}\./, "");
    if ((h === "google.com" || h.endsWith(".google.com")) && !/maps|place|business/.test(u.pathname + u.search)) return null;
    for (const [k, v] of Object.entries(PROFILE_HOSTS)) if (h === k || h.endsWith("." + k)) return v;
  } catch {}
  return null;
}

async function wikipedia(name: string): Promise<boolean | null> {
  if (!name || name.length < 3) return null;
  let anyAnswer = false;
  for (const lang of ["de", "en"]) {
    const r = await safeFetch(
      `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent('"' + name + '"')}&srlimit=3&format=json&srprop=`,
      { timeoutMs: 5000, maxBytes: 200_000, accept: "application/json" },
    );
    try {
      const j = JSON.parse(r.body);
      anyAnswer = true;
      const hits: { title: string }[] = j?.query?.search || [];
      if (hits.some((h) => h.title.toLowerCase().includes(name.toLowerCase()))) return true;
    } catch {}
  }
  return anyAnswer ? false : null;
}

function brandName(root: HTMLElement, host: string) {
  const og = root.querySelector('meta[property="og:site_name"]')?.getAttribute("content")?.trim();
  if (og && og.length <= 60) return og;
  const title = root.querySelector("title")?.text.trim() || "";
  const parts = title.split(/\s[|–—-]\s/).map((s) => s.trim()).filter(Boolean);
  const short = parts.sort((a, b) => a.length - b.length)[0];
  if (short && short.length <= 40) return short;
  return host.replace(/^www\./, "").split(".")[0];
}

/** true = vorhanden, false = eindeutig nicht vorhanden (404/410), null = nicht prüfbar */
function vorhanden(r: SafeResponse, isValid: (body: string) => boolean): boolean | null {
  if (r.ok) return isValid(r.body);
  if (r.status === 404 || r.status === 410) return false;
  return null;
}

export type ScanResult = Awaited<ReturnType<typeof scanSite>>;

export async function scanSite(targetUrl: string) {
  const page = await safeFetch(targetUrl, { timeoutMs: 15000 });
  if (page.error === "blocked") return { ok: false as const, error: page.grund || "Diese Adresse kann nicht geprüft werden." };
  if (page.error === "timeout") return { ok: false as const, error: "Die Website hat nicht rechtzeitig geantwortet." };
  if (page.error === "too_many_redirects") return { ok: false as const, error: "Die Website leitet zu oft weiter." };
  if (!page.ok || !page.body) {
    return { ok: false as const, error: page.status ? `Die Website antwortet mit Status ${page.status}.` : "Die Website ist nicht erreichbar." };
  }
  const ctype = page.headers.get("content-type") || "";
  if (ctype && !/html|xml/i.test(ctype)) return { ok: false as const, error: "Unter dieser Adresse liegt keine HTML-Seite." };

  const finalUrl = new URL(page.url);
  const origin = finalUrl.origin;
  const host = finalUrl.hostname;
  const root = parse(page.body, { comment: false });
  const brand = brandName(root, host);

  const [robotsRes, sitemapRes, llmsRes, wiki] = await Promise.all([
    safeFetch(origin + "/robots.txt", { timeoutMs: 6000, maxBytes: 500_000, accept: "text/plain,*/*" }),
    safeFetch(origin + "/sitemap.xml", { timeoutMs: 6000, maxBytes: 500_000, accept: "application/xml,text/xml,*/*" }),
    safeFetch(origin + "/llms.txt", { timeoutMs: 6000, maxBytes: 300_000, accept: "text/plain,*/*" }),
    wikipedia(brand),
  ]);

  const findings: Finding[] = [];
  const add = (f: Finding) => findings.push(f);

  // ---------- Grunddaten der Seite ----------
  const textRoot = textOf(root);
  const bodyText = (textRoot.querySelector("body") || textRoot).text.replace(/\s+/g, " ").trim();
  const wordCount = bodyText ? bodyText.split(" ").length : 0;
  const scripts = root.querySelectorAll("script").length;
  const spaShell = wordCount < 120 && !!(root.querySelector("#root") || root.querySelector("#__next") || root.querySelector("#app") || scripts > 3);
  const title = root.querySelector("title")?.text.trim() || "";
  const metaDesc = root.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() || "";
  const robotsMeta = (root.querySelector('meta[name="robots"]')?.getAttribute("content") || "").toLowerCase();
  const xRobots = (page.headers.get("x-robots-tag") || "").toLowerCase();
  const lang = root.querySelector("html")?.getAttribute("lang") || "";
  const canonical = root.querySelector('link[rel="canonical"]')?.getAttribute("href") || "";
  const viewport = !!root.querySelector('meta[name="viewport"]');
  const h1s = root.querySelectorAll("h1").map((h) => h.text.trim()).filter(Boolean);
  const headings = root.querySelectorAll("h1,h2,h3").map((h) => h.text.trim().replace(/\s+/g, " ")).filter(Boolean).slice(0, 60);
  const questionHeadings = headings.filter((h) => h.endsWith("?"));

  const anchors = root.querySelectorAll("a[href]").map((a) => ({ href: a.getAttribute("href") || "", text: a.text.trim().toLowerCase() }));
  const abs = (h: string) => {
    try {
      return new URL(h, origin).toString();
    } catch {
      return "";
    }
  };
  const linkHas = (re: RegExp) => anchors.some((a) => re.test(a.text) || re.test(a.href.toLowerCase()));
  const hasImpressum = linkHas(/impressum|imprint|legal-notice/);
  const hasPrivacy = linkHas(/datenschutz|privacy/);
  const hasContact = linkHas(/kontakt|contact/) || /mailto:|tel:/.test(page.body);
  const hasAbout = linkHas(/über uns|ueber-uns|about|team|wir sind/);

  const ld = collectJsonLd(root);
  const profiles = new Set<string>();
  anchors.forEach((a) => {
    const p = profileOf(abs(a.href));
    if (p) profiles.add(p);
  });
  ld.sameAs.forEach((s) => {
    const p = profileOf(s);
    if (p) profiles.add(p);
  });
  const hasType = (...t: string[]) => ld.types.some((x) => t.includes(x));

  // ---------- KI-Lesbarkeit ----------
  const robotsExists = vorhanden(robotsRes, (b) => !/<html|<!doctype/i.test(b.slice(0, 500)));
  const robots = parseRobots(robotsExists ? robotsRes.body : "");
  if (robotsExists === null) {
    add({ id: "crawler", kategorie: "lesbarkeit", label: "Zugriff für Such- und KI-Crawler", status: "unknown", gewicht: 40, erreicht: null, detail: "Die robots.txt war nicht abrufbar. Der Crawler-Zugriff konnte deshalb nicht geprüft werden." });
  } else {
    const blockedSearch = SUCH_CRAWLER.filter((b) => robots.rootBlocked(b));
    const blockedTraining = TRAINING_CRAWLER.filter((b) => robots.rootBlocked(b));
    const erreicht = Math.max(0, 1 - blockedSearch.length * 0.34);
    add({
      id: "crawler", kategorie: "lesbarkeit", label: "Zugriff für Such- und KI-Crawler", gewicht: 40, erreicht,
      status: blockedSearch.length ? (blockedSearch.includes("Googlebot") || blockedSearch.length > 1 ? "fail" : "warn") : "ok",
      detail: blockedSearch.length
        ? `In der robots.txt gesperrt: ${blockedSearch.join(", ")}. Diese Dienste können Ihre Seite für Suche bzw. Antworten nicht abrufen.`
        : "Google, Bing sowie die Such-Crawler von ChatGPT, Perplexity und Claude dürfen die Startseite abrufen.",
    });
    add({
      id: "training", kategorie: "lesbarkeit", label: "Crawler für KI-Training", gewicht: 0, erreicht: null, status: "info",
      detail: blockedTraining.length
        ? `Gesperrt: ${blockedTraining.join(", ")}. Das betrifft vor allem das Training von KI-Modellen und ist eine zulässige geschäftliche Entscheidung.`
        : "Keine Sperren für Trainings-Crawler. Ob Sie Ihre Inhalte für KI-Training freigeben, ist eine geschäftliche Entscheidung.",
    });
    if (robots.cloudflareManaged) {
      add({ id: "cloudflare", kategorie: "lesbarkeit", label: "Von Cloudflare verwaltete robots.txt", gewicht: 0, erreicht: null, status: "info", detail: "Cloudflare ergänzt hier automatisch Regeln für KI-Crawler. Prüfen Sie, ob diese Einstellung Ihrer Absicht entspricht." });
    }
  }
  add({
    id: "html", kategorie: "lesbarkeit", label: "Inhalt ohne JavaScript lesbar", gewicht: 35,
    erreicht: spaShell ? 0 : wordCount >= 300 ? 1 : wordCount >= 120 ? 0.6 : 0.3,
    status: spaShell ? "fail" : wordCount >= 300 ? "ok" : "warn",
    detail: spaShell
      ? `Im ausgelieferten HTML stehen nur ${wordCount} Wörter; der Inhalt entsteht erst per JavaScript. Google rendert JavaScript in der Regel, viele andere KI-Crawler lesen jedoch nur das ausgelieferte HTML.`
      : `${wordCount} Wörter stehen direkt im HTML der Startseite.`,
  });
  const cit = pageCitability(extractPassages(root), brand);
  add({
    id: "abschnitte", kategorie: "lesbarkeit", label: "Zitierfähige Textabschnitte", gewicht: 25,
    erreicht: spaShell ? null : Math.min(1, cit.score / 70),
    status: spaShell ? "unknown" : cit.score >= 55 ? "ok" : cit.score >= 35 ? "warn" : "fail",
    detail: spaShell
      ? "Ohne ausgelieferten Text nicht bewertbar."
      : cit.passages
        ? `${cit.passages} Textabschnitte bewertet (Durchschnitt der fünf besten: ${cit.score}/100). Bewertet werden u. a. klare Aussagen, eigenständige Absätze, Zahlen und Quellenangaben.`
        : "Keine längeren, eigenständigen Textabschnitte gefunden.",
  });
  const llmsExists = vorhanden(llmsRes, (b) => b.trim().length > 20 && !/<html|<!doctype/i.test(b.slice(0, 300)));
  add({
    id: "llms", kategorie: "lesbarkeit", label: "llms.txt", gewicht: 0, erreicht: null, status: "info",
    detail:
      (llmsExists ? "Vorhanden. " : llmsExists === false ? "Nicht vorhanden. " : "Nicht abrufbar. ") +
      "Optional: Google Search nutzt llms.txt nicht; die Datei hilft und schadet dort nicht. Einzelne KI-Agenten lesen sie.",
  });

  // ---------- Technische Grundlagen ----------
  const noindex = robotsMeta.includes("noindex") || xRobots.includes("noindex");
  add({ id: "index", kategorie: "technik", label: "Indexierbar", gewicht: 30, erreicht: noindex ? 0 : 1, status: noindex ? "fail" : "ok", detail: noindex ? "Die Seite ist per noindex von der Suche ausgeschlossen." : "Kein noindex gefunden." });
  add({
    id: "meta", kategorie: "technik", label: "Seitentitel und Beschreibung", gewicht: 20,
    erreicht: (title ? 0.5 : 0) + (metaDesc ? 0.5 : 0), status: title && metaDesc ? "ok" : title || metaDesc ? "warn" : "fail",
    detail: title && metaDesc ? `Titel: „${title.slice(0, 80)}“` : `Fehlt: ${[!title && "Seitentitel", !metaDesc && "Meta-Beschreibung"].filter(Boolean).join(", ")}.`,
  });
  const sitemapDirect = vorhanden(sitemapRes, (b) => /<(urlset|sitemapindex)/i.test(b.slice(0, 3000)));
  const sitemap = robots.sitemaps.length > 0 ? true : sitemapDirect;
  add({
    id: "sitemap", kategorie: "technik", label: "XML-Sitemap", gewicht: 15, erreicht: sitemap === null ? null : sitemap ? 1 : 0,
    status: sitemap === null ? "unknown" : sitemap ? "ok" : "warn",
    detail: sitemap === null ? "Nicht abrufbar, daher nicht geprüft." : sitemap ? (robots.sitemaps.length ? "In der robots.txt angegeben." : "Unter /sitemap.xml gefunden.") : "Weder in der robots.txt angegeben noch unter /sitemap.xml gefunden.",
  });
  add({
    id: "robots", kategorie: "technik", label: "robots.txt", gewicht: 10, erreicht: robotsExists === null ? null : robotsExists ? 1 : 0.6,
    status: robotsExists === null ? "unknown" : robotsExists ? "ok" : "warn",
    detail: robotsExists === null ? "Nicht abrufbar, daher nicht geprüft." : robotsExists ? "Vorhanden." : "Nicht vorhanden. Dann ist alles erlaubt; es fehlt aber z. B. der Hinweis auf die Sitemap.",
  });
  const https = finalUrl.protocol === "https:";
  add({ id: "https", kategorie: "technik", label: "HTTPS", gewicht: 15, erreicht: https ? 1 : 0, status: https ? "ok" : "fail", detail: https ? "Die Seite wird verschlüsselt ausgeliefert." : "Die Seite wird ohne HTTPS ausgeliefert." });
  add({ id: "mobil", kategorie: "technik", label: "Mobile Darstellung (Viewport)", gewicht: 10, erreicht: viewport ? 1 : 0, status: viewport ? "ok" : "warn", detail: viewport ? "Viewport-Angabe vorhanden." : "Keine Viewport-Angabe; die Seite ist vermutlich nicht für Smartphones angepasst." });
  const sec = ["strict-transport-security", "content-security-policy", "x-content-type-options", "referrer-policy", "x-frame-options"].filter((h) => page.headers.get(h)).length;
  add({
    id: "hinweise_technik", kategorie: "technik", label: "Weitere technische Hinweise", gewicht: 0, erreicht: null, status: "info",
    detail: [
      `Antwortzeit unserer Abfrage aus Frankfurt: ${page.ms} ms (einzelne Messung, kein Core-Web-Vitals-Wert).`,
      `${sec} von 5 Sicherheits-Headern gesetzt (gut für die Sicherheit, kein belegter Rankingfaktor).`,
      lang ? `Sprache: ${lang}.` : "Keine Sprachangabe im HTML.",
      canonical ? "Canonical vorhanden." : "Kein Canonical.",
      h1s.length === 1 ? "Eine H1-Überschrift." : `${h1s.length} H1-Überschriften.`,
    ].join(" "),
  });

  // ---------- Strukturierte Daten ----------
  const orgOk = hasType("Organization", "Corporation", "LocalBusiness", "ProfessionalService", "OnlineBusiness", "Store", "Restaurant", "MedicalBusiness", "LegalService");
  const microdata = !!root.querySelector("[itemscope]");
  const angebotOk = hasType("Service", "Product", "Offer", "SoftwareApplication", "Course", "Event");
  // Bei reinen JavaScript-Seiten ohne JSON-LD im HTML kann das Markup erst im Browser entstehen: nicht prüfbar statt Fehler.
  const schemaUnklar = spaShell && !ld.blocks;
  const sd = (id: string, label: string, gewicht: number, ok: boolean, teil: number, okText: string, failText: string, failStatus: Status) =>
    add(
      schemaUnklar
        ? { id, kategorie: "schema", label, gewicht, erreicht: null, status: "unknown", detail: "Im ausgelieferten HTML stehen keine strukturierten Daten; sie könnten erst per JavaScript entstehen. Nicht geprüft." }
        : { id, kategorie: "schema", label, gewicht, erreicht: ok ? 1 : teil, status: ok ? "ok" : failStatus, detail: ok ? okText : failText },
    );
  sd("org", "Angaben zum Unternehmen", 40, orgOk, microdata ? 0.5 : 0, `Gefunden: ${ld.types.slice(0, 6).join(", ")}.`,
    ld.count ? `Nur ${ld.types.slice(0, 5).join(", ")} gefunden, keine Angaben zur Organisation.` : "Keine strukturierten Daten (JSON-LD) im ausgelieferten HTML.", "fail");
  sd("angebot", "Angaben zu Leistungen oder Produkten", 25, angebotOk, 0, "Vorhanden.", "Keine strukturierten Angaben zu Leistungen oder Produkten.", "warn");
  sd("website", "Website-Angaben", 10, hasType("WebSite"), 0, "Vorhanden.", "Kein WebSite-Eintrag.", "warn");
  add({
    id: "valide", kategorie: "schema", label: "JSON-LD fehlerfrei lesbar", gewicht: 25, erreicht: ld.blocks ? (ld.invalid ? 0 : 1) : null,
    status: ld.blocks ? (ld.invalid ? "fail" : "ok") : "unknown",
    detail: ld.blocks ? (ld.invalid ? `${ld.invalid} von ${ld.blocks} JSON-LD-Blöcken sind fehlerhaft.` : `${ld.blocks} JSON-LD-Block/Blöcke technisch fehlerfrei.`) : "Kein JSON-LD vorhanden, daher nicht prüfbar.",
  });
  if (hasType("FAQPage")) {
    add({ id: "faq", kategorie: "schema", label: "FAQ-Auszeichnung", gewicht: 0, erreicht: null, status: "info", detail: "FAQ-Rich-Results zeigt Google nur noch für bekannte Behörden- und Gesundheitswebsites. Die Auszeichnung schadet nicht, muss aber dem sichtbaren Inhalt entsprechen." });
  }

  // ---------- Markenbelege ----------
  const socialProfiles = [...profiles].filter((p) => !REVIEW.includes(p) && p !== "Wikipedia");
  const reviewProfiles = [...profiles].filter((p) => REVIEW.includes(p));
  const markeUnklar = spaShell && !profiles.size;
  add({
    id: "profile", kategorie: "marke", label: "Verlinkte Unternehmensprofile", gewicht: 55,
    erreicht: markeUnklar ? null : socialProfiles.length >= 3 ? 1 : socialProfiles.length === 2 ? 0.8 : socialProfiles.length === 1 ? 0.5 : 0,
    status: markeUnklar ? "unknown" : socialProfiles.length >= 2 ? "ok" : socialProfiles.length ? "warn" : "fail",
    detail: socialProfiles.length ? `Auf der Startseite verlinkt: ${socialProfiles.join(", ")}.` : markeUnklar ? "Ohne ausgelieferten Text nicht prüfbar." : "Auf der Startseite sind keine Profile (z. B. LinkedIn, YouTube, XING) verlinkt.",
  });
  add({
    id: "bewertungen", kategorie: "marke", label: "Bewertungen verlinkt", gewicht: 25,
    erreicht: markeUnklar ? null : reviewProfiles.length ? 1 : 0,
    status: markeUnklar ? "unknown" : reviewProfiles.length ? "ok" : "warn",
    detail: reviewProfiles.length ? `Verlinkt: ${reviewProfiles.join(", ")}.` : "Auf der Startseite ist kein Bewertungsprofil verlinkt. Ob Bewertungen existieren, wurde nicht geprüft.",
  });
  add(
    schemaUnklar
      ? { id: "sameas", kategorie: "marke", label: "Profile in strukturierten Daten (sameAs)", gewicht: 20, erreicht: null, status: "unknown", detail: "Ohne strukturierte Daten im ausgelieferten HTML nicht prüfbar." }
      : { id: "sameas", kategorie: "marke", label: "Profile in strukturierten Daten (sameAs)", gewicht: 20, erreicht: ld.sameAs.length >= 2 ? 1 : ld.sameAs.length ? 0.5 : 0, status: ld.sameAs.length >= 2 ? "ok" : ld.sameAs.length ? "warn" : "fail", detail: ld.sameAs.length ? `${ld.sameAs.length} Profile verknüpft.` : "Keine Profile per sameAs verknüpft." },
  );
  add({
    id: "wikipedia", kategorie: "marke", label: "Wikipedia", gewicht: 0, erreicht: null, status: wiki === null ? "unknown" : "info",
    detail: wiki === null ? "Nicht abrufbar." : wiki ? `Zu „${brand}“ gibt es einen Wikipedia-Treffer.` : `Kein Wikipedia-Eintrag zu „${brand}“ gefunden. Für die meisten Unternehmen ist das normal und kein Mangel.`,
  });

  // ---------- Inhalt & Vertrauen (fester Teil; Inhaltsbewertung kommt aus der KI-Auswertung) ----------
  const transparency = [hasImpressum, hasPrivacy, hasContact].filter(Boolean).length;
  add({
    id: "transparenz", kategorie: "inhalt", label: "Impressum, Datenschutz, Kontakt", gewicht: 20,
    erreicht: spaShell && !transparency ? null : transparency / 3,
    status: spaShell && !transparency ? "unknown" : transparency === 3 ? "ok" : "warn",
    detail: transparency === 3 ? "Alle drei auf der Startseite verlinkt." : spaShell && !transparency ? "Ohne ausgelieferten Text nicht prüfbar." : `Auf der Startseite nicht verlinkt: ${[!hasImpressum && "Impressum", !hasPrivacy && "Datenschutz", !hasContact && "Kontakt"].filter(Boolean).join(", ")}.`,
  });

  // ---------- Antwort-Struktur (fester Teil) ----------
  add({
    id: "fragen", kategorie: "antworten", label: "Überschriften als Kundenfragen", gewicht: 30,
    erreicht: spaShell ? null : questionHeadings.length >= 3 ? 1 : questionHeadings.length ? 0.5 : 0,
    status: spaShell ? "unknown" : questionHeadings.length >= 3 ? "ok" : questionHeadings.length ? "warn" : "fail",
    detail: spaShell ? "Ohne ausgelieferten Text nicht prüfbar." : questionHeadings.length ? `${questionHeadings.length} Überschrift(en) als Frage formuliert.` : "Keine Überschrift ist als Frage formuliert.",
  });

  // Unterseiten als Kontext (nur Text, gekürzt)
  const internal = [
    ...new Set(
      anchors
        .map((a) => abs(a.href))
        .filter((u) => u.startsWith(origin) && !/#|\.(pdf|jpg|jpeg|png|gif|webp|zip|svg)$/i.test(u) && u !== finalUrl.toString() && !/(impressum|datenschutz|privacy|agb|cookie|legal|login|warenkorb|cart)/i.test(u)),
    ),
  ];
  const prefer = /(leistung|angebot|service|ueber|über|about|produkt|loesung|lösung|team)/i;
  const subUrls = [...internal.filter((u) => prefer.test(u)), ...internal].filter((v, i, a) => a.indexOf(v) === i).slice(0, 2);
  const subPages = await Promise.all(
    subUrls.map(async (u) => {
      const r = await safeFetch(u, { timeoutMs: 7000, maxBytes: 1_500_000 });
      if (!r.ok) return null;
      const t = (textOf(parse(r.body)).querySelector("body")?.text || "").replace(/\s+/g, " ").trim();
      return { url: r.url, text: t.slice(0, 3500) };
    }),
  );

  return {
    ok: true as const,
    url: finalUrl.toString(),
    host,
    brand,
    findings,
    facts: {
      title,
      metaDesc,
      lang,
      wordCount,
      spaShell,
      h1: h1s.slice(0, 3),
      headings: headings.slice(0, 40),
      questionHeadings,
      schemaTypes: ld.types,
      schemaAuszug: JSON.stringify(ld.raw).slice(0, 4000),
      profiles: [...profiles],
      hasImpressum,
      hasPrivacy,
      hasContact,
      hasAbout,
    },
    context: {
      homeText: bodyText.slice(0, 9000),
      subPages: subPages.filter(Boolean) as { url: string; text: string }[],
    },
  };
}
