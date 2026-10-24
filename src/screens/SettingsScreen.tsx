import { Home, Trash2, Vibrate, Volume2, VolumeX } from 'lucide-react'
import type { SaveData } from '../lib/gameData'
import { clickSfx } from '../components/ui'

interface SettingsProps {
  save: SaveData
  onBack: () => void
  onSettings: (patch: Partial<SaveData['settings']>) => void
  onResetRequest: () => void
}

export function SettingsScreen({ save, onBack, onSettings, onResetRequest }: SettingsProps) {
  const s = save.settings
  return (
    <section className="panel-screen" aria-label="Settings">
      <header className="screen-header">
        <button type="button" className="header-back" onClick={() => { clickSfx(); onBack() }} aria-label="Back to home">
          <Home size={21} />
        </button>
        <h1>Settings</h1>
        <span className="header-spacer" />
      </header>

      <div className="scroll-area">
        <div className="settings-card">
          <h2>Sound</h2>
          <label className="slider-row" htmlFor="music-vol">
            <span>Music volume</span>
            <input
              id="music-vol"
              type="range"
              min={0}
              max={100}
              value={Math.round(s.music * 100)}
              onChange={(e) => onSettings({ music: Number(e.target.value) / 100 })}
            />
            <span className="slider-value">{Math.round(s.music * 100)}%</span>
          </label>
          <label className="slider-row" htmlFor="sfx-vol">
            <span>Effects volume</span>
            <input
              id="sfx-vol"
              type="range"
              min={0}
              max={100}
              value={Math.round(s.sfx * 100)}
              onChange={(e) => onSettings({ sfx: Number(e.target.value) / 100 })}
            />
            <span className="slider-value">{Math.round(s.sfx * 100)}%</span>
          </label>
          <button type="button" className={`toggle-row ${s.muted ? 'off' : 'on'}`} onClick={() => { clickSfx(); onSettings({ muted: !s.muted }) }} aria-pressed={s.muted}>
            {s.muted ? <VolumeX size={21} /> : <Volume2 size={21} />}
            <span>{s.muted ? 'Sound is muted' : 'Sound is on'}</span>
            <span className="switch" aria-hidden="true"><span className="knob" /></span>
          </button>
          <button type="button" className={`toggle-row ${s.vibration ? 'on' : 'off'}`} onClick={() => { clickSfx(); onSettings({ vibration: !s.vibration }) }} aria-pressed={s.vibration}>
            <Vibrate size={21} />
            <span>Vibration on crash (supported phones)</span>
            <span className="switch" aria-hidden="true"><span className="knob" /></span>
          </button>
        </div>

        <div className="settings-card">
          <h2>How to play</h2>
          <ul className="howto-list">
            <li><strong>Goal:</strong> drive the full distance to finish the level. Collect coins and avoid crashes to earn up to 3 stars.</li>
            <li><strong>Crashes:</strong> 3 crashes ends the run. Cones just slow you down. Near misses earn bonus points!</li>
            <li><strong>Keyboard:</strong> ◀ ▶ or A / D to steer, ▲ / W to speed up, ▼ / S to brake, P or Esc to pause.</li>
            <li><strong>Touch:</strong> hold the big ◀ ▶ buttons to steer, GAS to speed up and BRAKE to slow down.</li>
            <li><strong>Hearts:</strong> starting a run uses 1 heart. Finishing a level gives it back! Hearts refill over time.</li>
            <li><strong>Boost:</strong> Turbo ×2 and Nitro ×3 multiply level rewards — but the roads get busier.</li>
            <li><strong>Coins:</strong> spend them in the Shop on new cars and upgrades. They are saved on this device.</li>
          </ul>
        </div>

        <div className="settings-card danger">
          <h2>Progress</h2>
          <p>Your coins, cars, levels and trophies are stored locally in this browser.</p>
          <button type="button" className="big-btn red" onClick={() => { clickSfx(); onResetRequest() }}>
            <Trash2 size={19} /> Reset all progress
          </button>
        </div>

        <p className="version-line">Cartoon Car Adventure · v1.0 · Made with React, TypeScript &amp; Phaser</p>
      </div>
    </section>
  )
}
