const SFX = (() => {
  let ctx = null;
  let muted = false;
  function ensure() {
    if (ctx) return ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
    return ctx;
  }
  function tone(freq, dur, type, vol, slide) {
    if (muted) return;
    const c = ensure(); if (!c) return;
    if (c.state === 'suspended') c.resume();
    const o = c.createOscillator(); const g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.value = vol || 0.2;
    o.connect(g); g.connect(c.destination);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, c.currentTime + dur);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.start(); o.stop(c.currentTime + dur);
  }
  return {
    setMuted(v){ muted = !!v; },
    isMuted(){ return muted; },
    start(){ ensure(); if (ctx && ctx.state==='suspended') ctx.resume(); },
    tick(){ tone(900,0.08,'sine',0.18); },
    ding(){ tone(880,0.18,'sine',0.22); setTimeout(()=>tone(1108,0.22,'sine',0.18),90); },
    buzz(){ tone(180,0.22,'square',0.12,120); },
    win(){ tone(523,0.18,'sine',0.22); setTimeout(()=>tone(659,0.18,'sine',0.22),140); setTimeout(()=>tone(784,0.28,'sine',0.22),280); setTimeout(()=>tone(1046,0.42,'sine',0.2),460); },
    tiempo(){ tone(700,0.14,'square',0.18); setTimeout(()=>tone(900,0.22,'square',0.2),120); setTimeout(()=>tone(1200,0.35,'sine',0.22),280); },
    reveal(){ tone(650,0.12,'sine',0.2,900); },
  };
})();
