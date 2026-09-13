const CONFIG = {
  saveVersion: 15,
  canvas: { w: 420, h: 720 },
  road: { width: 300, lanes: 3, left: 60 },
  car: { w: 52, h: 88, screenY: 585, steer: 11 },
  scoring: {
    start: 90,
    correct: 8,
    wrong: 12,
    rigged: 5,
    pickup: 1,
    hitCar: 14,
    hitBus: 18,
    hitMoose: 18,
    hitPed: 16,
    hitTourist: 16,
    hitCone: 10,
    hitMopo: 13,
    hitReindeer: 16,
    hitConstruction: 12,
    floor: 0,
  },
  invuln: 1.2,
  gateLen: 240,
  gateViewAhead: 90,
  gateTimer: 10,
  gateSlow: 0.22,
  gateDeadLow: 190,
  gateDeadHigh: 230,
  spawnClear: 250,
  boost: { mult: 1.45, bonusEvery: 8, bonus: 1 },
  tourist: { first: 1500, period: 950, span: 240 },
  gusts: { period: 5200, dur: 1.15, force: 24, warn: 1.0 },
  whiteout: { period: 9000, on: 3600 },
  pickup: { first: 1200, period: 620, jitter: 300 },
};

const ROUNDS = [
  {
    id: 'r1', fi: 'Kesä', en: 'Summer', tag: 'Kesä / Summer', blurb: 'Tourists wander. The cow stays.',
    minPass: 100, length: 14000, baseSpeed: 360, ramp: 0.000022, slippery: 0, pairRatio: 0.18,
    weights: { car: 50, ped: 12, cone: 24, mopo: 4, reindeer: 2, construction: 8 }, touristEvery: 880,
    winter: false, rain: false, bgTop: '#aee0ff', bgBot: '#e2f5c8', road: '#7d8695',
    nGates: 2, pool: ['sauna', 'lakes', 'sun', 'rights'], tricks: [],
    mech: 'tourists',
  },
  {
    id: 'r2', fi: 'Syksy', en: 'Autumn', tag: 'Syys / Autumn', blurb: 'Gusts shove the wheel.',
    minPass: 100, length: 17000, baseSpeed: 520, ramp: 0.00002, slippery: 0.16, pairRatio: 0.32,
    weights: { car: 46, bus: 5, moose: 7, ped: 10, cone: 22, mopo: 2, reindeer: 3, construction: 5 },
    winter: false, rain: true, bgTop: '#c78a3a', bgBot: '#e8b86a', road: '#6f7a88',
    spawnClear: 320,
    nGates: 2, pool: ['salmiakki', 'coffee', 'hockey', 'santa'], tricks: [],
    mech: 'gusts',
  },
  {
    id: 'r3', fi: 'Talvi', en: 'Winter', tag: 'Talvi / Winter', blurb: 'The shortest day. Know your lane.',
    minPass: 100, length: 20000, baseSpeed: 740, ramp: 0.000015, slippery: 0.22, pairRatio: 0.38,
    weights: { car: 36, bus: 7, moose: 8, ped: 10, cone: 20, mopo: 2, reindeer: 10, construction: 7 },
    winter: true, rain: false, bgTop: '#4a5a72', bgBot: '#8ea0b8', road: '#4a5566',
    spawnClear: 380,
    nGates: 2, pool: ['lights', 'iceSwim', 'tyres', 'reindeer'], tricks: [],
    mech: 'whiteout',
  },
];

const QUESTIONS = {
  sauna: { en: 'Most saunas per people?', a: '3M', b: '300', ok: 'a', icon:'🧖', real: 'I sauna weekly. I know 3M. You guessed 300?' },
  lakes: { en: 'Finland = land of?', a: 'Lakes', b: 'Deserts', ok: 'a', icon:'🌊', real: 'I swim lakes. I don’t do deserts.' },
  sun: { en: 'Summer night in Lapland?', a: 'Dark', b: 'Light', ok: 'b', icon:'☀️', real: 'I sleep with sun up. I manage. You wouldn’t.' },
  santa: { en: 'Santa lives in?', a: 'Rovaniemi', b: 'Paris', ok: 'a', icon:'🎅', real: 'I visit Rovaniemi. I don’t look in Paris.' },
  salmiakki: { en: 'Salty liquorice is?', a: 'Candy', b: 'Poison', ok: 'a', icon:'🖤', real: 'I eat salmiakki. I love it. You fear it.' },
  coffee: { en: 'Finns drink most?', a: 'Coffee', b: 'Tea', ok: 'a', icon:'☕', real: 'I drink 4 cups. I function. You do tea.' },
  hockey: { en: 'Winter religion here?', a: 'Golf', b: 'Hockey', ok: 'b', icon:'🏒', real: 'I watch hockey. I shout. You said golf.' },
  reindeer: { en: 'More than people up north?', a: 'Reindeer', b: 'Cars', ok: 'a', icon:'🦌', real: 'I stop for reindeer. They own Lapland.' },
  lights: { en: 'Winter sky shows?', a: 'Aurora', b: 'Rainbow', ok: 'a', icon:'🌌', real: 'I watch aurora. I freeze. Worth it.' },
  iceSwim: { en: 'After sauna, Finns?', a: 'Ice swim', b: 'Nap', ok: 'a', icon:'🧊', real: 'I jump in ice. I scream. Then sauna again.' },
  tyres: { en: 'Winter tyres are?', a: 'Optional', b: 'Law', ok: 'b', icon:'❄️', real: 'I know studs are law. You said optional.' },
  rights: { en: 'Pick berries anywhere?', a: 'No', b: 'Yes', ok: 'b', icon:'🫐', real: 'I pick anywhere. Everyman’s right. You asked permission.' },
};

const EXPLOSION_LINES = [
  'Heikki: \u201CZERO POINTS. The car is a firework, the licence is ash, and I am FURIOUS.\u201D',
  'Heikki: \u201CYou lost every point. I have seen fireballs before — never from inside my own student.\u201D',
];

const WRONG_LINES = [
  'VÄÄRIN!',
  'WRONG!',
  'Nope.',
  'Facepalm.',
  'Guessed, eh?',
  'Deducted.',
];

const RIG_FAILS = [
  'TRICK! -5',
  'Both wrong.',
  'Gotcha! -5',
  'Nope. Trick.',
  'Wrong energy.',
  'Sus. -5',
];

const FAIL_REASONS = [
  'Too slow.',
  'Not my exam.',
  'No mirror. Fail.',
  'Off road.',
  'No approval.',
  'Zebra says no.',
  'Hesitated.',
  'Too perfect. Fail.',
  'Car passed, you didn’t.',
  'Failed. Again.',
];

const PASS_QUIPS = [
  'Heikki: \u201CPASS. Barely. I could smell the panic and it passed inspection.\u201D',
  'Heikki: \u201CPASS. Don\u2019t let it go to your head — it already has a licence.\u201D',
  'Heikki: \u201CPASS. The car, at least, passed. I\u2019m still grading you.\u201D',
  'Heikki: \u201CPASS. I\u2019ve seen worse. I\u2019ve seen worse TODAY.\u201D',
];

const WIN_LINES = [
  'Heikki: \u201CI failed you every round and you still came back. PASS.\u201D',
  'Heikki: \u201CThe pinkest licence I have ever signed. And I hated every minute.\u201D',
  'Heikki: \u201CTake the car. Take the road. If you see a tourist, think of me.\u201D',
];

const HAZARD_LINES = [
  'VÄISTÄ!',
  'WATCH OUT!',
  'Red pen!',
  'PEDESTRIAN!',
  'Ouch!',
];

const HEIKKI_QUIPS = [
  'no.',
  'faster!',
  'MIRROR?',
  'music?',
  'K-O',
  'poro.',
  'tuulee.',
  'joo. no.',
  'hidas.',
  'vakuuta.',
];

const TUTORIAL_LINES = {
  drive: '← → to steer. ↑ to boost.',
  gate: 'A or B — 10s. Middle = wrong.',
  autumn: 'Wind! Hold steady.',
  winter: 'Whiteout ahead!',
};

const STORY = [
  {
    fi: 'Kesä · Summer',
    title: 'Kesä',
    tag: 'the first exam',
    beats: [
      { icon: '\uD83D\uDEEC', label: 'you moved to Finland — the pink licence is your goal' },
      { icon: '\uD83D\uDE97', label: 'Heikki, 62, your examiner — calm, strict, very Finnish' },
      { icon: '\uD83D\uDE8C', label: 'summer roads: tourists wander everywhere' },
    ],
  },
  {
    fi: 'Syksy · Autumn',
    title: 'Syksy',
    tag: 'second exam',
    beats: [
      { icon: '\uD83C\uDF42', label: 'autumn: wind shoves your car' },
      { icon: '\uD83D\uDDE3', label: 'Heikki: “Hold steady. Don’t fight it.”' },
    ],
  },
  {
    fi: 'Talvi · Winter',
    title: 'Talvi',
    tag: 'final exam',
    beats: [
      { icon: '\u2744\uFE0F', label: 'winter — sun barely rises' },
      { icon: '\uD83C\uDF19', label: 'whiteout blinds the road ahead' },
    ],
  },
];

const ENDINGS = {
  win: {
    verdict: 'VICTORY',
    title: 'The Pink Licence',
    fi: 'Vihdoinkin! · Finally!',
    body: 'Heikki signs your certificate with a flourish. Then he signs it again, because he wants to be sure you know he\u2019s serious. \u201CPASS\u201D, he says, louder than necessary.\n\nOutside the snow is falling. Your partner waits by the car with two steaming mugs of warm glögi. For once — you want to drive home slowly and just enjoy it.',
    takeaway: 'You beat the tourists, the wind, the shortest day — and earned the real Finnish pink licence.',
  },
  dusk: {
    verdict: 'DRIVE HIM TO THE BUS STOP',
    title: 'The Pink Licence (barely)',
    fi: 'Meno ajokortti',
    body: 'Heikki hands you the licence, then immediately demands to see it again. \u201CI just want to be sure it isn\u2019t a typo,\u201D he says. It\u2019s pink. It\u2019s real. It\u2019s yours.\n\nHe gets out, shakes your hand, and wins this by being proud of you without saying so. (He says so.)',
    takeaway: 'Not perfect. Still pink. Still yours.',
  },
};

const OB_PAL = {
  car: ['#e05c5c', '#e08a3c', '#5aa9f4', '#9b6ae0', '#4fbf8f', '#e05c9c'],
  bus: ['#ffd23f'],
  moose: ['#8a5a3b'],
  ped: ['#3b4a5a'],
  tourist: ['#e05c9c', '#4fbf8f', '#5aa9f4', '#e08a3c'],
  cone: ['#ff7a2f'],
  mopo: ['#e8c84a', '#6ad7d0'],
  reindeer: ['#8a5a3b'],
  construction: ['#ff7a2f'],
};

const SFX_CFG = {
  engine: { gain: 0.045, base: 50, spread: 38, lfo: 4.5, lfoDepth: 2.4, lp: { base: 240, spread: 540 } },
  skid: { gain: 0.05, dur: 0.22 },
  hit: { gain: 0.4, dur: 0.18 },
  ding: { gain: 0.22, freq: 1046, dur: 0.16 },
  buzz: { gain: 0.22, freq: 150, dur: 0.28 },
  rig: { gain: 0.25, dur: 0.5 },
  pass: { gain: 0.25 },
  fail: { gain: 0.3 },
  win: { gain: 0.3 },
  windSeasons: [0.02, 0.026, 0.034, 0.043, 0.05],
  wind: { cutoff: 480 },
  pad: { gain: 0.012 },
  pads: [[196.0, 293.66], [220.0, 329.63], [174.61, 261.63], [146.83, 220.0], [130.81, 196.0]],
  plink: { gain: 0.16, dur: 0.16 },
  tick: { gain: 0.08, dur: 0.05 },
  boom: { gain: 0.42, dur: 0.9 },
};