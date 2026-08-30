// ============================================================
//  SPRINT TACTICS — simulation engine (pure logic, no DOM)
//  Exposes the `Game` namespace.
// ============================================================
const Game = (() => {

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const rnd = (lo, hi) => lo + Math.random() * (hi - lo);
  const pr = (p) => Math.random() < p;

  const memberById = (id) => TEAM.find((m) => m.id === id);
  const ticketById = (id) => TICKETS.find((t) => t.id === id);

  // ---------- state creation ----------
  function newGame() {
    const tickets = {};
    const maxCap = Math.max(...TEAM.map((m) => m.capacity));
    for (const t of TICKETS) {
      if (t.points > maxCap) t.points = maxCap; // never allow an unworkable ticket
      tickets[t.id] = { ...t, remaining: t.points, status: 'backlog', assignee: null };
    }
    const crew = {};
    for (const m of TEAM) {
      crew[m.id] = {
        // humans: one merged wellbeing 0-100; NOVA: no wellbeing
        wellbeing: 100,
        wellbeingPct: m.isAI ? null : 100,
        consecutiveHeavy: 0,   // heavy sprint streak (human)
        exhausted: false,      // unavailable next sprint (forced rest)
        quit: false,
        quitReason: null,
        quitSprint: null,
        // NOVA
        tokensUsed: 0,
        offline: false,        // NOVA token cap reached (permanent)
        totalLoad: 0,
        sprintsWorked: 0,
      };
    }
    return {
      saveVersion: CONFIG.saveVersion,
      sprint: 0,
      phase: 'planning',
      tickets,
      crew,
      bugs: [],
      bugCounter: 0,
      completedLog: [],
      sprintResults: [],
      totalShipped: 0,
      selected: null,
      ending: null,
    };
  }

  // ---------- availability ----------
  function isUnlocked(state, t) {
    if (t.status === 'done') return false;
    const done = (id) => state.tickets[id] && state.tickets[id].status === 'done';
    if (t.unlock) return t.unlock.some((alt) => alt.all.every(done));
    if (t.requires) return t.requires.every(done);
    return true;
  }

  function availableTickets(state) {
    return Object.values(state.tickets).filter((t) => t.status === 'backlog' && isUnlocked(state, t));
  }

  function availableBugs(state) {
    return state.bugs.filter((b) => b.status === 'backlog');
  }

  function canWork(state, memberId) {
    const m = memberById(memberId);
    const c = state.crew[memberId];
    if (!m || !c) return false;
    if (c.quit) return false;
    if (c.exhausted) return false;      // forced rest
    if (m.isAI && c.offline) return false; // token cap
    return true;
  }

  function memberCap(state, memberId) {
    const m = memberById(memberId);
    if (!canWork(state, memberId)) return 0;
    return m.capacity; // HARD, fixed. wellbeing drives exhaustion/quits, never capacity.
  }

  function currentLoad(state, memberId) {
    let n = 0;
    for (const t of Object.values(state.tickets)) {
      if (t.status === 'inprogress' && t.assignee === memberId) n += t.remaining;
    }
    for (const b of state.bugs) {
      if (b.status === 'inprogress' && b.assignee === memberId) n += b.remaining;
    }
    return n;
  }

  function canAssign(state, ticketId, memberId) {
    const t = state.tickets[ticketId];
    if (!t) return { ok: false, reason: 'gone' };
    if (t.status === 'done') return { ok: false, reason: 'done' };
    if (!isUnlocked(state, t)) return { ok: false, reason: 'locked' };
    if (!canWork(state, memberId)) return { ok: false, reason: memberUnavailableReason(state, memberId) };
    if (t.status === 'inprogress' && t.assignee === memberId) return { ok: true };
    const load = currentLoad(state, memberId) + (t.remaining || t.points || 0);
    if (load > memberCap(state, memberId)) return { ok: false, reason: 'capacity' };
    return { ok: true };
  }

  function memberUnavailableReason(state, memberId) {
    const m = memberById(memberId);
    const c = state.crew[memberId];
    if (c.quit) return 'quit';
    if (c.exhausted) return 'exhausted';
    if (m.isAI && c.offline) return 'offline';
    return 'unknown';
  }

  // ---------- selection / assignment ----------
  function selectTicket(state, id) {
    const t = state.tickets[id];
    if (!t) return;
    if (t.status === 'backlog' && isUnlocked(state, t)) {
      state.selected = state.selected === id ? null : id;
    } else if (t.status === 'inprogress' || t.status === 'backlog') {
      // selecting an assigned/any ticket just toggles selection
      state.selected = state.selected === id ? null : id;
    }
  }

  // returns {ok, reason}
  function assignToMember(state, ticketId, memberId) {
    const t = state.tickets[ticketId];
    const check = canAssign(state, ticketId, memberId);
    if (!check.ok) return check;
    t.status = 'inprogress';
    t.assignee = memberId;
    state.selected = null;
    return { ok: true };
  }

  function unassign(state, ticketId) {
    const t = state.tickets[ticketId];
    if (!t) return;
    if (t.status === 'inprogress') { t.status = 'backlog'; t.assignee = null; }
    state.selected = null;
  }

  function unassignBug(state, bugId) {
    const b = state.bugs.find((x) => x.id === bugId);
    if (b && b.status === 'inprogress') { b.status = 'backlog'; b.assignee = null; }
  }

  // ---------- simulation ----------
  function endSprint(state) {
    const result = {
      done: [], partial: [], bugsSpawned: [],
      exhausted: [], quit: [], novaOffline: false, novaWarned: false, shipped: false,
    };
    const load = {};

    // 1) compute load + NOVA token cost
    for (const m of TEAM) {
      const c = state.crew[m.id];
      load[m.id] = currentLoad(state, m.id);
    }

    // 2) work burn-down (hard cap on completion per member via capacity)
    for (const m of TEAM) {
      const c = state.crew[m.id];
      if (!canWork(state, m.id)) continue;
      const cap = memberCap(state, m.id);
      const todo = Object.values(state.tickets).filter((t) => t.status === 'inprogress' && t.assignee === m.id)
        .concat(state.bugs.filter((b) => b.status === 'inprogress' && b.assignee === m.id));
      let remainingCap = cap;
      for (const work of todo) {
        if (remainingCap <= 0) break;
        const isBug = work.id.startsWith('BUG-');
        const spend = Math.min(remainingCap, work.remaining);
        work.remaining -= spend;
        remainingCap -= spend;
        if (work.remaining <= 0) {
          work.remaining = 0;
          work.status = 'done';
          work.doneSprint = state.sprint + 1;
          work.shippedBy = m.id;
          result.done.push(work);
          if (!isBug) state.totalShipped += work.points;
          // bug rolls: fixing bugs never spawns new bugs; sloppy authors can drop two.
          // The final sprint is a feature freeze — work completed there ships clean
          // (bugs from it would be unfixable, since the release resolves in the same pass).
          if (work.type !== 'release' && !isBug && state.sprint + 1 < CONFIG.sprints && pr(m.bugChance)) {
            const bug = spawnBug(state);
            result.bugsSpawned.push(bug);
            c.totalLoad = (c.totalLoad || 0) + bug.points;
            if (m.bugChance2 && pr(m.bugChance2)) {
              const bug2 = spawnBug(state);
              result.bugsSpawned.push(bug2);
              c.totalLoad = (c.totalLoad || 0) + bug2.points;
            }
          }
        } else {
          result.partial.push(work);
        }
      }
    }

    // NOVA token consumption: charged per point of work actually attempted
    {
      const nc = state.crew['nova'];
      const novaLoad = load['nova'] || 0;
      nc.tokensUsed = (nc.tokensUsed || 0) + novaLoad * CONFIG.novaTokenPerPoint;
    }

    // 3) unfinished assigned work returns to backlog
    for (const t of Object.values(state.tickets)) {
      if (t.status === 'inprogress' && t.remaining > 0) { t.status = 'backlog'; t.assignee = null; }
    }
    for (const b of state.bugs) {
      if (b.status === 'inprogress' && b.remaining > 0) { b.status = 'backlog'; b.assignee = null; }
    }

    // 4) human wellbeing + exhaustion + quit events; NOVA token cap
    for (const m of TEAM) if (m.isAI) {
      const c = state.crew[m.id];
      const ratio = c.tokensUsed / CONFIG.novaTokenBudget;
      if (ratio >= CONFIG.novaTokenWarnPct && ratio < 1) result.novaWarned = true;
      if (ratio >= 1) {
        c.offline = true;
        result.novaOffline = true;
        result.claim = 'novaOffline';
      }
    }

    for (const m of TEAM) {
      if (m.isAI) continue;
      const c = state.crew[m.id];
      if (c.quit) continue;
      const cap = memberCap(state, m.id);
      const ratio = cap > 0 ? load[m.id] / cap : 0;
      const heavy = ratio >= CONFIG.heavyLoadRatio;
      const light = ratio <= CONFIG.wellbeingLightLoad;

      if (c.exhausted) {
        // forced-rest sprint: fully recover, come back next sprint
        c.exhausted = false;
        c.wellbeing = clamp(c.wellbeing + 45, 0, 100);
        c.consecutiveHeavy = 0;
        continue;
      }

      if (heavy) {
        c.consecutiveHeavy++;
        c.wellbeing = clamp(c.wellbeing - CONFIG.exhaustedWellbeingPenalty - (load[m.id] * 0.8), 0, 100);
      } else if (light) {
        c.wellbeing = clamp(c.wellbeing + CONFIG.wellbeingRestGain, 0, 100);
        c.consecutiveHeavy = 0;
      } else {
        c.wellbeing = clamp(c.wellbeing + 5, 0, 100);
        c.consecutiveHeavy = 0;
      }
      c.sprintsWorked = (c.sprintsWorked || 0) + 1;

      // exhaustion when consecutive heavy hit threshold
      if (c.consecutiveHeavy >= CONFIG.consecutiveHeavyForExhaust) {
        c.exhausted = true;
        c.consecutiveHeavy = 0;
        result.exhausted.push(m.id);
      }

      // fed-up / low-wellbeing quit EVENT (chaotic, surprising)
      if (c.wellbeing <= CONFIG.quitEventBaseThresh && pr(CONFIG.quitEventChance)) {
        c.quit = true;
        c.exhausted = false; // quit overrides exhaustion; a quitter is just gone
        c.quitSprint = state.sprint + 1;
        c.quitReason = m.quitFlavor || 'fed up — wellbeing collapsed and a straw broke the camel.';
        result.quit.push({ id: m.id, reason: c.quitReason });
        releaseMemberTickets(state, m.id);
      }
    }

    // workload-neglect hard quit: a member who exhausts twice without a genuine
    // light sprint in between leaves for good. (tracked via a simple counter)
    for (const m of TEAM) {
      if (m.isAI) continue;
      const c = state.crew[m.id];
      if (c.quit) continue;
      if (c.neglectCount === undefined) c.neglectCount = 0;
      if (c.exhausted) {
        c.neglectCount++;
        if (CONFIG.workloadNeglectQuits && c.neglectCount >= 2) {
          c.quit = true;
          c.exhausted = false; // quit overrides exhaustion
          c.quitSprint = state.sprint + 1;
          c.quitReason = m.quitFlavor || 'worked to exhaustion twice in a row — walked out mid-sprint.';
          result.quit.push({ id: m.id, reason: c.quitReason });
          releaseMemberTickets(state, m.id);
        }
      } else if (c.wellbeing > 60 && load[m.id] / Math.max(1, memberCap(state, m.id)) <= CONFIG.wellbeingLightLoad) {
        c.neglectCount = 0; // a real rest resets it
      }
    }

    // 5) NOVA token-per-point consumed at end-of-sprint too (per sprint's work)
    // (the assignment-time booking above already tracks usage via totalLoad)

    // advance
    state.sprint += 1;
    state.sprintResults.push(result);
    state.selected = null;

    const shipped = state.tickets['t-ship'].status === 'done';
    result.shipped = shipped;

    if (shipped || state.sprint >= CONFIG.sprints) {
      state.phase = 'over';
      state.ending = buildEnding(state);
    }
    return result;
  }

  function releaseMemberTickets(state, memberId) {
    for (const t of Object.values(state.tickets)) {
      if (t.status === 'inprogress' && t.assignee === memberId && t.remaining > 0) {
        t.status = 'backlog'; t.assignee = null;
      }
    }
    for (const b of state.bugs) {
      if (b.status === 'inprogress' && b.assignee === memberId && b.remaining > 0) {
        b.status = 'backlog'; b.assignee = null;
      }
    }
  }

  function spawnBug(state) {
    state.bugCounter += 1;
    const tpl = BUG_TICKETS[(state.bugCounter - 1) % BUG_TICKETS.length];
    const pts = Math.round(rnd(1, 2));
    const b = {
      id: 'BUG-' + state.bugCounter, type: 'bug', points: pts, remaining: pts,
      status: 'backlog', assignee: null, title: tpl.title, desc: tpl.desc,
      author: 'bug', createdSprint: state.sprint + 1,
    };
    state.bugs.push(b);
    return b;
  }

  function assignBugToMember(state, bugId, memberId) {
    const b = state.bugs.find((x) => x.id === bugId);
    const check = canAssignBug(state, bugId, memberId);
    if (!check.ok) return check;
    b.status = 'inprogress';
    b.assignee = memberId;
    state.selected = null;
    return { ok: true };
  }

  function canAssignBug(state, bugId, memberId) {
    const b = state.bugs.find((x) => x.id === bugId);
    if (!b) return { ok: false, reason: 'gone' };
    if (b.status === 'done') return { ok: false, reason: 'done' };
    if (!canWork(state, memberId)) return { ok: false, reason: memberUnavailableReason(state, memberId) };
    if (b.status === 'inprogress' && b.assignee === memberId) return { ok: true };
    const load = currentLoad(state, memberId) + b.remaining;
    if (load > memberCap(state, memberId)) return { ok: false, reason: 'capacity' };
    return { ok: true };
  }

  // ---------- endings ----------
  // NOVA token usage ratio 0..1 (hidden from players).
  function novaTokenRatio(state) {
    return state.crew.nova.tokensUsed / CONFIG.novaTokenBudget;
  }

  function buildEnding(state) {
    const shipResult = state.sprintResults.some((r) => r.shipped);
    const openBugs = state.bugs.filter((b) => b.status !== 'done').length;
    const quitters = TEAM.filter((m) => state.crew[m.id].quit);
    const optDone = TICKETS.filter((t) => ['t-audio', 't-perf', 't-polish'].includes(t.id) && state.tickets[t.id].status === 'done').length;
    const isDone = (id) => state.tickets[id] && state.tickets[id].status === 'done';

    // Told-you-so lose conditions: each loud AI-content trap has its own ending.
    if (isDone('t-ai-fanart')) {
      return fail('WHY ARE THERE 40,000 BOTS?',
        'You finished the AI fan-art and fake-community ticket. To look popular, NOVA pre-generated a fanbase — 40,000 bot accounts that cheerlead each other in a group chat it started with itself. On launch day the wishlists are all bots, the reviews are all bots, and the one real player just watches the counter spin. It probably SOLD more tickets than it had fans.',
        'You marketed to bots. Bots did not buy. The one human refunded.');
    }
    if (isDone('t-ai-voices')) {
      return fail('THE VOICES ARE ALL AI',
        'You finished the AI voice ticket. Every NPC has its own bespoke AI actor that refuses to shut up — the build is 99% dialogue and the rest is the echo. Nobody can find the mute button, so the players left and left it running.',
        'You paid for 400 voices. The players paid to leave the room.');
    }
    if (isDone('t-ai-art')) {
      return fail('THE ART LOOKS AI',
        'You completed the AI art ticket. The textures are blobs, the protagonist has six fingers, and the style shifts between every build. Players refund on sight and reviewers screenshot the woman with the hands. That woman is the game now.',
        'The art was free. So was the goodwill it cost you.');
    }

    // AI over-reliance: players riot the moment NOVA does too much, shipped or not.
    if (novaTokenRatio(state) > 0.8) {
      const pct = Math.min(100, Math.round(novaTokenRatio(state) * 100));
      return fail('RELEASED AS AI SLOP — THE PLAYERS REVOLT',
        `NOVA absorbed ${pct}% of the project's brain. The build is confident, hallucinated garbage; every line reads like a fever dream about polygons. Players review-bomb before the day-one patch even lands.`,
        'Too much NOVA. The players had enough first.');
    }

    // Half the team walked — doesn't matter how far you got, this one's over.
    if (quitters.length >= 2) {
      const names = quitters.map((q) => q.name).join(' and ');
      const shippedNote = shipResult ? 'SPRINTFIRE did technically launch. With no one left to run it, patch it, or answer support, it patched itself out of existence within the week.' : 'The only artifact is a README reading "worked on my machine".';
      return fail('EVERYONE LEFT — EMPTY FOLDER DEMO',
        `${names} handed in notice mid-flight. ${shippedNote}`,
        'At the reveal you present the ruins and a very confident posture.');
    }

    if (shipResult) {
      // Shipped but it's a bug farm: players complain loudly — yet they like it.
      if (openBugs >= 2) {
        return fail('SHIPPED v1.0 — BUGGY, BUT IT\u2019S GOT HEART',
          `The FPS launches with ${openBugs} open bugs. Players complain constantly... and keep playing. They love the game and hate that it keeps eating their save file. Reviews are mixed, fans are loud, and every fix ships one new bug.`,
          'You won the audience and lost the launch rating.');
      }
      // Shipped to an audience that never existed: nobody marketed it.
      if (!isDone('t-trailer') && !isDone('t-social')) {
        return fail('LAUNCHED INTO SILENCE',
          'SPRINTFIRE ships — and nobody hears a thing. No trailer, no community, no wishlists. The store page sits at the bottom of page nine while the game\u2019s one player (you) stares at the counter. Zero on launch day.',
          'The game exists. Asking as a friend: does it reach anyone?');
      }
      // Shipped = a win. One straggler bug just costs a star.
      return winEnding(state, openBugs, optDone, quitters);
    }

    if (openBugs > 1) {
      return fail('COMPANY SWALLOWED BY ITS OWN BUGS',
        `The project never shipped, and ${openBugs} open bugs stacked up until the build folder stopped opening. The company quietly folds. It'll do great at an auction later.`,
        'Technical debt: because someone kept shipping new bugs over old ones.');
    }
    if (state.totalShipped === 0) {
      return fail('NOTHING SHIPPED, NOTHING HAPPENED',
        'Six sprints, zero points. The team met, spoke optimistically, and went home.',
        'The backlog is still loading, allegedly.');
    }
    return fail('NEVER REACHED THE RELEASE',
        `You shipped ${state.totalShipped} points but never unlocked v1.0. SPRINTFIRE stays a vertical slice with a menu, no game.`,
      'The build machine hums. It knows.');
  }

  function winEnding(state, openBugs, optDone, quitters) {
    let stars = 3;
    if (openBugs >= 1) stars -= 1;
    if (quitters.length > 0) stars -= 1;
    stars = clamp(stars, 0, 3);
    if (optDone >= 3) stars = Math.min(3, stars + 1);
    if (state.totalShipped <= 60) stars = Math.max(0, stars - 1);
    const verb = stars === 3 ? 'flawless' : stars === 2 ? 'solid' : stars === 1 ? 'shaky' : 'miraculously-late';
    // On a less-than-perfect ship, give ONE reason-based hint (no track spoilers).
    let hint = '';
    if (stars < 3) {
      if (openBugs >= 1) hint = 'One or more bugs rode to launch. Patch them next run and that star is yours.';
      else if (quitters.length > 0) hint = 'A teammate walked before the finish. Keep the roster together and you\u2019ll do better.';
      else if (state.totalShipped <= 60 || optDone < 3) hint = 'You shipped lean and light. There\u2019s room to swing bigger next time.';
    }
    return {
      win: true, verdict: stars === 3 ? 'VICTORY' : 'SHIPPED \u2014 COULD DO BETTER', stars,
      title: stars === 3 ? 'SHIPPED v1.0 🚀 flawless' : 'SHIPPED v1.0 🚀 but you can do better',
      body: `Against improbable odds, SPRINTFIRE launches. ${openBugs ? `${openBugs} straggler bug rides along to the day-one patch.` : `A ${verb} release — reviewers baffled it was built and QAed by one possibly-dreaming AI.`}`,
      takeaway: `${state.totalShipped} pts shipped · ${optDone} optional scope · ${quitters.length ? quitters.length + ' teammate(s) left.' : 'everyone made it to the finish.'} · ${hint || 'a flawless run.'}`,
    };
  }

  function fail(title, body, takeaway) {
    return { win: false, verdict: 'DEFEAT', stars: 0, title, body, takeaway };
  }

  return {
    newGame, availableTickets, availableBugs, isUnlocked, canWork, memberCap, currentLoad,
    canAssign, canAssignBug, selectTicket, assignToMember, assignBugToMember,
    unassign, unassignBug, endSprint, memberById, ticketById, clamp, spawnBug,
  };
})();
