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
  key    TEXT PRIMARY KEY,               -- "<YYYY-MM-DDTHH>|<Art>|<Hash der IP>" (nie die IP selbst)
  count  INTEGER NOT NULL DEFAULT 0
);

-- Firmenlogos (Website-Symbole der Unternehmen, Base64), damit die App nie
-- direkt fremde Server anfragt
CREATE TABLE IF NOT EXISTS logos (
  domain        TEXT PRIMARY KEY,
  content_type  TEXT,                    -- NULL = kein Logo gefunden
  data          TEXT,
  fetched_at    INTEGER NOT NULL
);
