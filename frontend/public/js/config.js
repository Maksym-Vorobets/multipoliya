// game_content_config: fields (names, prices, rents) + Chance/Borgi cards. Server copy overrides the built-in fallback.
(function () {
  const D = window.MP_CONTENT_DEFAULT;
  const clone = (x) => JSON.parse(JSON.stringify(x));
  let cfg = clone(D);
  let version = 0;

  // Compound inflation: base × (1 + rate%)^(round − 1)
  const calculateFiatPrice = (basePrice, currentRound, inflationRate) =>
    Math.round(basePrice * Math.pow(1 + (inflationRate || 0) / 100, Math.max(0, (currentRound || 1) - 1)));

  const fieldName = (fields, id, lang) => {
    const f = fields.find((x) => x.id === id);
    return f ? f.name[lang] || f.name.ru : id;
  };
  // {{field_<id>_name}} → field name; {{amount}}, {{amount2}}, {{amount/N}} → fmt(value, key)
  const parseCardTemplate = (card, fieldsConfig, { lang = window.I18N.lang, fmt = (n) => String(n) } = {}) => {
    const tpl = card.textTemplate || {};
    return (tpl[lang] || tpl.ru || "")
      .replace(/\{\{field_([a-z0-9]+)_name\}\}/gi, (_, id) => fieldName(fieldsConfig, id, lang))
      .replace(/\{\{(amount2?)(?:\/(\d+))?\}\}/g, (_, k, d) => fmt((+card[k] || 0) / (+d || 1), k));
  };

  // Server config merged over defaults by field id / deck, so new fields keep working with an older saved config
  const merge = (c) => {
    const base = clone(D);
    const byId = Object.fromEntries((c.fields || []).map((f) => [f.id, f]));
    return {
      inflationRate: Number.isFinite(+c.inflationRate) ? +c.inflationRate : base.inflationRate,
      fields: base.fields.map((f) => (byId[f.id] ? { ...f, ...byId[f.id], type: f.type, name: { ...f.name, ...(byId[f.id].name || {}) } } : f)),
      cards: Object.fromEntries(Object.entries(base.cards).map(([d, l]) => [d, Array.isArray(c.cards && c.cards[d]) && c.cards[d].length ? c.cards[d] : l])),
    };
  };
  const apply = (c) => {
    cfg = merge(c || {});
    version++;
    window.MPBoard.applyFields(cfg.fields);
    document.dispatchEvent(new CustomEvent("langchange", { detail: window.I18N.lang }));
  };
  fetch(window.MP_API + "/content-config")
    .then((r) => (r.ok ? r.json() : null))
    .then((c) => c && c.fields && apply(c))
    .catch(() => {});

  window.MPConfig = {
    get: () => cfg, defaults: () => clone(D), apply, calculateFiatPrice, parseCardTemplate,
    get version() { return version; }, get inflationRate() { return cfg.inflationRate || 0; },
  };
})();
