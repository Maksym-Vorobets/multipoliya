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
    "adm.content": ["Редактор контента", "Редактор контенту", "Content editor"], "adm.fields": ["Поля", "Поля", "Fields"],
    "adm.fieldsHint": ["Значения задаются один раз на поле и применяются к обоим кругам (11 и 12). Базовые суммы в $ (₽ в Госмонии), инфляция применяется в игре автоматически.", "Значення задаються один раз на поле і застосовуються до обох кіл (11 і 12). Базові суми в $ (₽ у Госмонії), інфляція застосовується в грі автоматично.", "Values are set once per field and apply to both rings (11 and 12). Base sums in $ (₽ in Gosmonia); inflation is applied in game automatically."],
    "adm.cardsHint": ["Подстановки в тексте: {{amount}}, {{amount2}}, {{amount/2}}, {{field_ID_name}} (например {{field_pegasus_name}}). Суммы показываются в валюте колоды с учётом инфляции.", "Підстановки в тексті: {{amount}}, {{amount2}}, {{amount/2}}, {{field_ID_name}} (наприклад {{field_pegasus_name}}). Суми показуються у валюті колоди з урахуванням інфляції.", "Text placeholders: {{amount}}, {{amount2}}, {{amount/2}}, {{field_ID_name}} (e.g. {{field_pegasus_name}}). Sums are shown in the deck currency with inflation."],
    "adm.f.basePrice": ["Цена участка", "Ціна ділянки", "Plot price"], "adm.f.stPrice": ["Цена станции", "Ціна станції", "Station price"], "adm.f.utPrice": ["Цена покупки", "Ціна купівлі", "Purchase price"],
    "adm.f.baseRent": ["Базовая аренда", "Базова оренда", "Base rent"], "adm.f.modulePrice": ["Цена модуля", "Ціна модуля", "Module price"], "adm.f.domePrice": ["Цена купола", "Ціна купола", "Dome price"],
    "adm.f.rentMod": ["Аренда, {n} мод.", "Оренда, {n} мод.", "Rent, {n} mod."], "adm.f.rentDome": ["Аренда, купол", "Оренда, купол", "Rent, dome"],
    "adm.f.rentSt": ["Аренда, {n} ст.", "Оренда, {n} ст.", "Rent, {n} st."],
    "adm.f.rentOne": ["Одно, кубики {r}", "Одне, кубики {r}", "One, dice {r}"], "adm.f.rentBoth": ["Оба, кубики {r}", "Обидва, кубики {r}", "Both, dice {r}"],
    "adm.f.monopoly": ["Аренда за монополию без построек = базовая × 2", "Оренда за монополію без забудови = базова × 2", "Monopoly rent without buildings = base × 2"],
    "adm.c.action": ["Тип действия", "Тип дії", "Action type"], "adm.c.amount": ["Сумма (amount)", "Сума (amount)", "Amount"], "adm.c.amount2": ["Сумма 2 (amount2)", "Сума 2 (amount2)", "Amount 2"],
    "adm.c.target": ["Целевое поле", "Цільове поле", "Target field"], "adm.c.preview": ["Предпросмотр", "Попередній перегляд", "Preview"],
    "adm.t.property": ["Участок", "Ділянка", "Plot"], "adm.t.station": ["Станция", "Станція", "Station"], "adm.t.utility": ["Предприятие", "Підприємство", "Utility"],
    "adm.t.chance": ["Chance", "Chance", "Chance"], "adm.t.borgi": ["Borgi", "Borgi", "Borgi"], "adm.t.corner": ["Угол", "Кут", "Corner"],
    "adm.a.goto": ["Перемещение на поле", "Переміщення на поле", "Move to field"], "adm.a.back": ["Назад на N секторов", "Назад на N секторів", "Move back N sectors"],
    "adm.a.pay": ["Оплата", "Оплата", "Pay"], "adm.a.payLife": ["Оплата (идёт в уровень жизни)", "Оплата (йде в рівень життя)", "Pay (counts to living standard)"],
    "adm.a.get": ["Получение", "Отримання", "Receive"], "adm.a.repair": ["Ремонт: модуль / купол", "Ремонт: модуль / купол", "Repairs: module / dome"],
    "adm.a.patch": ["Защитный патч", "Захисний патч", "Protection patch"], "adm.a.birthday": ["Подарок от каждого игрока", "Подарунок від кожного гравця", "Gift from every player"],
    "adm.a.allGet": ["Все игроки получают", "Усі гравці отримують", "All players receive"], "adm.a.choice": ["Штраф или карта Шанс", "Штраф або картка Шанс", "Fine or Chance card"],
    "adm.a.mortgagePct": ["% от заложенных объектов", "% від заставлених об'єктів", "% of mortgaged objects"], "adm.a.life": ["+ к уровню жизни", "+ до рівня життя", "+ living standard"],
    "adm.a.mixed": ["Деньги + уровень жизни", "Гроші + рівень життя", "Cash + living standard"], "adm.a.subbotnikOn": ["Субботники: ввести", "Суботники: запровадити", "Subbotniks: on"],
    "adm.a.subbotnikOff": ["Субботники: отменить", "Суботники: скасувати", "Subbotniks: off"], "adm.a.info": ["Только информация", "Лише інформація", "Info only"],
  });
  const ACTIONS = ["goto", "back", "pay", "payLife", "get", "repair", "patch", "birthday", "allGet", "choice", "mortgagePct", "life", "mixed", "subbotnikOn", "subbotnikOff", "info"];
  const NEEDS = { amount: ["back", "pay", "payLife", "get", "repair", "birthday", "allGet", "choice", "mortgagePct", "life", "mixed"], amount2: ["repair", "mixed"], target: ["goto"] };

  let content = { texts: {} };
  let token = sessionStorage.getItem("mp.admin") || null;
  let tab = "rules";
  let deck = "fields";
  let query = "";
  let cc = null; // game_content_config draft
  const draft = () => (cc = cc || JSON.parse(JSON.stringify(window.MPConfig.get())));

  const req = async (method, path, body) => {
    const r = await fetch(API + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(typeof data.detail === "string" ? data.detail : Array.isArray(data.detail) ? data.detail.map((d) => d.msg).join(" ") : "Error"), { status: r.status });
    return data;
  };

  // Apply overrides to the running game (texts + card decks)
  const applyContent = () => {
    I.override(content.texts);
    I.apply();
    document.dispatchEvent(new CustomEvent("langchange", { detail: I.lang }));
  };
  fetch(API + "/content").then((r) => r.json()).then((c) => {
    content = { texts: c.texts || {} };
    applyContent();
  }).catch(() => {});

  const textVal = (l, k) => (content.texts[l] && k in content.texts[l] ? content.texts[l][k] : I.original(l, k));
  const row = (label, fields) => `<div class="adm-row"><div class="adm-key">${label}</div><div class="adm-fields">${fields.join("")}</div></div>`;
  const field = (lang, value, attrs, tall) => `<label><span>${lang}</span><textarea rows="${tall ? 10 : 2}" ${attrs}>${esc(value)}</textarea></label>`;

  /* ----- Content editor (game_content_config) ----- */
  const setPath = (obj, path, v) => {
    const ks = path.split(".");
    const last = ks.pop();
    ks.reduce((o, k) => o[k], obj)[last] = v;
  };
  const num = (label, attrs, v) => `<label><span>${esc(label)}</span><input type="number" min="0" step="any" value="${esc(v)}" ${attrs} /></label>`;
  const txt = (label, attrs, v) => `<label><span>${label}</span><input type="text" value="${esc(v)}" ${attrs} /></label>`;
  const names = (f, i) => LANGS.map(([l, L]) => txt(L, `data-cf="${i}" data-k="name.${l}" data-testid="adm-field-${f.id}-name-${l}"`, f.name[l])).join("");
  const DICE = ["2–3", "4–6", "7–9", "10–12"];
  const fieldsEditor = () => {
    const fs = draft().fields;
    const nums = (f, i, list) => `<div class="adm-nums">${list.map(([k, label]) => num(label, `data-cf="${i}" data-k="${k}" data-testid="adm-field-${f.id}-${k.replace(/\./g, "-")}"`, k.split(".").reduce((o, x) => o[x], f))).join("")}</div>`;
    const body = (f, i) => {
      if (f.type === "property") return nums(f, i, [["basePrice", t("adm.f.basePrice")], ["baseRent", t("adm.f.baseRent")], ["modulePrice", t("adm.f.modulePrice")], ["domePrice", t("adm.f.domePrice")],
        ...[1, 2, 3, 4].map((n) => [`rentLevels.${n - 1}`, t("adm.f.rentMod", { n })]), ["rentLevels.4", t("adm.f.rentDome")]]) + `<p class="sub sub--xs">${esc(t("adm.f.monopoly"))}</p>`;
      if (f.type === "station") return nums(f, i, [["basePrice", t("adm.f.stPrice")], ...[1, 2, 3, 4].map((n) => [`rentByCount.${n - 1}`, t("adm.f.rentSt", { n })])]);
      if (f.type === "utility") return nums(f, i, [["basePrice", t("adm.f.utPrice")], ...DICE.map((r, j) => [`rentTable.one.${j}`, t("adm.f.rentOne", { r })]), ...DICE.map((r, j) => [`rentTable.both.${j}`, t("adm.f.rentBoth", { r })])]);
      return "";
    };
    const key = (f) => `${esc(f.name[I.lang] || f.name.ru)}<small>${esc(t("adm.t." + f.type))}${f.colorGroup ? " · " + esc(f.colorGroup) : ""} · ${esc(f.id)}</small>`;
    return `<p class="sub sub--xs">${esc(t("adm.fieldsHint"))}</p>` + fs.map((f, i) => `<div class="adm-row adm-row--cfg" data-testid="adm-field-${f.id}"><div class="adm-key">${key(f)}</div><div><div class="adm-fields adm-fields--in">${names(f, i)}</div>${body(f, i)}</div></div>`).join("");
  };
  const cardCur = (d) => (d.startsWith("gos") ? "rub" : "usd");
  const preview = (c) => {
    const cur = cardCur(deck);
    const money = ["pay", "payLife", "get", "repair", "birthday", "allGet", "choice", "life", "mixed"].includes(c.actionType);
    return window.MPConfig.parseCardTemplate(c, draft().fields, { fmt: (n) => (money ? `${Math.round(n)} ${cur === "rub" ? "₽" : "$"}` : String(Math.round(n))) });
  };
  const cardsEditor = () => {
    const targets = draft().fields.filter((f) => !["chance", "borgi"].includes(f.type));
    return `<p class="sub sub--xs">${esc(t("adm.cardsHint"))}</p>` + draft().cards[deck].map((c, i) => {
      const sel = `<label><span>${esc(t("adm.c.action"))}</span><select data-cc="${i}" data-k="actionType" data-testid="adm-card-${i}-action">${ACTIONS.map((a) => `<option value="${a}" ${a === c.actionType ? "selected" : ""}>${esc(t("adm.a." + a))}</option>`).join("")}</select></label>`;
      const amount = NEEDS.amount.includes(c.actionType) ? num(t("adm.c.amount"), `data-cc="${i}" data-k="amount" data-testid="adm-card-${i}-amount"`, c.amount) : "";
      const amount2 = NEEDS.amount2.includes(c.actionType) ? num(t("adm.c.amount2"), `data-cc="${i}" data-k="amount2" data-testid="adm-card-${i}-amount2"`, c.amount2) : "";
      const target = NEEDS.target.includes(c.actionType) ? `<label><span>${esc(t("adm.c.target"))}</span><select data-cc="${i}" data-k="targetFieldId" data-testid="adm-card-${i}-target">${targets.map((f) => `<option value="${f.id}" ${f.id === c.targetFieldId ? "selected" : ""}>${esc(f.name[I.lang] || f.name.ru)}</option>`).join("")}</select></label>` : "";
      const texts = LANGS.map(([l, L]) => field(L, c.textTemplate[l], `data-cc="${i}" data-k="textTemplate.${l}" data-testid="adm-card-${i}-text-${l}"`)).join("");
      return `<div class="adm-row adm-row--cfg" data-testid="adm-card-${i}"><div class="adm-key">№${i + 1}<small>${esc(c.id)}</small></div><div><div class="adm-nums">${sel}${amount}${amount2}${target}</div><div class="adm-fields">${texts}</div><p class="adm-preview"><b>${esc(t("adm.c.preview"))}:</b> <span data-testid="adm-card-preview-${i}">${esc(preview(c))}</span></p></div></div>`;
    }).join("");
  };

  const render = () => {
    const logged = !!token;
    $("#admin-login").hidden = logged;
    $("#admin-editor").hidden = !logged;
    if (!logged) return;
    document.querySelectorAll("[data-adm-tab]").forEach((b) => b.classList.toggle("is-active", b.dataset.admTab === tab));
    $("#admin-search").hidden = tab !== "ui";
    $("#admin-deck").parentElement.hidden = tab !== "content";
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
    if (tab === "content") html = deck === "fields" ? fieldsEditor() : cardsEditor();
    $("#admin-list").innerHTML = html;
  };

  document.addEventListener("input", (e) => {
    const el = e.target;
    if (el.dataset.text) {
      (content.texts[el.dataset.lang] = content.texts[el.dataset.lang] || {})[el.dataset.text] = el.value;
    } else if (el.dataset.cf != null || el.dataset.cc != null) {
      const target = el.dataset.cf != null ? draft().fields[+el.dataset.cf] : draft().cards[deck][+el.dataset.cc];
      setPath(target, el.dataset.k, el.type === "number" ? Math.max(0, +el.value || 0) : el.value);
      if (el.dataset.cc != null) {
        const pv = document.querySelector(`[data-testid="adm-card-preview-${el.dataset.cc}"]`);
        if (pv) pv.textContent = preview(target);
      }
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
    } else if (e.target.dataset.cc != null && e.target.tagName === "SELECT") render();
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
      if (tab === "content") return ((cc = window.MPConfig.defaults()), render());
      content = { texts: {} };
      I.keys().forEach((k) => LANGS.forEach(([l]) => I.override({ [l]: { [k]: I.original(l, k) } })));
      render();
    }
    if (b.id === "admin-save-btn") {
      try {
        if (tab === "content") {
          await req("PUT", "/admin/content-config", draft());
          window.MPConfig.apply(cc);
          cc = null;
        } else {
          await req("PUT", "/admin/content", content);
          applyContent();
        }
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
  const fillDeck = () => ($("#admin-deck").innerHTML = [["fields", t("adm.fields")], ...DECKS.map((d) => [d, d.replace("_", " · ").toUpperCase()])].map(([v, l]) => `<option value="${v}" ${v === deck ? "selected" : ""}>${esc(l)}</option>`).join(""));
  fillDeck();
  document.addEventListener("langchange", () => fillDeck());
  openFromHash();
})();
