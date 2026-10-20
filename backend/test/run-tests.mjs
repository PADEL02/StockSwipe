// Backend-Tests mit simulierter KI und lokaler SQLite-Datenbank.
// Ausführen: npm test   (im Ordner backend/)
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createD1 } from "./d1-shim.mjs";
import { installMockFetch, calls } from "./mock-claude.mjs";
import worker from "../src/index.js";
import { requestCostUsd } from "../src/anthropic.js";

const here = dirname(fileURLToPath(import.meta.url));
let override = null;
installMockFetch(() => override);

function makeEnv(extra = {}) {
  return {
    DB: createD1(join(here, "../schema.sql")),
    AI_ENABLED: "true", ANTHROPIC_API_KEY: "test-key", DAILY_BUDGET_EUR: "5", USD_PER_EUR: "1.15",
    RATE_LIMIT_PER_HOUR: "30", ADMIN_TOKEN: "geheim", ...extra,
  };
}
async function get(env, path, headers = {}) {
  const res = await worker.fetch(new Request("https://api.test" + path, { headers: { "CF-Connecting-IP": "1.2.3.4", ...headers } }), env);
  return { status: res.status, body: await res.json() };
}
const d = (daysAgo) => new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// ── Schalter ─────────────────────────────────────────────────────────────────
test("Schalter aus: keine KI-Aufrufe, Status meldet aus", async () => {
  const env = makeEnv({ AI_ENABLED: "false" });
  const n = calls.length;
  assert.equal((await get(env, "/status")).body.ai_enabled, false);
  const r = await get(env, "/supply-chain?company=aapl&name=Apple");
  assert.equal(r.status, 503); assert.equal(r.body.error, "ai_disabled");
  assert.equal(calls.length, n, "es darf kein KI-Aufruf passieren");
});

test("Schalter an, aber kein API-Schlüssel: bleibt aus", async () => {
  const env = makeEnv({ ANTHROPIC_API_KEY: "" });
  assert.equal((await get(env, "/status")).body.ai_enabled, false);
});

test("Archivierte Daten werden auch bei ausgeschaltetem Schalter geliefert (kostenlos)", async () => {
  const env = makeEnv();
  await get(env, "/supply-chain?company=aapl&name=Apple");
  env.AI_ENABLED = "false";
  const n = calls.length;
  const r = await get(env, "/supply-chain?company=aapl&name=Apple");
  assert.equal(r.status, 200); assert.equal(r.body.cached, true);
  assert.equal(calls.length, n);
});

// ── Lieferkette ──────────────────────────────────────────────────────────────
test("Lieferkette: Ergebnis, nicht börsennotierte Zulieferer ausgeblendet, Archiv", async () => {
  const env = makeEnv();
  const r = await get(env, "/supply-chain?company=vw&name=Volkswagen");
  assert.equal(r.status, 200);
  const names = r.body.industries.flatMap(i => i.suppliers.map(s => s.name));
  assert.ok(names.includes("Continental"));
  assert.ok(!names.includes("Bosch") && !names.includes("ZF Friedrichshafen"), "private Zulieferer müssen fehlen");
  const n = calls.length;
  const again = await get(env, "/supply-chain?company=vw&name=Volkswagen");
  assert.equal(again.body.cached, true);
  assert.equal(calls.length, n, "zweiter Aufruf muss aus dem Archiv kommen");
});

test("Prüflogik: erfundene URLs, zu alte Quellen und Einzelquellen werden verworfen", async () => {
  const env = makeEnv();
  override = () => ({
    stop_reason: "end_turn",
    usage: { input_tokens: 10000, output_tokens: 800, server_tool_use: { web_search_requests: 4 } },
    content: [
      { type: "web_search_tool_result", content: [
        { url: "https://www.reuters.com/a" }, { url: "https://asia.nikkei.com/b" },
        { url: "https://www.reuters.com/old" }, { url: "https://www.bloomberg.com/c" },
        { url: "https://investor.apple.com/supplier-list" }, { url: "https://www.reddit.com/r/x" },
      ] },
      { type: "text", text: "```json\n" + JSON.stringify({ industries: [{ name: "Chipfertigung", emoji: "🏭", suppliers: [
        { name: "TSMC", listed: true, evidence: [{ url: "https://www.reuters.com/a", date: d(30) }, { url: "https://asia.nikkei.com/b", date: d(60) }] },
        { name: "Erfundene AG", listed: true, evidence: [{ url: "https://www.reuters.com/gibt-es-nicht", date: d(30) }, { url: "https://asia.nikkei.com/auch-nicht", date: d(30) }] },
        { name: "Alt GmbH", listed: true, evidence: [{ url: "https://www.reuters.com/old", date: "2014-01-01" }, { url: "https://www.bloomberg.com/c", date: "2015-01-01" }] },
        { name: "Einzelquelle Inc", listed: true, evidence: [{ url: "https://www.bloomberg.com/c", date: d(30) }] },
        { name: "Primär Corp", listed: true, evidence: [{ url: "https://investor.apple.com/supplier-list", date: d(90) }] },
        { name: "Forum Ltd", listed: true, evidence: [{ url: "https://www.reddit.com/r/x", date: d(5) }, { url: "https://www.reuters.com/a", date: d(5) }] },
      ] }] }) + "\n```" },
    ],
  });
  const r = await get(env, "/supply-chain?company=aapl&name=Apple");
  override = null;
  const names = r.body.industries.flatMap(i => i.suppliers.map(s => s.name));
  assert.deepEqual(names.sort(), ["Primär Corp", "TSMC"].sort());
  assert.equal(r.body.stats.dropped_unsourced, 4);
});

// ── Karten ───────────────────────────────────────────────────────────────────
test("Karte: Daten geprüft und archiviert", async () => {
  const env = makeEnv();
  const r = await get(env, "/card?company=nvidia&name=NVIDIA");
  assert.equal(r.status, 200);
  assert.equal(r.body.dividend.pays, true);
  assert.equal(r.body.market_cap.currency, "USD");
  assert.ok(r.body.description.length <= 280);
});

test("Karte: Dividende älter als 12 Monate wird nicht als „ja“ angezeigt", async () => {
  const env = makeEnv();
  override = () => ({
    stop_reason: "end_turn", usage: { input_tokens: 5000, output_tokens: 500 },
    content: [{ type: "web_search_tool_result", content: [{ url: "https://ir.test.com/a" }] },
      { type: "text", text: "```json\n" + JSON.stringify({ name: "Test", sector: "Industrie", description: "Test baut Maschinen.",
        products: ["A"], competitors: ["B"], trend: { emoji: "⚙️", label: "Maschinenbau" },
        dividend: { pays: true, amount: 1, currency: "EUR", frequency: "jährlich", last_payment_date: d(500), source_url: "https://ir.test.com/a" },
        market_cap: { value: 1e9, currency: "EUR", as_of: d(1), source_url: "https://ir.test.com/a" } }) + "\n```" }],
  });
  const r = await get(env, "/card?company=test&name=Test");
  override = null;
  assert.equal(r.body.dividend, null);
  assert.equal(r.body.market_cap.value, 1e9);
});

test("Karte: Text mit Anlageempfehlung wird abgelehnt", async () => {
  const env = makeEnv();
  override = () => ({
    stop_reason: "end_turn", usage: { input_tokens: 5000, output_tokens: 500 },
    content: [{ type: "text", text: "```json\n" + JSON.stringify({ name: "X", description: "Jetzt kaufen, stark unterbewertet!", products: [], competitors: [] }) + "\n```" }],
  });
  const r = await get(env, "/card?company=x&name=X");
  override = null;
  assert.equal(r.status, 422);
});

test("Karte: Nach Ablauf werden nur Dividende/Unternehmenswert aufgefrischt", async () => {
  const env = makeEnv();
  await get(env, "/card?company=apple&name=Apple");
  // Karte künstlich ablaufen lassen (Texte 10 Tage alt)
  env.DB._db.prepare("UPDATE cache SET expires_at = 0, data = json_set(data, '$.base_fetched_at', ?) WHERE key = 'card:apple'")
    .run(Date.now() - 10 * 86400000);
  const n = calls.length;
  const r = await get(env, "/card?company=apple&name=Apple");
  assert.ok(calls[n].prompt.includes("Aktualisiere zwei Kennzahlen"), "es muss der günstige Auffrisch-Prompt laufen");
  assert.equal(r.body.dividend.pays, false);
  assert.equal(r.body.market_cap.value, 7e10);
  assert.ok(r.body.description.length > 0, "Texte bleiben erhalten");
});

// ── Suche ────────────────────────────────────────────────────────────────────
test("Suche: findet Unternehmen, merkt sich auch Fehlschläge", async () => {
  const env = makeEnv();
  const r = await get(env, "/search?q=TSMC");
  assert.equal(r.body.company.name, "TSMC");
  const miss = await get(env, "/search?q=Gibtsnicht Holding");
  assert.equal(miss.body.error, "not_found");
  const n = calls.length;
  await get(env, "/search?q=Gibtsnicht Holding");
  assert.equal(calls.length, n);
});

test("Suche: Unternehmen unter 50 Mio. Marktkapitalisierung werden abgelehnt", async () => {
  const env = makeEnv();
  override = () => ({ stop_reason: "end_turn", usage: { input_tokens: 2000, output_tokens: 200 },
    content: [{ type: "web_search_tool_result", content: [{ url: "https://www.reuters.com/mini" }] },
      { type: "text", text: "```json\n" + JSON.stringify({ found: true, name: "Mini AG", listed: true, market_cap_usd: 20e6,
        sources: [{ url: "https://www.reuters.com/mini", date: d(1) }] }) + "\n```" }] });
  const r = await get(env, "/search?q=Mini");
  override = null;
  assert.equal(r.body.error, "too_small");
});

// ── Kostenbremse ─────────────────────────────────────────────────────────────
test("Kosten werden korrekt verbucht", async () => {
  const env = makeEnv();
  await get(env, "/card?company=sap&name=SAP");
  const row = env.DB._db.prepare("SELECT spent_usd FROM usage").get();
  const expected = requestCostUsd("claude-haiku-5-5", { input_tokens: 20000, output_tokens: 1500, server_tool_use: { web_search_requests: 3 } });
  assert.ok(Math.abs(row.spent_usd - expected) < 1e-9, `${row.spent_usd} != ${expected}`);
});

test("Tagesbudget erschöpft: keine weiteren KI-Aufrufe", async () => {
  const env = makeEnv({ DAILY_BUDGET_EUR: "0.05" });
  const n = calls.length;
  const r = await get(env, "/supply-chain?company=nvda&name=NVIDIA");
  assert.equal(r.status, 429); assert.equal(r.body.error, "budget_exhausted");
  assert.equal(calls.length, n);
  assert.equal((await get(env, "/status")).body.budget.spent_eur, 0, "abgelehnte Reservierung darf nichts kosten");
});

test("Rate-Limit pro Gerät", async () => {
  const env = makeEnv({ RATE_LIMIT_PER_HOUR: "2" });
  assert.equal((await get(env, "/card?company=a1&name=Firma Eins")).status, 200);
  assert.equal((await get(env, "/card?company=a2&name=Firma Zwei")).status, 200);
  assert.equal((await get(env, "/card?company=a3&name=Firma Drei")).body.error, "rate_limited");
  assert.equal((await get(env, "/card?company=a1&name=Firma Eins")).status, 200, "Archiv zählt nicht");
});

test("Doppelte gleichzeitige Anfrage wird nur einmal berechnet", async () => {
  const env = makeEnv();
  const n = calls.length;
  const [a, b] = await Promise.all([
    get(env, "/card?company=tesla&name=Tesla"), get(env, "/card?company=tesla&name=Tesla"),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [200, 202]);
  assert.equal(calls.length - n, 1);
});

// ── Sonstiges ────────────────────────────────────────────────────────────────
test("Startliste mit archivierten Karten", async () => {
  const env = makeEnv();
  await get(env, "/card?company=sap&name=SAP");
  const r = await get(env, "/cards?offset=0&limit=5");
  assert.ok(r.body.total >= 250);
  assert.equal(r.body.items[0].id, "sap");
  assert.ok(r.body.items[0].card, "archivierte Karte muss mitkommen");
});

test("Admin: Archiv-Eintrag löschen nur mit Token", async () => {
  const env = makeEnv();
  await get(env, "/card?company=sap&name=SAP");
  const del = async (auth) => (await worker.fetch(new Request("https://api.test/admin/cache?key=card:sap", { method: "DELETE", headers: { Authorization: auth } }), env)).status;
  assert.equal(await del("Bearer falsch"), 401);
  assert.equal(await del("Bearer geheim"), 200);
});

test("CORS: erlaubte Herkunft wird gespiegelt", async () => {
  const env = makeEnv();
  const res = await worker.fetch(new Request("https://api.test/status", { headers: { Origin: "capacitor://localhost" } }), env);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), "capacitor://localhost");
});

// ── Phase 5: Datenschutz & Zugang ────────────────────────────────────────────
test("App-Kennung: ohne Kennung kein Zugriff, mit Kennung schon", async () => {
  const env = makeEnv({ APP_KEY: "app-123" });
  assert.equal((await get(env, "/status")).status, 403);
  assert.equal((await get(env, "/status", { "X-App-Key": "app-123" })).status, 200);
});

test("Fremde Website (Origin) wird abgewiesen", async () => {
  const env = makeEnv();
  assert.equal((await get(env, "/status", { Origin: "https://evil.example" })).status, 403);
  assert.equal((await get(env, "/status", { Origin: "https://padel02.github.io" })).status, 200);
});

test("IP-Adressen werden nur als Hash gespeichert", async () => {
  const env = makeEnv();
  await get(env, "/card?company=ip1&name=IP Test", { "CF-Connecting-IP": "203.0.113.77" });
  const rows = env.DB._db.prepare("SELECT key FROM ratelimit").all();
  assert.ok(rows.length >= 1);
  assert.ok(rows.every(r => !r.key.includes("203.0.113.77")), "IP darf nicht im Klartext stehen");
});

test("Logos: Website-Symbol der Firma über das Backend, mit Archiv", async () => {
  const env = makeEnv();
  const png = new Uint8Array(400); png.set([0x89, 0x50, 0x4E, 0x47]);
  const real = globalThis.fetch;
  const hits = [];
  globalThis.fetch = async (u, i) => {
    const url = String(u);
    if (url === "https://apple.com/") {
      hits.push(url);
      return new Response('<html><head><link rel="icon" href="/fav.ico"><link rel="apple-touch-icon" sizes="180x180" href="/touch.png"></head></html>',
        { headers: { "content-type": "text/html; charset=utf-8" } });
    }
    if (url === "https://apple.com/touch.png") { hits.push(url); return new Response(png, { headers: { "content-type": "image/png" } }); }
    if (url.startsWith("https://")) { hits.push(url); return new Response("nope", { status: 404 }); }
    return real(u, i);
  };
  try {
    let res = await worker.fetch(new Request("https://api.test/logo?domain=apple.com"), env);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "image/png");
    assert.equal(res.headers.get("X-Content-Type-Options"), "nosniff");
    assert.ok(hits.includes("https://apple.com/touch.png"), "Apple-Touch-Icon wird bevorzugt");
    const n = hits.length;
    res = await worker.fetch(new Request("https://api.test/logo?domain=apple.com"), env);
    assert.equal(res.status, 200);
    assert.equal(hits.length, n, "zweiter Abruf kommt aus dem Archiv");
    res = await worker.fetch(new Request("https://api.test/logo?domain=../../etc"), env);
    assert.equal(res.status, 404, "ungültige Domains werden abgelehnt");
    res = await worker.fetch(new Request("https://api.test/logo?domain=keinlogo.com"), env);
    assert.equal(res.status, 404, "ohne Logo → 404, App zeigt Kürzel");
  } finally { globalThis.fetch = real; }
});

test("Logos: Nicht-Bilder werden verworfen", async () => {
  const env = makeEnv();
  const real = globalThis.fetch;
  globalThis.fetch = async (u, i) => {
    const url = String(u);
    if (url === "https://evil.com/") return new Response('<link rel="icon" href="/x.png">', { headers: { "content-type": "text/html" } });
    if (url.startsWith("https://evil.com/")) return new Response("<script>alert(1)</script>".repeat(10), { headers: { "content-type": "image/png" } });
    if (url.startsWith("https://")) return new Response("", { status: 404 });
    return real(u, i);
  };
  try {
    const res = await worker.fetch(new Request("https://api.test/logo?domain=evil.com"), env);
    assert.equal(res.status, 404);
  } finally { globalThis.fetch = real; }
});

test("Website der Firma wird als Domain übernommen", async () => {
  const env = makeEnv();
  override = () => ({
    stop_reason: "end_turn", usage: { input_tokens: 5000, output_tokens: 500 },
    content: [{ type: "web_search_tool_result", content: [{ url: "https://ir.test.com/a" }] },
      { type: "text", text: "```json\n" + JSON.stringify({ name: "Test", website: "https://www.Test-Firma.com/de/", sector: "Industrie",
        description: "Test baut Maschinen.", products: ["A"], competitors: ["B"] }) + "\n```" }],
  });
  const r = await get(env, "/card?company=dom&name=Test");
  override = null;
  assert.equal(r.body.domain, "test-firma.com");
});

// ── Ausführen ────────────────────────────────────────────────────────────────
let failed = 0;
for (const t of tests) {
  try { await t.fn(); console.log("✓", t.name); }
  catch (e) { failed++; console.log("✗", t.name, "\n   ", e.message); }
}
console.log(`\n${tests.length - failed}/${tests.length} Tests bestanden`);
process.exit(failed ? 1 : 0);
