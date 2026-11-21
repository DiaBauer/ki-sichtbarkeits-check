import { createHash } from "node:crypto";
import { rpc } from "./db";

// Shared rate limit in the database (works across all server instances).
// The client IP is only stored as a salted hash.
export function clientIp(req: Request) {
  // Set by Vercel and not spoofable by the client (unlike the first X-Forwarded-For entry).
  const vercel = req.headers.get("x-vercel-forwarded-for") || req.headers.get("x-real-ip");
  if (vercel) return vercel.split(",")[0].trim();
  if (process.env.VERCEL) return "unbekannt";
  return (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unbekannt";
}

export function ipSubjekt(req: Request) {
  return createHash("sha256").update((process.env.GATE_SECRET || "") + "|" + clientIp(req)).digest("hex").slice(0, 32);
}

/** true = allowed. Fails closed for AI-cost buckets, open for cheap buckets. */
export async function erlaubt(bucket: string, subjekt: string, max: number, fensterS: number, failClosed = false) {
  try {
    return await rpc<boolean>("geo_rl", { p_bucket: bucket, p_subjekt: subjekt, p_max: max, p_fenster_s: fensterS });
  } catch {
    return !failClosed;
  }
}
