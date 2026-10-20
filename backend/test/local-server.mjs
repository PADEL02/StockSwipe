// Lokaler Testserver: das echte Backend mit simulierter KI und SQLite.
// Start: node --experimental-sqlite backend/test/local-server.mjs [Port] [Verzögerung ms]
import http from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createD1 } from "./d1-shim.mjs";
import { installMockFetch } from "./mock-claude.mjs";
import worker from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2] || 8787);
const delay = Number(process.argv[3] || 1200);
const env = {
  DB: createD1(join(here, "../schema.sql")),
  AI_ENABLED: process.env.AI_ENABLED || "true", ANTHROPIC_API_KEY: "test-key",
  DAILY_BUDGET_EUR: "5", USD_PER_EUR: "1.15", RATE_LIMIT_PER_HOUR: "100",
};
installMockFetch();
const realFetch = globalThis.fetch;
globalThis.fetch = async (...a) => { await new Promise(r => setTimeout(r, delay)); return realFetch(...a); };

http.createServer(async (req, res) => {
  const request = new Request(`http://localhost:${port}${req.url}`, { method: req.method, headers: req.headers });
  const out = await worker.fetch(request, env);
  res.writeHead(out.status, Object.fromEntries(out.headers));
  res.end(await out.text());
}).listen(port, () => console.log(`Backend (simulierte KI) auf http://localhost:${port}`));
