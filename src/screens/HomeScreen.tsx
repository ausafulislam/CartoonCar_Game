import { ChevronLeft, ChevronRight, Flag, Gem, Gift, Map as MapIcon } from 'lucide-react'
import {
  MILESTONE_EVERY,
  MILESTONE_REWARD,
  canClaimDaily,
  fmt,
  type CarDef,
  type SaveData,
} from '../lib/gameData'
import { TopHud, clickSfx } from '../components/ui'

interface HomeProps {
  save: SaveData
  car: CarDef
  currentLevel: number
  heartTimerLabel: string | null
  coinPulse: boolean
  onPlay: () => void
  onOpenLevels: () => void
  onEndless: () => void
  onDaily: () => void
  onClaimMilestone: () => void
  onBoostChange: (b: number) => void
  onCycleCar: (dir: 1 | -1) => void
  onOpenGarage: () => void
  onCoinsPlus: () => void
  onHeartsPlus: () => void
}

const BOOSTS = [
  { value: 1, label: 'Cruise' },
  { value: 2, label: 'Turbo' },
  { value: 3, label: 'Nitro' },
]

export function HomeScreen(props: HomeProps) {
  const { save, car } = props
  const dailyReady = canClaimDaily(save)
  const milestoneBase = save.milestonesClaimed * MILESTONE_EVERY
  const milestoneCur = Math.min(MILESTONE_EVERY, Math.max(0, save.stats.totalCoins - milestoneBase))
  const milestoneReady = save.stats.totalCoins - milestoneBase >= MILESTONE_EVERY
  const ownedCount = save.ownedCars.length

  return (
    <section className="home-screen" aria-label="Home">
      <img className="home-bg" src="/assets/environments/home-bg.jpg" alt="" draggable={false} />
      <div className="home-shade-top" aria-hidden="true" />

      <TopHud
        save={save}
        carHero={car.hero}
        heartTimerLabel={props.heartTimerLabel}
        coinPulse={props.coinPulse}
        onCoinsPlus={props.onCoinsPlus}
        onHeartsPlus={props.onHeartsPlus}
        onProfile={props.onOpenGarage}
      />

      {/* Treasure milestone progress (real, claimable) */}
      <div className="milestone-card">
        <button
          type="button"
          className={`daily-btn ${dailyReady ? 'ready' : ''}`}
          onClick={() => { clickSfx(); props.onDaily() }}
          aria-label={dailyReady ? 'Daily reward available' : 'Daily reward (claimed today)'}
        >
          <Gift size={24} />
          {dailyReady && <span className="dot-badge">!</span>}
          <span className="daily-label">Daily</span>
        </button>
        <div className="milestone-main">
          <div className="milestone-bar" role="progressbar" aria-valuenow={milestoneCur} aria-valuemax={MILESTONE_EVERY} aria-label="Treasure coin progress">
            <div className="milestone-fill" style={{ width: `${(milestoneCur / MILESTONE_EVERY) * 100}%` }} />
            <span className="milestone-text"><span className="coin-dot" aria-hidden="true" /> {fmt(milestoneCur)}/{MILESTONE_EVERY}</span>
          </div>
          <div className="boost-row" role="group" aria-label="Reward boost">
            {BOOSTS.map((b) => (
              <button
                key={b.value}
                type="button"
                className={`boost-chip ${save.boost === b.value ? 'active' : ''}`}
                onClick={() => { clickSfx(); props.onBoostChange(b.value) }}
                aria-pressed={save.boost === b.value}
              >
                ×{b.value} {b.label}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          className={`chest-btn ${milestoneReady ? 'ready' : ''}`}
          onClick={() => { clickSfx(); props.onClaimMilestone() }}
          disabled={!milestoneReady}
          aria-label={milestoneReady ? `Open treasure for ${MILESTONE_REWARD} coins` : `Treasure unlocks at ${MILESTONE_EVERY} collected coins`}
        >
          <span className="chest-ico"><Gem size={22} /></span>
          <span className="chest-value">+{MILESTONE_REWARD}</span>
        </button>
      </div>
      <p className="boost-note">Boost: bigger level rewards, busier roads!</p>

      {/* Hero car */}
      <div className="hero-area">
        {ownedCount > 1 && (
          <button type="button" className="cycle-btn left" onClick={() => { clickSfx(); props.onCycleCar(-1) }} aria-label="Previous owned car">
            <ChevronLeft size={26} />
          </button>
        )}
        <button type="button" className="hero-car-btn" onClick={() => { clickSfx(); props.onOpenGarage() }} aria-label={`Open garage. Current car: ${car.name}`}>
          <span className="car-shadow" aria-hidden="true" />
          <img key={car.id} className="hero-car" src={car.hero} alt={`${car.name}, your cartoon car`} draggable={false} />
        </button>
        {ownedCount > 1 && (
          <button type="button" className="cycle-btn right" onClick={() => { clickSfx(); props.onCycleCar(1) }} aria-label="Next owned car">
            <ChevronRight size={26} />
          </button>
        )}
      </div>
      <div className="car-nameplate" aria-hidden="true">{car.name}</div>

      {/* Main actions */}
      <div className="home-actions">
        <button type="button" className="level-btn" onClick={() => { clickSfx(); props.onPlay() }}>
          LEVEL {props.currentLevel}
          <ChevronRight className="level-chevron" size={34} strokeWidth={3.4} aria-hidden="true" />
        </button>
        <div className="home-sub-actions">
          <button type="button" className="sub-action" onClick={() => { clickSfx(); props.onOpenLevels() }}>
            <MapIcon size={19} /> All Levels
          </button>
          <button type="button" className="sub-action endless" onClick={() => { clickSfx(); props.onEndless() }}>
            <Flag size={19} /> Endless
            {save.stats.endlessBest > 0 && <span className="sub-best">Best {fmt(save.stats.endlessBest)}</span>}
          </button>
        </div>
      </div>
    </section>
  )
}
