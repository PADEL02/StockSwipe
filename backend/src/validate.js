// ─────────────────────────────────────────────────────────────────────────────
// Prüflogik: Was die KI liefert, wird hier hart kontrolliert.
// Nur was diese Prüfungen besteht, kommt ins Archiv und in die App.
// ─────────────────────────────────────────────────────────────────────────────
import { normalizeUrl } from "./anthropic.js";

// Diese Seiten zählen nie als Beleg.
const BLOCKED_HOSTS = [
  "reddit.com", "x.com", "twitter.com", "facebook.com", "instagram.com", "tiktok.com",
  "youtube.com", "quora.com", "medium.com", "substack.com", "stocktwits.com",
  "seekingalpha.com", "wikipedia.org", "fandom.com", "linkedin.com",
];

// Börsen und Aufsichtsbehörden gelten als Primärquellen.
const REGULATOR_HOSTS = [
  "sec.gov", "bundesanzeiger.de", "unternehmensregister.de", "hkexnews.hk", "twse.com.tw",
  "mops.twse.com.tw", "jpx.co.jp", "disclosure.edinet-fsa.go.jp", "dart.fss.or.kr",
  "londonstockexchange.com", "euronext.com", "asx.com.au", "sedarplus.ca", "cninfo.com.cn",
  "sse.com.cn", "szse.cn", "nseindia.com", "bseindia.com", "six-group.com",
];

const today = () => new Date().toISOString().slice(0, 10);

function hostOf(u) {
  try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return null; }
}
const hostMatches = (host, list) => list.some(h => host === h || host.endsWith("." + h));

function slug(name) {
  return String(name || "")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/&/g, " and ")
    .replace(/\b(inc|corp|corporation|co|ltd|limited|plc|ag|se|sa|nv|holdings?|group|company)\b\.?/g, " ")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

// Allgemeine Wörter, die in vielen Domains vorkommen und daher nichts beweisen
const GENERIC_TOKENS = new Set([
  "the", "and", "semiconductor", "semiconductors", "technology", "technologies", "tech",
  "electronics", "electric", "industries", "industrial", "international", "global", "systems",
  "energy", "solutions", "precision", "materials", "research", "motor", "motors", "computer",
  "chemical", "chemicals", "manufacturing", "aerospace", "automotive", "news", "investor",
]);

function nameTokens(...names) {
  return names.filter(Boolean)
    .flatMap(n => slug(n).split("-"))
    .filter(t => t.length >= 3 && !GENERIC_TOKENS.has(t));
}

function isRecent(dateStr, maxAgeDays) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr || ""))) return false;
  const d = new Date(dateStr + "T00:00:00Z").getTime();
  const now = Date.now();
  return d <= now + 86_400_000 && now - d <= maxAgeDays * 86_400_000;
}

// Stammt die URL wirklich aus den Suchergebnissen dieser Anfrage?
function isFoundUrl(url, searchUrls) {
  const n = url && normalizeUrl(url);
  return !!n && searchUrls.has(n);
}

function cleanText(s, max) {
  if (typeof s !== "string") return null;
  const t = s.replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}

// Formulierungen, die nach Anlageberatung klingen, fliegen raus.
const ADVICE_WORDS = /\b(kaufen|verkaufen|kaufempfehlung|kursziel|unterbewertet|überbewertet|schnäppchen|muss man haben|top-aktie|buy|sell)\b/i;

// ── Suche ────────────────────────────────────────────────────────────────────
function validateCompany(json, searchUrls, minMarketCapUsd) {
  if (!json || json.found !== true) return { ok: false, reason: "not_found" };
  const name = cleanText(json.short_name || json.name, 60);
  if (!name) return { ok: false, reason: "not_found" };
  if (json.listed !== true) return { ok: false, reason: "not_listed", name };

  const sourced = (json.sources || []).some(s => isFoundUrl(s.url, searchUrls));
  if (!sourced) return { ok: false, reason: "unverified" };

  const cap = Number(json.market_cap_usd);
  if (Number.isFinite(cap) && cap > 0 && cap < minMarketCapUsd) return { ok: false, reason: "too_small", name };

  return {
    ok: true,
    company: {
      id: slug(name),
      name,
      legal_name: cleanText(json.name, 120),
      ticker: cleanText(json.ticker, 16),
      exchange: cleanText(json.exchange, 24),
      country_iso: /^[A-Z]{2}$/.test(json.country_iso || "") ? json.country_iso : null,
      market_cap_usd: Number.isFinite(cap) && cap > 0 ? cap : null,
    },
  };
}

// ── Dive: Lieferkette ────────────────────────────────────────────────────────
function validateSupplyChain(json, searchUrls, rootCompany, maxAgeYears) {
  const maxAgeDays = maxAgeYears * 366;
  const rootId = slug(rootCompany.name);
  const stats = { proposed: 0, kept: 0, dropped_unlisted: 0, dropped_unsourced: 0 };

  const industries = (json?.industries || []).slice(0, 6).map(ind => {
    const seen = new Set();
    const suppliers = (ind.suppliers || []).map(s => {
      stats.proposed++;
      const name = cleanText(s.name, 50);
      if (!name) return null;
      const id = slug(name);
      if (!id || id === rootId || seen.has(id)) return null;

      if (s.listed !== true) { stats.dropped_unlisted++; return null; }

      // Belege prüfen: echte Such-URL, keine gesperrte Seite, nicht zu alt
      const evidence = (s.evidence || []).filter(e =>
        isFoundUrl(e.url, searchUrls) &&
        hostOf(e.url) && !hostMatches(hostOf(e.url), BLOCKED_HOSTS) &&
        isRecent(e.date, maxAgeDays)
      );
      const hosts = new Set(evidence.map(e => hostOf(e.url)));
      const tokens = nameTokens(name, s.legal_name, rootCompany.name, rootCompany.legal_name);
      const hasPrimary = evidence.some(e => {
        const h = hostOf(e.url);
        return hostMatches(h, REGULATOR_HOSTS) || tokens.some(t => h.includes(t));
      });
      if (!(hosts.size >= 2 || hasPrimary)) { stats.dropped_unsourced++; return null; }

      seen.add(id);
      stats.kept++;
      return {
        id, name,
        legal_name: cleanText(s.legal_name, 120),
        ticker: cleanText(s.ticker, 16),
        exchange: cleanText(s.exchange, 24),
        country_iso: /^[A-Z]{2}$/.test(s.country_iso || "") ? s.country_iso : null,
        supplies: cleanText(s.what_they_supply, 120),
        sources: evidence.slice(0, 3).map(e => ({ url: e.url, publisher: cleanText(e.publisher, 60), date: e.date })),
      };
    }).filter(Boolean).slice(0, 5);

    return {
      name: cleanText(ind.name, 28) || "Sonstiges",
      emoji: cleanText(ind.emoji, 4) || "•",
      suppliers,
    };
  }).filter(ind => ind.suppliers.length > 0);

  return { industries, stats };
}

// ── Swipe-Karte ──────────────────────────────────────────────────────────────
function validateDividend(div, searchUrls) {
  if (!div) return null;
  if (div.pays === false) return { pays: false };
  if (div.pays !== true) return null;
  const amount = Number(div.amount);
  const ok = isRecent(div.last_payment_date, 366) && isFoundUrl(div.source_url, searchUrls) && amount > 0;
  if (!ok) return null; // unbelegt → lieber gar nichts anzeigen
  const freq = ["jährlich", "halbjährlich", "quartalsweise", "monatlich"].includes(div.frequency) ? div.frequency : null;
  return {
    pays: true,
    amount: Math.round(amount * 10000) / 10000,
    currency: /^[A-Z]{3}$/.test(div.currency || "") ? div.currency : null,
    frequency: freq,
    last_payment_date: div.last_payment_date,
    source_url: div.source_url,
  };
}

function validateMarketCap(mc, searchUrls) {
  if (!mc) return null;
  const value = Number(mc.value);
  if (!(value > 0) || !/^[A-Z]{3}$/.test(mc.currency || "")) return null;
  if (!isRecent(mc.as_of, 120) || !isFoundUrl(mc.source_url, searchUrls)) return null;
  return { value, currency: mc.currency, as_of: mc.as_of, source_url: mc.source_url };
}

function validateCard(json, searchUrls, company) {
  if (!json) return null;
  const description = cleanText(json.description, 280);
  if (!description || ADVICE_WORDS.test(description)) return null;

  const list = (arr, max, len) => (Array.isArray(arr) ? arr : [])
    .map(x => cleanText(typeof x === "string" ? x : x?.name, len)).filter(Boolean).slice(0, max);

  let trend = null;
  const label = cleanText(json.trend?.label, 30);
  if (label && !ADVICE_WORDS.test(label)) trend = { emoji: cleanText(json.trend.emoji, 4) || "•", label };

  return {
    id: company.id,
    name: cleanText(json.name, 50) || company.name,
    ticker: cleanText(json.ticker, 16) || company.ticker || null,
    exchange: cleanText(json.exchange, 24) || company.exchange || null,
    country_iso: /^[A-Z]{2}$/.test(json.country_iso || "") ? json.country_iso : company.country_iso || null,
    sector: cleanText(json.sector, 30),
    description,
    products: list(json.products, 6, 30),
    competitors: list(json.competitors, 4, 30),
    trend,
    dividend: validateDividend(json.dividend, searchUrls),
    market_cap: validateMarketCap(json.market_cap, searchUrls),
  };
}

function validateFinancials(json, searchUrls) {
  return {
    dividend: validateDividend(json?.dividend, searchUrls),
    market_cap: validateMarketCap(json?.market_cap, searchUrls),
  };
}

export {
  validateCompany, validateSupplyChain, validateCard, validateFinancials,
  slug, isRecent, today, BLOCKED_HOSTS,
};
