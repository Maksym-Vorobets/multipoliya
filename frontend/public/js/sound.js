// Synthesised game sounds (Web Audio, no files)
(function () {
  const KEY = "mp.sound";
  let ctx = null;
  let on = localStorage.getItem(KEY) !== "off";
  const ac = () => ctx || (ctx = new (window.AudioContext || window.webkitAudioContext)());

  const tone = (freq, dur, { type = "sine", vol = 0.1, at = 0, to = null } = {}) => {
    const c = ac();
    const t0 = c.currentTime + at;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  };
  const noise = (dur, { vol = 0.2, at = 0, freq = 1800, q = 1.2 } = {}) => {
    const c = ac();
    const t0 = c.currentTime + at;
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    const src = c.createBufferSource();
    const f = c.createBiquadFilter();
    const g = c.createGain();
    src.buffer = buf;
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = q;
    g.gain.value = vol;
    src.connect(f).connect(g).connect(c.destination);
    src.start(t0);
  };

  const SOUNDS = {
    click: () => tone(720, 0.07, { type: "triangle", vol: 0.06, to: 540 }),
    select: () => { tone(880, 0.08, { vol: 0.07 }); tone(1320, 0.09, { vol: 0.04, at: 0.05 }); },
    step: () => { noise(0.05, { vol: 0.12, freq: 900, q: 2 }); tone(300, 0.06, { type: "sine", vol: 0.05, to: 180 }); },
    bankrupt: () => {
      [523, 415, 330, 262].forEach((f, i) => tone(f, 0.28, { type: "sawtooth", vol: 0.05, at: i * 0.18, to: f * 0.94 }));
      noise(0.5, { vol: 0.12, at: 0.72, freq: 300, q: 0.8 });
    },
    dice: () => {
      // shake + a few bounces that decay
      for (let i = 0; i < 6; i++) noise(0.04, { vol: 0.18, at: i * 0.05, freq: 2400 + Math.random() * 1500, q: 3 });
      [0.42, 0.62, 0.78, 0.9, 0.98].forEach((at, i) => {
        noise(0.06, { vol: 0.32 * (1 - i * 0.17), at, freq: 1300 + Math.random() * 800, q: 2.5 });
        tone(180 + Math.random() * 60, 0.05, { vol: 0.08 * (1 - i * 0.17), at, to: 110 });
      });
    },
  };

  window.MPSound = {
    get on() { return on; },
    play(name) {
      if (!on) return;
      try {
        if (ac().state === "suspended") ctx.resume();
        SOUNDS[name]();
      } catch { /* audio unavailable */ }
    },
    toggle() {
      on = !on;
      localStorage.setItem(KEY, on ? "on" : "off");
      if (on) this.play("select");
    },
  };

  // Button and board-cell sounds
  document.addEventListener("pointerdown", (e) => {
    const el = e.target.closest("button, [data-prop-row]");
    if (!el || el.disabled) return;
    window.MPSound.play(el.closest("#board .cell, [data-prop-row], .rent-opt") ? "select" : "click");
  }, true);
})();
