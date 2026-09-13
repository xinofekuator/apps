# AGENTS.md — 100 MEXICANOS DIJERON (Fiesta Edition)

Static TV scoreboard (vanilla JS/HTML/CSS, no build): host controls a big screen, guests score on paper. 5 questions, simultaneous rounds — 90s debate → write top 3 → ¡Tiempo! → reveal bottom→top (5→50), tap team icons to award fixed points.

## Project layout
- `index.html` — shell: setup / lobby / play+timer / podium (views). Loads data → app → sfx → ui → main.
- `js/data.js` — `CONFIG` (timer 90s, scoresByRank [50,30,20,10,5], TEAM_FOODS, saveVersion), 5 `QUESTIONS` (English, 5 answers each with `survey` %), `EMOJIS`, `PALETTE`, `SFX_CFG`. No DOM.
- `js/app.js` — `App` pure logic: teams, scores, per-question `revealed` + `awards`, `rankedAnswers` (sort by survey desc → assign 50/30/20/10/5), `revealOrder` (asc survey), `toggleAward` (tap team chip → +points / undo), `recomputeScores`, `podium`, save via `localStorage` key `mexicanos-v1`.
- `js/sfx.js` — `SFX` WebAudio: tick/ding/reveal/tiempo/win.
- `js/ui.js` — `UI` render: score strip, setup editor (emoji picker), question grid, play card (timer ring, answer list with team chips), podium (🥇🥈🥉 + confetti).
- `js/main.js` — `Main` boot: timer interval, keyboard (Space/R/N), view switching, persistence.
- `css/style.css` — fiesta theme: warm gradient, crimson/gold, Fredoka+Bangers, big TV-readable cards.

## Game rules
- Teams 2–8 (default 4: Tacos/Tamales/Quesadillas/Chilaquiles) with food emoji+color. Auto-named from TEAM_FOODS, editable.
- Each question: 5 answers ranked by survey % (most→50, least→5). Reveal order is bottom→top (5→50) — money answer last at top.
- Scoring: host taps a team chip on a revealed answer to award that answer's fixed points; tap again to undo. Guests mirror on paper. Scoreboard totals update live.
- Timer: 90s debate, tick last 5s, ¡Tiempo! flash. Host controls start/pause/reset.
- Podium: sorted totals desc, confetti fanfare.

## Verify
```bash
node --check js/data.js && node --check js/app.js && node --check js/ui.js && node --check js/sfx.js && node --check js/main.js
node /tmp/opencode/mexicanos-harness.js
```
Harness: 5×5 data, ranks→scores, reveal asc, toggle/undo totals, podium, version.

## Run
```bash
python3 -m http.server 8000  # then http://localhost:8000/mexicanos/
```
State in `localStorage` under `mexicanos-v1`.
