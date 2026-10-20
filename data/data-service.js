// ─────────────────────────────────────────────────────────────────────────────
// DataService – die EINZIGE Stelle, über die die App Daten holt.
//
// Beim Start fragt die App das Backend (APP_CONFIG.ai.endpoint), ob die KI
// eingeschaltet ist. Der Schalter liegt im Backend (Cloudflare-Variable
// AI_ENABLED), damit er sich auch ohne neue App-Version umlegen lässt.
//
// Demo-Modus: kein Backend eingetragen, Backend nicht erreichbar oder Schalter aus
//             → Beispieldaten, keine Kosten.
// KI-Modus:   Schalter an → Karten und Lieferketten kommen vom Backend.
// ─────────────────────────────────────────────────────────────────────────────
const AI_STATE = { active: false, budgetLeftEur: null };

// Gleiche ID-Bildung wie im Backend (backend/src/validate.js → slug)
function companySlug(name) {
  return String(name || "")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/&/g, " and ")
    .replace(/\b(inc|corp|corporation|co|ltd|limited|plc|ag|se|sa|nv|holdings?|group|company)\b\.?/g, " ")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

const DataService = (() => {
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const endpoint = () => (APP_CONFIG.ai.endpoint || "").replace(/\/+$/, "");
  const headers  = () => (APP_CONFIG.ai.appKey ? { "X-App-Key": APP_CONFIG.ai.appKey } : {});

  // Firmenlogo über das eigene Backend (nie direkt vom Logo-Dienst)
  function logoUrl(domain) {
    return endpoint() && domain ? `${endpoint()}/logo?domain=${encodeURIComponent(domain)}` : null;
  }

  // ── Hilfen für die Darstellung ─────────────────────────────────────────────
  const regionNames = (() => { try { return new Intl.DisplayNames(["de"], { type: "region" }); } catch { return null; } })();
  function flagFor(iso) {
    if (!/^[A-Z]{2}$/.test(iso || "")) return "";
    return String.fromCodePoint(...[...iso].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
  }
  function countryName(iso) {
    try { return (iso && regionNames?.of(iso)) || iso || "–"; } catch { return iso || "–"; }
  }
  function initials(name) {
    const words = String(name).replace(/\(.*?\)/g, "").trim().split(/[\s-]+/).filter(Boolean);
    return (words.length > 1 ? words[0][0] + words[1][0] : words[0]?.slice(0, 2) || "?").toUpperCase();
  }
  // Ruhige, je Unternehmen gleichbleibende Hintergrundfarbe
  function gradientFor(name) {
    let h = 0;
    for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const hue = h % 360;
    return `linear-gradient(160deg, hsl(${hue} 45% 8%) 0%, hsl(${hue} 55% 26%) 100%)`;
  }
  function formatMoney(amount, currency) {
    try { return new Intl.NumberFormat("de-DE", { style: "currency", currency, maximumFractionDigits: 4 }).format(amount); }
    catch { return `${amount} ${currency || ""}`.trim(); }
  }

  // Backend-Karte → Format, das die Swipe-Karte darstellt
  function mapCard(c) {
    let dividend = null;
    if (c.dividend?.pays === false) dividend = { pays: false };
    if (c.dividend?.pays === true) {
      dividend = {
        pays: true,
        amount: c.dividend.currency ? formatMoney(c.dividend.amount, c.dividend.currency) : null,
        frequency: c.dividend.frequency,
      };
    }
    return {
      id: c.id, name: c.name, ticker: c.ticker || "", exchange: c.exchange || null, domain: c.domain || null,
      logoText: initials(c.name), countryFlag: flagFor(c.country_iso),
      marketCap: c.market_cap?.value ?? null, marketCapCurrency: c.market_cap?.currency || null,
      marketCapAsOf: c.market_cap?.as_of || null,
      perf: null, // Wertentwicklung im KI-Modus bewusst ausgeblendet (wäre im Archiv schnell veraltet)
      sector: c.sector || "–", country: countryName(c.country_iso),
      description: c.description,
      products: (c.products || []).map(p => ({ name: p, short: initials(p), icon: null })),
      competitors: (c.competitors || []).map(p => ({ name: p, short: initials(p), icon: null })),
      dividend, trend: c.trend || null,
      photo: null, gradient: gradientFor(c.name),
    };
  }

  function mapCompany(c) {
    return {
      id: c.id || companySlug(c.name), name: c.name,
      ticker: c.ticker || null, exchange: c.exchange || null, domain: c.domain || null,
      flag: flagFor(c.country_iso), icon: null, logoText: initials(c.name), listed: true,
    };
  }

  // ── Backend-Aufruf mit Warten bei „wird gerade erzeugt“ ────────────────────
  async function api(path, { retries = 12 } = {}) {
    for (let i = 0; ; i++) {
      const res = await fetch(endpoint() + path, { headers: headers() });
      const body = await res.json().catch(() => ({}));
      if (res.status === 202 && i < retries) { await wait((body.retry_after || 5) * 1000); continue; }
      if (!res.ok || body.error) {
        const err = new Error(body.error || `http_${res.status}`);
        err.code = body.error || `http_${res.status}`;
        throw err;
      }
      return body;
    }
  }

  const query = (o) => Object.entries(o).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");

  // Verständliche Meldungen für Fehlercodes
  function messageFor(code) {
    return ({
      budget_exhausted: "Heute sind keine neuen Analysen mehr möglich. Morgen geht's weiter.",
      rate_limited:     "Kurz durchatmen: Zu viele neue Anfragen. Bitte gleich nochmal versuchen.",
      ai_disabled:      "Neue Analysen sind gerade ausgeschaltet.",
      ai_unverified:    "Dazu wurden keine ausreichend belegten Daten gefunden.",
      not_found:        "Kein passendes Unternehmen gefunden.",
      not_listed:       "Dieses Unternehmen ist nicht börsennotiert.",
      too_small:        "Dieses Unternehmen ist zu klein (unter 50 Mio. Börsenwert).",
      unverified:       "Das Unternehmen konnte nicht sicher bestätigt werden.",
    })[code] || "Daten konnten gerade nicht geladen werden.";
  }

  return {
    flagFor, initials, messageFor, logoUrl,

    /** Beim Start: Ist ein Backend eingetragen und die KI dort eingeschaltet? */
    async init() {
      if (!endpoint()) return;
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 4000);
        const res = await fetch(endpoint() + "/status", { signal: ctrl.signal, headers: headers() });
        clearTimeout(t);
        const s = await res.json();
        AI_STATE.active = s.ai_enabled === true;
        AI_STATE.budgetLeftEur = s.budget?.left_eur ?? null;
      } catch { AI_STATE.active = false; }
    },

    isAI() { return AI_STATE.active; },

    /**
     * Einträge für den Swipe-Stapel. Jeder Eintrag: { id, name, ticker, …, card }
     * card ist entweder fertig (Darstellungsformat) oder null (wird bei Bedarf geladen).
     */
    async getDeckBatch(offset, limit) {
      if (!AI_STATE.active) {
        return offset === 0 ? { total: DEMO_STOCKS.length, items: DEMO_STOCKS.map(s => ({ id: s.id, name: s.name, ticker: s.ticker, card: s })) }
                            : { total: DEMO_STOCKS.length, items: [] };
      }
      const r = await api(`/cards?offset=${offset}&limit=${limit}`);
      return {
        total: r.total,
        items: r.items.map(it => ({ ...it, card: it.card ? mapCard(it.card) : null })),
      };
    },

    /** Karte für einen Eintrag laden (KI-Modus; nutzt das Archiv, wenn vorhanden). */
    async loadCard(entry) {
      const r = await api(`/card?${query({ company: entry.id, name: entry.name, ticker: entry.ticker, exchange: entry.exchange, domain: entry.domain })}`);
      return mapCard(r);
    },

    /** Demo-Karte zu einer Demo-Aktie */
    getDemoCard(stockId) {
      return DEMO_STOCKS.find(s => s.id === stockId) || null;
    },

    /** Unternehmen, mit denen man in Dive starten kann (Vorschläge). */
    getDiveStartCompanies() {
      if (!AI_STATE.active) {
        return Object.keys(DEMO_SUPPLY).map(id => ({ id, ...DEMO_COMPANIES[id] })).filter(c => c.listed);
      }
      return [
        ["Apple", "AAPL", "US", "apple.com"], ["NVIDIA", "NVDA", "US", "nvidia.com"], ["Tesla", "TSLA", "US", "tesla.com"],
        ["Volkswagen", "VOW3", "DE", "volkswagen-group.com"], ["Airbus", "AIR", "FR", "airbus.com"], ["SAP", "SAP", "DE", "sap.com"],
        ["TSMC", "2330", "TW", "tsmc.com"], ["ASML", "ASML", "NL", "asml.com"],
      ].map(([name, ticker, iso, domain]) => mapCompany({ name, ticker, country_iso: iso, domain }));
    },

    /** Freitext-Suche (KI-Modus): findet ein börsennotiertes Unternehmen. */
    async searchCompany(q) {
      const r = await api(`/search?${query({ q })}`);
      return mapCompany(r.company);
    },

    getCompany(id) {
      const c = DEMO_COMPANIES[id];
      return c ? { id, ...c } : null;
    },

    /**
     * Branchen mit ihren börsennotierten Zulieferern.
     * Rückgabe: [{ name, emoji, suppliers:[company] }]
     *           [] wenn keine (belegten) börsennotierten Zulieferer bekannt sind
     *           null wenn (im Demo-Modus) keine Daten vorliegen
     */
    async getSupplierIndustries(company) {
      if (AI_STATE.active) {
        const r = await api(`/supply-chain?${query({ company: company.id, name: company.name, ticker: company.ticker, exchange: company.exchange })}`);
        return (r.industries || []).map(ind => ({
          name: ind.name, emoji: ind.emoji,
          suppliers: ind.suppliers.map(mapCompany),
        }));
      }
      await wait(220); // kurze Ladezeit simulieren, damit die Animation wie später wirkt
      const raw = DEMO_SUPPLY[company.id];
      if (!raw) return null;
      return raw
        .map(ind => ({
          name:  ind.name,
          emoji: ind.emoji,
          suppliers: ind.suppliers.map(id => ({ id, ...DEMO_COMPANIES[id] })).filter(c => c && c.listed),
        }))
        .filter(ind => ind.suppliers.length > 0); // Branchen ohne börsennotierte Zulieferer ausblenden
    },
  };
})();

// Startsignal: Swipe und Dive warten darauf, bevor sie Daten anzeigen.
const AppReady = DataService.init();
