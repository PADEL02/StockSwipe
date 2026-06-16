// Daten
const stocks = [
  {
    id:"aapl", name:"Apple Inc.", ticker:"AAPL", logoText:"AP", countryFlag:"🇺🇸",
    price:172.43, marketCap:2680000000000, perf:{ w:1.2, m:-2.7, y:18.4 },
    sector:"Technologie", country:"USA",
    description:"Apple entwickelt Consumer-Elektronik, Betriebssysteme und digitale Services. Das Unternehmen ist bekannt für iPhone, Mac und das iOS-Ökosystem.",
    products:[
      { name:"iPhone",    short:"iP", icon:"ios"      },
      { name:"Mac",       short:"MC", icon:"macos"    },
      { name:"App Store", short:"AS", icon:"appstore"  },
      { name:"iCloud",    short:"iC", icon:"icloud"   },
    ],
    dividend:{ pays:true, amount:"0,24 $", frequency:"quartalsw." },
    competitors:[
      { name:"Samsung",   short:"SA", icon:"samsung" },
      { name:"Google",    short:"GO", icon:"google"  },
      { name:"Microsoft", short:"MS", icon:null       },
    ],
    photo:"https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&h=900&q=80",
    gradient:"linear-gradient(160deg,#1d1d1f 0%,#2d2d30 100%)",
    trend:{ emoji:"📱", label:"Consumer Leader", color:"up" },
  },
  {
    id:"msft", name:"Microsoft", ticker:"MSFT", logoText:"MS", countryFlag:"🇺🇸",
    price:412.18, marketCap:3050000000000, perf:{ w:-0.6, m:3.1, y:28.9 },
    sector:"Software", country:"USA",
    description:"Microsoft bietet Software, Cloud-Services und Produktivitätstools. Azure und Office 365 sind die zentralen Wachstumstreiber.",
    products:[
      { name:"Windows", short:"WI", icon:null },
      { name:"Azure",   short:"AZ", icon:null },
      { name:"Office",  short:"OF", icon:null },
      { name:"Teams",   short:"TE", icon:null },
      { name:"Xbox",    short:"XB", icon:null },
      { name:"GitHub",  short:"GH", icon:"github" },
    ],
    dividend:{ pays:true, amount:"0,75 $", frequency:"quartalsw." },
    competitors:[
      { name:"Google", short:"GO", icon:"google" },
      { name:"Apple",  short:"AP", icon:"apple"  },
      { name:"Amazon", short:"AM", icon:null      },
    ],
    photo:"https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&h=900&q=80",
    gradient:"linear-gradient(160deg,#001f3d 0%,#0078d4 100%)",
    trend:{ emoji:"🤖", label:"KI-Pionier", color:"hot" },
  },
  {
    id:"nvda", name:"NVIDIA", ticker:"NVDA", logoText:"NV", countryFlag:"🇺🇸",
    price:875.40, marketCap:2160000000000, perf:{ w:4.1, m:11.2, y:198.3 },
    sector:"Halbleiter", country:"USA",
    description:"NVIDIA dominiert den Markt für KI-Grafikprozessoren. Der H100-Chip ist zum Standard für KI-Training und Inferenz geworden.",
    products:[
      { name:"GeForce RTX", short:"GF", icon:null },
      { name:"CUDA",        short:"CU", icon:null },
      { name:"H100",        short:"H1", icon:null },
      { name:"Omniverse",   short:"OV", icon:null },
    ],
    dividend:{ pays:true, amount:"0,01 $", frequency:"quartalsw." },
    competitors:[
      { name:"AMD",      short:"AM", icon:"amd"      },
      { name:"Intel",    short:"IN", icon:"intel"    },
      { name:"Qualcomm", short:"QC", icon:"qualcomm" },
    ],
    photo:"https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=600&h=900&q=80",
    gradient:"linear-gradient(160deg,#1a2a00 0%,#76b900 100%)",
    trend:{ emoji:"🚀", label:"KI-Boom", color:"hot" },
  },
  {
    id:"amzn", name:"Amazon", ticker:"AMZN", logoText:"AM", countryFlag:"🇺🇸",
    price:184.70, marketCap:1920000000000, perf:{ w:1.8, m:2.4, y:42.1 },
    sector:"E-Commerce/Cloud", country:"USA",
    description:"Amazon betreibt die weltgrößte E-Commerce-Plattform und mit AWS den führenden Cloud-Dienst weltweit.",
    products:[
      { name:"AWS",    short:"AW", icon:null    },
      { name:"Prime",  short:"PR", icon:null    },
      { name:"Alexa",  short:"AL", icon:null    },
      { name:"Twitch", short:"TW", icon:"twitch" },
    ],
    dividend:{ pays:false },
    competitors:[
      { name:"Microsoft", short:"MS", icon:null       },
      { name:"Google",    short:"GO", icon:"google"   },
      { name:"Walmart",   short:"WM", icon:null        },
    ],
    photo:"https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=600&h=900&q=80",
    gradient:"linear-gradient(160deg,#1a0d00 0%,#ff9900 100%)",
    trend:{ emoji:"☁️", label:"Cloud Giant", color:"up" },
  },
  {
    id:"sap", name:"SAP SE", ticker:"SAP", logoText:"SAP", countryFlag:"🇩🇪",
    price:185.92, marketCap:225000000000, perf:{ w:0.9, m:6.8, y:31.5 },
    sector:"Enterprise-SW", country:"Deutschland",
    description:"SAP entwickelt Unternehmenssoftware für Geschäftsprozesse. Weltmarktführer im ERP-Segment mit starker Cloud-Transformation.",
    products:[
      { name:"S/4HANA", short:"S4", icon:null },
      { name:"ERP",     short:"ER", icon:null },
      { name:"BTP",     short:"BT", icon:null },
      { name:"Ariba",   short:"AR", icon:null },
    ],
    dividend:{ pays:true, amount:"1,50 €", frequency:"jährlich" },
    competitors:[
      { name:"Oracle",     short:"OR", icon:null },
      { name:"Salesforce", short:"SF", icon:null },
      { name:"Microsoft",  short:"MS", icon:null },
    ],
    photo:"https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=600&h=900&q=80",
    gradient:"linear-gradient(160deg,#001a40 0%,#0070f2 100%)",
    trend:{ emoji:"🏭", label:"Enterprise ERP", color:"neutral" },
  },
  {
    id:"tsla", name:"Tesla", ticker:"TSLA", logoText:"T", countryFlag:"🇺🇸",
    price:187.55, marketCap:596000000000, perf:{ w:2.4, m:-6.2, y:-12.1 },
    sector:"Automotive", country:"USA",
    description:"Tesla entwickelt Elektrofahrzeuge und Batteriespeicher. Marktführer bei E-Mobilität mit wachsender Energiesparte.",
    products:[
      { name:"Model 3",    short:"M3", icon:null },
      { name:"Model S",    short:"MS", icon:null },
      { name:"Powerwall",  short:"PW", icon:null },
      { name:"Solar Roof", short:"SR", icon:null },
    ],
    dividend:{ pays:false },
    competitors:[
      { name:"BYD",      short:"BY", icon:null   },
      { name:"Rivian",   short:"RI", icon:null   },
      { name:"Mercedes", short:"MB", icon:null   },
    ],
    photo:"https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=600&h=900&q=80",
    gradient:"linear-gradient(160deg,#1a0000 0%,#cc0000 100%)",
    trend:{ emoji:"⚡", label:"E-Mobilität", color:"up" },
  },
];

// ── Dive Data ─────────────────────────────────────────────────────────────────
const diveData = {
  nvidia: {
    name:"NVIDIA", flag:"🇺🇸", icon:"nvidia", logoText:"NV",
    categories:[
      { name:"Chip-Fertigung", emoji:"🏭", companies:[
        { name:"TSMC",     flag:"🇹🇼", icon:"tsmc",    logoText:"TS" },
        { name:"Samsung",  flag:"🇰🇷", icon:"samsung", logoText:"SA" },
        { name:"SK Hynix", flag:"🇰🇷", icon:null,      logoText:"SK" },
      ]},
      { name:"Software / KI", emoji:"🤖", companies:[
        { name:"OpenAI", flag:"🇺🇸", icon:"openai", logoText:"OA" },
        { name:"Meta",   flag:"🇺🇸", icon:"meta",   logoText:"ME" },
        { name:"Google", flag:"🇺🇸", icon:"google", logoText:"GO" },
      ]},
      { name:"Hardware-Partner", emoji:"🖥️", companies:[
        { name:"Dell", flag:"🇺🇸", icon:null,   logoText:"DE" },
        { name:"HP",   flag:"🇺🇸", icon:null,   logoText:"HP" },
        { name:"ASUS", flag:"🇹🇼", icon:"asus", logoText:"AS" },
      ]},
    ],
  },
  apple: {
    name:"Apple", flag:"🇺🇸", icon:"apple", logoText:"AP",
    categories:[
      { name:"Fertigung", emoji:"🏭", companies:[
        { name:"TSMC",    flag:"🇹🇼", icon:"tsmc",    logoText:"TS" },
        { name:"Foxconn", flag:"🇹🇼", icon:null,      logoText:"FX" },
        { name:"Samsung", flag:"🇰🇷", icon:"samsung", logoText:"SA" },
      ]},
      { name:"Netzbetreiber", emoji:"📡", companies:[
        { name:"AT&T",    flag:"🇺🇸", icon:null, logoText:"AT" },
        { name:"Verizon", flag:"🇺🇸", icon:null, logoText:"VZ" },
        { name:"Telekom", flag:"🇩🇪", icon:null, logoText:"TK" },
      ]},
      { name:"Software-Ökosystem", emoji:"📱", companies:[
        { name:"Adobe",   flag:"🇺🇸", icon:"adobe",   logoText:"AD" },
        { name:"Spotify", flag:"🇸🇪", icon:"spotify", logoText:"SP" },
        { name:"Google",  flag:"🇺🇸", icon:"google",  logoText:"GO" },
      ]},
    ],
  },
  microsoft: {
    name:"Microsoft", flag:"🇺🇸", icon:null, logoText:"MS",
    categories:[
      { name:"KI-Partner", emoji:"🤖", companies:[
        { name:"OpenAI", flag:"🇺🇸", icon:"openai", logoText:"OA" },
        { name:"GitHub", flag:"🇺🇸", icon:"github", logoText:"GH" },
        { name:"Nuance", flag:"🇺🇸", icon:null,     logoText:"NU" },
      ]},
      { name:"Cloud-Kunden", emoji:"☁️", companies:[
        { name:"SAP",        flag:"🇩🇪", icon:"sap",   logoText:"SAP" },
        { name:"Salesforce", flag:"🇺🇸", icon:null,    logoText:"SF"  },
        { name:"Adobe",      flag:"🇺🇸", icon:"adobe", logoText:"AD"  },
      ]},
      { name:"Hardware-OEMs", emoji:"💻", companies:[
        { name:"Dell",   flag:"🇺🇸", icon:null, logoText:"DE" },
        { name:"HP",     flag:"🇺🇸", icon:null, logoText:"HP" },
        { name:"Lenovo", flag:"🇨🇳", icon:null, logoText:"LN" },
      ]},
    ],
  },
  tesla: {
    name:"Tesla", flag:"🇺🇸", icon:"tesla", logoText:"T",
    categories:[
      { name:"Batterien", emoji:"🔋", companies:[
        { name:"Panasonic", flag:"🇯🇵", icon:null, logoText:"PA" },
        { name:"CATL",      flag:"🇨🇳", icon:null, logoText:"CA" },
        { name:"LG Energy", flag:"🇰🇷", icon:"lg", logoText:"LG" },
      ]},
      { name:"Rohstoffe", emoji:"⛏️", companies:[
        { name:"Albemarle", flag:"🇺🇸", icon:null, logoText:"AL" },
        { name:"Ganfeng",   flag:"🇨🇳", icon:null, logoText:"GF" },
        { name:"Glencore",  flag:"🇨🇭", icon:null, logoText:"GL" },
      ]},
      { name:"Chips & Software", emoji:"💾", companies:[
        { name:"Samsung",  flag:"🇰🇷", icon:"samsung", logoText:"SA" },
        { name:"TSMC",     flag:"🇹🇼", icon:"tsmc",    logoText:"TS" },
        { name:"Mobileye", flag:"🇮🇱", icon:null,      logoText:"MB" },
      ]},
    ],
  },
  amazon: {
    name:"Amazon", flag:"🇺🇸", icon:null, logoText:"AM",
    categories:[
      { name:"Logistik", emoji:"📦", companies:[
        { name:"UPS",   flag:"🇺🇸", icon:null, logoText:"UP" },
        { name:"FedEx", flag:"🇺🇸", icon:null, logoText:"FX" },
        { name:"DHL",   flag:"🇩🇪", icon:null, logoText:"DH" },
      ]},
      { name:"AWS-Hardware", emoji:"🖥️", companies:[
        { name:"Intel",  flag:"🇺🇸", icon:"intel",  logoText:"IN" },
        { name:"AMD",    flag:"🇺🇸", icon:"amd",    logoText:"AM" },
        { name:"NVIDIA", flag:"🇺🇸", icon:"nvidia", logoText:"NV" },
      ]},
      { name:"Marken-Partner", emoji:"🛍️", companies:[
        { name:"P&G",      flag:"🇺🇸", icon:null, logoText:"PG" },
        { name:"Unilever", flag:"🇬🇧", icon:null, logoText:"UN" },
        { name:"L'Oréal",  flag:"🇫🇷", icon:null, logoText:"LO" },
      ]},
    ],
  },
  tsmc: {
    name:"TSMC", flag:"🇹🇼", icon:"tsmc", logoText:"TS",
    categories:[
      { name:"Maschinen", emoji:"⚙️", companies:[
        { name:"ASML",              flag:"🇳🇱", icon:"asml", logoText:"AS" },
        { name:"Applied Materials", flag:"🇺🇸", icon:null,   logoText:"AP" },
        { name:"Tokyo Electron",    flag:"🇯🇵", icon:null,   logoText:"TE" },
      ]},
      { name:"Chemikalien", emoji:"🧪", companies:[
        { name:"Air Products", flag:"🇺🇸", icon:null, logoText:"AI" },
        { name:"Shin-Etsu",    flag:"🇯🇵", icon:null, logoText:"SE" },
        { name:"Merck KGaA",   flag:"🇩🇪", icon:null, logoText:"MK" },
      ]},
      { name:"Kunden", emoji:"🤝", companies:[
        { name:"Apple",  flag:"🇺🇸", icon:"apple",  logoText:"AP" },
        { name:"NVIDIA", flag:"🇺🇸", icon:"nvidia", logoText:"NV" },
        { name:"AMD",    flag:"🇺🇸", icon:"amd",    logoText:"AM" },
      ]},
    ],
  },
  sap: {
    name:"SAP SE", flag:"🇩🇪", icon:"sap", logoText:"SAP",
    categories:[
      { name:"Implementierungspartner", emoji:"🤝", companies:[
        { name:"Accenture", flag:"🇮🇪", icon:null,   logoText:"AC" },
        { name:"Deloitte",  flag:"🇺🇸", icon:null,   logoText:"DE" },
        { name:"IBM",       flag:"🇺🇸", icon:"ibm",  logoText:"IB" },
      ]},
      { name:"Cloud-Infra", emoji:"☁️", companies:[
        { name:"Azure",        flag:"🇺🇸", icon:null,     logoText:"AZ" },
        { name:"AWS",          flag:"🇺🇸", icon:null,     logoText:"AW" },
        { name:"Google Cloud", flag:"🇺🇸", icon:"google", logoText:"GC" },
      ]},
      { name:"Wettbewerber", emoji:"⚔️", companies:[
        { name:"Oracle",      flag:"🇺🇸", icon:null, logoText:"OR" },
        { name:"Salesforce",  flag:"🇺🇸", icon:null, logoText:"SF" },
        { name:"ServiceNow",  flag:"🇺🇸", icon:null, logoText:"SN" },
      ]},
    ],
  },
  rheinmetall: {
    name:"Rheinmetall", flag:"🇩🇪", icon:null, logoText:"RM",
    categories:[
      { name:"Rüstungs-Zulieferer", emoji:"🛡️", companies:[
        { name:"Hensoldt",      flag:"🇩🇪", icon:null, logoText:"HS" },
        { name:"Diehl Defence", flag:"🇩🇪", icon:null, logoText:"DD" },
        { name:"MBDA",          flag:"🇫🇷", icon:null, logoText:"MB" },
      ]},
      { name:"Rohstoffe / Material", emoji:"⚒️", companies:[
        { name:"ThyssenKrupp", flag:"🇩🇪", icon:null, logoText:"TK" },
        { name:"SSAB",         flag:"🇸🇪", icon:null, logoText:"SS" },
        { name:"Voestalpine",  flag:"🇦🇹", icon:null, logoText:"VA" },
      ]},
      { name:"Software / Elektronik", emoji:"💻", companies:[
        { name:"Elbit Systems", flag:"🇮🇱", icon:null, logoText:"EL" },
        { name:"Leonardo",      flag:"🇮🇹", icon:null, logoText:"LE" },
        { name:"Thales",        flag:"🇫🇷", icon:null, logoText:"TH" },
      ]},
    ],
  },
  volkswagen: {
    name:"Volkswagen", flag:"🇩🇪", icon:"volkswagen", logoText:"VW",
    categories:[
      { name:"Batterien", emoji:"🔋", companies:[
        { name:"Northvolt",   flag:"🇸🇪", icon:null,      logoText:"NV" },
        { name:"CATL",        flag:"🇨🇳", icon:null,      logoText:"CA" },
        { name:"Samsung SDI", flag:"🇰🇷", icon:"samsung", logoText:"SD" },
      ]},
      { name:"Software / Cariad", emoji:"💻", companies:[
        { name:"Google",   flag:"🇺🇸", icon:"google",   logoText:"GO" },
        { name:"Bosch",    flag:"🇩🇪", icon:"bosch",    logoText:"BO" },
        { name:"Qualcomm", flag:"🇺🇸", icon:"qualcomm", logoText:"QC" },
      ]},
      { name:"Komponenten", emoji:"⚙️", companies:[
        { name:"Schaeffler",  flag:"🇩🇪", icon:null, logoText:"SC" },
        { name:"ZF",          flag:"🇩🇪", icon:null, logoText:"ZF" },
        { name:"Continental", flag:"🇩🇪", icon:null, logoText:"CO" },
      ]},
    ],
  },
  siemens: {
    name:"Siemens", flag:"🇩🇪", icon:"siemens", logoText:"SI",
    categories:[
      { name:"Energie", emoji:"⚡", companies:[
        { name:"Siemens Energy", flag:"🇩🇪", icon:null, logoText:"SE" },
        { name:"Vestas",         flag:"🇩🇰", icon:null, logoText:"VE" },
        { name:"GE Vernova",     flag:"🇺🇸", icon:null, logoText:"GV" },
      ]},
      { name:"Automatisierung", emoji:"🦾", companies:[
        { name:"ABB",      flag:"🇨🇭", icon:"abb",  logoText:"AB" },
        { name:"Rockwell", flag:"🇺🇸", icon:null,   logoText:"RK" },
        { name:"Fanuc",    flag:"🇯🇵", icon:null,   logoText:"FA" },
      ]},
      { name:"Industrie-Software", emoji:"💾", companies:[
        { name:"PTC",               flag:"🇺🇸", icon:null, logoText:"PT" },
        { name:"Dassault Systèmes", flag:"🇫🇷", icon:null, logoText:"DS" },
        { name:"Ansys",             flag:"🇺🇸", icon:null, logoText:"AN" },
      ]},
    ],
  },
  airbus: {
    name:"Airbus", flag:"🇫🇷", icon:"airbus", logoText:"AB",
    categories:[
      { name:"Triebwerke", emoji:"✈️", companies:[
        { name:"Rolls-Royce",       flag:"🇬🇧", icon:null, logoText:"RR" },
        { name:"CFM International", flag:"🇫🇷", icon:null, logoText:"CF" },
        { name:"Pratt & Whitney",   flag:"🇺🇸", icon:null, logoText:"PW" },
      ]},
      { name:"Materialien", emoji:"🔩", companies:[
        { name:"Hexcel",             flag:"🇺🇸", icon:null, logoText:"HX" },
        { name:"Toray",              flag:"🇯🇵", icon:null, logoText:"TR" },
        { name:"Spirit AeroSystems", flag:"🇺🇸", icon:null, logoText:"SA" },
      ]},
      { name:"Avionik / Software", emoji:"📡", companies:[
        { name:"Thales",            flag:"🇫🇷", icon:null, logoText:"TH" },
        { name:"Honeywell",         flag:"🇺🇸", icon:null, logoText:"HW" },
        { name:"Collins Aerospace", flag:"🇺🇸", icon:null, logoText:"CA" },
      ]},
    ],
  },
};

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
    el.innerHTML =
      `<span class="div-badge div-yes">✓ Ja</span>` +
      `<span class="div-amount">${div.amount} &middot; ${div.frequency}</span>`;
  } else {
    el.innerHTML = `<span class="div-badge div-no">✗ Keine</span>`;
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
  cardBg.style.backgroundImage = `url("${s.photo}")`;
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

function removeFromWatchlist(id) {
  watchlist.delete(id);
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
        <span class="wl-price">${nfEUR.format(s.price)}</span>
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
  Dive:  { page:"pageDive",  tab:"tabDive",  subtitle:"Erkunde Netzwerke"        },
};

function switchTab(active) {
  Object.entries(TAB_CONFIG).forEach(([key, cfg]) => {
    document.getElementById(cfg.page).classList.toggle("active", key === active);
    document.getElementById(cfg.tab ).classList.toggle("active", key === active);
  });
  document.getElementById("pageSubtitle").textContent = TAB_CONFIG[active].subtitle;
}

document.getElementById("tabSwipe").addEventListener("click", () => switchTab("Swipe"));
document.getElementById("tabEtf")  .addEventListener("click", () => switchTab("Etf"));
document.getElementById("tabDive") .addEventListener("click", () => switchTab("Dive"));

// ── Dive ──────────────────────────────────────────────────────────────────────
let diveActiveCompany = null;
let diveActiveCatIdx  = null;

function initDiveChips() {
  const chips = document.getElementById("diveChips");
  chips.innerHTML = Object.entries(diveData).map(([key, d]) =>
    `<button class="dive-chip" data-key="${key}" type="button">${d.flag} ${d.name}</button>`
  ).join("");
  chips.querySelectorAll(".dive-chip").forEach(btn =>
    btn.addEventListener("click", () => selectDiveCompany(btn.dataset.key))
  );
}

function filterDiveChips(q) {
  const term = q.toLowerCase();
  document.querySelectorAll(".dive-chip").forEach(btn => {
    const key  = btn.dataset.key;
    const name = diveData[key].name.toLowerCase();
    btn.style.display = (!term || name.includes(term) || key.includes(term)) ? "" : "none";
  });
}

function selectDiveCompany(key) {
  if (!diveData[key]) return;
  diveActiveCompany = key;
  diveActiveCatIdx  = null;
  document.getElementById("diveInput").value       = diveData[key].name;
  document.getElementById("diveClearBtn").style.display = "";
  document.getElementById("diveChips").style.display   = "none";
  renderDiveTree(key);
  document.getElementById("diveTreeWrap").style.display = "";
}

function resetDive() {
  diveActiveCompany = null;
  diveActiveCatIdx  = null;
  document.getElementById("diveInput").value           = "";
  document.getElementById("diveClearBtn").style.display = "none";
  document.getElementById("diveChips").style.display   = "";
  document.getElementById("diveTreeWrap").style.display = "none";
  document.getElementById("diveChips").querySelectorAll(".dive-chip")
    .forEach(c => c.style.display = "");
}

function diveMakeLogoHTML(icon, logoText) {
  if (icon) {
    return `<img src="https://cdn.simpleicons.org/${icon}/ffffff" alt="${logoText}"` +
           ` data-fallback="${logoText}" onerror="brandIconError(this)">`;
  }
  return `<span>${logoText}</span>`;
}

function renderDiveTree(key) {
  const data = diveData[key];
  const wrap = document.getElementById("diveTreeWrap");

  wrap.innerHTML = `
    <div class="dt-root-card">
      <div class="dt-root-logo">${diveMakeLogoHTML(data.icon, data.logoText)}</div>
      <div class="dt-root-info">
        <strong>${data.name}</strong>
        <small>Netzwerk-Übersicht</small>
      </div>
      <span class="dt-root-flag">${data.flag}</span>
    </div>

    <div class="dt-connector-v"></div>

    <div class="dt-cats-row" id="dtCatsRow">
      ${data.categories.map((cat, i) => `
        <button class="dt-cat-btn" data-catidx="${i}" type="button">
          <span class="dt-cat-emoji">${cat.emoji}</span>
          <span class="dt-cat-label">${cat.name}</span>
        </button>
      `).join("")}
    </div>

    <div class="dt-companies-panel" id="dtCompaniesPanel"></div>
  `;

  wrap.querySelectorAll(".dt-cat-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx      = parseInt(btn.dataset.catidx);
      const isActive = btn.classList.contains("active");

      wrap.querySelectorAll(".dt-cat-btn").forEach(b => b.classList.remove("active"));
      const panel = document.getElementById("dtCompaniesPanel");

      if (isActive) {
        diveActiveCatIdx = null;
        panel.innerHTML  = "";
      } else {
        btn.classList.add("active");
        diveActiveCatIdx = idx;
        renderDiveCompanies(data.categories[idx], panel, btn);
      }
    });
  });
}

function renderDiveCompanies(cat, panel, activeBtn) {
  panel.innerHTML = `
    <div class="dt-connector-v" id="dtCatConnector"></div>
    <div class="dt-companies-row">
      ${cat.companies.map((c, i) => `
        <div class="dt-company-card" style="animation-delay:${i * 0.07}s">
          <div class="dt-company-logo">${diveMakeLogoHTML(c.icon, c.logoText)}</div>
          <span class="dt-company-name">${c.name}</span>
          <span class="dt-company-flag">${c.flag}</span>
        </div>
      `).join("")}
    </div>
  `;

  // Align connector with the horizontal center of the active category button
  const connector = document.getElementById("dtCatConnector");
  const wrapRect  = panel.parentElement.getBoundingClientRect();
  const btnRect   = activeBtn.getBoundingClientRect();
  const centerX   = Math.round(btnRect.left + btnRect.width / 2 - wrapRect.left - 1);
  connector.style.margin     = "0";
  connector.style.marginLeft = centerX + "px";
}

// Dive event listeners
document.getElementById("diveInput").addEventListener("input", e => {
  if (diveActiveCompany) resetDive();
  filterDiveChips(e.target.value);
});
document.getElementById("diveInput").addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  const first = [...document.querySelectorAll(".dive-chip")]
    .find(c => c.style.display !== "none");
  if (first) selectDiveCompany(first.dataset.key);
});
document.getElementById("diveClearBtn").addEventListener("click", resetDive);

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
stocks.forEach(s => { s.perf.d = simulateTodayPerf(s); });

function calcEtfPerf(holdings, period) {
  let result = 0;
  for (const h of holdings) {
    const stock = stocks.find(s => s.ticker === h.ticker);
    if (!stock) continue;
    result += (stock.perf[period] ?? 0) * h.weight / 100;
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
const userEtfs = [];
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
    const badge    = etf.isExample ? "" : `<span class="lb-you">Du</span>`;
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
renderLeaderboard();
initDiveChips();
