// Daten
const stocks = [
  { id:"aapl",  name:"Apple Inc.",  ticker:"AAPL", logoText:"AP",  price:172.43, marketCap:2680000000000, perf:{ w:1.2,  m:-2.7, y:18.4  }, sector:"Technologie",       country:"USA",         description:"Apple entwickelt Consumer-Elektronik, Betriebssysteme und digitale Services. Das Unternehmen ist bekannt für iPhone, Mac und das iOS-Ökosystem." },
  { id:"msft",  name:"Microsoft",   ticker:"MSFT", logoText:"MS",  price:412.18, marketCap:3050000000000, perf:{ w:-0.6, m:3.1,  y:28.9  }, sector:"Software",          country:"USA",         description:"Microsoft bietet Software, Cloud-Services und Produktivitätstools. Azure und Office 365 sind die zentralen Wachstumstreiber." },
  { id:"nvda",  name:"NVIDIA",      ticker:"NVDA", logoText:"NV",  price:875.40, marketCap:2160000000000, perf:{ w:4.1,  m:11.2, y:198.3 }, sector:"Halbleiter",        country:"USA",         description:"NVIDIA dominiert den Markt für KI-Grafikprozessoren. Der H100-Chip ist zum Standard für KI-Training und Inferenz geworden." },
  { id:"amzn",  name:"Amazon",      ticker:"AMZN", logoText:"AM",  price:184.70, marketCap:1920000000000, perf:{ w:1.8,  m:2.4,  y:42.1  }, sector:"E-Commerce/Cloud", country:"USA",         description:"Amazon betreibt die weltgrößte E-Commerce-Plattform und mit AWS den führenden Cloud-Dienst weltweit." },
  { id:"sap",   name:"SAP SE",      ticker:"SAP",  logoText:"SAP", price:185.92, marketCap:225000000000,  perf:{ w:0.9,  m:6.8,  y:31.5  }, sector:"Enterprise-SW",    country:"Deutschland", description:"SAP entwickelt Unternehmenssoftware für Geschäftsprozesse. Weltmarktführer im ERP-Segment mit starker Cloud-Transformation." },
  { id:"tsla",  name:"Tesla",       ticker:"TSLA", logoText:"T",   price:187.55, marketCap:596000000000,  perf:{ w:2.4,  m:-6.2, y:-12.1 }, sector:"Automotive",       country:"USA",         description:"Tesla entwickelt Elektrofahrzeuge und Batteriespeicher. Marktführer bei E-Mobilität mit wachsender Energiesparte." },
];

let index = 0;
let lastPrice = 0;
let dx = 0, dy = 0;
const watchlist = new Map();

const card    = document.getElementById("card");
const sheet   = document.getElementById("sheet");
const priceEl = document.getElementById("price");
const toast   = document.getElementById("toast");

const nfEUR  = new Intl.NumberFormat("de-DE", { style:"currency", currency:"EUR" });
const nfShort = new Intl.NumberFormat("de-DE", { notation:"compact", compactDisplay:"short" });

function formatCap(x)  { return nfShort.format(x); }
function formatPerf(p) { return `${p > 0 ? "+" : ""}${p.toFixed(1)}%`; }
function perfColor(p)  { return p > 0 ? "var(--like)" : p < 0 ? "var(--nope)" : "var(--muted)"; }
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 1800);
}

function animateValue(el, start, end, duration) {
  let t0 = null;
  const step = (ts) => {
    if (!t0) t0 = ts;
    const p = Math.min((ts - t0) / duration, 1);
    const e = 1 - Math.pow(1 - p, 3);
    el.innerHTML = nfEUR.format(e * (end - start) + start);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderStock() {
  const s = stocks[index % stocks.length];

  document.getElementById("logo").textContent        = s.logoText;
  document.getElementById("companyName").textContent = s.name;
  document.getElementById("ticker").textContent      = s.ticker;
  document.getElementById("mcap").textContent        = formatCap(s.marketCap);
  document.getElementById("sheetTitle").textContent  = s.name;
  document.getElementById("description").textContent = s.description;
  document.getElementById("sector").textContent      = s.sector;
  document.getElementById("country").textContent     = s.country;

  animateValue(priceEl, lastPrice, s.price, 800);
  lastPrice = s.price;

  const setPerf = (id, val) => {
    const el = document.getElementById(id);
    el.textContent = formatPerf(val);
    el.style.color = perfColor(val);
  };
  setPerf("perfW", s.perf.w);
  setPerf("perfM", s.perf.m);
  setPerf("perfY", s.perf.y);

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
function saveToWatchlist(superliked = false) {
  const s = stocks[index % stocks.length];
  watchlist.set(s.id, { ...s, superliked });
  updateWatchlistBadge();
}

function updateWatchlistBadge() {
  const badge = document.getElementById("watchlistBadge");
  badge.style.display = watchlist.size > 0 ? "flex" : "none";
  badge.textContent   = watchlist.size;
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
        <span class="wl-price">${nfEUR.format(s.price)}</span>
        ${s.superliked ? `<span class="wl-super">★</span>` : ""}
      </div>
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
document.getElementById("tabSwipe").addEventListener("click", () => {
  document.getElementById("pageSwipe").classList.add("active");
  document.getElementById("pageEtf").classList.remove("active");
  document.getElementById("tabSwipe").classList.add("active");
  document.getElementById("tabEtf").classList.remove("active");
  document.getElementById("pageSubtitle").textContent = "Swipe dich durch Aktien";
});
document.getElementById("tabEtf").addEventListener("click", () => {
  document.getElementById("pageSwipe").classList.remove("active");
  document.getElementById("pageEtf").classList.add("active");
  document.getElementById("tabSwipe").classList.remove("active");
  document.getElementById("tabEtf").classList.add("active");
  document.getElementById("pageSubtitle").textContent = "Baue dein Portfolio";
});

// ── ETF Builder ───────────────────────────────────────────────────────────────
let etfName    = "";
let etfAssets  = [];
const savedEtfs = [];

document.getElementById("createEtfBtn").addEventListener("click", () => {
  const name = document.getElementById("etfName").value.trim();
  if (!name) { showToast("Bitte einen Namen eingeben"); return; }
  etfName = name;
  showToast(`Portfolio "${name}" bereit`);
});

document.getElementById("addAssetBtn").addEventListener("click", addAsset);
document.getElementById("assetInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") addAsset();
});

function addAsset() {
  const input  = document.getElementById("assetInput");
  const ticker = input.value.trim().toUpperCase();
  if (!ticker) return;
  if (etfAssets.includes(ticker)) { showToast(`${ticker} bereits hinzugefügt`); return; }
  etfAssets.push(ticker);
  input.value = "";
  renderAssetTags();
}

function removeAsset(ticker) {
  etfAssets = etfAssets.filter(a => a !== ticker);
  renderAssetTags();
}

function renderAssetTags() {
  document.getElementById("assetTags").innerHTML = etfAssets.map(a =>
    `<span class="asset-tag">${a}<button onclick="removeAsset('${a}')" aria-label="${a} entfernen">×</button></span>`
  ).join("");
}

document.getElementById("saveEtfBtn").addEventListener("click", () => {
  if (!etfName)             { showToast("Zuerst einen Namen erstellen"); return; }
  if (etfAssets.length < 1) { showToast("Mindestens ein Asset hinzufügen"); return; }
  savedEtfs.unshift({ name: etfName, assets: [...etfAssets], likes: 0 });
  renderLeaderboard();
  const saved = etfName;
  etfName = ""; etfAssets = [];
  document.getElementById("etfName").value = "";
  document.getElementById("assetTags").innerHTML = "";
  showToast(`"${saved}" gespeichert!`);
});

document.getElementById("resetEtfBtn").addEventListener("click", () => {
  etfName = ""; etfAssets = [];
  document.getElementById("etfName").value = "";
  document.getElementById("assetTags").innerHTML = "";
});

function renderLeaderboard() {
  const el = document.getElementById("leaderboard");
  if (savedEtfs.length === 0) {
    el.innerHTML = `<p class="empty-hint">Speichere deinen ersten Mix!</p>`;
    return;
  }
  const sorted = [...savedEtfs].sort((a, b) => b.likes - a.likes);
  el.innerHTML = sorted.map((etf, i) => `
    <div class="lb-item">
      <span class="lb-rank">#${i + 1}</span>
      <div class="lb-info">
        <strong>${etf.name}</strong>
        <small>${etf.assets.join(" · ")}</small>
      </div>
      <button class="lb-like" onclick="likeEtf('${etf.name.replace(/'/g, "\\'")}')">♥ ${etf.likes}</button>
    </div>
  `).join("");
}

function likeEtf(name) {
  const etf = savedEtfs.find(e => e.name === name);
  if (etf) { etf.likes++; renderLeaderboard(); }
}

// ── Init ──────────────────────────────────────────────────────────────────────
renderStock();
renderLeaderboard();
