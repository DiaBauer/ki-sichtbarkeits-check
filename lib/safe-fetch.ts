// SSRF-safe HTTP client for fetching third-party websites.
// - only http/https on ports 80/443, no credentials in URLs
// - DNS is resolved by us; every resolved address must be public (IPv4 + IPv6,
//   incl. IPv4-mapped/NAT64/6to4 forms). The connection uses exactly the
//   validated address (custom `lookup`), so DNS rebinding cannot swap it.
// - redirects are followed manually (max 5) and every hop is validated again
// - hard limits on time and response size
import http from "node:http";
import https from "node:https";
import dns from "node:dns";
import net from "node:net";
import zlib from "node:zlib";

export const UA = "Mozilla/5.0 (compatible; KI-Sichtbarkeits-Check/1.1; +https://ki.services)";
const MAX_REDIRECTS = 5;
const MAX_URL_LENGTH = 2048;

export class BlockedError extends Error {
  constructor(public grund: string) {
    super(grund);
  }
}

// ---------- address classification ----------
const blockV4 = new net.BlockList();
for (const [a, p] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16],
  ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as [string, number][]) blockV4.addSubnet(a, p, "ipv4");

const blockV6 = new net.BlockList();
for (const [a, p] of [
  ["::", 128], ["::1", 128], ["fc00::", 7], ["fe80::", 10], ["fec0::", 10], ["ff00::", 8],
  ["2001:db8::", 32], ["100::", 64], ["2001::", 32], ["2001:10::", 28], ["2001:20::", 28],
] as [string, number][]) blockV6.addSubnet(a, p, "ipv6");

function expandV6(ip: string): number[] | null {
  // returns 8 groups of 16 bit, or null
  let s = ip.toLowerCase();
  if (s.includes(".")) {
    const i = s.lastIndexOf(":");
    const v4 = s.slice(i + 1).split(".").map(Number);
    if (v4.length !== 4 || v4.some((n) => !(n >= 0 && n <= 255))) return null;
    s = s.slice(0, i + 1) + ((v4[0] << 8) | v4[1]).toString(16) + ":" + ((v4[2] << 8) | v4[3]).toString(16);
  }
  const [head, tail] = s.split("::");
  const h = head ? head.split(":") : [];
  const t = tail !== undefined ? (tail ? tail.split(":") : []) : [];
  const fill = s.includes("::") ? 8 - h.length - t.length : 0;
  const groups = [...h, ...Array(fill).fill("0"), ...t].map((g) => parseInt(g || "0", 16));
  return groups.length === 8 && groups.every((g) => g >= 0 && g <= 0xffff) ? groups : null;
}

/** true if the address must not be contacted */
export function istGesperrteAdresse(ip: string): boolean {
  const fam = net.isIP(ip);
  if (fam === 4) return blockV4.check(ip, "ipv4");
  if (fam !== 6) return true;
  if (blockV6.check(ip, "ipv6")) return true;
  const g = expandV6(ip);
  if (!g) return true;
  const v4 = (a: number, b: number) => `${a >> 8}.${a & 255}.${b >> 8}.${b & 255}`;
  // IPv4-mapped ::ffff:a.b.c.d and IPv4-compatible ::a.b.c.d
  if (g.slice(0, 5).every((x) => x === 0) && (g[5] === 0xffff || g[5] === 0)) return blockV4.check(v4(g[6], g[7]), "ipv4");
  // NAT64 64:ff9b::/96 and local-use NAT64 64:ff9b:1::/48
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) return blockV4.check(v4(g[6], g[7]), "ipv4");
  if (g[0] === 0x64 && g[1] === 0xff9b && g[2] === 1) return true;
  // 6to4 2002:AABB:CCDD::/16
  if (g[0] === 0x2002) return blockV4.check(v4(g[1], g[2]), "ipv4");
  return false;
}

// ---------- URL validation ----------
const BAD_SUFFIX = [".localhost", ".local", ".internal", ".lan", ".home.arpa", ".corp", ".intranet", ".test", ".invalid", ".example"];

/** Validates the target URL. Throws BlockedError with a German reason. */
export function pruefeUrl(raw: string): URL {
  if (raw.length > MAX_URL_LENGTH) throw new BlockedError("Die Adresse ist zu lang.");
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new BlockedError("Ungültige Adresse.");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new BlockedError("Nur http- und https-Adressen sind erlaubt.");
  if (u.username || u.password) throw new BlockedError("Adressen mit Zugangsdaten sind nicht erlaubt.");
  if (u.port && u.port !== "80" && u.port !== "443") throw new BlockedError("Nur die Standard-Ports 80 und 443 sind erlaubt.");
  let host = u.hostname.toLowerCase();
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
  host = host.replace(/\.+$/, ""); // trailing dot: "localhost." -> "localhost"
  if (!host) throw new BlockedError("Ungültige Adresse.");
  if (net.isIP(host)) {
    // Direct IP addresses are not needed for a website check.
    throw new BlockedError("Bitte geben Sie einen Domainnamen statt einer IP-Adresse ein.");
  }
  if (host === "localhost" || BAD_SUFFIX.some((s) => host.endsWith(s)) || !host.includes(".")) {
    throw new BlockedError("Interne oder lokale Adressen können nicht geprüft werden.");
  }
  if (!/^[a-z0-9.-]+$/.test(host) || host.split(".").some((l) => !l || l.length > 63)) {
    throw new BlockedError("Ungültiger Domainname.");
  }
  u.hostname = host;
  u.hash = "";
  return u;
}

// Custom lookup: resolve all addresses, refuse if any is blocked, connect to the first one.
type LookupCb = (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void;
function sichererLookup(hostname: string, options: dns.LookupOptions, cb: LookupCb) {
  dns.lookup(hostname, { all: true, verbatim: true }, (err, addrs) => {
    if (err) return cb(err, "", 4);
    const list = addrs as dns.LookupAddress[];
    if (!list.length) return cb(Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" }), "", 4);
    if (list.some((a) => istGesperrteAdresse(a.address))) {
      return cb(Object.assign(new BlockedError("Die Adresse zeigt auf ein internes Netz."), { code: "EBLOCKED" }), "", 4);
    }
    const first = list[0];
    if (options && (options as { all?: boolean }).all) return cb(null, [first]);
    cb(null, first.address, first.family);
  });
}

export type SafeResponse = {
  ok: boolean;
  status: number; // 0 = network error / blocked
  url: string; // final URL after redirects
  headers: Headers;
  body: string;
  ms: number;
  truncated: boolean;
  error?: "blocked" | "timeout" | "network" | "too_many_redirects";
  grund?: string;
};

function einmal(u: URL, timeoutMs: number, maxBytes: number, accept: string): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer; truncated: boolean }> {
  return new Promise((resolveRaw, rejectRaw) => {
    // Overall deadline (DNS + connect + transfer), not only socket idle time.
    const timer = setTimeout(() => req.destroy(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" })), timeoutMs);
    const resolve = (v: { status: number; headers: http.IncomingHttpHeaders; body: Buffer; truncated: boolean }) => {
      clearTimeout(timer);
      resolveRaw(v);
    };
    const reject = (e: unknown) => {
      clearTimeout(timer);
      rejectRaw(e);
    };
    const mod = u.protocol === "https:" ? https : http;
    const req = mod.request(
      u,
      {
        method: "GET",
        lookup: sichererLookup as unknown as http.RequestOptions["lookup"],
        headers: { "User-Agent": UA, Accept: accept, "Accept-Language": "de-DE,de;q=0.9,en;q=0.6", "Accept-Encoding": "gzip, deflate, br" },
        timeout: timeoutMs,
        agent: false,
      },
      (res) => {
        const status = res.statusCode || 0;
        if (status >= 300 && status < 400) {
          res.resume();
          return resolve({ status, headers: res.headers, body: Buffer.alloc(0), truncated: false });
        }
        const enc = String(res.headers["content-encoding"] || "").toLowerCase();
        let stream: NodeJS.ReadableStream = res;
        if (enc.includes("br")) stream = res.pipe(zlib.createBrotliDecompress());
        else if (enc.includes("gzip")) stream = res.pipe(zlib.createGunzip());
        else if (enc.includes("deflate")) stream = res.pipe(zlib.createInflate());
        const chunks: Buffer[] = [];
        let size = 0;
        let truncated = false;
        stream.on("data", (c: Buffer) => {
          if (truncated) return;
          size += c.length;
          if (size > maxBytes) {
            truncated = true;
            chunks.push(c.subarray(0, c.length - (size - maxBytes)));
            res.destroy();
            resolve({ status, headers: res.headers, body: Buffer.concat(chunks), truncated });
            return;
          }
          chunks.push(c);
        });
        stream.on("end", () => resolve({ status, headers: res.headers, body: Buffer.concat(chunks), truncated }));
        stream.on("error", (e) => (truncated ? undefined : reject(e)));
      },
    );
    req.on("timeout", () => req.destroy(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" })));
    req.on("error", reject);
    req.end();
  });
}

function toHeaders(h: http.IncomingHttpHeaders) {
  const out = new Headers();
  for (const [k, v] of Object.entries(h)) {
    if (v === undefined) continue;
    out.set(k, Array.isArray(v) ? v.join(", ") : v);
  }
  return out;
}

function decode(body: Buffer, contentType: string | null) {
  const cs = /charset=([^;]+)/i.exec(contentType || "")?.[1]?.trim().toLowerCase();
  try {
    return new TextDecoder(cs && cs !== "utf8" ? cs : "utf-8").decode(body);
  } catch {
    return body.toString("utf8");
  }
}

export async function safeFetch(
  raw: string,
  opts: { timeoutMs?: number; maxBytes?: number; accept?: string } = {},
): Promise<SafeResponse> {
  const started = Date.now();
  const timeoutMs = opts.timeoutMs ?? 12000;
  const maxBytes = opts.maxBytes ?? 2_500_000;
  const accept = opts.accept ?? "text/html,application/xhtml+xml,*/*;q=0.8";
  let current: URL;
  try {
    current = pruefeUrl(raw);
  } catch (e) {
    return { ok: false, status: 0, url: raw, headers: new Headers(), body: "", ms: 0, truncated: false, error: "blocked", grund: (e as Error).message };
  }
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const left = timeoutMs - (Date.now() - started);
    if (left <= 0) break;
    try {
      const r = await einmal(current, left, maxBytes, accept);
      if (r.status >= 300 && r.status < 400 && r.headers.location) {
        let next: URL;
        try {
          next = pruefeUrl(new URL(String(r.headers.location), current).toString());
        } catch (e) {
          return { ok: false, status: 0, url: current.toString(), headers: toHeaders(r.headers), body: "", ms: Date.now() - started, truncated: false, error: "blocked", grund: (e as Error).message };
        }
        current = next;
        continue;
      }
      const headers = toHeaders(r.headers);
      return {
        ok: r.status >= 200 && r.status < 300,
        status: r.status,
        url: current.toString(),
        headers,
        body: decode(r.body, headers.get("content-type")),
        ms: Date.now() - started,
        truncated: r.truncated,
      };
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      const blocked = err instanceof BlockedError || err.code === "EBLOCKED";
      return {
        ok: false,
        status: 0,
        url: current.toString(),
        headers: new Headers(),
        body: "",
        ms: Date.now() - started,
        truncated: false,
        error: blocked ? "blocked" : err.code === "ETIMEDOUT" ? "timeout" : "network",
        grund: blocked ? "Die Adresse zeigt auf ein internes Netz." : undefined,
      };
    }
  }
  return { ok: false, status: 0, url: current.toString(), headers: new Headers(), body: "", ms: Date.now() - started, truncated: false, error: "too_many_redirects" };
}
