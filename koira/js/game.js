const Game = (() => {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function() {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pickWeighted(rnd, weights) {
    const keys = Object.keys(weights);
    const total = keys.reduce((a, k) => a + weights[k], 0);
    let roll = rnd() * total;
    for (const k of keys) {
      roll -= weights[k];
      if (roll <= 0) return k;
    }
    return keys[keys.length - 1];
  }

  function archById(id) {
    return DOGS.find((d) => d.id === id) || DOGS[0];
  }

  function weightsFor(day) {
    if (day.park && day.id === 'd3') return WEIGHTS_PARK_DAY;
    if (day.park) return WEIGHTS_PARK_DAY;
    return WEIGHTS;
  }

  function buildQueue(rnd, day) {
    const q = [];
    const weights = weightsFor(day);
    const n = day.encounters;
    const gateAt = day.park ? Math.floor(n / 2) : -1;
    for (let i = 0; i < n; i++) {
      if (i === gateAt) {
        q.push({ id: 'gate-' + i, kind: 'gate', gate: true });
        continue;
      }
      const kind = pickWeighted(rnd, weights);
      if (kind === 'dog' || kind === 'rusher') {
        const isRus = kind === 'rusher';
        const pool = isRus ? DOGS.filter((d) => d.id === 'rusher') : DOGS.filter((d) => d.id !== 'rusher');
        const a = pool[Math.floor(rnd() * pool.length)];
        q.push({ id: 'e' + i, kind: 'dog', archId: a.id, diff: a.react });
      } else if (kind === 'fence') {
        q.push({ id: 'e' + i, kind: 'fence', archId: 'guard', diff: 1.1 });
      } else if (kind === 'smell') {
        q.push({ id: 'e' + i, kind: 'smell', diff: 0.7 });
      } else {
        const sub = rnd() < 0.5 ? 'bike' : 'squirrel';
        q.push({ id: 'e' + i, kind: 'distraction', sub, diff: 0.85 });
      }
    }
    return q;
  }

  function buildParkOccupants(rnd, n) {
    const pool = DOGS.filter((d) => d.park);
    const out = [];
    for (let i = 0; i < n; i++) out.push(pool[Math.floor(rnd() * pool.length)].id);
    return out;
  }

  function newGame() {
    return {
      saveVersion: CONFIG.saveVersion,
      phase: 'title',
      dayIdx: 0,
      attempts: {},
      trust: 30,
      buzz: 0,
      mods: { sharp: 0, pouch: 0, calm: 0, reader: 0, recall: 0, steady: 0 },
      milesHit: [false, false],
      pendingMiles: 0,
      totals: { barks: 0, sniffs: 0, scenes: 0, cleans: 0, parkWins: 0, disasters: 0, sulks: 0, treatsUsed: 0, daysFailed: 0 },
      muted: false,
      run: null,
      overLose: false,
    };
  }

  function dayConf(state) {
    return DAYS[state.dayIdx];
  }

  function startDay(state) {
    const day = DAYS[state.dayIdx];
    const attempt = (state.attempts[day.id] || 0) + 1;
    const rnd = mulberry32((state.dayIdx + 1) * 7919 + attempt * 104729 + 13);
    const prnd = mulberry32((state.dayIdx + 1) * 331 + attempt * 5197 + 77);
    state.run = {
      dayId: day.id,
      attempt,
      queue: buildQueue(rnd, day),
      idx: 0,
      hearts: CONFIG.heartsPerDay,
      calm: CONFIG.calmPerDay + (state.mods.calm ? 1 : 0),
      treats: CONFIG.treatsPerDay + (state.mods.pouch ? 1 : 0),
      stress: Math.max(0, state.buzz * 8),
      poison: 0,
      sulk: false,
      parkPlanned: day.park ? buildParkOccupants(prnd, day.parkDogs) : [],
      park: null,
      gateDone: false,
      scouted: false,
      dayStats: { barks: 0, sniffs: 0, scenes: 0, cleans: 0, tense: 0, parkWins: 0 },
      finished: false,
      failed: false,
      reason: null,
    };
    state.phase = 'encounter';
    state.attempts[day.id] = attempt;
    return day;
  }

  function retryDay(state) {
    return startDay(state);
  }

  function curEnc(state) {
    const r = state.run;
    if (!r || r.idx >= r.queue.length) return null;
    return r.queue[r.idx];
  }

  function upcoming(state, n) {
    const r = state.run;
    if (!r) return [];
    return r.queue.slice(r.idx + 1, r.idx + 1 + (n || 2)).filter((e) => !e.gate);
  }

  function leaveThreshold(state) {
    const s = state.run ? state.run.stress : 0;
    return clamp(CONFIG.leaveBase + (state.mods.sharp ? 0.08 : 0) - s * 0.006 - (state.buzz * 0.03), 0.3, 0.75);
  }

  function encDifficulty(enc, state) {
    let d = enc.diff || 0.9;
    if (state.run && state.run.poison) d += 0.18;
    if (state.run && state.run.sulk) d += 0.12;
    d += state.buzz * 0.07;
    return d;
  }

  function resolveEncounter(state, choice) {
    const r = state.run;
    const enc = curEnc(state);
    if (!enc) return { type: 'noop' };
    let outcome = null;
    let costCalm = 0;
    let costTreat = 0;

    if (enc.gate) {
      return { type: 'gate' };
    }

    if (choice === 'leave') {
      const th = leaveThreshold(state);
      const d = encDifficulty(enc, state);
      const need = d * 0.55;
      if (r.poison) r.poison = 0;
      if (need <= th) {
        outcome = enc.kind === 'smell' ? 'tense' : 'clean';
      } else if (need <= th + 0.22) {
        outcome = 'tense';
      } else {
        outcome = enc.kind === 'smell' ? 'sniff' : 'bark';
      }
    } else if (choice === 'cross') {
      if (r.calm <= 0) return { type: 'blocked', reason: 'calm' };
      if (enc.kind === 'fence') return { type: 'blocked', reason: 'fence' };
      costCalm = 1;
      outcome = 'clean';
      if (r.poison) r.poison = 0;
    } else if (choice === 'treat') {
      if (r.calm <= 0) return { type: 'blocked', reason: 'calm' };
      if (r.treats <= 0) return { type: 'blocked', reason: 'treat' };
      costCalm = 1;
      costTreat = 1;
      outcome = 'clean';
    } else {
      return { type: 'blocked', reason: 'none' };
    }

    r.calm = clamp(r.calm - costCalm, 0, 9);
    if (costTreat) {
      r.treats -= 1;
      state.totals.treatsUsed += 1;
      r.poison = 1;
    }

    if (outcome === 'clean') {
      r.stress = Math.max(0, r.stress + CONFIG.stress.cleanRelief);
      const relief = state.mods.steady ? -4 : 0;
      r.stress = Math.max(0, r.stress + relief);
      state.trust = clamp(state.trust + CONFIG.trust.clean, 0, 100);
      r.dayStats.cleans += 1;
      state.totals.cleans += 1;
    } else if (outcome === 'tense') {
      r.stress = clamp(r.stress + CONFIG.stress.tense, 0, CONFIG.stressCap);
      state.trust = clamp(state.trust + CONFIG.trust.tense, 0, 100);
      r.dayStats.tense += 1;
    } else if (outcome === 'bark') {
      r.stress = clamp(r.stress + CONFIG.stress.bark, 0, CONFIG.stressCap);
      state.trust = clamp(state.trust + CONFIG.trust.bark, 0, 100);
      r.dayStats.scenes += 1;
      r.dayStats.barks += 1;
      state.totals.scenes += 1;
      state.totals.barks += 1;
      r.hearts -= CONFIG.hearts.bark;
    } else if (outcome === 'sniff') {
      r.stress = clamp(r.stress + CONFIG.stress.sniff, 0, CONFIG.stressCap);
      state.trust = clamp(state.trust + CONFIG.trust.sniff, 0, 100);
      r.dayStats.scenes += 1;
      r.dayStats.sniffs += 1;
      state.totals.scenes += 1;
      state.totals.sniffs += 1;
      r.hearts -= CONFIG.hearts.sniff;
    }

    const failed = r.hearts <= 0;
    if (failed) {
      r.failed = true;
      r.finished = true;
      state.totals.daysFailed += 1;
      state.buzz = clamp(state.buzz + 1, 0, 4);
      state.phase = 'evening';
      return { type: 'day-failed', outcome, enc };
    }

    r.idx += 1;
    if (r.idx >= r.queue.length) {
      r.finished = true;
      state.phase = 'evening';
      const trustBefore = state.trust;
      CONFIG.trust.miles.forEach((m, i) => {
        if (!state.milesHit[i] && state.trust >= m) {
          state.milesHit[i] = true;
          state.pendingMiles += 1;
        }
      });
      if (state.pendingMiles > 0) state.phase = 'upgrade';
      return { type: 'day-done', outcome, enc };
    }

    const next = curEnc(state);
    if (next && next.gate && !r.gateDone) {
      state.phase = 'gate';
      return { type: 'gate', outcome, enc };
    }

    return { type: 'enc-result', outcome, enc };
  }

  function scout(state) {
    const r = state.run;
    if (!r || state.phase !== 'gate') return [];
    r.scouted = true;
    const n = Math.min(CONFIG.park.scoutBase + (state.mods.reader ? 1 : 0), r.parkPlanned.length);
    return r.parkPlanned.slice(0, n).map((id) => {
      const a = archById(id);
      return { id: a.id, name: a.name, icon: a.icon, read: a.read, vibe: a.vibe };
    });
  }

  function enterPark(state) {
    const r = state.run;
    if (!r || state.phase !== 'gate') return null;
    r.park = { occupants: r.parkPlanned.slice(), idx: 0, meet: null, wins: 0, bads: 0, exited: false, disaster: false, started: true };
    state.phase = 'park';
    startMeet(state);
    return r.park;
  }

  function startMeet(state) {
    const r = state.run;
    const p = r.park;
    if (!p || p.idx >= p.occupants.length) { endPark(state, false); return null; }
    p.meet = { archId: p.occupants[p.idx], seen: false };
    return p.meet;
  }

  function greetMeet(state, withTreat) {
    const r = state.run;
    const p = r && r.park;
    if (!p || !p.meet) return { ok: false, reason: 'none' };
    const a = archById(p.meet.archId);
    if (withTreat) {
      if (r.treats <= 0) return { ok: false, reason: 'treat' };
      if (r.calm <= 0) return { ok: false, reason: 'calm' };
      r.calm -= 1;
      r.treats -= 1;
      state.totals.treatsUsed += 1;
      resolveMeet(state, 'win');
      return { ok: true, res: 'clean' };
    }
    if (a.vibe >= 2 && state.buzz > 1) {
      const roll = Math.random();
      if (roll < 0.5) {
        resolveMeet(state, 'bad');
        return { ok: true, res: 'bad' };
      }
    }
    if (a.vibe <= 0) {
      resolveMeet(state, 'win');
      return { ok: true, res: 'clean' };
    }
    if (a.vibe === 1) {
      const roll = Math.random();
      if (roll < 0.55) {
        resolveMeet(state, 'win');
        return { ok: true, res: 'clean' };
      } else {
        resolveMeet(state, 'tense');
        return { ok: true, res: 'tense' };
      }
    }
    const roll = Math.random();
    if (roll < 0.35) {
      resolveMeet(state, 'win');
      return { ok: true, res: 'clean' };
    } else if (roll < 0.65) {
      resolveMeet(state, 'tense');
      return { ok: true, res: 'tense' };
    } else {
      resolveMeet(state, 'bad');
      return { ok: true, res: 'bad' };
    }
  }

  function resolveMeet(state, outcome) {
    const r = state.run;
    const p = r.park;
    const m = p.meet;
    p.meet = null;
    if (outcome === 'win') {
      p.wins += 1;
      r.stress = Math.max(0, r.stress - 6);
      state.trust = clamp(state.trust + CONFIG.trust.parkWin, 0, 100);
      r.dayStats.parkWins += 1;
      state.totals.parkWins += 1;
    } else if (outcome === 'tense') {
      r.stress = clamp(r.stress + 8, 0, CONFIG.stressCap);
    } else {
      p.bads += 1;
      r.stress = clamp(r.stress + CONFIG.stress.parkFail, 0, CONFIG.stressCap);
      state.trust = clamp(state.trust + CONFIG.trust.parkFail, 0, 100);
      r.dayStats.scenes += 1;
      r.hearts -= 1;
      state.totals.scenes += 1;
      if (r.hearts <= 0) {
        p.disaster = true;
        state.totals.disasters += 1;
        state.totals.daysFailed += 1;
        state.buzz = clamp(state.buzz + 1, 0, 4);
        r.failed = true;
        r.finished = true;
        state.phase = 'evening';
        return { type: 'park-disaster', wins: p.wins };
      }
      if (p.bads >= CONFIG.park.disasterBads) {
        p.disaster = true;
        state.totals.disasters += 1;
        endPark(state, true);
        return { type: 'park-disaster', wins: p.wins };
      }
    }
    p.idx += 1;
    if (p.idx >= p.occupants.length) {
      endPark(state, false);
      return { type: 'park-done', wins: p.wins };
    }
    startMeet(state);
    return { type: 'meet-next', outcome, wins: p.wins };
  }

  function endPark(state, disaster) {
    const r = state.run;
    const p = r.park;
    if (p) {
      p.meet = null;
      p.exited = true;
      p.disaster = p.disaster || !!disaster;
    }
    r.gateDone = true;
    r.idx += 1;
    if (r.hearts <= 0) {
      r.failed = true;
      r.finished = true;
      state.phase = 'evening';
      return p;
    }
    if (r.idx >= r.queue.length) {
      r.finished = true;
      CONFIG.trust.miles.forEach((m, i) => {
        if (!state.milesHit[i] && state.trust >= m) {
          state.milesHit[i] = true;
          state.pendingMiles += 1;
        }
      });
      state.phase = state.pendingMiles > 0 ? 'upgrade' : 'evening';
      return p;
    }
    state.phase = 'encounter';
    return p;
  }

  function exitPark(state) {
    const r = state.run;
    if (!r || state.phase !== 'park' || !r.park) return null;
    const p = r.park;
    if (state.mods.recall) state.trust = clamp(state.trust + 4, 0, 100);
    const early = p.idx < p.occupants.length;
    endPark(state, false);
    return { wins: p.wins, early };
  }

  function skipPark(state) {
    const r = state.run;
    if (!r || state.phase !== 'gate') return null;
    r.sulk = true;
    state.totals.sulks += 1;
    r.gateDone = true;
    r.idx += 1;
    state.phase = 'encounter';
    if (r.idx >= r.queue.length) {
      r.finished = true;
      state.phase = 'evening';
    }
    return { sulk: true };
  }

  function bribe(state) {
    const r = state.run;
    if (!r || !r.sulk) return { ok: false, reason: 'none' };
    if (r.treats <= 0) return { ok: false, reason: 'treat' };
    if (r.calm <= 0) return { ok: false, reason: 'calm' };
    r.treats -= 1;
    r.calm -= 1;
    state.totals.treatsUsed += 1;
    r.sulk = false;
    return { ok: true };
  }

  function upgradeChoices(state) {
    const owned = Object.keys(state.mods).filter((k) => state.mods[k] > 0);
    const open = UPGRADES.filter((u) => !owned.includes(u.id));
    const out = [];
    const pool = open.slice();
    while (out.length < 3 && pool.length) {
      out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    return out;
  }

  function applyUpgrade(state, id) {
    if (state.mods[id] === undefined) return false;
    if (state.mods[id] > 0) return false;
    state.mods[id] = 1;
    state.pendingMiles = Math.max(0, state.pendingMiles - 1);
    if (state.pendingMiles <= 0) state.phase = 'evening';
    return true;
  }

  function nextDay(state) {
    const faileds = state.totals.daysFailed;
    if (faileds >= CONFIG.failAfterDays) {
      state.overLose = true;
      state.phase = 'over';
      return null;
    }
    if (state.dayIdx >= DAYS.length - 1) {
      state.phase = 'over';
      return null;
    }
    state.dayIdx += 1;
    return startDay(state);
  }

  function endingFor(state) {
    if (state.overLose) return LOSE_ENDING;
    for (const e of ENDINGS) {
      if (state.trust >= e.min) return e;
    }
    return ENDINGS[ENDINGS.length - 1];
  }

  function syncSave(state) {
    return {
      saveVersion: CONFIG.saveVersion,
      phase: state.phase,
      dayIdx: state.dayIdx,
      attempts: state.attempts,
      trust: state.trust,
      buzz: state.buzz,
      mods: { ...state.mods },
      milesHit: state.milesHit.slice(),
      pendingMiles: state.pendingMiles,
      totals: { ...state.totals },
      muted: state.muted,
      overLose: !!state.overLose,
      run: state.run ? {
        dayId: state.run.dayId,
        queue: state.run.queue.map((e) => ({ ...e })),
        idx: state.run.idx,
        hearts: state.run.hearts,
        calm: state.run.calm,
        treats: state.run.treats,
        stress: state.run.stress,
        poison: state.run.poison,
        sulk: state.run.sulk,
        parkPlanned: state.run.parkPlanned.slice(),
        park: state.run.park ? {
          occupants: state.run.park.occupants.slice(),
          idx: state.run.park.idx,
          meet: state.run.park.meet ? { ...state.run.park.meet } : null,
          wins: state.run.park.wins,
          bads: state.run.park.bads,
          exited: state.run.park.exited,
          disaster: state.run.park.disaster,
          started: state.run.park.started,
        } : null,
        gateDone: state.run.gateDone,
        scouted: state.run.scouted,
        dayStats: { ...state.run.dayStats },
        finished: state.run.finished,
        failed: state.run.failed,
        reason: state.run.reason,
      } : null,
    };
  }

  function fromSave(save) {
    if (!save || save.saveVersion !== CONFIG.saveVersion) return null;
    if (save.dayIdx < 0 || save.dayIdx >= DAYS.length) return null;
    const state = {
      saveVersion: CONFIG.saveVersion,
      phase: save.phase,
      dayIdx: save.dayIdx,
      attempts: save.attempts || {},
      trust: save.trust != null ? save.trust : 30,
      buzz: save.buzz || 0,
      mods: { sharp: 0, pouch: 0, calm: 0, reader: 0, recall: 0, steady: 0, ...(save.mods || {}) },
      milesHit: Array.isArray(save.milesHit) ? save.milesHit.slice(0, 2) : [false, false],
      pendingMiles: save.pendingMiles || 0,
      totals: { barks: 0, sniffs: 0, scenes: 0, cleans: 0, parkWins: 0, disasters: 0, sulks: 0, treatsUsed: 0, daysFailed: 0, ...(save.totals || {}) },
      muted: !!save.muted,
      overLose: !!save.overLose,
      run: null,
    };
    while (state.milesHit.length < 2) state.milesHit.push(false);
    if (save.run) {
      const s = save.run;
      state.run = {
        dayId: s.dayId,
        queue: (s.queue || []).map((e) => ({ ...e })),
        idx: s.idx || 0,
        hearts: s.hearts != null ? s.hearts : CONFIG.heartsPerDay,
        calm: s.calm != null ? s.calm : CONFIG.calmPerDay,
        treats: s.treats != null ? s.treats : CONFIG.treatsPerDay,
        stress: s.stress || 0,
        poison: s.poison || 0,
        sulk: !!s.sulk,
        parkPlanned: (s.parkPlanned || []).slice(),
        park: s.park ? {
          occupants: (s.park.occupants || []).slice(),
          idx: s.park.idx || 0,
          meet: s.park.meet ? { ...s.park.meet } : null,
          wins: s.park.wins || 0,
          bads: s.park.bads || 0,
          exited: !!s.park.exited,
          disaster: !!s.park.disaster,
          started: !!s.park.started,
        } : null,
        gateDone: !!s.gateDone,
        scouted: !!s.scouted,
        dayStats: { barks: 0, sniffs: 0, scenes: 0, cleans: 0, tense: 0, parkWins: 0, ...(s.dayStats || {}) },
        finished: !!s.finished,
        failed: !!s.failed,
        reason: s.reason || null,
      };
    }
    return state;
  }

  return {
    newGame, startDay, retryDay, curEnc, upcoming, leaveThreshold, encDifficulty, archById,
    resolveEncounter, scout, enterPark, exitPark, skipPark, bribe,
    greetMeet, upgradeChoices, applyUpgrade, nextDay, endingFor, dayConf,
    syncSave, fromSave,
  };
})();
