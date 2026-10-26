(function () {
  const { t } = window.I18N;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // UI-level scenario list; economic rules live in MPState.SCENARIO_RULES
  const SCENARIOS = [
    { id: "kap_kap", currencies: ["usd"] },
    { id: "kap_nar", currencies: ["usd", "nar"] },
    { id: "nar_nar", currencies: ["nar"] },
    { id: "gos_gos", currencies: ["rub"] },
    { id: "kap_gos", currencies: ["rub"] },
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
    if (name === "start") $("#btn-continue").hidden = !localStorage.getItem("mp.match");
    if (name === "start" && window.MPNet) window.MPNet.renderRejoin();
    if (name === "setup") renderSetup();
    if (name === "draw") renderDraw();
    if (name === "game") renderGame();
    if (name === "game") window.MPGame.scheduleBot();
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
    $('[data-stepper="real"] [data-step="-1"]').disabled = ui.real <= (ui.mode === "online" ? 2 : 1);
    $("#btn-to-draw").textContent = ui.mode === "online" ? t("net.create") : t("setup.toDraw");
    $('[data-stepper="real"] [data-step="1"]').disabled = ui.real >= ui.total;

    $("#player-rows").innerHTML = Array.from({ length: ui.total }, (_, i) => {
      const isBot = i >= ui.real;
      const remote = ui.mode === "online" && i > 0 && !isBot;
      const color = COLORS[i];
      const field = `<label class="p-field"><span class="p-dot c-${color}"></span>
        <input type="text" maxlength="16" data-name="${i}" value="${isBot ? esc(t(`color.${color}`)) : esc(ui.names[i])}"
          placeholder="${esc(remote ? t("net.waiting") : t(`color.${color}`))}" ${isBot || remote ? "disabled" : ""} data-testid="player-name-input-${i}" /></label>`;
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

  /* ---------- match (state lives in MPState.Match) ---------- */
  const { Match } = window.MPState;
  const balances = (p, sep = " · ") => ui.match.currencies.map((c) => fmt(p.wallet.get(c), c)).join(sep);
  const moneyText = (list) => list.map(({ cur, amount }) => `${amount > 0 ? "+" : "−"}${fmt(Math.abs(amount), cur)}`).join(" · ");

  const histText = (e) => {
    const params = { ...e.params };
    Object.keys(params).forEach((k) => {
      const v = params[k];
      if (typeof v !== "string") return;
      if (v.startsWith("@")) params[k] = t(v.slice(1));
      if (v.startsWith("#") && window.MPBoard.cells[v.slice(1)]) params[k] = window.MPBoard.name(v.slice(1), window.I18N.lang);
    });
    return t(e.key, params) + (e.money ? ` ${moneyText(e.money)}` : "");
  };
  const histItem = (e) => {
    const p = e.playerId && ui.match.player(e.playerId);
    return `<li data-testid="history-entry">${p ? `<span>${esc(p.name)} · </span>` : ""}${esc(histText(e))}</li>`;
  };

  const attach = (m) => {
    ui.match = m;
    window.MPGame.attach(m);
    m.addEventListener("change", () => {
      if (ui.match !== m) return;
      if (m.online) window.MPNet.push(m);
      if (ui.screen === "game") renderGame();
      window.MPGame.scheduleBot();
    });
  };

  const createMatch = () => {
    const s = scn();
    const players = ui.draw.order.map((idx) => ({
      idx,
      name: playerName(idx),
      color: COLORS[idx],
      isBot: idx >= ui.real,
      botType: idx >= ui.real ? ui.bots[idx] : null,
    }));
    attach(Match.create({ scenario: s.id, currencies: s.currencies, players }));
    go("game");
  };

  const resumeMatch = () => {
    const m = Match.load();
    if (!m) return;
    attach(m);
    go("game");
  };

  const renderGame = () => {
    const m = ui.match;
    if (!m) return go("start");
    const cur = m.current;
    $("#turn-no").textContent = m.roundNo; // a turn = every player has rolled once; doubles stay in the same turn
    $("#gold-price").textContent = m.bank.goldPrice.toLocaleString("ru-RU");
    $("#players-list").innerHTML = m.players.map((p, i) => `
      <li class="pl-item${i === m.active ? " is-active" : ""}" data-testid="player-card-${p.color}">
        <img src="/assets/img/token-${p.color}.png" alt="" />
        <div><div class="pl-name">${esc(p.name)}</div>
          <div class="pl-bal" data-testid="player-balance-${p.color}">${t("game.balance")}: ${balances(p)}</div>
          ${p.isBot ? `<div class="pl-bot">${t(`bot.${p.botType}`)}</div>` : ""}
          ${p.status === "benefit" ? `<div class="pl-status" data-testid="player-status-${p.color}">${t("game.onBenefit")}</div>` : ""}</div>
        ${i === m.active ? `<span class="pl-tag">${m.online && p.idx !== window.MPNet.session?.seat ? t("game.plays") : t("game.yourTurn")}</span>` : "<span></span>"}
      </li>`).join("");
    $("#center-title").textContent = `${cur.name} · ${window.MPBoard.name(cur.cell, window.I18N.lang)}`;
    $("#center-balance").textContent = `${t("game.yourBalance")}: ${balances(cur, " / ")}`;
    const r = m.lastRoll;
    const ur = m.turnState && m.turnState.utilRoll;
    $("#roll-result").innerHTML = ur ? `${ur.a} + ${ur.b} = ${ur.sum}` : r ? `${r.a} + ${r.b} = ${r.sum}${r.double ? `<em>${t("game.double")}</em>` : ""}` : "";
    $("#history-list").innerHTML = m.history.recent(80).map(histItem).join("");
    $("#history-list").scrollTop = 1e6;
    window.MPGame.render();
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
    if (el.id === "burger") return ui.screen === "game" && ui.match ? window.MPGame.menu() : window.MPGame.siteMenu();
    if (el.dataset.mode) {
      ui.mode = el.dataset.mode;
      if (ui.mode === "online") ui.real = Math.max(2, ui.real);
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
      else ui.real = Math.min(ui.total, Math.max(ui.mode === "online" ? 2 : 1, ui.real + step));
      if (ui.mode === "online") ui.real = Math.max(2, Math.min(ui.real, ui.total));
      ui.real = Math.min(ui.real, ui.total);
      return renderPlayers();
    }
    if (el.id === "btn-to-draw" && ui.mode === "online") {
      if (!ui.names[0].trim()) return toast(t("setup.nameRequired"), "error");
      return window.MPNet.createRoom({ scenario: ui.scenario, total: ui.total, real: ui.real, bots: ui.bots, hostName: ui.names[0].trim() }).catch((err) => toast(err.message, "error"));
    }
    if (el.id === "btn-to-draw") {
      const missing = ui.names.slice(0, ui.real).some((n) => !n.trim());
      if (missing && ui.real > 1) return toast(t("setup.nameRequired"), "error");
      return startDraw();
    }
    if (el.id === "btn-draw") return drawStep();
    if (el.id === "btn-continue") return resumeMatch();
    if (el.id === "btn-all-history") return openModal(t("game.history"), `<ul class="history-list history-list--full" data-testid="full-history-list">${ui.match.history.entries.map(histItem).join("")}</ul>`);
    if (el.dataset.paneBtn) {
      $("#screen-game").dataset.paneActive = el.dataset.paneBtn;
      $$(".mobile-tabs button").forEach((b) => b.classList.toggle("is-active", b === el));
      return;
    }
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
  // Replace local state with the room state received from the server
  const applyRemote = (state) => {
    const m = new Match(state);
    m.online = true;
    attach(m);
    if (ui.screen === "lobby") go("game");
    else if (ui.screen === "game") renderGame();
    window.MPGame.scheduleBot();
  };
  // Host: draw order and start the online match
  const startOnline = (room) => {
    const s = SCENARIOS.find((x) => x.id === room.scenario);
    const order = [...room.seats].map((st) => ({ st, roll: Math.random() })).sort((a, b) => b.roll - a.roll).map((x) => x.st);
    const players = order.map((st) => ({ idx: st.idx, name: st.name || t(`color.${st.color}`), color: st.color, isBot: st.isBot, botType: st.botType }));
    const m = Match.create({ scenario: s.id, currencies: s.currencies, players });
    Match.clear();
    return JSON.parse(JSON.stringify(m));
  };
  const renderSoundBtn = () => $("#btn-sound").classList.toggle("is-off", !window.MPSound.on);
  renderSoundBtn();
  window.MPApp = { toast, renderGame, go, applyRemote, startOnline, esc, renderSoundBtn };
  window.MP = { ui, go }; // debug hook
})();
