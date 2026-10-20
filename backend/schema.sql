-- Datenbank (Cloudflare D1) für das KI-Backend
-- Einmalig ausführen: npx wrangler d1 execute stockswipe --remote --file=schema.sql

-- Archiv aller KI-Ergebnisse (Lieferketten, Karten, Suchergebnisse)
CREATE TABLE IF NOT EXISTS cache (
  key         TEXT PRIMARY KEY,          -- z. B. "sc:tsmc", "card:apple", "search:tsmc"
  status      TEXT NOT NULL,             -- "ready" oder "pending" (wird gerade erzeugt)
  data        TEXT,                      -- Ergebnis als JSON
  created_at  INTEGER NOT NULL,          -- Unix-Zeit in ms
  expires_at  INTEGER NOT NULL           -- danach wird neu erzeugt
);

-- KI-Ausgaben pro Tag (für die Kostenbremse)
CREATE TABLE IF NOT EXISTS usage (
  day        TEXT PRIMARY KEY,           -- "YYYY-MM-DD" (UTC)
  spent_usd  REAL NOT NULL DEFAULT 0,
  calls      INTEGER NOT NULL DEFAULT 0
);

-- Anfragen pro Gerät/Stunde (Schutz vor Missbrauch)
CREATE TABLE IF NOT EXISTS ratelimit (
  key    TEXT PRIMARY KEY,               -- "<IP>|<YYYY-MM-DDTHH>"
  count  INTEGER NOT NULL DEFAULT 0
);
