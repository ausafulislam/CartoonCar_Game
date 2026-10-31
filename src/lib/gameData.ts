/* ------------------------------------------------------------------ */
/*  Cartoon Car Adventure — game data, economy config & save system  */
/* ------------------------------------------------------------------ */

export interface CarDef {
  id: string
  name: string
  tagline: string
  price: number
  hero: string // /public path of the 3/4 hero artwork
  body: number // top-down sprite body colour (hex)
  roof: number
  kind:
    | 'standard' | 'police' | 'taxi' | 'mint'
    | 'sport' | 'van' | 'electric' | 'beetle' | 'offroad' | 'sedan' | 'racer' | 'super'
  /** Display stats 1-10 (also drive the real params below) */
  speedStat: number
  accelStat: number
  handlingStat: number
  /** Real gameplay multipliers (1 = baseline) */
  topSpeed: number
  accel: number
  handling: number
}

export const CARS: CarDef[] = [
  {
    id: 'ruby',
    name: 'Ruby',
    tagline: 'Your cheerful first ride. Balanced and friendly!',
    price: 0,
    hero: '/assets/cars/car-red-hero.png',
    body: 0xe6352b,
    roof: 0xfff3d6,
    kind: 'standard',
    speedStat: 5, accelStat: 5, handlingStat: 6,
    topSpeed: 1.0, accel: 1.0, handling: 1.0,
  },
  {
    id: 'sky',
    name: 'Officer Sky',
    tagline: 'Keeps the streets safe — and handles like a dream.',
    price: 600,
    hero: '/assets/cars/car-blue-hero.png',
    body: 0x2f9be8,
    roof: 0xffffff,
    kind: 'police',
    speedStat: 6, accelStat: 7, handlingStat: 8,
    topSpeed: 1.05, accel: 1.12, handling: 1.18,
  },
  {
    id: 'Sunny',
    name: 'Sunny Taxi',
    tagline: 'Always in a hurry, always smiling. Quick off the line!',
    price: 1200,
    hero: '/assets/cars/car-taxi-hero.png',
    body: 0xffc91f,
    roof: 0xffc91f,
    kind: 'taxi',
    speedStat: 8, accelStat: 7, handlingStat: 6,
    topSpeed: 1.13, accel: 1.08, handling: 1.05,
  },
  {
    id: 'minty',
    name: 'Minty',
    tagline: 'Cool, calm and surprisingly speedy. A real favourite.',
    price: 2000,
    hero: '/assets/cars/car-green-hero.png',
    body: 0x53d6a4,
    roof: 0xfff3d6,
    kind: 'mint',
    speedStat: 9, accelStat: 9, handlingStat: 9,
    topSpeed: 1.2, accel: 1.22, handling: 1.28,
  },
  {
    id: 'blaze',
    name: 'Blaze',
    tagline: 'Orange rocket with white racing stripes and a big spoiler.',
    price: 2800,
    hero: '/assets/cars/car-blaze-hero.png',
    body: 0xf26a0d,
    roof: 0xfff0d8,
    kind: 'sport',
    speedStat: 9, accelStat: 10, handlingStat: 7,
    topSpeed: 1.26, accel: 1.3, handling: 1.12,
  },
  {
    id: 'coco',
    name: 'Coco',
    tagline: 'A happy little camper van. Slow off the line, glued to the road.',
    price: 3600,
    hero: '/assets/cars/car-coco-hero.png',
    body: 0x74cdbc,
    roof: 0xfdf3dc,
    kind: 'van',
    speedStat: 6, accelStat: 6, handlingStat: 10,
    topSpeed: 1.1, accel: 1.06, handling: 1.46,
  },
  {
    id: 'bolt',
    name: 'Bolt',
    tagline: 'Silent electric hatch that zaps away from traffic lights.',
    price: 4500,
    hero: '/assets/cars/car-bolt-hero.png',
    body: 0xa8d94a,
    roof: 0xe8f6c8,
    kind: 'electric',
    speedStat: 9, accelStat: 10, handlingStat: 9,
    topSpeed: 1.28, accel: 1.34, handling: 1.3,
  },
  {
    id: 'bumble',
    name: 'Bumble',
    tagline: 'Buzzing yellow beetle with black stripes and a big heart.',
    price: 5600,
    hero: '/assets/cars/car-bumble-hero.png',
    body: 0xf5c518,
    roof: 0xf6d84f,
    kind: 'beetle',
    speedStat: 9, accelStat: 8, handlingStat: 10,
    topSpeed: 1.24, accel: 1.26, handling: 1.38,
  },
  {
    id: 'rocky',
    name: 'Rocky',
    tagline: 'Chunky off-roader that shrugs off potholes like pebbles.',
    price: 6800,
    hero: '/assets/cars/car-rocky-hero.png',
    body: 0x2f9c93,
    roof: 0xd9c39a,
    kind: 'offroad',
    speedStat: 9, accelStat: 8, handlingStat: 10,
    topSpeed: 1.32, accel: 1.24, handling: 1.42,
  },
  {
    id: 'comet',
    name: 'Comet',
    tagline: 'Pearl-white luxury sedan with gold trim and effortless glide.',
    price: 8000,
    hero: '/assets/cars/car-comet-hero.png',
    body: 0xf2e8d8,
    roof: 0xcdb489,
    kind: 'sedan',
    speedStat: 9, accelStat: 9, handlingStat: 9,
    topSpeed: 1.36, accel: 1.3, handling: 1.34,
  },
  {
    id: 'apex',
    name: 'Apex',
    tagline: 'Black track weapon with a huge wing and neon cyan lines.',
    price: 10000,
    hero: '/assets/cars/car-apex-hero.png',
    body: 0x23262d,
    roof: 0x111318,
    kind: 'racer',
    speedStat: 10, accelStat: 10, handlingStat: 9,
    topSpeed: 1.42, accel: 1.38, handling: 1.3,
  },
  {
    id: 'nova',
    name: 'Nova',
    tagline: 'The glowing futuristic champion. Fastest car in the game!',
    price: 12000,
    hero: '/assets/cars/car-nova-hero.png',
    body: 0x9d7bf0,
    roof: 0x5be0f0,
    kind: 'super',
    speedStat: 10, accelStat: 10, handlingStat: 10,
    topSpeed: 1.48, accel: 1.44, handling: 1.5,
  },
]

export type UpgradeId = 'magnet' | 'shield' | 'tires'

export interface UpgradeDef {
  id: UpgradeId
  name: string
  description: string
  price: number
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'magnet',
    name: 'Coin Magnet',
    description: 'Nearby coins fly straight to your car while driving.',
    price: 400,
  },
  {
    id: 'shield',
    name: 'Safety Shield',
    description: 'Absorbs the first crash in every run. Phew!',
    price: 500,
  },
  {
    id: 'tires',
    name: 'Turbo Tires',
    description: 'Permanent +8% top speed and +8% steering on every car.',
    price: 700,
  },
]

export type ThemeId = 'sunny' | 'palm' | 'desert' | 'city' | 'golden'

export interface LevelDef {
  id: number
  name: string
  subtitle: string
  theme: ThemeId
  /** metres to drive to finish */
  distance: number
  /** coins needed for the coin star */
  coinGoal: number
  /** seconds between traffic spawns at boost x1 (lower = denser) */
  trafficInterval: number
  /** seconds between obstacle spawns */
  obstacleInterval: number
  /** traffic own-speed range px/s */
  trafficSpeed: [number, number]
  /** completion reward before boost multiplier */
  reward: number
}

/* ------------------------------------------------------------------ */
/*  50 levels — themed runs that get longer, denser and faster.       */
/*  Blueprints hold the flavour; the numbers scale from the level id  */
/*  so the whole campaign stays in one place and impossible to drift. */
/* ------------------------------------------------------------------ */

interface LevelBlueprint {
  name: string
  subtitle: string
  theme: ThemeId
}

const LEVEL_BLUEPRINTS: LevelBlueprint[] = [
  { name: 'Sunny Streets', subtitle: 'A gentle first drive through town', theme: 'sunny' },
  { name: 'Palm Paradise', subtitle: 'Palm trees, sunshine and busier roads', theme: 'palm' },
  { name: 'Desert Road', subtitle: 'Mind the cacti on the sandy highway', theme: 'desert' },
  { name: 'City Rush', subtitle: 'Rush hour! Weave through the traffic', theme: 'city' },
  { name: 'Golden Highway', subtitle: 'Sunset cruising on the golden highway', theme: 'golden' },

  { name: 'Breezy Avenue', subtitle: 'A fresh morning drive past the park', theme: 'sunny' },
  { name: 'Coconut Coast', subtitle: 'Seaside turns with a salty breeze', theme: 'palm' },
  { name: 'Dune Dash', subtitle: 'Rolling dunes and quick little detours', theme: 'desert' },
  { name: 'Downtown Dash', subtitle: 'Shortcuts through the busy centre', theme: 'city' },
  { name: 'Sunset Strip', subtitle: 'Golden light and heavier traffic', theme: 'golden' },

  { name: 'Meadow Mile', subtitle: 'Green fields, gentle hills, happy engine', theme: 'sunny' },
  { name: 'Lagoon Loop', subtitle: 'A looping road around the blue lagoon', theme: 'palm' },
  { name: 'Cactus Canyon', subtitle: 'Cacti on both sides — stay sharp', theme: 'desert' },
  { name: 'Neon Boulevard', subtitle: 'Bright signs and fast lanes', theme: 'city' },
  { name: 'Amber Ascent', subtitle: 'Climbing toward the amber sky', theme: 'golden' },

  { name: 'Suburban Sprint', subtitle: 'Quiet streets that get busy fast', theme: 'sunny' },
  { name: 'Tropical Trail', subtitle: 'Humid air and tight palm corners', theme: 'palm' },
  { name: 'Dusty Detour', subtitle: 'Sand in the air and rocks on the road', theme: 'desert' },
  { name: 'Midtown Madness', subtitle: 'Non-stop traffic through midtown', theme: 'city' },
  { name: 'Honey Horizon', subtitle: 'The horizon glows honey gold', theme: 'golden' },

  { name: 'Picnic Parkway', subtitle: 'Sunday drivers everywhere!', theme: 'sunny' },
  { name: 'Island Interstate', subtitle: 'A long coastal highway at full tilt', theme: 'palm' },
  { name: 'Mirage Mile', subtitle: 'Is that a road ahead — or a mirage?', theme: 'desert' },
  { name: 'Skyline Sprint', subtitle: 'Skyscrapers flash by as you sprint', theme: 'city' },
  { name: 'Copper Canyon', subtitle: 'Halfway there — copper sunset run', theme: 'golden' },

  { name: 'Garden Grove', subtitle: 'Blossoms, birds and brake lights', theme: 'sunny' },
  { name: 'Turquoise Turnpike', subtitle: 'Clear water, clear road... mostly', theme: 'palm' },
  { name: 'Scorpion Stretch', subtitle: 'The desert shows no mercy now', theme: 'desert' },
  { name: 'Uptown Unwind', subtitle: 'Uptown traffic never truly unwinds', theme: 'city' },
  { name: 'Golden Gauntlet', subtitle: 'Thirty levels in — bring your best', theme: 'golden' },

  { name: 'Riverside Run', subtitle: 'Follow the river as it winds along', theme: 'sunny' },
  { name: 'Banyan Boulevard', subtitle: 'Giant trees shade a twisting road', theme: 'palm' },
  { name: 'Dry Creek Dash', subtitle: 'Dust clouds and sudden rock falls', theme: 'desert' },
  { name: 'Metropolis Marathon', subtitle: 'A full city circuit without a break', theme: 'city' },
  { name: 'Sunset Stampede', subtitle: 'Traffic stampedes into the sunset', theme: 'golden' },

  { name: 'Willow Way', subtitle: 'Soft willows, hard corners', theme: 'sunny' },
  { name: 'Coral Cove', subtitle: 'Coral pink skies over the coast road', theme: 'palm' },
  { name: 'Rattlesnake Road', subtitle: 'This one really does bite', theme: 'desert' },
  { name: 'Gridlock Gauntlet', subtitle: 'Every lane is packed — thread it', theme: 'city' },
  { name: 'Amber Avenue', subtitle: 'The glowing street of amber chance', theme: 'golden' },

  { name: 'Clover Canyon', subtitle: 'Four-leaf luck is your best ally', theme: 'sunny' },
  { name: 'Sailfin Straight', subtitle: 'A flat-out blast along the shoreline', theme: 'palm' },
  { name: 'Sandstorm Sprint', subtitle: 'Visibility down — reactions up', theme: 'desert' },
  { name: 'Skybridge Sprint', subtitle: 'High above the city, no room for error', theme: 'city' },
  { name: 'Ember Express', subtitle: 'Sparks in the air on the ember road', theme: 'golden' },

  { name: 'Orchard Overpass', subtitle: 'Overpasses loop over the orchards', theme: 'sunny' },
  { name: 'Palmy Pinnacle', subtitle: 'The hardest palm run in the game', theme: 'palm' },
  { name: 'Dust Devil Drive', subtitle: 'Whirling sand and no second chances', theme: 'desert' },
  { name: 'Concrete Canyon', subtitle: 'The final city test before the big one', theme: 'city' },
  { name: "Champion's Highway", subtitle: 'The legendary last run — go get it!', theme: 'golden' },
]

const round2 = (n: number) => Math.round(n * 100) / 100

export const LEVELS: LevelDef[] = LEVEL_BLUEPRINTS.map((bp, index) => {
  const id = index + 1
  const step = id - 1
  const distance = 1200 + step * 120 // 1,200 m → 7,080 m
  return {
    id,
    name: bp.name,
    subtitle: bp.subtitle,
    theme: bp.theme,
    distance,
    coinGoal: Math.max(8, Math.round(distance / 145)),
    trafficInterval: round2(Math.max(0.55, 1.9 - step * 0.0275)),
    obstacleInterval: round2(Math.max(0.8, 3.6 - step * 0.057)),
    trafficSpeed: [Math.round(110 + step * 2), Math.round(150 + step * 2.6)],
    reward: Math.round(60 + step * 18),
  }
})

export const LEVEL_COUNT = LEVELS.length

/* ------------------------------------------------------------------ */
/*  Daily missions — three fresh missions every day, reset at         */
/*  local midnight (same rollover the daily reward uses).             */
/* ------------------------------------------------------------------ */

export type MissionMetric =
  | 'coins' | 'levels' | 'clean' | 'distance' | 'runs' | 'bestScore' | 'endlessDist'

export interface MissionDef {
  id: string
  title: string
  description: string
  target: number
  reward: number
  metric: MissionMetric
}

/** Pool the daily selection is drawn from. Targets are reachable in one day. */
export const DAILY_MISSION_POOL: MissionDef[] = [
  { id: 'coins100', title: 'Coin Run', description: 'Collect 100 coins today', target: 100, reward: 80, metric: 'coins' },
  { id: 'coins250', title: 'Coin Hunter', description: 'Collect 250 coins today', target: 250, reward: 160, metric: 'coins' },
  { id: 'finish1', title: 'First Finish', description: 'Complete any level today', target: 1, reward: 60, metric: 'levels' },
  { id: 'finish3', title: 'Road Regular', description: 'Complete 3 levels today (replays count)', target: 3, reward: 150, metric: 'levels' },
  { id: 'clean1', title: 'Careful Driver', description: 'Finish a level with no crashes today', target: 1, reward: 100, metric: 'clean' },
  { id: 'clean2', title: 'Spotless', description: 'Finish 2 crash-free levels today', target: 2, reward: 180, metric: 'clean' },
  { id: 'distance2000', title: 'Day Tripper', description: 'Drive 2,000 m today', target: 2000, reward: 90, metric: 'distance' },
  { id: 'distance5000', title: 'Long Hauler', description: 'Drive 5,000 m today', target: 5000, reward: 180, metric: 'distance' },
  { id: 'runs3', title: 'Warm Up', description: 'Start 3 runs today', target: 3, reward: 70, metric: 'runs' },
  { id: 'runs6', title: 'Petrol Head', description: 'Start 6 runs today', target: 6, reward: 140, metric: 'runs' },
  { id: 'score3000', title: 'High Scorer', description: 'Score 3,000 points in a single run today', target: 3000, reward: 120, metric: 'bestScore' },
  { id: 'score6000', title: 'Score Machine', description: 'Score 6,000 points in a single run today', target: 6000, reward: 200, metric: 'bestScore' },
  { id: 'endless600', title: 'Endless Explorer', description: 'Drive 600 m in one Endless run today', target: 600, reward: 110, metric: 'endlessDist' },
  { id: 'endless1200', title: 'Endless Legend', description: 'Drive 1,200 m in one Endless run today', target: 1200, reward: 190, metric: 'endlessDist' },
]

/** How many missions are offered per day. */
export const DAILY_MISSION_COUNT = 3

const MISSION_METRICS: MissionMetric[] = ['coins', 'levels', 'clean', 'distance', 'runs', 'bestScore', 'endlessDist']

/** Small deterministic PRNG so the same date always gives the same missions. */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Today's missions. Deterministic for a given date key (yyyy-mm-dd), so the
 * list stays identical while the day lasts and changes at midnight.
 */
export function missionsForDay(day = todayKey()): MissionDef[] {
  const rnd = seededRandom(hashString(day))
  const metrics = [...MISSION_METRICS]
  // Fisher–Yates with the seeded PRNG
  for (let i = metrics.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[metrics[i], metrics[j]] = [metrics[j], metrics[i]]
  }
  return metrics.slice(0, DAILY_MISSION_COUNT).map((metric) => {
    const options = DAILY_MISSION_POOL.filter((m) => m.metric === metric)
    return options[Math.floor(rnd() * options.length)]
  })
}

export const DAILY_REWARDS = [50, 75, 100, 125, 150, 200, 300]

export const MAX_HEARTS = 5
export const HEART_REGEN_MS = 90_000 // one heart every 90 seconds
export const HEART_PRICE = 50 // coins per heart in the hearts modal
export const MILESTONE_EVERY = 250 // lifetime coins per treasure milestone
export const MILESTONE_REWARD = 75

export interface RunResult {
  endless: boolean
  levelId: number | null
  success: boolean
  coins: number // coins collected during the run
  score: number
  distance: number // metres
  hits: number // crashes
  clean: boolean // no crashes and no pit hits
  boost: number
}

export interface LevelRecord {
  stars: number
  bestScore: number
}

export interface SaveData {
  version: 1
  coins: number
  hearts: number
  heartsUpdatedAt: number
  unlockedLevel: number
  records: Record<number, LevelRecord>
  ownedCars: string[]
  selectedCar: string
  upgrades: Record<UpgradeId, boolean>
  boost: number // 1 | 2 | 3
  milestonesClaimed: number
  stats: {
    totalCoins: number
    levelsCompleted: number
    bestScore: number
    endlessBest: number
    endlessBestDist: number
    cleanFinishes: number
    totalDistance: number
    runs: number
  }
  /** Ids claimed from today's mission set (cleared at the daily reset). */
  claimedMissions: string[]
  /** yyyy-mm-dd the current daily missions + progress belong to. */
  missionDay: string
  /** Today's mission progress — zeroed at every daily reset. */
  dailyStats: {
    coins: number
    levels: number
    clean: number
    distance: number
    runs: number
    bestScore: number
    endlessDist: number
  }
  lastDaily: string // yyyy-mm-dd or ''
  dailyStreak: number
  settings: {
    music: number // 0..1
    sfx: number // 0..1
    muted: boolean
    vibration: boolean
  }
}

const SAVE_KEY = 'cartoon-car-adventure-save-v1'

export function defaultSave(): SaveData {
  return {
    version: 1,
    coins: 250,
    hearts: MAX_HEARTS,
    heartsUpdatedAt: Date.now(),
    unlockedLevel: 1,
    records: {},
    ownedCars: ['ruby'],
    selectedCar: 'ruby',
    upgrades: { magnet: false, shield: false, tires: false },
    boost: 1,
    milestonesClaimed: 0,
    stats: {
      totalCoins: 0,
      levelsCompleted: 0,
      bestScore: 0,
      endlessBest: 0,
      endlessBestDist: 0,
      cleanFinishes: 0,
      totalDistance: 0,
      runs: 0,
    },
    claimedMissions: [],
    missionDay: todayKey(),
    dailyStats: { coins: 0, levels: 0, clean: 0, distance: 0, runs: 0, bestScore: 0, endlessDist: 0 },
    lastDaily: '',
    dailyStreak: 0,
    settings: { music: 0.55, sfx: 0.85, muted: false, vibration: true },
  }
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function isDayKey(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
}

/** Load + validate the save. Corrupt/missing data falls back to safe defaults. */
export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return defaultSave()
    const parsed = JSON.parse(raw) as Partial<SaveData>
    const d = defaultSave()
    const s: SaveData = { ...d, ...parsed, version: 1 }
    if (!isNum(s.coins) || s.coins < 0) s.coins = d.coins
    s.coins = Math.floor(s.coins)
    if (!isNum(s.hearts)) s.hearts = MAX_HEARTS
    s.hearts = Math.max(0, Math.min(MAX_HEARTS, Math.floor(s.hearts)))
    if (!isNum(s.heartsUpdatedAt)) s.heartsUpdatedAt = Date.now()
    if (!isNum(s.unlockedLevel)) s.unlockedLevel = 1
    s.unlockedLevel = Math.max(1, Math.min(LEVELS.length, Math.floor(s.unlockedLevel)))
    if (!s.records || typeof s.records !== 'object') s.records = {}
    const validCarIds = new Set(CARS.map((c) => c.id))
    if (!Array.isArray(s.ownedCars)) s.ownedCars = ['ruby']
    s.ownedCars = [...new Set(s.ownedCars.filter((id) => validCarIds.has(id)))]
    if (!s.ownedCars.includes('ruby')) s.ownedCars.unshift('ruby')
    if (!validCarIds.has(s.selectedCar) || !s.ownedCars.includes(s.selectedCar)) {
      s.selectedCar = s.ownedCars[0]
    }
    s.upgrades = {
      magnet: !!parsed.upgrades?.magnet,
      shield: !!parsed.upgrades?.shield,
      tires: !!parsed.upgrades?.tires,
    }
    if (![1, 2, 3].includes(s.boost)) s.boost = 1
    if (!isNum(s.milestonesClaimed) || s.milestonesClaimed < 0) s.milestonesClaimed = 0
    const st = { ...d.stats, ...(parsed.stats ?? {}) }
    ;(Object.keys(st) as (keyof SaveData['stats'])[]).forEach((k) => {
      if (!isNum(st[k]) || st[k] < 0) st[k] = 0
      st[k] = Math.floor(st[k])
    })
    s.stats = st
    if (!Array.isArray(s.claimedMissions)) s.claimedMissions = []
    s.claimedMissions = s.claimedMissions.filter((id): id is string => typeof id === 'string')
    // Saves from before daily missions have no missionDay: treat them as a new
    // day so the (legacy, now invalid) claim ids are cleared.
    s.missionDay = isDayKey(parsed.missionDay) ? parsed.missionDay : ''
    const ds = { ...d.dailyStats, ...(parsed.dailyStats ?? {}) }
    ;(Object.keys(ds) as (keyof SaveData['dailyStats'])[]).forEach((k) => {
      if (!isNum(ds[k]) || ds[k] < 0) ds[k] = 0
      ds[k] = Math.floor(ds[k])
    })
    s.dailyStats = ds
    if (typeof s.lastDaily !== 'string') s.lastDaily = ''
    if (!isNum(s.dailyStreak) || s.dailyStreak < 0) s.dailyStreak = 0
    // New day (or an old save without daily missions): fresh set + zeroed progress
    rolloverDaily(s)
    const set = { ...d.settings, ...(parsed.settings ?? {}) }
    set.music = isNum(set.music) ? Math.max(0, Math.min(1, set.music)) : d.settings.music
    set.sfx = isNum(set.sfx) ? Math.max(0, Math.min(1, set.sfx)) : d.settings.sfx
    set.muted = !!set.muted
    set.vibration = set.vibration !== false
    s.settings = set
    return applyHeartRegen(s)
  } catch {
    return defaultSave()
  }
}

export function persistSave(save: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save))
  } catch {
    /* storage unavailable (private mode etc.) — game still works in-memory */
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    /* ignore */
  }
}

/** Add regenerated hearts based on elapsed time. Mutates and returns the save. */
export function applyHeartRegen(save: SaveData, now = Date.now()): SaveData {
  if (save.hearts >= MAX_HEARTS) {
    save.hearts = MAX_HEARTS
    save.heartsUpdatedAt = now
    return save
  }
  const gained = Math.floor((now - save.heartsUpdatedAt) / HEART_REGEN_MS)
  if (gained > 0) {
    save.hearts = Math.min(MAX_HEARTS, save.hearts + gained)
    save.heartsUpdatedAt =
      save.hearts >= MAX_HEARTS ? now : save.heartsUpdatedAt + gained * HEART_REGEN_MS
  }
  return save
}

/** ms until the next heart regenerates (0 when full). */
export function msToNextHeart(save: SaveData, now = Date.now()): number {
  if (save.hearts >= MAX_HEARTS) return 0
  const elapsed = (now - save.heartsUpdatedAt) % HEART_REGEN_MS
  return Math.max(0, HEART_REGEN_MS - elapsed)
}

export function getCar(id: string): CarDef {
  return CARS.find((c) => c.id === id) ?? CARS[0]
}

export function getLevel(id: number): LevelDef {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0]
}

/**
 * Reset the daily mission set progress when the local calendar day changes.
 * Mutates the save and reports whether anything was reset.
 */
export function rolloverDaily(save: SaveData, now = Date.now()): boolean {
  const today = todayKey(new Date(now))
  if (save.missionDay === today) return false
  save.missionDay = today
  save.claimedMissions = []
  save.dailyStats = { coins: 0, levels: 0, clean: 0, distance: 0, runs: 0, bestScore: 0, endlessDist: 0 }
  return true
}

export function dailyMissionProgress(m: MissionDef, save: SaveData): number {
  return save.dailyStats[m.metric] ?? 0
}

/** Milliseconds until the daily missions & daily reward reset (local midnight). */
export function msToDailyReset(now = Date.now()): number {
  const next = new Date(now)
  next.setHours(24, 0, 0, 0)
  return Math.max(0, next.getTime() - now)
}

/** "5h 12m" / "12m" / "45s" — compact countdown for the reset label. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  if (m > 0) return `${m}m ${String(total % 60).padStart(2, '0')}s`
  return `${total}s`
}

export function totalStars(save: SaveData): number {
  return Object.values(save.records).reduce((sum, r) => sum + (r?.stars ?? 0), 0)
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function canClaimDaily(save: SaveData): boolean {
  return save.lastDaily !== todayKey()
}

/** Stars for a finished level run: finish + coin goal + clean driving. */
export function starsForRun(level: LevelDef, r: RunResult): number {
  if (!r.success) return 0
  let stars = 1
  if (r.coins >= level.coinGoal) stars += 1
  if (r.clean) stars += 1
  return stars
}

export function fmt(n: number): string {
  return Math.floor(n).toLocaleString('en-US')
}
