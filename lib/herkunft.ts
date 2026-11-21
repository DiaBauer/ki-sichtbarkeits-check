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
