const Game = (() => {

  const LW = CONFIG.road.width / CONFIG.road.lanes;

  const SIZES = {
    car: { w: 52, h: 92 },
    bus: { w: 184, h: 130 },
    moose: { w: 130, h: 96 },
    ped: { w: 22, h: 30 },
    cone: { w: 72, h: 46 },
    mopo: { w: 42, h: 82 },
    tourist: { w: 22, h: 36 },
    reindeer: { w: 184, h: 30 },
    construction: { w: 96, h: 36 },
  };

  const BASES = {
    ped: { start: 100 },
    car: { start: 100 },
    bus: { start: 100 },
    moose: { start: 100 },
    cone: { start: 100 },
    mopo: { start: 100 },
    egg: { start: 100 },
  };

  const routeCenter = () => CONFIG.road.left + CONFIG.road.width / 2;

  const laneCenterX = (i) => CONFIG.road.left + LW * (i + 0.5);
  const roadEdgeL = CONFIG.road.left + SIZES.car.w / 2 + 6;
  const roadEdgeR = CONFIG.road.left + CONFIG.road.width - SIZES.car.w / 2 - 6;

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
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let roll = rnd() * total;
    for (const k of Object.keys(weights)) {
      roll -= weights[k];
      if (roll <= 0) return k;
    }
    return Object.keys(weights)[Object.keys(weights).length - 1];
  }

  function shuffle(rnd, arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function spawnHazard(rnd, conf, dist, pair) {
    const type = pickWeighted(rnd, conf.weights);
    const lanes = [0, 1, 2];
    if (type === 'bus' || type === 'moose') {
      const start = Math.floor(rnd() * 2);
      const occupied = [start, start + 1];
      const cx = CONFIG.road.left + (start + 1) * LW;
      return {
        type, dist, lanes: occupied,
        x0: cx,
        w: 2 * LW - 24, h: SIZES[type].h,
        color: OB_PAL[type][0], c: rnd(),
      };
    }
    if (type === 'reindeer') {
      const start = Math.floor(rnd() * 2);
      const herd = 3 + Math.floor(rnd() * 3);
      return {
        type, dist, lanes: [start, start+1],
        x0: CONFIG.road.left + (start+1)*LW, w: 2*LW - 18, h: SIZES.reindeer.h,
        color: OB_PAL.reindeer[0], c: rnd(), herd,
      };
    }
    if (type === 'construction') {
      const lane = Math.floor(rnd() * 3);
      const withDog = rnd() < 0.55;
      return {
        type, dist, lanes: [lane],
        x0: laneCenterX(lane), w: SIZES.construction.w, h: SIZES.construction.h,
        color: OB_PAL.construction[0], c: rnd(), withDog,
      };
    }
    let freeLanes;
    if (pair && lanes.length > 1) {
      const free = Math.floor(rnd() * lanes.length);
      freeLanes = lanes.filter((l) => l !== free);
    } else {
      freeLanes = [lanes[Math.floor(rnd() * lanes.length)]];
    }
    const lane = freeLanes[0];
    return {
      type, dist, lanes: [lane],
      x0: laneCenterX(lane), w: SIZES[type].w, h: SIZES[type].h,
      color: OB_PAL[type][Math.floor(rnd() * OB_PAL[type].length)], c: rnd(),
    };
  }

  function buildLevel(roundIdx, rnd) {
    const conf = ROUNDS[roundIdx];
    const obstacles = [];
    const scenery = [];
    const pickups = [];
    const cands = shuffle(rnd, conf.pool || Object.keys(QUESTIONS));
    const picks = cands.slice(0, conf.nGates || 2);
    const gates = picks.map((q, i) => {
      const qq = QUESTIONS[q] || {};
      return {
        qid: q,
        ok: qq.ok,
        icon: qq.icon || '',
        rigged: !!(conf.tricks || []).includes(q),
        dist: conf.length * ((i + 1) / (picks.length + 1)) + (rnd() - 0.5) * 240,
        done: false,
      };
    });
    gates.sort((a, b) => a.dist - b.dist);

    const isNearGate = (d) => gates.some((g) => Math.abs(g.dist - d) < CONFIG.gateLen / 2 + 150);

    const kinds = ['tree', 'house', 'pine', 'sign', 'lamp', 'snowdrift'];
    const signs = ['speed50', 'hirvi', 'stop', 'roundabout', 'slippery', 'school'];

    let d = conf.spawnClear || CONFIG.spawnClear;
    let sceneryD = 40;
    while (d < conf.length - 120) {
      if (isNearGate(d)) { d += 40; continue; }
      const pair = rnd() < conf.pairRatio;
      const ob = spawnHazard(rnd, conf, d, pair);
      if (ob) obstacles.push(ob);
      const gapMin = 240 + conf.baseSpeed * 0.4 + conf.slippery * 180;
      d += gapMin + rnd() * 130;
    }

    if (conf.mech === 'tourists') {
      let td = CONFIG.tourist.first;
      while (        td < conf.length - 300) {
        if (!isNearGate(td)) {
          const from = Math.floor(rnd() * CONFIG.road.lanes);
          let to = clamp(from + Math.round(rnd() < 0.5 ? -1 : 1), 0, CONFIG.road.lanes - 1);
          if (to === from) to = clamp(from + (from === 0 ? 1 : -1), 0, CONFIG.road.lanes - 1);
          const lanes = [Math.min(from, to), Math.max(from, to)];
          obstacles.push({
            type: 'tourist', dist: td, spanStart: td - CONFIG.tourist.span, from, to,
            lanes: [Math.min(from, to), Math.max(from, to)],
            x0: laneCenterX(from), w: SIZES.tourist.w, h: SIZES.tourist.h,
            color: OB_PAL.tourist[Math.floor(rnd() * OB_PAL.tourist.length)], c: rnd(),
          });
        }
        td += (conf.touristEvery || CONFIG.tourist.period);
      }
    }

    let pd = CONFIG.pickup.first;
    while (pd < conf.length - 200) {
      if (!isNearGate(pd)) {
        const free = [0, 1, 2].filter((l) => !obstacles.some((o) => {
          if (o.dead) return false;
          if (!o.lanes.includes(l)) return false;
          return Math.abs(o.dist - pd) < o.h / 2 + 34;
        }));
        if (free.length) {
          const lane = free[Math.floor(rnd() * free.length)];
          pickups.push({ dist: pd, lane, x0: laneCenterX(lane) });
        }
      }
      pd += CONFIG.pickup.period + rnd() * CONFIG.pickup.jitter;
    }

    let peek = sceneryD;
    while (peek < conf.length) {
      scenery.push({
        dist: peek,
        side: rnd() < 0.5 ? 0 : 1,
        kind: kinds[Math.floor(rnd() * kinds.length)],
        sign: signs[Math.floor(rnd() * signs.length)],
        v: rnd(),
      });
      peek += 150 + rnd() * 200;
    }

    return { obstacles, gates, scenery, pickups };
  }

  function newGame() {
    return {
      saveVersion: CONFIG.saveVersion,
      phase: 'title',
      roundIdx: 0,
      attempts: {},
      best: 0,
      ending: null,
      muted: false,
      run: null,
    };
  }

  function roundConf(state) {
    return ROUNDS[state.roundIdx];
  }

  function roundIndexForId(id) {
    return ROUNDS.findIndex((r) => r.id === id);
  }

  function startRound(state) {
    const conf = ROUNDS[state.roundIdx];
    const attempt = (state.attempts[conf.id] || 0) + 1;
    const rnd = mulberry32((state.roundIdx + 1) * 7919 + attempt * 104729 + 13);
    const level = buildLevel(state.roundIdx, rnd);
    state.run = {
      conf: conf.id,
      attempt,
      score: CONFIG.scoring.start,
      dist: 0,
      lane: 1,
      x: routeCenter(),
      tilt: 0,
      obstacles: level.obstacles,
      gates: level.gates,
      scenery: level.scenery,
      pickups: level.pickups,
      sparks: [],
      activeGate: null,
      gateT: 0,
      gateNote: null,
      invuln: 0,
      hitFlash: 0,
      answerFlash: 0,
      answerOk: null,
      results: [],
      finished: false,
      passed: false,
      reason: null,
      garble: true,
      lastHalf: null,
      boostHeld: false,
      boost: false,
      boostT: 0,
      smoothSpeed: 0,
      gust: 0,
      gustWarn: 0,
      exploded: false,
      boom: 0,
      advance: false,
    };
    state.phase = 'countdown';
    state.attempts[conf.id] = attempt;
    return conf;
  }

  function retryRound(state) {
    return startRound(state);
  }

  function setLaneTarget(state, dir) {
    const r = state.run;
    if (!r || state.phase === 'countdown' || state.phase === 'over') return;
    const next = clamp(r.lane + dir, 0, CONFIG.road.lanes - 1);
    if (next !== r.lane) {
      r.lane = next;
      r.garble = true;
    }
  }

  function gateFor(state, id) {
    if (!state.run) return null;
    return state.run.gates.find((g) => g.qid === id) || null;
  }

  function questionFor(gate) {
    return QUESTIONS[gate.qid];
  }

  function currentSpeed(state) {
    const r = state.run;
    if (!r) return 0;
    const conf = ROUNDS[roundIndexForId(r.conf)];
    return conf.baseSpeed * (1 + r.dist * conf.ramp);
  }

  function driveSpeed(state) {
    const r = state.run;
    if (!r || r.finished) return 0;
    let speed = currentSpeed(state);
    const gate = r.activeGate && !r.activeGate.done ? r.activeGate : null;
    if (gate) speed *= CONFIG.gateSlow;
    if (r.boost) speed *= CONFIG.boost.mult;
    return speed;
  }

  function sideAt(state) {
    const r = state.run;
    if (!r) return null;
    if (r.x < CONFIG.gateDeadLow) return 'a';
    if (r.x > CONFIG.gateDeadHigh) return 'b';
    return null;
  }

  function setBoost(state, held) {
    const r = state.run;
    if (r && state.phase !== 'over') r.boostHeld = !!held;
  }

  function setAdvance(state) {
    const r = state.run;
    const g = r && r.activeGate;
    if (g && !g.done && !r.finished) r.advance = true;
  }

  function isWhiteout(state) {
    const r = state.run;
    if (!r) return false;
    const conf = ROUNDS[roundIndexForId(r.conf)];
    if (!conf || conf.mech !== 'whiteout') return false;
    return (r.dist % CONFIG.whiteout.period) < CONFIG.whiteout.on;
  }

  function boomCheck(r, state, events) {
    if (r.score <= 0 && !r.exploded) {
      r.exploded = true;
      r.boom = 1.4;
      r.activeGate = null;
      r.gateT = 0;
      r.boost = false;
      r.finished = true;
      r.passed = false;
      r.reason = EXPLOSION_LINES[r.attempt % EXPLOSION_LINES.length];
      events.push({ type: 'explode', reason: r.reason });
      state.phase = 'finish';
      return true;
    }
    return false;
  }

  function update(state, dt) {
    const r = state.run;
    if (!r || state.phase !== 'drive') return [];
    const conf = ROUNDS[roundIndexForId(r.conf)];
    const events = [];

    if (r.invuln > 0) r.invuln -= dt;
    if (r.hitFlash > 0) r.hitFlash -= dt;
    if (r.answerFlash > 0) r.answerFlash -= dt;

    let gate = r.activeGate && !r.activeGate.done ? r.activeGate : null;
    const advance = r.advance;
    r.advance = false;
    r.boost = !!(r.boostHeld && !gate && !r.finished);
    const slip = clamp(conf.slippery, 0, 0.9);

    const target = laneCenterX(r.lane);
    const k = Math.min(1, dt * CONFIG.car.steer);
    const prevX = r.x;
    r.x += (target - r.x) * k;
    if (slip > 0) r.x += Math.sin(r.dist * 0.004) * slip * 0.5;
    r.x = clamp(r.x, roadEdgeL, roadEdgeR);
    r.tilt = clamp(r.x - prevX, -14, 14);

    r.gustWarn = 0;
    r.gust = 0;
    if (conf.mech === 'gusts' && r.dist > 200) {
      const m = r.dist % CONFIG.gusts.period;
      r.gustWarn = (m > CONFIG.gusts.period - CONFIG.gusts.warn) ? Math.max(0, CONFIG.gusts.period - m) : 0;
      const gs = (Math.floor(r.dist / CONFIG.gusts.period) % 2 === 0) ? 1 : -1;
      r.gust = (m < CONFIG.gusts.dur && !gate) ? gs : 0;
      if (r.gust) {
        const gx = r.x;
        r.x = clamp(r.x + r.gust * CONFIG.gusts.force * dt, roadEdgeL, roadEdgeR);
        r.tilt = clamp(r.x - gx, -14, 14);
      }
    }

    for (const o of r.obstacles) {
      if (o.type === 'tourist') {
        const t0 = clamp((o.dist - o.spanStart) / o.span, 0, 1);
        o.x0 = laneCenterX(o.from) + (laneCenterX(o.to) - laneCenterX(o.from)) * t0;
      }
    }
    const targetSpeed = driveSpeed(state);
    if (r.smoothSpeed == null) r.smoothSpeed = targetSpeed;
    const lerpK = Math.min(1, dt * 5.5);
    r.smoothSpeed += (targetSpeed - r.smoothSpeed) * lerpK;
    if (Math.abs(targetSpeed - r.smoothSpeed) < 1) r.smoothSpeed = targetSpeed;
    r.dist += r.smoothSpeed * dt;

    const carLeft = r.x - CONFIG.car.w / 2;
    const carRight = r.x + CONFIG.car.w / 2;
    const carTop = CONFIG.car.screenY - CONFIG.car.h / 2;
    const carBot = CONFIG.car.screenY + CONFIG.car.h / 2;

    for (const o of r.obstacles) {
      if (o.dead) continue;
      const sy = CONFIG.car.screenY - (o.dist - r.dist);
      if (o.dist + 60 < r.dist) { o.dead = true; continue; }
      if (o.dist - 60 > r.dist + 100) continue;
      if (r.invuln > 0) continue;
      const ox0 = o.x0;
      if (carRight > ox0 - o.w / 2 && carLeft < ox0 + o.w / 2 &&
          carBot > sy - o.h / 2 && carTop < sy + o.h / 2) {
        const pen = CONFIG.scoring['hit' + o.type.charAt(0).toUpperCase() + o.type.slice(1)] || 8;
        const total = r.boost ? pen * 2 : pen;
        r.score = clamp(r.score - total, CONFIG.scoring.floor, 200);
        r.boostT = 0;
        r.invuln = CONFIG.invuln;
        r.hitFlash = 0.6;
        r.x = clamp(r.x + (r.x < ox0 ? -16 : 16), roadEdgeL, roadEdgeR);
        events.push({ type: 'collide', ob: o, penalty: total, boost: r.boost });
        boomCheck(r, state, events);
      }
    }

    r.obstacles = r.obstacles.filter((o) => !o.dead);

    if (r.boost) {
      r.boostT += dt;
      if (r.boostT >= CONFIG.boost.bonusEvery) {
        r.boostT -= CONFIG.boost.bonusEvery;
        r.score = clamp(r.score + CONFIG.boost.bonus, CONFIG.scoring.floor, 200);
        events.push({ type: 'boostBonus', amount: CONFIG.boost.bonus });
      }
    } else {
      r.boostT = 0;
    }

    if (r.pickups && r.pickups.length) {
      r.pickups = r.pickups.filter((p) => {
        if (Math.abs(p.dist - r.dist) > 42) return true;
        if (Math.abs(r.x - p.x0) > CONFIG.car.w / 2 + 16) return true;
        r.score = clamp(r.score + CONFIG.scoring.pickup, CONFIG.scoring.floor, 200);
        r.sparks.push({ x: p.x0, dist: p.dist, t: 1 });
        events.push({ type: 'pickup', amount: CONFIG.scoring.pickup });
        return false;
      });
    }
    if (r.sparks.length) {
      for (const s of r.sparks) s.t -= dt * 2.5;
      r.sparks = r.sparks.filter((s) => s.t > 0);
    }

    if (!gate) {
      for (const g of r.gates) {
        if (g.done) continue;
        if (g.dist - r.dist < CONFIG.gateLen + CONFIG.gateViewAhead) { gate = g; break; }
      }
      if (gate) {
        r.activeGate = gate;
        r.gateT = CONFIG.gateTimer;
        r.gateNote = null;
        events.push({ type: 'gate-approach', gate });
      }
    }

    if (gate && !gate.done) r.gateT -= dt;

    if (gate && !gate.done && (r.dist >= gate.dist || advance)) {
      gate.done = true;
      r.activeGate = null;
      r.gateT = 0;
      const q = QUESTIONS[gate.qid] || {};
      const got = sideAt(state);
      r.lastHalf = got;
      let ok = false;
      let delta = 0;
      let vec = '';
      if (got === null) {
        vec = 'middle';
        delta = -CONFIG.scoring.wrong;
      } else if (gate.rigged) {
        vec = 'trick';
        delta = -CONFIG.scoring.rigged;
      } else if (got === q.ok) {
        vec = 'right';
        ok = true;
        delta = CONFIG.scoring.correct;
      } else {
        vec = 'wrong';
        delta = -CONFIG.scoring.wrong;
      }
      r.score = clamp(r.score + delta, CONFIG.scoring.floor, 200);
      r.answerFlash = 1.1;
      r.answerOk = ok;
      r.gateNote = vec;
      r.results.push({ gate, got, ok, rigged: !!gate.rigged, delta });
      events.push({ type: 'answer', gate, q, got, ok, rigged: !!gate.rigged, delta, vec, advance });
      boomCheck(r, state, events);
    } else if (gate && !gate.done && r.gateT <= 0) {
      const q = QUESTIONS[gate.qid] || {};
      gate.done = true;
      r.activeGate = null;
      r.gateT = 0;
      const got = sideAt(state);
      r.lastHalf = got;
      const delta = -CONFIG.scoring.wrong;
      r.score = clamp(r.score + delta, CONFIG.scoring.floor, 200);
      r.answerFlash = 1.1;
      r.answerOk = false;
      r.gateNote = 'timeout';
      r.results.push({ gate, got, ok: false, rigged: !!gate.rigged, delta });
      events.push({ type: 'answer', gate, q, got, ok: false, rigged: !!gate.rigged, delta, vec: 'timeout' });
      boomCheck(r, state, events);
    }

    const finishDist = ROUNDS[roundIndexForId(r.conf)].length;
    if (!r.finished && r.dist >= finishDist) {
      r.finished = true;
      const passed = r.score >= ROUNDS[roundIndexForId(r.conf)].minPass;
      r.passed = passed;
      r.reason = passed ? null : FAIL_REASONS[(r.results.length + r.attempt) % FAIL_REASONS.length];
      events.push({ type: 'finish', passed, score: r.score, minPass: ROUNDS[roundIndexForId(r.conf)].minPass });
      state.phase = 'finish';
      if (passed) {
        state.best = Math.max(state.best, r.score);
        if (state.roundIdx >= ROUNDS.length - 1) {
          state.phase = 'over';
          state.ending = WIN_LINES[(state.attempts[r.conf] || 1) % WIN_LINES.length];
        }
      }
    }

    return events;
  }

  function endDrive(state) {
    const conf = ROUNDS[state.roundIdx];
    if (state.run && state.run.passed) {
      if (state.roundIdx < ROUNDS.length - 1) {
        state.roundIdx += 1;
        startRound(state);
      }
    }
    return conf;
  }

  function syncSave(state) {
    return {
      saveVersion: CONFIG.saveVersion,
      phase: state.phase,
      roundIdx: state.roundIdx,
      attempts: state.attempts,
      best: state.best,
      muted: state.muted,
      run: state.run ? {
        conf: state.run.conf,
        attempt: state.run.attempt,
        score: state.run.score,
        dist: state.run.dist,
        lane: state.run.lane,
        x: state.run.x,
        activeGateId: state.run.activeGate ? state.run.activeGate.qid : null,
        obstacles: state.run.obstacles.filter((o) => !o.dead).map((o) => ({ ...o })),
        gates: state.run.gates.map((g) => ({ ...g })),
        pickups: state.run.pickups.map((p) => ({ ...p })),
        gateT: state.run.gateT,
        gateNote: state.run.gateNote,
        boostHeld: state.run.boostHeld,
        invuln: state.run.invuln,
        hitFlash: state.run.hitFlash,
        answerFlash: state.run.answerFlash,
        answerOk: state.run.answerOk,
        finished: state.run.finished,
        passed: state.run.passed,
        reason: state.run.reason,
        lastHalf: state.run.lastHalf,
        exploded: state.run.exploded,
        boom: state.run.boom,
      } : null,
    };
  }

  function fromSave(save) {
    if (!save || save.saveVersion !== CONFIG.saveVersion) return null;
    if (!Array.isArray(ROUNDS) || save.roundIdx < 0 || save.roundIdx >= ROUNDS.length) return null;
    const state = {
      saveVersion: CONFIG.saveVersion,
      phase: save.phase,
      roundIdx: save.roundIdx,
      attempts: save.attempts || {},
      best: save.best || 0,
      muted: !!save.muted,
      ending: null,
      run: null,
    };
    if (save.run) {
      const r = save.run;
      const conf = ROUNDS[roundIndexForId(r.conf)];
      if (conf) {
        const gates = (r.gates || []).map((g) => ({ ...g }));
        const activeGate = gates.find((g) => g.qid === r.activeGateId) || null;
        state.run = {
          conf: r.conf,
          attempt: r.attempt || 1,
          score: r.score,
          dist: r.dist,
          lane: r.lane,
          x: r.x,
          tilt: 0,
          obstacles: (r.obstacles || []).map((o) => ({ ...o })),
          gates,
          scenery: [],
          pickups: (r.pickups || []).map((p) => ({ ...p })),
          sparks: [],
          activeGate,
          gateT: r.gateT || 0,
          gateNote: r.gateNote || null,
          invuln: r.invuln || 0,
          hitFlash: r.hitFlash || 0,
          answerFlash: r.answerFlash || 0,
          answerOk: r.answerOk,
          results: [],
          finished: !!r.finished,
          passed: !!r.passed,
          reason: r.reason || null,
          garble: true,
          lastHalf: r.lastHalf || null,
          boostHeld: !!r.boostHeld,
          boost: false,
          boostT: 0,
          smoothSpeed: 0,
          gust: 0,
          gustWarn: 0,
          exploded: !!r.exploded,
          boom: r.boom || 0,
        };
      }
    }
    return state;
  }

  return {
    newGame, startRound, retryRound, setLaneTarget, setBoost, setAdvance, update, currentSpeed, driveSpeed, sideAt,
    isWhiteout, endDrive, syncSave, fromSave, gateFor, questionFor, roundConf,
  };
})();