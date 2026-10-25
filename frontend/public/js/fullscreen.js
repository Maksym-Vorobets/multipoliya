// «На весь экран»: header icon (desktop/tablet) + burger-menu items (mobile).
// Browsers allow fullscreen only after a user gesture, so "default fullscreen" = enter on the first tap/click.
(function () {
  const KEY = "mp.fs";
  const d = document;
  const el = d.documentElement;
  window.I18N.extend({
    "fs.enter": ["На весь экран", "На весь екран", "Full screen"],
    "fs.exit": ["Выйти из полноэкранного", "Вийти з повноекранного", "Exit full screen"],
  });
  const supported = !!(d.fullscreenEnabled || d.webkitFullscreenEnabled);
  const active = () => !!(d.fullscreenElement || d.webkitFullscreenElement);
  const enter = () => (el.requestFullscreen ? el.requestFullscreen({ navigationUI: "hide" }) : el.webkitRequestFullscreen && el.webkitRequestFullscreen());
  const exit = () => (d.exitFullscreen ? d.exitFullscreen() : d.webkitExitFullscreen && d.webkitExitFullscreen());
  const call = (fn) => Promise.resolve().then(fn).catch(() => {});

  const render = () => {
    const on = active();
    d.body.classList.toggle("is-fullscreen", on);
    d.querySelectorAll("[data-fs]").forEach((b) => {
      b.hidden = !supported;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.title = window.I18N.t(on ? "fs.exit" : "fs.enter");
      const label = b.querySelector(".fs-label");
      if (label) label.textContent = b.title;
    });
  };
  const toggle = () => {
    if (active()) {
      localStorage.setItem(KEY, "off");
      call(exit);
    } else {
      localStorage.setItem(KEY, "on");
      call(enter);
    }
  };

  d.addEventListener("click", (e) => {
    const b = e.target.closest("[data-fs]");
    if (!b) return;
    e.stopPropagation();
    d.body.classList.remove("menu-open");
    toggle();
  }, true);
  // Default: go fullscreen on the first interaction unless the player turned it off
  const auto = (e) => {
    d.removeEventListener("pointerdown", auto, true);
    d.removeEventListener("keydown", auto, true);
    if (!supported || active() || localStorage.getItem(KEY) === "off" || (e.target.closest && e.target.closest("[data-fs]"))) return;
    call(enter);
  };
  d.addEventListener("pointerdown", auto, true);
  d.addEventListener("keydown", auto, true);
  d.addEventListener("fullscreenchange", render);
  d.addEventListener("webkitfullscreenchange", render);
  d.addEventListener("langchange", render);
  render();
  window.MPFullscreen = { toggle, get active() { return active(); }, supported };
})();
