(function () {
  const { t } = window.I18N;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Static config (step 1). Economics are wired in steps 2–4.
  const SCENARIOS = [
    { id: "kap_kap", currencies: ["usd"], start: { usd: 2000 } },
    { id: "kap_nar", currencies: ["usd", "nar"], start: { usd: 2000, nar: 1 } },
    { id: "nar_nar", currencies: ["nar"], start: { nar: 1 } },
    { id: "gos_gos", currencies: ["rub"], start: { rub: 50 } },
    { id: "kap_gos", currencies: ["rub"], start: { rub: 2000 } }, // TODO: confirm start sum with customer
  ];
  const COLORS = ["blue", "violet", "yellow", "red"];
  const BOT_TYPES = ["neutral", "capitalist", "narmonist"];
  const DEFAULT_BOTS = ["neutral", "neutral", "capitalist", "narmonist"];
  const CUR_SIGN = { usd: "$", rub: "₽", nar: "g" };

  const ui = {
    screen: "start",
    mode: "bots",
    scenario: "kap_kap",
    total: 4,
    real: 1,
    names: ["", "", "", ""],
    bots: [...DEFAULT_BOTS],
    draw: null,
  };

  /* ---------- helpers ---------- */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n, cur) => `${cur === "nar" ? n.toFixed(2).replace(".", ",") : Math.round(n).toLocaleString("ru-RU")} ${CUR_SIGN[cur]}`;
  const scn = () => SCENARIOS.find((s) => s.id === ui.scenario);
  const playerName = (i) => (i < ui.real ? ui.names[i].trim() : "") || t(`color.${COLORS[i]}`);
  const rollDie = () => 1 + Math.floor(Math.random() * 6);

  const toast = (msg, type) => {
    const el = document.createElement("div");
    el.className = `toast${type ? " toast--" + type : ""}`;
    el.textContent = msg;
    el.dataset.testid = "toast";
    $("#toasts").appendChild(el);
    setTimeout(() => el.remove(), 3200);
  };

  const openModal = (title, html) => {
    $("#modal-title").textContent = title;
    $("#modal-body").innerHTML = html;
    $("#modal").classList.add("is-open");
    $("#modal").setAttribute("aria-hidden", "false");
  };
  const closeModal = () => {
    $("#modal").classList.remove("is-open");
    $("#modal").setAttribute("aria-hidden", "true");
  };

  /* ---------- router ---------- */
  const go = (name) => {
    ui.screen = name;
    document.body.dataset.screen = name;
    document.body.classList.remove("menu-open");
    $$(".screen").forEach((s) => s.classList.toggle("is-active", s.id === `screen-${name}`));
    if (name === "setup") renderSetup();
    if (name === "draw") renderDraw();
    if (name === "game") renderGame();
    window.scrollTo({ top: 0 });
  };

  /* ---------- setup ---------- */
  const renderScenarios = () => {
    $("#scenario-grid").innerHTML = SCENARIOS.map((s) => `
      <button class="scn-card${s.id === ui.scenario ? " is-active" : ""}" data-scn="${s.id}" data-testid="scenario-card-${s.id}">
        <span class="eyebrow">${t("setup.scenario")}</span>
        <span class="scn-name">${t(`scn.${s.id}.name`)}</span>
        <span class="scn-short">${t(`scn.${s.id}.short`)}</span>
        <span class="chips">${s.currencies.map((c) => `<span class="chip">${t(`cur.${c}`)}</span>`).join("")}</span>
        <span class="scn-cta">${s.id === ui.scenario ? t("setup.chosen") : t("setup.choose")}</span>
      </button>`).join("");
    const s = scn();
    $("#sel-scn-name").textContent = t(`scn.${s.id}.name`);
    $("#sel-scn-desc").textContent = `${t(`scn.${s.id}.short`)} · ${t("setup.currency")}: ${s.currencies.map((c) => t(`cur.${c}`).toLowerCase()).join(", ")}`;
  };

  const renderPlayers = () => {
    $("#val-total").textContent = ui.total;
    $("#val-real").textContent = ui.real;
    $('[data-stepper="total"] [data-step="-1"]').disabled = ui.total <= 2;
    $('[data-stepper="total"] [data-step="1"]').disabled = ui.total >= 4;
    $('[data-stepper="real"] [data-step="-1"]').disabled = ui.real <= 1;
    $('[data-stepper="real"] [data-step="1"]').disabled = ui.real >= ui.total;

    $("#player-rows").innerHTML = Array.from({ length: ui.total }, (_, i) => {
      const isBot = i >= ui.real;
      const color = COLORS[i];
      const field = `<label class="p-field"><span class="p-dot c-${color}"></span>
        <input type="text" maxlength="16" data-name="${i}" value="${isBot ? esc(t(`color.${color}`)) : esc(ui.names[i])}"
          placeholder="${esc(t(`color.${color}`))}" ${isBot ? "disabled" : ""} data-testid="player-name-input-${i}" /></label>`;
      const select = isBot ? `<div class="select"><select data-bot="${i}" data-testid="bot-behavior-select-${i}">
          ${BOT_TYPES.map((b) => `<option value="${b}"${ui.bots[i] === b ? " selected" : ""}>${t(`bot.${b}`)}</option>`).join("")}
        </select></div>` : "";
      return `<div class="p-row${isBot ? " is-bot" : ""}" data-testid="player-row-${i}">${field}${select}</div>`;
    }).join("");
  };

  const renderSetup = () => {
    $$(".tab[data-mode]").forEach((b) => b.classList.toggle("is-active", b.dataset.mode === ui.mode));
    renderScenarios();
    renderPlayers();
  };

  /* ---------- draw (turn order) ---------- */
  const startDraw = () => {
    ui.draw = {
      players: Array.from({ length: ui.total }, (_, i) => ({ idx: i, roll: null, bot: i >= ui.real })),
      cursor: 0,
      done: false,
    };
    go("draw");
  };

  const renderDraw = () => {
    const d = ui.draw;
    const list = d.done ? [...d.players].sort((a, b) => b.roll - a.roll) : d.players;
    $("#draw-sub").textContent = d.done ? t("draw.subDone") : t("draw.sub");
    $("#draw-list").innerHTML = list.map((p, k) => {
      const current = !d.done && k === d.cursor;
      const res = p.roll != null ? `<b>${p.roll}</b>` : current ? t("draw.yourRoll") : t("draw.waiting");
      return `<li class="draw-item${current ? " is-current" : ""}" data-testid="draw-item-${p.idx}">
        <span class="p-dot c-${COLORS[p.idx]}"></span>${esc(playerName(p.idx))}<span class="draw-res">${res}</span></li>`;
    }).join("");
    const btn = $("#btn-draw");
    btn.textContent = d.done ? t("draw.open") : t("draw.roll");
    btn.disabled = false;
  };

  const drawStep = async () => {
    const d = ui.draw;
    if (d.done) return createMatch();
    $("#btn-draw").disabled = true;
    // Roll for the current player, then auto-roll consecutive bots
    do {
      const p = d.players[d.cursor];
      p.roll = rollDie() + rollDie();
      d.cursor += 1;
      renderDraw();
      $("#btn-draw").disabled = true;
      await new Promise((r) => setTimeout(r, 450));
    } while (d.cursor < d.players.length && d.players[d.cursor].bot);
    if (d.cursor >= d.players.length) {
      // Re-roll tied players until every result is unique
      let tied;
      while ((tied = d.players.filter((p) => d.players.some((q) => q !== p && q.roll === p.roll))).length) {
        tied.forEach((p) => (p.roll = rollDie() + rollDie()));
      }
      d.order = [...d.players].sort((a, b) => b.roll - a.roll || a.idx - b.idx).map((p) => p.idx);
      d.done = true;
    }
    renderDraw();
  };

  /* ---------- match (preview shell, full state in step 2) ---------- */
  const createMatch = () => {
    const s = scn();
    ui.match = {
      scenario: s.id,
      turnNo: 1,
      order: ui.draw.order,
      active: 0,
      players: ui.draw.order.map((idx) => ({
        idx,
        name: playerName(idx),
        color: COLORS[idx],
        isBot: idx >= ui.real,
        bot: ui.bots[idx],
        balances: { ...s.start },
      })),
      history: [],
    };
    const h = ui.match.history;
    h.push({ who: null, text: `${t("game.created")}: ${t(`scn.${s.id}.name`)}` });
    ui.match.players.forEach((p) => h.push({ who: p.name, text: `${t("game.startSums")}: ${Object.entries(p.balances).map(([c, v]) => fmt(v, c)).join(" · ")}` }));
    go("game");
  };

  const renderGame = () => {
    const m = ui.match;
    if (!m) return go("start");
    const cur = m.players[m.active];
    $("#turn-no").textContent = m.turnNo;
    $("#players-list").innerHTML = m.players.map((p, i) => `
      <li class="pl-item${i === m.active ? " is-active" : ""}" data-testid="player-card-${p.color}">
        <img src="/assets/img/token-${p.color}.png" alt="" />
        <div><div class="pl-name">${esc(p.name)}</div>
          <div class="pl-bal">${t("game.balance")}: ${Object.entries(p.balances).map(([c, v]) => fmt(v, c)).join(" · ")}</div>
          ${p.isBot ? `<div class="pl-bot">${t(`bot.${p.bot}`)}</div>` : ""}</div>
        ${i === m.active ? `<span class="pl-tag">${t("game.yourTurn")}</span>` : "<span></span>"}
      </li>`).join("");
    $("#center-title").textContent = `${cur.name} · ${t("game.start")}`;
    $("#center-balance").textContent = `${t("game.yourBalance")}: ${Object.entries(cur.balances).map(([c, v]) => fmt(v, c)).join(" / ")}`;
    $("#sector-body").innerHTML = `<img src="/assets/img/obj-cosmoport.png" alt="" /><div><div class="sector-name">Istok Cosmoport</div><div class="sub sub--xs">${t(`scn.${m.scenario}.name`)}</div></div>`;
    $("#history-list").innerHTML = m.history.slice(-12).map((e) => `<li>${e.who ? `<span>${esc(e.who)} · </span>` : ""}${esc(e.text)}</li>`).join("");
    renderBoardPlaceholder();
  };

  const renderBoardPlaceholder = () => {
    const board = $("#board");
    if (board.querySelector(".board-corner")) return;
    const corners = [["tl", "narmonyon", "NARMONYON CENTRARY"], ["tr", "anomaly", "ANOMALY OF PROBABILITY"], ["bl", null, "BLACK HOLE"], ["br", "cosmoport", "ISTOK COSMOPORT"]];
    board.insertAdjacentHTML("beforeend", corners.map(([pos, img, label]) =>
      `<div class="board-corner corner-${pos}" data-testid="board-corner-${pos}"><img src="/assets/img/${img ? "obj-" + img : "blackhole"}.png" alt="" /><span>${label}</span></div>`).join("") +
      `<p class="board-soon" data-i18n="game.boardSoon">${t("game.boardSoon")}</p>`);
  };

  const rollPreview = () => {
    $$("#dice .die").forEach((d) => {
      d.classList.remove("is-rolling");
      void d.offsetWidth;
      d.classList.add("is-rolling");
      d.dataset.face = rollDie();
    });
    const [a, b] = $$("#dice .die").map((d) => +d.dataset.face);
    const m = ui.match;
    m.history.push({ who: m.players[m.active].name, text: `${a} + ${b} = ${a + b}` });
    setTimeout(renderGame, 600);
  };

  /* ---------- events ---------- */
  document.addEventListener("click", (e) => {
    const el = e.target.closest("button, [data-close]");
    if (!el) {
      $(".lang").classList.remove("is-open");
      return;
    }
    if (el.dataset.go) return go(el.dataset.go);
    if (el.dataset.open === "rules") return openModal(t("rules.title"), t("rules.body"));
    if (el.dataset.open === "policy") return openModal(t("policy.title"), t("policy.body"));
    if (el.hasAttribute("data-close")) return closeModal();
    if (el.id === "lang-current") return $(".lang").classList.toggle("is-open");
    if (el.dataset.lang) {
      $(".lang").classList.remove("is-open");
      return window.I18N.setLang(el.dataset.lang);
    }
    if (el.id === "burger") return document.body.classList.toggle("menu-open");
    if (el.dataset.mode) {
      if (el.dataset.mode === "online") return toast(t("setup.onlineSoon"));
      ui.mode = el.dataset.mode;
      return renderSetup();
    }
    if (el.dataset.scn) {
      ui.scenario = el.dataset.scn;
      return renderScenarios();
    }
    if (el.dataset.step) {
      const key = el.closest("[data-stepper]").dataset.stepper;
      const step = +el.dataset.step;
      if (key === "total") ui.total = Math.min(4, Math.max(2, ui.total + step));
      else ui.real = Math.min(ui.total, Math.max(1, ui.real + step));
      ui.real = Math.min(ui.real, ui.total);
      return renderPlayers();
    }
    if (el.id === "btn-to-draw") {
      const missing = ui.names.slice(0, ui.real).some((n) => !n.trim());
      if (missing && ui.real > 1) return toast(t("setup.nameRequired"), "error");
      return startDraw();
    }
    if (el.id === "btn-draw") return drawStep();
    if (el.id === "btn-roll") return rollPreview();
    if (el.dataset.paneBtn) {
      $("#screen-game").dataset.paneActive = el.dataset.paneBtn;
      $$(".mobile-tabs button").forEach((b) => b.classList.toggle("is-active", b === el));
      return;
    }
    if (["btn-finish-game", "btn-bonus", "btn-game-menu", "btn-all-history"].includes(el.id)) return toast(t("game.notYet"));
  });

  document.addEventListener("input", (e) => {
    if (e.target.dataset.name != null) ui.names[+e.target.dataset.name] = e.target.value;
  });
  document.addEventListener("change", (e) => {
    if (e.target.dataset.bot != null) ui.bots[+e.target.dataset.bot] = e.target.value;
  });
  document.addEventListener("keydown", (e) => e.key === "Escape" && closeModal());

  document.addEventListener("langchange", (e) => {
    const map = { ru: "RU", en: "EN", uk: "UA" };
    $("#lang-current").textContent = map[e.detail];
    $$(".lang-list [data-lang]").forEach((b) => b.classList.toggle("is-active", b.dataset.lang === e.detail));
    if (ui.screen !== "start") go(ui.screen);
  });

  /* ---------- PWA ---------- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }

  /* ---------- init ---------- */
  $("#screen-game").dataset.paneActive = "board";
  window.I18N.apply();
  document.dispatchEvent(new CustomEvent("langchange", { detail: window.I18N.lang }));
  go("start");
  window.MP = { ui, go }; // debug hook
})();
