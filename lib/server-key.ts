import { createHmac } from "node:crypto";

// Key for the Supabase SECURITY DEFINER functions. Derived from GATE_SECRET,
// so no extra environment variable is needed. The database only stores its SHA-256.
export function dbKey() {
  const s = process.env.GATE_SECRET;
  if (!s) throw new Error("GATE_SECRET fehlt");
  return createHmac("sha256", s).update("geo-db-v1").digest("hex");
}

export type Umgebung = "production" | "preview" | "development";
export function umgebung(): Umgebung {
  const e = process.env.VERCEL_ENV;
  return e === "production" || e === "preview" ? e : "development";
}
