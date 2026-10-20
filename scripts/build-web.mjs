// Kopiert die Web-App nach www/ – von dort übernimmt Capacitor sie in die
// iOS- und Android-Projekte. Die Dateien im Hauptordner bleiben die Quelle,
// damit GitHub Pages wie bisher funktioniert.
import { cpSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out  = join(root, "www");

const files = [
  "index.html", "style.css",
  "config.js", "tooltips.js", "app.js", "dive-mindmap.js",
  "data",
  "assets",
];

rmSync(out, { recursive: true, force: true });
mkdirSync(out);
for (const f of files) {
  const src = join(root, f);
  if (existsSync(src)) cpSync(src, join(out, f), { recursive: true });
}
console.log("Web-App nach www/ kopiert.");
