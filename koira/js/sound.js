const SFX = (() => {
  let ctx = null;
  let master = null;
  let enabled = true;
  let started = false;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function now() { return ctx ? ctx.currentTime : 0; }

  function tone(freq, dur, type, gain, when, slide) {
    if (!ctx) return;
    const t = now() + (when || 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(1, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noise(dur, gain, when, hp) {
    if (!ctx) return;
    const t = now() + (when || 0);
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = src;
    if (hp) {
      const f = ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = hp;
      node.connect(f); f.connect(g);
    } else {
      node.connect(g);
    }
    g.connect(master);
    src.start(t); src.stop(t + dur + 0.05);
  }

  function setMuted(m) {
    enabled = !m;
    if (master) master.gain.value = enabled ? 0.9 : 0.0001;
  }

  function start() {
    if (!started && ensure()) started = true;
  }

  function bark(n) {
    const c = SFX_CFG.bark;
    const k = Math.min(4, Math.max(1, n || 2));
    for (let i = 0; i < k; i++) {
      tone(c.base, c.dur, 'square', c.gain, i * 0.16, c.base * 0.55);
      noise(0.06, 0.1, i * 0.16, 500);
    }
  }
  function whine() {
    const c = SFX_CFG.whine;
    tone(c.base, c.dur, 'sine', c.gain, 0, c.base * 0.5);
    tone(c.base * 1.2, c.dur * 0.8, 'sine', c.gain * 0.7, c.dur, c.base * 0.7);
  }
  function sniff() {
    for (let i = 0; i < 3; i++) noise(SFX_CFG.sniff.dur, SFX_CFG.sniff.gain, i * 0.11, 1200);
  }
  function munch() {
    noise(SFX_CFG.munch.dur, SFX_CFG.munch.gain, 0, 400);
    tone(300, 0.08, 'triangle', 0.12, 0.05, 180);
  }
  function growl() {
    const c = SFX_CFG.growl;
    tone(c.base, c.dur, 'sawtooth', c.gain, 0, c.base * 0.8);
    noise(c.dur * 0.7, 0.08, 0, 200);
  }
  function ding() { tone(SFX_CFG.ding.freq, SFX_CFG.ding.dur, 'sine', SFX_CFG.ding.gain, 0); tone(SFX_CFG.ding.freq * 1.5, 0.2, 'sine', 0.14, 0.08); }
  function tick() { tone(1150, SFX_CFG.tick.dur, 'square', SFX_CFG.tick.gain, 0); }
  function buzz() { tone(SFX_CFG.buzz.freq, SFX_CFG.buzz.dur, 'sawtooth', SFX_CFG.buzz.gain, 0, 90); }
  function click() { tone(880, 0.06, 'sine', 0.08, 0); }
  function quip() {
    tone(620, 0.09, 'square', 0.11, 0, 480);
    tone(520, 0.12, 'square', 0.09, 0.09, 420);
  }
  function pass() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'square', 0.13, i * 0.11));
  }
  function fail() {
    tone(392, 0.28, 'triangle', 0.18, 0, 360);
    tone(300, 0.42, 'triangle', 0.18, 0.28, 260);
  }
  function win() {
    [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, 0.3, 'square', 0.13, i * 0.13));
    tone(1046, 0.6, 'sine', 0.1, 0.8);
  }

  return { ensure, start, setMuted, bark, whine, sniff, munch, growl, ding, tick, buzz, click, quip, pass, fail, win, get started() { return started; } };
})();
