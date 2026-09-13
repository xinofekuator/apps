const CONFIG = {
  saveVersion: 2,
  canvas: { w: 420, h: 720 },
  heartsPerDay: 3,
  calmPerDay: 3,
  treatsPerDay: 3,
  stressCap: 100,
  trust: { clean: 8, tense: 2, bark: -10, sniff: -8, cross: 5, parkWin: 12, parkFail: -8, miles: [30, 65] },
  stress: { tense: 12, bark: 22, sniff: 16, parkFail: 22, treatPoison: 14, crossCalm: 0, cleanRelief: -8 },
  hearts: { bark: 1, sniff: 1, disaster: 2 },
  park: { disasterBads: 2, scoutBase: 2 },
  leaveBase: 0.58,
  failAfterDays: 2,
  maxDays: 3,
};

const DAYS = [
  { id: 'd1', name: 'Morning Lessons', blurb: 'Quiet streets. Learn the leash.', encounters: 6, park: false, parkDogs: 0, festival: false, rain: false },
  { id: 'd2', name: 'The Koirapuisto Route', blurb: 'Today the walk passes the park. She knows.', encounters: 7, park: true, parkDogs: 3, festival: false, rain: false },
  { id: 'd3', name: 'Festival Saturday', blurb: 'The park is full. Final test.', encounters: 7, park: true, parkDogs: 4, festival: true, rain: false },
];

const WEIGHTS = { dog: 48, fence: 12, smell: 18, distraction: 22 };
const WEIGHTS_PARK_DAY = { dog: 42, fence: 10, smell: 16, distraction: 16, rusher: 16 };

const DOGS = [
  { id: 'lab', name: 'Calm Labrador', icon: '🦮', coat: '#d9b06a', react: 0.7, risk: 0.08, vibe: 0, park: true, read: 'Soft eyes, loose tail. Easy.' },
  { id: 'hound', name: 'Sniffy Hound', icon: '🐕', coat: '#c1965a', react: 0.9, risk: 0.1, vibe: 0, park: true, read: 'Nose on the ground. Not looking at you.' },
  { id: 'pup', name: 'Wobbly Puppy', icon: '🐶', coat: '#f0d8b8', react: 1.0, risk: 0.06, vibe: 0, park: true, read: 'All bounce, no manners. Harmless.' },
  { id: 'poodle', name: 'Prissy Poodle', icon: '🐩', coat: '#f2ede6', react: 0.95, risk: 0.1, vibe: 0, park: true, read: 'Judging silently. Ignores drama.' },
  { id: 'collie', name: 'Staring Collie', icon: '🐕‍🦺', coat: '#5b6b82', react: 1.25, risk: 0.18, vibe: 1, park: true, read: 'Hard eye, low crouch. Wants to herd you.' },
  { id: 'husky', name: 'Loud Husky', icon: '🐺', coat: '#8ea0b8', react: 1.15, risk: 0.22, vibe: 1, park: true, read: 'Already yelling at its own owner.' },
  { id: 'terrier', name: 'Twitchy Terrier', icon: '🐕', coat: '#d18a3a', react: 1.3, risk: 0.28, vibe: 1, park: true, read: 'Vibrating. Wants to start something.' },
  { id: 'big', name: 'Moose-dog', icon: '🦮', coat: '#7a5a3a', react: 0.85, risk: 0.32, vibe: 1, park: true, read: 'Huge and slow. Rude if rushed.' },
  { id: 'guard', name: 'Gate Shepherd', icon: '🐕‍🦺', coat: '#4a3a2e', react: 1.2, risk: 0.3, vibe: 2, park: true, read: 'Guards the gate like it pays rent.' },
  { id: 'grump', name: 'Old Grump', icon: '🐕', coat: '#9a9a9a', react: 0.9, risk: 0.33, vibe: 2, park: true, read: 'Does not share space. Warns once.' },
  { id: 'duo', name: 'Hyper Duo', icon: '🐶', coat: '#e07a2a', react: 1.35, risk: 0.3, vibe: 2, park: true, read: 'Two friends, one braincell. Recruiting a third.' },
  { id: 'rusher', name: 'Off-leash Rusher', icon: '🐕', coat: '#c23a4a', react: 1.55, risk: 0.45, vibe: 2, park: false, read: 'Sprinting straight at you. No owner in sight.' },
];

const UPGRADES = [
  { id: 'sharp', name: 'Sharp ears', desc: 'LEAVE IT works a bit later.' },
  { id: 'pouch', name: 'Treat pouch', desc: '+1 treat each morning.' },
  { id: 'calm', name: 'Extra calm', desc: '+1 calm each day.' },
  { id: 'reader', name: 'Fence reader', desc: 'Scout reveals +1 park dog.' },
  { id: 'recall', name: 'Reliable recall', desc: 'Keep wins on early park exit.' },
  { id: 'steady', name: 'Steady paws', desc: 'Clean passes relieve more stress.' },
];

const QUIPS = {
  barkYou: ['Nina! Leave it!', "She's just excited!", 'Nina — no. Quiet!', 'Sorry! Sorry!'],
  barkOther: ["Quite loud, isn't she.", 'Maybe try a muzzle?', 'Mine would never.', '*crosses the street*'],
  sniff: ['We do NOT stop to sniff.', 'Keep walking. Keep walking.', 'Eyes up, nose off.', 'Not the time, Nina.'],
  lunge: ['NINA! Leave it!', 'I am so sorry!', 'Short leash. SHORT leash.'],
  fence: ['The fence dog always wins.', 'Ignore the fence.', 'Not our fight, Nina.'],
  parkWin: ['Good dogs! Good play!', 'See? Friends are fine.', 'Nina played!'],
  parkTense: ['Easy... easy...', 'That was close.', 'Space is good.'],
  sulk: ['Nina sits down. She is not moving.', 'The park was RIGHT THERE.', 'She will not budge.'],
  bribe: ['One treat. For cooperation.', 'Fine. A bribe. Walking again.'],
  scout: ['You peek over the fence...', 'Nina whines. You look anyway.'],
};

const TUTORIAL = {
  play: 'Pick one: LEAVE IT · CROSS (costs calm) · TREAT (costs calm + treat)',
  tip: 'Plan with the upcoming queue. Calm is scarce. 0 hearts = day failed.',
  park: 'GREET calm dogs · TREAT spicy ones · EXIT before trouble',
};

const ENDINGS = [
  { min: 65, title: 'Koirapuisto regular', verdict: 'LEGEND', body: 'Other owners nod at you by name. Nina trots past dogs she once screamed at and — once — shared a quiet sniff like it was nothing. The gate squeaks open and she walks in like she owns a timeshare there.' },
  { min: 38, title: 'Good neighbours', verdict: 'SOLID', body: 'Not silent, not spotless, but real progress. Shorter scenes, fewer scenes, and a Nina who sometimes looks at you instead of the other dog. The block has stopped crossing the street preemptively.' },
  { min: 12, title: 'Loud but loved', verdict: 'NOISY', body: 'The week was noisy. Treats were spent like parking fines. But nobody got bitten, the park did not ban you, and Nina still drags you toward the gate every single time with total optimism. That counts for something.' },
  { min: -999, title: 'The siren of the block', verdict: 'ROUGH', body: 'Every dog in three streets knows Nina\'s voice now. The fence dog has a nemesis. The park regulars check the gate before entering. Still — she is your dog, she had joy, and next week is a new week.' },
];

const LOSE_ENDING = {
  title: 'Too much this week',
  verdict: 'PAUSE',
  body: 'Two days in a row went sideways and the week tips over. Nothing dramatic — just a tired dog, a tired you, and a week that asks for a gentler one next time. Nina still loves the park. You both need a reset.',
};

const SFX_CFG = {
  bark: { gain: 0.3, base: 420, dur: 0.12 },
  whine: { gain: 0.16, base: 700, dur: 0.5 },
  sniff: { gain: 0.1, dur: 0.09 },
  munch: { gain: 0.2, dur: 0.1 },
  growl: { gain: 0.22, base: 90, dur: 0.5 },
  ding: { gain: 0.22, freq: 1046, dur: 0.16 },
  buzz: { gain: 0.22, freq: 150, dur: 0.28 },
  tick: { gain: 0.08, dur: 0.05 },
  pass: { gain: 0.25 },
  fail: { gain: 0.3 },
  win: { gain: 0.3 },
};
