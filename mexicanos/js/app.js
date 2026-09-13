const App = (() => {
  let state = null;

  function defaultTeams() {
    return TEAM_FOODS.slice(0, 4).map((f, i) => ({
      id: 't' + (i + 1),
      name: f.name,
      emoji: f.emoji,
      color: PALETTE[i % PALETTE.length],
    }));
  }

  function makeEmpty() {
    return {
      saveVersion: CONFIG.saveVersion,
      teams: defaultTeams(),
      scores: {},
      questionState: {},
      currentQ: null,
      timer: { remaining: CONFIG.timerSeconds, running: false, done: false },
      muted: false,
    };
  }

  function initState() {
    const s = makeEmpty();
    for (const t of s.teams) s.scores[t.id] = 0;
    for (const q of QUESTIONS) s.questionState[q.id] = { revealed: 0, awards: {} };
    return s;
  }

  function ensureState() {
    if (!state) state = load() || initState();
    for (const t of state.teams) if (!(t.id in state.scores)) state.scores[t.id] = 0;
    for (const q of QUESTIONS) if (!state.questionState[q.id]) state.questionState[q.id] = { revealed: 0, awards: {} };
    if (state.timer && state.timer.remaining === 60 && CONFIG.timerSeconds === 90 && !state.timer.running && !state.timer.done) {
      state.timer.remaining = CONFIG.timerSeconds;
      save();
    }
    return state;
  }

  function save() {
    try { localStorage.setItem(CONFIG.saveKey, JSON.stringify(state)); } catch (e) {}
  }

  function load() {
    try {
      const raw = localStorage.getItem(CONFIG.saveKey);
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (p.saveVersion !== CONFIG.saveVersion) return null;
      return p;
    } catch (e) { return null; }
  }

  function reset() {
    state = initState();
    save();
    return state;
  }

  function getState() { return ensureState(); }

  function setTeams(teams) {
    const s = ensureState();
    s.teams = teams;
    const keep = {};
    for (const t of teams) keep[t.id] = s.scores[t.id] || 0;
    s.scores = keep;
    for (const q of QUESTIONS) {
      const qs = s.questionState[q.id];
      const nextAwards = {};
      for (const k of Object.keys(qs.awards)) {
        const [ansIdx, teamId] = k.split('|');
        if (keep[teamId] !== undefined) nextAwards[k] = qs.awards[k];
      }
      qs.awards = nextAwards;
    }
    save();
  }

  function updateTeam(id, patch) {
    const s = ensureState();
    const t = s.teams.find((x) => x.id === id);
    if (!t) return;
    Object.assign(t, patch);
    save();
  }

  function addTeam() {
    const s = ensureState();
    if (s.teams.length >= CONFIG.maxTeams) return null;
    const used = new Set(s.teams.map(t => t.name));
    const nextFood = TEAM_FOODS.find(f => !used.has(f.name)) || TEAM_FOODS[s.teams.length % TEAM_FOODS.length];
    const idx = s.teams.length;
    const t = { id: 't' + Date.now(), name: nextFood.name, emoji: nextFood.emoji, color: PALETTE[idx % PALETTE.length] };
    s.teams.push(t);
    s.scores[t.id] = 0;
    save();
    return t;
  }

  function removeTeam(id) {
    const s = ensureState();
    if (s.teams.length <= CONFIG.minTeams) return false;
    s.teams = s.teams.filter((t) => t.id !== id);
    delete s.scores[id];
    for (const q of QUESTIONS) {
      const qs = s.questionState[q.id];
      for (const k of Object.keys(qs.awards)) if (k.endsWith('|' + id)) delete qs.awards[k];
    }
    save();
    return true;
  }

  function questionById(id) { return QUESTIONS.find((q) => q.id === id) || null; }

  function rankedAnswers(q) {
    const withRank = q.answers.map((a, i) => ({ ...a, origIdx: i }));
    withRank.sort((a, b) => b.survey - a.survey);
    return withRank.map((a, rank) => ({ ...a, rank, points: CONFIG.scoresByRank[rank] }));
  }

  function revealOrder(q) {
    const ranked = rankedAnswers(q);
    return [...ranked].sort((a, b) => a.survey - b.survey);
  }

  function setCurrentQuestion(id) {
    const s = ensureState();
    s.currentQ = id;
    s.timer = { remaining: CONFIG.timerSeconds, running: false, done: false };
    save();
  }

  function clearCurrentQuestion() {
    const s = ensureState();
    s.currentQ = null;
    s.timer.running = false;
    save();
  }

  function revealNext(qid) {
    const s = ensureState();
    const qs = s.questionState[qid];
    const q = questionById(qid);
    if (!q) return 0;
    const order = revealOrder(q);
    if (qs.revealed < order.length) qs.revealed += 1;
    save();
    return qs.revealed;
  }

  function revealAll(qid) {
    const s = ensureState();
    const q = questionById(qid);
    if (!q) return;
    s.questionState[qid].revealed = revealOrder(q).length;
    save();
  }

  function resetReveal(qid) {
    const s = ensureState();
    const qs = s.questionState[qid];
    qs.revealed = 0;
    qs.awards = {};
    recomputeScores();
    save();
  }

  function toggleAward(qid, ansOrigIdx, teamId) {
    const s = ensureState();
    const key = ansOrigIdx + '|' + teamId;
    const qs = s.questionState[qid];
    const q = questionById(qid);
    if (!q) return false;
    const ranked = rankedAnswers(q);
    const ans = ranked.find((a) => a.origIdx === ansOrigIdx);
    if (!ans) return false;
    const isRevealed = (() => {
      const order = revealOrder(q);
      const pos = order.findIndex((a) => a.origIdx === ansOrigIdx);
      return pos < qs.revealed;
    })();
    if (!isRevealed) return false;
    const had = !!qs.awards[key];
    if (had) delete qs.awards[key];
    else qs.awards[key] = true;
    recomputeScores();
    save();
    return !had;
  }

  function recomputeScores() {
    const s = ensureState();
    for (const t of s.teams) s.scores[t.id] = 0;
    for (const q of QUESTIONS) {
      const qs = s.questionState[q.id];
      const ranked = rankedAnswers(q);
      for (const k of Object.keys(qs.awards)) {
        const [ansIdxStr, teamId] = k.split('|');
        const ansIdx = Number(ansIdxStr);
        const ans = ranked.find((a) => a.origIdx === ansIdx);
        if (!ans) continue;
        if (!(teamId in s.scores)) continue;
        s.scores[teamId] += ans.points;
      }
    }
  }

  function totals() {
    const s = ensureState();
    return s.teams.map((t) => ({ team: t, score: s.scores[t.id] || 0 })).sort((a, b) => b.score - a.score);
  }

  function podium() {
    const s = ensureState();
    const sorted = totals();
    return sorted;
  }

  function isQuestionDone(qid) {
    const s = ensureState();
    return (s.questionState[qid]?.revealed || 0) >= 5;
  }

  function allDone() { return QUESTIONS.every((q) => isQuestionDone(q.id)); }

  return {
    getState, save, reset, load, ensureState,
    setTeams, updateTeam, addTeam, removeTeam,
    questionById, rankedAnswers, revealOrder,
    setCurrentQuestion, clearCurrentQuestion,
    revealNext, revealAll, resetReveal,
    toggleAward, recomputeScores, totals, podium,
    isQuestionDone, allDone,
  };
})();
