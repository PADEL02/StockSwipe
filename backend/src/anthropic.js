// ─────────────────────────────────────────────────────────────────────────────
// Aufruf der Claude-API mit Websuche + Kostenberechnung
// ─────────────────────────────────────────────────────────────────────────────

// Preise in US-Dollar pro 1 Mio. Tokens (Stand Oktober 2026, siehe
// https://platform.claude.com/docs/en/about-claude/pricing).
// Unbekannte Modelle werden vorsichtig mit dem teuersten Satz berechnet.
const PRICES = {
  "claude-sonnet-5-5": { in: 2,    out: 10  },
  "claude-haiku-5-5":  { in: 0.10, out: 0.50, longIn: 0.50, longOut: 2.50, longFrom: 100_000 },
};
const FALLBACK_PRICE = { in: 5, out: 25 };
const USD_PER_SEARCH = 0.01; // 10 $ pro 1.000 Suchen

function requestCostUsd(model, usage) {
  const p = PRICES[model] || FALLBACK_PRICE;
  const prompt = (usage.input_tokens || 0) + (usage.cache_read_input_tokens || 0) + (usage.cache_creation_input_tokens || 0);
  const long = p.longFrom && prompt > p.longFrom;
  const inRate  = long ? p.longIn  : p.in;
  const outRate = long ? p.longOut : p.out;
  const searches = usage.server_tool_use?.web_search_requests || 0;
  return (prompt * inRate + (usage.output_tokens || 0) * outRate) / 1e6 + searches * USD_PER_SEARCH;
}

// Höchstkosten einer Anfrage grob abschätzen – wird VOR dem Aufruf gegen das
// Tagesbudget geprüft, damit das Limit nie deutlich überschritten wird.
function worstCaseUsd(model, maxSearches) {
  const p = PRICES[model] || FALLBACK_PRICE;
  return (120_000 * (p.longIn || p.in) + 4_000 * (p.longOut || p.out)) / 1e6 + maxSearches * USD_PER_SEARCH;
}

function normalizeUrl(u) {
  try {
    const url = new URL(u);
    return (url.hostname.replace(/^www\./, "") + url.pathname.replace(/\/+$/, "")).toLowerCase();
  } catch { return null; }
}

function extractJson(text) {
  const fenced = [...text.matchAll(/```json\s*([\s\S]*?)```/g)];
  const candidate = fenced.length ? fenced[fenced.length - 1][1] : text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  try { return JSON.parse(candidate); } catch { return null; }
}

/**
 * Ruft Claude mit Websuche auf.
 * Rückgabe: { json, searchUrls:Set<normalisierte URL>, costUsd, searches }
 */
async function askClaude(env, { model, prompt, maxSearches, maxTokens = 4000 }) {
  const messages = [{ role: "user", content: prompt }];
  const searchUrls = new Set();
  let costUsd = 0, searches = 0, finalText = "";

  // Bei langen Recherchen pausiert die API ggf. (stop_reason "pause_turn");
  // dann wird die Antwort unverändert zurückgeschickt, um fortzusetzen.
  for (let round = 0; round < 4; round++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: maxSearches }],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Claude-API ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = await res.json();
    costUsd  += requestCostUsd(model, data.usage || {});
    searches += data.usage?.server_tool_use?.web_search_requests || 0;

    for (const block of data.content || []) {
      if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        block.content.forEach(r => { const n = r.url && normalizeUrl(r.url); if (n) searchUrls.add(n); });
      }
      if (block.type === "text") finalText += block.text;
    }

    if (data.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: data.content });
      finalText = "";
      continue;
    }
    break;
  }

  return { json: extractJson(finalText), searchUrls, costUsd, searches };
}

export { askClaude, worstCaseUsd, requestCostUsd, normalizeUrl, extractJson, PRICES };
