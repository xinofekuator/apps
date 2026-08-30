// ============================================================
//  SPRINT TACTICS — static data: team, personalities, ticket tree
// ============================================================

const CONFIG = {
  saveVersion: 6,       // bump when balance/data changes; stale localStorage saves are discarded
  sprints: 6,
  // HARD capacity per member (story points / sprint) — cannot be exceeded.
  // wellbeing : single merged 0-100 bar per HUMAN. Drives exhaustion + quit events.
  heavyLoadRatio: 0.65,     // load >= 65% capacity = a "heavy" sprint
  consecutiveHeavyForExhaust: 2, // 2 heavy sprints in a row => exhausted (forced rest)
  exhaustedWellbeingPenalty: 28, // wellbeing hit while carrying heavy load (human)
  wellbeingRestGain: 34,    // wellbeing recovered by a light/rest sprint
  wellbeingLightLoad: 0.26, // load <= 26% capacity = light (counts as rest)
  lightWellbeingChill: 6,   // mild wellbeing drift on light sprint
  quitEventBaseThresh: 48,  // below this wellbeing, fed-up quit events can fire
  quitEventChance: 0.28,    // chance per below-threshold sprint that they quit via random event
  workloadNeglectQuits: true, // repeating exhaustion cycles can hard-quit a human
  // NOVA (AI): no wellbeing; finite token budget, permanent cap.
  novaTokenPerPoint: 2,     // tokens consumed per point of NOVA work
  novaTokenBudget: 48,      // total tokens for the whole game (permanent cap) — cap 8 burns through fast
  novaTokenWarnPct: 0.6,    // warn when consumed >= 60% of budget
};

// ------------------------------------------------------------
//  TEAM — 4 members. Roles align with capacity (seniority).
//   capacity : HARD max story points per sprint (visible).
//   bugChance: chance a completed ticket spawns a bug (hallucination/sloppiness)
//   bugChance2: if the first bug lands, chance of a SECOND one (NOVA/junior spawn spam)
//   twoLines : short flavour shown on the card (one line, subtle hint)
//   quitFlavor: one-line description of how they quit (for the report)
// ------------------------------------------------------------
const TEAM = [
  {
    id: 'nova', name: 'NOVA', role: 'AI',
    color: '#8b5cf6', symbol: '◈',
    capacity: 8, bugChance: 1.0, bugChance2: 0.45, isAI: true,
    quitFlavor: 'NO CONTEXT: NOVA reached its token limit mid-render, said "I am maximum", and the server went dark.',
    twoLines: 'AI. Finite token budget. Hallucinates.',
  },
  {
    id: 'maia', name: 'Maia', role: 'Tech Lead',
    color: '#22c55e', symbol: '✦',
    capacity: 8, bugChance: 0.05,
    quitFlavor: 'Maia walked out after calling NOVA "statistically confident garbage" — then took the espresso machine "for the sake of the team".',
    twoLines: 'Tech lead. No AI. Will dispute your estimate at length.',
  },
  {
    id: 'zoe', name: 'Zoe', role: 'Designer',
    color: '#38bdf8', symbol: '✿',
    capacity: 6, bugChance: 0.15,
    quitFlavor: 'Zoe quit to "pursue a passion project" — a dating sim where the player is finally understood.',
    twoLines: 'Artist. Would fix it, but the robot broke it. Again. Again.',
  },
  {
    id: 'rook', name: 'Rook', role: 'Junior Dev',
    color: '#f59e0b', symbol: '♜',
    capacity: 4, bugChance: 0.75, bugChance2: 0.25,
    quitFlavor: 'Rook ragequit to go touch grass.',
    twoLines: 'idk bro, we vibing. first time? my buddy taught me the word "refactor". 💀',
  },
];

const TEAM_ORDER = ['nova', 'maia', 'zoe', 'rook']; // left-to-right display

// Ticket types
const TYPES = {
  feature: { label: 'Feature', icon: '✦', cls: 'feature' },
  bug:     { label: 'Bug',     icon: '🐞', cls: 'bug' },
  chore:   { label: 'Chore',   icon: '🧹', cls: 'chore' },
  release: { label: 'Release', icon: '🚀', cls: 'release' },
};

// Priority levels (displayed). NOTE: traps use Priority "highest" to bait the player.
const PRIORITY = { highest: 1, high: 2, medium: 3, low: 4, lowest: 5 };

// ============================================================
//  TICKET TREE — 6-sprint sized.
//  - unlocks children once required tickets are DONE.
//  - a ticket is available if ANY `unlock` alternative is met
//    (default: all `requires` done, or roots have none).
//  - `endpoint` = the terminal Release. Only a few paths reach it.
//  - `aiScope` = trap: loud-priority AI-content, never unlocks Release,
//    each one triggers its own DEFEAT ending at game over.
// ============================================================
const TICKETS = [
  // ---- ROOTS: sprint 1. Plenty to choose from; you can't do it all at once.
  //      NOTE: no ticket may exceed the largest capacity (8) or it can never be worked.
  {
    id: 't-take2', type: 'feature', points: 4, author: 'rook',
    priority: 'high',
    title: 'Player movement & camera',
    desc: 'Wire up WASD move + mouse look, camera trailing the player. honestly im just plugging it in, fr.',
  },
  {
    id: 't-ui', type: 'feature', points: 5, author: 'zoe',
    priority: 'high',
    title: 'HUD & menu shell',
    desc: 'Build the in-game HUD and the screens behind it. Keep it calm and legible — players should read it at a glance, not squint. The last menu ate a button; don\u2019t repeat that.',
  },
  {
    id: 't-bootstrap', type: 'chore', points: 3, author: 'maia',
    priority: 'medium',
    title: 'CI pipeline & build cache',
    desc: 'Set up auto-builds that must pass on commit, with caching so we stop recompiling everything at lunch. I\u2019m doing the cache. Not the robot. Me.',
  },
  {
    id: 't-core', type: 'feature', points: 5, author: 'nova',
    priority: 'high',
    title: 'First playable build',
    desc: 'Get a running prototype where you can move and shoot. I already simulated 40,000 happy players — now let\u2019s make them real!',
  },

  // ---- WINNING BRANCH A: the action core (parallel forks, shallow) ----
  {
    id: 't-combat', type: 'feature', points: 4, author: 'rook',
    priority: 'high', requires: ['t-take2'],
    title: 'Enemies & combat loop',
    desc: 'Add enemies the player can fight. we make some bad guys, u click them, they stop. easy money fr.',
  },
  {
    id: 't-enemy', type: 'feature', points: 3, author: 'nova',
    priority: 'high', requires: ['t-take2'],
    title: 'Enemy AI behavior',
    desc: 'Give enemies simple AI: chase, strafe, attack. I\u2019ll also let a few wander off mid-fight, just for enrichment.',
  },
  {
    id: 't-boss', type: 'feature', points: 5, author: 'maia',
    priority: 'medium', requires: ['t-combat', 't-enemy'],
    title: 'Arena boss fight',
    desc: 'Build the end-of-match boss with three HP phases (100/60/25). Needs the camera fixed for phase 3 — the build crashes there today. Spec\u2019s final, I\u2019m not softening it.',
  },

  // ---- WINNING BRANCH B: the shell (short chain) -----------------
  {
    id: 't-save', type: 'feature', points: 3, author: 'nova',
    priority: 'medium', requires: ['t-ui'],
    title: 'Save & load progress',
    desc: 'Wire save/load so progress persists between runs. I can keep it non-quantum this time, promise.',
  },
  {
    id: 't-menu', type: 'feature', points: 4, author: 'zoe',
    priority: 'medium', requires: ['t-save'],
    title: 'Main menu & navigation',
    desc: 'Design the main menu: clear buttons, a quick flow to game. Players should be playing in seconds, not sitting through a 40-minute intro.',
  },

  // ---- OPTIONAL DEEPENERS (score boosters, not required to ship) --
  {
    id: 't-ai-base', type: 'feature', points: 3, author: 'nova',
    priority: 'high', requires: ['t-combat', 't-bootstrap'],
    title: 'Reusable enemy AI framework',
    desc: 'Build a shared AI framework (states, targeting) so every enemy type reuses it instead of bespoke hacks. I\u2019ve already imagined all the behaviors!',
  },
  {
    id: 't-progression', type: 'feature', points: 3, author: 'maia',
    priority: 'medium', requires: ['t-enemy'],
    title: 'Upgrade system',
    desc: 'Add upgrades and an XP curve, gated for pre-release. I\u2019ve got the curve dialed. Nobody\u2019s softening it.',
  },
  {
    id: 't-tune', type: 'feature', points: 3, author: 'nova',
    priority: 'medium', requires: ['t-ai-base', 't-progression'],
    title: 'Combat balance & tuning',
    desc: 'Tune damage, health, and pacing so the arena feels fair and fun. Ran a few million sims — target is \u2018fun\u2019; I\u2019ll know it when I see it.',
  },
  {
    id: 't-settings', type: 'feature', points: 3, author: 'zoe',
    priority: 'low', requires: ['t-save'],
    title: 'Settings menu',
    desc: 'Add a settings screen that genuinely saves, plus a working feedback button. Keep it tidy and player-friendly.',
  },
  {
    id: 't-tutorial', type: 'feature', points: 3, author: 'zoe',
    priority: 'medium', requires: ['t-settings'],
    title: 'Tutorial level',
    desc: 'Teach the core loop gently, like a friendly host. Short, encouraging, and into the action fast — no relentless prompts.',
  },

  // ---- MARKETING: not required to BUILD the release, but nobody buys a game
  //      nobody has heard of. Do at least one or launch into silence. ---------
  {
    id: 't-trailer', type: 'chore', points: 4, author: 'zoe',
    priority: 'low', requires: ['t-ui'],
    title: 'Teaser trailer & devlog',
    desc: 'Cut a 60-second trailer and post a devlog to build hype. Needs a voiceover that doesn\u2019t loop the word "gameplay" for a full minute.',
  },
  {
    id: 't-social', type: 'chore', points: 4, author: 'maia',
    priority: 'low', requires: ['t-bootstrap'],
    title: 'Community & wishlists',
    desc: 'Stand up a Discord and a wishlist campaign so launch-day traffic has somewhere to come from. Real people, not ping spam.',
  },

  // ---- TRAPS: loud-priority AI-content dead ends --------------------
  {
    id: 't-ai-art', type: 'feature', points: 6, author: 'nova',
    priority: 'highest', requires: ['t-take2'], aiScope: true,
    title: 'AI-generated art & assets',
    desc: 'Generate every texture and model with AI to skip the art wait. Why wait for artists when I can do it all instantly?',
  },
  {
    id: 't-ai-voices', type: 'feature', points: 5, author: 'nova',
    priority: 'highest', requires: ['t-ai-art'], aiScope: true,
    title: 'AI voice acting, every line',
    desc: 'Voice every line with a separate AI actor (all 400) so no casting is needed. The players will love the variety!',
  },
  {
    id: 't-ai-fanart', type: 'feature', points: 7, author: 'nova',
    priority: 'highest', requires: ['t-ai-voices'], aiScope: true,
    title: 'AI fan-art & fake community',
    desc: 'Pre-generate an enthusiastic-looking fanbase and their fan-art so launch looks like a hit. I can make it look like everyone\u2019s excited!',
  },

  // ---- OPTIONAL / SCORE BOOSTERS --------------------------------
  {
    id: 't-audio', type: 'feature', points: 4, author: 'zoe',    priority: 'low', requires: ['t-ui'],
    title: 'Sound FX & soundtrack',
    desc: 'Add SFX and a chiptune OST that loops cleanly. One "cleaned" track collapsed to 4/4 — redo it so it sounds intentional.',
  },
  {
    id: 't-perf', type: 'chore', points: 6, author: 'maia',
    priority: 'low', requires: ['t-enemy'],
    title: 'Performance & frame budget',
    desc: 'Keep combat at a steady 16ms with 500 entities — object-pool the projectiles. I\u2019ll profile until the numbers hold.',
  },
  {
    id: 't-polish', type: 'chore', points: 6, author: 'maia',
    priority: 'low', requires: ['t-boss', 't-menu'],
    title: 'QA & bug pass',
    desc: 'Fix the three crash regressions from the last merge and get a regression suite passing before launch.',
  },

  // ---- TERMINAL: the ONLY win -----------------------------------
  {
    id: 't-ship', type: 'release', points: 2, author: 'pm',
    priority: 'highest', endpoint: true,
    unlock: [{ all: ['t-boss', 't-menu'] }],
    title: 'Release v1.0 🚀',
    desc: 'Coordinate launch: final build, store page, and going live on time. Everything has to be ready and shipped.',
  },
];

// Bug ticket generator pool (hallucinations & sloppy work spawn these)
const BUG_TICKETS = [
  { title: 'Login loops forever ("Sign in" again)', desc: 'Freshly hallucinated. Pressing it again seems prudent. It is not.' },
  { title: 'Controller drift rewrites the README', desc: 'The docs now advertise a dance mode. A feature nobody asked for.' },
  { title: 'Save file eats the level select', desc: 'A bold refactor. The refactor was a bug with marketing.' },
  { title: 'Enemies count in decimals', desc: '0.5 of an enemy remains. The floor is 3/4th solid. The math is confident.' },
  { title: 'Menu button teleports to the menu', desc: 'Meta. Probably unintended.' },
  { title: 'Double-jump grants triple-jump on Tuesdays', desc: 'Weekly cooldown bug. Or a feature. Flag low.' },
];
