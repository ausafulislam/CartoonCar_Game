import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coins,
  Flag,
  Gauge,
  Heart,
  Home,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { LEVELS, fmt, type CarDef, type LevelDef, type RunResult } from '../lib/gameData'
import { audio } from '../lib/audio'
import { createRacingGame, type HudState, type RacingApi, type SceneEvent, type TouchInput } from '../game/RacingScene'
import { Stars, clickSfx } from './ui'

export interface FinishSummary {
  /** completion reward coins (boost applied), 0 on failure / endless */
  rewardCoins: number
  /** coins collected + reward */
  totalEarned: number
  stars: number
  nextLevelId: number | null
  isNewBest: boolean
  endlessBest: number
}

interface GameViewportProps {
  level: LevelDef | null // null = endless
  car: CarDef
  boost: number
  magnet: boolean
  shield: boolean
  tires: boolean
  vibration: boolean
  muted: boolean
  onToggleMute: () => void
  onFinish: (r: RunResult) => FinishSummary
  /** Return false (e.g. no hearts) to block the retry. */
  onRetryRequest: () => boolean
  onNextLevel: (levelId: number) => void
  onExit: () => void
}

const IDLE_HUD: HudState = {
  state: 'countdown', kmh: 0, speedNorm: 0, distance: 0, target: null,
  coins: 0, score: 0, hits: 0, maxHits: 3, shield: false,
}

export function GameViewport(props: GameViewportProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<ReturnType<typeof createRacingGame> | null>(null)
  const apiRef = useRef<RacingApi | null>(null)
  const inputRef = useRef<TouchInput>({ left: false, right: false, up: false, down: false })
  const finishedRef = useRef(false)
  const propsRef = useRef(props)
  propsRef.current = props

  const [hud, setHud] = useState<HudState>(IDLE_HUD)
  const [paused, setPaused] = useState(false)
  const [result, setResult] = useState<{ raw: RunResult; summary: FinishSummary } | null>(null)
  const [pressed, setPressed] = useState<TouchInput>({ left: false, right: false, up: false, down: false })

  // One entry per pressed pointer id, so several fingers can hold different
  // controls at once and a finger sliding off a button can never leave it stuck.
  const pointersRef = useRef<Record<keyof TouchInput, Set<number>>>({
    left: new Set(), right: new Set(), up: new Set(), down: new Set(),
  })

  const setInput = useCallback((key: keyof TouchInput, value: boolean) => {
    inputRef.current[key] = value
    setPressed((p) => (p[key] === value ? p : { ...p, [key]: value }))
  }, [])

  const buzz = useCallback((ms: number) => {
    if (propsRef.current.vibration && 'vibrate' in navigator) navigator.vibrate?.(ms)
  }, [])

  const pressControl = useCallback((key: keyof TouchInput, pointerId: number) => {
    const held = pointersRef.current[key]
    if (held.has(pointerId)) return
    const isFirstFinger = held.size === 0
    held.add(pointerId)
    if (isFirstFinger) {
      setInput(key, true)
      buzz(8)
    }
  }, [setInput, buzz])

  const releaseControl = useCallback((key: keyof TouchInput, pointerId: number) => {
    const held = pointersRef.current[key]
    if (!held.delete(pointerId)) return
    if (held.size === 0) setInput(key, false)
  }, [setInput])

  /** Let go of every control (pause, results, tab switches, lost focus…). */
  const releaseAll = useCallback(() => {
    const keys = Object.keys(pointersRef.current) as (keyof TouchInput)[]
    keys.forEach((k) => pointersRef.current[k].clear())
    // Mutate (never replace) the object the racing scene holds a reference to.
    inputRef.current.left = false
    inputRef.current.right = false
    inputRef.current.up = false
    inputRef.current.down = false
    setPressed((p) => (p.left || p.right || p.up || p.down
      ? { left: false, right: false, up: false, down: false }
      : p))
  }, [])

  // Safety net: any pointer that ends anywhere releases its control, and losing
  // focus drops every held control so the car never drives off on its own.
  useEffect(() => {
    const endAnywhere = (e: PointerEvent) => {
      (Object.keys(pointersRef.current) as (keyof TouchInput)[]).forEach((k) =>
        releaseControl(k, e.pointerId),
      )
    }
    const onVisibility = () => { if (document.hidden) releaseAll() }
    window.addEventListener('pointerup', endAnywhere, true)
    window.addEventListener('pointercancel', endAnywhere, true)
    window.addEventListener('blur', releaseAll)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pointerup', endAnywhere, true)
      window.removeEventListener('pointercancel', endAnywhere, true)
      window.removeEventListener('blur', releaseAll)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [releaseAll, releaseControl])

  // Pausing or finishing a run must drop the throttle immediately.
  useEffect(() => {
    if (paused || result) releaseAll()
  }, [paused, result, releaseAll])

  /* ------------------------- Phaser lifecycle ------------------------- */
  useEffect(() => {
    if (!parentRef.current) return
    finishedRef.current = false
    audio.unlock()
    audio.startEngine()

    const handleEvent = (e: SceneEvent) => {
      switch (e) {
        case 'coin': audio.coin(); break
        case 'crash':
          audio.crash()
          if (propsRef.current.vibration && 'vibrate' in navigator) navigator.vibrate?.(90)
          break
        case 'bump': audio.bump(); break
        case 'shield': audio.shieldPop(); break
        case 'nearMiss': audio.whoosh(); break
        case 'beep': audio.beep(false); break
        case 'go': audio.beep(true); break
        case 'win': audio.win(); break
        case 'lose': audio.lose(); break
        case 'pauseKey':
          setPaused((p) => !p)
          break
      }
    }

    const game = createRacingGame(parentRef.current, {
      level: propsRef.current.level,
      endlessLevel: LEVELS[1],
      car: propsRef.current.car,
      boost: propsRef.current.boost,
      magnet: propsRef.current.magnet,
      shield: propsRef.current.shield,
      tires: propsRef.current.tires,
      input: inputRef.current,
      onHud: (h) => {
        setHud(h)
        audio.setEngine(h.state === 'playing' ? h.speedNorm : 0)
      },
      onEvent: handleEvent,
      onFinish: (raw) => {
        if (finishedRef.current) return
        finishedRef.current = true
        audio.stopEngine()
        const summary = propsRef.current.onFinish(raw)
        setResult({ raw, summary })
      },
      onReady: (api) => {
        apiRef.current = api
      },
    })
    gameRef.current = game
    // Debug/testing handle (harmless in production; used by smoke tests)
    ;(window as unknown as Record<string, unknown>).__ccaGame = game

    return () => {
      audio.stopEngine()
      delete (window as unknown as Record<string, unknown>).__ccaGame
      game.destroy(true)
      gameRef.current = null
      apiRef.current = null
    }
    // Intentionally mount once per ventured run; App remounts via key for level changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* pause plumbing */
  useEffect(() => {
    apiRef.current?.setPaused(paused)
    if (paused) audio.setEngine(0)
  }, [paused])

  /* auto-pause when tab hidden */
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) setPaused((p) => p || result === null)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [result])

  const doRetry = () => {
    if (!props.onRetryRequest()) return
    clickSfx()
    finishedRef.current = false
    setResult(null)
    setPaused(false)
    setHud(IDLE_HUD)
    apiRef.current?.restart()
    audio.startEngine()
  }

  const bind = (key: keyof TouchInput) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault()
      // Capture this specific pointer (fingers have separate pointer ids, so
      // multi-touch still works) — the button keeps receiving the release even
      // if the finger slides outside it.
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId)
      } catch {
        /* pointer already gone — the global release handler covers it */
      }
      pressControl(key, e.pointerId)
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault()
      releaseControl(key, e.pointerId)
    },
    onPointerCancel: (e: React.PointerEvent<HTMLButtonElement>) => releaseControl(key, e.pointerId),
    onLostPointerCapture: (e: React.PointerEvent<HTMLButtonElement>) => releaseControl(key, e.pointerId),
    onContextMenu: (e: React.SyntheticEvent) => e.preventDefault(),
  })

  const progressPct = hud.target ? Math.min(100, (hud.distance / hud.target) * 100) : 0
  const healthLeft = hud.maxHits - hud.hits
  const levelName = props.level ? `Level ${props.level.id} · ${props.level.name}` : 'Endless Mode'

  return (
    <section className="game-viewport" aria-label={`Driving: ${levelName}`}>
      <div className="phaser-parent" ref={parentRef} />

      {/* HUD */}
      <div className="game-hud">
        <div className="game-hud-top">
          <button
            type="button"
            className="round-btn"
            onClick={() => { clickSfx(); if (!result) setPaused(true) }}
            aria-label="Pause game"
          >
            <Pause size={21} />
          </button>
          <div className="objective">
            <div className="objective-label">
              <Flag size={14} />
              {hud.target
                ? `${fmt(hud.distance)} / ${fmt(hud.target)} m`
                : `${fmt(hud.distance)} m`}
            </div>
            <div className="objective-bar">
              {hud.target
                ? <div className="objective-fill" style={{ width: `${progressPct}%` }} />
                : <div className="objective-fill endless-fill" />}
            </div>
          </div>
          <div className="hud-pill coin-pill slim">
            <span className="pill-icon gold"><Coins size={17} strokeWidth={2.6} /></span>
            <span className="pill-value">{hud.coins}</span>
          </div>
        </div>
        <div className="game-hud-row">
          <span className="score-chip">Score {fmt(hud.score)}</span>
          <span className="health-chip" aria-label={`${healthLeft} of ${hud.maxHits} lives left in this run`}>
            {[0, 1, 2].map((i) => (
              <Heart
                key={i}
                size={18}
                fill={i < healthLeft ? '#ff4d5e' : 'transparent'}
                color={i < healthLeft ? '#d81f31' : '#9aa0aa'}
              />
            ))}
            {hud.shield && <Shield size={17} color="#38b6ff" fill="#bfe9ff" />}
          </span>
        </div>
      </div>

      {/* Control deck — steering pad, live speed dial and pedals */}
      {!result && (
        <div className="control-deck" aria-label="Driving controls">
          <div className="deck-group steer-pad" role="group" aria-label="Steering">
            <button
              type="button"
              className={`pad-btn pad-steer ${pressed.left ? 'is-down' : ''}`}
              {...bind('left')}
              aria-label="Steer left"
              aria-pressed={pressed.left}
            >
              <ChevronLeft size={30} strokeWidth={3.2} />
              <span className="pad-label">LEFT</span>
            </button>
            <button
              type="button"
              className={`pad-btn pad-steer ${pressed.right ? 'is-down' : ''}`}
              {...bind('right')}
              aria-label="Steer right"
              aria-pressed={pressed.right}
            >
              <ChevronRight size={30} strokeWidth={3.2} />
              <span className="pad-label">RIGHT</span>
            </button>
          </div>

          <div className="deck-center">
            <div
              className={`speed-dial ${hud.state}`}
              role="img"
              aria-label={`Speed ${hud.kmh} kilometres per hour`}
              style={{ '--speed': `${Math.round(Math.max(0, Math.min(1, hud.speedNorm)) * 100)}%` } as CSSProperties}
            >
              <span className="speed-value">{hud.kmh}</span>
              <span className="speed-unit">km/h</span>
            </div>
          </div>

          <div className="deck-group pedal-pad" role="group" aria-label="Pedals">
            <button
              type="button"
              className={`pad-btn pad-brake ${pressed.down ? 'is-down' : ''}`}
              {...bind('down')}
              aria-label="Brake"
              aria-pressed={pressed.down}
            >
              <ChevronDown size={20} strokeWidth={3.2} />
              <span className="pad-label">BRAKE</span>
            </button>
            <button
              type="button"
              className={`pad-btn pad-gas ${pressed.up ? 'is-down' : ''}`}
              {...bind('up')}
              aria-label="Accelerate"
              aria-pressed={pressed.up}
            >
              <Gauge size={24} strokeWidth={2.6} />
              <span className="pad-label">GAS</span>
            </button>
          </div>
        </div>
      )}
      <p className="keyboard-hint">Keyboard: ◀ ▶ steer · ▲ gas · ▼ brake · P pause</p>

      {/* Pause overlay */}
      {paused && !result && (
        <div className="game-overlay" role="dialog" aria-label="Paused">
          <div className="result-card">
            <div className="modal-ribbon"><span>Paused</span></div>
            <div className="result-actions">
              <button type="button" className="big-btn green" onClick={() => { clickSfx(); setPaused(false) }}>
                <Play size={20} /> Keep driving
              </button>
              <button type="button" className="big-btn blue" onClick={doRetry}>
                <RotateCcw size={19} /> Restart run
              </button>
              <button type="button" className="big-btn neutral" onClick={() => { clickSfx(); props.onToggleMute() }}>
                {props.muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
                {props.muted ? 'Unmute sound' : 'Mute sound'}
              </button>
              <button type="button" className="big-btn neutral" onClick={() => { clickSfx(); props.onExit() }}>
                <Home size={19} /> Back to home
              </button>
            </div>
            <p className="result-note">Coins from an unfinished run are only banked when the run ends — finish the drive to keep them!</p>
          </div>
        </div>
      )}

      {/* Result overlay */}
      {result && (
        <div className="game-overlay" role="dialog" aria-label="Run results">
          <div className="result-card">
            <div className={`modal-ribbon ${result.raw.success || result.raw.endless ? '' : 'sad'}`}>
              <span>
                {result.raw.endless
                  ? 'Endless Run Over'
                  : result.raw.success
                    ? 'Level Complete!'
                    : 'Crashed Out!'}
              </span>
            </div>

            {result.raw.success && !result.raw.endless && (
              <Stars earned={result.summary.stars} size={42} animate />
            )}
            {result.raw.endless && result.summary.isNewBest && (
              <p className="new-best">★ NEW BEST SCORE! ★</p>
            )}

            <div className="result-rows">
              <div className="result-row"><span>Score</span><strong>{fmt(result.raw.score)}</strong></div>
              <div className="result-row"><span>Distance</span><strong>{fmt(result.raw.distance)} m</strong></div>
              <div className="result-row"><span>Coins collected</span><strong>{result.raw.coins}</strong></div>
              {result.summary.rewardCoins > 0 && (
                <div className="result-row"><span>Finish reward{result.raw.boost > 1 ? ` (×${result.raw.boost} boost)` : ''}</span><strong>+{fmt(result.summary.rewardCoins)}</strong></div>
              )}
              <div className="result-row total"><span>Total coins earned</span><strong><Coins size={17} /> {fmt(result.summary.totalEarned)}</strong></div>
              {result.raw.endless && (
                <div className="result-row"><span>Endless best</span><strong>{fmt(result.summary.endlessBest)}</strong></div>
              )}
              {!result.raw.success && !result.raw.endless && props.level && (
                <p className="result-note">You reached {fmt(result.raw.distance)} of {fmt(props.level.distance)} m. You keep the coins you collected — try again!</p>
              )}
              {result.raw.success && !result.raw.endless && props.level && (
                <p className="result-note">
                  {result.raw.clean ? 'Flawless driving — clean finish bonus star!' : 'Finish with no crashes and enough coins for 3 stars.'}
                </p>
              )}
            </div>

            <div className="result-actions">
              {result.raw.success && result.summary.nextLevelId !== null && (
                <button
                  type="button"
                  className="big-btn green"
                  onClick={() => { clickSfx(); props.onNextLevel(result.summary.nextLevelId!) }}
                >
                  <Play size={20} /> Level {result.summary.nextLevelId}
                </button>
              )}
              <button type="button" className={`big-btn ${result.raw.success && result.summary.nextLevelId !== null ? 'blue' : 'green'}`} onClick={doRetry}>
                <RotateCcw size={19} /> {result.raw.endless ? 'Drive again' : 'Replay'}
              </button>
              <button type="button" className="big-btn neutral" onClick={() => { clickSfx(); props.onExit() }}>
                <Home size={19} /> Home
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
