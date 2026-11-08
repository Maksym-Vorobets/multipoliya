// One-off: writes systemModalsText defaults into content-default.js from modals_spec.json + current translations
const fs = require("fs");
const JS = "/app/frontend/public/js/";
global.window = {};
global.localStorage = { getItem: () => null, setItem() {} };
global.navigator = { language: "ru" };
global.document = { documentElement: {}, querySelectorAll: () => [], addEventListener() {}, dispatchEvent() {}, title: "" };
global.CustomEvent = function () {};
eval(fs.readFileSync(JS + "i18n.js", "utf8"));
const I = window.I18N;
["game.js", "cards.js", "net.js"].forEach((f) => {
  const src = fs.readFileSync(JS + f, "utf8");
  const i = src.indexOf("window.I18N.extend(");
  const j = src.indexOf("\n  });", i);
  I.extend(eval("(" + src.slice(i + "window.I18N.extend(".length, j) + "\n  })"));
});
const spec = JSON.parse(fs.readFileSync("/app/memory/modals_spec.json", "utf8"));
const LANGS = { RU: "ru", EN: "en", UA: "uk" };
const out = {};
for (const [modal, fields] of Object.entries(spec.fields)) {
  out[modal] = {};
  for (const [L, l] of Object.entries(LANGS)) {
    I.setLang(l);
    out[modal][L] = {};
    for (const [f, tpl] of Object.entries(fields)) {
      const s = typeof tpl === "object" ? tpl[L] : tpl;
      out[modal][L][f] = s.replace(/\{t:([\w.]+)\}/g, (_, k) => { const v = I.t(k); if (v === k) throw new Error("missing " + k); return v; });
    }
  }
}
const labels = Object.fromEntries(Object.entries(spec.labels).map(([k, [ru, en, uk]]) => [k, { ru, en, uk }]));
let file = fs.readFileSync(JS + "content-default.js", "utf8");
const block = `  // Texts of game modal windows: [modal][RU|EN|UA][field]; {name} placeholders are filled by the game
  systemModalsText: {
${Object.entries(out).map(([k, v]) => `    ${k}: ${JSON.stringify(v)}`).join(",\n")}
  },
`;
file = file.replace(/  \/\/ Texts of game modal windows[\s\S]*?\n  \},\n/, "");
file = file.replace("  fields: [\n", block + "  fields: [\n");
file = file.replace(/\nwindow\.MP_MODAL_LABELS = [\s\S]*$/, "\n");
file = file.trimEnd() + `\n// Admin labels of the modal blocks (not part of the config)\nwindow.MP_MODAL_LABELS = ${JSON.stringify(labels)};\n`;
fs.writeFileSync(JS + "content-default.js", file);
console.log(Object.keys(out).length, JSON.stringify(out.anomalyReroll), JSON.stringify(out.loanInterest.UA).slice(0, 300));
