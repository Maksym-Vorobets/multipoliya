(function () {
  const CURRENCIES = ["usd", "rub", "nar"];
  const SAVE_KEY = "mp.match";
  const uid = () => Math.random().toString(36).slice(2, 10);
  const round2 = (n) => Math.round(n * 100) / 100;

  // Scenario economic config (start sums, per-round payments)
  const SCENARIO_RULES = {
    kap_kap: { start: { usd: 2000 }, benefit: { cur: "usd", amount: 50 }, ubi: 0 },
    kap_nar: { start: { usd: 2000, nar: 1 }, benefit: null, ubi: 1 },
    nar_nar: { start: { nar: 1 }, benefit: null, ubi: 1 },
    gos_gos: { start: { rub: 50 }, benefit: null, ubi: 0 },
    kap_gos: { start: { rub: 2000 }, benefit: { cur: "rub", amount: 50 }, ubi: 0 }, // start sum: awaiting customer
  };

  class Wallet {
    constructor(init = {}) {
      CURRENCIES.forEach((c) => (this[c] = init[c] || 0));
    }
    get(cur) { return this[cur]; }
    has(cur, amount) { return this[cur] + 1e-9 >= amount; }
    add(cur, amount) { this[cur] = round2(this[cur] + amount); }
    sub(cur, amount) {
      if (!this.has(cur, amount)) throw new Error("INSUFFICIENT_FUNDS");
      this[cur] = round2(this[cur] - amount);
    }
    active(currencies) { return currencies.map((c) => [c, this[c]]); }
    toJSON() { return Object.fromEntries(CURRENCIES.map((c) => [c, this[c]])); }
  }

  class Player {
    constructor(d) {
      this.id = d.id || uid();
      this.idx = d.idx;
      this.name = d.name;
      this.color = d.color;
      this.isBot = !!d.isBot;
      this.botType = d.botType || null;
      this.cell = d.cell && window.MPBoard.cells[d.cell] ? d.cell : "c0";
      this.stats = d.stats || { build: 0, life: 0, builds: 0 };
      this.turnsTaken = d.turnsTaken || 0;
      this.rentIncome = d.rentIncome || 0;
      this.ring = d.ring || 1;
      this.moves = d.moves || [];
      this.status = d.status || "active"; // active | benefit | bankrupt
      this.doubles = d.doubles || 0;
      this.restrictions = d.restrictions || {};
      this.loans = d.loans || [];
      this.props = d.props || [];
      this.wallet = new Wallet(d.wallet);
    }
    get hasProperty() { return this.props.length > 0; }
    recordMove(cell, ring) {
      this.cell = cell;
      this.ring = ring;
      this.moves = [...this.moves, { cell, ring }].slice(-10);
    }
    toJSON() {
      const { id, idx, name, color, isBot, botType, cell, ring, moves, status, doubles, restrictions, loans, props, wallet, stats, turnsTaken, rentIncome } = this;
      return { id, idx, name, color, isBot, botType, cell, ring, moves, status, doubles, restrictions, loans, props, wallet, stats, turnsTaken, rentIncome };
    }
  }

  class HistoryLog {
    constructor(entries = []) { this.entries = entries; }
    add(e) {
      const entry = { id: uid(), ts: Date.now(), ...e };
      this.entries.push(entry);
      return entry;
    }
    recent(n) { return this.entries.slice(-n); }
    finance() { return this.entries.filter((e) => e.money); }
    toJSON() { return this.entries; }
  }

  class Bank {
    constructor(d = {}) {
      this.goldPrice = d.goldPrice || 100; // $ per 1 g
      this.priceIndex = d.priceIndex || 1; // fiat multiplier (inflation/deflation)
      this.gosFund = d.gosFund || 0;
    }
    // Fiat prices follow priceIndex; Narmonit amounts stay unchanged
    fiat(amount) { return Math.round(amount * this.priceIndex); }
    usdToNar(usd) { return round2(usd / this.goldPrice); }
    applyIndex(factor) {
      this.priceIndex = round2(this.priceIndex * factor);
      this.goldPrice = round2(100 * this.priceIndex);
    }
    toJSON() { return { goldPrice: this.goldPrice, priceIndex: this.priceIndex, gosFund: this.gosFund }; }
  }

  class Match extends EventTarget {
    constructor(d) {
      super();
      this.id = d.id || uid();
      this.scenario = d.scenario;
      this.currencies = d.currencies;
      this.players = d.players.map((p) => (p instanceof Player ? p : new Player(p)));
      this.active = d.active || 0;
      this.turnNo = d.turnNo || 1;
      this.roundNo = d.roundNo || 1;
      this.phase = d.phase || "await_roll"; // await_roll | await_move | await_end | finished
      this.lastRoll = d.lastRoll || null;
      this.moveOptions = d.moveOptions || null;
      this.turnState = d.turnState || Match.freshTurn();
      this.bank = new Bank(d.bank);
      this.history = new HistoryLog(d.history);
      this.cells = d.cells || {}; // cellId -> ownership/build state
      this.flags = d.flags || {}; // subbotnik, ad bonus rounds, etc.
      this.decks = d.decks || {}; // shuffled Chance/Borgi decks
    }

    static create({ scenario, currencies, players }) {
      const rules = SCENARIO_RULES[scenario];
      const m = new Match({
        scenario,
        currencies,
        players: players.map((p) => new Player({ ...p, wallet: rules.start, status: rules.benefit ? "benefit" : "active" })),
      });
      m.log({ key: "h.created", params: { scenario: `@scn.${scenario}.name` } });
      m.players.forEach((p) => m.log({ key: "h.start", playerId: p.id, money: Object.entries(rules.start).map(([cur, amount]) => ({ cur, amount })) }));
      m.save();
      return m;
    }

    static freshTurn() { return { stage: "pre", acted: { pre: false, post: false }, bought: [], improved: [], due: null, declined: null }; }

    get rules() { return SCENARIO_RULES[this.scenario]; }
    get current() { return this.players[this.active]; }
    player(id) { return this.players.find((p) => p.id === id); }

    log(e) { return this.history.add({ turnNo: this.turnNo, roundNo: this.roundNo, ...e }); }

    changed() {
      this.save();
      this.dispatchEvent(new Event("change"));
    }

    /* ----- money operations: every operation is logged ----- */
    credit(player, cur, amount, key = "h.credit", params = {}) {
      player.wallet.add(cur, amount);
      this.log({ key, params, playerId: player.id, money: [{ cur, amount }] });
    }
    debit(player, cur, amount, key = "h.debit", params = {}) {
      if (!player.wallet.has(cur, amount)) return false;
      player.wallet.sub(cur, amount);
      this.log({ key, params, playerId: player.id, money: [{ cur, amount: -amount }] });
      return true;
    }
    transfer(from, to, cur, amount, key = "h.transfer", params = {}) {
      if (!from.wallet.has(cur, amount)) return false;
      from.wallet.sub(cur, amount);
      to.wallet.add(cur, amount);
      this.log({ key, params: { ...params, to: to.name }, playerId: from.id, money: [{ cur, amount: -amount }] });
      return true;
    }

    /* ----- turn flow ----- */
    roll(forced) {
      if (this.phase !== "await_roll") return null;
      const a = forced ? forced[0] : 1 + Math.floor(Math.random() * 6);
      const b = forced ? forced[1] : 1 + Math.floor(Math.random() * 6);
      const p = this.current;
      const double = a === b;
      p.doubles = double ? p.doubles + 1 : 0;
      this.lastRoll = { a, b, sum: a + b, double };
      this.log({ key: double ? "h.rollDouble" : "h.roll", playerId: p.id, params: { a, b, sum: a + b } });
      if (p.doubles >= 3) {
        p.doubles = 0;
        p.recordMove("c10", p.ring);
        p.restrictions.blackhole = true;
        this.lastRoll.toBlackHole = true;
        this.log({ key: "h.threeDoubles", playerId: p.id });
        this.phase = "await_end";
      } else {
        this.moveOptions = window.MPBoard.reachable(p.cell, a + b);
        this.phase = "await_move";
      }
      this.changed();
      return this.lastRoll;
    }

    // Confirm destination; returns special flow (anomaly/card/blackhole) for the controller
    move(cellId, { teleport } = {}) {
      const p = this.current;
      if (!teleport && (this.phase !== "await_move" || !this.moveOptions.some((o) => o.id === cellId))) return { error: "unavailable" };
      const from = p.cell;
      p.recordMove(cellId, window.MPBoard.cells[cellId].ring || p.ring);
      this.moveOptions = null;
      this.phase = "await_end";
      this.turnState.stage = "post";
      this.log({ key: "h.move", playerId: p.id, params: { from: "#" + from, to: "#" + cellId } });
      const flow = window.MPEco.onLand(this, p, cellId);
      this.changed();
      return { flow };
    }

    endTurn() {
      if (this.phase !== "await_end" || this.turnState.due) return false;
      const p = this.current;
      const extra = this.lastRoll && this.lastRoll.double && !this.lastRoll.toBlackHole && !p.restrictions.blackhole;
      this.turnNo += 1;
      this.lastRoll = null;
      this.phase = "await_roll";
      this.turnState = Match.freshTurn();
      if (extra) {
        this.log({ key: "h.extraTurn", playerId: p.id });
        this.changed();
        return true;
      }
      p.doubles = 0;
      this.log({ key: "h.endTurn", playerId: p.id });
      this.active = (this.active + 1) % this.players.length;
      if (this.active === 0) this.completeRound();
      window.MPEco.everyTurnStart(this, this.current);
      this.changed();
      return true;
    }

    // Periodic calculations after every full round of turns
    completeRound() {
      const { benefit, ubi } = this.rules;
      this.log({ key: "h.round", params: { n: this.roundNo } });
      this.players.forEach((p) => {
        if (benefit) {
          p.status = p.hasProperty ? "active" : "benefit";
          if (p.status === "benefit") this.credit(p, benefit.cur, this.bank.fiat(benefit.amount), "h.benefit");
        }
        if (ubi) this.credit(p, "nar", ubi, "h.ubi");
      });
      window.MPEco.onRound(this, this.roundNo);
      this.roundNo += 1;
    }

    /* ----- persistence ----- */
    toJSON() {
      const { id, scenario, currencies, players, active, turnNo, roundNo, phase, lastRoll, bank, history, cells, moveOptions, turnState, flags, decks } = this;
      return { id, scenario, currencies, players, active, turnNo, roundNo, phase, lastRoll, bank, history, cells, moveOptions, turnState, flags, decks };
    }
    save() {
      if (!this.online) localStorage.setItem(SAVE_KEY, JSON.stringify(this));
    }
    static load() {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      try { return new Match(JSON.parse(raw)); } catch { return null; }
    }
    static clear() { localStorage.removeItem(SAVE_KEY); }
  }

  window.MPState = { Match, Player, Wallet, Bank, HistoryLog, SCENARIO_RULES, CURRENCIES };
})();
