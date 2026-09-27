const CONFIG = {
  saveVersion: 4,
  saveKey: 'mexicanos-v1',
  timerSeconds: 90,
  scoresByRank: [50, 30, 20, 10, 5],
  maxTeams: 8,
  minTeams: 2,
};

const TEAM_FOODS = [
  { name: 'Tacos', emoji: '🌮' },
  { name: 'Tamales', emoji: '🫔' },
  { name: 'Quesadillas', emoji: '🧀' },
  { name: 'Chilaquiles', emoji: '🍳' },
  { name: 'Enchiladas', emoji: '🌯' },
  { name: 'Pozole', emoji: '🍲' },
  { name: 'Elote', emoji: '🌽' },
  { name: 'Guacamole', emoji: '🥑' },
  { name: 'Tostadas', emoji: '🥙' },
  { name: 'Sopes', emoji: '🫓' },
  { name: 'Flautas', emoji: '🌯' },
  { name: 'Mole', emoji: '🍫' },
];

const EMOJIS = ['🌮','🫔','🧀','🍳','🌯','🍲','🌽','🥑','🥙','🫓','🍫','🦊','🐯','🐼','🦁','🐸','🦄','🐙','🐵','🐧','🦋','🐢','🦖','🐨','🎉','🎈','🔥','⭐','🌵'];

const PALETTE = ['#E11D48','#0EA5E9','#F59E0B','#10B981','#8B5CF6','#EC4899','#06B6D4','#F97316'];

const QUESTIONS = [
  {
    id: 'taco',
    q: 'Something you add to a taco when the salsa is not spicy at all',
    hint: 'Most Mexican answer first…',
    answers: [
      { text: "More salsa — the actually spicy one", survey: 52 },
      { text: "Grilled / chopped chilies", survey: 20 },
      { text: "Lime", survey: 14 },
      { text: "Pepper / Spices", survey: 8 },
      { text: "Salt", survey: 6 },
    ],
  },
  {
    id: 'date',
    q: 'Something that can go wrong on a first date',
    hint: '100 Mexicans answered…',
    answers: [
      { text: "Doesn't show up / Gets stood up", survey: 40 },
      { text: "Has no money / Won't pay the bill", survey: 25 },
      { text: "Only talks about their ex", survey: 18 },
      { text: "Boring — no conversation", survey: 10 },
      { text: "Bad breath / Messy look", survey: 7 },
    ],
  },
  {
    id: 'late',
    q: 'Classic excuse for being late or not going to work',
    hint: 'Your boss has heard it…',
    answers: [
      { text: "Sick / Not feeling well", survey: 45 },
      { text: "Flat tire / Car won't start", survey: 25 },
      { text: "Heavy traffic / Accident", survey: 15 },
      { text: "Missed the bus / train", survey: 10 },
      { text: "A relative died", survey: 5 },
    ],
  },
  {
    id: 'tourist',
    q: 'Something typical that happens to a tourist in Mexico',
    hint: '100 Mexicans have seen it…',
    answers: [
      { text: "Stomach bug / Montezuma's revenge", survey: 42 },
      { text: "Sunburn / Turning red", survey: 26 },
      { text: "Buying crafts / Souvenirs", survey: 15 },
      { text: "Taking photos of everything", survey: 10 },
      { text: "Getting lost / Not understanding the language", survey: 7 },
    ],
  },
  {
    id: 'bathroom',
    q: 'Problem that can happen when you are in the bathroom',
    hint: 'Everyone has been there…',
    answers: [
      { text: "No toilet paper", survey: 41 },
      { text: "Constipated", survey: 27 },
      { text: "No water to flush", survey: 13 },
      { text: "Toilet is clogged", survey: 10 },
      { text: "Someone knocks / opens the door", survey: 9 },
    ],
  },
];

const SFX_CFG = {
  enabled: true,
};
