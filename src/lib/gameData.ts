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
  kind: 'standard' | 'police' | 'taxi' | 'mint'
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

export const LEVELS: LevelDef[] = [
  {
    id: 1, name: 'Sunny Streets', subtitle: 'A gentle first drive through town',
    theme: 'sunny', distance: 1200, coinGoal: 8,
    trafficInterval: 1.9, obstacleInterval: 3.6, trafficSpeed: [110, 150], reward: 60,
  },
  {
    id: 2, name: 'Palm Paradise', subtitle: 'Palm trees, sunshine and busier roads',
    theme: 'palm', distance: 1600, coinGoal: 12,
    trafficInterval: 1.55, obstacleInterval: 3.1, trafficSpeed: [120, 165], reward: 90,
  },
  {
    id: 3, name: 'Desert Road', subtitle: 'Mind the cacti on the sandy highway',
    theme: 'desert', distance: 2000, coinGoal: 15,
    trafficInterval: 1.3, obstacleInterval: 2.7, trafficSpeed: [130, 180], reward: 130,
  },
  {
    id: 4, name: 'City Rush', subtitle: 'Rush hour! Weave through the traffic',
    theme: 'city', distance: 2300, coinGoal: 18,
    trafficInterval: 1.05, obstacleInterval: 2.3, trafficSpeed: [140, 195], reward: 180,
  },
  {
    id: 5, name: 'Golden Highway', subtitle: 'The big sunset finale — good luck!',
    theme: 'golden', distance: 2600, coinGoal: 24,
    trafficInterval: 0.9, obstacleInterval: 2.0, trafficSpeed: [150, 210], reward: 260,
  },
]

export interface MissionDef {
  id: string
  title: string
  description: string
  target: number
  reward: number
  metric: 'totalCoins' | 'levelsCompleted' | 'cleanFinishes' | 'bestScore' | 'totalDistance' | 'endlessBestDist' | 'ownedCars'
}

export const MISSIONS: MissionDef[] = [
  { id: 'coins50', title: 'Coin Starter', description: 'Collect 50 coins in total', target: 50, reward: 50, metric: 'totalCoins' },
  { id: 'coins300', title: 'Coin Collector', description: 'Collect 300 coins in total', target: 300, reward: 160, metric: 'totalCoins' },
  { id: 'finish1', title: 'First Finish', description: 'Complete any level', target: 1, reward: 40, metric: 'levelsCompleted' },
  { id: 'finish5', title: 'Road Regular', description: 'Complete 5 levels (replays count)', target: 5, reward: 140, metric: 'levelsCompleted' },
  { id: 'clean1', title: 'Careful Driver', description: 'Finish a level with no crashes', target: 1, reward: 120, metric: 'cleanFinishes' },
  { id: 'score4000', title: 'High Scorer', description: 'Score 4,000 points in a single run', target: 4000, reward: 150, metric: 'bestScore' },
  { id: 'endless800', title: 'Endless Explorer', description: 'Drive 800 m in one Endless run', target: 800, reward: 120, metric: 'endlessBestDist' },
  { id: 'distance12000', title: 'Long Hauler', description: 'Drive 12,000 m in total', target: 12000, reward: 220, metric: 'totalDistance' },
  { id: 'garage2', title: 'Car Collector', description: 'Own 2 different cars', target: 2, reward: 100, metric: 'ownedCars' },
]

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
  clean: boolean // no crashes and no cone bumps
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
  claimedMissions: string[]
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
    lastDaily: '',
    dailyStreak: 0,
    settings: { music: 0.55, sfx: 0.85, muted: false, vibration: true },
  }
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
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
    if (typeof s.lastDaily !== 'string') s.lastDaily = ''
    if (!isNum(s.dailyStreak) || s.dailyStreak < 0) s.dailyStreak = 0
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

export function missionProgress(m: MissionDef, save: SaveData): number {
  if (m.metric === 'ownedCars') return save.ownedCars.length
  return save.stats[m.metric]
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
