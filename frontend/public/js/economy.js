(function () {
  const B = window.MPBoard;
  const r2 = (n) => Math.round(n * 100) / 100;
  const L3 = {
    buy: ["Купить", "Купити", "Buy"], decline: ["Отказаться (аукцион)", "Відмовитися (аукціон)", "Decline (auction)"],
    payRent: ["Оплатить аренду", "Сплатити оренду", "Pay rent"], tender: ["Выполнить тендер", "Виконати тендер", "Do the tender"],
    module: ["Построить модуль", "Збудувати модуль", "Build module"], dome: ["Построить купол", "Збудувати купол", "Build dome"],
    selfRent: ["Оплатить аренду на своём объекте (25%)", "Сплатити оренду на своєму об'єкті (25%)", "Pay rent on own object (25%)"],
    mortgage: ["Заложить", "Закласти", "Mortgage"], unmortgage: ["Выкупить из залога", "Викупити із застави", "Redeem"],
    sell: ["Продать банку", "Продати банку", "Sell to bank"], gosBuild: ["Построить объект", "Збудувати об'єкт", "Build object"],
    rentOrd: ["Обычная аренда", "Звичайна оренда", "Ordinary rent"], rentDouble: ["Двойная аренда", "Подвійна оренда", "Double rent"],
    indBuy: ["Индивидуальная покупка", "Індивідуальна купівля", "Individual purchase"], jointBuy: ["Совместная покупка", "Спільна купівля", "Joint purchase"],
    publicBuild: ["Голосовать (купить для всех)", "Голосувати (купити для всіх)", "Vote (buy for everyone)"],
    publicModule: ["Голосовать (модуль за счёт банка)", "Голосувати (модуль коштом банку)", "Vote (module funded by bank)"],
    rentTariff: ["Аренда", "Оренда", "Rent"], rentDoubleT: ["Двойная аренда", "Подвійна оренда", "Double rent"],
    rentMods: ["Аренда {n} модулей", "Оренда {n} модулів", "Rent {n} modules"], rentDome: ["Аренда купола", "Оренда купола", "Dome rent"],
    m_kap: ["Капмония", "Капмонія", "Kapmonia"], m_gos: ["Госмония", "Госмонія", "Gosmonia"], m_nar: ["Нармония", "Нармонія", "Narmonia"],
    s_free: ["Свободный сектор", "Вільний сектор", "Free sector"], s_private: ["Частная собственность", "Приватна власність", "Private property"],
    s_people: ["Народная собственность", "Народна власність", "People's property"], s_state: ["Государственный объект", "Державний об'єкт", "State object"],
    s_mortgaged: ["В залоге", "У заставі", "Mortgaged"],
  };
  const LI = { ru: 0, uk: 1, en: 2 };
  const L = (k, p = {}) => {
    let s = (L3[k] || [k])[LI[window.I18N.lang] ?? 0] || L3[k][0];
    Object.keys(p).forEach((x) => (s = s.replaceAll(`{${x}}`, p[x])));
    return s;
  };

  /* ----- model & currency ----- */
  const model = (m, id) => (["planet", "station"].includes(B.cells[id].kind) ? zone(m, id) : null);
  // Economic model of the board zone (also used for Chance/Borgi decks)
  const zone = (m, id) => {
    const c = B.cells[id];
    const s = m.scenario;
    if (s === "kap_kap") return "kap";
    if (s === "nar_nar") return "nar";
    if (s === "gos_gos") return "gos";
    if (s === "kap_nar") return (c.ring || 1) === 1 ? "kap" : "nar";
    const st = m.cells[id];
    if (st && st.type === "state") return "gos";
    return (c.ring || 1) === 1 && c.pos < 20 ? "kap" : "gos"; // kap_gos: first half of ring 1 is Kapmonia
  };
  const fiatCur = (m) => (["gos_gos", "kap_gos"].includes(m.scenario) ? "rub" : "usd");

  // Payment options for a fiat amount
  const payOpts = (m, fiat, { usdOnly } = {}) => {
    if (m.scenario === "nar_nar") return [{ cur: "nar", amount: m.bank.usdToNar(fiat) }];
    if (m.scenario === "kap_nar") return usdOnly ? [{ cur: "usd", amount: fiat }] : [{ cur: "usd", amount: fiat }, { cur: "nar", amount: m.bank.usdToNar(fiat) }];
    return [{ cur: fiatCur(m), amount: fiat }];
  };
  const canPayAny = (p, opts) => opts.some((o) => p.wallet.has(o.cur, o.amount));

  /* ----- cell state ----- */
  const st = (m, id) => {
    if (!m.cells[id]) m.cells[id] = { type: "free", owners: {}, modules: 0, dome: false, built: false, mortgaged: false, tender: false, collect: true, fund: {} };
    return m.cells[id];
  };
  const price = (m, id) => m.bank.fiat(B.cells[id].price);
  const SP = window.MPPrices.special;
  const buildCost = (m, id, kind) => m.bank.fiat(kind === "dome" ? B.cells[id].dome : B.cells[id].build);
  const level = (s) => (s.dome ? 5 : s.modules);
  const soleOwner = (s) => {
    const ids = Object.keys(s.owners);
    return ids.length === 1 && s.owners[ids[0]] >= 0.999 ? ids[0] : null;
  };

  const rentFor = (m, id, lvl) => {
    const c = B.cells[id];
    const s = st(m, id);
    if (c.kind === "station") {
      const owner = soleOwner(s);
      const count = owner ? Object.keys(m.cells).filter((k) => B.cells[k].kind === "station" && soleOwner(m.cells[k]) === owner).length : 1;
      return m.bank.fiat(c.rent[Math.min(3, Math.max(0, count - 1))]);
    }
    const t = B.rentTable(c);
    const L_ = lvl ?? level(s);
    let base = L_ === 5 ? t.dome : t.modules[L_];
    if (L_ === 0 && groupComplete(m, id)) base = t.double;
    return m.bank.fiat(base);
  };
  const groupComplete = (m, id) => {
    const c = B.cells[id];
    if (c.group == null) return false;
    const owner = soleOwner(st(m, id));
    return !!owner && B.groupCells(c.group, c.ring).every((g) => soleOwner(st(m, g)) === owner);
  };
  const domeAllowed = (m, p, id, mdl) => {
    const c = B.cells[id];
    const group = B.groupCells(c.group, c.ring);
    if (!group.every((g) => st(m, g).modules >= 4)) return false;
    if (mdl === "kap") return group.every((g) => soleOwner(st(m, g)) === p.id);
    if (mdl === "nar") return group.every((g) => st(m, g).owners[p.id]);
    return true;
  };
  const tariffs = (m, id) => {
    const t = B.rentTable(B.cells[id]);
    const f = (x) => m.bank.fiat(x);
    if (B.cells[id].kind === "station") return [{ key: "rentTariff", fiat: rentFor(m, id) }];
    return [
      { key: "rentTariff", fiat: f(t.base) }, { key: "rentDoubleT", fiat: f(t.double) },
      ...[1, 2, 3, 4].map((n) => ({ key: "rentMods", n, fiat: f(t.modules[n]) })), { key: "rentDome", fiat: f(t.dome) },
    ];
  };

  const propValue = (m, id, s) => {
    const c = B.cells[id];
    const b = c.build ? buildCost(m, id) * s.modules + (s.dome ? buildCost(m, id, "dome") : 0) : 0;
    return price(m, id) + b;
  };
  const kapPropertyValue = (m, p) =>
    Object.entries(m.cells).filter(([id, s]) => model(m, id) === "kap" && soleOwner(s) === p.id).reduce((a, [id, s]) => a + propValue(m, id, s), 0);
  const ownedCells = (m, p) => Object.entries(m.cells).filter(([, s]) => s.owners[p.id]).map(([id]) => id);
  const refreshBenefit = (m, p) => {
    if (!m.rules.benefit) return;
    const has = Object.entries(m.cells).some(([id, s]) => model(m, id) === "kap" && soleOwner(s) === p.id);
    p.status = has ? "active" : "benefit";
  };

  /* ----- money helpers ----- */
  const pay = (m, p, opt, key, params) => m.debit(p, opt.cur, opt.amount, key, params);
  const fundIn = (s, opt) => (s.fund[opt.cur] = r2((s.fund[opt.cur] || 0) + opt.amount));
  const turn = (m) => m.turnState;
  const improveBlocked = (m, id) => {
    const t = turn(m);
    return t.bought.includes(id) || t.improved.includes(id) || t.improved.length >= 2;
  };
  const markImproved = (m, id, p) => {
    turn(m).improved.push(id);
    p.stats.builds = (p.stats.builds || 0) + 1;
  };

  /* ----- action list ----- */
  const actions = (m, p, id, stage) => {
    const c = B.cells[id];
    const mdl = model(m, id);
    if (!mdl) return [];
    const s = st(m, id);
    const t = turn(m);
    const acted = t.acted[stage];
    const list = [];
    const add = (a) => list.push({ ...a, opts: a.opts || [] });
    const owner = soleOwner(s);
    const due = stage === "post" && t.due && t.due.id === id;

    if (mdl === "kap") {
      if (s.type === "free") {
        if (!acted) add({ id: "buy", label: L("buy"), opts: payOpts(m, price(m, id), { usdOnly: true }) });
        if (stage === "post" && !acted) add({ id: "decline", label: L("decline") });
      } else if (owner && owner !== p.id) {
        if (due) {
          const rent = p.status === "benefit" ? rentFor(m, id, 0) : rentFor(m, id);
          add({ id: "payRent", label: L("payRent"), opts: payOpts(m, rent), mandatory: true });
          if (s.tender && c.build && !s.dome && !improveBlocked(m, id)) add({ id: "tender", label: L("tender"), opts: [] });
        }
      } else if (owner === p.id && !acted) {
        if (c.build && !s.mortgaged && s.modules < 4 && !improveBlocked(m, id)) add({ id: "module", label: L("module"), opts: payOpts(m, buildCost(m, id)) });
        if (c.build && !s.mortgaged && s.modules === 4 && !s.dome && !improveBlocked(m, id) && domeAllowed(m, p, id, "kap")) add({ id: "dome", label: L("dome"), opts: payOpts(m, buildCost(m, id, "dome")) });
        add({ id: "selfRent", label: L("selfRent"), opts: payOpts(m, Math.round(rentFor(m, id) * 0.25)) });
      }
    }

    if (mdl === "gos") {
      if (stage === "post" && due) {
        const rent = rentFor(m, id);
        add({ id: "rentOrd", label: `${L("rentOrd")} (${rent})`, mandatory: true });
        add({ id: "rentDouble", label: L("rentDouble"), opts: payOpts(m, rent * 2), mandatory: true });
      }
      if (c.build && !improveBlocked(m, id) && (!acted || due)) {
        if (!s.built) add({ id: "gosBuild", label: L("gosBuild"), opts: [{ cur: fiatCur(m), amount: 0 }], mandatory: due });
        else if (s.modules < 4) add({ id: "module", label: L("module"), opts: [{ cur: fiatCur(m), amount: 0 }], mandatory: due });
        else if (!s.dome && domeAllowed(m, p, id, "gos")) add({ id: "dome", label: L("dome"), opts: [{ cur: fiatCur(m), amount: 0 }], mandatory: due });
      } else if (c.kind === "station" && !s.built && !acted) add({ id: "gosBuild", label: L("gosBuild"), opts: [{ cur: fiatCur(m), amount: 0 }], mandatory: due });
    }

    if (mdl === "nar") {
      const nOwners = Object.keys(s.owners).length;
      if (nOwners === 0) {
        if (!acted) {
          add({ id: "indBuy", label: L("indBuy"), opts: payOpts(m, price(m, id)) });
          add({ id: "jointBuy", label: L("jointBuy") });
          add({ id: "publicBuild", label: L("publicBuild") });
        }
      } else {
        if (due) tariffs(m, id).forEach((tr, i) => add({ id: "narRent", tariff: i, label: L(tr.key, { n: tr.n }), opts: payOpts(m, tr.fiat), mandatory: true }));
        if (c.build && !s.dome && !improveBlocked(m, id) && (!acted || due)) {
          const kind = s.modules < 4 ? "module" : domeAllowed(m, p, id, "nar") ? "dome" : null;
          if (kind && owner === p.id) add({ id: kind, label: L(kind), opts: payOpts(m, buildCost(m, id, kind)), mandatory: due });
          else if (kind) add({ id: "publicModule", kind, label: kind === "dome" ? L("dome") + " · " + L("publicModule") : L("publicModule"), mandatory: due });
        }
      }
    }
    return list;
  };

  /* ----- execute simple (synchronous) actions ----- */
  const perform = (m, p, id, a, opt) => {
    const s = st(m, id);
    const c = B.cells[id];
    const t = turn(m);
    const name = "#" + id;
    const stage = t.stage;
    const done = (mandatory) => {
      if (mandatory || a.mandatory) t.due = null;
      else t.acted[stage] = true;
    };
    switch (a.id) {
      case "buy":
      case "indBuy": {
        if (!pay(m, p, opt, "h.buy", { cell: name })) return { ok: false };
        s.type = a.id === "buy" ? "private" : "people";
        s.owners = { [p.id]: 1 };
        t.bought.push(id);
        p.stats.build += (opt.cur === "nar" ? opt.amount * m.bank.goldPrice : opt.amount) * (a.id === "indBuy" ? 1.333 : 0);
        refreshBenefit(m, p);
        done();
        return { ok: true };
      }
      case "payRent": {
        const owner = m.player(soleOwner(s));
        if (!p.wallet.has(opt.cur, opt.amount)) return { ok: false };
        p.wallet.sub(opt.cur, opt.amount);
        owner.wallet.add(opt.cur, opt.amount);
        owner.rentIncome = r2((owner.rentIncome || 0) + (opt.cur === "nar" ? opt.amount * m.bank.goldPrice : opt.amount));
        m.log({ key: "h.rent", playerId: p.id, params: { cell: name, to: owner.name }, money: [{ cur: opt.cur, amount: -opt.amount }] });
        p.stats.life += fiatOf(m, opt);
        done(true);
        return { ok: true };
      }
      case "selfRent": {
        if (!pay(m, p, opt, "h.selfRent", { cell: name })) return { ok: false };
        p.stats.life += fiatOf(m, opt) * 4;
        done();
        return { ok: true };
      }
      case "module":
      case "dome": {
        const mdl = model(m, id);
        const cost = buildCost(m, id, a.id);
        if (mdl === "gos") {
          const payout = Math.round((cost * SP.gosPayoutPercent) / 100);
          m.bank.gosFund -= payout;
          m.credit(p, fiatCur(m), payout, "h.gosPayout", { cell: name });
          p.stats.build += payout;
        } else {
          if (!pay(m, p, opt, a.id === "dome" ? "h.dome" : "h.module", { cell: name })) return { ok: false };
          p.stats.build += cost * 1.333;
        }
        if (a.id === "dome") s.dome = true;
        else s.modules += 1;
        markImproved(m, id, p);
        done();
        return { ok: true };
      }
      case "gosBuild": {
        const payout = Math.round((price(m, id) * SP.gosPayoutPercent) / 100);
        s.built = true;
        s.type = "state";
        m.bank.gosFund -= payout;
        m.credit(p, fiatCur(m), payout, "h.gosPayout", { cell: name });
        p.stats.build += payout;
        markImproved(m, id, p);
        done();
        return { ok: true };
      }
      case "rentOrd": {
        p.stats.life += rentFor(m, id);
        m.log({ key: "h.rentOrd", playerId: p.id, params: { cell: name } });
        done(true);
        return { ok: true };
      }
      case "rentDouble": {
        if (!pay(m, p, opt, "h.rentDouble", { cell: name })) return { ok: false };
        m.bank.gosFund += opt.amount;
        p.stats.life += opt.amount;
        done(true);
        return { ok: true };
      }
      case "narRent": {
        if (!p.wallet.has(opt.cur, opt.amount)) {
          if (a.tariff !== 0) return { ok: false };
          const short = r2(opt.amount - p.wallet.get(opt.cur)); // min rent shortfall is credited by the system
          m.credit(p, opt.cur, short, "h.narSupport");
        }
        pay(m, p, opt, "h.narRent", { cell: name });
        fundIn(s, opt);
        p.stats.life += fiatOf(m, opt);
        done(true);
        return { ok: true };
      }
      case "tender": {
        const owner = m.player(soleOwner(s));
        const cost = buildCost(m, id, s.modules < 4 ? "module" : "dome");
        const bonus = Math.round(cost / 3);
        const cur = fiatCur(m);
        if (owner.wallet.has(cur, cost + bonus)) {
          owner.wallet.sub(cur, cost + bonus);
          p.wallet.add(cur, bonus);
          s.modules < 4 ? (s.modules += 1) : (s.dome = true);
          owner.stats.build += cost * 1.333;
          p.stats.build += cost * 0.333;
          markImproved(m, id, p);
          m.log({ key: "h.tender", playerId: p.id, params: { cell: name, to: owner.name }, money: [{ cur, amount: bonus }] });
        } else m.log({ key: "h.tenderFail", playerId: p.id, params: { cell: name } });
        done(true);
        return { ok: true };
      }
    }
    return { ok: false };
  };
  const fiatOf = (m, opt) => (opt.cur === "nar" ? opt.amount * m.bank.goldPrice : opt.amount);

  /* ----- async-flow finalizers ----- */
  const auctionWin = (m, id, winner, amount) => {
    const s = st(m, id);
    const cur = fiatCur(m);
    if (!winner || !m.debit(winner, cur, amount, "h.auctionWin", { cell: "#" + id })) {
      m.log({ key: "h.auctionNone", params: { cell: "#" + id } });
      return;
    }
    s.type = "private";
    s.owners = { [winner.id]: 1 };
    refreshBenefit(m, winner);
  };
  const jointBuy = (m, id, players) => {
    const s = st(m, id);
    const share = 1 / players.length;
    const part = Math.round(price(m, id) * share);
    const paid = players.filter((pl) => {
      const opts = payOpts(m, part);
      const opt = opts.find((o) => pl.wallet.has(o.cur, o.amount));
      return opt && pay(m, pl, opt, "h.jointPart", { cell: "#" + id });
    });
    if (!paid.length) return false;
    s.type = "people";
    s.owners = Object.fromEntries(paid.map((pl) => [pl.id, 1 / paid.length]));
    paid.forEach((pl) => (pl.stats.build += part));
    turn(m).bought.push(id);
    turn(m).acted[turn(m).stage] = true;
    return true;
  };
  // Bank-funded purchase/construction after a successful vote
  const publicBuild = (m, id, initiator, kind) => {
    const s = st(m, id);
    const active = m.players.filter((pl) => pl.status !== "bankrupt");
    const cost = kind ? buildCost(m, id, kind) : price(m, id);
    const premium = m.bank.usdToNar(cost * 0.333);
    if (kind === "dome") s.dome = true;
    else if (kind) s.modules += 1;
    else {
      s.type = "people";
      s.owners = Object.fromEntries(active.map((pl) => [pl.id, 1 / active.length]));
      turn(m).bought.push(id);
    }
    active.forEach((pl) => (pl.stats.build += cost / active.length));
    initiator.stats.build += cost * 0.333;
    const cur = m.scenario === "kap_nar" || m.scenario === "nar_nar" ? "nar" : fiatCur(m);
    m.credit(initiator, cur, cur === "nar" ? premium : Math.round(cost * 0.333), "h.premium", { cell: "#" + id });
    if (kind) markImproved(m, id, initiator);
  };

  /* ----- property management (owner panel) ----- */
  const mortgage = (m, p, id) => {
    const s = st(m, id);
    const cur = fiatCur(m);
    const name = "#" + id;
    if (s.mortgaged) {
      const cost = Math.round((price(m, id) * SP.redeemPercent) / 100);
      if (!m.debit(p, cur, cost, "h.unmortgage", { cell: name })) return false;
      s.mortgaged = false;
    } else {
      s.mortgaged = true;
      m.credit(p, cur, Math.round((price(m, id) * SP.mortgagePercent) / 100), "h.mortgage", { cell: name });
    }
    return true;
  };
  const sellToBank = (m, p, id) => {
    const s = st(m, id);
    const amount = Math.round((propValue(m, id, s) * (SP.sellToBankPercent - (s.mortgaged ? SP.mortgagePercent : 0))) / 100);
    m.credit(p, fiatCur(m), amount, "h.sell", { cell: "#" + id });
    if (m.scenario === "kap_nar") {
      const active = m.players.filter((pl) => pl.status !== "bankrupt");
      Object.assign(s, { type: "people", owners: Object.fromEntries(active.map((pl) => [pl.id, 1 / active.length])), mortgaged: false });
    } else if (m.scenario === "kap_gos") Object.assign(s, { type: "state", owners: {}, built: true, mortgaged: false });
    else Object.assign(s, { type: "free", owners: {}, modules: 0, dome: false, mortgaged: false, tender: false });
    refreshBenefit(m, p);
  };
  const loanLimit = (m, p) => Math.max(0, kapPropertyValue(m, p) - p.loans.reduce((a, l) => a + l.principal, 0));
  const takeLoan = (m, p, amount) => {
    if (amount <= 0 || amount > loanLimit(m, p)) return false;
    p.loans.push({ principal: amount, debt: Math.round(amount * 1.05) });
    m.credit(p, fiatCur(m), amount, "h.loan");
    return true;
  };
  const repayLoans = (m, p) => {
    const total = p.loans.reduce((a, l) => a + l.debt, 0);
    if (!total || !m.debit(p, fiatCur(m), total, "h.loanRepay")) return false;
    p.loans = [];
    return true;
  };

  /* ----- landing & periodic ----- */
  // Returns special flow for the controller: null | 'anomaly' | 'card' | 'blackhole'
  const onLand = (m, p, id) => {
    const c = B.cells[id];
    const t = turn(m);
    const mdl = model(m, id);
    const s = mdl ? st(m, id) : null;
    const nar = m.scenario === "nar_nar";
    if (mdl === "kap" && s.type !== "free" && soleOwner(s) !== p.id && s.collect && !s.mortgaged) t.due = { id };
    if (mdl === "gos") t.due = { id };
    if (mdl === "nar" && Object.keys(s.owners).length && soleOwner(s) !== p.id) t.due = { id };
    if (c.kind === "tax") {
      const cur = nar ? "nar" : fiatCur(m);
      const amount = nar ? Math.min(SP.kvantalNar, p.wallet.nar) : Math.round((p.wallet.get(cur) * SP.kvantalPercent) / 100);
      if (amount > 0) m.debit(p, cur, amount, "h.tax", { cell: "#" + id });
    }
    if (c.kind === "grant") m.credit(p, nar ? "nar" : fiatCur(m), nar ? SP.iciteGrantNar : m.bank.fiat(SP.iciteGrant), "h.grant", { cell: "#" + id });
    if (id === "c20" && ["kap_nar", "nar_nar"].includes(m.scenario)) m.credit(p, "nar", SP.narmonyonNar, "h.narmonyon");
    if (id === "c10" && p.restrictions.patch > 0) {
      p.restrictions.patch -= 1;
      m.log({ key: "h.patchUsed", playerId: p.id });
      return null;
    }
    if (id === "c10") {
      p.restrictions.blackhole = true;
      m.log({ key: "h.blackhole", playerId: p.id });
      return "blackhole";
    }
    if (id === "c30") return "anomaly";
    if (c.kind === "chance" || c.kind === "borgi") return "card";
    return null;
  };

  const everyTurnStart = (m, p) => {
    p.turnsTaken = (p.turnsTaken || 0) + 1;
    if (p.turnsTaken % 10 !== 0 || !p.loans.length) return;
    const cur = fiatCur(m);
    p.loans.forEach((l) => {
      const due = Math.min(l.debt, Math.round(l.principal * 0.03));
      if (!p.wallet.has(cur, due) && loanLimit(m, p) >= due) takeLoan(m, p, due);
      if (m.debit(p, cur, due, "h.loanPay")) l.debt -= due;
      else p.status = "benefit";
    });
    p.loans = p.loans.filter((l) => l.debt > 0);
  };

  const onRound = (m, roundNo) => {
    const active = m.players.filter((pl) => pl.status !== "bankrupt");
    if (m.scenario === "gos_gos") active.forEach((pl) => m.credit(pl, "rub", m.flags.subbotnik ? 25 : 50, "h.gosIncome"));
    // Narmonia: rent fund returned to owners by shares every round
    Object.entries(m.cells).forEach(([id, s]) => {
      Object.entries(s.fund || {}).forEach(([cur, sum]) => {
        if (sum <= 0) return;
        Object.entries(s.owners).forEach(([pid, share]) => m.credit(m.player(pid), cur, r2(sum * share), "h.refund", { cell: "#" + id }));
        s.fund[cur] = 0;
      });
    });
    if (roundNo % 10 === 0) {
      // Kapmonia: property 1% + profit 25%; Narmonia: 1% by shares, returned equally
      const cur = fiatCur(m);
      active.forEach((pl) => {
        const tax = Math.round(kapPropertyValue(m, pl) * 0.01 + (pl.rentIncome || 0) * 0.25);
        if (tax > 0 && !m.debit(pl, cur, tax, "h.kapTax")) {
          m.debit(pl, cur, pl.wallet.get(cur), "h.kapTax");
          pl.status = "benefit";
        }
        pl.rentIncome = 0;
      });
      let collected = 0;
      Object.entries(m.cells).forEach(([id, s]) => {
        if (model(m, id) !== "nar") return;
        const tax = propValue(m, id, s) * 0.01;
        Object.entries(s.owners).forEach(([pid, share]) => {
          const pl = m.player(pid);
          const g = m.bank.usdToNar(tax * share);
          const opt = m.scenario === "kap_nar" && pl.wallet.has("usd", Math.round(tax * share)) ? { cur: "usd", amount: Math.round(tax * share) } : { cur: "nar", amount: Math.min(g, pl.wallet.nar) };
          if (pay(m, pl, opt, "h.narTax")) collected += fiatOf(m, opt);
        });
      });
      if (collected > 0) active.forEach((pl) => m.credit(pl, "nar", m.bank.usdToNar(collected / active.length), "h.narTaxBack"));
    }
    if (m.scenario === "gos_gos" && roundNo % 7 === 0) {
      active.forEach((pl) => {
        if ((pl.stats.builds || 0) - (pl.stats.buildsChecked || 0) < 5) {
          pl.recordMove("c10", pl.ring);
          pl.restrictions.blackhole = true;
          m.log({ key: "h.gosNorm", playerId: pl.id });
        }
        pl.stats.buildsChecked = pl.stats.builds || 0;
      });
    }
    active.forEach((pl) => refreshBenefit(m, pl));
  };

  const statusLabel = (m, id) => {
    const mdl = model(m, id);
    if (!mdl) return "";
    const s = st(m, id);
    const key = s.mortgaged ? "s_mortgaged" : mdl === "gos" ? (s.built ? "s_state" : "s_free") : s.type === "free" ? "s_free" : s.type === "people" ? "s_people" : s.type === "state" ? "s_state" : "s_private";
    return `${L("m_" + mdl)} · ${L(key)}`;
  };

  window.MPEco = {
    L, model, zone, fiatCur, SP, fiatOf, payOpts, canPayAny, st, price, buildCost, rentFor, tariffs, level, soleOwner, propValue, kapPropertyValue,
    ownedCells, actions, perform, auctionWin, jointBuy, publicBuild, mortgage, sellToBank, loanLimit, takeLoan, repayLoans,
    onLand, onRound, everyTurnStart, statusLabel, refreshBenefit,
  };
})();
