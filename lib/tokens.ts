// Tokens and input validation for the lead flow.
// Tokens: 32 random bytes, base64url (43 characters). The database only ever sees the SHA-256 hex digest.
import { createHash, randomBytes } from "node:crypto";

export function neuerToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sha256Hex(wert: string): string {
  return createHash("sha256").update(wert, "utf8").digest("hex");
}

/** true if the value has the exact shape of a token from neuerToken(). */
export function istToken(t: unknown): t is string {
  return typeof t === "string" && /^[A-Za-z0-9_-]{43}$/.test(t);
}

export const EMAIL_MAX = 254;
export const NAME_MAX = 80;

// Control and invisible formatting characters (incl. bidi overrides, zero-width chars).
const STEUERZEICHEN = /[\p{Cc}\p{Cf}\u2028\u2029]/gu;
const EMAIL_MUSTER = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Characters that have no business in a plain address and could be misread as a list or display name.
const EMAIL_VERBOTEN = /[<>,;:"()\[\]\\]/;

/** Normalised (trimmed, lower-case) e-mail address, or null if invalid. */
export function pruefeEmail(roh: unknown): string | null {
  if (typeof roh !== "string") return null;
  const e = roh.trim().toLowerCase();
  if (!e || e.length > EMAIL_MAX) return null;
  if (new RegExp(STEUERZEICHEN.source, "u").test(e)) return null;
  if (EMAIL_VERBOTEN.test(e)) return null;
  if (!EMAIL_MUSTER.test(e)) return null;
  return e;
}

/** Cleaned name (control characters removed, whitespace collapsed, at most 80 characters), or null if empty. */
export function bereinigeName(roh: unknown): string | null {
  if (typeof roh !== "string") return null;
  const n = roh.replace(STEUERZEICHEN, " ").replace(/\s+/g, " ").trim();
  if (!n) return null;
  return Array.from(n).slice(0, NAME_MAX).join("").trim() || null;
}

export const ZWECKE_EINWILLIGUNG = ["kit", "newsletter"] as const;
export type ZweckEinwilligung = (typeof ZWECKE_EINWILLIGUNG)[number];
export function istZweckEinwilligung(z: unknown): z is ZweckEinwilligung {
  return z === "kit" || z === "newsletter";
}

/** Reads a JSON request body with a size limit. Returns null if too large or not valid JSON. */
export async function leseJson(req: Request, maxBytes: number): Promise<Record<string, unknown> | null> {
  const laenge = Number(req.headers.get("content-length") || "0");
  if (laenge > maxBytes) return null;
  let text: string;
  try {
    text = await req.text();
  } catch {
    return null;
  }
  if (Buffer.byteLength(text, "utf8") > maxBytes) return null;
  if (!text) return {};
  try {
    const v = JSON.parse(text);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
