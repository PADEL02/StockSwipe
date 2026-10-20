// ─────────────────────────────────────────────────────────────────────────────
// Erklär-Tooltips
// Handy: Wert gedrückt halten → kurze Erklärung erscheint.
// Computer: mit der Maus über den Wert fahren.
// Elemente bekommen dafür einfach ein Attribut data-tip="<schlüssel>".
// ─────────────────────────────────────────────────────────────────────────────
const TIP_TEXTS = {
  dividend:    "Dividende: Ein Teil des Gewinns, den das Unternehmen regelmäßig an seine Aktionäre auszahlt.",
  sector:      "Branche: Der Wirtschaftsbereich, in dem das Unternehmen hauptsächlich sein Geld verdient.",
  country:     "Land: Wo das Unternehmen seinen Hauptsitz hat.",
  ticker:      "Börsenkürzel: Die kurze Abkürzung, unter der die Aktie an der Börse gehandelt wird.",
  trend:       "Kurz-Einordnung: Wofür das Unternehmen gerade bekannt ist.",
  mcap:        "Unternehmenswert: So viel sind alle Aktien des Unternehmens zusammen an der Börse wert.",
  perf:        "Wertentwicklung: Um wie viel Prozent sich der Wert der Aktie im jeweiligen Zeitraum verändert hat.",
  perfW:       "1W: Veränderung des Aktienwerts in der letzten Woche.",
  perfM:       "1M: Veränderung des Aktienwerts im letzten Monat.",
  perfY:       "1J: Veränderung des Aktienwerts im letzten Jahr.",
  products:    "Produkte: Die wichtigsten Produkte und Dienste, mit denen das Unternehmen Geld verdient.",
  competitors: "Wettbewerber: Unternehmen, die mit ähnlichen Produkten um dieselben Kunden kämpfen.",
};

const Tooltips = (() => {
  const bubble = document.getElementById("tipBubble");
  const LONG_PRESS_MS = 450;
  const MOVE_TOLERANCE = 8;

  let pressTimer = null, hoverTimer = null, hideTimer = null, startX = 0, startY = 0, hoverEl = null;

  function show(el) {
    const key = el.dataset.tip;
    const text = TIP_TEXTS[key];
    if (!text) return;
    clearTimeout(hideTimer);
    bubble.textContent = text;
    bubble.classList.add("show");
    bubble.setAttribute("aria-hidden", "false");

    // Über dem Element anzeigen, sonst darunter; seitlich im Bildschirm halten.
    const r  = el.getBoundingClientRect();
    const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    let left = r.left + r.width / 2 - bw / 2;
    left = Math.max(12, Math.min(window.innerWidth - bw - 12, left));
    let top = r.top - bh - 10;
    if (top < 12) top = r.bottom + 10;
    bubble.style.left = `${left}px`;
    bubble.style.top  = `${top}px`;
  }

  function hide(delay = 0) {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      bubble.classList.remove("show");
      bubble.setAttribute("aria-hidden", "true");
    }, delay);
  }

  function cancelPress() { clearTimeout(pressTimer); pressTimer = null; }

  // ── Touch / Stift: gedrückt halten ──────────────────────────────────────────
  document.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    const el = e.target.closest("[data-tip]");
    hide();
    if (!el) return;
    startX = e.clientX; startY = e.clientY;
    cancelPress();
    pressTimer = setTimeout(() => {
      pressTimer = null;
      show(el);
      if (navigator.vibrate) navigator.vibrate(8);
    }, LONG_PRESS_MS);
  }, true);

  document.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse" || !pressTimer) return;
    if (Math.hypot(e.clientX - startX, e.clientY - startY) > MOVE_TOLERANCE) cancelPress();
  }, true);

  ["pointerup", "pointercancel"].forEach(type =>
    document.addEventListener(type, (e) => {
      if (e.pointerType === "mouse") return;
      cancelPress();
      if (bubble.classList.contains("show")) hide(2200);
    }, true)
  );

  // ── Maus: hovern ────────────────────────────────────────────────────────────
  document.addEventListener("pointerover", (e) => {
    if (e.pointerType !== "mouse") return;
    const el = e.target.closest("[data-tip]");
    if (el === hoverEl) return;
    hoverEl = el;
    clearTimeout(hoverTimer);
    if (el) hoverTimer = setTimeout(() => show(el), 250);
    else    hide();
  });

  // Bei Scrollen, Tab-Wechsel o. Ä. sofort ausblenden.
  window.addEventListener("scroll", () => hide(), true);

  return { hide, isVisible: () => bubble.classList.contains("show") };
})();
