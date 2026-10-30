import { Check, Coins, Home, RefreshCw, Star } from 'lucide-react'
import {
  LEVELS,
  dailyMissionProgress,
  fmt,
  totalStars,
  type MissionDef,
  type SaveData,
} from '../lib/gameData'
import { CoinPrice, Stars, clickSfx } from '../components/ui'

interface TrophiesProps {
  save: SaveData
  /** Today's missions (new set every day at local midnight). */
  missions: MissionDef[]
  /** e.g. "5h 12m" until the next daily reset. */
  resetLabel: string
  onBack: () => void
  onClaimMission: (id: string) => void
}

export function TrophiesScreen({ save, missions, resetLabel, onBack, onClaimMission }: TrophiesProps) {
  const stars = totalStars(save)
  return (
    <section className="panel-screen" aria-label="Trophies and missions">
      <header className="screen-header">
        <button type="button" className="header-back" onClick={() => { clickSfx(); onBack() }} aria-label="Back to home">
          <Home size={21} />
        </button>
        <h1>Trophies</h1>
        <span className="header-coins"><Coins size={16} /> {fmt(save.coins)}</span>
      </header>

      <div className="scroll-area">
        <div className="trophy-summary">
          <div className="summary-chip">
            <Star size={20} fill="#ffd93d" color="#e8a100" />
            <strong>{stars}/{LEVELS.length * 3}</strong>
            <span>Level stars</span>
          </div>
          <div className="summary-chip">
            <strong>{fmt(save.stats.bestScore)}</strong>
            <span>Best score</span>
          </div>
          <div className="summary-chip">
            <strong>{fmt(save.stats.endlessBest)}</strong>
            <span>Endless best</span>
          </div>
          <div className="summary-chip">
            <strong>{fmt(save.stats.totalDistance)} m</strong>
            <span>Total driven</span>
          </div>
        </div>

        <h2 className="section-title">Level stars</h2>
        <div className="level-stars-card">
          {LEVELS.map((l) => {
            const rec = save.records[l.id]
            const locked = l.id > save.unlockedLevel && !rec
            return (
              <div key={l.id} className={`level-star-row ${locked ? 'dim' : ''}`}>
                <span className="ls-name">Level {l.id} — {l.name}</span>
                {locked ? <span className="ls-locked">Locked</span> : <Stars earned={rec?.stars ?? 0} size={19} />}
                <span className="ls-best">{rec ? `Best ${fmt(rec.bestScore)}` : '—'}</span>
              </div>
            )
          })}
        </div>

        <h2 className="section-title">Daily missions</h2>
        <p className="mission-reset">
          <RefreshCw size={15} /> New set every day · next refresh in {resetLabel}
        </p>
        <div className="mission-list">
          {missions.map((m) => {
            const progress = Math.min(m.target, dailyMissionProgress(m, save))
            const done = progress >= m.target
            const claimed = save.claimedMissions.includes(m.id)
            return (
              <article key={m.id} className={`mission-card ${claimed ? 'claimed' : done ? 'ready' : ''}`}>
                <div className="mission-info">
                  <h3>{m.title}</h3>
                  <p>{m.description}</p>
                  <div className="mission-bar" role="progressbar" aria-valuenow={progress} aria-valuemax={m.target} aria-label={m.title}>
                    <div className="mission-fill" style={{ width: `${(progress / m.target) * 100}%` }} />
                  </div>
                  <span className="mission-progress">{fmt(progress)} / {fmt(m.target)}</span>
                </div>
                {claimed ? (
                  <span className="mission-done"><Check size={17} /> Done</span>
                ) : done ? (
                  <button type="button" className="shop-btn green pulse-btn" onClick={() => { clickSfx(); onClaimMission(m.id) }}>
                    Claim <CoinPrice amount={m.reward} />
                  </button>
                ) : (
                  <span className="mission-reward">Reward <CoinPrice amount={m.reward} /></span>
                )}
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
