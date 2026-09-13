# AGENTS.md — KORTTI

Static webapp (vanilla JS/HTML/CSS, no build step): a retro-cartoon arcade game about a woman from abroad learning to drive in Finland. `←/→` steers lanes (the car drives itself); hold `↑` for boost and tap it during a question to LOCK IN your answer early; dodge hazards, grab coins, and answer examiner Heikki's Finland-facts questions on A/B answer lanes painted on the road — the middle is a dead zone and never counts. 3 rounds (Summer/Autumn/Winter); pass all three to win the pink licence. Questions are curious Finland facts (en-only, 1-word A/B, crystal clear), 12 total rotating. Heikki is cranky first-person after each answer.

## Project layout

- `index.html` — app shell; loads JS in order: data → game → sound → ui → main (plain `<script>` tags, no modules).
- `js/data.js` — `CONFIG` (canvas, road/car dims, scoring, saveVersion 15), `ROUNDS` (3 rounds, 4-question `pool`s, no `tricks`), `QUESTIONS` (12 Finland-facts, en-only `a/b/ok/icon/real`), `EXPLOSION_LINES`, `RIG_FAILS`, `FAIL_REASONS`, `PASS_QUIPS`, `WIN_LINES`, `HAZARD_LINES`, `TUTORIAL_LINES`, `STORY`, `ENDINGS`. No DOM.
- `js/game.js` — `Game` namespace: deterministic seeded level gen, steering/collision, gate resolution (A/B lanes + dead zone), boost/ice, pickups, scoring/finishing/explosion, save serialization. No DOM.
- `js/sound.js` — `SFX` WebAudio synth (no assets): engine LFO + lowpass, per-season wind/pads, skid, hit, ding/buzz, rig, plink/tick/boom, pass/fail/win jingles.
- `js/ui.js` — `UI` renderer: canvas draw, HUD chips, speech bubble, Heikki question panel (timer circle + A/B pills), gate/dead-zone overlays, coins/boost meter/explosion, modal rendering helpers.
- `js/main.js` — `App` boot: loop, keyboard+tap input, boost, countdown, story/fail/pass/win modals, localStorage save/resume/autosave, gtag events, sound wiring.
- `css/style.css` — retro cartoon page styling plus the modal/toast chrome.

## Game rules (authoritative)

- **Controls**: `←/→` (or `a`/`d`, or tap the left/right half of the canvas) to move one lane. **Hold `↑`/`w` for boost (1.45× speed, disabled while a gate is active); pressing `↑` during a question LOCKS IN your current side and cuts the timer.** `R`/`↻` retry the round, `P`/`⏸` pause, `M`/`🔊` mute, Enter advances modals. Fresh `↑` tap required to lock (holding from before gate does not lock).
- **Rounds**: 3 rounds, each draws **2 gates at random from its 4-question pool**; no `tricks` (all have a clear correct `ok`). r1 Summer tourists (360), r2 Autumn gusts (520), r3 Winter whiteout (740). All `minPass 100`.
- **Scoring**: start 90, clamp to [0, 200]. Correct +8, wrong/timeout/middle −12, trick −5 (unused, kept for rigged), coin +1, boost bonus +1 per 8s clean boost. Hits: car −14, bus/moose −18, ped −16, tourist −16, cone −10, mopo −13, reindeer −16, construction −12; **a hit while boosting costs 2×**. Hit gives 1.2s invulnerability. Passing needs `score >= 100`; retries are unlimited and each attempt reshuffles the seeded track. Score hitting 0 = boom: the car explodes, Heikki is furious, round failed. Need 2 right (+16) + coins/boost to reach 100 from 90.
- **Gate resolution**: an A (left) vs B (right) split painted on the road. The answer counts only from the car's side **`x < 190` → A, `x > 230` → B; 190–230 is a dead zone** — crossing in the middle resolves as *no answer* and loses the question (wrong). No answer within the 10s timer also times out as wrong. **Pressing `↑` while a gate is active resolves it instantly** with your current side (`Game.setAdvance`) — ends the slow-mo and the countdown immediately. While a gate is active the game slows to ×0.22 slow-mo and the gate's A/B lanes glow. Gates are drilled with an obstacle-free buffer ±(gateLen/2+150), so the correct lane is never gridlocked.
- **Level gen** (deterministic, `mulberry32` seeded per round+attempt): road is 3 lanes of 100px. Obstacles start no closer than `CONFIG.spawnClear` (250) and are spaced `gapMin = 240 + baseSpeed*0.4 + slippery*180 + rnd()*130`. **Single-lane** obstacles (car/cone/ped/mopo/construction) occupy one lane; **wide** obstacles (bus/moose/reindeer) span 2 lanes and always leave the third free. Pairs are narrow-only. Coins (`pickups`, config `CONFIG.pickup` first 1200 period 620 jitter 300) spawn only in obstacle-free lanes and give +1; they never appear near gates.
- **Boost**: hold `↑`/`w` → `driveSpeed` ×1.45 (no boost during an active gate); clean boosted seconds accumulate and every `boost.bonusEvery` (8s) grants +1. Hitting an obstacle while boosting doubles the penalty.
- **Steering**: exponential lane lerp, `k = dt * steer` with `steer = 11` (5.5 on ice). `slippery` adds a sine wobble to x. Rain/winter rounds reduce lateral authority so gaps grow accordingly.
- **Winter tyre rule**: on r4/r5 `winter: true`, the speed-limit sign on each sidewall reflects the question `winterTires`/`winterLimit` — keep it readable.
- **Save versioning**: `CONFIG.saveVersion` (currently **15**) gates `Game.fromSave` in game.js. Bump it whenever data/balance/canvas layout changes so stale localStorage saves (key `kortti-v1`) are discarded instead of restored as corrupted runs.
- **Taglines**: `RIG_FAILS` (trick reveal), `WRONG_LINES` (Heikki's evil mockery on wrong/timeout/middle answers), `FAIL_REASONS` (round-fail modal, indexed as a rotating array), `PASS_QUIPS` (round clear), `WIN_LINES` (final licence line), `EXPLOSION_LINES` (score-0 reasons). Add to pools, don't reorder the ones that exist (fail reasons are indexed by an equation).

## Conventions

- No comments in code unless asked.
- Balance constants live in `CONFIG`/`ROUNDS` in data.js, never scattered in game/UI.
- Every question (`QUESTIONS`) has `en`, `a`, `b`, `ok` (`'a'`/`'b'`), `icon` and `real` (first-person cranky Heikki line, one line only).
- Keep the game beatable for a player with a full-screen view: the oracle-fairness probe is the authoritative structural check (see below).

## Verify after changes

All five JS files must parse:

```bash
node --check js/data.js && node --check js/game.js && node --check js/ui.js && node --check js/sound.js && node --check js/main.js
```

Engine/data/balance suite (loads game.js+data.js in Node, no DOM):

```bash
node /tmp/opencode/kortti-harness.js
```

Covers: data sanity (rounds/pools/tricks/weights/minPass/saveVersion/boost/ice/dead-zone/pickup economy/evil-Hekki lines/explosion lines), level gen (3 gates, spawn buffer, pickups, A/B dead zone), clean sim (perfect answers + destination-planner dodging reaches the pink licence; every round has a passing attempt), oracle fairness probe (25 tracks/round with instant-perfect anticipation and no reliance on coin cushions — treat <25/25 as a suspected unfair layout and cut wide-obstacle share / pairRatio / slippery before touching minPass), camper sim (an idle car must fail — proves hazards matter), explosion-at-zero, save/load roundtrip + stale-version rejection, driveSpeed math, and ↑-lock-in resolution (instant resolve, no boost during a gate). The bot agents are crude proxies, not proof of human win-rate; the oracle probe is the closest to structural fairness. Update the harness when collision geometry, gap denominators, engine API, or scoring change.

## Run locally

```bash
python3 -m http.server 8000   # from anywhere under /workspace/apps, then open http://localhost:8000/kortti/
```

State persists in `localStorage` under `kortti-v1`. The story modal shows on first run per round; a mid-run snapshot is saved each frame and resumed if you reload (matching `CONFIG.saveVersion`).