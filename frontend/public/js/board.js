(function () {
  // Planet names (ru / uk / en)
  const NAMES = {
    moon: ["Луна", "Місяць", "Moon"], vesta: ["Веста", "Веста", "Vesta"], ceres: ["Церера", "Церера", "Ceres"],
    deimos: ["Деймос", "Деймос", "Deimos"], phobos: ["Фобос", "Фобос", "Phobos"], mars: ["Марс", "Марс", "Mars"],
    cerara: ["Церара", "Церара", "Cerara"], theia: ["Тея", "Тея", "Theia"], nibiru: ["Нибиру", "Нібіру", "Nibiru"],
    io: ["Ио", "Іо", "Io"], europa: ["Европа", "Європа", "Europa"], ganymede: ["Ганимед", "Ганімед", "Ganymede"],
    rhea: ["Рея", "Рея", "Rhea"], enceladus: ["Энцелад", "Енцелад", "Enceladus"], titan: ["Титан", "Титан", "Titan"],
    umbriel: ["Умбриэль", "Умбріель", "Umbriel"], oberon: ["Оберон", "Оберон", "Oberon"], titania: ["Титания", "Титанія", "Titania"],
    nereid: ["Нереида", "Нереїда", "Nereid"], proteus: ["Протей", "Протей", "Proteus"], triton: ["Тритон", "Тритон", "Triton"],
    haumea: ["Хаумеа", "Хаумеа", "Haumea"], makemake: ["Макемаке", "Макемаке", "Makemake"], eris: ["Эрида", "Ерида", "Eris"],
    orion: ["Ст. Орион", "Ст. Оріон", "Orion St."], pegasus: ["Ст. Пегас", "Ст. Пегас", "Pegasus St."],
    kiola: ["Ст. Киола", "Ст. Кіола", "Kiola St."], vega: ["Ст. Вега", "Ст. Вега", "Vega St."],
    chance: ["Chance", "Chance", "Chance"], borgi: ["Borgi", "Borgi", "Borgi"],
    kvantal: ["Квантал", "Квантал", "Kvantal"], icite: ["Айсайт", "Айсайт", "Icite"],
    c0: ["Istok Cosmoport", "Istok Cosmoport", "Istok Cosmoport"], c10: ["Black Hole", "Black Hole", "Black Hole"],
    c20: ["Narmonyon Centrary", "Narmonyon Centrary", "Narmonyon Centrary"], c30: ["Anomaly of Probability", "Anomaly of Probability", "Anomaly of Probability"],
  };
  const LANG_IDX = { ru: 0, uk: 1, en: 2 };

  // Planet art: base image + hue shift (design planets reused for the rest)
  const ART = {
    moon: ["moon", 0], vesta: ["planet-vesta", 0], ceres: ["planet-ceres", 0], deimos: ["planet-deimos", 0], phobos: ["planet-phobos", 0],
    mars: ["mars", 0], cerara: ["planet-deimos", 25], theia: ["planet-phobos", -20], nibiru: ["mars", 200], io: ["planet-phobos", 30],
    europa: ["moon", 0], ganymede: ["planet-ceres", 40], rhea: ["moon", 180], enceladus: ["planet-vesta", -20], titan: ["planet-proteus", 0],
    umbriel: ["planet-vesta", 30], oberon: ["planet-haumea", -40], titania: ["planet-deimos", 0], nereid: ["planet-nereid", 0],
    proteus: ["planet-proteus", 0], triton: ["planet-nereid", 40], haumea: ["planet-haumea", 0], makemake: ["mars", -15], eris: ["planet-ceres", 160],
  };

  // Side layouts in travel order (clockwise from Istok Cosmoport, bottom-right)
  const SIDES = [
    ["moon", "chance_borgi", "vesta", "ceres", "orion", "deimos", "phobos", "kvantal", "mars"],
    ["cerara", "borgi_chance", "theia", "nibiru", "pegasus", "io", "chance_borgi", "europa", "ganymede"],
    ["rhea", "enceladus", "borgi_chance", "titan", "kiola", "umbriel", "oberon", "icite", "titania"],
    ["nereid", "proteus", "chance_borgi", "triton", "vega", "haumea", "makemake", "borgi_chance", "eris"],
  ];
  const GROUPS = [
    ["red", ["moon", "vesta", "ceres"], "#e2513f"], ["orange", ["deimos", "phobos", "mars"], "#e8873a"],
    ["yellow", ["cerara", "theia", "nibiru"], "#e7c13a"], ["green", ["io", "europa", "ganymede"], "#36b45a"],
    ["sky", ["rhea", "enceladus", "titan"], "#3fb7e8"], ["blue", ["umbriel", "oberon", "titania"], "#3a6fe0"],
    ["violet", ["nereid", "proteus", "triton"], "#9a5ad8"], ["pink", ["haumea", "makemake", "eris"], "#d9579e"],
  ];
  // All prices/rents come from js/prices.js (window.MPPrices.cells)
  const STATIONS = ["orion", "pegasus", "kiola", "vega"];
  const PRICE = window.MPPrices.cells;
  const CORNERS = { 0: "c0", 10: "c10", 20: "c20", 30: "c30" };
  const CORNER_IMG = { c0: "obj-cosmoport", c10: "blackhole", c20: "obj-narmonyon", c30: "obj-anomaly" };

  const cells = {};
  const order = []; // [pos] -> ids at that position
  const groupOf = {};
  GROUPS.forEach(([g, list], gi) => list.forEach((k) => (groupOf[k] = gi)));

  for (let pos = 0; pos < 40; pos++) {
    if (CORNERS[pos]) {
      const id = CORNERS[pos];
      cells[id] = { id, pos, ring: 0, kind: "corner", key: id };
      order[pos] = [id];
      continue;
    }
    const side = Math.floor(pos / 10);
    const slot = (pos % 10) - 1;
    const token = SIDES[side][slot];
    order[pos] = [1, 2].map((ring) => {
      const id = `${pos}-${ring}`;
      let key = token;
      let kind = "planet";
      if (token.includes("_")) {
        const [outer, inner] = token.split("_").reverse(); // label "BORGI CHANCE": outer = chance, inner = borgi
        key = ring === 2 ? outer : inner;
        kind = key;
      } else if (STATIONS.includes(token)) kind = "station";
      else if (token === "kvantal") kind = "tax";
      else if (token === "icite") kind = "grant";
      const c = { id, pos, ring, kind, key, label: token.replace("_", " ").toUpperCase() };
      if (kind === "planet" || kind === "station") {
        const row = PRICE[`${key}-1${ring}`];
        Object.assign(c, { price: row.price, build: row.module, dome: row.dome, rent: row.rent });
        if (kind === "planet") c.group = groupOf[key];
      }
      cells[id] = c;
      return id;
    });
  }

  const groupCells = (gi, ring) => Object.values(cells).filter((c) => c.group === gi && c.ring === ring).map((c) => c.id);

  // Route graph: forward along a ring; corners and stations allow switching rings (zigzag)
  const next = (id) => {
    const c = cells[id];
    const np = (c.pos + 1) % 40;
    if (CORNERS[np]) return [CORNERS[np]];
    if (c.kind === "corner") return [`${np}-1`, `${np}-2`];
    const res = [`${np}-${c.ring}`];
    if (c.kind === "station") res.push(`${np}-${c.ring === 1 ? 2 : 1}`);
    return res;
  };

  const reachable = (from, steps) => {
    const results = new Map();
    const walk = (id, left, path) => {
      if (left === 0) {
        if (!results.has(id)) results.set(id, path);
        return;
      }
      next(id).forEach((n) => walk(n, left - 1, [...path, n]));
    };
    walk(from, steps, []);
    return [...results.entries()].map(([id, path]) => ({ id, path }));
  };

  // Shortest forward path to the first cell matching predicate (Anomaly)
  const forwardTo = (from, ring, pred) => {
    let id = from;
    const path = [];
    for (let i = 0; i < 40; i++) {
      const opts = next(id);
      id = opts.find((n) => cells[n].ring === ring) || opts[0];
      path.push(id);
      if (pred(cells[id])) return path;
    }
    return path;
  };

  const name = (id, lang) => {
    const c = cells[id];
    const n = NAMES[c.key] ? NAMES[c.key][LANG_IDX[lang] ?? 0] : c.key;
    return c.ring ? `${n} 1${c.ring}` : n;
  };
  const art = (id) => {
    const c = cells[id];
    if (c.kind === "corner") return { img: CORNER_IMG[c.id], hue: 0 };
    const a = ART[c.key];
    return a ? { img: a[0], hue: a[1] } : null;
  };
  const rentTable = (c) => ({ base: c.rent[0], double: c.rent[0] * 2, modules: c.rent.slice(0, 5), dome: c.rent[5] });

  window.MPBoard = { cells, groupOf, order, GROUPS, CORNERS, next, reachable, forwardTo, groupCells, name, art, rentTable, STATIONS };
})();
