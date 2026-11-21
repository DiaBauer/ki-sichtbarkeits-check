// Allowed lead origins. Derived on the server from the Host header; never trusted from the client.
export const HERKUNFT = ["agenticweb", "kiservices", "marketingstudio"] as const;
export type Herkunft = (typeof HERKUNFT)[number];

export function herkunftAusHost(host: string | null, override?: string | null): Herkunft {
  const h = (host || "").toLowerCase();
  if (h.includes("marketing-studio")) return "marketingstudio";
  if (h.includes("ki.services") || h.includes("kiservices")) return "kiservices";
  if (h.includes("agenticweb")) return "agenticweb";
  // Test domains (*.vercel.app, localhost): allow an explicit, whitelisted override.
  if (override && (HERKUNFT as readonly string[]).includes(override)) return override as Herkunft;
  return "agenticweb";
}

export function herkunftAusRequest(req: Request): Herkunft {
  const url = new URL(req.url);
  return herkunftAusHost(req.headers.get("host"), url.searchParams.get("brand") || req.headers.get("x-geo-brand"));
}

const ERLAUBTE_HOSTS = ["agenticweb.studio", "ki.services", "marketing-studio.ai"];

/**
 * Base URL for links in e-mails. Never taken from an unchecked Host header (host header poisoning):
 * PUBLIC_BASE_URL if set, otherwise the request host only if it is one of our domains or this deployment.
 */
export function basisUrl(req: Request): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/+$/, "");
  const host = (req.headers.get("host") || "").toLowerCase().replace(/:\d+$/, "");
  const eigene = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean) as string[];
  if (ERLAUBTE_HOSTS.some((d) => host === d || host.endsWith("." + d)) || eigene.includes(host)) return `https://${host}`;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return new URL(req.url).origin; // local development only
}
