# AGENTS.md — SPRINTFIRE

This static webapp (vanilla JS/HTML/CSS, no build step) is a game-dev management sim: ship an arena FPS in six sprints. Helpful conventions and commands for working here.

## Project layout

- `index.html` — app shell; loads JS in order: data → game → ui → main (plain `<script>` tags, no modules).
- `js/data.js` — `CONFIG` (sprints, capacities, wellbeing/token constants), `TEAM`, `TEAM_ORDER`, `TYPES`, `PRIORITY`, `TICKETS` (ticket DAG), `BUG_TICKETS`.
- `js/game.js` — `Game` namespace: capacity, wellbeing/exhaustion/quit logic, NOVA tokens, end-sprint simulation, endings. No DOM.
- `js/ui.js` — `UI` renderer: member cards, backlog, modals/toasts.
- `js/main.js` — `App` action handlers, localStorage save/load, intro, sprint report.
- `css/style.css` — light "JIRA-like" theme. `--accent`/`--ai`/`--ok`/`--warn`/`--bad` are status colors used across UI + member cards.

## Game rules (authoritative)

- **Capacities (HARD)**: Nova 8 (AI), Maia 8, Zoe 6, Rook 4. No ticket may exceed the largest capacity (8), or it can never be assigned — keep all `TICKETS[].points <= 8`.
- **Sprints**: 6 (`CONFIG.sprints`).
- **Wellbeing** (humans only): heavy = load ≥ 65% of effective cap; 2 consecutive heavy → `exhausted` (forced rest next sprint → recovers). Low wellbeing (≤48) → fed-up quit events at `quitEventChance` (0.28) per such sprint. Workload-neglect (exhaust twice without a real rest) → hard quit. Tuned so sustained overwork causes rests and quits at a moderate clip; keeping humans ≤~50% load avoids both entirely.
- **NOVA**: no wellbeing; tokens = `load * novaTokenPerPoint`, budget `novaTokenBudget` (48) → permanent offline at cap.
- **Bugs**: a completed ticket has `bugChance` to spawn a bug; if the first lands, `bugChance2` spawns a second. Rates: NOVA 1.0/0.45, Maia 0.05, Zoe 0.15, Rook 0.75/0.25. Fixing bugs never spawns new bugs. Bugs are 1–2 pts each. Bugs taken to ship matter: ≤1 is fine, ≥2 is a DEFEAT. **Feature freeze**: work completed in the final sprint never spawns bugs (they'd be unfixable — the release resolves in the same pass).
- **Win**: `t-ship` unlocks via `unlock: [{ all: ['t-boss', 't-menu'] }]` — BOTH branches required. Ship with ≤1 open bug. **Marketing is also a win gate**: at least one of `t-trailer` or `t-social` must be done, or shipping ends in DEFEAT ("LAUNCHED INTO SILENCE" — nobody heard about the game).
- **Fail conditions** (in priority of `buildEnding`): each done AI-content trap fires its OWN ending (`t-ai-art` → "THE ART LOOKS AI", `t-ai-voices` → "THE VOICES ARE ALL AI", `t-ai-fanart` → "WHY ARE THERE 40,000 BOTS?"); **AI over-reliance = Riot** when `novaTokenRatio > 0.8` (fires regardless of shipping — threshold is HIDDEN, never shown in UI); **≥2 teammates quit → "EVERYONE LEFT — EMPTY FOLDER DEMO"** (fires whether or not you shipped); shipped with ≥2 open bugs → "BUGGY, BUT IT'S GOT HEART"; shipped with no marketing → "LAUNCHED INTO SILENCE"; shipped-but-broken; never shipped anything; never reached the release. NOVA-maxed (offline via tokens) is a handicap during play.
- **Win modal**: a perfect ship (★3) shows a green `VICTORY` banner. Any ship with <3 stars shows an **orange** "SHIPPED — COULD DO BETTER" banner, a "but you can do better" title, and **one** reason-based hint (why a star was lost — e.g. a shipped bug or a quit), never a list of missing tracks.
- **Traps**: `t-ai-art` → `t-ai-voices` → `t-ai-fanart` (all `aiScope: true`, all loud `highest` priority, none on the required path). Finishing one triggers its dedicated DEFEAT — each ending text MUST name the trap it came from so the lose condition is obvious.
- **Tickets**: `requires` = all must be done; `unlock` = any alternative `{all:[...]}` satisfied.
- **Balance (aims)**: BOTH branches = 30 required pts (~19% of 6-sprint team output 156) — winnable but bug/AI-reliance pressure keeps it tense. Tree total 87 (small, ~56% of 156). Roots (4 tickets, 17 pts) fit sprint 1 (cap 6). Keep every `TICKETS[].points <= 8` (largest cap).
- **Sprint report**: after each sprint, `reportSprint` prints a short scripted line: `Maia (lead): "~NN% launch-ready."` plus one tester quip (Marcus/Lukas/Zara), keyed to the current gap. The final (game-over) modal shows NO hints/percentages — just the ending + facts.
- **Save versioning**: `CONFIG.saveVersion` gates `load()` in main.js. Bump it whenever balance/data changes so stale localStorage saves (old points/capacities/tree) are discarded instead of restored as corrupted games.

## Conventions

- No comments in code unless asked.
- Keep balance constants in `CONFIG` (data.js), not scattered in game/UI.
- Author voices: NOVA = optimistic, eager-to-please AI, punchy and slightly hallucinatory; Maia = technical, actively anti-NOVA, aggressive and stubborn (won't yield on specs); Rook = lazy, clueless with no technical vocabulary, Gen-Z slang ("fr", "idk", "bro", "vibes", 💀); Zoe = artistic, funny, ironic, subtly blames robots and defends her art direction.

## Verify after changes

All four JS files must parse:

```bash
node --check js/data.js && node --check js/game.js && node --check js/ui.js && node --check js/main.js
```

Data/ref sanity + balance numbers (tree total, path sizes, scarcity):

```bash
node /tmp/opencode/bal.js    # data refs, tree vs team output, path sizes
node /tmp/opencode/sim.js    # seeded simulation: win rates, quits, avg team load
node /tmp/opencode/harness.js # engine behaviors (capacity, exhaustion, NOVA cap, win/fail paths)
```

These harnesses load the game source directly in Node (no DOM). Update them when ticket ids/points change. NOTE: `sim.js`/`sim2.js`/`harness.js` bots are greedy and unreliable as win-rate proxies (random bug spawns + exhaustion/quit swings tip results); treat them as sanity checkers, not proof of un/winnability. `bal.js` output + `harness.js [SHIP-RULE]` are the authoritative structural checks.

## Run locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

State is persisted in `localStorage` under `sprintfire-v1`. The intro modal shows on **every reload** (no persistence). Stale saves (missing/mismatched `CONFIG.saveVersion`) are auto-discarded on load.