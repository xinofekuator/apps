# SPRINTFIRE

A game-dev management sim: run a tiny indie team (Maia, Zoe, Rook — and NOVA, an AI that hallucinates) across six sprints and ship an arena FPS, SPRINTFIRE, before the calendar runs out.

Vanilla JS + HTML + CSS, no build step, no dependencies.

## Play

Run a local server from this folder:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000> in your browser.

> Opening `index.html` directly via `file://` mostly works, but serving over HTTP avoids cross-origin quirks (and is closer to the deployed site).

## How to play

- **Click a ticket** in the backlog, then **click a team member** to assign it.
- Each teammate has a **HARD point capacity** per sprint — you can't over-stuff them.
- Work someone too hard too many sprints in a row and they burn out (forced rest next sprint). Ignore wellbeing long enough and they quit for the rest of the game — support matters.
- NOVA (AI) has no wellbeing — it spends a **finite token budget**, and hallucinates bugs.
- Finishing tickets **unlocks** the next ones. You must complete BOTH the combat core (`t-boss`) AND the menu/shell (`t-menu`) to unlock **Release v1.0**.
- Watch out for loud, glowing-priority **AI-content traps** — they don't lead to release and each one triggers its own defeat ending (`t-ai-art`/`t-ai-voices`/`t-ai-fanart`).
- Ship v1.0 with at most **1 open bug**. 2+ open bugs at launch = DEFEAT ("buggy, but it's got heart"). Way too much NOVA work = players RIOT. (Feature freeze: work completed in the final sprint never spawns bugs — you can't fix bugs you have no sprint left to address.)
- Nobody buys a game nobody's heard of — do at least one **marketing** ticket (`t-trailer` or `t-social`), or shipping ends in deafening silence.

**End Sprint** runs the sprint simulation: burn down assigned points, spawn bugs, drain wellbeing, resolve exhaustion/quits.

## Ending conditions

- **Win (VICTORY)** — unlock and complete `Release v1.0` with ≤1 open bug AND at least one marketing ticket done. A ★3 ship is green "VICTORY"; a ship with fewer stars is an orange "SHIPPED — COULD DO BETTER" with one hint about why (e.g. a bug rode to launch, or a teammate quit).
- **Fail (DEFEAT)** — finish an AI-content trap (`t-ai-art`/`t-ai-voices`/`t-ai-fanart`); over-rely on NOVA (hidden threshold: ~80% of its token budget) and the players riot even if you shipped; 2+ teammates quit (even if you shipped); ship with ≥2 open bugs; ship without doing any marketing (launched into silence); never shipped anything; never reached release. NOVA running out of tokens is a handicap during play, not an instant loss.

## Verify

The engine (data + simulation rules) is tested with a Node harness in `js/`:

```bash
node --check js/data.js && node --check js/game.js && node --check js/ui.js && node --check js/main.js
```