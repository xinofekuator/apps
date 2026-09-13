const SAVE_KEY = 'koira-v1';

const App = {};

let state = Game.newGame();
let lastT = 0;
let autosaveTimer = null;
let primaryAction = null;

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

function escHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function showTitle() {
  state.phase = 'title';
  const hasSave = !!localStorage.getItem(SAVE_KEY);
  primaryAction = newGame;
  UI.showModal({
    title: 'KOIRA',
    fi: 'three days with Nina · a compact strategy walk',
    body: 'Nina is a rescued golden retriever puppy — sweet, wobbly, and opinionated about every dog on the street.\n\nEach turn pick one:\n✋ LEAVE IT — free, but fails if she is too stressed\n↔️ CROSS — costs 1 calm, always dodges (not the fence)\n🦴 TREAT — costs 1 calm + 1 treat, always works, but the next turn lands harder\n\nVisible queue = your strategy. 3 hearts/day. 2 failed days = week over.',
    takeaway: 'Plan the queue. Guard your calm. 6–7 turns per day.',
    win: false,
    actions: (hasSave ? [
      { id: 'cont', label: 'Continue', kind: 'primary', onClick: resumeGame },
      { id: 'new', label: 'New week', onClick: newGame },
    ] : [
      { id: 'new', label: 'Start the week →', kind: 'primary', onClick: newGame },
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
  showMorning();
}

function resumeGame() {
  UI.hideModal();
  UI.hideOverlay();
  track('resume', { day: state.dayIdx + 1 });
  UI.updateHud(state);
  UI.renderEncounter(state);
  if (state.phase === 'encounter' || state.phase === 'gate' || state.phase === 'park') {
    UI.toast('Back on the walk.', 'ok');
  } else if (state.phase === 'evening') showEvening();
  else if (state.phase === 'upgrade') showUpgrade();
  else if (state.phase === 'over') showEnding();
  else showMorning();
}

function showMorning() {
  state.phase = 'morning';
  const day = DAYS[state.dayIdx];
  const faileds = state.totals.daysFailed;
  const left = CONFIG.failAfterDays - faileds;
  primaryAction = startDayFlow;
  UI.showModal({
    title: 'Day ' + (state.dayIdx + 1) + ' — ' + day.name,
    fi: `trust ${Math.round(state.trust)} · ${left} ${left === 1 ? 'fail' : 'fails'} left before week over`,
    body: day.blurb + `\n\nHearts ${CONFIG.heartsPerDay} · Calm ${CONFIG.calmPerDay + (state.mods.calm ? 1 : 0)} · Treats ${CONFIG.treatsPerDay + (state.mods.pouch ? 1 : 0)}` + (state.run && state.run.sulk ? '\n\nNina is still sulking from yesterday.' : ''),
    takeaway: TUTORIAL.play + ' — ' + TUTORIAL.tip,
    win: false,
    actions: [{ id: 'go', label: 'Start the walk →', kind: 'primary', onClick: startDayFlow }],
  });
}

function startDayFlow() {
  Game.startDay(state);
  UI.hideModal();
  UI.clearBubble();
  UI.updateHud(state);
  UI.renderEncounter(state);
  track('day_start', { day: state.dayIdx + 1, attempt: state.run ? state.run.attempt : 1 });
}

function showEvening() {
  const r = state.run;
  const faileds = state.totals.daysFailed;
  const left = CONFIG.failAfterDays - faileds;
  if (state.overLose) { showEnding(); return; }
  if (state.pendingMiles > 0) { showUpgrade(); return; }
  state.phase = 'evening';
  save();
  const s = r ? r.dayStats : { cleans: 0, tense: 0, scenes: 0, barks: 0, sniffs: 0, parkWins: 0 };
  const failed = r && r.failed;
  const last = state.dayIdx >= DAYS.length - 1;
  primaryAction = last ? showEnding : advanceDay;
  const grade = !r ? '—' : failed ? 'F' : s.scenes === 0 && s.tense === 0 ? 'S' : s.scenes === 0 ? 'A' : s.scenes === 1 ? 'B' : 'C';
  UI.showModal({
    title: 'Day ' + (state.dayIdx + 1) + (failed ? ' — failed' : ' — done') + ` · ${grade}`,
    fi: DAYS[state.dayIdx].name + (failed ? ' · out of hearts' : ''),
    body: (failed ? 'Hearts hit zero. The day ends early.\n\n' : s.scenes === 0 && s.tense === 0 ? 'Silent walk. Beautiful.\n\n' : s.scenes === 0 ? 'No scenes. Held it together.\n\n' : 'Rough patches, but you finished.\n\n') +
      `Clean ${s.cleans} · Tense ${s.tense} · Scenes ${s.scenes} (barks ${s.barks}, sniffs ${s.sniffs}) · Park wins ${s.parkWins}` +
      `\n\nHearts left ${r ? r.hearts : 0} · Calm left ${r ? r.calm : 0} · Trust ${Math.round(state.trust)}` +
      (failed ? `\n\nFails: ${faileds}/${CONFIG.failAfterDays} — ${left} left before week over.` : ''),
    takeaway: failed ? 'Two failed days ends the week.' : last ? 'Week complete — see how it went.' : `Next: Day ${state.dayIdx + 2} — ${DAYS[Math.min(state.dayIdx + 1, DAYS.length - 1)].name}`,
    win: !failed,
    verdict: failed ? 'FAILED' : grade === 'S' ? 'SILENT WALK' : grade === 'A' ? 'CLEAN' : 'SURVIVED',
    extra: [
      { v: Math.round(state.trust), l: 'trust' },
      { v: r ? r.hearts : 0, l: 'hearts left' },
      { v: grade, l: 'grade' },
    ],
    actions: last
      ? [{ id: 'end', label: 'See how the week went →', kind: 'primary', onClick: showEnding }]
      : failed && faileds >= CONFIG.failAfterDays
        ? [{ id: 'end', label: 'Week over →', kind: 'primary', onClick: showEnding }]
        : [{ id: 'next', label: 'Sleep → day ' + (state.dayIdx + 2), kind: 'primary', onClick: advanceDay }],
  });
}

function advanceDay() {
  UI.hideModal();
  const nxt = Game.nextDay(state);
  save();
  if (!nxt) { showEnding(); return; }
  showMorning();
}

function showUpgrade() {
  state.phase = 'upgrade';
  save();
  const choices = Game.upgradeChoices(state);
  if (!choices.length) {
    state.pendingMiles = 0;
    showEvening();
    return;
  }
  primaryAction = () => chooseUpgrade(choices[0].id);
  UI.showModal({
    title: 'Trust milestone!',
    fi: `trust ${Math.round(state.trust)} · pick one`,
    body: 'Nina trusts you a little more. She almost looked at you instead of that poodle.\n\n' + choices.map((c) => '● ' + c.name + ' — ' + c.desc).join('\n'),
    takeaway: 'One pick. ' + (state.pendingMiles > 1 ? state.pendingMiles + ' milestones waiting.' : 'Then sleep.'),
    win: true,
    verdict: 'LEVEL UP',
    actions: choices.map((c, i) => ({
      id: c.id, label: c.name, kind: i === 0 ? 'primary' : 'ghost',
      onClick: () => chooseUpgrade(c.id),
    })),
  });
}

function chooseUpgrade(id) {
  SFX.ding();
  Game.applyUpgrade(state, id);
  save();
  const u = UPGRADES.find((x) => x.id === id);
  UI.toast('Learned: ' + (u ? u.name : id), 'ok');
  if (state.pendingMiles > 0) showUpgrade();
  else showEvening();
}

function showEnding() {
  state.phase = 'over';
  save();
  const e = Game.endingFor(state);
  const t = state.totals;
  const win = !state.overLose && state.trust >= 38;
  SFX[win ? 'win' : 'fail']();
  primaryAction = showTitle;
  const failedLine = state.overLose ? `\n\nFailed days: ${t.daysFailed}/${CONFIG.failAfterDays} — week over early.` : `\n\nFailed days: ${t.daysFailed}/${CONFIG.failAfterDays}`;
  UI.showModal({
    title: e.title,
    fi: `three days with Nina · trust ${Math.round(state.trust)}`,
    body: e.body + failedLine,
    verdict: e.verdict,
    win: win,
    extra: [
      { v: Math.round(state.trust), l: 'trust' },
      { v: t.scenes, l: 'scenes' },
      { v: t.cleans, l: 'cleans' },
      { v: t.parkWins, l: 'park wins' },
      { v: t.daysFailed, l: 'days failed' },
      { v: t.treatsUsed, l: 'treats used' },
    ],
    actions: [{ id: 'again', label: 'Walk another week', kind: 'primary', onClick: showTitle }],
  });
  track('game_end', { trust: Math.round(state.trust), scenes: t.scenes, overLose: !!state.overLose });
}

App.choose = function(choice) {
  SFX.start();
  if (state.phase !== 'encounter') return;
  const res = Game.resolveEncounter(state, choice);
  if (res.type === 'blocked') {
    SFX.tick();
    if (res.reason === 'calm') UI.toast('No calm left!', 'bad');
    else if (res.reason === 'treat') UI.toast('No treats left!', 'bad');
    else if (res.reason === 'fence') UI.toast('Cannot CROSS the fence — hold the line.', 'warn');
    return;
  }
  handleEncResult(res);
  UI.updateHud(state);
  UI.renderEncounter(state);
  save();
};

App.doGate = function(kind) {
  SFX.start();
  if (state.phase !== 'gate') return;
  if (kind === 'scout') {
    const reads = Game.scout(state);
    state.run._lastScout = reads;
    SFX.click();
    UI.toast(reads.length ? `Scouted: ${reads.map((d) => d.name).join(', ')}` : 'Scouted — fence empty?', 'warn');
    UI.renderEncounter(state);
    UI.say(`<span class="who">You:</span> ${pick(QUIPS.scout)}`, 2200);
    return;
  }
  if (kind === 'enter') {
    Game.enterPark(state);
    SFX.click();
    UI.updateHud(state);
    UI.renderEncounter(state);
    UI.toast('Inside the park. ' + TUTORIAL.park, 'warn');
    return;
  }
  if (kind === 'skip') {
    Game.skipPark(state);
    SFX.buzz();
    UI.updateHud(state);
    UI.renderEncounter(state);
    UI.say(`<span class="who">Nina:</span> NO.`, 2200);
    UI.toast(pick(QUIPS.sulk) + ' (Bribe costs 1 calm + 1 treat)', 'bad');
    return;
  }
};

App.doBribe = function() {
  SFX.start();
  const r = Game.bribe(state);
  if (r.ok) {
    SFX.munch();
    UI.toast(pick(QUIPS.bribe), 'ok');
    UI.updateHud(state);
    UI.renderEncounter(state);
    save();
  } else {
    SFX.buzz();
    if (r.reason === 'treat') UI.toast('No treats to bribe with.', 'bad');
    else if (r.reason === 'calm') UI.toast('No calm left to bribe.', 'bad');
  }
};

App.doPark = function(withTreat) {
  SFX.start();
  if (state.phase !== 'park') return;
  const res = Game.greetMeet(state, !!withTreat);
  if (!res.ok) {
    SFX.buzz();
    if (res.reason === 'treat') UI.toast('No treats left!', 'bad');
    else if (res.reason === 'calm') UI.toast('No calm left!', 'bad');
    return;
  }
  if (res.res === 'clean') { SFX.ding(); UI.toast(pick(QUIPS.parkWin), 'ok'); }
  else if (res.res === 'tense') { SFX.quip(); UI.toast(pick(QUIPS.parkTense), 'warn'); }
  else { SFX.bark(2); UI.toast('Scene at the park! ' + pick(QUIPS.barkOther), 'bad'); }
  if (state.phase === 'evening' || state.phase === 'over') { save(); showEvening(); return; }
  if (state.phase === 'park') {
    UI.updateHud(state);
    UI.renderEncounter(state);
    save();
    return;
  }
  if (state.phase === 'encounter' || state.phase === 'evening' || state.phase === 'upgrade') {
    UI.updateHud(state);
    UI.renderEncounter(state);
    save();
    if (state.phase === 'evening' || state.phase === 'upgrade') {
      if (state.pendingMiles > 0) showUpgrade(); else showEvening();
    }
    return;
  }
  UI.updateHud(state);
  UI.renderEncounter(state);
  save();
};

App.doParkExit = function() {
  SFX.start();
  if (state.phase !== 'park') return;
  const ex = Game.exitPark(state);
  if (ex) {
    SFX.click();
    UI.toast(ex.early ? `Out early. Wins kept: ${ex.wins}.` : `Out clean. Wins: ${ex.wins}.`, 'ok');
    UI.updateHud(state);
    UI.renderEncounter(state);
    save();
    if (state.phase === 'evening' || state.phase === 'upgrade') {
      if (state.pendingMiles > 0) showUpgrade(); else showEvening();
    }
  }
};

function handleEncResult(res) {
  if (res.type === 'enc-result') {
    if (res.outcome === 'clean') { SFX.ding(); UI.toast('Clean pass.', 'ok'); }
    else if (res.outcome === 'tense') { SFX.quip(); UI.toast('Tense — held it, but stress up.', 'warn'); }
    else if (res.outcome === 'bark') { SFX.bark(2); UI.toast('BARK! ' + pick(QUIPS.barkOther), 'bad'); UI.say(`<span class="who">You:</span> ${pick(QUIPS.barkYou)}`, 1800); }
    else if (res.outcome === 'sniff') { SFX.sniff(); UI.toast('Sniff-stop. ' + pick(QUIPS.sniff), 'warn'); }
  } else if (res.type === 'day-failed') {
    SFX.fail();
    UI.toast('Hearts gone — day failed.', 'bad');
    save();
    showEvening();
  } else if (res.type === 'day-done') {
    SFX.pass();
    if (state.phase === 'upgrade') showUpgrade(); else showEvening();
  } else if (res.type === 'gate') {
    if (res.outcome) {
      if (res.outcome === 'clean') SFX.ding();
      else if (res.outcome === 'tense') SFX.quip();
      else if (res.outcome === 'bark') SFX.bark(2);
      else if (res.outcome === 'sniff') SFX.sniff();
    }
    SFX.whine();
    UI.updateHud(state);
    UI.renderEncounter(state);
    UI.say(`<span class="who">Nina:</span> PARK. NOW.`, 2200);
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = lastT ? Math.min(0.033, (now - lastT) / 1000) : 0.016;
  lastT = now;
  UI.render(state, dt);
  UI.updateHud(state);
}

function key(e) {
  SFX.start();
  if (e.key === 'Enter' || e.key === ' ') {
    if (['title', 'morning', 'evening', 'upgrade', 'over'].includes(state.phase) && primaryAction) {
      const m = document.getElementById('modal');
      if (m && m.style.display !== 'none') { e.preventDefault(); UI.hideModal(); const f = primaryAction; primaryAction = null; f(); return; }
    }
  }
  if (state.phase === 'encounter') {
    if (e.key === '1') { e.preventDefault(); App.choose('leave'); return; }
    if (e.key === '2') { e.preventDefault(); App.choose('cross'); return; }
    if (e.key === '3') { e.preventDefault(); App.choose('treat'); return; }
    if (e.key === 'b' || e.key === 'B') { e.preventDefault(); App.doBribe(); return; }
  }
  if (state.phase === 'gate') {
    if (e.key === 's' || e.key === 'S') { e.preventDefault(); App.doGate('scout'); return; }
    if (e.key === 'e' || e.key === 'E') { e.preventDefault(); App.doGate('enter'); return; }
    if (e.key === 'w' || e.key === 'W') { e.preventDefault(); App.doGate('skip'); return; }
    if (e.key === 'b' || e.key === 'B') { e.preventDefault(); App.doBribe(); return; }
  }
  if (state.phase === 'park') {
    if (e.key === '1' || e.key === 'g' || e.key === 'G') { e.preventDefault(); App.doPark(false); return; }
    if (e.key === '3' || e.key === 't' || e.key === 'T') { e.preventDefault(); App.doPark(true); return; }
    if (e.key === 'x' || e.key === 'X' || e.key === '2') { e.preventDefault(); App.doParkExit(); return; }
  }
  if (e.key === 'r' || e.key === 'R') {
    if (state.phase === 'encounter' || state.phase === 'gate' || state.phase === 'park') {
      UI.hideModal(); UI.hideOverlay(); UI.clearBubble();
      Game.startDay(state);
      UI.updateHud(state);
      UI.renderEncounter(state);
      return;
    }
  }
  if (e.key === 'm' || e.key === 'M') { toggleMute(); return; }
}

function toggleMute() {
  state.muted = !state.muted;
  SFX.setMuted(state.muted);
  UI.updateHud(state);
  save();
  SFX.start();
}

function boot() {
  UI.init();
  const used = load();
  UI.updateHud(state);
  UI.renderEncounter(state);
  track('load', { saved: used });
  window.addEventListener('keydown', key);
  document.querySelectorAll('[data-action="retry"]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation(); SFX.start();
    if (state.run && ['encounter', 'gate', 'park'].includes(state.phase)) {
      UI.hideModal(); UI.hideOverlay(); UI.clearBubble();
      Game.startDay(state);
      UI.updateHud(state);
      UI.renderEncounter(state);
    } else if (['evening', 'upgrade', 'over', 'title', 'morning'].includes(state.phase)) {
      UI.hideModal();
      if (state.phase === 'over' || state.phase === 'title') showMorning();
      else Game.startDay(state), UI.updateHud(state), UI.renderEncounter(state);
    }
  }));
  document.querySelectorAll('[data-action="mute"]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation(); toggleMute();
  }));
  state.muted = used ? state.muted : false;
  SFX.setMuted(state.muted);
  showTitle();
  autosaveTimer = setInterval(() => { if (['encounter', 'gate', 'park'].includes(state.phase)) save(); }, 4000);
  window.addEventListener('beforeunload', save);
  requestAnimationFrame((t) => { lastT = t; frame(t); });
}

document.addEventListener('DOMContentLoaded', boot);
