// ─────────────────────────────────────────────────────────────────────────────
// KI-Backend (Cloudflare Worker)
//
// DER SCHALTER: Variable AI_ENABLED in Cloudflare.
//   "false" (Standard) → keine KI-Aufrufe, keine Kosten. Die App läuft im Demo-Modus.
//   "true"             → KI erzeugt neue Daten (mit Tageslimit und Archiv).
//
// Routen:
//   GET /status                    Ist die KI an? Wie viel Budget ist heute noch übrig?
//   GET /search?q=…                Nutzereingabe → börsennotiertes Unternehmen
//   GET /supply-chain?company=…    Lieferkette (Branchen → Zulieferer) für Dive
//   GET /card?company=…            Swipe-Karte eines Unternehmens
//   GET /cards?offset=&limit=      Startliste für den Swipe-Stapel
//   DELETE /admin/cache?key=…      Eintrag aus dem Archiv löschen (mit ADMIN_TOKEN)
// ─────────────────────────────────────────────────────────────────────────────
import { askClaude, worstCaseUsd } from "./anthropic.js";
import { searchPrompt, supplyChainPrompt, cardPrompt, financialsPrompt } from "./prompts.js";
import { validateCompany, validateSupplyChain, validateCard, validateFinancials, slug, today, cleanDomain } from "./validate.js";
import { STARTER_LIST } from "./starter-list.js";

const DAY_MS = 86_400_000;

// ── Einstellungen (aus wrangler.toml / Cloudflare-Variablen) ─────────────────
function settings(env) {
  const num = (v, d) => (Number.isFinite(Number(v)) && v !== "" && v !== undefined ? Number(v) : d);
  return {
    aiEnabled:       String(env.AI_ENABLED).toLowerCase() === "true" && !!env.ANTHROPIC_API_KEY,
    budgetEur:       num(env.DAILY_BUDGET_EUR, 5),
    usdPerEur:       num(env.USD_PER_EUR, 1.15),
    ratePerHour:     num(env.RATE_LIMIT_PER_HOUR, 30),
    logoPerHour:     num(env.LOGO_LIMIT_PER_HOUR, 150),
    modelDive:       env.MODEL_DIVE || "claude-sonnet-5-5",
    modelCard:       env.MODEL_CARD || "claude-haiku-5-5",
    modelSearch:     env.MODEL_SEARCH || "claude-haiku-5-5",
    minMarketCapUsd: num(env.MIN_MARKET_CAP_USD, 50_000_000),
    evidenceYears:   num(env.EVIDENCE_MAX_AGE_YEARS, 4),
    ttlSupplyDays:   num(env.TTL_SUPPLY_DAYS, 90),
    ttlCardDays:     num(env.TTL_CARD_DAYS, 180),
    ttlDividendDays: num(env.TTL_DIVIDEND_DAYS, 90),
  };
}

// ── HTTP-Helfer ──────────────────────────────────────────────────────────────
const DEFAULT_ORIGINS = [
  "https://padel02.github.io", "capacitor://localhost", "https://localhost", "http://localhost",
  "http://localhost:8080", "http://localhost:8765",
];

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(",").map(s => s.trim()) : DEFAULT_ORIGINS;
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0],
    "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-App-Key",
    "Vary": "Origin",
  };
}

function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...cors },
  });
}

// ── Archiv ───────────────────────────────────────────────────────────────────
async function cacheGet(env, key) {
  const row = await env.DB.prepare("SELECT status, data, expires_at FROM cache WHERE key = ?").bind(key).first();
  if (!row) return null;
  return { status: row.status, data: row.data ? JSON.parse(row.data) : null, fresh: row.expires_at > Date.now() };
}

// Markiert einen Eintrag als „wird erzeugt“. Gibt false zurück, wenn gerade
// schon jemand anderes ihn erzeugt – so zahlt man nie doppelt.
async function cacheClaim(env, key) {
  const now = Date.now();
  const res = await env.DB.prepare(
    `INSERT INTO cache (key, status, data, created_at, expires_at) VALUES (?, 'pending', NULL, ?, ?)
     ON CONFLICT(key) DO UPDATE SET status = 'pending', expires_at = excluded.expires_at
     WHERE cache.expires_at <= ?`
  ).bind(key, now, now + 180_000, now).run();
  return (res.meta?.changes || 0) > 0;
}

async function cachePut(env, key, data, ttlDays) {
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO cache (key, status, data, created_at, expires_at) VALUES (?, 'ready', ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET status = 'ready', data = excluded.data, created_at = excluded.created_at, expires_at = excluded.expires_at`
  ).bind(key, JSON.stringify(data), now, now + ttlDays * DAY_MS).run();
}

// Fehlgeschlagene Erzeugung: alte Daten (falls vorhanden) einen Tag weiter nutzen, sonst Eintrag löschen
async function cacheRelease(env, key) {
  const row = await env.DB.prepare("SELECT data FROM cache WHERE key = ?").bind(key).first();
  if (row?.data) {
    await env.DB.prepare("UPDATE cache SET status = 'ready', expires_at = ? WHERE key = ?").bind(Date.now() + DAY_MS, key).run();
  } else {
    await env.DB.prepare("DELETE FROM cache WHERE key = ?").bind(key).run();
  }
}

// ── Kostenbremse ─────────────────────────────────────────────────────────────
async function budgetStatus(env, s) {
  const row = await env.DB.prepare("SELECT spent_usd, calls FROM usage WHERE day = ?").bind(today()).first();
  const spentUsd = row?.spent_usd || 0;
  const limitUsd = s.budgetEur * s.usdPerEur;
  return {
    limit_eur: s.budgetEur,
    spent_eur: Math.round(spentUsd / s.usdPerEur * 100) / 100,
    left_eur:  Math.max(0, Math.round((limitUsd - spentUsd) / s.usdPerEur * 100) / 100),
    calls:     row?.calls || 0,
  };
}

// Reserviert vorab die maximal möglichen Kosten. Nur wenn das ins Tagesbudget
// passt, darf die KI aufgerufen werden.
async function reserveBudget(env, s, usd) {
  const day = today();
  const limitUsd = s.budgetEur * s.usdPerEur;
  await env.DB.prepare("INSERT OR IGNORE INTO usage (day, spent_usd, calls) VALUES (?, 0, 0)").bind(day).run();
  const res = await env.DB.prepare(
    "UPDATE usage SET spent_usd = spent_usd + ?, calls = calls + 1 WHERE day = ? AND spent_usd + ? <= ?"
  ).bind(usd, day, usd, limitUsd).run();
  return (res.meta?.changes || 0) > 0;
}

// Nach dem Aufruf: Reservierung durch die echten Kosten ersetzen
async function settleBudget(env, reservedUsd, actualUsd) {
  await env.DB.prepare("UPDATE usage SET spent_usd = MAX(0, spent_usd + ?) WHERE day = ?")
    .bind(actualUsd - reservedUsd, today()).run();
}

// ── Missbrauchsschutz: begrenzte Anzahl neuer KI-Anfragen pro Gerät/Stunde ──
// Datenschutz: Die IP-Adresse wird nie gespeichert, nur ein nicht umkehrbarer
// Hash davon – und auch der wird nach Ablauf der Stunde gelöscht.
async function hashIp(env, ip) {
  const data = new TextEncoder().encode(`${env.IP_SALT || "stockswipe"}|${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].slice(0, 16).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function rateLimitOk(env, s, request, kind = "ai", limit = s.ratePerHour) {
  const hour = new Date().toISOString().slice(0, 13);
  const key = `${hour}|${kind}|${await hashIp(env, request.headers.get("CF-Connecting-IP") || "unknown")}`;
  // Einträge vergangener Stunden löschen
  await env.DB.prepare("DELETE FROM ratelimit WHERE key < ?").bind(`${hour}|`).run();
  await env.DB.prepare("INSERT OR IGNORE INTO ratelimit (key, count) VALUES (?, 0)").bind(key).run();
  const res = await env.DB.prepare("UPDATE ratelimit SET count = count + 1 WHERE key = ? AND count < ?")
    .bind(key, limit).run();
  return (res.meta?.changes || 0) > 0;
}

// ── Zugangsprüfung: Nur die eigene App (Kennung + erlaubte Herkunft) ─────────
// Hält Gelegenheitsnutzer und automatische Scanner fern. Ein echter Schutz gegen
// gezielte Angriffe ist das nicht – dafür sorgen zusätzlich Tagesbudget und Limits.
function appAllowed(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(",").map(s => s.trim()) : DEFAULT_ORIGINS;
  if (origin && !allowed.includes(origin)) return false;
  if (env.APP_KEY && request.headers.get("X-App-Key") !== env.APP_KEY) return false;
  return true;
}

// ── Firmenlogos ──────────────────────────────────────────────────────────────
// Kein fremder Logo-Dienst: Das Backend holt das Website-Symbol (Apple-Touch-Icon
// bzw. Favicon) einmalig von der offiziellen Website des Unternehmens und legt es
// in der eigenen Datenbank ab. Die Geräte der Nutzer sprechen nie mit fremden
// Servern – nur mit diesem Backend.
const LOGO_TTL_MS      = 30 * DAY_MS;   // gefundene Logos 30 Tage behalten
const LOGO_MISS_TTL_MS = 7 * DAY_MS;    // „kein Logo“ nach 7 Tagen neu versuchen
const LOGO_MAX_BYTES   = 150_000;

async function fetchLimited(target, maxBytes, timeoutMs = 5000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(target, {
      signal: ctrl.signal, redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; StockSwipeLogoBot/1.0)", "Accept": "text/html,image/*;q=0.9,*/*;q=0.5" },
    });
    if (!res.ok || !res.body) return null;
    if (!String(res.url || target).startsWith("https://")) return null;
    const reader = res.body.getReader();
    const chunks = []; let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { try { await reader.cancel(); } catch {} return null; }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let off = 0;
    for (const c of chunks) { bytes.set(c, off); off += c.byteLength; }
    return { bytes, type: (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase(), url: res.url || target };
  } catch { return null; } finally { clearTimeout(t); }
}

// Mögliche Symbole aus dem HTML der Startseite lesen (größtes Apple-Touch-Icon zuerst)
function iconCandidates(html, baseUrl) {
  const out = [];
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    const rel = (tag.match(/\brel\s*=\s*["']?([^"'>]+)/i) || [])[1]?.toLowerCase() || "";
    const href = (tag.match(/\bhref\s*=\s*["']([^"']+)["']/i) || tag.match(/\bhref\s*=\s*([^\s>]+)/i) || [])[1];
    if (!href || !/icon/.test(rel) || /mask-icon/.test(rel)) continue;
    const size = Math.max(0, ...((tag.match(/\bsizes\s*=\s*["']?([^"'>]+)/i) || [])[1] || "")
      .split(/\s+/).map(v => parseInt(v, 10) || 0));
    let abs; try { abs = new URL(href.replace(/&amp;/g, "&"), baseUrl).href; } catch { continue; }
    if (!abs.startsWith("https://")) continue;
    const score = (/apple-touch-icon/.test(rel) ? 1000 : 0) + Math.min(size || (/\.svg/i.test(abs) ? 256 : 32), 512);
    out.push({ url: abs, score });
  }
  return out.sort((a, b) => b.score - a.score).map(c => c.url);
}

function sniffImageType(bytes) {
  const b = bytes;
  if (b[0] === 0x89 && b[1] === 0x50) return "image/png";
  if (b[0] === 0xFF && b[1] === 0xD8) return "image/jpeg";
  if (b[0] === 0x47 && b[1] === 0x49) return "image/gif";
  if (b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x01 && b[3] === 0x00) return "image/x-icon";
  if (b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57 && b[9] === 0x45) return "image/webp";
  const head = new TextDecoder().decode(b.slice(0, 300)).toLowerCase();
  if (head.includes("<svg")) return "image/svg+xml";
  return null; // kein erkennbares Bild → verwerfen, egal was der Server behauptet
}

async function findSiteIcon(domain) {
  const tried = new Set();
  const tryImage = async (u) => {
    if (tried.has(u)) return null; tried.add(u);
    const r = await fetchLimited(u, LOGO_MAX_BYTES);
    if (!r || r.bytes.byteLength < 100) return null;
    const type = sniffImageType(r.bytes);
    return type ? { type, bytes: r.bytes } : null;
  };
  for (const home of [`https://${domain}/`, `https://www.${domain}/`]) {
    const page = await fetchLimited(home, 600_000);
    if (!page || !/html/.test(page.type)) continue;
    const html = new TextDecoder().decode(page.bytes);
    for (const c of iconCandidates(html, page.url).slice(0, 4)) {
      const img = await tryImage(c);
      if (img) return img;
    }
    const origin = new URL(page.url).origin;
    for (const p of ["/apple-touch-icon.png", "/favicon.ico"]) {
      const img = await tryImage(origin + p);
      if (img) return img;
    }
    break;
  }
  return null;
}

function toBase64(bytes) {
  let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromBase64(b64) {
  const bin = atob(b64); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function logoResponse(row, cors) {
  const safe = {
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
    "Cross-Origin-Resource-Policy": "cross-origin",
  };
  if (!row || !row.data) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=86400", ...safe, ...cors } });
  }
  return new Response(fromBase64(row.data), {
    headers: { "content-type": row.content_type, "Cache-Control": "public, max-age=604800", ...safe, ...cors },
  });
}

async function handleLogo(ctx, url) {
  const { env, s, request, cors } = ctx;
  const domain = cleanDomain(url.searchParams.get("domain") || "");
  if (!domain) return logoResponse(null, cors);

  const row = await env.DB.prepare("SELECT content_type, data, fetched_at FROM logos WHERE domain = ?").bind(domain).first();
  if (row && Date.now() - row.fetched_at < (row.data ? LOGO_TTL_MS : LOGO_MISS_TTL_MS)) return logoResponse(row, cors);

  // Neue Abrufe pro Gerät begrenzen; bekannte (auch abgelaufene) Logos weiter ausliefern
  if (!(await rateLimitOk(env, s, request, "logo", s.logoPerHour))) return logoResponse(row, cors);

  const icon = await findSiteIcon(domain);
  const fresh = icon ? { content_type: icon.type, data: toBase64(icon.bytes) } : (row?.data ? row : { content_type: null, data: null });
  await env.DB.prepare(
    `INSERT INTO logos (domain, content_type, data, fetched_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(domain) DO UPDATE SET content_type = excluded.content_type, data = excluded.data, fetched_at = excluded.fetched_at`
  ).bind(domain, fresh.content_type, fresh.data, Date.now()).run();
  return logoResponse(fresh, cors);
}

// ── Gemeinsamer Ablauf: Archiv → (Schalter, Limits) → KI → Prüfung → Archiv ──
async function cachedOrGenerate(ctx, key, generate) {
  const { env, s, request, cors } = ctx;
  const hit = await cacheGet(env, key);
  if (hit?.status === "ready" && hit.fresh) return json({ ...hit.data, cached: true }, 200, cors);

  // Abgelaufene Daten dürfen weiter angezeigt werden, wenn keine neuen erzeugt werden können
  const stale = hit?.status === "ready" ? hit.data : null;
  const fallback = (error, status, extra = {}) =>
    stale ? json({ ...stale, cached: true, stale: true }, 200, cors) : json({ error, ...extra }, status, cors);

  if (!s.aiEnabled) return fallback("ai_disabled", 503);
  if (hit?.status === "pending" && hit.fresh) return json({ pending: true, retry_after: 5 }, 202, cors);
  if (!(await rateLimitOk(env, s, request))) return fallback("rate_limited", 429);
  if (!(await cacheClaim(env, key))) return json({ pending: true, retry_after: 5 }, 202, cors);

  try {
    const result = await generate(stale);
    if (result.error) {
      await cacheRelease(env, key);
      return fallback(result.error, result.status || 422);
    }
    await cachePut(env, key, result.data, result.ttlDays);
    return json({ ...result.data, cached: false }, 200, cors);
  } catch (err) {
    console.error(key, err);
    await cacheRelease(env, key);
    return fallback(err.code === "budget" ? "budget_exhausted" : "ai_error", err.code === "budget" ? 429 : 502);
  }
}

async function runClaude(ctx, { model, prompt, maxSearches, maxTokens }) {
  const { env, s } = ctx;
  const reserved = worstCaseUsd(model, maxSearches);
  if (!(await reserveBudget(env, s, reserved))) {
    const e = new Error("Tagesbudget erschöpft"); e.code = "budget"; throw e;
  }
  let result;
  try {
    result = await askClaude(env, { model, prompt, maxSearches, maxTokens });
  } catch (err) {
    await settleBudget(env, reserved, 0); // fehlgeschlagene Aufrufe werden nicht berechnet
    throw err;
  }
  await settleBudget(env, reserved, result.costUsd);
  return result;
}

// Unternehmensangaben aus der Anfrage lesen
function companyFromParams(url) {
  const name = (url.searchParams.get("name") || "").trim().slice(0, 80);
  const id = slug(url.searchParams.get("company") || name);
  if (!id || !name) return null;
  return {
    id, name,
    ticker:   (url.searchParams.get("ticker")   || "").trim().slice(0, 16) || null,
    exchange: (url.searchParams.get("exchange") || "").trim().slice(0, 24) || null,
    domain:   cleanDomain(url.searchParams.get("domain") || ""),
  };
}

// ── Routen ───────────────────────────────────────────────────────────────────
async function handleSearch(ctx, url) {
  const q = (url.searchParams.get("q") || "").trim().slice(0, 80);
  if (q.length < 2) return json({ error: "query_too_short" }, 400, ctx.cors);
  return cachedOrGenerate(ctx, `search:${slug(q)}`, async () => {
    const r = await runClaude(ctx, { model: ctx.s.modelSearch, prompt: searchPrompt(q, today()), maxSearches: 3, maxTokens: 1500 });
    const v = validateCompany(r.json, r.searchUrls, ctx.s.minMarketCapUsd);
    // Auch „nicht gefunden“ wird gespeichert, damit dieselbe Suche nicht erneut Geld kostet
    return { data: v.ok ? { company: v.company } : { error: v.reason, name: v.name || null }, ttlDays: v.ok ? 90 : 30 };
  });
}

async function handleSupplyChain(ctx, url) {
  const company = companyFromParams(url);
  if (!company) return json({ error: "missing_company" }, 400, ctx.cors);
  return cachedOrGenerate(ctx, `sc:${company.id}`, async () => {
    const r = await runClaude(ctx, {
      model: ctx.s.modelDive,
      prompt: supplyChainPrompt(company, today(), ctx.s.evidenceYears),
      maxSearches: 6, maxTokens: 6000,
    });
    if (!r.json) return { error: "ai_unparseable", status: 502 };
    const { industries, stats } = validateSupplyChain(r.json, r.searchUrls, company, ctx.s.evidenceYears);
    return {
      data: { company, industries, as_of: today(), stats },
      // leere Ergebnisse kürzer speichern, damit später neu gesucht wird
      ttlDays: industries.length ? ctx.s.ttlSupplyDays : 30,
    };
  });
}

async function handleCard(ctx, url) {
  const company = companyFromParams(url);
  if (!company) return json({ error: "missing_company" }, 400, ctx.cors);
  const { s } = ctx;
  return cachedOrGenerate(ctx, `card:${company.id}`, async (stale) => {
    const now = Date.now();
    const baseAgeDays = stale?.base_fetched_at ? (now - stale.base_fetched_at) / DAY_MS : Infinity;

    if (stale && baseAgeDays < s.ttlCardDays) {
      // Texte sind noch aktuell → nur Dividende und Unternehmenswert auffrischen (günstiger)
      const r = await runClaude(ctx, { model: s.modelCard, prompt: financialsPrompt(company, today()), maxSearches: 3, maxTokens: 1200 });
      const f = validateFinancials(r.json, r.searchUrls);
      const data = { ...stale, dividend: f.dividend, market_cap: f.market_cap, financials_fetched_at: now };
      delete data.cached; delete data.stale;
      return { data, ttlDays: Math.min(s.ttlDividendDays, s.ttlCardDays - baseAgeDays) };
    }

    const r = await runClaude(ctx, { model: s.modelCard, prompt: cardPrompt(company, today()), maxSearches: 4, maxTokens: 2000 });
    const card = validateCard(r.json, r.searchUrls, company);
    if (!card) return { error: "ai_unverified", status: 422 };
    return { data: { ...card, base_fetched_at: now, financials_fetched_at: now }, ttlDays: s.ttlDividendDays };
  });
}

async function handleCards(ctx, url) {
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10) || 0);
  const limit  = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10) || 20));
  const slice  = STARTER_LIST.slice(offset, offset + limit);

  // Bereits archivierte Karten gleich mitschicken (kostet nichts)
  const keys = slice.map(([name]) => `card:${slug(name)}`);
  const cached = new Map();
  if (keys.length) {
    const rows = await ctx.env.DB.prepare(
      `SELECT key, data FROM cache WHERE status = 'ready' AND key IN (${keys.map(() => "?").join(",")})`
    ).bind(...keys).all();
    (rows.results || []).forEach(r => cached.set(r.key, JSON.parse(r.data)));
  }

  return json({
    total: STARTER_LIST.length,
    offset,
    items: slice.map(([name, ticker, exchange, country_iso]) => {
      const id = slug(name);
      return { id, name, ticker, exchange, country_iso, card: cached.get(`card:${id}`) || null };
    }),
  }, 200, ctx.cors);
}

async function handleAdminDelete(ctx, url) {
  const auth = ctx.request.headers.get("Authorization") || "";
  if (!ctx.env.ADMIN_TOKEN || auth !== `Bearer ${ctx.env.ADMIN_TOKEN}`) return json({ error: "unauthorized" }, 401, ctx.cors);
  const key = url.searchParams.get("key");
  if (!key) return json({ error: "missing_key" }, 400, ctx.cors);
  const res = await ctx.env.DB.prepare("DELETE FROM cache WHERE key = ?").bind(key).run();
  return json({ deleted: res.meta?.changes || 0 }, 200, ctx.cors);
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    const ctx = { env, s: settings(env), request, cors };

    try {
      // Logos werden als <img> geladen (ohne Kennung) – sie kosten keine KI
      if (request.method === "GET" && url.pathname === "/logo") return await handleLogo(ctx, url);
      if (!url.pathname.startsWith("/admin/") && !appAllowed(request, env)) {
        return json({ error: "forbidden" }, 403, cors);
      }
      if (request.method === "GET" && url.pathname === "/status") {
        return json({ ai_enabled: ctx.s.aiEnabled, budget: await budgetStatus(env, ctx.s) }, 200, cors);
      }
      if (request.method === "GET" && url.pathname === "/search")       return await handleSearch(ctx, url);
      if (request.method === "GET" && url.pathname === "/supply-chain") return await handleSupplyChain(ctx, url);
      if (request.method === "GET" && url.pathname === "/card")         return await handleCard(ctx, url);
      if (request.method === "GET" && url.pathname === "/cards")        return await handleCards(ctx, url);
      if (request.method === "DELETE" && url.pathname === "/admin/cache") return await handleAdminDelete(ctx, url);
      return json({ error: "not_found" }, 404, cors);
    } catch (err) {
      console.error(err);
      return json({ error: "server_error" }, 500, cors);
    }
  },
};
