// Offline tests for lib/tokens.ts and input validation. Run: npx tsx scripts/test-lead.ts
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  bereinigeName, istToken, istZweckEinwilligung, leseJson, neuerToken, pruefeEmail, sha256Hex, NAME_MAX,
} from "../lib/tokens";

let n = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  await fn();
  n++;
  console.log(`ok - ${name}`);
}

async function main() {
  await test("neuerToken: 43 Zeichen base64url, 32 Byte, zufällig", () => {
    const a = neuerToken();
    const b = neuerToken();
    assert.match(a, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(Buffer.from(a, "base64url").length, 32);
    assert.notEqual(a, b);
    const viele = new Set(Array.from({ length: 1000 }, neuerToken));
    assert.equal(viele.size, 1000);
  });

  await test("sha256Hex: 64 Hex-Zeichen, deterministisch, wie node:crypto", () => {
    const t = neuerToken();
    assert.match(sha256Hex(t), /^[0-9a-f]{64}$/);
    assert.equal(sha256Hex(t), sha256Hex(t));
    assert.equal(sha256Hex("abc"), createHash("sha256").update("abc").digest("hex"));
    assert.equal(sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  await test("istToken", () => {
    assert.equal(istToken(neuerToken()), true);
    for (const x of ["", "abc", neuerToken() + "x", neuerToken().slice(1) + "=", "a".repeat(42) + "/", null, undefined, 42, {}]) {
      assert.equal(istToken(x), false, String(x));
    }
  });

  await test("pruefeEmail: gültige Adressen (normalisiert)", () => {
    assert.equal(pruefeEmail("max@firma.de"), "max@firma.de");
    assert.equal(pruefeEmail("  Max.Muster+geo@Firma-GmbH.co.uk "), "max.muster+geo@firma-gmbh.co.uk");
    assert.equal(pruefeEmail("a@b.info"), "a@b.info");
    assert.equal(pruefeEmail("max@firma.de\n"), "max@firma.de"); // leading/trailing whitespace is trimmed
    const lang = "a".repeat(64) + "@" + "b".repeat(186) + ".de"; // 254
    assert.equal(lang.length, 254);
    assert.equal(pruefeEmail(lang), lang);
  });

  await test("pruefeEmail: ungültige Adressen", () => {
    const schlecht: unknown[] = [
      "", " ", "max", "max@", "@firma.de", "max@firma", "max@firma.d", "max firma@x.de", "max@@firma.de", "a@b@c.de",
      "max\n@firma.de", "max\u0000@firma.de", "max@fir‮ma.de", "a@b.de,c@d.de", "Max <max@firma.de>", "\"x\"@firma.de",
      "a;b@c.de", "a".repeat(64) + "@" + "b".repeat(187) + ".de", null, undefined, 123, ["a@b.de"],
    ];
    for (const s of schlecht) assert.equal(pruefeEmail(s), null, JSON.stringify(s));
  });

  await test("bereinigeName: Steuerzeichen, Leerraum, Länge", () => {
    assert.equal(bereinigeName("Anna"), "Anna");
    assert.equal(bereinigeName("  Anna   Maria "), "Anna Maria");
    assert.equal(bereinigeName("An\u0000na\r\nBcc: x@y.de"), "An na Bcc: x@y.de");
    assert.equal(bereinigeName("Anna‮evil"), "Anna evil");
    assert.equal(bereinigeName("​\u0007 \t"), null);
    assert.equal(bereinigeName(""), null);
    assert.equal(bereinigeName(undefined), null);
    assert.equal(bereinigeName(42), null);
    const lang = bereinigeName("x".repeat(500));
    assert.equal(lang?.length, NAME_MAX);
    // Surrogate pairs are not split.
    const emoji = bereinigeName("😀".repeat(100));
    assert.equal(Array.from(emoji || "").length, NAME_MAX);
    assert.ok(!/[\ud800-\udbff]$/.test(emoji || ""));
    assert.ok(!/[\u0000-\u001f\u007f]/.test(bereinigeName("a\u0001b\u007fc\u009fd") || ""));
  });

  await test("istZweckEinwilligung", () => {
    assert.equal(istZweckEinwilligung("kit"), true);
    assert.equal(istZweckEinwilligung("newsletter"), true);
    assert.equal(istZweckEinwilligung("bericht"), false);
    assert.equal(istZweckEinwilligung(undefined), false);
  });

  await test("leseJson: Größenlimit und Format", async () => {
    const req = (body: string, headers: Record<string, string> = {}) =>
      new Request("https://example.test/api", { method: "POST", body, headers: { "content-type": "application/json", ...headers } });
    assert.deepEqual(await leseJson(req('{"a":1}'), 100), { a: 1 });
    assert.equal(await leseJson(req("x".repeat(101)), 100), null);
    assert.equal(await leseJson(req("{}", { "content-length": "999999" }), 100), null);
    assert.equal(await leseJson(req("kein json"), 100), null);
    assert.equal(await leseJson(req("[1,2]"), 100), null);
    assert.deepEqual(await leseJson(req(""), 100), {});
    // Byte length, not character length.
    assert.equal(await leseJson(req(JSON.stringify({ a: "ä".repeat(60) })), 100), null);
  });

  console.log(`\n${n} Tests bestanden.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
