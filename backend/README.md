# KI-Backend (Cloudflare Worker)

Das Backend holt per KI (Claude mit Websuche) die Daten für **Dive** (Lieferketten) und die **Swipe-Karten**, prüft sie und speichert sie in einem Archiv. Jede Lieferkette wird nur einmal pro 90 Tage recherchiert, Karten-Texte alle 6 Monate, Dividende und Unternehmenswert alle 3 Monate. Alle anderen Aufrufe kommen kostenlos aus dem Archiv.

## Der KI-Schalter

Der Schalter ist die Variable **`AI_ENABLED`** im Cloudflare-Dashboard.

| Wert | Was passiert |
|---|---|
| `false` (Standard) | Keine KI-Aufrufe, **keine Kosten**. Die App zeigt Beispieldaten. |
| `true` | Die KI erzeugt neue Daten, begrenzt durch das Tageslimit. |

Die KI läuft nur, wenn **beides** stimmt: `AI_ENABLED = true` **und** ein API-Schlüssel ist hinterlegt. Ohne Schlüssel bleibt sie aus, egal was der Schalter sagt.

Da der Schalter im Backend liegt, kannst du ihn jederzeit umlegen, auch wenn die App schon in den Stores ist. Die App fragt ihn bei jedem Start ab.

**Umlegen:** Cloudflare-Dashboard → *Workers & Pages* → `stockswipe-api` → *Settings* → *Variables and Secrets* → `AI_ENABLED` auf `true` (oder zurück auf `false`) → speichern bzw. deployen. Die Bezeichnungen im Dashboard können sich leicht unterscheiden.

## Kostenschutz

- **Tageslimit** `DAILY_BUDGET_EUR` (Standard 5 €): Vor jedem KI-Aufruf werden die maximal möglichen Kosten reserviert. Passt das nicht mehr ins Tagesbudget, gibt es bis zum nächsten Tag (UTC) nur noch Daten aus dem Archiv.
- **Pro Gerät** höchstens `RATE_LIMIT_PER_HOUR` (Standard 30) neue KI-Anfragen pro Stunde.
- **Keine Doppelkosten:** Fragen zwei Nutzer gleichzeitig dasselbe an, läuft die KI nur einmal.
- **Zusätzlich empfohlen:** Im Anthropic-Konto ein monatliches Ausgabelimit setzen. Das greift unabhängig von diesem Code.

Aktueller Stand jederzeit unter `https://stockswipe-api.scheko2002.workers.dev/status` (KI an/aus, heute ausgegeben, Rest-Budget).

## Schutz vor falschen Daten

Die Masterprompts stehen in `src/prompts.js`, die Prüfregeln in `src/validate.js`. Kurz:

- Die KI darf nur Quellen nennen, die ihr die Websuche **in dieser Anfrage** geliefert hat. Der Code gleicht jede Quelle mit den echten Suchergebnissen ab und verwirft erfundene Links.
- Eine Zulieferbeziehung braucht **zwei unabhängige Quellen** oder eine **Primärquelle** (Geschäftsbericht, Börsenmitteilung, Unternehmensseite). Quellen dürfen höchstens 4 Jahre alt sein. Foren, soziale Netzwerke, Wikipedia u. Ä. zählen nicht.
- Nicht börsennotierte Zulieferer werden ausgeblendet.
- **Dividende ja** nur bei einer belegten Zahlung in den letzten 12 Monaten. Ist die Dividende nicht sicher belegt, zeigt die Karte gar nichts dazu an.
- Texte, die nach Anlageberatung klingen („kaufen“, „Kursziel“, „unterbewertet“ …), werden abgelehnt.
- Wertentwicklung (1W/1M/1J) wird im KI-Modus nicht angezeigt, weil sie im Archiv schnell veraltet.

## Einrichtung (einmalig, ca. 20 Minuten)

Voraussetzung: [Node.js](https://nodejs.org) ist installiert. Alle Befehle im Ordner `backend/` ausführen.

1. **Anthropic-Konto** auf [console.anthropic.com](https://console.anthropic.com) anlegen, Guthaben aufladen, ein **monatliches Ausgabelimit** setzen und einen **API-Schlüssel** erstellen. Den Schlüssel nirgends speichern oder weitergeben, er kommt nur in Schritt 5 zum Einsatz.
2. **Cloudflare-Konto** auf [dash.cloudflare.com](https://dash.cloudflare.com) anlegen (der kostenlose Plan reicht).
3. Anmelden:
   ```bash
   npx wrangler login
   ```
4. Datenbank anlegen und einrichten:
   ```bash
   npx wrangler d1 create stockswipe
   ```
   Die ausgegebene `database_id` in `wrangler.toml` bei `HIER-DIE-ID-EINTRAGEN` eintragen. Dann:
   ```bash
   npm run db:init
   ```
5. API-Schlüssel sicher hinterlegen (wird abgefragt, nicht angezeigt):
   ```bash
   npx wrangler secret put ANTHROPIC_API_KEY
   ```
6. Veröffentlichen:
   ```bash
   npm run deploy
   ```
   Am Ende steht die Adresse, z. B. `https://stockswipe-api.<name>.workers.dev`.
7. Diese Adresse in der App in `config.js` bei `ai.endpoint` eintragen (oder mir schicken).

Danach läuft alles, aber **die KI ist noch aus**. Erst wenn du den Schalter auf `true` stellst, entstehen Kosten.

## Optional

- **Einzelnen Eintrag neu recherchieren lassen** (z. B. nach einer Übernahme): einmalig `npx wrangler secret put ADMIN_TOKEN` (ein selbst gewähltes Passwort), dann
  ```bash
  curl -X DELETE "https://<adresse>/admin/cache?key=sc:tsmc" -H "Authorization: Bearer <ADMIN_TOKEN>"
  ```
  Schlüssel: `sc:<id>` für Lieferketten, `card:<id>` für Karten.
- **Startliste erweitern:** `src/starter-list.js` ergänzen und neu deployen.
- **Einstellungen ändern** (Tageslimit, Modelle, Archivzeiten): im Cloudflare-Dashboard unter *Settings → Variables and Secrets*. Welche Variablen es gibt und welche Standardwerte gelten, steht oben in `wrangler.toml`. Ein neues Deploy überschreibt deine Einstellungen nicht.

## Datenschutz und Zugang

- **IP-Adressen** werden nie gespeichert, nur ein nicht umkehrbarer Hash für die laufende Stunde (Limit pro Gerät). Optional macht ein Secret `IP_SALT` (beliebiger Zufallstext) die Hashes noch sicherer.
- **App-Kennung:** Das Backend beantwortet nur Anfragen mit der Kennung `APP_KEY` (steht in `wrangler.toml` und `config.js`) und von erlaubten Herkünften (deine Web-App, die nativen Apps). Das hält Gelegenheitsnutzer und Scanner fern; gegen gezielten Missbrauch schützen zusätzlich Tagesbudget und Limits. Eine stärkere Prüfung über Apple App Attest / Google Play Integrity folgt mit den nativen Apps.
- **Logos** laufen über `/logo`: Das Backend holt das Website-Symbol (Apple-Touch-Icon bzw. Favicon) einmalig von der offiziellen Website des Unternehmens, prüft, dass es wirklich ein Bild ist (max. 150 KB), und speichert es 30 Tage in der Datenbank. Kostenlos, ohne fremden Logo-Dienst, die Geräte der Nutzer sprechen nie mit fremden Servern. Findet sich kein Logo, zeigt die App das Kürzel. Neue Logo-Abrufe sind auf 150 pro Gerät und Stunde begrenzt (`LOGO_LIMIT_PER_HOUR`).
- **Tests** (mit simulierter KI, kostenlos): `npm test`
