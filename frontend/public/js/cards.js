(function () {
  const B = window.MPBoard;
  const E = window.MPEco;
  const r2 = (n) => Math.round(n * 100) / 100;
  const GOTO = { pegasus: 15, eris: 39, oberon: 27, titan: 24, moon: 1 };

  window.I18N.extend({
    "c.chance": ["Chance", "Chance", "Chance"], "c.borgi": ["Borgi", "Borgi", "Borgi"],
    "c.apply": ["Выполнить", "Виконати", "Apply"], "c.payFine": ["Оплатить штраф", "Сплатити штраф", "Pay the fine"], "c.drawChance": ["Активировать «Шанс»", "Активувати «Шанс»", "Draw Chance"],
    "c.goto": ["Перемещение: {cell}", "Переміщення: {cell}", "Move to {cell}"], "c.back": ["Назад на {n} сектора", "Назад на {n} сектори", "Move back {n} sectors"],
    "c.pay": ["Оплата {sum}", "Оплата {sum}", "Pay {sum}"], "c.get": ["Получите {sum}", "Отримайте {sum}", "Receive {sum}"],
    "c.repair": ["Ремонт: {a} за модуль, {b} за купол", "Ремонт: {a} за модуль, {b} за купол", "Repairs: {a} per module, {b} per dome"],
    "c.patch": ["Защитный патч от Black Hole", "Захисний патч від Black Hole", "Black Hole protection patch"],
    "c.inflate": ["Инфляция: цены ×2, 1 г = {gold}", "Інфляція: ціни ×2, 1 г = {gold}", "Inflation: prices ×2, 1 g = {gold}"],
    "c.deflate": ["Дефляция: цены ÷2 (только при инфляции)", "Дефляція: ціни ÷2 (лише при інфляції)", "Deflation: prices ÷2 (only during inflation)"],
    "c.birthday": ["Каждый игрок дарит вам {sum}", "Кожен гравець дарує вам {sum}", "Every player gives you {sum}"],
    "c.allGet": ["Все игроки получают {sum}", "Усі гравці отримують {sum}", "All players receive {sum}"],
    "c.choice": ["Штраф {sum} или карта «Шанс»", "Штраф {sum} або картка «Шанс»", "Fine {sum} or a Chance card"],
    "c.mortgagePct": ["{n}% от стоимости заложенных объектов", "{n}% від вартості заставлених об'єктів", "{n}% of mortgaged objects value"],
    "c.life": ["+{sum} к уровню жизни (без денег)", "+{sum} до рівня життя (без грошей)", "+{sum} to living standard (no cash)"],
    "c.mixed": ["Получите {sum}, +{life} к уровню жизни", "Отримайте {sum}, +{life} до рівня життя", "Receive {sum}, +{life} living standard"],
    "c.subOn": ["Субботники: 25 ₽ за круг вместо 50 ₽", "Суботники: 25 ₽ за коло замість 50 ₽", "Subbotniks: 25 ₽ per round instead of 50 ₽"],
    "c.subOff": ["Субботники отменены: 50 ₽ за круг", "Суботники скасовано: 50 ₽ за коло", "Subbotniks cancelled: 50 ₽ per round"],
    "c.info": ["Расходы покрывает государство", "Витрати покриває держава", "Costs are covered by the state"],
    "h.card": ["Карточка {deck} №{n}: {text}", "Картка {deck} №{n}: {text}", "{deck} card #{n}: {text}"],
    "h.cardPay": ["Оплата по карточке:", "Оплата за карткою:", "Card payment:"], "h.cardGet": ["Начисление по карточке:", "Нарахування за карткою:", "Card income:"],
    "h.gift": ["Подарок → {to}:", "Подарунок → {to}:", "Gift → {to}:"], "h.patchUsed": ["Защитный патч спас от Black Hole", "Захисний патч врятував від Black Hole", "Patch saved from the Black Hole"],
    "h.inflation": ["Инфляция: цены ×2, 1 г = {gold} $", "Інфляція: ціни ×2, 1 г = {gold} $", "Inflation: prices ×2, 1 g = {gold} $"],
    "h.deflation": ["Дефляция: цены ÷2, 1 г = {gold} $", "Дефляція: ціни ÷2, 1 г = {gold} $", "Deflation: prices ÷2, 1 g = {gold} $"],
  });
  const { t } = window.I18N;

  // Deck currency: Kapmonia $ (₽ in kap_gos), Gosmonia ₽, Narmonia $ converted to g in nar_nar
  const deckCur = (m, model) => (model === "gos" || m.scenario === "kap_gos" ? "rub" : model === "nar" && m.scenario === "nar_nar" ? "nar" : "usd");
  const amt = (m, cur, base) => (cur === "nar" ? r2((base * m.bank.priceIndex) / m.bank.goldPrice) : m.bank.fiat(base));
  const money = (n, cur) => `${cur === "nar" ? n.toFixed(2).replace(".", ",") : n} ${{ usd: "$", rub: "₽", nar: "g" }[cur]}`;

  const draw = (m, cellId, kind) => {
    const model = E.zone(m, cellId);
    const key = `${model}_${kind}`;
    if (!m.decks[key] || !m.decks[key].length) m.decks[key] = [...Array(18).keys()].sort(() => Math.random() - 0.5);
    const n = m.decks[key].pop();
    return { key, model, kind, n: n + 1, card: window.MPCardData[key][n] };
  };

  const summary = (m, d) => {
    const [op, a, b] = d.card.e;
    const cur = deckCur(m, d.model);
    const s = (x) => money(amt(m, cur, x), cur);
    const target = op === "goto" ? (GOTO[a] != null ? `${GOTO[a]}-${m.current.ring || 1}` : a) : null;
    return {
      goto: () => t("c.goto", { cell: B.name(target, window.I18N.lang) }), back: () => t("c.back", { n: a }), pay: () => t("c.pay", { sum: s(a) }),
      get: () => t("c.get", { sum: s(a) }), repair: () => t("c.repair", { a: s(a), b: s(b) }), patch: () => t("c.patch"),
      inflate: () => t("c.inflate", { gold: `${m.bank.goldPrice * 2} $` }), deflate: () => t("c.deflate"), birthday: () => t("c.birthday", { sum: s(a) }),
      allGet: () => t("c.allGet", { sum: s(a) }), choice: () => t("c.choice", { sum: s(a) }), mortgagePct: () => t("c.mortgagePct", { n: a }),
      life: () => t("c.life", { sum: s(a) }), mixed: () => t("c.mixed", { sum: s(a), life: s(b) }), subbotnik: () => t(a ? "c.subOn" : "c.subOff"), info: () => t("c.info"),
    }[op]();
  };

  const payCard = (m, p, cur, sum, life) => {
    let c = cur;
    if (m.scenario === "kap_nar" && !p.wallet.has(c, sum)) {
      c = "nar";
      sum = m.bank.usdToNar(sum);
    }
    if (!p.wallet.has(c, sum) && c !== "nar" && E.loanLimit(m, p) >= sum - p.wallet.get(c)) E.takeLoan(m, p, Math.ceil(sum - p.wallet.get(c)));
    const paid = Math.min(sum, p.wallet.get(c));
    if (paid > 0) m.debit(p, c, r2(paid), "h.cardPay");
    if (paid < sum) p.status = "benefit";
    if (life) p.stats.life += E.fiatOf(m, { cur: c, amount: sum });
  };

  const cellsOf = (m, p) => Object.entries(m.cells).filter(([, s]) => s.owners[p.id]);

  // Applies a card. Returns { path } for move cards, { choice } when the player must choose
  const apply = (m, p, d, choice) => {
    const [op, a, b] = d.card.e;
    const cur = deckCur(m, d.model);
    const A = amt(m, cur, a || 0);
    const B_ = amt(m, cur, b || 0);
    const active = m.players.filter((q) => q.status !== "bankrupt");
    switch (op) {
      case "goto": {
        const target = GOTO[a] != null ? `${GOTO[a]}-${p.ring || 1}` : a;
        if (target === "c10") return { path: [target] };
        return { path: B.forwardTo(p.cell, p.ring || 1, (c) => c.id === target) };
      }
      case "back": {
        const path = [];
        let pos = B.cells[p.cell].pos;
        for (let i = 0; i < a; i++) {
          pos = (pos + 39) % 40;
          path.push(B.CORNERS[pos] || `${pos}-${p.ring || 1}`);
        }
        return { path };
      }
      case "pay": return payCard(m, p, cur, A, b);
      case "get": return m.credit(p, cur, A, "h.cardGet");
      case "repair": {
        const total = cellsOf(m, p).reduce((sum, [, s]) => sum + (s.modules * A + (s.dome ? B_ : 0)) * (s.owners[p.id] || 0), 0);
        if (total > 0) payCard(m, p, cur, r2(total));
        return;
      }
      case "patch": p.restrictions.patch = (p.restrictions.patch || 0) + 1; return;
      case "inflate": m.bank.applyIndex(2); m.log({ key: "h.inflation", params: { gold: m.bank.goldPrice } }); return;
      case "deflate":
        if (m.bank.priceIndex > 1) { m.bank.applyIndex(0.5); m.log({ key: "h.deflation", params: { gold: m.bank.goldPrice } }); }
        return;
      case "birthday":
        active.filter((q) => q !== p).forEach((q) => {
          const c = q.wallet.has(cur, A) ? cur : null;
          if (c) m.transfer(q, p, c, A, "h.gift");
        });
        return;
      case "allGet": active.forEach((q) => m.credit(q, cur, A, "h.cardGet")); return;
      case "choice":
        if (!choice) return { choice: true };
        if (choice === "fine") payCard(m, p, cur, A);
        return { chance: choice === "chance" };
      case "mortgagePct": {
        const total = cellsOf(m, p).filter(([, s]) => s.mortgaged).reduce((sum, [id, s]) => sum + E.propValue(m, id, s), 0);
        if (total > 0) m.credit(p, cur, Math.round((total * a) / 100), "h.cardGet");
        return;
      }
      case "life": p.stats.life += A; return;
      case "mixed": m.credit(p, cur, A, "h.cardGet"); p.stats.life += B_; return;
      case "subbotnik": m.flags.subbotnik = !!a; return;
    }
  };

  window.MPCards = { draw, apply, summary };
})();
