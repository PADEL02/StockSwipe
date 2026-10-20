// ─────────────────────────────────────────────────────────────────────────────
// Startbildschirm, Einführung (einmalig) und „Über die App“
// ─────────────────────────────────────────────────────────────────────────────
(() => {
  const ONBOARDING_KEY = "onboarding_v1";

  // ── Startbildschirm ─────────────────────────────────────────────────────────
  const splash = document.getElementById("appSplash");
  document.getElementById("splashName").textContent = APP_CONFIG.name;
  const shownAt = performance.now();

  AppReady.then(() => {
    const wait = Math.max(0, 700 - (performance.now() - shownAt));
    setTimeout(() => {
      splash.classList.add("hide");
      setTimeout(() => splash.remove(), 450);
      if (!Store.get(ONBOARDING_KEY, false)) Onboarding.open();
    }, wait);
  });

  // ── Einführung ──────────────────────────────────────────────────────────────
  const ob     = document.getElementById("onboarding");
  const track  = document.getElementById("obTrack");
  const dots   = [...document.querySelectorAll("#obDots i")];
  const next   = document.getElementById("obNext");
  const skip   = document.getElementById("obSkip");
  const slides = track.children.length;
  let page = 0;

  function show(i) {
    page = Math.max(0, Math.min(slides - 1, i));
    track.style.transform = `translateX(${-page * 100}%)`;
    dots.forEach((d, k) => d.classList.toggle("on", k === page));
    const last = page === slides - 1;
    next.textContent = last ? "Verstanden" : "Weiter";
    skip.hidden = last;
  }

  const Onboarding = {
    open() {
      ob.hidden = false;
      show(0);
      requestAnimationFrame(() => ob.classList.add("show"));
      next.focus();
    },
    close() {
      ob.classList.remove("show");
      setTimeout(() => { ob.hidden = true; }, 300);
    },
  };

  next.addEventListener("click", () => {
    if (page < slides - 1) return show(page + 1);
    // Letzte Seite: Hinweise wurden bestätigt
    Store.set(ONBOARDING_KEY, { accepted: true, at: new Date().toISOString() });
    Onboarding.close();
  });
  skip.addEventListener("click", () => show(slides - 1)); // Überspringen führt zu den Hinweisen

  // Wischen zwischen den Seiten
  let sx = null;
  track.addEventListener("pointerdown", e => { sx = e.clientX; });
  track.addEventListener("pointerup", e => {
    if (sx === null) return;
    const d = e.clientX - sx; sx = null;
    if (d < -50) show(page + 1);
    if (d > 50) show(page - 1);
  });

  // ── Über die App ────────────────────────────────────────────────────────────
  const panel = document.getElementById("infoPanel");
  const menu  = document.getElementById("infoMenu");
  const text  = document.getElementById("infoText");
  const title = document.getElementById("infoTitle");
  const back  = document.getElementById("infoBack");
  const TITLES = { hinweise: "Hinweise", impressum: "Impressum", datenschutz: "Datenschutz" };

  function openInfo() {
    showMenu();
    document.getElementById("infoVersion").textContent =
      `${APP_CONFIG.name} · Version ${APP_CONFIG.version} · ${dataSourceLabel()}`;
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add("show"));
    Tooltips.hide();
  }
  function closeInfo() {
    panel.classList.remove("show");
    setTimeout(() => { panel.hidden = true; }, 300);
    document.getElementById("infoBtn").focus();
  }
  function showMenu() {
    menu.hidden = false; text.hidden = true; back.hidden = true;
    title.textContent = "Über die App";
  }
  function showText(key) {
    text.innerHTML = LEGAL[key] + `<p class="info-stand">${LEGAL.version}</p>`;
    menu.hidden = true; text.hidden = false; back.hidden = false;
    title.textContent = TITLES[key];
    text.scrollTop = 0;
  }

  document.getElementById("infoBtn").addEventListener("click", openInfo);
  document.getElementById("infoClose").addEventListener("click", closeInfo);
  back.addEventListener("click", showMenu);
  menu.querySelectorAll(".info-row").forEach(row => row.addEventListener("click", () => {
    if (row.dataset.show === "intro") { closeInfo(); setTimeout(() => Onboarding.open(), 320); }
    else showText(row.dataset.show);
  }));
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !panel.hidden) closeInfo();
  });
})();
