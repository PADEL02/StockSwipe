// ─────────────────────────────────────────────────────────────────────────────
// DataService – die EINZIGE Stelle, über die die App Daten holt.
//
// Demo-Modus (APP_CONFIG.ai.enabled = false): liefert Beispieldaten, keine Kosten.
// KI-Modus   (APP_CONFIG.ai.enabled = true):  fragt das Backend (Phase 4).
//
// Die Oberfläche (Swipe, Dive) merkt keinen Unterschied – sie ruft nur diese
// Funktionen auf. Dadurch lässt sich die KI später ohne Umbau einschalten.
// ─────────────────────────────────────────────────────────────────────────────
const DataService = (() => {
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  async function fetchJson(path) {
    const res = await fetch(`${APP_CONFIG.ai.endpoint}${path}`);
    if (!res.ok) throw new Error(`Backend-Fehler ${res.status}`);
    return res.json();
  }

  function withId(id) {
    const c = DEMO_COMPANIES[id];
    return c ? { id, ...c } : null;
  }

  return {
    /** Swipe-Karten für den Stapel. */
    getStockCards() {
      return DEMO_STOCKS;
    },

    /** Eine Swipe-Karte zu einer Aktie (für „Gedrückt halten“ in Dive). */
    getStockCard(stockId) {
      return DEMO_STOCKS.find(s => s.id === stockId) || null;
    },

    /** Unternehmen, mit denen man in Dive starten kann. */
    getDiveStartCompanies() {
      return Object.keys(DEMO_SUPPLY).map(withId).filter(c => c && c.listed);
    },

    getCompany(id) {
      return withId(id);
    },

    /**
     * Branchen mit ihren börsennotierten Zulieferern.
     * Rückgabe: [{ name, emoji, suppliers:[company] }]
     *           [] wenn keine börsennotierten Zulieferer bekannt sind
     *           null wenn (im Demo-Modus) keine Daten vorliegen
     */
    async getSupplierIndustries(companyId) {
      if (APP_CONFIG.ai.enabled) {
        return fetchJson(`/supply-chain?company=${encodeURIComponent(companyId)}`);
      }
      await wait(220); // kurze Ladezeit simulieren, damit die Animation wie später wirkt
      const raw = DEMO_SUPPLY[companyId];
      if (!raw) return null;
      return raw
        .map(ind => ({
          name:  ind.name,
          emoji: ind.emoji,
          suppliers: ind.suppliers.map(withId).filter(c => c && c.listed),
        }))
        .filter(ind => ind.suppliers.length > 0); // Branchen ohne börsennotierte Zulieferer ausblenden
    },
  };
})();
