// ─────────────────────────────────────────────────────────────────────────────
// Dive – dynamische Mindmap der Lieferkette
//
// Mitte:  gesuchte Aktie (Logo + Name)
// Ring 1: Branchen, aus denen sie Zulieferer hat        (Farbe: Branche)
// Tippen auf Branche   → Zulieferer erscheinen          (Farbe: Zulieferer)
// Tippen auf Zulieferer → dessen Branchen erscheinen … beliebig tief
// Gedrückt halten auf Unternehmen → Aktienkarte im Swipe-Tab öffnen
//
// Ebenen (für das spätere Bezahlmodell, siehe Plan.canOpenLevel):
// Ebene 1 = Aktie → Branchen → Zulieferer
// Ebene 2 = Zulieferer aufklappen → dessen Branchen → dessen Zulieferer
// ─────────────────────────────────────────────────────────────────────────────
(() => {
  const mapEl    = document.getElementById("diveMap");
  const worldEl  = document.getElementById("diveWorld");
  const linesEl  = document.getElementById("diveLines");
  const nodesEl  = document.getElementById("diveNodes");
  const inputEl  = document.getElementById("diveInput");
  const clearBtn = document.getElementById("diveClearBtn");
  const chipsEl  = document.getElementById("diveChips");
  const introEl  = document.getElementById("diveIntro");

  const ANIM_MS       = 480;
  const LONG_PRESS_MS = 450;
  const TAP_TOLERANCE = 8;
  const SVG_NS        = "http://www.w3.org/2000/svg";

  // Abstand zwischen den Ringen und Mindestabstand zwischen Nachbarknoten
  const RING_GAP = { industry: 130, supplier: 118 };
  const MIN_SEP  = { industry: 120, supplier: 96  };

  let root = null;          // Wurzelknoten
  let all  = [];            // alle sichtbaren + gerade verschwindenden Knoten
  let cam  = { x: 0, y: 0, z: 1 };
  let camFrom = null, camTo = null;
  let animStart = 0, animating = false;
  let uid = 0;

  // ── Hilfsfunktionen ─────────────────────────────────────────────────────────
  const ease = t => 1 - Math.pow(1 - t, 3);
  const lerp = (a, b, t) => a + (b - a) * t;
  const esc  = s => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

  function logoHTML(company) {
    if (company.icon) {
      return `<img src="https://cdn.simpleicons.org/${company.icon}/ffffff" alt="" ` +
             `data-fallback="${esc(company.logoText)}" onerror="brandIconError(this)">`;
    }
    return `<span class="brand-fallback">${esc(company.logoText)}</span>`;
  }

  function makeNode(type, data, parent) {
    const node = {
      id: ++uid, type, data, parent, children: [],
      expanded: false, loading: false,
      // Ebene: Branchen/Zulieferer unter der Wurzel = 1; jeder aufgeklappte Zulieferer +1
      level: !parent ? 0 : type === "industry" ? (parent.type === "root" ? 1 : parent.level + 1) : parent.level,
      x: parent ? parent.x : 0, y: parent ? parent.y : 0,
      fromX: 0, fromY: 0, toX: 0, toY: 0,
      fromA: 0, toA: 1, alpha: 0, exiting: false,
      el: null, line: null,
    };

    const el = document.createElement("div");
    el.className = `mm-node mm-${type}`;
    if (type === "industry") {
      el.innerHTML = `<span class="mm-emoji">${data.emoji || "•"}</span><span class="mm-label">${esc(data.name)}</span>`;
    } else {
      el.innerHTML =
        `<div class="mm-logo">${logoHTML(data)}</div>` +
        `<span class="mm-name">${esc(data.name)}${type === "supplier" ? ` <span class="mm-flag">${data.flag || ""}</span>` : ""}</span>`;
    }
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", type === "industry" ? `Branche ${data.name}` : data.name);
    el._node = node;
    nodesEl.appendChild(el);
    node.el = el;

    if (parent) {
      const line = document.createElementNS(SVG_NS, "line");
      line.setAttribute("class", "mm-line");
      linesEl.appendChild(line);
      node.line = line;
    }
    all.push(node);
    return node;
  }

  // ── Layout ─────────────────────────────────────────────────────────────────
  // Die Branchen liegen im Kreis um die Aktie. Alles Weitere fächert sich vom
  // jeweiligen Knoten nach außen auf (weg von der Mitte). Da pro Knoten immer
  // nur ein Zweig offen ist, bleibt die Karte aufgeräumt und die Linien kurz.
  const visibleChildren = n => n.children.filter(c => !c.exiting);
  const MAX_FAN = 2.3; // maximale Fächerbreite in Bogenmaß (~130°)

  function layout() {
    (function place(n) {
      const kids = visibleChildren(n);
      if (!kids.length) return;
      const type = kids[0].type;

      if (n.type === "root") {
        const dist = Math.max(RING_GAP[type], MIN_SEP[type] * kids.length / (2 * Math.PI));
        kids.forEach((k, i) => {
          const a = -Math.PI / 2 + i * 2 * Math.PI / kids.length;
          k.toX = Math.cos(a) * dist;
          k.toY = Math.sin(a) * dist;
        });
      } else {
        const base = Math.atan2(n.toY, n.toX); // Richtung weg von der Mitte
        let dist = RING_GAP[type];
        let step = MIN_SEP[type] / dist;
        if (kids.length > 1 && step * (kids.length - 1) > MAX_FAN) {
          step = MAX_FAN / (kids.length - 1);
          dist = MIN_SEP[type] / step;
        }
        kids.forEach((k, i) => {
          const a = base + (i - (kids.length - 1) / 2) * step;
          k.toX = n.toX + Math.cos(a) * dist;
          k.toY = n.toY + Math.sin(a) * dist;
        });
      }
      kids.forEach(place);
    })(Object.assign(root, { toX: 0, toY: 0 }));
  }

  // ── Animation ───────────────────────────────────────────────────────────────
  function startAnimation(focusNode) {
    layout();
    all.forEach(n => {
      n.fromX = n.x; n.fromY = n.y;
      n.fromA = n.alpha;
      if (n.exiting) { n.toX = n.parent.toX; n.toY = n.parent.toY; n.toA = 0; }
      else n.toA = 1;
    });
    camFrom = { ...cam };
    camTo   = cameraFor(focusNode);
    animStart = performance.now();
    if (!animating) { animating = true; requestAnimationFrame(tick); }
  }

  function tick(now) {
    const t = Math.min(1, (now - animStart) / ANIM_MS);
    const e = ease(t);
    all.forEach(n => {
      n.x = lerp(n.fromX, n.toX, e);
      n.y = lerp(n.fromY, n.toY, e);
      n.alpha = lerp(n.fromA, n.toA, e);
    });
    if (camTo) cam = { x: lerp(camFrom.x, camTo.x, e), y: lerp(camFrom.y, camTo.y, e), z: lerp(camFrom.z, camTo.z, e) };
    draw();
    if (t < 1) { requestAnimationFrame(tick); return; }
    animating = false;
    // verschwundene Knoten endgültig entfernen
    all.filter(n => n.exiting).forEach(n => { n.el.remove(); n.line && n.line.remove(); });
    all = all.filter(n => !n.exiting);
  }

  function draw() {
    worldEl.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.z})`;
    all.forEach(n => {
      const s = 0.4 + 0.6 * n.alpha;
      n.el.style.transform = `translate(${n.x}px, ${n.y}px) translate(-50%, -50%) scale(${s})`;
      n.el.style.opacity = n.alpha;
      n.el.classList.toggle("is-expanded", n.expanded);
      n.el.classList.toggle("is-loading", n.loading);
      n.el.classList.toggle("is-path", isOnActivePath(n));
      if (n.line) {
        n.line.setAttribute("x1", n.parent.x); n.line.setAttribute("y1", n.parent.y);
        n.line.setAttribute("x2", n.x);        n.line.setAttribute("y2", n.y);
        n.line.style.opacity = n.alpha;
        n.line.classList.toggle("is-path", isOnActivePath(n));
      }
    });
  }

  function isOnActivePath(n) {
    return n.expanded || (n.parent && n.parent.expanded && n.children.some(c => !c.exiting));
  }

  // Kamera so setzen, dass der aufgeklappte Bereich gut sichtbar ist
  function cameraFor(focusNode) {
    const box = mapEl.getBoundingClientRect();
    if (!box.width) return { ...cam };
    let pts;
    if (!focusNode) {
      pts = all.filter(n => !n.exiting);
    } else {
      pts = [focusNode, ...visibleChildren(focusNode)];
      if (focusNode.parent) pts.push(focusNode.parent);
      if (focusNode.type === "industry" && focusNode.parent?.parent) pts.push(focusNode.parent.parent);
    }
    const xs = pts.map(n => n.toX), ys = pts.map(n => n.toY);
    const minX = Math.min(...xs) - 95, maxX = Math.max(...xs) + 95;
    const minY = Math.min(...ys) - 60, maxY = Math.max(...ys) + 70;
    // oben Platz für Legende/Zentrieren-Knopf, unten für den Datenhinweis lassen
    const PAD_TOP = 62, PAD_BOTTOM = 40;
    const usableH = box.height - PAD_TOP - PAD_BOTTOM;
    const z = Math.max(0.4, Math.min(1.1, Math.min(box.width / (maxX - minX), usableH / (maxY - minY))));
    return { x: -((minX + maxX) / 2) * z, y: -((minY + maxY) / 2) * z + (PAD_TOP - PAD_BOTTOM) / 2, z };
  }

  // ── Aufklappen / Zuklappen ─────────────────────────────────────────────────
  function collapse(node) {
    node.expanded = false;
    node.children.forEach(c => { collapse(c); c.exiting = true; });
  }

  function collapseSiblings(node) {
    if (!node.parent) return;
    node.parent.children.forEach(s => { if (s !== node && s.expanded) collapse(s); });
  }

  function purgeExited(node) {
    node.children = node.children.filter(c => !c.exiting);
  }

  function toggleIndustry(node) {
    if (node.expanded) {
      collapse(node);
      startAnimation(node.parent);
      purgeLater(node);
      return;
    }
    collapseSiblings(node);
    node.expanded = true;
    node.data.suppliers.forEach(s => node.children.push(makeNode("supplier", s, node)));
    startAnimation(node);
    if (node.parent) purgeLater(node.parent);
  }

  async function toggleCompany(node) {
    if (node.loading) return;
    if (node.expanded) {
      collapse(node);
      startAnimation(node.parent || node);
      purgeLater(node);
      return;
    }
    const nextLevel = node.type === "root" ? 1 : node.level + 1;
    if (!Plan.canOpenLevel(nextLevel)) {
      showToast("🔒 Weitere Ebenen gibt es mit Pro");
      return;
    }

    node.loading = true; draw();
    let industries;
    try {
      industries = await DataService.getSupplierIndustries(node.data.id);
    } catch (err) {
      node.loading = false; draw();
      showToast("Daten konnten nicht geladen werden");
      return;
    }
    node.loading = false;
    if (!root || !all.includes(node) || node.exiting) return; // inzwischen zurückgesetzt

    if (industries === null) {
      draw(); nudge(node);
      showToast(`Für ${node.data.name} gibt es im Demo-Modus noch keine Daten`);
      return;
    }
    if (!industries.length) {
      draw(); nudge(node);
      showToast(`Keine börsennotierten Zulieferer gefunden`);
      return;
    }

    collapseSiblings(node);
    node.expanded = true;
    industries.forEach(ind => node.children.push(makeNode("industry", ind, node)));
    startAnimation(node);
    if (node.parent) purgeLater(node.parent);
  }

  // entfernte Kinder nach der Animation aus der Struktur löschen
  function purgeLater(node) {
    setTimeout(() => {
      (function walk(n) { purgeExited(n); n.children.forEach(walk); })(node);
    }, ANIM_MS + 20);
  }

  function nudge(node) {
    node.el.classList.remove("mm-nudge");
    void node.el.offsetWidth;
    node.el.classList.add("mm-nudge");
  }

  function openCard(node) {
    const company = node.data;
    if (company.stockId && openStockCard(company.stockId)) return;
    showToast(`Für ${company.name} gibt es im Demo-Modus noch keine Aktienkarte`);
  }

  // ── Start / Reset ───────────────────────────────────────────────────────────
  function start(company) {
    reset(false);
    inputEl.value = company.name;
    clearBtn.style.display = "";
    chipsEl.style.display  = "none";
    introEl.style.display  = "none";
    mapEl.style.display    = "";

    cam = { x: 0, y: 0, z: 1 };
    root = makeNode("root", company, null);
    root.alpha = 0;
    startAnimation(null);
    toggleCompany(root);
  }

  function reset(showChips = true) {
    all.forEach(n => { n.el.remove(); n.line && n.line.remove(); });
    all = []; root = null;
    if (showChips) {
      inputEl.value = "";
      clearBtn.style.display = "none";
      chipsEl.style.display  = "";
      introEl.style.display  = "";
      mapEl.style.display    = "none";
      filterChips("");
    }
  }

  // ── Start-Auswahl (Chips + Suche) ───────────────────────────────────────────
  const startCompanies = DataService.getDiveStartCompanies();
  chipsEl.innerHTML = startCompanies.map(c =>
    `<button class="dive-chip" data-id="${c.id}" type="button">${c.flag} ${esc(c.name)}</button>`
  ).join("");
  chipsEl.querySelectorAll(".dive-chip").forEach(btn =>
    btn.addEventListener("click", () => start(DataService.getCompany(btn.dataset.id)))
  );

  function filterChips(q) {
    const term = q.trim().toLowerCase();
    chipsEl.querySelectorAll(".dive-chip").forEach(btn => {
      const c = DataService.getCompany(btn.dataset.id);
      btn.style.display = !term || c.name.toLowerCase().includes(term) || c.id.includes(term) ? "" : "none";
    });
  }

  inputEl.addEventListener("input", e => {
    if (root) reset();
    filterChips(e.target.value);
  });
  inputEl.addEventListener("keydown", e => {
    if (e.key !== "Enter") return;
    const first = [...chipsEl.querySelectorAll(".dive-chip")].find(c => c.style.display !== "none");
    if (first) { inputEl.blur(); start(DataService.getCompany(first.dataset.id)); }
    else showToast("Im Demo-Modus nur für die angezeigten Unternehmen verfügbar");
  });
  clearBtn.addEventListener("click", () => reset());

  document.getElementById("diveRecenter").addEventListener("click", () => {
    if (!root) return;
    all.forEach(n => { n.fromX = n.toX = n.x; n.fromY = n.toY = n.y; n.fromA = n.toA = n.alpha; });
    camFrom = { ...cam }; camTo = cameraFor(null);
    animStart = performance.now();
    if (!animating) { animating = true; requestAnimationFrame(tick); }
  });

  // Beim Wechsel in den Dive-Tab die Kamera neu ausrichten (Größe war vorher 0)
  document.addEventListener("tabchange", e => {
    if (e.detail === "Dive" && root) requestAnimationFrame(() => document.getElementById("diveRecenter").click());
  });

  // ── Gesten: Tippen, Gedrückthalten, Verschieben, Zoomen ─────────────────────
  const pointers = new Map();
  let press = null;        // { node, x, y, timer, longFired }
  let panStart = null;     // { x, y, camX, camY }
  let pinchStart = null;   // { dist, z, midX, midY, camX, camY }

  function localPoint(clientX, clientY) {
    const r = mapEl.getBoundingClientRect();
    return { x: clientX - r.left - r.width / 2, y: clientY - r.top - r.height / 2 };
  }

  mapEl.addEventListener("pointerdown", e => {
    if (e.target.closest(".dive-recenter")) return;
    mapEl.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 1) {
      panStart = { x: e.clientX, y: e.clientY, camX: cam.x, camY: cam.y };
      const nodeEl = e.target.closest(".mm-node");
      const node = nodeEl && nodeEl._node;
      if (node && !node.exiting) {
        press = { node, x: e.clientX, y: e.clientY, longFired: false, timer: null };
        if (node.type !== "industry") {
          press.timer = setTimeout(() => {
            press.longFired = true;
            if (navigator.vibrate) navigator.vibrate(10);
            openCard(node);
          }, LONG_PRESS_MS);
        }
      }
    } else if (pointers.size === 2) {
      cancelPress();
      const [a, b] = [...pointers.values()];
      const mid = localPoint((a.x + b.x) / 2, (a.y + b.y) / 2);
      pinchStart = { dist: Math.hypot(a.x - b.x, a.y - b.y), z: cam.z, midX: mid.x, midY: mid.y, camX: cam.x, camY: cam.y };
    }
  });

  mapEl.addEventListener("pointermove", e => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2 && pinchStart) {
      const [a, b] = [...pointers.values()];
      const z = Math.max(0.3, Math.min(2.2, pinchStart.z * Math.hypot(a.x - b.x, a.y - b.y) / pinchStart.dist));
      const mid = localPoint((a.x + b.x) / 2, (a.y + b.y) / 2);
      // Punkt unter den Fingern bleibt stehen
      const wx = (pinchStart.midX - pinchStart.camX) / pinchStart.z;
      const wy = (pinchStart.midY - pinchStart.camY) / pinchStart.z;
      cam = { x: mid.x - wx * z, y: mid.y - wy * z, z };
      draw();
      return;
    }
    if (pointers.size === 1 && panStart) {
      const ddx = e.clientX - panStart.x, ddy = e.clientY - panStart.y;
      if (press && Math.hypot(ddx, ddy) > TAP_TOLERANCE) cancelPress();
      if (!press) {
        cam = { ...cam, x: panStart.camX + ddx, y: panStart.camY + ddy };
        draw();
      }
    }
  });

  function cancelPress() {
    if (press) { clearTimeout(press.timer); press = null; }
  }

  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStart = null;
    if (pointers.size === 1) {
      const [p] = [...pointers.values()];
      panStart = { x: p.x, y: p.y, camX: cam.x, camY: cam.y };
    }
    if (pointers.size === 0) {
      panStart = null;
      if (press && e.type === "pointerup") {
        clearTimeout(press.timer);
        const { node, longFired } = press;
        press = null;
        if (!longFired) {
          if (node.type === "industry") toggleIndustry(node);
          else toggleCompany(node);
        }
      }
      cancelPress();
    }
  }
  mapEl.addEventListener("pointerup", endPointer);
  mapEl.addEventListener("pointercancel", endPointer);
  mapEl.addEventListener("contextmenu", e => e.preventDefault());

  mapEl.addEventListener("wheel", e => {
    e.preventDefault();
    const p = localPoint(e.clientX, e.clientY);
    const z = Math.max(0.3, Math.min(2.2, cam.z * Math.exp(-e.deltaY * 0.0015)));
    const wx = (p.x - cam.x) / cam.z, wy = (p.y - cam.y) / cam.z;
    cam = { x: p.x - wx * z, y: p.y - wy * z, z };
    draw();
  }, { passive: false });

  window.addEventListener("resize", () => { if (root) draw(); });
})();
