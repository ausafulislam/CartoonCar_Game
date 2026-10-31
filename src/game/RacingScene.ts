import Phaser from 'phaser'
import type { CarDef, LevelDef, RunResult, ThemeId } from '../lib/gameData'
import { drawCarTexture, shade } from './carTexture'

export interface TouchInput {
  left: boolean
  right: boolean
  up: boolean
  down: boolean
}

export interface HudState {
  state: 'countdown' | 'playing' | 'finished'
  kmh: number
  speedNorm: number
  distance: number
  target: number | null
  coins: number
  score: number
  hits: number
  maxHits: number
  shield: boolean
}

export type SceneEvent =
  | 'coin' | 'crash' | 'bump' | 'shield' | 'nearMiss'
  | 'beep' | 'go' | 'win' | 'lose' | 'pauseKey'

export interface RacingOptions {
  level: LevelDef | null // null = endless
  endlessLevel: LevelDef // base config used for endless pacing/themes
  car: CarDef
  boost: number
  magnet: boolean
  shield: boolean
  tires: boolean
  input: TouchInput
  onHud: (h: HudState) => void
  onEvent: (e: SceneEvent) => void
  onFinish: (r: RunResult) => void
  onReady: (api: RacingApi) => void
}

export interface RacingApi {
  setPaused: (paused: boolean) => void
  restart: () => void
}

const W = 450
const H = 800
const ROAD_LEFT = 58
const ROAD_RIGHT = 392
const LANE_W = (ROAD_RIGHT - ROAD_LEFT) / 4
const PLAYER_Y = 604 // sits clear of the touch control deck
const MAX_HITS = 3

const laneCenter = (i: number) => ROAD_LEFT + LANE_W * (i + 0.5)

interface ThemeDef {
  side: number
  speckle: number
  sidewalk: number
  asphalt: number
  scenery: string[]
}

const THEMES: Record<ThemeId, ThemeDef> = {
  sunny: { side: 0x6fc24e, speckle: 0x5da843, sidewalk: 0xf2d8a7, asphalt: 0x5b6675, scenery: ['tree', 'palm', 'lamp', 'tree'] },
  palm: { side: 0x5abc4f, speckle: 0x4da344, sidewalk: 0xf7e3ae, asphalt: 0x5b6675, scenery: ['palm', 'palm', 'tree', 'lamp'] },
  desert: { side: 0xeed189, speckle: 0xe0bd6d, sidewalk: 0xe6c078, asphalt: 0x6b6259, scenery: ['cactus', 'rock', 'cactus', 'rock'] },
  city: { side: 0xb9c0cc, speckle: 0xa7b0bf, sidewalk: 0xdde3ee, asphalt: 0x4d5566, scenery: ['building', 'lamp', 'building', 'tree'] },
  golden: { side: 0xe8a75c, speckle: 0xd98f45, sidewalk: 0xf7cf8f, asphalt: 0x5d5766, scenery: ['palm', 'tree', 'lamp', 'rock'] },
}

const TRAFFIC_COLORS: [number, number][] = [
  [0x3e9be9, 0xffffff],
  [0xff8a3d, 0xfff3d6],
  [0x9b6bff, 0xffffff],
  [0x38c172, 0xfff3d6],
  [0xff5d8f, 0xffffff],
  [0xf5f6fa, 0xdfe6f2],
]

class RacingScene extends Phaser.Scene {
  private opts: RacingOptions
  private state: 'countdown' | 'playing' | 'finished' = 'countdown'
  private cfg!: LevelDef
  private theme!: ThemeDef

  private road!: Phaser.GameObjects.TileSprite
  private player!: Phaser.Physics.Arcade.Sprite
  private shieldRing!: Phaser.GameObjects.Arc
  private traffic!: Phaser.Physics.Arcade.Group
  private coinsGroup!: Phaser.Physics.Arcade.Group
  private obstacles!: Phaser.Physics.Arcade.Group
  private scenery: Phaser.GameObjects.Image[] = []
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private keyA!: Phaser.Input.Keyboard.Key
  private keyD!: Phaser.Input.Keyboard.Key
  private keyW!: Phaser.Input.Keyboard.Key
  private keyS!: Phaser.Input.Keyboard.Key
  private countText!: Phaser.GameObjects.Text

  private speed = 0
  private tilt = 0
  private distance = 0
  private coinsCollected = 0
  private nearMisses = 0
  private hits = 0
  private clean = true
  private hasShield = false
  private invulnerableUntil = 0
  private elapsed = 0
  private finishSent = false

  private trafficTimer = 0
  private coinTimer = 0
  private obstacleTimer = 0
  private sceneryTimer = 0
  private hudTimer = 0
  private lastLane = -1

  constructor(opts: RacingOptions) {
    super('RacingScene')
    this.opts = opts
  }

  /* --------------------------- textures --------------------------- */
  private makeCarTexture(
    key: string,
    body: number,
    roof: number,
    kind: CarDef['kind'] | 'traffic' | 'truck',
  ): void {
    if (this.textures.exists(key)) return
    const g = this.add.graphics()
    const { width, height } = drawCarTexture(g, body, roof, kind)
    g.generateTexture(key, width, height)
    g.destroy()
  }

  private makeSmallTextures(): void {
    if (!this.textures.exists('coin')) {
      const g = this.add.graphics()
      g.fillStyle(0x000000, 0.18)
      g.fillCircle(18, 20, 14)
      g.fillStyle(0xffb020, 1)
      g.fillCircle(18, 18, 15)
      g.fillStyle(0xffc91f, 1)
      g.fillCircle(18, 18, 13)
      g.fillStyle(0xffdf6b, 1)
      g.fillCircle(18, 18, 9.5)
      // star
      const pts: { x: number; y: number }[] = []
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 6.4 : 2.8
        const a = (Math.PI / 5) * i - Math.PI / 2
        pts.push({ x: 18 + Math.cos(a) * r, y: 18 + Math.sin(a) * r })
      }
      g.fillStyle(0xff9d00, 1)
      g.fillPoints(pts, true)
      g.fillStyle(0xffffff, 0.75)
      g.fillCircle(13, 12, 3)
      g.generateTexture('coin', 36, 36)
      g.destroy()
    }
    if (!this.textures.exists('cone')) {
      const g = this.add.graphics()
      g.fillStyle(0x000000, 0.18)
      g.fillEllipse(20, 40, 34, 9)
      g.fillStyle(0xc2511f, 1)
      g.fillRoundedRect(4, 34, 32, 8, 3)
      g.fillStyle(0xff6a26, 1)
      g.fillTriangle(20, 2, 8, 36, 32, 36)
      g.fillStyle(0xffffff, 1)
      g.fillPoints(
        [
          { x: 14.5, y: 20 },
          { x: 25.5, y: 20 },
          { x: 28, y: 27 },
          { x: 12, y: 27 },
        ],
        true,
      )
      g.generateTexture('cone', 40, 44)
      g.destroy()
    }
    if (!this.textures.exists('barrier')) {
      const g = this.add.graphics()
      g.fillStyle(0x000000, 0.16)
      g.fillEllipse(44, 32, 80, 9)
      g.fillStyle(0x8a93a3, 1)
      g.fillRect(6, 12, 7, 20)
      g.fillRect(75, 12, 7, 20)
      g.fillStyle(0xf4f6fa, 1)
      g.fillRoundedRect(2, 2, 84, 20, 5)
      g.lineStyle(2, 0xb9c2d1, 1)
      g.strokeRoundedRect(2, 2, 84, 20, 5)
      g.fillStyle(0xe6352b, 1)
      for (let i = 0; i < 4; i++) {
        const x = 8 + i * 21
        g.fillPoints(
          [
            { x, y: 20 },
            { x: x + 9, y: 4 },
            { x: x + 17, y: 4 },
            { x: x + 8, y: 20 },
          ],
          true,
        )
      }
      g.generateTexture('barrier', 88, 36)
      g.destroy()
    }
    if (!this.textures.exists('spark')) {
      const g = this.add.graphics()
      g.fillStyle(0xffffff, 1)
      g.fillCircle(8, 8, 7)
      g.generateTexture('spark', 16, 16)
      g.destroy()
    }
    if (!this.textures.exists('tree')) {
      const g = this.add.graphics()
      g.fillStyle(0x000000, 0.15)
      g.fillEllipse(35, 62, 46, 12)
      g.fillStyle(0x8a5a33, 1)
      g.fillRoundedRect(31, 40, 8, 24, 3)
      g.fillStyle(0x3da33f, 1)
      g.fillCircle(35, 26, 21)
      g.fillStyle(0x4cb84e, 1)
      g.fillCircle(22, 36, 14)
      g.fillCircle(48, 36, 14)
      g.fillStyle(0x6fce62, 1)
      g.fillCircle(29, 20, 8)
      g.generateTexture('tree', 70, 70)
      g.destroy()
    }
    if (!this.textures.exists('palm')) {
      const g = this.add.graphics()
      g.fillStyle(0x000000, 0.15)
      g.fillEllipse(45, 82, 52, 12)
      g.lineStyle(9, 0xa06a3b, 1)
      g.beginPath()
      g.moveTo(38, 84)
      g.lineTo(46, 44)
      g.strokePath()
      g.lineStyle(7, 0x35a852, 1)
      const fronds: [number, number][] = [[8, 26], [24, 12], [48, 8], [70, 14], [84, 30], [76, 44]]
      fronds.forEach(([x, y]) => {
        g.beginPath()
        g.moveTo(47, 42)
        g.lineTo(x, y)
        g.strokePath()
      })
      g.fillStyle(0x2f9e4f, 1)
      g.fillCircle(47, 42, 9)
      g.fillStyle(0x8a5a33, 1)
      g.fillCircle(41, 48, 5)
      g.fillCircle(53, 48, 5)
      g.generateTexture('palm', 90, 90)
      g.destroy()
    }
    if (!this.textures.exists('cactus')) {
      const g = this.add.graphics()
      g.fillStyle(0x000000, 0.15)
      g.fillEllipse(22, 66, 34, 9)
      g.fillStyle(0x2f9e5f, 1)
      g.fillRoundedRect(16, 6, 13, 60, 7)
      g.fillRoundedRect(2, 26, 10, 22, 5)
      g.fillRoundedRect(32, 20, 10, 26, 5)
      g.fillStyle(0x4cc97a, 1)
      g.fillRoundedRect(19, 10, 4, 50, 2)
      g.fillStyle(0xff8fb3, 1)
      g.fillCircle(22, 6, 4)
      g.generateTexture('cactus', 44, 70)
      g.destroy()
    }
    if (!this.textures.exists('rock')) {
      const g = this.add.graphics()
      g.fillStyle(0x000000, 0.15)
      g.fillEllipse(28, 44, 48, 11)
      g.fillStyle(0x9aa3ad, 1)
      g.fillPoints(
        [
          { x: 6, y: 42 }, { x: 12, y: 22 }, { x: 28, y: 10 },
          { x: 44, y: 18 }, { x: 50, y: 42 },
        ],
        true,
      )
      g.fillStyle(0xb7c0c9, 1)
      g.fillPoints([{ x: 14, y: 30 }, { x: 28, y: 14 }, { x: 38, y: 24 }, { x: 26, y: 32 }], true)
      g.generateTexture('rock', 56, 50)
      g.destroy()
    }
    if (!this.textures.exists('lamp')) {
      const g = this.add.graphics()
      g.fillStyle(0x000000, 0.15)
      g.fillEllipse(15, 64, 24, 8)
      g.fillStyle(0x5a6577, 1)
      g.fillRoundedRect(12, 18, 6, 46, 3)
      g.fillStyle(0xffdf6b, 0.35)
      g.fillCircle(15, 13, 13)
      g.fillStyle(0xfff2b0, 1)
      g.fillCircle(15, 13, 7)
      g.fillStyle(0x37404e, 1)
      g.fillRoundedRect(8, 2, 14, 6, 3)
      g.generateTexture('lamp', 30, 68)
      g.destroy()
    }
    if (!this.textures.exists('building')) {
      const g = this.add.graphics()
      g.fillStyle(0x000000, 0.16)
      g.fillEllipse(45, 104, 80, 13)
      g.fillStyle(0xe8ecf2, 1)
      g.fillRoundedRect(4, 4, 82, 100, 10)
      g.fillStyle(0xffffff, 1)
      g.fillRoundedRect(12, 12, 66, 84, 8)
      g.fillStyle(0xd4dbe6, 1)
      g.fillRoundedRect(20, 20, 20, 20, 5)
      g.fillRoundedRect(50, 20, 20, 20, 5)
      g.fillRoundedRect(20, 50, 20, 20, 5)
      g.fillRoundedRect(50, 50, 20, 20, 5)
      g.fillStyle(0xb9c6d8, 1)
      g.fillRoundedRect(36, 82, 18, 20, 4)
      g.generateTexture('building', 90, 110)
      g.destroy()
    }
  }

  private makeRoadTexture(themeId: ThemeId): string {
    const key = `road-${themeId}`
    if (this.textures.exists(key)) return key
    const t = THEMES[themeId]
    const g = this.add.graphics()
    const tileH = 256
    g.fillStyle(t.side, 1)
    g.fillRect(0, 0, W, tileH)
    // side speckles (deterministic pattern)
    g.fillStyle(t.speckle, 0.5)
    for (let i = 0; i < 26; i++) {
      const x = (i * 67) % W
      const y = (i * 41) % tileH
      if (x < ROAD_LEFT - 14 || x > ROAD_RIGHT + 14) g.fillCircle(x, y, 3 + (i % 3))
    }
    // sidewalks
    g.fillStyle(t.sidewalk, 1)
    g.fillRect(ROAD_LEFT - 18, 0, 18, tileH)
    g.fillRect(ROAD_RIGHT, 0, 18, tileH)
    g.lineStyle(2, shade(t.sidewalk, -14), 0.8)
    for (let y = 0; y <= tileH; y += 42) {
      g.lineBetween(ROAD_LEFT - 18, y, ROAD_LEFT, y)
      g.lineBetween(ROAD_RIGHT, y, ROAD_RIGHT + 18, y)
    }
    // asphalt
    g.fillStyle(t.asphalt, 1)
    g.fillRect(ROAD_LEFT, 0, ROAD_RIGHT - ROAD_LEFT, tileH)
    g.fillStyle(0xffffff, 0.05)
    for (let i = 0; i < 18; i++) {
      g.fillCircle(ROAD_LEFT + ((i * 97) % (ROAD_RIGHT - ROAD_LEFT)), (i * 53) % tileH, 2.2)
    }
    // edge lines (red/white kerb hint + white line)
    g.fillStyle(0xffffff, 0.92)
    g.fillRect(ROAD_LEFT + 3, 0, 5, tileH)
    g.fillRect(ROAD_RIGHT - 8, 0, 5, tileH)
    // lane dashes
    g.fillStyle(0xffe9a8, 0.95)
    for (let lane = 1; lane < 4; lane++) {
      const x = ROAD_LEFT + LANE_W * lane - 3
      g.fillRoundedRect(x, 14, 6, 46, 3)
      g.fillRoundedRect(x, 142, 6, 46, 3)
    }
    g.generateTexture(key, W, tileH)
    g.destroy()
    return key
  }

  /* ----------------------------- lifecycle ----------------------------- */
  create(): void {
    const o = this.opts
    this.cfg = o.level ?? o.endlessLevel
    this.theme = THEMES[this.cfg.theme]

    // reset run state (scene restarts reuse this instance)
    this.state = 'countdown'
    this.speed = 0
    this.distance = 0
    this.tilt = 0
    this.coinsCollected = 0
    this.nearMisses = 0
    this.hits = 0
    this.clean = true
    this.hasShield = o.shield
    this.invulnerableUntil = 0
    this.elapsed = 0
    this.finishSent = false
    this.trafficTimer = 1.1
    this.coinTimer = 0.7
    this.obstacleTimer = 2.4
    this.sceneryTimer = 0
    this.hudTimer = 0
    this.lastLane = -1
    this.scenery = []

    // textures
    this.makeCarTexture('player-car', o.car.body, o.car.roof, o.car.kind)
    TRAFFIC_COLORS.forEach(([b, r], i) => this.makeCarTexture(`traffic-${i}`, b, r, 'traffic'))
    this.makeCarTexture('truck', 0xff7a45, 0xffffff, 'truck')
    this.makeSmallTextures()

    this.road = this.add.tileSprite(0, 0, W, H, this.makeRoadTexture(this.cfg.theme)).setOrigin(0, 0)

    // player
    this.player = this.physics.add.sprite(laneCenter(1), PLAYER_Y, 'player-car')
    this.player.setDepth(5)
    const pb = this.player.body as Phaser.Physics.Arcade.Body
    pb.setSize(46, 94)
    pb.setOffset(14, 13)

    this.shieldRing = this.add.circle(this.player.x, this.player.y, 52)
    this.shieldRing.setStrokeStyle(3, 0x6bd5ff, 0.9)
    this.shieldRing.setDepth(6)
    this.shieldRing.setVisible(this.hasShield)

    // groups
    this.traffic = this.physics.add.group()
    this.coinsGroup = this.physics.add.group()
    this.obstacles = this.physics.add.group()

    this.physics.add.overlap(this.player, this.coinsGroup, (_p, c) =>
      this.collectCoin(c as Phaser.Physics.Arcade.Sprite),
    )
    this.physics.add.overlap(this.player, this.traffic, (_p, t) =>
      this.hitVehicle(t as Phaser.Physics.Arcade.Sprite),
    )
    this.physics.add.overlap(this.player, this.obstacles, (_p, ob) =>
      this.hitObstacle(ob as Phaser.Physics.Arcade.Sprite),
    )

    // keyboard
    this.cursors = this.input.keyboard!.createCursorKeys()
    const kb = this.input.keyboard!
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W)
    this.keyS = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S)
    kb.on('keydown-ESC', () => this.opts.onEvent('pauseKey'))
    kb.on('keydown-P', () => this.opts.onEvent('pauseKey'))

    // countdown
    this.countText = this.add
      .text(W / 2, H / 2 - 90, '3', {
        fontFamily: 'Fredoka, "Trebuchet MS", sans-serif',
        fontSize: '96px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#1f7a1f',
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setDepth(20)
    this.opts.onEvent('beep')
    const seq: [string, SceneEvent][] = [
      ['2', 'beep'],
      ['1', 'beep'],
      ['GO!', 'go'],
    ]
    seq.forEach(([label, ev], i) => {
      this.time.delayedCall(650 * (i + 1), () => {
        if (this.state !== 'countdown') return
        this.countText.setText(label)
        this.countText.setScale(1.35)
        this.tweens.add({ targets: this.countText, scale: 1, duration: 220, ease: 'Back.easeOut' })
        this.opts.onEvent(ev)
        if (label === 'GO!') {
          this.state = 'playing'
          this.time.delayedCall(420, () => this.countText.setVisible(false))
        }
      })
    })

    // a few starter scenery pieces so the road is alive immediately
    for (let i = 0; i < 7; i++) this.spawnScenery(-i * 130 + 60) // eslint-disable-line
    for (let i = 0; i < 7; i++) this.spawnScenery(-i * 130 - 40)

    const api: RacingApi = {
      setPaused: (paused: boolean) => {
        if (paused) {
          this.scene.pause()
        } else {
          this.scene.resume()
        }
      },
      restart: () => {
        this.scene.restart()
      },
    }
    this.opts.onReady(api)
    this.pushHud()
  }

  /* ------------------------------ spawning ------------------------------ */
  private randomLane(): number {
    let lane = Phaser.Math.Between(0, 3)
    if (lane === this.lastLane && Math.random() < 0.6) lane = (lane + Phaser.Math.Between(1, 3)) % 4
    this.lastLane = lane
    return lane
  }

  private laneBusyAtTop(lane: number, yLimit: number): boolean {
    const cx = laneCenter(lane)
    let busy = false
    this.traffic.getChildren().forEach((obj) => {
      const s = obj as Phaser.Physics.Arcade.Sprite
      if (s.active && Math.abs(s.x - cx) < 50 && s.y < yLimit) busy = true
    })
    this.obstacles.getChildren().forEach((obj) => {
      const s = obj as Phaser.Physics.Arcade.Sprite
      if (s.active && Math.abs(s.x - cx) < 60 && s.y < yLimit) busy = true
    })
    return busy
  }

  private endlessRamp(): number {
    // 1 -> ~0.5 over four minutes
    return Math.max(0.5, 1 - this.elapsed / 480)
  }

  private spawnTraffic(): void {
    const lane = this.randomLane()
    if (this.laneBusyAtTop(lane, 170)) return
    const isTruck = Math.random() < 0.14
    const tex = isTruck ? 'truck' : `traffic-${Phaser.Math.Between(0, TRAFFIC_COLORS.length - 1)}`
    const car = this.traffic.get(laneCenter(lane), -90, tex) as Phaser.Physics.Arcade.Sprite | null
    if (!car) return
    car.setTexture(tex)
    car.enableBody(true, laneCenter(lane), -90, true, true)
    car.setDepth(4)
    car.setAngle(0)
    car.setAlpha(1)
    const body = car.body as Phaser.Physics.Arcade.Body
    body.setSize(46, isTruck ? 124 : 94)
    body.setOffset(14, 12)
    const [lo, hi] = this.cfg.trafficSpeed
    const ramp = this.opts.level === null ? 1 + Math.min(0.3, this.elapsed / 600) : 1
    car.setData('ownSpeed', Phaser.Math.Between(lo, hi) * ramp * (isTruck ? 0.82 : 1))
    car.setData('passed', false)
  }

  private spawnCoinChain(): void {
    const lane = this.randomLane()
    const count = Phaser.Math.Between(4, 6)
    for (let i = 0; i < count; i++) {
      const y = -40 - i * 48
      const coin = this.coinsGroup.get(laneCenter(lane), y, 'coin') as Phaser.Physics.Arcade.Sprite | null
      if (!coin) continue
      coin.setTexture('coin')
      coin.enableBody(true, laneCenter(lane), y, true, true)
      coin.setDepth(3)
      coin.setScale(1)
      coin.setData('phase', Math.random() * Math.PI * 2)
      const body = coin.body as Phaser.Physics.Arcade.Body
      body.setCircle(15, 3, 3)
    }
  }

  private spawnObstacle(): void {
    const lane = this.randomLane()
    if (this.laneBusyAtTop(lane, 190)) return
    const barrier = Math.random() < 0.32
    const tex = barrier ? 'barrier' : 'cone'
    const ob = this.obstacles.get(laneCenter(lane), -50, tex) as Phaser.Physics.Arcade.Sprite | null
    if (!ob) return
    ob.setTexture(tex)
    ob.enableBody(true, laneCenter(lane), -50, true, true)
    ob.setDepth(3)
    ob.setAngle(0)
    ob.setAlpha(1)
    ob.setData('kind', barrier ? 'barrier' : 'cone')
    const body = ob.body as Phaser.Physics.Arcade.Body
    if (barrier) body.setSize(80, 24)
    else body.setSize(26, 30)
  }

  private spawnScenery(y = -80): void {
    const kinds = this.theme.scenery
    const kind = kinds[Phaser.Math.Between(0, kinds.length - 1)]
    const leftSide = Math.random() < 0.5
    const x = kind === 'building'
      ? (leftSide ? 4 : W - 4)
      : (leftSide ? Phaser.Math.Between(10, 30) : Phaser.Math.Between(W - 30, W - 10))
    const img = this.add.image(x, y, kind)
    img.setDepth(1)
    img.setScale(kind === 'building' ? 0.82 : Phaser.Math.FloatBetween(0.85, 1.1))
    if (kind === 'building') {
      const tints = [0xffd9c2, 0xc2e4ff, 0xd8ffc2, 0xffe9a8, 0xffc2dd, 0xe2d6ff]
      img.setTint(tints[Phaser.Math.Between(0, tints.length - 1)])
      img.setOrigin(leftSide ? 0 : 1, 0.5)
    }
    this.scenery.push(img)
  }

  /* ----------------------------- interactions ----------------------------- */
  // One emitter per tint, created once and re-used. Creating (and tearing down)
  // a particle emitter for every coin picked up was allocating a game object,
  // a timer and a GPU batch several times a second — a classic source of
  // micro-stutter on phones.
  private sparkEmitters = new Map<number, Phaser.GameObjects.Particles.ParticleEmitter>()

  private burst(x: number, y: number, tint: number, count: number, speed = 130): void {
    let emitter = this.sparkEmitters.get(tint)
    if (!emitter) {
      emitter = this.add
        .particles(0, 0, 'spark', {
          speed: { min: speed * 0.3, max: speed },
          lifespan: 420,
          scale: { start: 0.85, end: 0 },
          tint,
          emitting: false,
        })
        .setDepth(15)
      this.sparkEmitters.set(tint, emitter)
    }
    emitter.explode(count, x, y)
  }

  // A single floating label re-used for every pickup / near miss. Creating a
  // Phaser Text per event re-rasterises a canvas and uploads a new GPU texture
  // each time, which hitches badly during coin chains.
  private pickupLabel?: Phaser.GameObjects.Text

  private floatText(x: number, y: number, label: string, color = '#ffd93d'): void {
    if (!this.pickupLabel) {
      this.pickupLabel = this.add
        .text(0, 0, label, {
          fontFamily: 'Fredoka, "Trebuchet MS", sans-serif',
          fontSize: '22px',
          fontStyle: 'bold',
          color,
          stroke: '#5b4a00',
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(16)
    }
    const t = this.pickupLabel
    // setText/setColor skip their canvas re-render when the value is unchanged,
    // so a stream of "+1" labels costs almost nothing.
    if (t.text !== label) t.setText(label)
    if (t.style.color !== color) t.setColor(color)
    this.tweens.killTweensOf(t)
    t.setPosition(x, y).setAlpha(1).setVisible(true)
    this.tweens.add({
      targets: t,
      y: y - 46,
      alpha: 0,
      duration: 650,
      ease: 'Quad.easeOut',
      onComplete: () => t.setVisible(false),
    })
  }

  private collectCoin(coin: Phaser.Physics.Arcade.Sprite): void {
    if (!coin.active || this.state !== 'playing') return
    coin.disableBody(true, true)
    this.coinsCollected += 1
    this.burst(coin.x, coin.y, 0xffd93d, 7, 110)
    this.floatText(coin.x, coin.y - 14, '+1')
    this.opts.onEvent('coin')
  }

  private spinOut(car: Phaser.Physics.Arcade.Sprite): void {
    const body = car.body as Phaser.Physics.Arcade.Body
    body.enable = false
    const dir = car.x < this.player.x ? -1 : 1
    this.tweens.add({
      targets: car,
      x: car.x + dir * 46,
      angle: dir * 38,
      alpha: 0.35,
      duration: 420,
      ease: 'Quad.easeOut',
      onComplete: () => car.disableBody(true, true),
    })
  }

  private registerCrash(x: number, y: number): void {
    this.clean = false
    if (this.hasShield) {
      this.hasShield = false
      this.shieldRing.setVisible(false)
      this.invulnerableUntil = this.time.now + 1500
      this.burst(x, y, 0x6bd5ff, 14, 170)
      this.floatText(this.player.x, this.player.y - 70, 'SHIELD!', '#6bd5ff')
      this.opts.onEvent('shield')
      this.speed = Math.max(140, this.speed * 0.55)
      this.blinkPlayer()
      return
    }
    this.hits += 1
    this.invulnerableUntil = this.time.now + 1400
    this.speed = 85
    this.cameras.main.shake(190, 0.009)
    this.burst(x, y, 0xffa53d, 16, 190)
    this.burst(x, y, 0xfff2b0, 8, 120)
    this.opts.onEvent('crash')
    this.blinkPlayer()
    this.pushHud()
    if (this.hits >= MAX_HITS) this.finish(false)
  }

  private blinkPlayer(): void {
    this.tweens.add({
      targets: this.player,
      alpha: 0.3,
      duration: 110,
      yoyo: true,
      repeat: 5,
      onComplete: () => this.player.setAlpha(1),
    })
  }

  private hitVehicle(car: Phaser.Physics.Arcade.Sprite): void {
    if (this.state !== 'playing' || !car.active) return
    if (this.time.now < this.invulnerableUntil) return
    const x = (car.x + this.player.x) / 2
    const y = (car.y + this.player.y) / 2
    this.spinOut(car)
    this.registerCrash(x, y)
  }

  private hitObstacle(ob: Phaser.Physics.Arcade.Sprite): void {
    if (this.state !== 'playing' || !ob.active) return
    const kind = ob.getData('kind') as string
    if (kind === 'cone') {
      this.clean = false
      this.speed = Math.max(120, this.speed * 0.55)
      this.cameras.main.shake(110, 0.004)
      this.burst(ob.x, ob.y, 0xff6a26, 8, 140)
      this.opts.onEvent('bump')
      const body = ob.body as Phaser.Physics.Arcade.Body
      body.enable = false
      this.tweens.add({
        targets: ob,
        y: ob.y + 130,
        x: ob.x + (ob.x < this.player.x ? -50 : 50),
        angle: 160,
        alpha: 0,
        duration: 380,
        onComplete: () => ob.disableBody(true, true),
      })
      return
    }
    // barrier = full crash
    if (this.time.now < this.invulnerableUntil) return
    const x = ob.x
    const y = ob.y
    const body = ob.body as Phaser.Physics.Arcade.Body
    body.enable = false
    this.tweens.add({
      targets: ob,
      y: ob.y + 60,
      angle: 14,
      alpha: 0.4,
      duration: 300,
      onComplete: () => ob.disableBody(true, true),
    })
    this.registerCrash(x, y)
  }

  /* -------------------------------- finish -------------------------------- */
  private currentScore(): number {
    return Math.floor(this.distance * 2 + this.coinsCollected * 50 + this.nearMisses * 25)
  }

  private finish(success: boolean): void {
    if (this.state === 'finished') return
    this.state = 'finished'
    const result: RunResult = {
      endless: this.opts.level === null,
      levelId: this.opts.level?.id ?? null,
      success,
      coins: this.coinsCollected,
      score: this.currentScore(),
      distance: Math.floor(this.distance),
      hits: this.hits,
      clean: this.clean,
      boost: this.opts.boost,
    }
    if (success) {
      this.opts.onEvent('win')
      const colors = [0xffd93d, 0x6bd5ff, 0xff5d8f, 0x7bed6f]
      colors.forEach((c, i) => {
        this.time.delayedCall(i * 130, () =>
          this.burst(90 + i * 90, 240 + (i % 2) * 60, c, 18, 230),
        )
      })
      this.tweens.add({ targets: this.player, y: -130, duration: 1000, ease: 'Quad.easeIn' })
    } else {
      this.opts.onEvent('lose')
      this.burst(this.player.x, this.player.y - 30, 0x9aa3ad, 18, 120)
      this.player.setVelocity(0, 0)
    }
    this.time.delayedCall(950, () => {
      if (this.finishSent) return
      this.finishSent = true
      this.opts.onFinish(result)
    })
  }

  private pushHud(): void {
    const max = this.maxSpeed()
    this.opts.onHud({
      state: this.state,
      kmh: Math.round(this.speed * 0.32),
      speedNorm: max > 0 ? this.speed / max : 0,
      distance: Math.floor(this.distance),
      target: this.opts.level?.distance ?? null,
      coins: this.coinsCollected,
      score: this.currentScore(),
      hits: this.hits,
      maxHits: MAX_HITS,
      shield: this.hasShield,
    })
  }

  private maxSpeed(): number {
    return 445 * this.opts.car.topSpeed * (this.opts.tires ? 1.08 : 1)
  }

  /* --------------------------------- update --------------------------------- */
  update(_time: number, deltaMs: number): void {
    // Cap at 100 ms (10 fps) rather than 50 ms: clamping harder made the whole
    // simulation run in slow motion on devices that hit a rough frame, which
    // read as "the car slows down when I steer".
    const dt = Math.min(deltaMs / 1000, 0.1)
    const o = this.opts
    const input = o.input

    if (this.state === 'countdown') {
      this.player.setVelocity(0, 0)
      this.shieldRing.setPosition(this.player.x, this.player.y)
      return
    }

    if (this.state === 'finished') {
      // let the world coast to a stop / car drive off
      this.speed = Math.max(0, this.speed - 260 * dt)
      this.road.tilePositionY -= this.speed * dt
      this.moveWorld(dt)
      return
    }

    this.elapsed += dt

    /* --- driving model --- */
    const left = input.left || this.cursors.left.isDown || this.keyA.isDown
    const right = input.right || this.cursors.right.isDown || this.keyD.isDown
    const up = input.up || this.cursors.up.isDown || this.keyW.isDown
    const down = input.down || this.cursors.down.isDown || this.keyS.isDown

    const max = this.maxSpeed()
    const targetSpeed = down ? 145 : up ? max : Math.min(308, max)
    const rate = 255 * o.car.accel * (down ? 1.9 : 1)
    if (this.speed < targetSpeed) this.speed = Math.min(targetSpeed, this.speed + rate * dt)
    else this.speed = Math.max(targetSpeed, this.speed - rate * dt)

    // Steering used to snap the lateral velocity to ±3150 px/s, which crosses
    // the whole road in under 0.1 s and then slams into the edge clamp — the
    // "braking" feeling when holding left/right. Instead the car now eases the
    // lateral speed towards its target (same response at any frame rate) and
    // sheds speed as it approaches the verge, so it slides into the edge.
    // handling is a gameplay multiplier (1.0 – 1.5), so this lands at roughly
    // 430–650 px/s: the car crosses the 274 px wide road in ~0.4–0.6 s.
    const steerMax = 430 * o.car.handling * (o.tires ? 1.08 : 1)
    const steerInput = (right ? 1 : 0) - (left ? 1 : 0)
    const minX = ROAD_LEFT + 30
    const maxX = ROAD_RIGHT - 30
    let targetVx = steerInput * steerMax
    if (targetVx > 0) targetVx *= Phaser.Math.Clamp((maxX - this.player.x) / 34, 0.25, 1)
    else if (targetVx < 0) targetVx *= Phaser.Math.Clamp((this.player.x - minX) / 34, 0.25, 1)
    const body = this.player.body as Phaser.Physics.Arcade.Body
    const steerAccel = (steerInput === 0 ? 3400 : 2600) * o.car.handling
    const nextVx = body.velocity.x < targetVx
      ? Math.min(targetVx, body.velocity.x + steerAccel * dt)
      : Math.max(targetVx, body.velocity.x - steerAccel * dt)
    const predictedX = this.player.x + nextVx * dt
    if (predictedX < minX || predictedX > maxX) {
      this.player.x = Phaser.Math.Clamp(predictedX, minX, maxX)
      this.player.setVelocity(0, 0)
    } else {
      this.player.setVelocity(nextVx, 0)
    }
    this.player.y = PLAYER_Y
    // lean into the turn, smoothed independently of the frame rate
    const targetTilt = Phaser.Math.Clamp((nextVx / steerMax) * 10, -10, 10)
    this.tilt += (targetTilt - this.tilt) * (1 - Math.exp(-16 * dt))
    this.player.setAngle(this.tilt)
    this.shieldRing.setPosition(this.player.x, this.player.y)
    if (this.hasShield) {
      this.shieldRing.setScale(1 + Math.sin(this.time.now / 280) * 0.05)
    }

    /* --- world scroll --- */
    this.road.tilePositionY -= this.speed * dt
    this.distance += this.speed * dt * 0.09
    this.moveWorld(dt)

    /* --- spawners --- */
    const boostDensity = 1 + (o.boost - 1) * 0.22
    const ramp = o.level === null ? this.endlessRamp() : 1
    if (this.speed > 70) {
      this.trafficTimer -= dt
      if (this.trafficTimer <= 0) {
        this.spawnTraffic()
        this.trafficTimer = (this.cfg.trafficInterval * ramp * Phaser.Math.FloatBetween(0.75, 1.25)) / boostDensity
      }
      this.coinTimer -= dt
      if (this.coinTimer <= 0) {
        this.spawnCoinChain()
        this.coinTimer = Phaser.Math.FloatBetween(1.5, 2.3)
      }
      this.obstacleTimer -= dt
      if (this.obstacleTimer <= 0) {
        this.spawnObstacle()
        this.obstacleTimer = (this.cfg.obstacleInterval * ramp * Phaser.Math.FloatBetween(0.8, 1.3)) / boostDensity
      }
    }
    this.sceneryTimer -= dt
    if (this.sceneryTimer <= 0) {
      this.spawnScenery()
      this.sceneryTimer = Phaser.Math.FloatBetween(0.35, 0.7)
    }

    /* --- HUD + objectives --- */
    this.hudTimer -= dt
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.12
      this.pushHud()
    }
    if (o.level && this.distance >= o.level.distance) this.finish(true)
  }

  private moveWorld(dt: number): void {
    const t = this.time.now / 1000
    // traffic
    this.traffic.getChildren().forEach((obj) => {
      const car = obj as Phaser.Physics.Arcade.Sprite
      if (!car.active) return
      const b = car.body as Phaser.Physics.Arcade.Body
      if (b.enable) car.setVelocity(0, this.speed - (car.getData('ownSpeed') as number))
      if (!car.getData('passed') && this.state === 'playing' && car.y > this.player.y + 76) {
        car.setData('passed', true)
        if (Math.abs(car.x - this.player.x) < 80) {
          this.nearMisses += 1
          this.floatText(this.player.x, this.player.y - 64, 'Near miss +25', '#8be9ff')
          this.opts.onEvent('nearMiss')
        }
      }
      if (car.y > H + 110) car.disableBody(true, true)
    })
    // coins (spin + magnet)
    this.coinsGroup.getChildren().forEach((obj) => {
      const coin = obj as Phaser.Physics.Arcade.Sprite
      if (!coin.active) return
      const phase = coin.getData('phase') as number
      const dist = Phaser.Math.Distance.Between(coin.x, coin.y, this.player.x, this.player.y)
      if (this.opts.magnet && this.state === 'playing' && dist < 122) {
        this.physics.moveToObject(coin, this.player, 480)
        coin.setScale(1)
      } else {
        coin.setVelocity(0, this.speed)
        coin.setScale(Math.abs(Math.cos(t * 4.2 + phase)) * 0.72 + 0.28, 1)
      }
      if (coin.y > H + 60) coin.disableBody(true, true)
    })
    // obstacles are fixed to the road surface
    this.obstacles.getChildren().forEach((obj) => {
      const ob = obj as Phaser.Physics.Arcade.Sprite
      if (!ob.active) return
      const b = ob.body as Phaser.Physics.Arcade.Body
      if (b.enable) ob.setVelocity(0, this.speed)
      if (ob.y > H + 70) ob.disableBody(true, true)
    })
    // scenery (non-physics)
    for (let i = this.scenery.length - 1; i >= 0; i--) {
      const img = this.scenery[i]
      img.y += this.speed * dt
      if (img.y > H + 120) {
        img.destroy()
        this.scenery.splice(i, 1)
      }
    }
  }
}

export function createRacingGame(parent: HTMLElement, opts: RacingOptions): Phaser.Game {
  const scene = new RacingScene(opts)
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: W,
    height: H,
    backgroundColor: '#79c24e',
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: W,
      height: H,
    },
    // MSAA costs a lot of fill rate on mobile GPUs and every sprite is a
    // pre-rasterised texture, so the edges barely change without it.
    render: { antialias: false, roundPixels: false, powerPreference: 'high-performance' },
    scene: [scene],
  })
}
