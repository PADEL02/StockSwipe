// ─────────────────────────────────────────────────────────────────────────────
// Zentrale App-Konfiguration
// Alles, was sich später ändern soll (Name, KI-Schalter, Bezahlmodell),
// steht hier an EINER Stelle.
// ─────────────────────────────────────────────────────────────────────────────
const APP_CONFIG = {
  // Arbeitstitel – der endgültige Name wird nur hier eingetragen.
  name:      "StockSwipe",
  // Kürzel im Logo-Badge oben links. Bewusst NICHT „SS“.
  badge:     "S",

  // ── KI / Datenquelle ──────────────────────────────────────────────────────
  // Solange `enabled` false ist, läuft die App im Demo-Modus mit Beispieldaten.
  // Es werden dann KEINE KI-Anfragen gestellt und es entstehen keine Kosten.
  ai: {
    enabled:  false,
    endpoint: "",          // URL des Backends (Cloudflare Worker), kommt in Phase 4
  },

  // ── Bezahlmodell ──────────────────────────────────────────────────────────
  // Ebene 1 = Aktie → Branchen → Zulieferer
  // Ebene 2 = Zulieferer aufklappen → dessen Branchen → dessen Zulieferer
  // Solange `enabled` false ist, sind alle Ebenen frei.
  paywall: {
    enabled:      false,
    freeMaxLevel: 2,
  },
};

// Kennzeichnung der Daten – erscheint klein auf Karten und in der Mindmap.
function dataSourceLabel() {
  return APP_CONFIG.ai.enabled ? "KI-generiert · ohne Gewähr" : "Beispieldaten";
}

// Zentrale Prüfung: Darf diese Ebene aufgeklappt werden?
// Später wird hier nur noch der Pro-Status aus dem In-App-Kauf abgefragt.
const Plan = {
  isPro() { return false; },
  canOpenLevel(level) {
    if (!APP_CONFIG.paywall.enabled) return true;
    return this.isPro() || level <= APP_CONFIG.paywall.freeMaxLevel;
  },
};

// Kleiner Speicher-Wrapper. Bewusst mit try/catch, weil Speicher in manchen
// Umgebungen (privater Modus, Vorschau) fehlen kann – die App läuft dann trotzdem.
const Store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignorieren */ }
  },
};
