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
    rentMods: ["Аренда {n} модулей", "Оренда {n} модулів", "Rent {n} modules"], rentMod1: ["Аренда 1 модуля", "Оренда 1 модуля", "Rent 1 module"], rentDome: ["Аренда купола", "Оренда купола", "Dome rent"],
    m_kap: ["Капмония", "Капмонія", "Kapmonia"], m_gos: ["Госмония", "Госмонія", "Gosmonia"], m_nar: ["Нармония", "Нармонія", "Narmonia"],
    s_free: ["Свободный сектор", "Вільний сектор", "Free sector"], s_private: ["Частная собственность", "Приватна власність", "Private property"],
    s_people: ["Народная собственность", "Народна власність", "People's property"], s_state: ["Государственный объект", "Державний об'єкт", "State object"],
    s_mortgaged: ["В залоге", "У заставі", "Mortgaged"], s_shared: ["Долевая народная собственность", "Пайова народна власність", "Shared people's property"],
    utilRoll: ["Бросить кубики для расчёта аренды", "Кинути кубики для розрахунку оренди", "Roll the dice to set the rent"],
    rentMax: ["Аренда", "Оренда", "Rent"], sharedVote: ["голосование долевиков", "голосування пайовиків", "co-owners vote"],
    selfRentTax: ["Аренда самому себе (налог {p}%)", "Оренда самому собі (податок {p}%)", "Rent to yourself (tax {p}%)"],
  };
  const LI = { ru: 0, uk: 1, en: 2 };
  const L = (k, p = {}) => {
    let s = (L3[k] || [k])[LI[window.I18N.lang] ?? 0] || L3[k][0];
    Object.keys(p).forEach((x) => (s = s.replaceAll(`{${x}}`, p[x])));
    return s;
  };

  /* ----- model & currency ----- */
  const model = (m, id) => (["planet", "station", "utility"].includes(B.cells[id].kind) ? zone(m, id) : null);
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
    if (c.kind === "station" || c.kind === "utility") {
      const count = Math.max(1, B.setCells(c.kind, c.ring).filter((k) => sameHolding(m, id, k)).length);
      if (c.kind === "station") return m.bank.fiat(c.rent[Math.min(3, count - 1)]);
      // Utilities: the tenant rolls the dice once more; until then show the middle bracket
      const ur = m.turnState && m.turnState.utilRoll;
      const sum = ur && ur.id === id ? ur.sum : 7;
      return m.bank.fiat((count >= 2 ? c.rent.both : c.rent.one)[sum <= 4 ? 0 : sum <= 8 ? 1 : 2]);
    }
    const t = B.rentTable(c);
    const L_ = lvl ?? level(s);
    let base = L_ === 5 ? t.dome : t.modules[L_];
    if (L_ === 0 && groupComplete(m, id)) base = t.double;
    return m.bank.fiat(base);
  };
  // Same holding = same form of ownership AND the same owner(s); people's ≠ shared even with identical players
  const sameHolding = (m, a, b) => {
    const x = st(m, a);
    const y = st(m, b);
    const mdl = model(m, a);
    if (mdl !== model(m, b)) return false;
    if (mdl === "gos") return !!x.built && !!y.built;
    if (!Object.keys(x.owners).length || x.type !== y.type) return false;
    if (mdl === "kap") return !!soleOwner(x) && soleOwner(x) === soleOwner(y);
    const ka = Object.keys(x.owners).sort().join();
    return ka === Object.keys(y.owners).sort().join();
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
    return true;
  };
  // Double rent: every cell of the colour group is in the same kind of people's property
  const sameKindGroup = (m, id) => {
    const c = B.cells[id];
    if (c.group == null) return false;
    return B.groupCells(c.group, c.ring).every((g) => model(m, g) === "nar" && sameHolding(m, id, g));
  };
  // Narmonia rent choices: only what is actually built on the cell
  const tariffs = (m, id) => {
    const s = st(m, id);
    const t = B.rentTable(B.cells[id]);
    const f = (x) => m.bank.fiat(x);
    if (["station", "utility"].includes(B.cells[id].kind)) return [{ key: "rentTariff", fiat: rentFor(m, id) }];
    const list = [{ key: "rentTariff", fiat: f(t.base) }];
    if (sameKindGroup(m, id)) list.push({ key: "rentDoubleT", fiat: f(t.double) });
    for (let n = 1; n <= s.modules; n++) list.push({ key: "rentMods", n, fiat: f(t.modules[n]) });
    if (s.dome) list.push({ key: "rentDome", fiat: f(t.dome) });
    return list;
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
    return t.improved.includes(id) || t.improved.length >= 2;
  };
  const addSpent = (s, pl, opt) => {
    s.spent = s.spent || {};
    const sp = (s.spent[pl.id] = s.spent[pl.id] || {});
    sp[opt.cur] = r2((sp[opt.cur] || 0) + opt.amount);
    return true;
  };
  const didAct = (m, id, key) => (turn(m).done || []).includes(`${id}:${key}`);
  const markDone = (m, id, key) => (turn(m).done = [...(turn(m).done || []), `${id}:${key}`]);
  const markImproved = (m, id, p) => {
    turn(m).improved.push(id);
    p.stats.builds = (p.stats.builds || 0) + 1;
  };

  /* ----- action list ----- */
  // Every action on the current cell stays available until the turn ends (once per action per cell)
  const actions = (m, p, id, stage) => {
    const c = B.cells[id];
    const mdl = model(m, id);
    if (!mdl) return [];
    const s = st(m, id);
    const t = turn(m);
    const did = (k) => didAct(m, id, k);
    const list = [];
    const add = (a) => list.push({ ...a, opts: a.opts || [] });
    const owner = soleOwner(s);
    const due = stage === "post" && t.due && t.due.id === id;
    if (due && c.kind === "utility" && !(t.utilRoll && t.utilRoll.id === id)) return [{ id: "utilRoll", label: L("utilRoll"), opts: [], mandatory: true }];

    if (mdl === "kap") {
      if (s.type === "free") {
        if (!did("decline")) add({ id: "buy", label: L("buy"), opts: payOpts(m, price(m, id), { usdOnly: true }) });
        if (stage === "post" && !did("decline")) add({ id: "decline", label: L("decline") });
      } else if (owner && owner !== p.id) {
        if (due) {
          const rent = p.status === "benefit" ? rentFor(m, id, 0) : rentFor(m, id);
          add({ id: "payRent", rent: true, key: "rentMax", fiat: rent, label: L("payRent"), opts: payOpts(m, rent), mandatory: true });
          if (s.tender && c.build && !s.dome && !improveBlocked(m, id) && !did("tender")) add({ id: "tender", label: L("tender"), mandatory: true });
        }
      } else if (owner === p.id) {
        if (c.build && !s.mortgaged && s.modules < 4 && !improveBlocked(m, id)) add({ id: "module", label: L("module"), opts: payOpts(m, buildCost(m, id)) });
        if (c.build && !s.mortgaged && s.modules === 4 && !s.dome && !improveBlocked(m, id) && domeAllowed(m, p, id, "kap")) add({ id: "dome", label: L("dome"), opts: payOpts(m, buildCost(m, id, "dome")) });
        if (!s.mortgaged && !did("selfRent")) add({ id: "selfRent", label: L("selfRentTax", { p: SP.selfRentTaxPercent }), opts: payOpts(m, Math.round((rentFor(m, id) * SP.selfRentTaxPercent) / 100)) });
      }
    }

    if (mdl === "gos") {
      if (due) {
        const rent = rentFor(m, id);
        add({ id: "rentOrd", label: `${L("rentOrd")} (${rent})`, mandatory: true });
        add({ id: "rentDouble", label: L("rentDouble"), opts: payOpts(m, rent * 2), mandatory: true });
      }
      const gos = [{ cur: fiatCur(m), amount: 0 }];
      if (c.build && !improveBlocked(m, id)) {
        if (!s.built) add({ id: "gosBuild", label: L("gosBuild"), opts: gos, mandatory: due });
        else if (s.modules < 4) add({ id: "module", label: L("module"), opts: gos, mandatory: due });
        else if (!s.dome && domeAllowed(m, p, id, "gos")) add({ id: "dome", label: L("dome"), opts: gos, mandatory: due });
      } else if (["station", "utility"].includes(c.kind) && !s.built) add({ id: "gosBuild", label: L("gosBuild"), opts: gos, mandatory: due });
    }

    if (mdl === "nar") {
      if (!Object.keys(s.owners).length) {
        add({ id: "indBuy", label: L("indBuy"), opts: payOpts(m, price(m, id)) });
        add({ id: "jointBuy", label: L("jointBuy") });
        if (!did("publicBuild")) add({ id: "publicBuild", label: L("publicBuild") });
      } else {
        if (due) tariffs(m, id).forEach((r, i) => add({ id: "narRent", rent: true, tariff: i, key: r.key, n: r.n, fiat: r.fiat, label: L(r.n === 1 ? "rentMod1" : r.key, { n: r.n }), opts: payOpts(m, r.fiat), mandatory: true }));
        const kind = c.build && !s.dome && !improveBlocked(m, id) ? (s.modules < 4 ? "module" : domeAllowed(m, p, id, "nar") ? "dome" : null) : null;
        if (kind && s.type === "shared" && owner === p.id) add({ id: kind, label: L(kind), opts: payOpts(m, buildCost(m, id, kind)), mandatory: due });
        else if (kind && s.type === "shared" && !did("sharedBuild")) add({ id: "sharedBuild", kind, label: `${L(kind)} · ${L("sharedVote")}`, mandatory: due });
        else if (kind && s.type !== "shared" && !did("publicModule")) add({ id: "publicModule", kind, label: kind === "dome" ? L("dome") + " · " + L("publicModule") : L("publicModule"), mandatory: due });
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
    const done = (mandatory) => {
      if (mandatory || a.mandatory) t.due = null;
      markDone(m, id, a.id);
    };
    switch (a.id) {
      case "buy":
      case "indBuy": {
        if (!pay(m, p, opt, "h.buy", { cell: name })) return { ok: false };
        s.type = a.id === "buy" ? "private" : "shared";
        s.owners = { [p.id]: 1 };
        s.spent = {};
        if (a.id === "indBuy") addSpent(s, p, opt);
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
        p.stats.life += (fiatOf(m, opt) * 100) / SP.selfRentTaxPercent;
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
          if (s.type === "shared") addSpent(s, p, opt);
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
          done(true);
        } else {
          m.log({ key: "h.tenderFail", playerId: p.id, params: { cell: name } });
          markDone(m, id, "tender");
        }
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
      return opt && pay(m, pl, opt, "h.jointPart", { cell: "#" + id }) && addSpent(s, pl, opt);
    });
    if (!paid.length) return false;
    s.type = "shared";
    s.owners = Object.fromEntries(paid.map((pl) => [pl.id, 1 / paid.length]));
    paid.forEach((pl) => (pl.stats.build += part));
    turn(m).bought.push(id);
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

  // Each co-owner: share of the cost + share of the initiator's premium (own premium share is paid to yourself)
  const sharedPlan = (m, id, kind, initiator) => {
    const cost = buildCost(m, id, kind);
    const premium = (cost * SP.buildPremiumPercent) / 100;
    return Object.entries(st(m, id).owners).map(([pid, share]) => {
      const pl = m.player(pid);
      const part = Math.round(cost * share);
      const prem = pl === initiator ? 0 : Math.round(premium * share);
      const cur = payOpts(m, part + prem).find((o) => pl.wallet.has(o.cur, o.amount));
      const conv = (x) => (cur && cur.cur === "nar" ? m.bank.usdToNar(x) : x);
      return { pl, share, part, prem, opt: cur && { cur: cur.cur, amount: conv(part) }, premOpt: cur && { cur: cur.cur, amount: conv(prem) } };
    });
  };
  const sharedBuild = (m, id, initiator, kind) => {
    const s = st(m, id);
    const name = "#" + id;
    const plan = sharedPlan(m, id, kind, initiator);
    if (plan.some((x) => !x.opt)) {
      m.log({ key: "h.sharedNoFunds", playerId: initiator.id, params: { cell: name } });
      return false;
    }
    const premium = (buildCost(m, id, kind) * SP.buildPremiumPercent) / 100;
    plan.forEach((x) => {
      pay(m, x.pl, x.opt, "h.sharedPart", { cell: name });
      addSpent(s, x.pl, x.opt);
      x.pl.stats.build += fiatOf(m, x.opt);
      if (x.premOpt.amount > 0) m.transfer(x.pl, initiator, x.premOpt.cur, x.premOpt.amount, "h.premiumShare", { cell: name });
    });
    initiator.stats.build += premium;
    if (kind === "dome") s.dome = true;
    else s.modules += 1;
    markImproved(m, id, initiator);
    return true;
  };
  // Shared → people's property: the bank refunds every co-owner 100% of the invested value in Narmonit
  const canConvert = (m, id) => model(m, id) === "nar" && st(m, id).type === "shared" && Object.keys(st(m, id).owners).length > 0 && !didAct(m, id, "convert");
  // Refund = what each owner actually spent on the cell, modules and dome; dollars converted at today's gold price
  const convertRefunds = (m, id) => {
    const s = st(m, id);
    return Object.entries(s.owners).map(([pid, share]) => {
      const sp = (s.spent || {})[pid] || {};
      return { pl: m.player(pid), share, nar: r2((sp.nar || 0) + m.bank.usdToNar(sp.usd || 0)) };
    });
  };

  /* ----- shared property: buying a share at the standard price (cell + modules + dome), no bargaining ----- */
  const SHARE_SETS = [[1], [0.5, 0.5], [1 / 3, 1 / 3, 1 / 3], [0.25, 0.25, 0.25, 0.25]]; // 100 / 50 / 33 / 25 %
  const EPS = 1e-6;
  const shareValue = (m, id) => {
    const s = st(m, id);
    return Math.round(price(m, id) + (B.cells[id].build ? buildCost(m, id) * s.modules + (s.dome ? buildCost(m, id, "dome") : 0) : 0));
  };
  // Allowed targets for the buyer: final shares form an allowed set, nobody else gains,
  // nobody drops out, and the buyer ends up with no more than any other owner
  const shareOffers = (m, id, buyer) => {
    const s = st(m, id);
    if (model(m, id) !== "nar" || s.type !== "shared" || s.mortgaged) return [];
    const mine = s.owners[buyer.id] || 0;
    const others = Object.entries(s.owners).filter(([pid]) => pid !== buyer.id).sort((a, b) => b[1] - a[1]);
    if (!others.length) return [];
    const value = shareValue(m, id);
    const offers = [];
    [0.25, 1 / 3, 0.5].forEach((x) => {
      if (x <= mine + EPS) return;
      SHARE_SETS.filter((set) => set.length === others.length + 1).forEach((set) => {
        if (offers.some((o) => Math.abs(o.share - x) < EPS)) return;
        const rest = [...set];
        const i = rest.findIndex((v) => Math.abs(v - x) < EPS);
        if (i < 0) return;
        rest.splice(i, 1);
        rest.sort((a, b) => b - a);
        const ok = others.every(([, old], k) => rest[k] <= old + EPS && rest[k] > EPS && x <= rest[k] + EPS);
        if (!ok) return;
        const sellers = others.map(([pid, old], k) => ({ pl: m.player(pid), old, next: rest[k], give: old - rest[k] })).filter((v) => v.give > EPS);
        const pays = sellers.map((v) => ({ ...v, amount: Math.round(value * v.give) }));
        offers.push({ share: x, total: pays.reduce((acc, v) => acc + v.amount, 0), pays, next: Object.fromEntries([[buyer.id, x], ...others.map(([pid], k) => [pid, rest[k]])]) });
      });
    });
    return offers;
  };
  const buyShare = (m, id, buyer, offer, cur) => {
    const s = st(m, id);
    const conv = (x) => (cur === "nar" ? m.bank.usdToNar(x) : x);
    if (!buyer.wallet.has(cur, conv(offer.total))) return false;
    s.spent = s.spent || {};
    offer.pays.forEach((v) => {
      m.transfer(buyer, v.pl, cur, conv(v.amount), "h.shareSold", { cell: "#" + id, share: Math.round(v.give * 100) + "%" });
      const sp = s.spent[v.pl.id];
      if (sp) Object.keys(sp).forEach((k) => (sp[k] = r2((sp[k] * v.next) / v.old)));
    });
    addSpent(s, buyer, { cur, amount: conv(offer.total) });
    s.owners = offer.next;
    buyer.stats.build += offer.total;
    refreshBenefit(m, buyer);
    return true;
  };
  const convertShared = (m, id) => {
    const s = st(m, id);
    convertRefunds(m, id).forEach((r) => m.credit(r.pl, "nar", r.nar, "h.convertRefund", { cell: "#" + id }));
    const active = m.players.filter((pl) => pl.status !== "bankrupt");
    Object.assign(s, { type: "people", owners: Object.fromEntries(active.map((pl) => [pl.id, 1 / active.length])), mortgaged: false, spent: {} });
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
  const sellPrice = (m, id) => {
    const s = st(m, id);
    return Math.round((propValue(m, id, s) * (SP.sellToBankPercent - (s.mortgaged ? SP.mortgagePercent : 0))) / 100);
  };
  const sellToBank = (m, p, id) => {
    const s = st(m, id);
    m.credit(p, fiatCur(m), sellPrice(m, id), "h.sell", { cell: "#" + id });
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
    const key = s.mortgaged ? "s_mortgaged" : mdl === "gos" ? (s.built ? "s_state" : "s_free") : s.type === "free" ? "s_free" : s.type === "people" ? "s_people" : s.type === "shared" ? "s_shared" : s.type === "state" ? "s_state" : "s_private";
    return `${L("m_" + mdl)} · ${L(key)}`;
  };

  window.MPEco = {
    L, model, zone, fiatCur, SP, fiatOf, payOpts, canPayAny, st, price, buildCost, rentFor, tariffs, level, soleOwner, propValue, kapPropertyValue,
    ownedCells, actions, perform, auctionWin, jointBuy, publicBuild, sharedBuild, sharedPlan, canConvert, convertRefunds, convertShared, shareOffers, buyShare, markDone, didAct, mortgage, sellPrice, sellToBank, loanLimit, takeLoan, repayLoans,
    onLand, onRound, everyTurnStart, statusLabel, refreshBenefit,
  };
})();
