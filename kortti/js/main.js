const SAVE_KEY = 'kortti-v1';

const App = {};

let state = Game.newGame();
let lastT = 0;
let countdown = 0;
let bubbleTimer = null;
let autosaveTimer = null;
let holdBoost = false;
let lastTickCeil = null;
let heikkiQuipTimer = 14;
let storyBeat = 0;

function track(name, params) { if (typeof gtag === 'function') gtag('event', name, params); }

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(Game.syncSave(state))); } catch (e) {}
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s = Game.fromSave(JSON.parse(raw));
      if (s) { state = s; return true; }
    }
  } catch (e) {}
  return false;
}

function bubbleHtml(txt, fi) {
  return `<span class="who">Heikki:</span> ${escHtml(txt)}${fi ? `<br><span class="fi">${escHtml(fi)}</span>` : ''}`;
}
function escHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function currentConf() {
  return ROUNDS[state.roundIdx];
}

function startRoundFlow(opts) {
  const forceRestart = !!(opts && opts.restart);
  const conf = currentConf();
  lastTickCeil = null;
  const fresh = forceRestart || !state.run || state.run.finished || state.run.conf !== conf.id;
  if (fresh) {
    Game.startRound(state);
    heikkiQuipTimer = 14;
    holdBoost = false;
    Game.setBoost(state, false);
  }
  UI.hideModal();
  UI.clearBubble();
  if (state.run) UI.updateHud(state);
  track('round_start', { round: state.roundIdx + 1, attempt: state.run ? state.run.attempt : 1, restart: !!forceRestart });
  if (fresh && state.roundIdx > 0) {
    showStoryStep();
  } else {
    beginCountdown();
  }
}

function beginCountdown() {
  countdown = 3.6;
  state.phase = 'countdown';
  heikkiQuipTimer = 22;
}

function countdownTick(dt) {
  countdown -= dt;
  const n = Math.ceil(countdown);
  const cfg = currentConf();
  if (countdown > 0.9) {
    UI.showOverlay(`<div class="big">${n}</div><div class="sub">${cfg.fi} · ${cfg.en}</div><div class="sub" style="opacity:.7">${cfg.blurb}</div>`);
  } else if (countdown > 0.3) {
    UI.showOverlay('<div class="big">GO!</div><div class="sub">Aja · Drive!</div>');
  } else {
    UI.hideOverlay();
    state.phase = 'drive';
    const line = cfg.mech === 'whiteout' ? TUTORIAL_LINES.winter : cfg.mech === 'gusts' ? TUTORIAL_LINES.autumn : TUTORIAL_LINES.drive;
    UI.say(bubbleHtml(line), 5200);
  }
}

function showTitle() {
  const hasSave = !!localStorage.getItem(SAVE_KEY);
  UI.showModal({
    title: 'KORTTI',
    fi: 'the pink licence — 100 points to pass every exam',
    body: 'Start 85 → need 100.\n\n✓ Right +8 · ✗ Wrong -12 · Trick -5 · Coin +1 · Boost +1 / 8s clean\nStay in lane A or B to answer — or TAP ↑ to lock in early (holding ↑ for speed won’t lock). Middle = wrong.\nCrash -10 to -18 (×2 if boosting) → 0 = BOOM.\n\n← → lane · hold ↑ boost · tap ↑ lock · R retry · P pause · M mute',
    takeaway: '2 right answers + a few coins/boosts = pass. Clean driving matters.',
    win: false,
    actions: (hasSave ? [
      { id: 'cont', label: 'Continue', kind: 'primary', onClick: resumeGame },
      { id: 'new', label: 'New game', onClick: newGame },
    ] : [
      { id: 'new', label: 'Aloitetaan! · Let\'s begin', kind: 'primary', onClick: newGame },
    ]),
  });
}

function newGame() {
  const wasMuted = state.muted;
  state = Game.newGame();
  state.muted = wasMuted;
  save();
  UI.hideModal();
  track('game_start');
  showStoryStep();
}

function resumeGame() {
  UI.hideModal();
  UI.hideOverlay();
  if (state.run && !state.run.finished) {
    state.phase = 'drive';
    UI.updateHud(state);
    track('resume', { round: state.roundIdx + 1 });
  } else {
    if (state.roundIdx >= ROUNDS.length) state.roundIdx = ROUNDS.length - 1;
    startRoundFlow();
  }
}

function showStoryStep() {
  const story = STORY[state.roundIdx];
  storyBeat = 0;
  state.phase = 'story';
  renderStoryBeat(story);
}

function renderStoryBeat(story) {
  const beat = story.beats[Math.min(storyBeat, story.beats.length - 1)];
  const last = storyBeat >= story.beats.length - 1;
  const cta = last
    ? `<div style="margin-top:14px;background:#ffd23f;color:#1c2434;padding:12px 22px;border-radius:999px;font-weight:900;font-size:16px;letter-spacing:.5px;animation:pulse 1.1s infinite;box-shadow:0 6px 22px rgba(0,0,0,.35);cursor:pointer;">▶ ALOITA KOELÄHTÖ — CLICK TO START</div><div style="font-size:11px;opacity:.6;margin-top:8px;">click / tap anywhere · Enter / Space</div>`
    : `<div style="margin-top:12px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.35);color:#fff;padding:10px 20px;border-radius:999px;font-weight:800;font-size:14px;letter-spacing:.3px;animation:pulse 1.4s infinite;cursor:pointer;">jatka — click / tap / Enter →</div>`;
  UI.showOverlay(
    `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px;cursor:pointer;">` +
    `<div class="big" style="font-size:76px">${beat.icon}</div>` +
    `<div class="sub" style="font-size:18px;font-weight:800;">${escHtml(beat.label)}</div>` +
    `<div class="sub" style="opacity:.75;font-size:14px;">${escHtml(story.fi)}</div>` +
    `${cta}</div><style>@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}</style>`
  );
}

function storyAdvance() {
  const story = STORY[state.roundIdx];
  if (!story) { startRoundFlow(); return; }
  if (storyBeat < story.beats.length - 1) {
    storyBeat += 1;
    renderStoryBeat(story);
  } else {
    storyBeat = 0;
    UI.hideOverlay();
    startRoundFlow();
  }
}

let revealData = null;

function heikkiSVG(mood) {
  const angry = mood === 'angry';
  const trick = mood === 'trick';
  const happy = mood === 'happy';
  const mouth = angry ? 'M 36 62 Q 48 52 60 62' : trick ? 'M 38 60 Q 48 64 58 60' : happy ? 'M 34 58 Q 48 72 62 58' : 'M 36 60 L 60 60';
  const browL = angry ? 'M 22 28 L 36 32' : 'M 22 26 L 36 28';
  const browR = angry ? 'M 60 32 L 74 28' : 'M 60 28 L 74 26';
  const eyeFill = angry ? '#2b0707' : '#1c2434';
  return `<svg width="88" height="88" viewBox="0 0 96 96" style="flex-shrink:0;filter:drop-shadow(0 3px 8px rgba(0,0,0,.35))"><circle cx="48" cy="48" r="42" fill="#e8c9a6" stroke="#8a5a3b" stroke-width="3"/><path d="M 14 38 Q 48 6 82 38 L 78 28 Q 48 -2 18 28 Z" fill="#d8dde6" stroke="#8a5a3b" stroke-width="2"/><path d="M 22 42 Q 48 48 74 42" stroke="#8a5a3b" stroke-width="1.5" fill="none" opacity=".35"/><circle cx="34" cy="40" r="9" fill="#fff" stroke="#1c2434" stroke-width="1.8"/><circle cx="62" cy="40" r="9" fill="#fff" stroke="#1c2434" stroke-width="1.8"/><circle cx="34" cy="40" r="3.2" fill="${eyeFill}"/><circle cx="62" cy="40" r="3.2" fill="${eyeFill}"/><circle cx="35.5" cy="38.2" r="1.2" fill="#fff"/><circle cx="63.5" cy="38.2" r="1.2" fill="#fff"/><path d="${browL}" stroke="#5a3a2a" stroke-width="2.6" stroke-linecap="round"/><path d="${browR}" stroke="#5a3a2a" stroke-width="2.6" stroke-linecap="round"/><path d="M 42 48 L 48 54 L 54 48" stroke="#7a4a33" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${mouth}" stroke="#5a1a1a" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M 18 52 Q 14 56 18 60" stroke="#5a3a2a" stroke-width="1.4" fill="none" opacity=".5"/><path d="M 78 52 Q 82 56 78 60" stroke="#5a3a2a" stroke-width="1.4" fill="none" opacity=".5"/><path d="M 28 68 Q 48 76 68 68" stroke="#8a5a3b" stroke-width="1" fill="none" opacity=".45"/></svg>`;
}

function showAnswerReveal(ev) {
  const q = ev.q || {};
  const real = q.real || '';
  const isTrick = ev.vec === 'trick';
  const isOk = ev.ok;
  const mood = isTrick ? 'trick' : isOk ? 'happy' : 'angry';
  const title = isTrick ? 'EI KUMPIKAAN · NEITHER WAS RIGHT' : isOk ? 'OIKEIN · RIGHT!' : ev.vec === 'middle' ? 'KESKELLÄ · MIDDLE = NO ANSWER' : ev.vec === 'timeout' ? 'AIKA LOPPU · TOO SLOW' : 'VÄÄRIN · WRONG';
  const color = isTrick ? '#ffb23f' : isOk ? '#4fd17a' : '#e5484d';
  const deltaStr = (ev.delta > 0 ? '+' : '') + ev.delta + ' pts';
  const lockedNote = ev.advance ? '<span style="opacity:.7;font-size:11px;letter-spacing:.5px;">↑ LOCKED IN</span><br>' : '<span style="opacity:.55;font-size:11px;">stayed in lane</span><br>';
  const trickLine = isTrick ? `<div style="margin:8px 0;font-size:13px;opacity:.9;line-height:1.3;">${escHtml(RIG_FAILS[Math.floor(Math.random()*RIG_FAILS.length)])}</div>` : !isOk ? `<div style="margin:8px 0;font-size:13px;opacity:.9;line-height:1.3;">${escHtml(WRONG_LINES[Math.floor(Math.random()*WRONG_LINES.length)])}</div>` : '';
  state.phase = 'reveal';
  revealData = ev;
  const face = heikkiSVG(mood);
  UI.showOverlay(
    `<div style="max-width:360px;display:flex;flex-direction:column;align-items:center;gap:12px;padding:14px;cursor:pointer;">` +
    `<div style="display:flex;gap:14px;align-items:center;">${face}<div style="text-align:left;"><div style="font-size:10px;letter-spacing:1.5px;opacity:.7;">HEIKKI · 62 · EXAMINER SINCE 1987</div><div style="font-size:20px;font-weight:900;color:${color};line-height:1.1;">${title}</div><div style="font-size:12px;font-weight:800;margin-top:2px;">${deltaStr}</div></div></div>` +
    `${trickLine}` +
    `<div style="background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.18);border-radius:10px;padding:10px 14px;font-size:14px;line-height:1.4;max-width:340px;">${lockedNote}${escHtml(real)}</div>` +
    `<div style="margin-top:4px;background:#ffd23f;color:#1c2434;padding:8px 18px;border-radius:999px;font-weight:900;font-size:13px;letter-spacing:.3px;animation:pulse 1.1s infinite;">jatka — click / tap / Enter / ↑</div>` +
    `</div><style>@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}</style>`
  );
}

function dismissReveal() {
  if (state.phase !== 'reveal') return;
  UI.hideOverlay();
  revealData = null;
  state.phase = 'drive';
  UI.clearBubble();
}

function showPassOk() {
  const r = state.run;
  const conf = currentConf();
  const quip = PASS_QUIPS[state.roundIdx % PASS_QUIPS.length];
  if (state.roundIdx >= ROUNDS.length - 1) {
    showWin();
    return;
  }
  UI.showModal({
    title: 'Round passed',
    fi: conf.fi + ' · ' + conf.en,
    body: quip + '\n\nYou\u2019re moving on. Next up: ' + ROUNDS[state.roundIdx + 1].fi + ' · ' + ROUNDS[state.roundIdx + 1].en,
    takeaway: 'Score this exam: ' + r.score + ' points.',
    win: true,
    verdict: 'PASS',
    extra: [{ v: r.score, l: 'points — ' + ((r.results || []).filter((x) => x.ok).length) + ' answers right' }],
    actions: [{ id: 'next', label: 'Next exam →', kind: 'primary', onClick: () => { Game.endDrive(state); startRoundFlow(); } }],
  });
}

function showFail() {
  const r = state.run;
  const conf = currentConf();
  UI.showModal({
    title: r.exploded ? 'The Car Exploded' : 'Failed',
    fi: r.exploded ? 'Auto räjähti · Heikki is furious' : 'Hylätty · failed the practice exam',
    body: r.reason + '\n\n' + 'Your score: ' + r.score + ' (you need ' + conf.minPass + '). Heikki has already picked his next reason.',
    takeaway: 'Attempt ' + r.attempt + '. He never runs out of reasons.',
    win: false,
    verdict: r.exploded ? 'EXPLODED!' : 'FAIL',
    extra: [{ v: r.score, l: 'points this run' }],
    actions: [{ id: 'retry', label: 'Yritä uudelleen · Try again', kind: 'primary', onClick: () => startRoundFlow({restart:true}) }],
  });
}

function showWin() {
  const r = state.run;
  SFX.win();
  state.phase = 'over';
  UI.showModal({
    title: ENDINGS.win.title,
    fi: ENDINGS.win.fi,
    body: ENDINGS.win.body + '\n\n' + (state.ending || WIN_LINES[(state.attempts[state.run.conf] || 1) % WIN_LINES.length]),
    verdict: 'VICTORY',
    win: true,
    extra: [
      { v: r.score, l: 'final exam points' },
      { v: state.best, l: 'best round score' },
      { v: Object.values(state.attempts).reduce((a, b) => a + b, 0), l: 'total attempts' },
    ],
    actions: [{ id: 'again', label: 'Aja uudelleen · Drive again', kind: 'primary', onClick: showTitle }],
  });
  track('game_end', { win: true, score: r.score });
}

function handleEvents(events) {
  for (const ev of events) {
    if (ev.type === 'collide') {
      if (state.run && state.run.activeGate) { UI.clearBubble(); }
      SFX.hit();
      const line = HAZARD_LINES[(ev.ob.type === 'ped' ? 3 : ev.ob.type === 'moose' ? 4 : 1) % HAZARD_LINES.length];
      const boostNote = ev.boost ? ' 2×!' : '';
      UI.toast(escHtml(line + boostNote), 'bad');
      if ((!state.run || !state.run.activeGate) && Math.random() < 0.28) UI.say(bubbleHtml(line), 1700);
    } else if (ev.type === 'gate-approach') {
      UI.clearBubble();
      SFX.click();
      track('gate_approach', { qid: Game.questionFor(ev.gate)?.qid || '' });
    } else if (ev.type === 'pickup') {
      SFX.plink();
    } else if (ev.type === 'boostBonus') {
      SFX.ding();
      UI.toast('+1 steady hand at high speed! · Vakaa käsivarsi, pistettä!', 'ok');
    } else if (ev.type === 'answer') {
      const q = ev.q || {};
      if (ev.advance) SFX.advance();
      if (ev.vec === 'trick') { SFX.rig(); }
      else if (ev.ok) { SFX.ding(); }
      else { SFX.buzz(); }
      showAnswerReveal(ev);
    } else if (ev.type === 'explode') {
      SFX.boom();
      UI.toast('CAR DESTROYED · Auto räjähti! Heikki is furious.', 'bad');
      setTimeout(() => { if (state.run && state.run.exploded && state.phase === 'finish') showFail(); }, 1500);
      track('round_explode', { round: state.roundIdx + 1, attempt: state.run.attempt });
    } else if (ev.type === 'finish') {
      track('round_end', { round: state.roundIdx + 1, passed: ev.passed, score: ev.score });
      if (ev.passed) {
        SFX.pass();
        save();
        showPassOk();
      } else {
        SFX.fail();
        save();
        showFail();
      }
    }
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = lastT ? Math.min(0.033, (now - lastT) / 1000) : 0.016;
  lastT = now;

  const conf = currentConf();
  const r = state.run;
  const driving = state.phase === 'drive' && !!r && !r.finished;
  SFX.setSeason(state.roundIdx);
  SFX.setDriving(driving);
  if (driving) {
    const dv = Game.driveSpeed(state);
    const n = Math.min(1, Math.max(0, (dv - conf.baseSpeed) / conf.baseSpeed));
    SFX.setSpeed(n);
  } else {
    SFX.setSpeed(-1);
  }

  if (state.phase === 'countdown') {
    countdownTick(dt);
  } else if (state.phase === 'drive') {
    const events = Game.update(state, dt);
    if (events.length) handleEvents(events);
    const g = state.run.activeGate;
    if (g && !g.done && state.run.gateT <= 4.01) {
      const c = Math.ceil(state.run.gateT);
      if (c !== lastTickCeil) { lastTickCeil = c; SFX.tick(); }
    } else {
      lastTickCeil = null;
    }
    const run = state.run;
    if (run && !run.finished && !run.activeGate && !run.exploding) {
      heikkiQuipTimer -= dt;
      if (heikkiQuipTimer <= 0) {
        const quip = HEIKKI_QUIPS[Math.floor(Math.random() * HEIKKI_QUIPS.length)];
        UI.say(bubbleHtml(quip), 1500);
        SFX.quip();
        heikkiQuipTimer = 18 + Math.random() * 10;
      }
    }
  } else if (r && r.boom > 0) {
    r.boom = Math.max(0, r.boom - dt);
  }

  UI.updateHud(state);
  UI.render(state, dt);
}

function key(e) {
  SFX.start();
  if (state.phase === 'reveal') {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); dismissReveal(); return; }
    if (e.key === 'Escape') { e.preventDefault(); dismissReveal(); return; }
  }
  if (state.phase === 'story') {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); storyAdvance(); return; }
    if (e.key === 'Escape') { e.preventDefault(); return; }
  }
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { e.preventDefault(); Game.setLaneTarget(state, -1); return; }
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); Game.setLaneTarget(state, 1); return; }
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    e.preventDefault();
    if (e.repeat) { holdBoost = true; Game.setBoost(state, true); return; }
    const wasHeld = holdBoost;
    const hadGate = !!(state.run && state.run.activeGate && !state.run.activeGate.done);
    holdBoost = true; Game.setBoost(state, true);
    if (state.phase === 'drive' && hadGate && !wasHeld) Game.setAdvance(state);
    if (state.phase === 'reveal') { dismissReveal(); }
    return;
  }
  if (e.key === 'Enter' || e.key === ' ') {
    if (state.phase === 'story') { e.preventDefault(); storyAdvance(); return; }
    if (state.phase === 'reveal') { e.preventDefault(); dismissReveal(); return; }
  }
  if (e.key === 'r' || e.key === 'R') {
    if (state.run && (state.phase === 'drive' || state.phase === 'countdown' || state.phase === 'paused' || state.phase === 'reveal' || state.phase === 'story' || state.phase === 'finish')) { UI.hideOverlay(); revealData=null; startRoundFlow({restart:true}); return; }
  }
  if (e.key === 'p' || e.key === 'P') {
    if (state.phase === 'drive' || state.phase === 'paused') {
      if (typeof togglePause === 'function') togglePause();
      else {
        if (state.phase === 'drive') { state.phase='paused'; UI.showOverlay('<div class="big" style="font-size:36px">PAUSE</div><div class="sub">P / ⏸ to resume</div>'); }
        else { state.phase='drive'; UI.hideOverlay(); }
      }
      return;
    }
    return;
  }
  if (e.key === 'm' || e.key === 'M') {
    if (typeof toggleMute === 'function') toggleMute();
    else { state.muted=!state.muted; SFX.setMuted(state.muted); UI.updateHud(state); }
    return;
  }
}

function stageTap(e) {
  const rect = UI.canvasRect();
  if (!rect) return;
  const x = e.clientX - rect.left;
  SFX.start();
  if (state.phase === 'story') { storyAdvance(); return; }
  if (state.phase === 'reveal') { dismissReveal(); return; }
  if (state.phase === 'countdown') return;
  if (state.phase === 'drive') Game.setLaneTarget(state, x < rect.width / 2 ? -1 : 1);
}

function overlayClick(e) {
  SFX.start();
  if (state.phase === 'story') { storyAdvance(); return; }
  if (state.phase === 'reveal') { dismissReveal(); return; }
  if (state.phase === 'countdown') return;
}

function boot() {
  UI.init();
  UI.canvasRect = () => {
    const c = document.getElementById('game');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  };
  const used = load();
  UI.updateHud(state);
  track('load', { saved: used });
  window.addEventListener('keydown', key);
  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { holdBoost = false; Game.setBoost(state, false); }
  });
  window.addEventListener('blur', () => { holdBoost = false; Game.setBoost(state, false); });
  document.getElementById('game').addEventListener('pointerdown', (e) => stageTap(e));
  document.getElementById('overlay').addEventListener('click', overlayClick);
  document.getElementById('overlay').addEventListener('pointerdown', (e) => { e.preventDefault(); overlayClick(e); });
  function togglePause() {
    if (state.phase === 'drive') {
      state.phase = 'paused';
      UI.showOverlay('<div class="big" style="font-size:36px">PAUSE</div><div class="sub">P / ⏸ to resume</div><div style="margin-top:12px;background:#ffd23f;color:#1c2434;padding:10px 18px;border-radius:999px;font-weight:900;cursor:pointer;" onclick="window._korttiResume&&window._korttiResume()">▶ RESUME</div>');
    } else if (state.phase === 'paused') {
      state.phase = 'drive';
      UI.hideOverlay();
    } else if (state.phase === 'reveal') { dismissReveal(); }
    else if (state.phase === 'story') { storyAdvance(); }
  }
  function toggleMute() {
    state.muted = !state.muted;
    SFX.setMuted(state.muted);
    UI.updateHud(state);
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(Game.syncSave(state))); } catch(e){}
    SFX.start();
  }
  window._korttiResume = togglePause;
  function doRetry() {
    if (!state.run) { newGame(); return; }
    if (['drive','countdown','paused','reveal','story','finish'].includes(state.phase)) {
      UI.hideOverlay(); revealData=null; SFX.start();
      startRoundFlow({restart:true});
    }
  }
  document.querySelectorAll('[data-action="pause"]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation(); togglePause();
  }));
  document.querySelectorAll('[data-action="mute"]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation(); toggleMute();
  }));
  document.querySelectorAll('[data-action="retry"],[data-action="retry2"]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation(); doRetry();
  }));
  document.getElementById('overlay').addEventListener('click', (e) => {
    if (state.phase === 'paused') { e.preventDefault(); togglePause(); return; }
  });
  const boostBtn = document.getElementById('boostBtn');
  let boostWasHeld = false;
  const setBoostTouch = (held) => { holdBoost = held; Game.setBoost(state, held); UI.updateHud(state); };
  if (boostBtn) {
    boostBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault(); SFX.start();
      const hadGate = !!(state.run && state.run.activeGate && !state.run.activeGate.done);
      const wasHeld = holdBoost;
      setBoostTouch(true);
      if (state.phase === 'drive' && hadGate && !wasHeld) Game.setAdvance(state);
      if (state.phase === 'reveal') dismissReveal();
      else if (state.phase === 'story') storyAdvance();
      boostWasHeld = true;
    });
    boostBtn.addEventListener('pointerup', (e) => { e.preventDefault(); setBoostTouch(false); boostWasHeld=false; });
    boostBtn.addEventListener('pointercancel', () => { setBoostTouch(false); boostWasHeld=false; });
    boostBtn.addEventListener('pointerleave', () => { if (boostWasHeld) setBoostTouch(false); });
  }
  document.querySelectorAll('[data-steer]').forEach((b) => {
    const dir = parseInt(b.getAttribute('data-steer'),10);
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); SFX.start(); Game.setLaneTarget(state, dir); });
  });
  state.muted = used ? state.muted : false;
  SFX.setMuted(state.muted);

  if (used && state.run && !state.run.finished) {
    showTitle();
  } else if (used) {
    state.roundIdx = Math.min(state.roundIdx, ROUNDS.length - 1);
    showTitle();
  } else {
    showTitle();
  }

  autosaveTimer = setInterval(() => { if (state.phase === 'drive' || state.phase === 'countdown') save(); }, 4000);
  window.addEventListener('beforeunload', save);
  requestAnimationFrame((t) => { lastT = t; frame(t); });
}

document.addEventListener('DOMContentLoaded', boot);