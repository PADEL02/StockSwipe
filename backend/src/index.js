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
import { validateCompany, validateSupplyChain, validateCard, validateFinancials, slug, today } from "./validate.js";
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
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
async function rateLimitOk(env, s, request) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const hour = new Date().toISOString().slice(0, 13);
  const key = `${ip}|${hour}`;
  await env.DB.prepare("INSERT OR IGNORE INTO ratelimit (key, count) VALUES (?, 0)").bind(key).run();
  const res = await env.DB.prepare("UPDATE ratelimit SET count = count + 1 WHERE key = ? AND count < ?")
    .bind(key, s.ratePerHour).run();
  if (Math.random() < 0.02) {
    // gelegentlich alte Einträge aufräumen
    await env.DB.prepare("DELETE FROM ratelimit WHERE substr(key, -13) < ?").bind(hour).run();
  }
  return (res.meta?.changes || 0) > 0;
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
