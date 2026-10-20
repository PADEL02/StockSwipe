# StockSwipe (Arbeitstitel)

Aktien-Discovery-App für junge Anleger: **Swipe** (Aktien entdecken), **Dive** (Lieferketten als Mindmap), **ETF-Builder** mit Leaderboard.

Die App ist reines HTML/CSS/JavaScript. Dieselben Dateien laufen als Website (GitHub Pages) und – über [Capacitor](https://capacitorjs.com) – als iOS- und Android-App.

## Aufbau

| Datei | Inhalt |
|---|---|
| `config.js` | **Zentrale Einstellungen:** App-Name, Backend-Adresse, Bezahlmodell |
| `data/data-service.js` | Einzige Stelle, über die Daten geladen werden (Demo oder KI-Backend) |
| `data/demo-data.js` | Beispieldaten für den Demo-Modus |
| `app.js` | Swipe, Watchlist, ETF-Builder, Leaderboard |
| `dive-mindmap.js` | Dive-Mindmap |
| `tooltips.js` | Erklär-Tooltips (gedrückt halten / hovern) |
| `style.css` | Design (Farben zentral als Variablen in `:root`) |
| `backend/` | KI-Backend (Cloudflare Worker) – Einrichtung und **KI-Schalter** siehe `backend/README.md` |

## Wichtige Schalter in `config.js`

- `name` – endgültigen App-Namen hier eintragen (zusätzlich in `capacitor.config.json` → `appName`).
- `ai.endpoint` – Adresse des KI-Backends. Leer = immer Demo-Modus.
- **Der KI-Schalter selbst liegt im Backend** (Cloudflare-Variable `AI_ENABLED`, siehe `backend/README.md`). Steht er auf `false`, zeigt die App Beispieldaten und es entstehen keine Kosten.
- `paywall.enabled` – **aus** = alle Dive-Ebenen frei. Später für das Pro-Modell einschalten.

## Native Apps bauen (einmalig einrichten)

Voraussetzungen: [Node.js](https://nodejs.org) (LTS), für iOS ein Mac mit Xcode, für Android Android Studio.

```bash
# 1. Abhängigkeiten installieren (holt die aktuelle Capacitor-Version)
npm install @capacitor/core@latest
npm install -D @capacitor/cli@latest @capacitor/ios@latest @capacitor/android@latest

# 2. Web-Dateien nach www/ kopieren
npm run build

# 3. Native Projekte einmalig anlegen
npx cap add ios
npx cap add android

# 4. Projekt öffnen (kopiert vorher automatisch den aktuellen Stand)
npm run ios        # öffnet Xcode
npm run android    # öffnet Android Studio
```

Nach jeder Änderung an der Web-App reicht `npm run sync`.

**Vor der ersten Store-Einreichung festlegen:** `appId` in `capacitor.config.json` (aktuell Platzhalter `com.stockswipe.app`). Sie lässt sich nach der Veröffentlichung nicht mehr ändern, sollte also zum endgültigen Namen passen.
