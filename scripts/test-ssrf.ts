// Run: npx tsx scripts/test-ssrf.ts   (no external HTTP needed; DNS lookups only)
import dns from "node:dns";
import { istGesperrteAdresse, pruefeUrl, safeFetch } from "../lib/safe-fetch";

let fail = 0;
const ok = (name: string, cond: boolean) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  if (!cond) fail++;
};
const blockedUrl = (u: string) => {
  try {
    pruefeUrl(u);
    return false;
  } catch {
    return true;
  }
};

// URL-level
for (const u of [
  "http://localhost/", "http://localhost./", "http://LOCALHOST.:80/", "http://127.0.0.1/", "http://2130706433/", "http://0x7f.1/",
  "http://[::1]/", "http://[::ffff:127.0.0.1]/", "http://169.254.169.254/latest/meta-data/", "http://metadata.google.internal/",
  "http://intranet/", "http://foo.local/", "http://x.localhost/", "ftp://example.org/", "http://user:pw@example.org/",
  "http://example.org:8080/", "file:///etc/passwd", "javascript:alert(1)", "http://a." + "a".repeat(2100) + ".de/",
]) ok(`URL gesperrt: ${u.slice(0, 60)}`, blockedUrl(u));
for (const u of ["https://ki.services/", "http://www.example.org/pfad?x=1", "https://sub.domain.de:443/"]) ok(`URL erlaubt: ${u}`, !blockedUrl(u));

// Address-level (incl. rebinding targets)
for (const ip of [
  "127.0.0.1", "10.1.2.3", "172.16.5.4", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1",
  "::1", "::", "fe80::1", "fd00::1", "fc00::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "64:ff9b::a9fe:a9fe", "2002:7f00:1::1", "::127.0.0.1",
]) ok(`Adresse gesperrt: ${ip}`, istGesperrteAdresse(ip));
for (const ip of ["93.184.216.34", "8.8.8.8", "2a00:1450:4001:82a::200e", "2606:4700::6810:84e5"]) ok(`Adresse erlaubt: ${ip}`, !istGesperrteAdresse(ip));

// DNS names that resolve to loopback/metadata must be refused at connect time
async function dnsCases() {
  for (const host of ["localtest.me", "127.0.0.1.nip.io", "169.254.169.254.nip.io"]) {
    const resolved = await dns.promises.lookup(host, { all: true }).catch(() => null);
    if (!resolved) {
      console.log(`SKIP  DNS ${host} (in dieser Umgebung nicht auflösbar)`);
      continue;
    }
    const r = await safeFetch(`http://${host}/`, { timeoutMs: 5000 });
    ok(`DNS->intern blockiert: ${host} (${resolved.map((a) => a.address).join(",")})`, r.error === "blocked");
  }
}
dnsCases().then(() => {
  console.log(fail ? `\n${fail} FEHLER` : "\nAlle Tests bestanden");
  process.exit(fail ? 1 : 0);
});
