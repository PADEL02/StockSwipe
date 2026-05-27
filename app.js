﻿// Daten (Beispielhaft)
const stocks = [
  { id:"aapl", name:"Apple Inc.", ticker:"AAPL", logoText:"", price:172.43, marketCap:2680000000000, perf:{ w:1.2, m:-2.7, y:18.4 }, sector:"Technologie", country:"USA", description:"Apple entwickelt Consumer-Elektronik, Betriebssysteme und digitale Services." },
  { id:"msft", name:"Microsoft", ticker:"MSFT", logoText:"MS", price:412.18, marketCap:3050000000000, perf:{ w:-0.6, m:3.1, y:28.9 }, sector:"Software", country:"USA", description:"Microsoft bietet Software, Cloud-Services und Produktivitätstools." },
  { id:"sap", name:"SAP SE", ticker:"SAP", logoText:"SAP", price:185.92, marketCap:225000000000, perf:{ w:0.9, m:6.8, y:31.5 }, sector:"Enterprise-Software", country:"Deutschland", description:"SAP entwickelt Unternehmenssoftware für Geschäftsprozesse." },
  { id:"tsla", name:"Tesla", ticker:"TSLA", logoText:"T", price:187.55, marketCap:596000000000, perf:{ w:2.4, m:-6.2, y:-12.1 }, sector:"Automotive", country:"USA", description:"Tesla entwickelt Elektrofahrzeuge und Batteriespeicher." }
];

let index = 0;
let lastPrice = 0; // Für das Odometer (Hochzählen)
const watchlist = new Map();

// Elemente
const card = document.getElementById("card");
const sheet = document.getElementById("sheet");
const sheetHandle = document.getElementById("sheetHandle");
const priceEl = document.getElementById("price");
const toast = document.getElementById("toast");

// Formatierungen
const nfEUR = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const nfShort = new Intl.NumberFormat("de-DE", { notation: "compact", compactDisplay: "short" });
function formatCap(x) { return nfShort.format(x); }
function formatPerf(p) { const sign = p > 0 ? "+" : ""; return `${sign}${p.toFixed(1)}%`; }

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 1500);
}

// Odometer Funktion (Zähler)
function animateValue(obj, start, end, duration) {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    // Smooth ease out
    const easeProgress = 1 - Math.pow(1 - progress, 3); 
    const current = easeProgress * (end - start) + start;
    obj.innerHTML = nfEUR.format(current);
    if (progress < 1) window.requestAnimationFrame(step);
  };
  window.requestAnimationFrame(step);
}

function renderStock() {
  const s = stocks[index % stocks.length];
  document.getElementById("logo").textContent = s.logoText;
  document.getElementById("companyName").textContent = s.name;
  document.getElementById("ticker").textContent = s.ticker;
  
  // Animate Price
  animateValue(priceEl, lastPrice, s.price, 800);
  lastPrice = s.price;
  
  document.getElementById("mcap").textContent = formatCap(s.marketCap);
  document.getElementById("perfW").textContent = formatPerf(s.perf.w);
  document.getElementById("perfM").textContent = formatPerf(s.perf.m);
  document.getElementById("perfY").textContent = formatPerf(s.perf.y);
  
  document.getElementById("sheetTitle").textContent = s.name;
  document.getElementById("description").textContent = s.description;
  document.getElementById("sector").textContent = s.sector;
  document.getElementById("country").textContent = s.country;

  // Reset Karte
  card.style.transition = "none";
  card.style.transform = "translate3d(0px, 0px, 0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)";
  document.getElementById("stampLike").style.opacity = 0;
  document.getElementById("stampNope").style.opacity = 0;
  document.getElementById("stampSuper").style.opacity = 0;
  sheet.classList.remove("open");
  sheet.style.transform = ""; // Reset inline styles from drag
}

// --- Karten-Physik & 3D Effekt ---
let dragging = false;
let startX = 0, startY = 0;
let dx = 0, dy = 0;
let startTime = 0;

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

card.addEventListener("pointerdown", (e) => {
  if (e.target.closest('.sheet')) return; // Sheet ignoriert
  dragging = true;
  card.setPointerCapture(e.pointerId);
  startX = e.clientX; startY = e.clientY;
  dx = 0; dy = 0;
  startTime = Date.now();
  card.style.transition = "none"; // Sofort dem Finger folgen
});

card.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  dx = e.clientX - startX;
  dy = e.clientY - startY;

  // 3D Tilt Effekt (wie eine echte Karte in der Hand)
  const tiltX = clamp(-dy / 15, -20, 20); // Kippt nach oben/unten
  const tiltY = clamp(dx / 15, -20, 20); // Kippt nach links/rechts
  const tiltZ = clamp(dx / 20, -10, 10); // Rotiert leicht

  card.style.transform = `translate3d(${dx}px, ${dy}px, 0px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) rotateZ(${tiltZ}deg)`;

  document.getElementById("stampLike").style.opacity = clamp(dx / 100, 0, 1);
  document.getElementById("stampNope").style.opacity = clamp(-dx / 100, 0, 1);
  document.getElementById("stampSuper").style.opacity = clamp(-dy / 150, 0, 0.8);
});

card.addEventListener("pointerup", (e) => {
  if (!dragging) return;
  dragging = false;
  card.releasePointerCapture(e.pointerId);

  const timeElapsed = Date.now() - startTime;
  const velocityX = Math.abs(dx) / timeElapsed; // Wurf-Geschwindigkeit

  const swipeXThreshold = 100;
  const swipeUpThreshold = 80;

  // Sheet per Swipe-Up öffnen
  if (dy < -swipeUpThreshold && Math.abs(dy) > Math.abs(dx)) {
    sheet.classList.add("open");
    resetCardPosition();
    return;
  }

  // Like oder Nope
  if (Math.abs(dx) > swipeXThreshold || velocityX > 0.5) {
    const dir = dx > 0 ? "right" : "left";
    throwCard(dir, velocityX);
  } else {
    // Trägheits-Feder-Effekt zurück zur Mitte
    resetCardPosition();
  }
});

function resetCardPosition() {
  card.style.transition = "transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)"; // Federnder Bounce
  card.style.transform = "translate3d(0px, 0px, 0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)";
  document.getElementById("stampLike").style.opacity = 0;
  document.getElementById("stampNope").style.opacity = 0;
  document.getElementById("stampSuper").style.opacity = 0;
}

function throwCard(dir, velocity) {
  const isRight = dir === "right";
  const xOffset = isRight ? window.innerWidth + 100 : -(window.innerWidth + 100);
  const rot = isRight ? 30 : -30;
  
  // Fluggeschwindigkeit an Swipe anpassen (mindestens 0.2s, maximal 0.6s)
  const duration = clamp(0.8 - velocity, 0.2, 0.6);

  card.style.transition = `transform ${duration}s ease-out`;
  card.style.transform = `translate3d(${xOffset}px, ${dy}px, 0px) rotateZ(${rot}deg) rotateY(${rot/2}deg)`;

  if(isRight) {
    const s = stocks[index % stocks.length];
    watchlist.set(s.id, s);
    showToast("Zur Watchlist hinzugefügt");
    updateWatchlistUI();
  }

  setTimeout(() => {
    index++;
    renderStock();
  }, duration * 1000);
}

// --- Sheet Smooth Dragging ---
let sheetDragging = false;
let sheetStartY = 0;
let sheetCurrentY = 0;

sheetHandle.addEventListener("pointerdown", (e) => {
  sheetDragging = true;
  sheetStartY = e.clientY;
  sheet.style.transition = "none";
});

window.addEventListener("pointermove", (e) => {
  if (!sheetDragging) return;
  const deltaY = Math.max(0, e.clientY - sheetStartY); // Nur nach unten ziehen erlauben
  sheet.style.transform = `translateY(${deltaY}px)`;
});

window.addEventListener("pointerup", (e) => {
  if (!sheetDragging) return;
  sheetDragging = false;
  const deltaY = e.clientY - sheetStartY;
  
  sheet.style.transition = "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)";
  if (deltaY > 100) { // Weit genug gezogen -> schließen
    sheet.classList.remove("open");
    sheet.style.transform = "";
  } else { // Zurückschnappen
    sheet.style.transform = "translateY(0%)";
  }
});

// Button Controls
document.getElementById("btnLike").addEventListener("click", () => throwCard("right", 1));
document.getElementById("btnNope").addEventListener("click", () => throwCard("left", 1));
document.getElementById("btnSuper").addEventListener("click", () => {
  document.getElementById("stampSuper").style.opacity = 1;
  showToast("Superlike ✨");
  setTimeout(() => document.getElementById("stampSuper").style.opacity = 0, 800);
});
document.getElementById("closeSheetBtn").addEventListener("click", () => sheet.classList.remove("open"));

// Watchlist UI (Stark vereinfacht für den Codeblock)
function updateWatchlistUI() {
  document.getElementById("watchlistBadge").style.display = watchlist.size > 0 ? "flex" : "none";
  document.getElementById("watchlistBadge").textContent = watchlist.size;
}

document.getElementById("watchlistBtn").addEventListener("click", () => document.getElementById("watchlist").classList.toggle("open"));
document.getElementById("watchlistClose").addEventListener("click", () => document.getElementById("watchlist").classList.remove("open"));

// Tabs (Navigation)
document.getElementById("tabSwipe").addEventListener("click", () => {
  document.getElementById("pageSwipe").classList.add("active");
  document.getElementById("pageEtf").classList.remove("active");
  document.getElementById("tabSwipe").classList.add("active");
  document.getElementById("tabEtf").classList.remove("active");
});
document.getElementById("tabEtf").addEventListener("click", () => {
  document.getElementById("pageSwipe").classList.remove("active");
  document.getElementById("pageEtf").classList.add("active");
  document.getElementById("tabSwipe").classList.remove("active");
  document.getElementById("tabEtf").classList.add("active");
});

// Initial load
renderStock();