(function () {
  const API = window.MP_API;
  const I = window.I18N;
  const { t } = I;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => window.MPApp.esc(s ?? "");
  const LANGS = [["ru", "RU"], ["en", "EN"], ["uk", "UA"]];
  const DECKS = ["kap_chance", "kap_borgi", "gos_chance", "gos_borgi", "nar_chance", "nar_borgi"];

  I.extend({
    "adm.title": ["Админ-панель", "Адмін-панель", "Admin panel"], "adm.link": ["Администрирование", "Адміністрування", "Administration"],
    "adm.email": ["Email", "Email", "Email"], "adm.password": ["Пароль", "Пароль", "Password"], "adm.login": ["Войти", "Увійти", "Sign in"],
    "adm.logout": ["Выйти", "Вийти", "Sign out"], "adm.save": ["Сохранить изменения", "Зберегти зміни", "Save changes"], "adm.saved": ["Изменения сохранены", "Зміни збережено", "Changes saved"],
    "adm.rules": ["Правила", "Правила", "Rules"], "adm.ui": ["Тексты интерфейса", "Тексти інтерфейсу", "Interface texts"], "adm.cards": ["Карточки", "Картки", "Cards"],
    "adm.search": ["Поиск по ключу или тексту", "Пошук за ключем або текстом", "Search by key or text"], "adm.shown": ["Показано {n} из {total}", "Показано {n} з {total}", "Showing {n} of {total}"],
    "adm.reset": ["Сбросить к исходному", "Скинути до початкового", "Reset to default"], "adm.back": ["На главный экран", "На головний екран", "Main screen"],
    "adm.html": ["Поддерживается HTML: <h4>, <p>, <b>", "Підтримується HTML: <h4>, <p>, <b>", "HTML supported: <h4>, <p>, <b>"],
  });

  let content = { texts: {}, cards: {} };
  let token = sessionStorage.getItem("mp.admin") || null;
  let tab = "rules";
  let deck = DECKS[0];
  let query = "";
  const originalCards = JSON.parse(JSON.stringify(window.MPCardData));

  const req = async (method, path, body) => {
    const r = await fetch(API + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(typeof data.detail === "string" ? data.detail : Array.isArray(data.detail) ? data.detail.map((d) => d.msg).join(" ") : "Error"), { status: r.status });
    return data;
  };

  // Apply overrides to the running game (texts + card decks)
  const applyContent = () => {
    I.override(content.texts);
    Object.entries(content.cards || {}).forEach(([d, map]) => Object.entries(map).forEach(([i, f]) => Object.assign(window.MPCardData[d][+i], f)));
    I.apply();
    document.dispatchEvent(new CustomEvent("langchange", { detail: I.lang }));
  };
  fetch(API + "/content").then((r) => r.json()).then((c) => {
    content = { texts: c.texts || {}, cards: c.cards || {} };
    applyContent();
  }).catch(() => {});

  const textVal = (l, k) => (content.texts[l] && k in content.texts[l] ? content.texts[l][k] : I.original(l, k));
  const row = (label, fields) => `<div class="adm-row"><div class="adm-key">${label}</div><div class="adm-fields">${fields.join("")}</div></div>`;
  const field = (lang, value, attrs, tall) => `<label><span>${lang}</span><textarea rows="${tall ? 10 : 2}" ${attrs}>${esc(value)}</textarea></label>`;

  const render = () => {
    const logged = !!token;
    $("#admin-login").hidden = logged;
    $("#admin-editor").hidden = !logged;
    if (!logged) return;
    document.querySelectorAll("[data-adm-tab]").forEach((b) => b.classList.toggle("is-active", b.dataset.admTab === tab));
    $("#admin-search").hidden = tab !== "ui";
    $("#admin-deck").parentElement.hidden = tab !== "cards";
    let html = "";
    if (tab === "rules") {
      html = `<p class="sub sub--xs">${esc(t("adm.html"))}</p>` + ["rules.title", "rules.body", "policy.title", "policy.body"].map((k) =>
        row(k, LANGS.map(([l, L]) => field(L, textVal(l, k), `data-text="${k}" data-lang="${l}" data-testid="adm-text-${k}-${l}"`, k.endsWith("body"))))).join("");
    }
    if (tab === "ui") {
      const q = query.toLowerCase();
      const keys = I.keys().filter((k) => !k.startsWith("rules.") && !k.startsWith("policy.") && (!q || k.toLowerCase().includes(q) || LANGS.some(([l]) => String(textVal(l, k)).toLowerCase().includes(q))));
      html = `<p class="sub sub--xs">${t("adm.shown", { n: Math.min(60, keys.length), total: keys.length })}</p>` +
        keys.slice(0, 60).map((k) => row(k, LANGS.map(([l, L]) => field(L, textVal(l, k), `data-text="${k}" data-lang="${l}" data-testid="adm-text-${k}-${l}"`)))).join("");
    }
    if (tab === "cards") {
      html = window.MPCardData[deck].map((c, i) => row(`№${i + 1}`, [["t", "RU"], ["en", "EN"], ["uk", "UA"]].map(([f, L]) =>
        field(L, c[f], `data-card="${i}" data-field="${f}" data-testid="adm-card-${deck}-${i}-${f}"`)))).join("");
    }
    $("#admin-list").innerHTML = html;
  };

  document.addEventListener("input", (e) => {
    const el = e.target;
    if (el.dataset.text) {
      (content.texts[el.dataset.lang] = content.texts[el.dataset.lang] || {})[el.dataset.text] = el.value;
    } else if (el.dataset.card != null) {
      const d = (content.cards[deck] = content.cards[deck] || {});
      (d[el.dataset.card] = d[el.dataset.card] || {})[el.dataset.field] = el.value;
      window.MPCardData[deck][+el.dataset.card][el.dataset.field] = el.value;
    } else if (el.id === "admin-search") {
      query = el.value;
      render();
      $("#admin-search").focus();
    }
  });
  document.addEventListener("change", (e) => {
    if (e.target.id === "admin-deck") {
      deck = e.target.value;
      render();
    }
  });
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.admTab) {
      tab = b.dataset.admTab;
      return render();
    }
    if (b.id === "admin-login-btn") {
      try {
        const data = await req("POST", "/auth/login", { email: $("#admin-email").value, password: $("#admin-password").value });
        token = data.token;
        sessionStorage.setItem("mp.admin", token);
        render();
      } catch (err) {
        $("#admin-error").textContent = err.message;
      }
    }
    if (b.id === "admin-logout-btn") {
      token = null;
      sessionStorage.removeItem("mp.admin");
      render();
    }
    if (b.id === "admin-reset-btn") {
      content = { texts: {}, cards: {} };
      window.MPCardData = JSON.parse(JSON.stringify(originalCards));
      I.keys().forEach((k) => LANGS.forEach(([l]) => I.override({ [l]: { [k]: I.original(l, k) } })));
      render();
    }
    if (b.id === "admin-save-btn") {
      try {
        await req("PUT", "/admin/content", content);
        applyContent();
        window.MPApp.toast(t("adm.saved"));
      } catch (err) {
        if (err.status === 401) {
          token = null;
          sessionStorage.removeItem("mp.admin");
          render();
        }
        window.MPApp.toast(err.message, "error");
      }
    }
    if (b.dataset.go === "admin") render();
  });

  const openFromHash = () => {
    if (location.hash === "#admin") {
      window.MPApp.go("admin");
      if (token) req("GET", "/auth/me").catch(() => { token = null; sessionStorage.removeItem("mp.admin"); render(); });
      render();
    }
  };
  window.addEventListener("hashchange", openFromHash);
  $("#admin-deck").innerHTML = DECKS.map((d) => `<option value="${d}">${d.replace("_", " · ").toUpperCase()}</option>`).join("");
  openFromHash();
})();
