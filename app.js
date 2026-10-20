// ── Daten & Grundzustand ─────────────────────────────────────────────────────
const stocks = DataService.getStockCards();

let index = 0;
let dx = 0, dy = 0;
const watchlist = new Map();

const card    = document.getElementById("card");
const sheet   = document.getElementById("sheet");
const toast   = document.getElementById("toast");

// App-Name und Badge kommen aus der Konfiguration (config.js)
document.title = APP_CONFIG.name;
document.getElementById("brandName").textContent  = APP_CONFIG.name;
document.getElementById("brandBadge").textContent = APP_CONFIG.badge;
document.querySelectorAll("[data-source-label]").forEach(el => el.textContent = dataSourceLabel());

const nfShort = new Intl.NumberFormat("de-DE", { notation:"compact", compactDisplay:"short" });

function formatCap(x)  { return typeof x === "number" ? nfShort.format(x) : "–"; }
function formatPerf(p) { return typeof p === "number" ? `${p > 0 ? "+" : ""}${p.toFixed(1)}%` : "–"; }
function perfColor(p)  { return p > 0 ? "var(--like)" : p < 0 ? "var(--nope)" : "var(--muted)"; }
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 1800);
}

// ── Card Helpers ──────────────────────────────────────────────────────────────
function brandIconError(img) {
  const fb = img.dataset.fallback || "?";
  img.parentElement.innerHTML = `<span class="brand-fallback">${fb}</span>`;
}

function renderBrandRow(container, items) {
  if (!items || !items.length) { container.innerHTML = ""; return; }
  container.innerHTML = items.map(item => {
    if (item.icon) {
      return `<div class="brand-icon" title="${item.name}">` +
        `<img src="https://cdn.simpleicons.org/${item.icon}/ffffff" alt="${item.name}"` +
        ` data-fallback="${item.short}" onerror="brandIconError(this)">` +
        `</div>`;
    }
    return `<span class="brand-chip">${item.name}</span>`;
  }).join("");
}

function renderDividendInfo(el, div) {
  if (div && div.pays) {
    const details = [div.amount, div.frequency].filter(Boolean).join(" · ");
    el.innerHTML =
      `<span class="div-badge div-yes">Dividende ja</span>` +
      (details ? `<span class="div-amount">${details}</span>` : "");
  } else {
    el.innerHTML = `<span class="div-badge div-no">Dividende nein</span>`;
  }
}

function renderTrendStamp(el, trend) {
  if (!trend) { el.textContent = ""; el.className = "trend-stamp"; return; }
  el.textContent = `${trend.emoji} ${trend.label}`;
  el.className = `trend-stamp trend-${trend.color}`;
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderStock() {
  const s = stocks[index % stocks.length];

  // Card background photo + gradient fallback
  const cardBg = document.getElementById("cardBg");
  cardBg.style.background    = s.gradient;
  cardBg.style.backgroundImage = s.photo ? `url("${s.photo}")` : s.gradient;
  cardBg.style.backgroundSize   = "cover";
  cardBg.style.backgroundPosition = "center";

  document.getElementById("logo").textContent        = s.logoText;
  document.getElementById("companyName").textContent = s.name;
  document.getElementById("ticker").textContent      = s.ticker;
  document.getElementById("countryFlag").textContent = s.countryFlag || "";
  document.getElementById("sectorBadge").textContent = s.sector;
  document.getElementById("mcap").textContent        = formatCap(s.marketCap);
  document.getElementById("sheetTitle").textContent  = s.name;
  document.getElementById("description").textContent = s.description;
  document.getElementById("sector").textContent      = s.sector;
  document.getElementById("country").textContent     = s.country;

  renderBrandRow(document.getElementById("productList"),    s.products    || []);
  renderDividendInfo(document.getElementById("dividendInfo"), s.dividend  || { pays:false });
  renderBrandRow(document.getElementById("competitorList"), s.competitors || []);
  renderTrendStamp(document.getElementById("trendStamp"),   s.trend       || null);

  const setPerf = (id, val) => {
    const el = document.getElementById(id);
    el.textContent = formatPerf(val);
    el.style.color = typeof val === "number" ? perfColor(val) : "var(--muted)";
  };
  const perf = s.perf || {};
  setPerf("perfW", perf.w);
  setPerf("perfM", perf.m);
  setPerf("perfY", perf.y);

  card.style.transition = "none";
  card.style.transform  = "translate3d(0,0,0) rotateX(0deg) rotateY(0deg) rotateZ(0deg)";
  document.getElementById("stampLike").style.opacity  = 0;
  document.getElementById("stampNope").style.opacity  = 0;
  document.getElementById("stampSuper").style.opacity = 0;
  sheet.classList.remove("open");
  sheet.style.transform = "";
}

// ── Card Physics ──────────────────────────────────────────────────────────────
let dragging = false, startX = 0, startY = 0, startTime = 0;

card.addEventListener("pointerdown", (e) => {
  if (e.target.closest(".sheet")) return;
  dragging = true;
  card.setPointerCapture(e.pointerId);
  startX = e.clientX; startY = e.clientY;
  dx = 0; dy = 0;
  startTime = Date.now();
  card.style.transition = "none";
});

card.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  dx = e.clientX - startX;
  dy = e.clientY - startY;
  const tX = clamp(-dy / 15, -20, 20);
  const tY = clamp( dx / 15, -20, 20);
  const tZ = clamp( dx / 20, -10, 10);
  card.style.transform = `translate3d(${dx}px,${dy}px,0) rotateX(${tX}deg) rotateY(${tY}deg) rotateZ(${tZ}deg)`;
  document.getElementById("stampLike").style.opacity  = clamp( dx / 100, 0, 1);
  document.getElementById("stampNope").style.opacity  = clamp(-dx / 100, 0, 1);
  document.getElementById("stampSuper").style.opacity = clamp(-dy / 150, 0, 0.8);
});

card.addEventListener("pointerup", (e) => {
  if (!dragging) return;
  dragging = false;
  card.releasePointerCapture(e.pointerId);
  const vx = Math.abs(dx) / (Date.now() - startTime);

  if (dy < -80 && Math.abs(dy) > Math.abs(dx)) {
    sheet.classList.add("open");
    resetCard();
    return;
  }
  if (Math.abs(dx) > 100 || vx > 0.5) {
    const dir = dx > 0 ? "right" : "left";
    if (dir === "right") {
      saveToWatchlist();
      showToast("★ Zur Watchlist hinzugefügt");
    }
    throwCard(dir, vx);
  } else {
    resetCard();
  }
});

function resetCard() {
  card.style.transition = "transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
  card.style.transform  = "translate3d(0,0,0) rotateX(0deg) rotateY(0deg) rotateZ(0deg)";
  document.getElementById("stampLike").style.opacity  = 0;
  document.getElementById("stampNope").style.opacity  = 0;
  document.getElementById("stampSuper").style.opacity = 0;
}

function throwCard(dir, velocity) {
  const isRight   = dir === "right";
  const xOffset   = isRight ? window.innerWidth + 200 : -(window.innerWidth + 200);
  const rot       = isRight ? 30 : -30;
  const duration  = clamp(0.8 - velocity, 0.2, 0.6);
  card.style.transition = `transform ${duration}s ease-out`;
  card.style.transform  = `translate3d(${xOffset}px,${dy}px,0) rotateZ(${rot}deg)`;
  setTimeout(() => { index++; renderStock(); }, duration * 1000);
}

// ── Sheet Dragging ────────────────────────────────────────────────────────────
let sheetDragging = false, sheetStartY = 0;

document.getElementById("sheetHandle").addEventListener("pointerdown", (e) => {
  sheetDragging = true;
  sheetStartY = e.clientY;
  sheet.style.transition = "none";
  e.stopPropagation();
});

window.addEventListener("pointermove", (e) => {
  if (!sheetDragging) return;
  sheet.style.transform = `translateY(${Math.max(0, e.clientY - sheetStartY)}px)`;
});

window.addEventListener("pointerup", (e) => {
  if (!sheetDragging) return;
  sheetDragging = false;
  const delta = e.clientY - sheetStartY;
  sheet.style.transition = "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)";
  if (delta > 100) { sheet.classList.remove("open"); sheet.style.transform = ""; }
  else             { sheet.style.transform = "translateY(0)"; }
});

// ── Buttons ───────────────────────────────────────────────────────────────────
document.getElementById("btnLike").addEventListener("click", () => {
  saveToWatchlist();
  showToast("★ Zur Watchlist hinzugefügt");
  throwCard("right", 1);
});

document.getElementById("btnNope").addEventListener("click", () => {
  throwCard("left", 1);
});

document.getElementById("btnSuper").addEventListener("click", () => {
  saveToWatchlist(true);
  showToast("Superlike gespeichert ✨");
  document.getElementById("stampSuper").style.opacity = 1;
  setTimeout(() => {
    card.style.transition = "transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)";
    card.style.transform  = "translate3d(0,-130%,0) rotateZ(-3deg)";
    setTimeout(() => { index++; renderStock(); }, 500);
  }, 150);
});

document.getElementById("closeSheetBtn").addEventListener("click", () => {
  sheet.classList.remove("open");
});

// ── Watchlist ─────────────────────────────────────────────────────────────────
// Die Watchlist wird dauerhaft auf dem Gerät gespeichert (nur IDs + Superlike).
function persistWatchlist() {
  Store.set("watchlist", [...watchlist.values()].map(s => ({ id: s.id, superliked: s.superliked })));
}

function loadWatchlist() {
  Store.get("watchlist", []).forEach(({ id, superliked }) => {
    const s = stocks.find(x => x.id === id);
    if (s) watchlist.set(id, { ...s, superliked: !!superliked });
  });
  updateWatchlistBadge();
}

function saveToWatchlist(superliked = false) {
  const s = stocks[index % stocks.length];
  watchlist.set(s.id, { ...s, superliked });
  persistWatchlist();
  updateWatchlistBadge();
}

function updateWatchlistBadge() {
  const badge = document.getElementById("watchlistBadge");
  badge.style.display = watchlist.size > 0 ? "flex" : "none";
  badge.textContent   = watchlist.size;
}

function removeFromWatchlist(id) {
  watchlist.delete(id);
  persistWatchlist();
  updateWatchlistBadge();
  renderWatchlistItems();
}

function renderWatchlistItems() {
  const list = document.getElementById("watchlistList");
  if (watchlist.size === 0) {
    list.innerHTML = `<p class="empty-hint">Noch keine Aktien gespeichert.</p>`;
    return;
  }
  list.innerHTML = [...watchlist.values()].map(s => `
    <div class="wl-item">
      <div class="wl-logo">${s.logoText}</div>
      <div class="wl-info">
        <strong>${s.name}</strong>
        <small>${s.ticker} &middot; ${s.country}</small>
      </div>
      <div class="wl-right">
        <span class="wl-sector">${s.sector}</span>
        ${s.superliked ? `<span class="wl-super">★</span>` : ""}
      </div>
      <button class="wl-remove" onclick="removeFromWatchlist('${s.id}')" aria-label="${s.name} entfernen">×</button>
    </div>
  `).join("");
}

document.getElementById("watchlistBtn").addEventListener("click", () => {
  document.getElementById("watchlist").classList.toggle("open");
  renderWatchlistItems();
});
document.getElementById("watchlistClose").addEventListener("click", () => {
  document.getElementById("watchlist").classList.remove("open");
});

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TAB_CONFIG = {
  Swipe: { page:"pageSwipe", tab:"tabSwipe", subtitle:"Swipe dich durch Aktien" },
  Etf:   { page:"pageEtf",   tab:"tabEtf",   subtitle:"Baue deinen ETF"         },
  Dive:  { page:"pageDive",  tab:"tabDive",  subtitle:"Erkunde Lieferketten"     },
};

function switchTab(active) {
  Object.entries(TAB_CONFIG).forEach(([key, cfg]) => {
    document.getElementById(cfg.page).classList.toggle("active", key === active);
    document.getElementById(cfg.tab ).classList.toggle("active", key === active);
  });
  document.getElementById("pageSubtitle").textContent = TAB_CONFIG[active].subtitle;
  Tooltips.hide();
  document.dispatchEvent(new CustomEvent("tabchange", { detail: active }));
}

// Öffnet eine bestimmte Aktienkarte im Swipe-Tab (z. B. aus der Dive-Mindmap).
function openStockCard(stockId) {
  const i = stocks.findIndex(s => s.id === stockId);
  if (i < 0) return false;
  switchTab("Swipe");
  index = i;
  renderStock();
  card.classList.remove("card-pop");
  void card.offsetWidth; // Animation neu starten
  card.classList.add("card-pop");
  return true;
}

document.getElementById("tabSwipe").addEventListener("click", () => switchTab("Swipe"));
document.getElementById("tabEtf")  .addEventListener("click", () => switchTab("Etf"));
document.getElementById("tabDive") .addEventListener("click", () => switchTab("Dive"));

// ── ETF: Performance-Berechnung ───────────────────────────────────────────────

// Konsistenter Tageswert: seed aus Ticker + Datum, damit er pro Tag gleich bleibt
function simulateTodayPerf(stock) {
  const seed = stock.id + new Date().toDateString();
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h * 31 + seed.charCodeAt(i), 1) | 0;
  const norm = ((h >>> 0) / 0xffffffff) - 0.5; // -0.5 … +0.5
  return +((stock.perf.w / 5) + norm * 0.8).toFixed(2);
}

// Einmalig alle today-Werte befüllen
stocks.forEach(s => { if (s.perf) s.perf.d = simulateTodayPerf(s); });

function calcEtfPerf(holdings, period) {
  let result = 0;
  for (const h of holdings) {
    const stock = stocks.find(s => s.ticker === h.ticker);
    if (!stock) continue;
    result += (stock.perf?.[period] ?? 0) * h.weight / 100;
  }
  return +result.toFixed(2);
}

// ── ETF: Beispiel-ETFs ────────────────────────────────────────────────────────
const exampleEtfs = [
  { id:"ex1", name:"Tech Giants",       holdings:[{ticker:"AAPL",weight:30},{ticker:"MSFT",weight:30},{ticker:"NVDA",weight:40}], isExample:true },
  { id:"ex2", name:"EV & AI",           holdings:[{ticker:"TSLA",weight:40},{ticker:"NVDA",weight:60}],                           isExample:true },
  { id:"ex3", name:"Big Tech Balanced", holdings:[{ticker:"AAPL",weight:25},{ticker:"MSFT",weight:25},{ticker:"AMZN",weight:25},{ticker:"NVDA",weight:25}], isExample:true },
  { id:"ex4", name:"Diversified Core",  holdings:[{ticker:"SAP",weight:30},{ticker:"AAPL",weight:25},{ticker:"MSFT",weight:25},{ticker:"AMZN",weight:20}], isExample:true },
  { id:"ex5", name:"German Champion",   holdings:[{ticker:"SAP",weight:100}],                                                     isExample:true },
  { id:"ex6", name:"Volatility Play",   holdings:[{ticker:"TSLA",weight:50},{ticker:"NVDA",weight:50}],                           isExample:true },
  { id:"ex7", name:"Conservative Core", holdings:[{ticker:"MSFT",weight:50},{ticker:"SAP",weight:30},{ticker:"AAPL",weight:20}],  isExample:true },
  { id:"ex8", name:"Cloud Leaders",     holdings:[{ticker:"MSFT",weight:60},{ticker:"AMZN",weight:40}],                           isExample:true },
];
const userEtfs = Store.get("userEtfs", []);
let lbPeriod = "d";

// ── ETF: Builder ──────────────────────────────────────────────────────────────
let etfName     = "";
let etfHoldings = []; // [{ ticker, weight }]

document.getElementById("addAssetBtn").addEventListener("click", addHolding);
document.getElementById("assetInput").addEventListener("keydown",  e => { if (e.key === "Enter") addHolding(); });
document.getElementById("weightInput").addEventListener("keydown", e => { if (e.key === "Enter") addHolding(); });

function addHolding() {
  const tickerEl = document.getElementById("assetInput");
  const weightEl = document.getElementById("weightInput");
  const ticker   = tickerEl.value.trim().toUpperCase();
  const weight   = parseInt(weightEl.value, 10);

  if (!ticker)          { showToast("Bitte einen Ticker eingeben"); return; }
  if (!stocks.find(s => s.ticker === ticker)) { showToast(`${ticker} nicht in unserer Datenbank`); return; }
  if (isNaN(weight) || weight < 1 || weight > 100) { showToast("Gewichtung: 1–100 %"); return; }
  if (etfHoldings.find(h => h.ticker === ticker)) { showToast(`${ticker} bereits enthalten`); return; }

  etfHoldings.push({ ticker, weight });
  tickerEl.value = "";
  weightEl.value = "";
  tickerEl.focus();
  renderHoldings();
}

function removeHolding(ticker) {
  etfHoldings = etfHoldings.filter(h => h.ticker !== ticker);
  renderHoldings();
}

function renderHoldings() {
  const total = etfHoldings.reduce((s, h) => s + h.weight, 0);

  document.getElementById("assetTags").innerHTML = etfHoldings.map(h =>
    `<span class="asset-tag">
      <span class="asset-tag-ticker">${h.ticker}</span>
      <span class="asset-tag-weight">${h.weight}%</span>
      <button onclick="removeHolding('${h.ticker}')" aria-label="${h.ticker} entfernen">×</button>
    </span>`
  ).join("");

  const sumEl = document.getElementById("weightSum");
  if (etfHoldings.length === 0) { sumEl.innerHTML = ""; return; }

  const diff   = 100 - total;
  const cls    = total === 100 ? "ok" : total > 100 ? "over" : "under";
  const label  = total === 100
    ? "✓ Gewichtung vollständig (100 %)"
    : diff > 0
      ? `Gesamt: ${total} % — noch ${diff} % fehlen`
      : `Gesamt: ${total} % — ${-diff} % zu viel`;
  sumEl.innerHTML = `<span class="weight-sum-bar ${cls}">${label}</span>`;
}

document.getElementById("saveEtfBtn").addEventListener("click", () => {
  const name = document.getElementById("etfName").value.trim();
  if (!name)                  { showToast("Bitte einen ETF-Namen eingeben"); return; }
  if (etfHoldings.length < 1) { showToast("Mindestens eine Position hinzufügen"); return; }
  const total = etfHoldings.reduce((s, h) => s + h.weight, 0);
  if (total !== 100) {
    const diff = 100 - total;
    showToast(diff > 0 ? `Noch ${diff} % fehlen` : `${-diff} % zu viel`);
    return;
  }
  userEtfs.unshift({ id: `u${Date.now()}`, name, holdings: [...etfHoldings], isExample: false });
  Store.set("userEtfs", userEtfs);
  renderLeaderboard();
  document.getElementById("etfName").value = "";
  etfHoldings = [];
  renderHoldings();
  showToast(`"${name}" gespeichert!`);
});

document.getElementById("resetEtfBtn").addEventListener("click", () => {
  etfHoldings = [];
  document.getElementById("etfName").value = "";
  renderHoldings();
});

// ── ETF: Leaderboard ──────────────────────────────────────────────────────────
document.querySelectorAll(".lb-filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".lb-filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    lbPeriod = btn.dataset.period;
    renderLeaderboard();
  });
});

function renderLeaderboard() {
  const all = [...exampleEtfs, ...userEtfs];
  const periodLabel = { d:"Heute", w:"letzte Woche", m:"letzten Monat", y:"letztes Jahr" };

  const ranked = all
    .map(etf => ({ ...etf, perf: calcEtfPerf(etf.holdings, lbPeriod) }))
    .sort((a, b) => b.perf - a.perf)
    .slice(0, 10);

  const el = document.getElementById("leaderboard");
  el.innerHTML = ranked.map((etf, i) => {
    const tickers  = etf.holdings.map(h => h.ticker).join(" · ");
    const perfSign = etf.perf > 0 ? "+" : "";
    const perfCls  = etf.perf > 0 ? "perf-pos" : etf.perf < 0 ? "perf-neg" : "perf-neu";
    const badge    = etf.isExample ? `<span class="lb-example">Beispiel</span>` : `<span class="lb-you">Du</span>`;
    return `
      <div class="lb-item">
        <span class="lb-rank">#${i + 1}</span>
        <div class="lb-info">
          <strong>${etf.name}${badge}</strong>
          <small>${tickers}</small>
        </div>
        <span class="lb-perf ${perfCls}">${perfSign}${etf.perf.toFixed(2)} %</span>
      </div>`;
  }).join("");
}

// ── Init ──────────────────────────────────────────────────────────────────────
renderStock();
loadWatchlist();
renderLeaderboard();
