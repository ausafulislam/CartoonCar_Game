import { useCallback, useEffect, useRef, useState } from 'react'
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

  // The scene pushes HUD values every rendered frame (up to 60x/second). Feeding
  // all of that straight into React re-rendered this whole component 60x/second,
  // which is what made the game stutter on phones. Instead the speed dial is
  // painted imperatively (cheap, needs to be smooth) and the React state is
  // throttled to a readable ~9 updates/second.
  const dialRef = useRef<HTMLDivElement>(null)
  const dialValueRef = useRef<HTMLSpanElement>(null)
  const lastHudRef = useRef<HudState>(IDLE_HUD)
  const lastHudPushRef = useRef(0)
  // The changing numbers are written straight into the DOM (see applyHud), so
  // the render loop never triggers a React render while you are driving.
  const distanceRef = useRef<HTMLSpanElement>(null)
  const coinRef = useRef<HTMLSpanElement>(null)
  const scoreRef = useRef<HTMLSpanElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef<number | null>(props.level?.distance ?? null)
  const lastEngineNormRef = useRef(-1)
  const [paused, setPaused] = useState(false)
  const [result, setResult] = useState<{ raw: RunResult; summary: FinishSummary } | null>(null)

  // Every finger that is currently holding a control, keyed by pointer id.
  // One pointer owns exactly one control at a time, so a finger that slides
  // from GAS to LEFT hands the control over instead of locking both, and two
  // fingers on two pads are completely independent (gas + steering).
  const activePointers = useRef<Map<number, keyof TouchInput>>(new Map())

  const applyHud = useCallback((h: HudState) => {
    // Engine note follows the speed closely — it is an AudioParam ramp, no DOM.
    const engine = h.state === 'playing' ? h.speedNorm : 0
    if (Math.abs(engine - lastEngineNormRef.current) > 0.02) {
      lastEngineNormRef.current = engine
      audio.setEngine(engine)
    }

    // Everything visual is throttled to ~11 Hz. The conic-gradient dial and the
    // text readouts both have to be re-painted when they change, and doing that
    // on every animation frame competes with the canvas for the main thread.
    const now = performance.now()
    if (now - lastHudPushRef.current < 90) return
    lastHudPushRef.current = now

    const dial = dialRef.current
    if (dial) {
      // quantised to 2% steps: the gradient repaints far less often for a
      // difference the eye cannot resolve on a 70 px ring
      const pct = `${Math.round(Math.max(0, Math.min(1, h.speedNorm)) * 50) * 2}%`
      if (dial.dataset.speed !== pct) {
        dial.dataset.speed = pct
        dial.style.setProperty('--speed', pct)
      }
      if (dial.dataset.runState !== h.state) dial.dataset.runState = h.state
      const label = `Speed ${h.kmh} kilometres per hour`
      if (dial.dataset.label !== label) {
        dial.dataset.label = label
        dial.setAttribute('aria-label', label)
      }
    }
    const valueEl = dialValueRef.current
    if (valueEl) {
      const kmh = String(h.kmh)
      if (valueEl.textContent !== kmh) valueEl.textContent = kmh
    }

    const target = targetRef.current
    if (distanceRef.current) {
      distanceRef.current.textContent = target
        ? `${fmt(h.distance)} / ${fmt(target)} m`
        : `${fmt(h.distance)} m`
    }
    if (coinRef.current && coinRef.current.textContent !== String(h.coins)) {
      coinRef.current.textContent = String(h.coins)
    }
    if (scoreRef.current) {
      const score = fmt(h.score)
      if (scoreRef.current.textContent !== score) scoreRef.current.textContent = score
    }
    if (progressRef.current && target) {
      progressRef.current.style.setProperty('--progress', String(Math.min(1, h.distance / target)))
    }

    // Only genuine state changes go through React (hearts, shield, run state).
    const prev = lastHudRef.current
    if (h.state !== prev.state || h.hits !== prev.hits || h.maxHits !== prev.maxHits || h.shield !== prev.shield) {
      lastHudRef.current = h
      setHud(h)
    }
  }, [])

  // Fingers only touch the pressed look of a pad — flipping a class here keeps
  // React out of the gesture entirely. A render on every steering press was
  // showing up as a one-frame hitch exactly when you tapped left or right.
  const padRefs = useRef<Partial<Record<keyof TouchInput, HTMLButtonElement | null>>>({})
  const paintPad = useCallback((key: keyof TouchInput, on: boolean) => {
    const el = padRefs.current[key]
    if (!el || el.classList.contains('is-down') === on) return
    el.classList.toggle('is-down', on)
    el.setAttribute('aria-pressed', on ? 'true' : 'false')
  }, [])

  const setInput = useCallback((key: keyof TouchInput, value: boolean) => {
    // Mutate the object the racing scene holds a reference to — never replace it.
    if (inputRef.current[key] === value) return
    inputRef.current[key] = value
    paintPad(key, value)
  }, [paintPad])

  // Haptics fire on the next tick: calling vibrate() synchronously inside
  // pointerdown interrupts the touch sequence on a few Android builds. They are
  // also rate limited — the vibrator service is an inter-process call, and one
  // per pad tap is enough to cost a frame on some phones.
  const lastBuzzRef = useRef(0)
  const buzz = useCallback((ms: number) => {
    if (!propsRef.current.vibration || !('vibrate' in navigator)) return
    const now = performance.now()
    if (now - lastBuzzRef.current < 140) return
    lastBuzzRef.current = now
    setTimeout(() => navigator.vibrate?.(ms), 0)
  }, [])

  const isHeld = (key: keyof TouchInput) => {
    for (const held of activePointers.current.values()) if (held === key) return true
    return false
  }

  /** Bind a pointer to a control (moving it if that finger already held one). */
  const pressPointer = useCallback((pointerId: number, key: keyof TouchInput) => {
    const previous = activePointers.current.get(pointerId)
    if (previous === key) return
    const isNewPointer = previous === undefined
    activePointers.current.set(pointerId, key)
    if (previous && !isHeld(previous)) setInput(previous, false)
    setInput(key, true)
    if (isNewPointer) buzz(8)
  }, [setInput, buzz])

  /** Drop whatever a pointer was holding (its control stays on if another finger holds it). */
  const releasePointer = useCallback((pointerId: number) => {
    const key = activePointers.current.get(pointerId)
    if (!key) return
    activePointers.current.delete(pointerId)
    if (!isHeld(key)) setInput(key, false)
  }, [setInput])

  /** Let go of every control (pause, results, lost focus, last finger lifted…). */
  const releaseAll = useCallback(() => {
    activePointers.current.clear()
    inputRef.current.left = false
    inputRef.current.right = false
    inputRef.current.up = false
    inputRef.current.down = false
    paintPad('left', false)
    paintPad('right', false)
    paintPad('up', false)
    paintPad('down', false)
  }, [paintPad])

  const controlOf = (el: Element | null): keyof TouchInput | null => {
    const hit = el?.closest('[data-control]')
    const value = hit?.getAttribute('data-control')
    return value === 'left' || value === 'right' || value === 'up' || value === 'down' ? value : null
  }

  // Pad boxes are measured once per gesture instead of hit-testing the DOM on
  // every pointermove — elementFromPoint() forces a style/layout flush and was
  // stuttering the game while a finger was being dragged.
  // Paint the deck with a layer of its own so a pressed pad (or the dial) can
  // never force the canvas underneath to be re-composited.
  const padBoxesRef = useRef<{ key: keyof TouchInput; left: number; right: number; top: number; bottom: number }[]>([])
  const padBoxesStaleRef = useRef(true)
  const refreshPadBoxes = useCallback(() => {
    padBoxesRef.current = Array.from(document.querySelectorAll<HTMLElement>('[data-control]')).map((el) => {
      const r = el.getBoundingClientRect()
      return {
        key: el.dataset.control as keyof TouchInput,
        left: r.left, right: r.right, top: r.top, bottom: r.bottom,
      }
    })
    padBoxesStaleRef.current = false
  }, [])
  const measurePads = useCallback(() => {
    // getBoundingClientRect() flushes pending layout, so only measure when the
    // layout can actually have changed — never inside a press.
    if (padBoxesStaleRef.current) refreshPadBoxes()
  }, [refreshPadBoxes])
  const controlAtPoint = (x: number, y: number): keyof TouchInput | null => {
    const slack = 8 // a little forgiveness for finger roll at the pad edges
    for (const b of padBoxesRef.current) {
      if (x >= b.left - slack && x <= b.right + slack && y >= b.top - slack && y <= b.bottom + slack) return b.key
    }
    return null
  }

  /**
   * Pressing anywhere on the deck starts a control. Deliberately NOT using
   * setPointerCapture: several mobile browsers mis-handle a second captured
   * touch pointer, which showed up as "gas works but steering doesn't" (and
   * vice versa). The deck tracks pointers itself and window-level listeners
   * below always see the release.
   */
  const onDeckPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    measurePads()
    const key = controlOf(e.target as Element | null) ?? controlAtPoint(e.clientX, e.clientY)
    if (!key) return
    e.preventDefault()
    pressPointer(e.pointerId, key)
  }

  // Any pointer that ends anywhere releases its control; sliding a finger onto
  // another pad switches controls mid-press; the last finger leaving the screen
  // clears everything so a control can never stay stuck down.
  useEffect(() => {
    const onUp = (e: PointerEvent) => releasePointer(e.pointerId)
    const onMove = (e: PointerEvent) => {
      if (!activePointers.current.has(e.pointerId)) return
      const key = controlAtPoint(e.clientX, e.clientY)
      if (key) pressPointer(e.pointerId, key)
    }
    const onTouchEnd = (e: TouchEvent) => { if (e.touches.length === 0) releaseAll() }
    const onVisibility = () => { if (document.hidden) releaseAll() }
    const stopGesture = (e: Event) => e.preventDefault()
    window.addEventListener('pointerup', onUp, true)
    window.addEventListener('pointercancel', onUp, true)
    window.addEventListener('pointermove', onMove, { capture: true, passive: true })
    const onResize = () => { padBoxesStaleRef.current = true }
    window.addEventListener('blur', releaseAll)
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    document.addEventListener('touchend', onTouchEnd, true)
    document.addEventListener('touchcancel', onTouchEnd, true)
    document.addEventListener('visibilitychange', onVisibility)
    document.addEventListener('gesturestart', stopGesture)
    return () => {
      window.removeEventListener('pointerup', onUp, true)
      window.removeEventListener('pointercancel', onUp, true)
      window.removeEventListener('pointermove', onMove, true)
      window.removeEventListener('blur', releaseAll)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      document.removeEventListener('touchend', onTouchEnd, true)
      document.removeEventListener('touchcancel', onTouchEnd, true)
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('gesturestart', stopGesture)
    }
  }, [pressPointer, releasePointer, releaseAll, refreshPadBoxes])

  // Pausing or finishing a run must drop the throttle immediately, and the deck
  // moves around when an overlay appears, so the cached pad boxes go stale.
  useEffect(() => {
    padBoxesStaleRef.current = true
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
      onHud: (h) => applyHud(h),
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
              <span ref={distanceRef}>{targetRef.current ? `0 / ${fmt(targetRef.current)} m` : '0 m'}</span>
            </div>
            <div className="objective-bar">
              <div className={`objective-fill ${targetRef.current ? '' : 'endless-fill'}`} ref={progressRef} />
            </div>
          </div>
          <div className="hud-pill coin-pill slim">
            <span className="pill-icon gold"><Coins size={17} strokeWidth={2.6} /></span>
            <span className="pill-value" ref={coinRef}>0</span>
          </div>
        </div>
        <div className="game-hud-row">
          <span className="score-chip">Score <span ref={scoreRef}>0</span></span>
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
        <div
          className="control-deck"
          aria-label="Driving controls"
          onPointerDown={onDeckPointerDown}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="deck-group steer-pad" role="group" aria-label="Steering">
            <button
              type="button"
              ref={(el) => { padRefs.current.left = el }}
              className="pad-btn pad-steer"
              data-control="left"
              aria-label="Steer left"
              aria-pressed={false}
            >
              <ChevronLeft size={30} strokeWidth={3.2} />
              <span className="pad-label">LEFT</span>
            </button>
            <button
              type="button"
              ref={(el) => { padRefs.current.right = el }}
              className="pad-btn pad-steer"
              data-control="right"
              aria-label="Steer right"
              aria-pressed={false}
            >
              <ChevronRight size={30} strokeWidth={3.2} />
              <span className="pad-label">RIGHT</span>
            </button>
          </div>

          <div className="deck-center">
            <div
              className="speed-dial"
              ref={dialRef}
              data-run-state={hud.state}
              role="img"
              aria-label={`Speed ${hud.kmh} kilometres per hour`}
            >
              {/* written imperatively every frame by applyHud() — never by React */}
              <span className="speed-value" ref={dialValueRef}>0</span>
              <span className="speed-unit">km/h</span>
            </div>
          </div>

          <div className="deck-group pedal-pad" role="group" aria-label="Pedals">
            <button
              type="button"
              ref={(el) => { padRefs.current.down = el }}
              className="pad-btn pad-brake"
              data-control="down"
              aria-label="Brake"
              aria-pressed={false}
            >
              <ChevronDown size={20} strokeWidth={3.2} />
              <span className="pad-label">BRAKE</span>
            </button>
            <button
              type="button"
              ref={(el) => { padRefs.current.up = el }}
              className="pad-btn pad-gas"
              data-control="up"
              aria-label="Accelerate"
              aria-pressed={false}
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
