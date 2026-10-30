import type { ReactNode } from 'react'
import { Car, Coins, Heart, Home, Plus, Settings, Star, Store, Trophy, X } from 'lucide-react'
import { MAX_HEARTS, fmt, type SaveData } from '../lib/gameData'
import { audio } from '../lib/audio'

export type Tab = 'home' | 'shop' | 'trophies' | 'garage' | 'settings'

export function clickSfx(): void {
  audio.unlock()
  audio.click()
}

/* ------------------------------ Top HUD ------------------------------ */
interface TopHudProps {
  save: SaveData
  carHero: string
  heartTimerLabel: string | null
  coinPulse: boolean
  onCoinsPlus: () => void
  onHeartsPlus: () => void
  onProfile: () => void
}

export function TopHud({ save, carHero, heartTimerLabel, coinPulse, onCoinsPlus, onHeartsPlus, onProfile }: TopHudProps) {
  return (
    <div className="top-hud">
      <button type="button" className="profile-chip" onClick={() => { clickSfx(); onProfile() }} aria-label="Open garage">
        <img src={carHero} alt="Your car" draggable={false} />
        <span className="profile-level">Lv {save.unlockedLevel}</span>
      </button>

      <div className={`hud-pill coin-pill ${coinPulse ? 'pulse' : ''}`}>
        <span className="pill-icon gold"><Coins size={19} strokeWidth={2.6} /></span>
        <span className="pill-value">{fmt(save.coins)}</span>
        <button type="button" className="pill-plus" onClick={() => { clickSfx(); onCoinsPlus() }} aria-label="Earn more coins">
          <Plus size={15} strokeWidth={3.2} />
        </button>
      </div>

      <div className="hud-pill heart-pill">
        <span className="pill-icon red"><Heart size={18} fill="currentColor" /></span>
        <span className="pill-value small">
          {save.hearts >= MAX_HEARTS ? 'Full' : `${save.hearts}/${MAX_HEARTS}`}
          {heartTimerLabel && <span className="pill-sub">{heartTimerLabel}</span>}
        </span>
        <button type="button" className="pill-plus" onClick={() => { clickSfx(); onHeartsPlus() }} aria-label="Get more hearts">
          <Plus size={15} strokeWidth={3.2} />
        </button>
      </div>
    </div>
  )
}

/* ---------------------------- Bottom nav ----------------------------- */
interface BottomNavProps {
  tab: Tab
  onTab: (t: Tab) => void
  claimableMissions: number
}

export function BottomNav({ tab, onTab, claimableMissions }: BottomNavProps) {
  const item = (id: Tab, label: string, icon: ReactNode, badge = 0) => (
    <button
      key={id}
      type="button"
      className={`nav-item ${tab === id ? 'active' : ''}`}
      onClick={() => { clickSfx(); onTab(id) }}
      aria-label={label}
      aria-current={tab === id ? 'page' : undefined}
      data-tab={id}
    >
      <span className="nav-icon">
        {icon}
        {badge > 0 && <span className="nav-badge">{badge}</span>}
      </span>
      <span className="nav-label">{label}</span>
    </button>
  )
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {item('shop', 'Shop', <Store size={27} />)}
      {item('trophies', 'Trophies', <Trophy size={27} />, claimableMissions)}
      {item('home', 'Home', <Home size={30} />)}
      {item('garage', 'Garage', <Car size={27} />)}
      {item('settings', 'Settings', <Settings size={27} />)}
    </nav>
  )
}

/* ------------------------------- Modal ------------------------------- */
interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}

export function Modal({ title, onClose, children, wide }: ModalProps) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`modal-card ${wide ? 'wide' : ''}`}>
        <div className="modal-ribbon">
          <span>{title}</span>
          <button type="button" className="modal-close" onClick={() => { clickSfx(); onClose() }} aria-label="Close">
            <X size={18} strokeWidth={3.2} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

/* ------------------------------- Stars ------------------------------- */
export function Stars({ earned, size = 30, animate = false }: { earned: number; size?: number; animate?: boolean }) {
  return (
    <div className="stars-row" aria-label={`${earned} of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <Star
          key={i}
          size={i === 1 ? size * 1.18 : size}
          className={`star ${i < earned ? 'on' : 'off'} ${animate && i < earned ? 'star-pop' : ''}`}
          style={animate ? { animationDelay: `${0.25 + i * 0.28}s` } : undefined}
          fill={i < earned ? '#ffd93d' : '#d8d3c3'}
          color={i < earned ? '#e8a100' : '#b9b2a0'}
          strokeWidth={1.6}
        />
      ))}
    </div>
  )
}

/* ------------------------------ Stat bar ------------------------------ */
export function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <div className="stat-track" role="img" aria-label={`${label}: ${value} of 10`}>
        <div className="stat-fill" style={{ width: `${value * 10}%` }} />
      </div>
      <span className="stat-value">{value}</span>
    </div>
  )
}

/* ------------------------------ Coin price ------------------------------ */
export function CoinPrice({ amount }: { amount: number }) {
  return (
    <span className="coin-price">
      <Coins size={16} /> {fmt(amount)}
    </span>
  )
}
