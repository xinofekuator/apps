# AGENTS.md — KOIRA

Static webapp (vanilla JS/HTML/CSS, no build step): a 3-day tactical dog-walk card game. Walk Nina, a rescued golden retriever puppy — strategy-simple, but loseable. Compact card stack: visible upcoming queue, 3 commands (LEAVE IT / CROSS / TREAT), hearts + calm + treats, gate-to-park gamble, 2 failed days = week over.

## Project layout

- `index.html` — app shell; loads JS in order: data → game → sound → ui → main (plain `<script>` tags, no modules).
- `js/data.js` — `CONFIG` (saveVersion 2, hearts/calm/treats, trust/stress/hearts economy, failAfter 2), `DAYS` (3, park on 2&3, festival finale), `DOGS` (12 archetypes, vibe/read), `UPGRADES` (6), `ENDINGS` + `LOSE_ENDING`, `QUIPS`, `SFX_CFG`. No DOM.
- `js/game.js` — `Game` namespace: seeded queue gen, turn resolver (leave/cross/treat), visible upcoming, calm/stress/hearts, gate/park sim (scout/enter/skip, sulk, bribe, meets), 2-fail lose + buzz snowball, upgrade miles, save. No DOM.
- `js/sound.js` — `SFX` WebAudio synth (no assets): bark/whine/sniff/munch/growl/ding/buzz/tick/pass/fail/win.
- `js/ui.js` — `UI` renderer: warm storybook canvas scene (gradient sky, houses, illustrated Nina as golden puppy + other dogs), card-stack DOM (encounter/upcoming/choice rows), HUD/bubble/overlay/modal/toast.
- `js/main.js` — `App` boot: turn flow (encounter→gate→park→evening→upgrade→over), keyboard + tap input, save/resume/autosave, gtag, sound wiring.
- `css/style.css` — warm storybook theme (cream/amber/sage, Baloo 2 + Inter, glass cards, soft shadows).

## Game rules (authoritative)

- **Turns**: a day is 6–7 encounter cards drawn seeded per day+attempt. Each turn you see the current encounter + the next 2 (visible queue) — plan calm.
- **Commands (3)**: **LEAVE IT (1)** free, but threshold shrinks with stress/buzz/poison — can be tense/bark/sniff if too stressed; **CROSS (2)** costs 1 calm, always dodges (blocked on fence); **TREAT (3)** costs 1 calm + 1 treat, always clean but poisons next turn (harder).
- **Resources**: **Hearts 3/day** — scenes cost 1 heart; 0 = day failed. **Calm 3/day** (+1 with calm upgrade). **Treats 3/day** (+1 with pouch). **Stress 0–100** — tense/bark/sniff raise stress; clean relieves it; poison + sulk + buzz make next LEAVE IT harder.
- **Gate**: on park days mid-queue, pause. **SCOUT** peeks (free, reveals 2 + reader bonus), **ENTER** starts 3–4 park meets (greet/treat/exit), **WALK ON** triggers sulk (remaining turns harder until **BRIBE** 1 calm + 1 treat).
- **Park meets**: **GREET** free (win/tense/bad by vibe/buzz roll), **TREAT** costs calm+treat but always win; 2 bads = disaster, 0 hearts anytime also disaster. **EXIT** keeps wins (recall bonus).
- **Days & lose**: 2 failed days = week over (LOSE ending). Failing bumps **buzz** (persistent difficulty snowball). Trust milestones at 30/65 grant 1 upgrade pick among 3.
- **Saves**: `CONFIG.saveVersion` **2** gates `Game.fromSave`. Bump on data/balance/layout change; key `koira-v1`.

## Conventions

- No comments in code unless asked.
- Balance constants live in `CONFIG`/`DAYS`/`DOGS` in data.js.
- Keep it winnable for perfect play (clean queue with calm planning), but a blunder bot that always picks wrong must lose by day ≤2.

## Verify after changes

```bash
node --check js/data.js && node --check js/game.js && node --check js/ui.js && node --check js/sound.js && node --check js/main.js
node /tmp/opencode/koira-harness.js
```

Harness covers: data sanity (3 days, 12 dogs, 6 upgrades, saveVersion, economy), queue determinism, perfect 3-day clear, blunder lose-by-2, park paths, sulk/bribe, save roundtrip + stale rejection.

## Run locally

```bash
python3 -m http.server 8000   # from anywhere under /workspace/apps, then open http://localhost:8000/koira/
```

State persists in `localStorage` under `koira-v1`.
