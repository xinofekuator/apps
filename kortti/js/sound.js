const SFX = (() => {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineOsc2 = null;
  let engineLp = null;
  let engineLfo = null;
  let engineLfoGain = null;
  let engineGain = null;
  let windGain = null;
  let windLp = null;
  let windSrc = null;
  let padGain = null;
  let pad1 = null;
  let pad2 = null;
  let windBase = 0.03;
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
    if (!started && ensure()) {
      started = true;
      const t = now();
      const ec = SFX_CFG.engine;
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = ec.base;
      engineOsc2 = ctx.createOscillator();
      engineOsc2.type = 'square';
      engineOsc2.frequency.value = ec.base * 0.5;
      engineOsc2.detune.value = 7;
      engineLfo = ctx.createOscillator();
      engineLfo.type = 'triangle';
      engineLfo.frequency.value = ec.lfo;
      engineLfoGain = ctx.createGain();
      engineLfoGain.gain.value = ec.lfoDepth;
      engineLfo.connect(engineLfoGain);
      engineLfoGain.connect(engineOsc.frequency);
      engineLp = ctx.createBiquadFilter();
      engineLp.type = 'lowpass';
      engineLp.frequency.value = ec.lp.base;
      engineLp.Q.value = 2.2;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineLp);
      engineOsc2.connect(engineLp);
      engineLp.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start(t); engineOsc2.start(t); engineLfo.start(t);

      const wl = ctx.createBufferSource();
      const wlen = Math.floor(ctx.sampleRate * 2);
      const wbuf = ctx.createBuffer(1, wlen, ctx.sampleRate);
      const wd = wbuf.getChannelData(0);
      for (let i = 0; i < wlen; i++) wd[i] = Math.random() * 2 - 1;
      wl.loop = true;
      wl.buffer = wbuf;
      windLp = ctx.createBiquadFilter();
      windLp.type = 'lowpass';
      windLp.frequency.value = SFX_CFG.wind.cutoff;
      windLp.Q.value = 0.6;
      windGain = ctx.createGain();
      windGain.gain.value = 0.0001;
      wl.connect(windLp); windLp.connect(windGain); windGain.connect(master);
      wl.start(t);

      padGain = ctx.createGain();
      padGain.gain.value = 0.0001;
      padGain.connect(master);
      pad1 = ctx.createOscillator();
      pad1.type = 'sine';
      pad1.frequency.value = 196;
      pad1.detune.value = -4;
      pad2 = ctx.createOscillator();
      pad2.type = 'sine';
      pad2.frequency.value = 293.66;
      pad2.detune.value = 4;
      pad1.connect(padGain);
      pad2.connect(padGain);
      pad1.start(t); pad2.start(t);
    }
  }

  function setSpeed(n) {
    if (!started) return;
    const t = now();
    const ec = SFX_CFG.engine;
    if (n < 0) {
      engineGain.gain.setTargetAtTime(0.0001, t, 0.08);
      engineLp.frequency.setTargetAtTime(110, t, 0.1);
      engineLfoGain.gain.setTargetAtTime(0, t, 0.1);
      return;
    }
    const f = ec.base + n * ec.spread;
    engineOsc.frequency.setTargetAtTime(f, t, 0.05);
    engineOsc2.frequency.setTargetAtTime(f * 0.5, t, 0.05);
    engineLp.frequency.setTargetAtTime(ec.lp.base + n * ec.lp.spread, t, 0.08);
    engineLfoGain.gain.setTargetAtTime(ec.lfoDepth, t, 0.1);
    engineGain.gain.setTargetAtTime(ec.gain * (0.3 + 0.7 * n), t, 0.06);
  }

  function setWind(on) {
    if (!started) return;
    const t = now();
    windGain.gain.setTargetAtTime(on ? windBase : 0.0001, t, 0.4);
  }

  function setSeason(i) {
    if (!started) return;
    windBase = SFX_CFG.windSeasons[(i % SFX_CFG.windSeasons.length)] || 0.03;
    windLp.frequency.setTargetAtTime(SFX_CFG.wind.cutoff + (i % 3) * 30, now(), 0.5);
    const ch = SFX_CFG.pads[i % SFX_CFG.pads.length] || SFX_CFG.pads[4];
    pad1.frequency.setTargetAtTime(ch[0], now(), 0.6);
    pad2.frequency.setTargetAtTime(ch[1], now(), 0.6);
  }

  function setDriving(on) {
    if (!started) return;
    const t = now();
    windGain.gain.setTargetAtTime(on ? windBase : 0.0001, t, 0.4);
    padGain.gain.setTargetAtTime(on ? SFX_CFG.pad.gain : 0.0001, t, 0.35);
  }

  function skid() { noise(SFX_CFG.skid.dur, SFX_CFG.skid.gain, 0, 900); }
  function hit() {
    const t = 0;
    tone(120, SFX_CFG.hit.dur, 'square', SFX_CFG.hit.gain, t, 70);
    noise(SFX_CFG.hit.dur, 0.18, t, 300);
  }
  function ding() { tone(SFX_CFG.ding.freq, SFX_CFG.ding.dur, 'sine', SFX_CFG.ding.gain, 0); tone(SFX_CFG.ding.freq * 1.5, 0.2, 'sine', 0.14, 0.08); }
  function plink() { tone(880, SFX_CFG.plink.dur, 'sine', SFX_CFG.plink.gain, 0); tone(1318, 0.12, 'sine', 0.1, 0.06); }
  function tick() { tone(1150, SFX_CFG.tick.dur, 'square', SFX_CFG.tick.gain, 0); }
  function advance() {
    tone(220, 0.05, 'sawtooth', 0.16, 0, 80);
    tone(880, 0.12, 'square', 0.13, 0.02, 700);
  }
  function buzz() { tone(SFX_CFG.buzz.freq, SFX_CFG.buzz.dur, 'sawtooth', SFX_CFG.buzz.gain, 0, 90); }
  function rig() {
    tone(300, 0.16, 'triangle', 0.16, 0, 230);
    tone(190, 0.3, 'triangle', 0.16, 0.17, 140);
  }
  function boom() {
    noise(SFX_CFG.boom.dur, SFX_CFG.boom.gain, 0, 180);
    tone(150, SFX_CFG.boom.dur, 'sawtooth', 0.35, 0, 40);
    tone(60, SFX_CFG.boom.dur, 'sine', 0.3, 0.05, 22);
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
  function horn() { tone(440, 0.18, 'square', 0.12, 0); tone(368, 0.18, 'square', 0.12, 0); }
  function click() { tone(880, 0.06, 'sine', 0.08, 0); }
  function quip() {
    tone(620, 0.09, 'square', 0.11, 0, 480);
    tone(520, 0.12, 'square', 0.09, 0.09, 420);
  }
  function gust() {
    noise(0.7, 0.13, 0, 200);
    tone(180, 0.55, 'sawtooth', 0.1, 0, 70);
  }

  return { ensure, start, setSpeed, setWind, setSeason, setDriving, skid, hit, ding, plink, tick, advance, buzz, rig, boom, pass, fail, win, horn, click, quip, gust, setMuted, get started() { return started; } };
})();