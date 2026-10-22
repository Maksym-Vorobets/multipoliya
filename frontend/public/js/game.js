(function () {
  const B = window.MPBoard;
  const E = window.MPEco;
  const { t } = window.I18N;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const lang = () => window.I18N.lang;
  const CUR_SIGN = { usd: "$", rub: "₽", nar: "g" };
  const fmt = (n, cur) => `${cur === "nar" ? (+n).toFixed(2).replace(".", ",") : Math.round(n).toLocaleString("ru-RU")} ${CUR_SIGN[cur]}`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const COLOR_HEX = { blue: "#2fb5e8", violet: "#a865e8", yellow: "#f6c845", red: "#ec4f63" };

  // UI + history texts [ru, uk, en]
  window.I18N.extend({
    "g.chooseSector": ["Выберите сектор", "Оберіть сектор", "Choose a sector"], "g.confirmMove": ["Подтвердить ход", "Підтвердити хід", "Confirm move"],
    "g.cellActions": ["Действия по клетке", "Дії на клітинці", "Cell actions"], "g.back": ["Вернуться к полю", "Повернутися до поля", "Back to board"],
    "g.price": ["Стоимость", "Вартість", "Price"], "g.module": ["Модуль", "Модуль", "Module"], "g.dome": ["Купол", "Купол", "Dome"],
    "g.rent": ["Аренда", "Оренда", "Rent"], "g.buildings": ["Постройки", "Будівлі", "Buildings"], "g.owners": ["Владельцы", "Власники", "Owners"],
    "g.none": ["нет", "немає", "none"], "g.mustAct": ["Сначала выполните обязательное действие на клетке", "Спочатку виконайте обов'язкову дію на клітинці", "Resolve the mandatory cell action first"],
    "g.noFunds": ["Недостаточно средств", "Недостатньо коштів", "Insufficient funds"], "g.toPay": ["К оплате", "До сплати", "To pay"],
    "g.available": ["Доступно", "Доступно", "Available"], "g.takeLoan": ["Взять кредит", "Взяти кредит", "Take a loan"],
    "g.goBenefit": ["Оплатить всё, что есть («На пособии»)", "Сплатити все, що є («На допомозі»)", "Pay what you have (benefit)"],
    "g.useAssets": ["Заложить / продать объекты", "Закласти / продати об'єкти", "Mortgage / sell objects"],
    "g.auction": ["Аукцион", "Аукціон", "Auction"], "g.bid": ["Сделать ставку", "Зробити ставку", "Place bid"], "g.pass": ["Отказаться", "Відмовитися", "Pass"],
    "g.highest": ["Текущая ставка", "Поточна ставка", "Highest bid"], "g.start": ["Стартовая стоимость", "Стартова вартість", "Start price"],
    "g.vote": ["Голосование", "Голосування", "Voting"], "g.yes": ["За", "За", "For"], "g.no": ["Против", "Проти", "Against"],
    "g.voter": ["Голосует", "Голосує", "Voter"], "g.bidder": ["Участник", "Учасник", "Bidder"], "g.initiator": ["Инициатор", "Ініціатор", "Initiator"], "g.source": ["Источник средств", "Джерело коштів", "Source of funds"],
    "g.bank": ["Банк", "Банк", "Bank"], "g.joint": ["Совместная покупка", "Спільна купівля", "Joint purchase"], "g.partners": ["Выберите участников", "Оберіть учасників", "Choose partners"],
    "g.confirm": ["Подтвердить", "Підтвердити", "Confirm"], "g.join": ["Участвовать", "Брати участь", "Join"], "g.part": ["Ваша часть", "Ваша частина", "Your part"],
    "g.anomaly": ["Аномалия вероятности: чётная сумма — к ближайшей Chance, нечётная — к Borgi", "Аномалія ймовірності: парна сума — до найближчої Chance, непарна — до Borgi", "Anomaly: even sum — nearest Chance, odd — nearest Borgi"],
    "g.card": ["Карточки Chance и Borgi подключаются на шаге 5", "Картки Chance і Borgi підключаються на кроці 5", "Chance and Borgi cards arrive in step 5"],
    "g.bh": ["Вы в Black Hole. Заплатите штраф, чтобы ходить, или пропустите ход.", "Ви в Black Hole. Сплатіть штраф, щоб ходити, або пропустіть хід.", "You are in the Black Hole. Pay a fine to move or skip the turn."],
    "g.payFine": ["Заплатить штраф", "Сплатити штраф", "Pay fine"], "g.skip": ["Пропустить ход", "Пропустити хід", "Skip turn"],
    "g.player": ["Игрок", "Гравець", "Player"], "g.share": ["Доля / цена", "Частка / ціна", "Share / price"], "g.income": ["Доход до", "Дохід до", "Income"],
    "g.sell": ["Продать", "Продати", "Sell"], "g.mortgage": ["Залог/выкуп", "Застава/викуп", "Mortgage"], "g.tender": ["Тендер", "Тендер", "Tender"],
    "g.collect": ["Взыскать аренду", "Стягнути оренду", "Collect rent"], "g.loan": ["Кредит", "Кредит", "Loan"], "g.repay": ["Погасить кредит", "Погасити кредит", "Repay loan"],
    "g.debt": ["Долг", "Борг", "Debt"], "g.limit": ["Лимит", "Ліміт", "Limit"], "g.noProps": ["Пока нет объектов", "Поки немає об'єктів", "No objects yet"],
    "g.unavailable": ["Эта клетка недоступна для текущего хода", "Ця клітинка недоступна для поточного ходу", "This cell is not available this turn"],
    "g.amount": ["Сумма", "Сума", "Amount"], "g.on": ["вкл", "увімк", "on"], "g.off": ["выкл", "вимк", "off"],
    "g.build": ["Строительство", "Будівництво", "Construction"], "g.life": ["Уровень жизни", "Рівень життя", "Living standard"],
    "h.move": ["Ход: {from} → {to}", "Хід: {from} → {to}", "Move: {from} → {to}"], "h.buy": ["Покупка {cell}:", "Купівля {cell}:", "Bought {cell}:"],
    "h.rent": ["Аренда {cell} → {to}:", "Оренда {cell} → {to}:", "Rent {cell} → {to}:"], "h.selfRent": ["Аренда на своём объекте {cell}:", "Оренда на своєму об'єкті {cell}:", "Own rent {cell}:"],
    "h.module": ["Постройка модуля {cell}:", "Будівництво модуля {cell}:", "Module built {cell}:"], "h.dome": ["Постройка купола {cell}:", "Будівництво купола {cell}:", "Dome built {cell}:"],
    "h.gosPayout": ["Выплата за строительство {cell}:", "Виплата за будівництво {cell}:", "Construction payout {cell}:"],
    "h.rentOrd": ["Обычная аренда {cell}", "Звичайна оренда {cell}", "Ordinary rent {cell}"], "h.rentDouble": ["Двойная аренда {cell}:", "Подвійна оренда {cell}:", "Double rent {cell}:"],
    "h.narRent": ["Аренда в фонд {cell}:", "Оренда до фонду {cell}:", "Rent to fund {cell}:"], "h.narSupport": ["Доплата системы до минимальной аренды:", "Доплата системи до мінімальної оренди:", "System top-up to minimum rent:"],
    "h.tender": ["Тендер {cell} (заказчик {to}), премия:", "Тендер {cell} (замовник {to}), премія:", "Tender {cell} (owner {to}), bonus:"],
    "h.tenderFail": ["Тендер {cell} не выполнен: у владельца нет средств", "Тендер {cell} не виконано: у власника немає коштів", "Tender {cell} failed: owner lacks funds"],
    "h.auctionWin": ["Победа в аукционе {cell}:", "Перемога в аукціоні {cell}:", "Won auction {cell}:"], "h.auctionNone": ["Аукцион {cell}: ставок нет", "Аукціон {cell}: ставок немає", "Auction {cell}: no bids"],
    "h.jointPart": ["Доля в совместной покупке {cell}:", "Частка у спільній купівлі {cell}:", "Joint purchase share {cell}:"],
    "h.premium": ["Премия за строительство {cell}:", "Премія за будівництво {cell}:", "Construction premium {cell}:"],
    "h.vote": ["Голосование {cell}: {yes} за / {no} против — {res}", "Голосування {cell}: {yes} за / {no} проти — {res}", "Vote {cell}: {yes} for / {no} against — {res}"],
    "h.accepted": ["принято", "прийнято", "accepted"], "h.rejected": ["не принято", "не прийнято", "rejected"],
    "h.mortgage": ["Залог {cell}:", "Застава {cell}:", "Mortgaged {cell}:"], "h.unmortgage": ["Выкуп из залога {cell}:", "Викуп із застави {cell}:", "Redeemed {cell}:"],
    "h.sell": ["Продажа банку {cell}:", "Продаж банку {cell}:", "Sold to bank {cell}:"], "h.loan": ["Кредит:", "Кредит:", "Loan:"],
    "h.loanRepay": ["Погашение кредита:", "Погашення кредиту:", "Loan repaid:"], "h.loanPay": ["Платёж по кредиту:", "Платіж за кредитом:", "Loan payment:"],
    "h.tax": ["Обязательный платёж {cell}:", "Обов'язковий платіж {cell}:", "Mandatory payment {cell}:"], "h.grant": ["Грант {cell}:", "Грант {cell}:", "Grant {cell}:"],
    "h.narmonyon": ["Narmonyon Centrary:", "Narmonyon Centrary:", "Narmonyon Centrary:"], "h.blackhole": ["Попадание в Black Hole", "Потрапляння в Black Hole", "Entered the Black Hole"],
    "h.bhFine": ["Штраф за выход из Black Hole:", "Штраф за вихід з Black Hole:", "Black Hole exit fine:"], "h.bhSkip": ["Пропуск хода в Black Hole", "Пропуск ходу в Black Hole", "Skipped turn in Black Hole"],
    "h.gosIncome": ["Начисление Госмонии:", "Нарахування Госмонії:", "Gosmonia accrual:"], "h.refund": ["Возврат аренды {cell}:", "Повернення оренди {cell}:", "Rent refund {cell}:"],
    "h.kapTax": ["Налог Капмонии (собственность + прибыль):", "Податок Капмонії (власність + прибуток):", "Kapmonia tax (property + profit):"],
    "h.narTax": ["Налог Нармонии:", "Податок Нармонії:", "Narmonia tax:"], "h.narTaxBack": ["Возврат налога Нармонии:", "Повернення податку Нармонії:", "Narmonia tax refund:"],
    "h.gosNorm": ["Норма строительства не выполнена — Black Hole", "Норму будівництва не виконано — Black Hole", "Construction quota missed — Black Hole"],
    "h.writeOff": ["Списано всё доступное, статус «На пособии»:", "Списано все доступне, статус «На допомозі»:", "All funds taken, status: benefit:"],
    "ad.title": ["Реклама", "Реклама", "Advertisement"], "ad.reward": ["Бонус", "Бонус", "Bonus"], "ad.watching": ["Идёт просмотр рекламы…", "Триває перегляд реклами…", "Ad is playing…"],
    "ad.done": ["Просмотр завершён", "Перегляд завершено", "Ad finished"], "ad.claim": ["Получить бонус", "Отримати бонус", "Claim bonus"], "ad.cancel": ["Реклама не досмотрена — бонус не начислен", "Рекламу не додивилися — бонус не нараховано", "Ad not finished — no bonus"],
    "ad.ok": ["Бонус начислен", "Бонус нараховано", "Bonus credited"], "ad.cur": ["Валюта", "Валюта", "Currency"], "ad.after": ["Баланс после начисления", "Баланс після нарахування", "Balance after"],
    "ad.once": ["Бонус доступен один раз за круг ходов", "Бонус доступний один раз за коло ходів", "Bonus is available once per round"],
    "h.adBonus": ["Бонус за просмотр рекламы:", "Бонус за перегляд реклами:", "Ad bonus:"], "h.finished": ["Партия завершена. Победитель: {names}", "Партію завершено. Переможець: {names}", "Match finished. Winner: {names}"],
    "r.confirmTitle": ["Завершить партию?", "Завершити партію?", "Finish the match?"], "r.confirmSub": ["Система подсчитает «Строительство», «Уровень жизни» и «Капитал» и определит победителя.", "Система підрахує «Будівництво», «Рівень життя» і «Капітал» та визначить переможця.", "The system will score Construction, Living standard and Capital and pick the winner."],
    "r.finish": ["Подвести итоги", "Підбити підсумки", "Show results"], "r.build": ["Строительство", "Будівництво", "Construction"], "r.life": ["Уровень жизни", "Рівень життя", "Living standard"],
    "r.capital": ["Капитал", "Капітал", "Capital"], "r.place": ["место", "місце", "place"], "r.winner": ["Победитель", "Переможець", "Winner"], "r.draw": ["Ничья", "Нічия", "Draw"],
    "r.title": ["Итоги партии", "Підсумки партії", "Match results"], "menu.home": ["Главный экран", "Головний екран", "Main screen"],
    "h.anomaly": ["Аномалия: {a} + {b} = {sum}", "Аномалія: {a} + {b} = {sum}", "Anomaly: {a} + {b} = {sum}"],
  });

  let m = null;
  let selected = null; // destination chosen, awaiting confirm
  let busy = false; // animation / dialog in progress
  let panelPlayer = null;
  const animating = new Set();
  const nm = (id) => B.name(id, lang());
  const net = () => (m && m.online && window.MPNet.session) || null;
  const isLocalHuman = (p) => !p.isBot && (!net() || p.idx === net().seat);
  const isDriver = () => (m.current.isBot ? !net() || net().seat === 0 : isLocalHuman(m.current));
  // Ask a human player: locally or via the room (remote device)
  const ask = (p, spec) => (isLocalHuman(p) || !net() ? dialog(spec) : window.MPNet.prompt(p.idx, spec));

  /* ================= Dialog (promise-based modal) ================= */
  let dlgResolve = null;
  let dlgValues = [];
  let dlgClosable = true;
  const dialog = ({ title, sub, rows = [], html = "", buttons = [], closable = true }) =>
    new Promise((resolve) => {
      dlgResolve = resolve;
      dlgValues = buttons.map((b) => b.value);
      dlgClosable = closable;
      $("#modal-title").textContent = title;
      $(".modal-x").style.display = closable ? "" : "none";
      $("#modal-body").innerHTML = `${sub ? `<p class="dlg-sub">${esc(sub)}</p>` : ""}
        ${rows.length ? `<dl class="dlg-rows">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join("")}</dl>` : ""}${html}
        <div class="dlg-btns">${buttons.map((b, i) => `<button class="btn ${b.primary ? "btn--primary" : ""}" data-dlg="${i}" ${b.disabled ? "disabled" : ""} data-testid="${b.testid || "dlg-btn-" + i}">${esc(b.label)}</button>`).join("")}</div>`;
      $("#modal").classList.add("is-open");
    });
  const closeDialog = (value) => {
    $("#modal").classList.remove("is-open");
    $(".modal-x").style.display = "";
    const r = dlgResolve;
    dlgResolve = null;
    if (r) r(value);
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-dlg]");
    if (b && dlgResolve) {
      const v = dlgValues[+b.dataset.dlg];
      closeDialog(typeof v === "function" ? v() : v && v.valueFrom ? +$(v.valueFrom).value : v);
    } else if (e.target.closest("[data-close]") && dlgResolve) {
      e.stopPropagation();
      if (dlgClosable) closeDialog(null);
    }
  }, true);
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !dlgResolve) return;
    e.stopPropagation();
    if (dlgClosable) closeDialog(null);
  }, true);

  /* ================= Board rendering ================= */
  const slotPlace = (pos) => {
    if (pos < 10) return { row: 11, col: 11 - pos, dir: "bottom" };
    if (pos < 20) return { row: 11 - (pos - 10), col: 1, dir: "left" };
    if (pos < 30) return { row: 1, col: pos - 20 + 1, dir: "top" };
    return { row: pos - 30 + 1, col: 11, dir: "right" };
  };
  const cellInner = (id) => {
    const c = B.cells[id];
    const a = B.art(id);
    let body;
    if (c.kind === "chance") body = `<span class="glyph glyph--chance">?</span>`;
    else if (c.kind === "borgi") body = `<span class="glyph glyph--borgi">ᗑ</span>`;
    else if (c.kind === "station") body = `<span class="glyph glyph--station"></span>`;
    else if (c.kind === "tax" || c.kind === "grant") body = `<span class="glyph glyph--ship">✦</span>`;
    else body = `<img src="/assets/img/${a.img}.png" alt="" style="${a.hue ? `filter:hue-rotate(${a.hue}deg)` : ""}" />`;
    return `<span class="cell-ring">1${c.ring}</span>${body}<span class="cell-marks"></span>`;
  };
  const renderBoard = () => {
    const board = $("#board");
    if (board.dataset.built === "1") return updateBoard();
    board.dataset.built = "1";
    $$(".board-corner, .board-soon", board).forEach((e) => e.remove());
    let html = "";
    B.order.forEach((ids, pos) => {
      if (B.CORNERS[pos]) {
        const id = ids[0];
        const pl = { 0: [11, 11], 10: [11, 1], 20: [1, 1], 30: [1, 11] }[pos];
        html += `<button class="corner cell" data-cell="${id}" style="grid-row:${pl[0]};grid-column:${pl[1]}" data-testid="cell-${id}">
          <img src="/assets/img/${B.art(id).img}.png" alt="" /><span>${nm(id).toUpperCase()}</span><span class="cell-marks"></span></button>`;
        return;
      }
      const { row, col, dir } = slotPlace(pos);
      const c1 = B.cells[ids[0]];
      const gcol = c1.group != null ? B.GROUPS[c1.group][2] : "var(--surface-3)";
      html += `<div class="slot slot--${dir}" style="grid-row:${row};grid-column:${col}">
        <span class="slot-label${c1.group == null ? " slot-label--neutral" : ""}" style="--g:${gcol}">${c1.label}</span>
        <button class="cell" data-cell="${ids[0]}" data-testid="cell-${ids[0]}">${cellInner(ids[0])}</button>
        <button class="cell" data-cell="${ids[1]}" data-testid="cell-${ids[1]}">${cellInner(ids[1])}</button></div>`;
    });
    board.insertAdjacentHTML("afterbegin", html);
    board.insertAdjacentHTML("beforeend", `<div class="tokens" id="tokens"><svg class="route" id="route" data-testid="route-preview"><polyline points="" /></svg></div>`);
    board.addEventListener("mouseover", (e) => {
      const el = e.target.closest(".cell.is-option");
      if (el) drawRoute(el.dataset.cell);
    });
    board.addEventListener("mouseout", (e) => e.target.closest(".cell.is-option") && drawRoute(selected));
    new ResizeObserver(() => placeTokens()).observe(board);
    updateBoard();
  };
  const updateBoard = () => {
    const opts = m.moveOptions ? m.moveOptions.map((o) => o.id) : [];
    $$("#board .cell").forEach((el) => {
      const id = el.dataset.cell;
      const s = m.cells[id];
      el.classList.toggle("is-option", opts.includes(id));
      el.classList.toggle("is-selected", selected === id);
      el.classList.toggle("is-current", m.current.cell === id);
      const marks = $(".cell-marks", el);
      if (!s || !marks) return;
      const owners = Object.keys(s.owners).map((pid) => m.player(pid)).filter(Boolean);
      const lvl = s.dome ? 5 : s.modules;
      marks.innerHTML = `${owners.map((o) => `<i style="background:${COLOR_HEX[o.color]}"></i>`).join("")}${lvl ? `<b>${s.dome ? "◉" : lvl}</b>` : ""}${s.mortgaged ? "<em>×</em>" : ""}`;
      el.style.setProperty("--own", owners.length === 1 ? COLOR_HEX[owners[0].color] : s.built ? "var(--m-gos)" : owners.length ? "var(--m-nar)" : "transparent");
      el.classList.toggle("is-owned", owners.length > 0 || s.built);
    });
    renderTokens();
    drawRoute(selected);
  };
  // Dashed preview of the route to a highlighted cell
  const drawRoute = (id) => {
    const line = $("#route polyline");
    if (!line) return;
    const opt = id && m.moveOptions && m.moveOptions.find((o) => o.id === id);
    if (!opt) return line.setAttribute("points", "");
    const p = m.current;
    const pts = [p.cell, ...opt.path].map((c) => {
      const { x, y } = cellCenter(c);
      return `${x},${y}`;
    });
    line.setAttribute("points", pts.join(" "));
  };
  const cellCenter = (cellId) => {
    const board = $("#board");
    const r = $(`[data-cell="${cellId}"]`, board).getBoundingClientRect();
    const br = board.getBoundingClientRect();
    return { x: r.left - br.left + r.width / 2, y: r.top - br.top + r.height / 2 };
  };
  const tokenXY = (p, cellId) => {
    const board = $("#board");
    const el = $(`[data-cell="${cellId}"]`, board);
    if (!el) return { x: 0, y: 0 };
    const br = board.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const same = m.players.filter((q) => q.cell === cellId);
    const k = Math.max(0, same.indexOf(p));
    const off = (k - (same.length - 1) / 2) * Math.min(10, r.width / 5);
    return { x: r.left - br.left + r.width / 2 + off, y: r.top - br.top + r.height / 2 };
  };
  const renderTokens = () => {
    const layer = $("#tokens");
    if (!layer) return;
    m.players.forEach((p) => {
      let tk = $(`[data-token="${p.id}"]`, layer);
      if (!tk) {
        layer.insertAdjacentHTML("beforeend", `<img class="token" data-token="${p.id}" src="/assets/img/token-${p.color}.png" alt="" data-testid="token-${p.color}" />`);
        tk = $(`[data-token="${p.id}"]`, layer);
      }
      tk.classList.toggle("is-active", p === m.current);
    });
    placeTokens();
  };
  const placeTokens = () => {
    if (!m) return;
    m.players.forEach((p) => {
      if (animating.has(p.id)) return;
      const tk = $(`[data-token="${p.id}"]`);
      if (!tk) return;
      const { x, y } = tokenXY(p, p.cell);
      tk.style.transform = `translate(${x}px, ${y}px) translate(-50%, -80%)`;
    });
  };
  // Smoothly walk the token through every cell of the route
  const animatePath = async (p, path) => {
    const tk = $(`[data-token="${p.id}"]`);
    animating.add(p.id);
    for (const id of path) {
      const { x, y } = tokenXY(p, id);
      if (tk) tk.style.transform = `translate(${x}px, ${y}px) translate(-50%, -80%)`;
      await wait(230);
    }
    animating.delete(p.id);
  };

  /* ================= Info panels ================= */
  const cellRows = (id) => {
    const c = B.cells[id];
    const mdl = E.model(m, id);
    if (!mdl) return [];
    const s = E.st(m, id);
    const fc = E.fiatCur(m);
    const cur = m.scenario === "nar_nar" ? "usd" : fc;
    const rows = [[t("g.price"), fmt(E.price(m, id), cur)]];
    if (c.build) rows.push([t("g.module"), fmt(E.buildCost(m, id), cur)], [t("g.dome"), fmt(E.buildCost(m, id, "dome"), cur)]);
    if (Object.keys(s.owners).length || mdl === "gos") rows.push([t("g.rent"), fmt(E.rentFor(m, id), cur)]);
    if (c.build) rows.push([t("g.buildings"), `${s.dome ? 5 : s.modules} / 5`]);
    return rows;
  };
  const renderSector = (id = m.current.cell) => {
    const a = B.art(id);
    const s = m.cells[id];
    const icon = a ? `<img src="/assets/img/${a.img}.png" alt="" style="${a.hue ? `filter:hue-rotate(${a.hue}deg)` : ""}" />` : `<span class="glyph glyph--big">${B.cells[id].kind === "chance" ? "?" : B.cells[id].kind === "borgi" ? "ᗑ" : "✦"}</span>`;
    const owners = m.players.map((p) => `<li><img src="/assets/img/token-${p.color}.png" alt="" />${esc(p.name)}<b>${s && s.owners[p.id] ? Math.round(s.owners[p.id] * 100) : 0}%</b></li>`).join("");
    $("#sector-body").innerHTML = `<div class="sector-head">${icon}<div><div class="sector-name" data-testid="sector-name">${esc(nm(id))}</div>
      <div class="sub sub--xs" data-testid="sector-status">${E.statusLabel(m, id) || t(`scn.${m.scenario}.name`)}</div></div></div>
      ${E.model(m, id) ? `<div class="sector-grid"><ul class="sector-owners">${owners}</ul><dl class="dlg-rows">${cellRows(id).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl></div>` : ""}`;
  };
  const renderProps = () => {
    const humans = m.players.filter((p) => isLocalHuman(p));
    const p = (isLocalHuman(m.current) ? m.current : null) || humans.find((h) => h.id === panelPlayer) || humans[0];
    if (!p) return ($("#props-panel").innerHTML = "");
    panelPlayer = p.id;
    const ids = E.ownedCells(m, p);
    const fc = E.fiatCur(m);
    const kap = m.scenario.startsWith("kap");
    const rows = ids.map((id) => {
      const s = m.cells[id];
      const own = E.soleOwner(s) === p.id && E.model(m, id) === "kap";
      return `<tr data-testid="prop-row-${id}"><td>${esc(nm(id))}</td><td>${s.dome ? 5 : s.modules}/5</td><td>${Math.round(s.owners[p.id] * 100)}% / ${fmt(E.price(m, id), m.scenario === "nar_nar" ? "usd" : fc)}</td><td>${fmt(E.rentFor(m, id), m.scenario === "nar_nar" ? "usd" : fc)}</td></tr>
        ${own ? `<tr class="prop-acts"><td colspan="4">
          <button class="chipbtn" data-prop="mortgage" data-id="${id}" data-testid="prop-mortgage-${id}">${t("g.mortgage")}</button>
          <button class="chipbtn" data-prop="sell" data-id="${id}" data-testid="prop-sell-${id}">${t("g.sell")}</button>
          <button class="chipbtn${s.tender ? " is-on" : ""}" data-prop="tender" data-id="${id}" data-testid="prop-tender-${id}">${t("g.tender")}: ${s.tender ? t("g.on") : t("g.off")}</button>
          <button class="chipbtn${s.collect ? " is-on" : ""}" data-prop="collect" data-id="${id}" data-testid="prop-collect-${id}">${t("g.collect")}: ${s.collect ? t("g.on") : t("g.off")}</button></td></tr>` : ""}`;
    }).join("");
    const debt = p.loans.reduce((a, l) => a + l.debt, 0);
    $("#props-panel").innerHTML = `<div class="panel-head"><span class="eyebrow eyebrow--gold">${t("g.player")}: ${esc(p.name)}</span></div>
      <div class="stat-line"><span>${t("g.build")}: <b>${fmt(p.stats.build, m.scenario === "nar_nar" ? "usd" : fc)}</b></span><span>${t("g.life")}: <b>${fmt(p.stats.life, m.scenario === "nar_nar" ? "usd" : fc)}</b></span></div>
      ${ids.length ? `<table class="props-table"><thead><tr><th></th><th>${t("g.buildings")}</th><th>${t("g.share")}</th><th>${t("g.rent")}</th></tr></thead><tbody>${rows}</tbody></table>` : `<p class="sub sub--xs">${t("g.noProps")}</p>`}
      ${kap ? `<div class="loan-line"><span>${t("g.debt")}: <b>${fmt(debt, fc)}</b> · ${t("g.limit")}: <b>${fmt(E.loanLimit(m, p), fc)}</b></span>
        <button class="chipbtn" data-prop="loan" data-testid="prop-loan-btn">${t("g.loan")}</button>${debt ? `<button class="chipbtn" data-prop="repay" data-testid="prop-repay-btn">${t("g.repay")}</button>` : ""}</div>` : ""}`;
  };

  /* ================= Actions panel ================= */
  const renderActions = () => {
    const p = m.current;
    const box = $("#actions");
    if (p.isBot) return (box.innerHTML = `<button class="btn" disabled data-testid="bot-turn-indicator">${t("game.botThinking")}</button>`);
    if (!isLocalHuman(p)) return (box.innerHTML = `<button class="btn" disabled data-testid="remote-turn-indicator">${t("net.waitTurn", { name: esc(p.name) })}</button>`);
    const btns = [];
    if (m.phase === "await_roll") btns.push(`<button class="btn btn--primary" id="btn-roll" data-testid="roll-dice-btn" ${busy ? "disabled" : ""}>${t("game.roll")}</button>`);
    if (m.phase === "await_move") btns.push(selected
      ? `<button class="btn btn--primary" data-g="confirm" data-testid="confirm-move-btn">${t("g.confirmMove")}</button>`
      : `<button class="btn" disabled data-testid="choose-sector-hint">${t("g.chooseSector")}</button>`);
    if (m.phase === "await_end") btns.push(`<button class="btn btn--primary" id="btn-end-turn" data-testid="end-turn-btn" ${busy ? "disabled" : ""}>${t("game.endTurn")}</button>`);
    if (m.phase !== "await_move" && E.actions(m, p, p.cell, m.turnState.stage).length) btns.push(`<button class="btn" data-g="cell" data-testid="cell-actions-btn">${t("g.cellActions")}</button>`);
    box.innerHTML = btns.join("");
  };

  /* ================= Human flows ================= */
  const optLabel = (a, o) => (o ? `${a.label} · ${fmt(o.amount, o.cur)}` : a.label);
  const openCell = async () => {
    const p = m.current;
    const id = p.cell;
    const acts = E.actions(m, p, id, m.turnState.stage);
    if (!acts.length) return;
    const buttons = [];
    acts.forEach((a) => {
      if (a.opts.length && a.opts[0].amount > 0) a.opts.forEach((o) => buttons.push({ label: optLabel(a, o), value: { a, o }, disabled: !p.wallet.has(o.cur, o.amount) && a.id !== "narRent" && !a.mandatory, primary: a.mandatory }));
      else buttons.push({ label: a.label, value: { a, o: a.opts[0] }, primary: a.mandatory });
    });
    const mustAct = !!m.turnState.due;
    if (!mustAct) buttons.push({ label: t("g.back"), value: null });
    const res = await dialog({ title: nm(id), sub: E.statusLabel(m, id), rows: cellRows(id), buttons, closable: !mustAct });
    if (res) await runAction(p, id, res.a, res.o);
    refresh();
    if (m.turnState.due && !p.isBot) setTimeout(openCell, 150);
  };

  const runAction = async (p, id, a, o) => {
    if (a.id === "decline") return auction(id, p);
    if (a.id === "jointBuy") return joint(id, p);
    if (a.id === "publicBuild" || a.id === "publicModule") {
      if (await vote(id, p)) E.publicBuild(m, id, p, a.kind);
      m.turnState.acted[m.turnState.stage] = true;
      if (a.mandatory) m.turnState.due = null;
      return m.changed();
    }
    const r = E.perform(m, p, id, a, o);
    if (!r.ok && !p.isBot) await noFunds(p, o, a);
    m.changed();
  };

  const noFunds = async (p, o, a) => {
    const fc = E.fiatCur(m);
    const limit = E.loanLimit(m, p);
    const short = o ? Math.max(0, o.amount - p.wallet.get(o.cur)) : 0;
    const buttons = [];
    if (o && o.cur === fc && limit >= short && short > 0) buttons.push({ label: `${t("g.takeLoan")} · ${fmt(short, fc)}`, value: "loan", primary: true });
    if (E.ownedCells(m, p).length) buttons.push({ label: t("g.useAssets"), value: "assets" });
    if (a.mandatory) buttons.push({ label: t("g.goBenefit"), value: "benefit" });
    buttons.push({ label: t("g.back"), value: null });
    const res = await dialog({ title: t("g.noFunds"), rows: o ? [[t("g.toPay"), fmt(o.amount, o.cur)], [t("g.available"), fmt(p.wallet.get(o.cur), o.cur)]] : [], buttons });
    if (res === "loan" && E.takeLoan(m, p, Math.ceil(short))) E.perform(m, p, p.cell, a, o);
    if (res === "benefit") writeOff(p, o);
  };
  const writeOff = (p, o) => {
    m.debit(p, o.cur, p.wallet.get(o.cur), "h.writeOff");
    p.status = "benefit";
    m.turnState.due = null;
  };

  /* ----- auction ----- */
  const botLimit = (b, base) => base * ({ capitalist: 1.15, neutral: 0.85, narmonist: 0.6 }[b.botType] || 0.8);
  const auction = async (id, decliner) => {
    m.turnState.declined = id;
    m.turnState.acted.post = true;
    const cur = E.fiatCur(m);
    const base = E.price(m, id);
    const step = E.SP.auctionStep;
    let high = { p: null, amount: Math.round((base * E.SP.auctionStartPercent) / 100) - step };
    let left = m.players.filter((p) => p.status !== "bankrupt");
    for (let guard = 0; guard < 60 && left.length && !(left.length === 1 && high.p === left[0]); guard++) {
      const p = left[guard % left.length];
      if (p === high.p) continue;
      const nextBid = high.amount + step;
      let bid = null;
      if (p.isBot) bid = nextBid <= Math.min(botLimit(p, base), p.wallet.get(cur)) ? nextBid : null;
      else {
        bid = await ask(p, {
          title: `${t("g.auction")} · ${nm(id)}`, sub: `${t("g.bidder")}: ${p.name}`,
          rows: [[t("g.start"), fmt(Math.round((base * E.SP.auctionStartPercent) / 100), cur)], [t("g.highest"), high.p ? `${fmt(high.amount, cur)} (${esc(high.p.name)})` : "—"], [t("game.balance"), fmt(p.wallet.get(cur), cur)]],
          html: `<label class="dlg-input"><span>${t("g.amount")}</span><input type="number" id="bid-input" min="${nextBid}" step="10" value="${nextBid}" data-testid="auction-bid-input" /></label>`,
          buttons: [{ label: t("g.bid"), primary: true, testid: "auction-bid-btn", value: { valueFrom: "#bid-input" } }, { label: t("g.pass"), value: null, testid: "auction-pass-btn" }],
          closable: false,
        });
        if (bid != null && (bid < nextBid || !p.wallet.has(cur, bid))) bid = null;
      }
      if (bid == null) left = left.filter((q) => q !== p);
      else high = { p, amount: bid };
      if (!left.length || (left.length === 1 && high.p === left[0])) break;
    }
    E.auctionWin(m, id, high.p, high.amount);
    m.changed();
  };

  /* ----- voting ----- */
  const vote = async (id, initiator) => {
    let yes = 0;
    const voters = m.players.filter((p) => p.status !== "bankrupt");
    for (const p of voters) {
      let v;
      if (p === initiator) v = true;
      else if (p.isBot) v = p.botType === "narmonist" ? true : p.botType === "capitalist" ? Math.random() < 0.2 : Math.random() < 0.6;
      else v = await ask(p, { title: t("g.vote"), sub: `${nm(id)} · ${t("g.voter")}: ${p.name}`, rows: [[t("g.initiator"), esc(initiator.name)], [t("g.source"), t("g.bank")], [t("g.price"), fmt(E.price(m, id), m.scenario === "nar_nar" ? "usd" : E.fiatCur(m))]], buttons: [{ label: t("g.yes"), value: true, primary: true, testid: "vote-yes-btn" }, { label: t("g.no"), value: false, testid: "vote-no-btn" }], closable: false });
      if (v) yes++;
    }
    const ok = yes / voters.length >= 0.5;
    m.log({ key: "h.vote", playerId: initiator.id, params: { cell: "#" + id, yes, no: voters.length - yes, res: ok ? "@h.accepted" : "@h.rejected" } });
    return ok;
  };

  /* ----- joint purchase ----- */
  const joint = async (id, initiator) => {
    const others = m.players.filter((p) => p !== initiator && p.status !== "bankrupt");
    let chosen = others;
    if (!initiator.isBot) {
      chosen = await dialog({
        title: t("g.joint"), sub: t("g.partners"),
        html: `<div class="dlg-checks">${others.map((p) => `<label><input type="checkbox" value="${p.id}" checked data-testid="joint-partner-${p.color}" /> ${esc(p.name)}</label>`).join("")}</div>`,
        buttons: [{ label: t("g.confirm"), primary: true, testid: "joint-confirm-btn", value: () => $$(".dlg-checks input:checked").map((i) => m.player(i.value)) }, { label: t("g.back"), value: null }],
      });
      if (!chosen) return;
    }
    const partners = [initiator];
    const part = Math.round(E.price(m, id) / (chosen.length + 1));
    for (const p of chosen) {
      const can = E.canPayAny(p, E.payOpts(m, part));
      let ok;
      if (p.isBot) ok = can && p.botType !== "capitalist";
      else ok = can && (await ask(p, { title: t("g.joint"), sub: `${nm(id)} · ${p.name}`, rows: [[t("g.part"), fmt(part, m.scenario === "nar_nar" ? "usd" : E.fiatCur(m))]], buttons: [{ label: t("g.join"), value: true, primary: true }, { label: t("g.pass"), value: false }], closable: false }));
      if (ok) partners.push(p);
    }
    E.jointBuy(m, id, partners);
    m.changed();
  };

  /* ----- special flows ----- */
  const handleFlow = async (flow, p) => {
    if (flow === "anomaly") {
      if (!p.isBot) await dialog({ title: nm("c30"), sub: t("g.anomaly"), buttons: [{ label: t("game.roll"), value: true, primary: true, testid: "anomaly-roll-btn" }], closable: false });
      const a = 1 + Math.floor(Math.random() * 6), b = 1 + Math.floor(Math.random() * 6);
      m.log({ key: "h.anomaly", playerId: p.id, params: { a, b, sum: a + b } });
      const kind = (a + b) % 2 === 0 ? "chance" : "borgi";
      const path = B.forwardTo(p.cell, p.ring, (c) => c.kind === kind);
      await animatePath(p, path);
      const r = m.move(path[path.length - 1], { teleport: true });
      return handleFlow(r.flow, p);
    }
    if (flow === "card") return cardFlow(p, B.cells[p.cell].kind);
  };

  const cardFlow = async (p, kind) => {
    const d = window.MPCards.draw(m, p.cell, kind);
    const sum = window.MPCards.summary(m, d);
    m.log({ key: "h.card", playerId: p.id, params: { deck: `@c.${kind}`, n: d.n, text: sum } });
    const html = `<div class="mp-card mp-card--${kind}" data-testid="card-view"><span class="mp-card-kind">${kind.toUpperCase()} · ${E.L("m_" + d.model)}</span>
      <p class="mp-card-text" data-testid="card-text">${esc(d.card[lang() === "ru" ? "t" : lang()] || d.card.t)}</p><p class="mp-card-effect" data-testid="card-effect">${esc(sum)}</p></div>`;
    const title = `${t("c." + kind)} №${d.n}`;
    let choice = null;
    if (d.card.e[0] === "choice") {
      choice = p.isBot ? (p.wallet.get(E.fiatCur(m)) > 100 ? "fine" : "chance")
        : await dialog({ title, html, buttons: [{ label: t("c.payFine"), value: "fine", primary: true, testid: "card-fine-btn" }, { label: t("c.drawChance"), value: "chance", testid: "card-chance-btn" }], closable: false });
    } else if (!p.isBot) await dialog({ title, html, buttons: [{ label: t("c.apply"), value: true, primary: true, testid: "card-apply-btn" }], closable: false });
    const r = window.MPCards.apply(m, p, d, choice) || {};
    m.changed();
    if (r.chance) return cardFlow(p, "chance");
    if (r.path && r.path.length) {
      await animatePath(p, r.path);
      const res = m.move(r.path[r.path.length - 1], { teleport: true });
      return handleFlow(res.flow, p);
    }
  };

  /* ================= Ad bonus (MOCK ad view) ================= */
  const adBonus = async () => {
    const p = isLocalHuman(m.current) ? m.current : m.players.find((x) => isLocalHuman(x));
    if (!p) return;
    m.flags.ads = m.flags.ads || {};
    if (m.flags.ads[p.id] === m.roundNo) return window.MPApp.toast(t("ad.once"), "error");
    const cur = m.scenario === "nar_nar" ? "nar" : E.fiatCur(m);
    const amount = cur === "nar" ? E.SP.adBonus.nar : m.bank.fiat(E.SP.adBonus[cur]);
    setTimeout(() => {
      const bar = $("#ad-bar");
      if (bar) bar.style.width = "100%";
    }, 50);
    const timer = setTimeout(() => {
      const b = $('[data-testid="ad-claim-btn"]');
      if (b) b.disabled = false;
      const st = $("#ad-state");
      if (st) st.textContent = t("ad.done");
    }, 5000);
    const ok = await dialog({
      title: t("ad.title"), sub: `${p.name} · ${t("ad.reward")}: ${fmt(amount, cur)}`,
      html: `<div class="ad-box" data-testid="ad-player"><span class="ad-tag">AD · MOCK</span><p id="ad-state">${t("ad.watching")}</p><div class="ad-track"><i id="ad-bar"></i></div></div>`,
      buttons: [{ label: t("ad.claim"), value: true, primary: true, disabled: true, testid: "ad-claim-btn" }, { label: t("g.back"), value: null, testid: "ad-cancel-btn" }],
    });
    clearTimeout(timer);
    if (!ok) return window.MPApp.toast(t("ad.cancel"), "error");
    m.flags.ads[p.id] = m.roundNo;
    m.credit(p, cur, amount, "h.adBonus");
    m.changed();
    await dialog({ title: t("ad.ok"), rows: [[t("g.amount"), fmt(amount, cur)], [t("ad.cur"), t("cur." + cur)], [t("ad.after"), fmt(p.wallet.get(cur), cur)]], buttons: [{ label: t("common.close"), value: true, primary: true, testid: "ad-close-btn" }] });
  };

  /* ================= Results ================= */
  const computeResults = () => {
    const unit = m.scenario === "nar_nar" ? "usd" : E.fiatCur(m);
    const rows = m.players.map((p) => {
      const cash = p.wallet.usd + p.wallet.rub + p.wallet.nar * m.bank.goldPrice;
      const props = Object.entries(m.cells).reduce((a, [id, s]) => a + (s.owners[p.id] ? E.propValue(m, id, s) * s.owners[p.id] * (s.mortgaged ? 0.5 : 1) : 0), 0);
      const debt = p.loans.reduce((a, l) => a + l.debt, 0);
      return { p, build: Math.round(p.stats.build), life: Math.round(p.stats.life), capital: Math.round(cash + props - debt), points: 0, places: {} };
    });
    const PTS = [4, 2, 1, 0];
    ["build", "life", "capital"].forEach((k) => {
      const sorted = [...rows].sort((a, b) => b[k] - a[k]);
      sorted.forEach((r) => {
        const place = sorted.findIndex((x) => x[k] === r[k]);
        r.places[k] = place + 1;
        r.points += PTS[place] || 0;
      });
    });
    const max = Math.max(...rows.map((r) => r.points));
    rows.forEach((r) => (r.winner = r.points === max));
    return { unit, rows: rows.sort((a, b) => b.points - a.points), draw: rows.filter((r) => r.winner).length > 1 };
  };
  const finishGame = async () => {
    const ok = await dialog({ title: t("r.confirmTitle"), sub: t("r.confirmSub"), buttons: [{ label: t("r.finish"), value: true, primary: true, testid: "confirm-finish-btn" }, { label: t("g.back"), value: null }] });
    if (!ok) return;
    const res = computeResults();
    m.log({ key: "h.finished", params: { names: res.rows.filter((r) => r.winner).map((r) => r.p.name).join(", ") } });
    m.phase = "finished";
    m.save();
    window.MPState.Match.clear();
    const cat = (r, k) => `<div class="res-metric"><span>${t("r." + k)}</span><b>${fmt(r[k], res.unit)}</b><em>${r.places[k]} ${t("r.place")} · +${[4, 2, 1, 0][r.places[k] - 1] || 0}</em></div>`;
    $("#results-body").innerHTML = `<p class="sub" data-testid="results-verdict">${res.draw ? t("r.draw") : t("r.winner")}: <b class="gold">${esc(res.rows.filter((r) => r.winner).map((r) => r.p.name).join(", "))}</b></p>
      <div class="res-grid">${res.rows.map((r, i) => `<article class="panel res-card${r.winner ? " is-winner" : ""}" data-testid="result-card-${r.p.color}" style="animation-delay:${i * 90}ms">
        <header><img src="/assets/img/token-${r.p.color}.png" alt="" /><div><h3>${esc(r.p.name)}</h3>${r.winner ? `<span class="res-badge">${res.draw ? t("r.draw") : t("r.winner")}</span>` : ""}</div>
        <strong data-testid="result-points-${r.p.color}">${r.points}<small>/12</small></strong></header>${cat(r, "build")}${cat(r, "life")}${cat(r, "capital")}</article>`).join("")}</div>`;
    window.MPApp.go("results");
  };
  const gameMenu = async () => {
    const v = await dialog({ title: t("game.menu"), buttons: [
      { label: t("game.finish"), value: "finish", testid: "menu-finish-btn" }, { label: t("game.bonus"), value: "bonus", testid: "menu-bonus-btn" },
      { label: t("nav.rules"), value: "rules", testid: "menu-rules-btn" }, { label: t("menu.home"), value: "home", testid: "menu-home-btn" },
      { label: t("g.back"), value: null, primary: true, testid: "menu-back-btn" }] });
    if (v === "finish") return net() && net().seat !== 0 ? window.MPApp.toast(t("net.hostOnly"), "error") : finishGame();
    if (v === "bonus") return net() && !isDriver() ? window.MPApp.toast(t("net.yourTurnOnly"), "error") : adBonus();
    if (v === "rules") return dialog({ title: t("rules.title"), html: `<div class="modal-body">${t("rules.body")}</div>`, buttons: [{ label: t("common.ok"), value: true }] });
    if (v === "home") window.MPApp.go("start");
  };

  const startTurnChecks = async () => {
    const p = m.current;
    if (!p.restrictions.blackhole || m.phase !== "await_roll") return true;
    const nar = m.scenario === "nar_nar";
    const opt = nar ? { cur: "nar", amount: E.SP.blackHoleFineNar } : { cur: E.fiatCur(m), amount: m.bank.fiat(E.SP.blackHoleFine) };
    const can = p.wallet.has(opt.cur, opt.amount);
    const choice = p.isBot ? (can ? "pay" : "skip") : await dialog({ title: "Black Hole", sub: t("g.bh"), buttons: [{ label: `${t("g.payFine")} · ${fmt(opt.amount, opt.cur)}`, value: "pay", disabled: !can, primary: true, testid: "bh-pay-btn" }, { label: t("g.skip"), value: "skip", testid: "bh-skip-btn" }], closable: false });
    p.restrictions.blackhole = false;
    if (choice === "pay") {
      m.debit(p, opt.cur, opt.amount, "h.bhFine");
      return true;
    }
    m.log({ key: "h.bhSkip", playerId: p.id });
    m.phase = "await_end";
    m.endTurn();
    return false;
  };

  const roll = async () => {
    if (busy || m.phase !== "await_roll") return;
    busy = true;
    renderActions();
    if (!(await startTurnChecks())) return (busy = false);
    $$("#dice .die").forEach((d) => {
      d.classList.remove("is-rolling");
      void d.offsetWidth;
      d.classList.add("is-rolling");
    });
    await wait(600);
    busy = false;
    m.roll();
  };

  const confirmMove = async (id) => {
    const p = m.current;
    const opt = m.moveOptions && m.moveOptions.find((o) => o.id === id);
    if (!opt) return;
    busy = true;
    selected = null;
    await animatePath(p, opt.path);
    const r = m.move(id);
    await handleFlow(r.flow, p);
    busy = false;
    refresh();
    if (!p.isBot && E.actions(m, p, p.cell, "post").length) openCell();
  };

  const endTurn = async () => {
    if (busy) return;
    const p = m.current;
    if (m.turnState.due) {
      window.MPApp.toast(t("g.mustAct"), "error");
      return openCell();
    }
    // Declined free Kapmonia property goes to auction
    const s = m.cells[p.cell];
    if (E.model(m, p.cell) === "kap" && (!s || s.type === "free") && m.turnState.stage === "post" && m.turnState.declined !== p.cell) {
      busy = true;
      await auction(p.cell, p);
      busy = false;
    }
    m.endTurn();
  };

  /* ================= Bots ================= */
  const reserve = (b) => ({ capitalist: 0.15, neutral: 0.4, narmonist: 0.5 }[b.botType] ?? 0.4);
  const botPick = (b, acts) => {
    const fc = E.fiatCur(m);
    const startSum = (m.rules.start[fc] || 0) + (m.rules.start.nar || 0) * m.bank.goldPrice;
    const affordable = (a) => a.opts.find((o) => b.wallet.has(o.cur, o.amount) && (a.mandatory || b.wallet.get(o.cur) - o.amount >= reserve(b) * (o.cur === "nar" ? 1 : startSum)));
    const mand = acts.filter((a) => a.mandatory);
    if (mand.length) {
      const prefs = b.botType === "narmonist" ? ["publicModule", "module", "gosBuild", "rentDouble", "narRent", "payRent", "tender", "rentOrd"] : ["tender", "module", "gosBuild", "rentOrd", "narRent", "payRent", "rentDouble", "publicModule"];
      for (const id of prefs) {
        const a = mand.find((x) => x.id === id && (!x.opts.length || x.opts[0].amount === 0 || affordable(x) || x.tariff === 0 || x.id === "payRent"));
        if (a) return { a, o: a.opts.find((o) => b.wallet.has(o.cur, o.amount)) || a.opts[0] };
      }
      return { a: mand[0], o: mand[0].opts[0] };
    }
    const order = { capitalist: ["buy", "indBuy", "dome", "module", "gosBuild"], neutral: ["buy", "module", "gosBuild", "jointBuy", "indBuy", "dome"], narmonist: ["publicBuild", "jointBuy", "gosBuild", "module", "dome", "buy"] }[b.botType] || [];
    for (const id of order) {
      const a = acts.find((x) => x.id === id);
      if (!a) continue;
      if (!a.opts.length || a.opts[0].amount === 0) return { a, o: a.opts[0] };
      const o = affordable(a);
      if (o) return { a, o };
    }
    return null;
  };
  const botAct = async (b, stage) => {
    for (let i = 0; i < 3; i++) {
      const acts = E.actions(m, b, b.cell, stage);
      const pick = botPick(b, acts);
      if (!pick) break;
      await wait(500);
      if (pick.a.mandatory && pick.o && !b.wallet.has(pick.o.cur, pick.o.amount) && pick.a.id === "payRent") {
        const short = pick.o.amount - b.wallet.get(pick.o.cur);
        if (!(E.loanLimit(m, b) >= short && E.takeLoan(m, b, Math.ceil(short)))) {
          writeOff(b, pick.o);
          m.changed();
          break;
        }
      }
      await runAction(b, b.cell, pick.a, pick.o);
      if (!m.turnState.due && (stage === "pre" || m.turnState.acted[stage])) break;
    }
    if (m.turnState.due) {
      m.turnState.due = null;
      m.changed();
    }
  };
  const botScore = (b, id) => {
    const s = m.cells[id];
    const mdl = E.model(m, id);
    if (id === "c10") return -5;
    if (!mdl) return B.cells[id].kind === "grant" ? 2 : B.cells[id].kind === "tax" ? -2 : 0;
    if (!s || s.type === "free") return b.botType === "capitalist" ? 3 : 2;
    if (s.owners[b.id]) return 2;
    return b.botType === "narmonist" && mdl === "nar" ? 1 : -E.rentFor(m, id) / 50;
  };
  let botBusy = false;
  const botTurn = async () => {
    if (botBusy) return;
    botBusy = true;
    const b = m.current;
    try {
      await wait(700);
      if (m.phase === "await_roll") {
        if (!(await startTurnChecks())) return;
        await botAct(b, "pre");
        $$("#dice .die").forEach((d) => { d.classList.remove("is-rolling"); void d.offsetWidth; d.classList.add("is-rolling"); });
        await wait(600);
        m.roll();
      }
      if (m.phase === "await_move") {
        await wait(500);
        const opts = [...m.moveOptions].sort((x, y) => botScore(b, y.id) - botScore(b, x.id) + (b.botType === "neutral" ? Math.random() - 0.5 : 0));
        selected = opts[0].id;
        updateBoard();
        await wait(400);
        await confirmMove(opts[0].id);
      }
      if (m.phase === "await_end" && m.current === b) {
        await botAct(b, "post");
        const s = m.cells[b.cell];
        if (E.model(m, b.cell) === "kap" && (!s || s.type === "free") && m.turnState.declined !== b.cell && m.turnState.stage === "post") await auction(b.cell, b);
        await wait(400);
        m.endTurn();
      }
    } finally {
      botBusy = false;
    }
  };
  let botTimer = null;
  const scheduleBot = () => {
    clearTimeout(botTimer);
    if (!m || document.body.dataset.screen !== "game" || !m.current.isBot || botBusy || (net() && net().seat !== 0)) return;
    botTimer = setTimeout(() => botTurn().then(scheduleBot), 300);
  };

  /* ================= Events ================= */
  const refresh = () => window.MPApp.renderGame();
  document.addEventListener("click", async (e) => {
    if (!m || document.body.dataset.screen !== "game") return;
    const cellEl = e.target.closest("#board .cell");
    if (cellEl) {
      const id = cellEl.dataset.cell;
      if (m.phase === "await_move" && isLocalHuman(m.current) && !busy) {
        if (m.moveOptions.some((o) => o.id === id)) selected = id;
        else window.MPApp.toast(t("g.unavailable"), "error");
        return refresh();
      }
      return renderSector(id);
    }
    const g = e.target.closest("[data-g]");
    if (g && g.dataset.g === "confirm" && selected && isDriver()) return confirmMove(selected);
    if (g && g.dataset.g === "cell") return openCell();
    if (e.target.closest("#btn-roll")) return isDriver() && roll();
    if (e.target.closest("#btn-finish-game")) return busy || dlgResolve ? null : net() && net().seat !== 0 ? window.MPApp.toast(t("net.hostOnly"), "error") : finishGame();
    if (e.target.closest("#btn-bonus")) return dlgResolve ? null : net() && !isDriver() ? window.MPApp.toast(t("net.yourTurnOnly"), "error") : adBonus();
    if (e.target.closest("#btn-game-menu")) return dlgResolve ? null : gameMenu();
    if (e.target.closest("#btn-end-turn")) return endTurn();
    const pr = e.target.closest("[data-prop]");
    if (pr) {
      const p = m.player(panelPlayer);
      const id = pr.dataset.id;
      const s = id && m.cells[id];
      if (pr.dataset.prop === "mortgage" && !E.mortgage(m, p, id)) window.MPApp.toast(t("g.noFunds"), "error");
      if (pr.dataset.prop === "sell") E.sellToBank(m, p, id);
      if (pr.dataset.prop === "tender") s.tender = !s.tender;
      if (pr.dataset.prop === "collect") s.collect = !s.collect;
      if (pr.dataset.prop === "repay" && !E.repayLoans(m, p)) window.MPApp.toast(t("g.noFunds"), "error");
      if (pr.dataset.prop === "loan") {
        const fc = E.fiatCur(m);
        const amt = await dialog({ title: t("g.loan"), rows: [[t("g.limit"), fmt(E.loanLimit(m, p), fc)]], html: `<label class="dlg-input"><span>${t("g.amount")}</span><input type="number" id="loan-input" min="10" step="10" value="${Math.min(500, Math.floor(E.loanLimit(m, p)))}" data-testid="loan-amount-input" /></label>`, buttons: [{ label: t("g.takeLoan"), primary: true, value: () => +$("#loan-input").value, testid: "loan-confirm-btn" }, { label: t("g.back"), value: null }] });
        if (amt && !E.takeLoan(m, p, amt)) window.MPApp.toast(t("g.noFunds"), "error");
      }
      m.changed();
    }
  });

  window.MPGame = {
    attach(match) {
      const same = m && m.id === match.id;
      m = match;
      selected = null;
      if (same) return;
      busy = false;
      botBusy = false;
      const b = $("#board");
      b.dataset.built = "";
      $$(".slot, .corner, .tokens", b).forEach((x) => x.remove());
    },
    isDriver: () => isDriver(),
    promptLocal: async (spec) => {
      while (dlgResolve || busy) await wait(400);
      return dialog(spec);
    },
    render() {
      if (!m) return;
      renderBoard();
      renderActions();
      renderSector();
      renderProps();
    },
    scheduleBot,
    get busy() { return busy; },
  };
})();
