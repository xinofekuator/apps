// ============================================================
//  SPRINTFIRE — bootstrap, state, event wiring
// ============================================================

const SAVE_KEY = 'sprintfire-v1';

const App = {};

let state = Game.newGame();

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {}
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      // discard saves from an older data version (stale points/capacities/tree)
      if (s && s.saveVersion === CONFIG.saveVersion && s.sprint !== undefined && s.tickets && s.crew) {
        state = s;
        return true;
      }
    }
  } catch (e) {}
  return false;
}

function startIntro() {
  UI.showModal({
    title: 'SPRINTFIRE',
    win: false,
    body: [
      'Six sprints. One arena FPS. Run Maia, Zoe, Rook — and NOVA, an AI that hallucinates.',
      '',
      '• Finish tickets to unlock the next. NOVA is powerful — and dangerous.',
      '• Overload them >~65% for too long → burnout; ignore it → they quit. NOVA has a token budget.',
      '',
      'Ship v1.0.',
    ].join('\n'),
    takeaway: 'Click a ticket, then a teammate. End Sprint to run it.',
    actions: [
      { id: 'go', label: 'Let\'s ship', kind: 'primary' },
    ],
  });
}

// ---------- App actions ----------
App.selectTicket = (id) => {
  if (state.phase === 'over') return;
  if (String(id).startsWith('BUG-')) {
    const b = state.bugs.find((x) => x.id === id);
    if (!b) return;
    state.selected = state.selected === id ? null : id;
  } else {
    Game.selectTicket(state, id);
  }
  save(); UI.render(state);
};

App.assignSelected = (memberId) => {
  if (state.phase === 'over') return;
  if (!state.selected) return;
  const sel = state.selected;
  if (String(sel).startsWith('BUG-')) {
    Game.assignBugToMember(state, sel, memberId);
  } else {
    Game.assignToMember(state, sel, memberId);
  }
  save(); UI.render(state);
};

App.unassign = (ticketId) => {
  if (state.phase === 'over') return;
  Game.unassign(state, ticketId);
  save(); UI.render(state);
};

App.unassignBug = (bugId) => {
  if (state.phase === 'over') return;
  Game.unassignBug(state, bugId);
  save(); UI.render(state);
};

App.endSprint = () => {
  if (state.phase === 'over') return;
  const result = Game.endSprint(state);
  save();
  reportSprint(result);
};

App.newGame = () => {
  state = Game.newGame();
  save();
  UI.render(state);
  startIntro();
};

// ---------- sprint report ----------
// Short, scripted (deterministic, no randomness) playtest/QA feedback after each sprint.
// Vague but helpful: each quote is from a named tester and nudges at the real gap.
function requiredChain(endId) {
  const set = new Set();
  const st = [endId];
  while (st.length) {
    const id = st.pop();
    if (set.has(id)) continue;
    set.add(id);
    const t = state.tickets[id];
    if (t && t.requires) for (const r of t.requires) st.push(r);
  }
  return set;
}
// True when every ticket needed to reach an end is done.
function chainComplete(chain) {
  for (const id of chain) if (!(state.tickets[id] && state.tickets[id].status === 'done')) return false;
  return true;
}
// The lead's % ready-for-launch: share of the required release work that's done.
function launchReady() {
  const required = new Set();
  for (const endId of ['t-boss', 't-menu']) for (const id of requiredChain(endId)) required.add(id);
  let done = 0;
  for (const id of required) if (state.tickets[id] && state.tickets[id].status === 'done') done++;
  return Math.floor((done / required.size) * 100);
}
function bossDone() { return chainComplete(requiredChain('t-boss')); }
function menuDone() { return chainComplete(requiredChain('t-menu')); }

function testerHints() {
  const bDone = bossDone();
  const mDone = menuDone();
  const openBugs = state.bugs.filter((b) => b.status !== 'done').length;
  const quits = TEAM.filter((x) => state.crew[x.id].quit);
  const exhausted = TEAM.filter((x) => !x.isAI && state.crew[x.id].exhausted && !state.crew[x.id].quit);
  const novaPct = state.crew.nova.tokensUsed / CONFIG.novaTokenBudget;
  const mktDone = (state.tickets['t-trailer'] && state.tickets['t-trailer'].status === 'done')
    || (state.tickets['t-social'] && state.tickets['t-social'].status === 'done');
  const lines = [`Maia (lead): "~${launchReady()}% launch-ready."`];

  if (openBugs >= 2) {
    lines.push(`Lukas (QA tester): "${openBugs} bugs open. Fun when it runs."`);
  } else if (novaPct >= CONFIG.novaTokenWarnPct) {
    lines.push('Zara (playtester): "Something about this build feels... robotic. Soulless, even."');
  } else if (quits.length) {
    lines.push('Marcus (playtester): "Someone ragequit. Ominous."');
  } else if (exhausted.length) {
    lines.push('Marcus (playtester): "Team\u2019s running on fumes."');
  } else if (bDone && mDone && !mktDone) {
    lines.push('Zara (playtester): "It\u2019s finished. Nobody\u2019s ever heard of it, though. We should, like, tell people?"');
  } else if (bDone && mDone) {
    lines.push('Marcus (playtester): "Has a boss AND a working start. Don\u2019t screw the launch."');
  } else if (!bDone && !mDone) {
    lines.push('Marcus (playtester): "Boring and I can\u2019t leave the start screen."');
  } else if (!bDone) {
    lines.push('Marcus (playtester): "Boring — where\u2019s the boss fight?"');
  } else {
    lines.push('Marcus (playtester): "Can\u2019t even leave the start screen."');
  }
  return lines;
}

function factLines(result, m) {
  const lines = [];
  const quits = result.quit.map((q) => `${m(q.id).name} QUIT — ${q.reason}`);
  const exhausted = result.exhausted.filter((id) => !state.crew[id].quit).map((id) => `${m(id).name} burned out — rests next sprint`);
  if (result.shipped) lines.push('🚀 RELEASE UNLOCKED!');
  if (quits.length) lines.push('🚪 ' + quits.join(' · '));
  if (exhausted.length) lines.push('🧨 ' + exhausted.join(' · '));
  if (result.novaWarned) lines.push('⚠️ NOVA nearing its context cap.');
  if (result.novaOffline) lines.push('⚠️⚠️ NOVA went offline for the rest of the game.');
  return lines;
}

function reportSprint(result) {
  const m = (id) => Game.memberById(id);

  if (state.phase === 'over') {
    // Final message: no hints, no %, no tips — just the verdict and the facts.
    const e = state.ending;
    const sur = factLines(result, m);
    UI.render(state);
    UI.showModal({
      title: e.title,
      win: e.win,
      stars: e.stars,
      verdict: e.verdict,
      body: e.body + (sur.length ? '\n\n' + sur.join('\n') : ''),
      takeaway: e.takeaway,
      actions: [
        { id: 'restart', label: 'Play again', kind: 'primary', onClick: () => App.newGame() },
      ],
    });
    return;
  }

  const hints = testerHints();
  const lines = hints.map((h) => typeof h === 'string' ? h : `${h.who} (${h.role}): "${h.text}"`);
  lines.push(...factLines(result, m));

  UI.render(state);
  UI.showModal({
    title: `Sprint ${state.sprint} complete — playtest`,
    win: false,
    body: lines.join('\n'),
    takeaway: state.sprint >= CONFIG.sprints ? 'That was the final sprint.' : `Plan sprint ${state.sprint + 1}.`,
    actions: [
      { id: 'ok', label: 'Continue', kind: 'primary' },
    ],
  });
  result.quit.forEach((q) => UI.toast(`🚪 ${m(q.id).name} quit`, 'bad'));
  if (state.sprint < CONFIG.sprints) {
    result.exhausted.filter((id) => !state.crew[id].quit).forEach((id) => UI.toast(`🧨 ${m(id).name} rests next sprint`, 'warn'));
  }
  if (result.novaOffline) UI.toast('⚠️ NOVA OFFLINE — offline for the game', 'bad');
}

// ---------- boot ----------
function boot() {
  if (!load() && localStorage.getItem(SAVE_KEY)) {
    // stale data-version save: purge it so the corrected tree is used
    localStorage.removeItem(SAVE_KEY);
  }
  UI.render(state);
  startIntro();
  window.addEventListener('beforeunload', save);
}

document.addEventListener('DOMContentLoaded', boot);
