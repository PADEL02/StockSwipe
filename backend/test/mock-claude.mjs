// Simulierte Claude-API für Tests: antwortet wie die echte API (Websuche-Ergebnisse,
// Text mit JSON-Block, usage). Inhalte kommen aus den Demo-Daten der App.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const ctx = {};
vm.createContext(ctx);
vm.runInContext(readFileSync(join(here, "../../data/demo-data.js"), "utf8") +
  "\nthis.DEMO_STOCKS = DEMO_STOCKS; this.DEMO_COMPANIES = DEMO_COMPANIES; this.DEMO_SUPPLY = DEMO_SUPPLY;", ctx);
const { DEMO_STOCKS, DEMO_COMPANIES, DEMO_SUPPLY } = ctx;

const d = (daysAgo) => new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, "");
function findCompany(name) {
  const n = norm(name);
  return Object.entries(DEMO_COMPANIES).find(([id, c]) => norm(c.name) === n || n.startsWith(norm(c.name)) || norm(c.name).startsWith(n));
}

export const calls = [];

function reply(json, urls, searches = 3) {
  return {
    stop_reason: "end_turn",
    usage: { input_tokens: 20000, output_tokens: 1500, server_tool_use: { web_search_requests: searches } },
    content: [
      { type: "server_tool_use", id: "s1", name: "web_search", input: { query: "x" } },
      { type: "web_search_tool_result", tool_use_id: "s1", content: urls.map(url => ({ type: "web_search_result", url, title: "t" })) },
      { type: "text", text: "Ergebnis:\n```json\n" + JSON.stringify(json) + "\n```" },
    ],
  };
}

export function mockAnswer(prompt, override) {
  if (override) return override(prompt);
  if (prompt.includes("Lieferkette von:")) {
    const name = prompt.split("Lieferkette von:\n")[1].split("\n")[0].replace(/\s*\(Ticker.*$/, "");
    const hit = findCompany(name);
    const urls = [];
    const industries = hit && DEMO_SUPPLY[hit[0]] ? DEMO_SUPPLY[hit[0]].map(ind => ({
      name: ind.name, emoji: ind.emoji,
      suppliers: ind.suppliers.map(sid => {
        const c = DEMO_COMPANIES[sid];
        const u1 = `https://www.reuters.com/technology/${sid}-${hit[0]}`, u2 = `https://asia.nikkei.com/business/${sid}-${hit[0]}`;
        urls.push(u1, u2);
        return { name: c.name, legal_name: c.name, ticker: null, exchange: null, country_iso: "US", listed: c.listed,
          what_they_supply: "Bauteile", evidence: [{ url: u1, publisher: "Reuters", date: d(100), type: "press" }, { url: u2, publisher: "Nikkei", date: d(200), type: "press" }] };
      }),
    })) : [];
    return reply({ company: { name }, industries }, urls, 5);
  }
  if (prompt.includes("Aktienkarte")) {
    const name = prompt.split("Aktienkarte in einer App für junge Anleger:\n")[1].split("\n")[0].replace(/\s*\(Ticker.*$/, "");
    const st = DEMO_STOCKS.find(s => norm(s.name).startsWith(norm(name)) || norm(name).startsWith(norm(s.name)));
    const src = `https://investor.example-ir.com/${norm(name)}`;
    return reply({
      name, ticker: st?.ticker || "TST", exchange: "NASDAQ", country_iso: "US",
      sector: st?.sector || "Industrie",
      description: st?.description || `${name} ist ein börsennotiertes Unternehmen. Die Beschreibung stammt aus der simulierten KI.`,
      products: (st?.products || [{ name: "Produkt A" }, { name: "Produkt B" }]).map(p => p.name),
      competitors: (st?.competitors || [{ name: "Wettbewerber X" }]).map(p => p.name),
      trend: st?.trend || { emoji: "🏭", label: "Industriewert" },
      dividend: { pays: true, amount: 0.25, currency: "USD", frequency: "quartalsweise", last_payment_date: d(40), source_url: src },
      market_cap: { value: st?.marketCap || 5e10, currency: "USD", as_of: d(2), source_url: src },
    }, [src], 3);
  }
  if (prompt.includes("Ein Nutzer sucht")) {
    const q = prompt.split('sucht in einer Aktien-App nach: "')[1].split('"')[0];
    const hit = findCompany(q);
    const src = `https://www.reuters.com/markets/companies/${norm(q)}`;
    if (!hit) return reply({ found: false }, [src], 1);
    return reply({ found: true, name: hit[1].name, short_name: hit[1].name, ticker: hit[0].toUpperCase(), exchange: "NASDAQ",
      country_iso: "US", listed: hit[1].listed, market_cap_usd: 1e11, market_cap_as_of: d(1), sources: [{ url: src, date: d(1) }] }, [src], 1);
  }
  if (prompt.includes("Aktualisiere zwei Kennzahlen")) {
    const src = "https://investor.example-ir.com/refresh";
    return reply({ dividend: { pays: false }, market_cap: { value: 7e10, currency: "USD", as_of: d(1), source_url: src } }, [src], 2);
  }
  return reply({}, [], 0);
}

// Ersetzt fetch für api.anthropic.com
export function installMockFetch(getOverride = () => null) {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    if (url.startsWith("https://api.anthropic.com/")) {
      const body = JSON.parse(init.body);
      const prompt = body.messages[0].content;
      calls.push({ model: body.model, prompt });
      return new Response(JSON.stringify(mockAnswer(prompt, getOverride())), { status: 200, headers: { "content-type": "application/json" } });
    }
    return realFetch(input, init);
  };
}
