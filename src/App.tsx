import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  Coins,
  Flag,
  Gift,
  Heart,
  Lock,
  Magnet,
  Play,
  Shield,
  Trophy,
  X,
  Zap,
} from 'lucide-react'
import {
  CARS,
  DAILY_REWARDS,
  HEART_PRICE,
  LEVELS,
  MAX_HEARTS,
  MILESTONE_EVERY,
  MILESTONE_REWARD,
  applyHeartRegen,
  canClaimDaily,
  clearSave,
  dailyMissionProgress,
  defaultSave,
  fmt,
  formatCountdown,
  getCar,
  getLevel,
  loadSave,
  missionsForDay,
  msToDailyReset,
  msToNextHeart,
  persistSave,
  rolloverDaily,
  starsForRun,
  todayKey,
  type CarDef,
  type LevelDef,
  type MissionMetric,
  type RunResult,
  type SaveData,
  type UpgradeDef,
} from './lib/gameData'
import { audio } from './lib/audio'
import { BottomNav, CoinPrice, Modal, Stars, clickSfx, type Tab } from './components/ui'
import type { FinishSummary } from './components/GameViewport'
import { InstallPopup, OfflineIndicator, UpdatePrompt, captureBeforeInstallPrompt } from './components/pwa'
import {
  ArrowDown as RefArrowDown,
  ArrowRight as RefArrowRight,
  ArrowUp as RefArrowUp,
  ChevronRight as RefChevronRight,
  Lightbulb as RefLightbulb,
  Map as RefMap,
  Ban as RefNoSymbol,
  Pause as RefPause,
  Star as RefStar,
} from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'

// Phaser is the biggest dependency — load it only when a race starts so the
// home screen paints instantly.
const GameViewport = lazy(() =>
  import('./components/GameViewport').then((m) => ({ default: m.GameViewport })),
)
import { HomeScreen } from './screens/HomeScreen'
import { GarageScreen } from './screens/GarageScreen'
import { ShopScreen } from './screens/ShopScreen'
import { TrophiesScreen } from './screens/TrophiesScreen'
import { SettingsScreen } from './screens/SettingsScreen'

type ModalKind = 'levels' | 'daily' | 'earn' | 'hearts' | 'reset' | null
type Purchase = { kind: 'car'; car: CarDef } | { kind: 'upgrade'; up: UpgradeDef } | null

function cloneSave(s: SaveData): SaveData {
  return JSON.parse(JSON.stringify(s)) as SaveData
}

function LevelList({ save, onOpenLevel }: { save: SaveData; onOpenLevel: (l: LevelDef) => void }) {
  const activeRef = useRef<HTMLDivElement | null>(null)
  // 50 levels is a long list — start scrolled to where the player actually is.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'center' })
  }, [])
  return (
    <>
      <p className="modal-text center level-list-note">
        {save.unlockedLevel} of {LEVELS.length} levels unlocked · {Object.keys(save.records).length} finished
      </p>
      <div className="level-list">
        {LEVELS.map((l) => {
          const locked = l.id > save.unlockedLevel
          const rec = save.records[l.id]
          return (
            <div
              key={l.id}
              ref={l.id === save.unlockedLevel ? activeRef : undefined}
              className={`level-row ${locked ? 'locked' : ''}`}
            >
              <div className="level-row-info">
                <strong>Level {l.id} — {l.name}</strong>
                <span>{fmt(l.distance)} m · {l.coinGoal} coins · reward {l.reward}</span>
                {rec && <span>Best score {fmt(rec.bestScore)}</span>}
              </div>
              {locked ? (
                <span className="locked-tag"><Lock size={15} /> Finish level {l.id - 1}</span>
              ) : (
                <>
                  <Stars earned={rec?.stars ?? 0} size={17} />
                  <button type="button" className="shop-btn green" onClick={() => { clickSfx(); onOpenLevel(l) }}>
                    <Play size={15} /> Play
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

function mmss(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function MissionIcon({ metric, size = 24 }: { metric: MissionMetric; size?: number }) {
  switch (metric) {
    case 'coins': return <Coins size={size} />
    case 'levels': return <RefStar size={size} fill="currentColor" />
    case 'clean': return <RefNoSymbol size={size} />
    case 'distance': return <RefMap size={size} />
    case 'runs': return <Play size={size} fill="currentColor" />
    case 'bestScore': return <Trophy size={size} />
    case 'endlessDist': return <Flag size={size} />
  }
}

export default function App() {
  const [save, setSave] = useState<SaveData>(() => {
    // loadSave() validates, migrates and rolls the daily missions over in memory;
    // write that normalised copy back so a crash/close right after opening still
    // leaves yesterday's counters and claims behind.
    const loaded = loadSave()
    persistSave(loaded)
    return loaded
  })
  const saveRef = useRef(save)
  const [tab, setTab] = useState<Tab>('home')
  const [playing, setPlaying] = useState<{ level: LevelDef | null; key: number } | null>(null)
  const [introLevel, setIntroLevel] = useState<LevelDef | null>(null)
  const [modal, setModal] = useState<ModalKind>(null)
  const [purchase, setPurchase] = useState<Purchase>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [coinPulse, setCoinPulse] = useState(false)
  const [nowTick, setNowTick] = useState(() => Date.now())
  const [needRefresh, setNeedRefresh] = useState(false)
  const toastTimer = useRef<number | null>(null)
  const runReturnTab = useRef<Tab>('home')
  const prevCoins = useRef(save.coins)
  const musicStarted = useRef(false)

  /* --- PWA / service worker --- */
  const { updateServiceWorker } = useRegisterSW({
    immediate: true,
    onNeedRefresh: () => {
      setNeedRefresh(true)
    },
    onRegisterError: (err: unknown) => {
      console.warn('Service worker registration failed:', err)
    },
  })

  useEffect(() => {
    captureBeforeInstallPrompt()
  }, [])

  const commit = useCallback((next: SaveData) => {
    saveRef.current = next
    setSave(next)
    persistSave(next)
    return next
  }, [])

  const update = useCallback(
    (fn: (draft: SaveData) => void) => {
      const draft = cloneSave(saveRef.current)
      fn(draft)
      return commit(draft)
    },
    [commit],
  )

  const notify = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }, [])

  /* ------------------------- audio wiring ------------------------- */
  useEffect(() => {
    audio.setVolumes(save.settings.music, save.settings.sfx, save.settings.muted)
  }, [save.settings.music, save.settings.sfx, save.settings.muted])

  useEffect(() => {
    const onGesture = () => {
      audio.unlock()
      if (!musicStarted.current) {
        musicStarted.current = true
        audio.startMusic()
      }
    }
    window.addEventListener('pointerdown', onGesture)
    window.addEventListener('keydown', onGesture)
    return () => {
      window.removeEventListener('pointerdown', onGesture)
      window.removeEventListener('keydown', onGesture)
    }
  }, [])

  /* ------------------------ heart regen tick ------------------------ */
  useEffect(() => {
    const id = window.setInterval(() => {
      setNowTick(Date.now())
      const cur = saveRef.current
      if (cur.hearts < MAX_HEARTS) {
        const draft = cloneSave(cur)
        applyHeartRegen(draft)
        if (draft.hearts !== cur.hearts) commit(draft)
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [commit])

  /* --------------------- daily mission rollover --------------------- */
  // Missions (and their progress) reset every local midnight, just like the
  // daily reward. Check while the app is open too, in case it stays open late.
  useEffect(() => {
    const checkDay = (announce: boolean) => {
      const draft = cloneSave(saveRef.current)
      if (rolloverDaily(draft)) {
        commit(draft)
        if (announce) notify('New daily missions are ready!')
      }
    }
    // Roll over as soon as the app opens, so yesterday's progress and claimed
    // rewards are never shown even for a second.
    checkDay(false)
    const id = window.setInterval(() => checkDay(true), 30_000)
    const onVisible = () => { if (!document.hidden) checkDay(true) }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [commit, notify])

  /* -------------------------- coin pulse -------------------------- */
  useEffect(() => {
    if (save.coins > prevCoins.current) {
      setCoinPulse(true)
      const id = window.setTimeout(() => setCoinPulse(false), 650)
      prevCoins.current = save.coins
      return () => window.clearTimeout(id)
    }
    prevCoins.current = save.coins
  }, [save.coins])

  /* ---------------------------- derived ---------------------------- */
  const car = getCar(save.selectedCar)
  const currentLevel = useMemo(() => {
    const next = LEVELS.find((l) => l.id <= save.unlockedLevel && !save.records[l.id])
    return next?.id ?? save.unlockedLevel
  }, [save.unlockedLevel, save.records])

  const heartTimerLabel = useMemo(() => {
    if (save.hearts >= MAX_HEARTS) return null
    return mmss(msToNextHeart(save, nowTick))
  }, [save, nowTick])

  // Today's three missions — stable for the whole day, new ones at midnight.
  const missions = useMemo(() => missionsForDay(save.missionDay || todayKey()), [save.missionDay])
  const dailyResetLabel = useMemo(() => formatCountdown(msToDailyReset(nowTick)), [nowTick])
  const claimableMissions = useMemo(
    () =>
      missions.filter(
        (m) => !save.claimedMissions.includes(m.id) && dailyMissionProgress(m, save) >= m.target,
      ).length,
    [missions, save],
  )

  /* ----------------------------- hearts ----------------------------- */
  /** Charge one heart for a run. Returns false when out of hearts. */
  const chargeHeart = useCallback((): boolean => {
    const cur = cloneSave(saveRef.current)
    rolloverDaily(cur)
    applyHeartRegen(cur)
    if (cur.hearts < 1) {
      commit(cur)
      audio.denied()
      setModal('hearts')
      notify('Out of hearts! Wait for a refill or buy one with coins.')
      return false
    }
    if (cur.hearts >= MAX_HEARTS) cur.heartsUpdatedAt = Date.now()
    cur.hearts -= 1
    cur.stats.runs += 1
    cur.dailyStats.runs += 1
    commit(cur)
    return true
  }, [commit, notify])

  const startRun = useCallback(
    (level: LevelDef | null) => {
      if (!chargeHeart()) return
      // Remember where the player came from so the bottom nav highlights the
      // same tab again when they leave the run.
      runReturnTab.current = tab
      setIntroLevel(null)
      setModal(null)
      setPlaying({ level, key: Date.now() })
    },
    [chargeHeart, tab],
  )

  const exitRun = useCallback(() => {
    setPlaying(null)
    setTab(runReturnTab.current)
  }, [])

  /* ---------------------------- run finish ---------------------------- */
  const handleFinish = useCallback(
    (raw: RunResult): FinishSummary => {
      const draft = cloneSave(saveRef.current)
      rolloverDaily(draft)
      draft.coins += raw.coins
      draft.stats.totalCoins += raw.coins
      draft.stats.totalDistance += raw.distance
      draft.stats.bestScore = Math.max(draft.stats.bestScore, raw.score)

      // Daily mission counters
      const daily = draft.dailyStats
      daily.coins += raw.coins
      daily.distance += raw.distance
      daily.bestScore = Math.max(daily.bestScore, raw.score)
      if (raw.endless) daily.endlessDist = Math.max(daily.endlessDist, raw.distance)

      let rewardCoins = 0
      let stars = 0
      let nextLevelId: number | null = null
      let isNewBest = false

      if (raw.endless) {
        isNewBest = raw.score > draft.stats.endlessBest
        draft.stats.endlessBest = Math.max(draft.stats.endlessBest, raw.score)
        draft.stats.endlessBestDist = Math.max(draft.stats.endlessBestDist, raw.distance)
      } else if (raw.levelId !== null) {
        const level = getLevel(raw.levelId)
        if (raw.success) {
          rewardCoins = level.reward * raw.boost
          draft.coins += rewardCoins
          stars = starsForRun(level, raw)
          const prev = draft.records[level.id]
          draft.records[level.id] = {
            stars: Math.max(prev?.stars ?? 0, stars),
            bestScore: Math.max(prev?.bestScore ?? 0, raw.score),
          }
          draft.stats.levelsCompleted += 1
          daily.levels += 1
          if (raw.clean) {
            draft.stats.cleanFinishes += 1
            daily.clean += 1
          }
          // finishing refunds the heart
          draft.hearts = Math.min(MAX_HEARTS, draft.hearts + 1)
          if (draft.hearts >= MAX_HEARTS) draft.heartsUpdatedAt = Date.now()
          if (level.id === draft.unlockedLevel && draft.unlockedLevel < LEVELS.length) {
            draft.unlockedLevel += 1
          }
          if (level.id < LEVELS.length) nextLevelId = level.id + 1
        }
      }

      commit(draft)
      return {
        rewardCoins,
        totalEarned: raw.coins + rewardCoins,
        stars,
        nextLevelId,
        isNewBest,
        endlessBest: draft.stats.endlessBest,
      }
    },
    [commit],
  )

  /* ------------------------------ economy ------------------------------ */
  const selectCar = useCallback(
    (id: string) => {
      if (!saveRef.current.ownedCars.includes(id)) return
      update((d) => {
        d.selectedCar = id
      })
      audio.pop()
      notify(`${getCar(id).name} selected!`)
    },
    [update, notify],
  )

  const confirmPurchase = useCallback(() => {
    if (!purchase) return
    const cur = saveRef.current
    if (purchase.kind === 'car') {
      const c = purchase.car
      if (cur.ownedCars.includes(c.id) || cur.coins < c.price) {
        audio.denied()
        return
      }
      update((d) => {
        d.coins -= c.price
        d.ownedCars.push(c.id)
        d.selectedCar = c.id
      })
      audio.reward()
      notify(`${c.name} unlocked and selected!`)
    } else {
      const up = purchase.up
      if (cur.upgrades[up.id] || cur.coins < up.price) {
        audio.denied()
        return
      }
      update((d) => {
        d.coins -= up.price
        d.upgrades[up.id] = true
      })
      audio.reward()
      notify(`${up.name} installed!`)
    }
    setPurchase(null)
  }, [purchase, update, notify])

  const claimMission = useCallback(
    (id: string) => {
      const cur = cloneSave(saveRef.current)
      const rolledOver = rolloverDaily(cur)
      const m = missionsForDay(cur.missionDay || todayKey()).find((x) => x.id === id)
      if (!m) {
        if (rolledOver) commit(cur)
        audio.denied()
        return
      }
      if (cur.claimedMissions.includes(id) || dailyMissionProgress(m, cur) < m.target) {
        if (rolledOver) commit(cur)
        audio.denied()
        return
      }
      cur.claimedMissions.push(id)
      cur.coins += m.reward
      commit(cur)
      audio.reward()
      notify(`Daily mission complete: +${m.reward} coins!`)
    },
    [commit, notify],
  )

  const claimMilestone = useCallback(() => {
    const cur = saveRef.current
    if (cur.stats.totalCoins - cur.milestonesClaimed * MILESTONE_EVERY < MILESTONE_EVERY) {
      notify(`Collect ${MILESTONE_EVERY} lifetime coins to open the treasure.`)
      return
    }
    update((d) => {
      d.milestonesClaimed += 1
      d.coins += MILESTONE_REWARD
    })
    audio.reward()
    notify(`Treasure opened: +${MILESTONE_REWARD} coins!`)
  }, [update, notify])

  const claimDaily = useCallback(() => {
    const cur = saveRef.current
    if (!canClaimDaily(cur)) return
    const yesterday = todayKey(new Date(Date.now() - 86_400_000))
    const streak = cur.lastDaily === yesterday ? cur.dailyStreak + 1 : 1
    const reward = DAILY_REWARDS[(streak - 1) % DAILY_REWARDS.length]
    update((d) => {
      d.lastDaily = todayKey()
      d.dailyStreak = streak
      d.coins += reward
    })
    audio.reward()
    notify(`Daily reward: +${reward} coins! (Day ${((streak - 1) % 7) + 1})`)
  }, [update, notify])

  const buyHeart = useCallback(() => {
    const cur = saveRef.current
    if (cur.hearts >= MAX_HEARTS) {
      notify('Your hearts are already full!')
      return
    }
    if (cur.coins < HEART_PRICE) {
      audio.denied()
      notify(`You need ${HEART_PRICE} coins for a heart.`)
      return
    }
    update((d) => {
      d.coins -= HEART_PRICE
      d.hearts += 1
      if (d.hearts >= MAX_HEARTS) d.heartsUpdatedAt = Date.now()
    })
    audio.pop()
    notify('Heart restored!')
  }, [update, notify])

  const cycleCar = useCallback(
    (dir: 1 | -1) => {
      const owned = CARS.filter((c) => saveRef.current.ownedCars.includes(c.id))
      if (owned.length < 2) return
      const idx = owned.findIndex((c) => c.id === saveRef.current.selectedCar)
      const next = owned[(idx + dir + owned.length) % owned.length]
      selectCar(next.id)
    },
    [selectCar],
  )

  const handleReset = useCallback(() => {
    clearSave()
    const fresh = defaultSave()
    commit(fresh)
    setPlaying(null)
    setTab('home')
    setModal(null)
    notify('Progress reset. Fresh start!')
  }, [commit, notify])

  const openIntro = useCallback((level: LevelDef) => {
    setModal(null)
    setIntroLevel(level)
  }, [])

  /* ------------------------------- render ------------------------------- */
  const dailyReady = canClaimDaily(save)
  const purchasePrice = purchase ? (purchase.kind === 'car' ? purchase.car.price : purchase.up.price) : 0
  const canAfford = save.coins >= purchasePrice

  return (
    <div className="stage">
      <OfflineIndicator />
      {needRefresh && (
        <UpdatePrompt needRefresh={needRefresh} updateServiceWorker={updateServiceWorker} />
      )}
      {/* Automatic install popup — replaces the old permanent Install Game button.
          Waits 10s, skips installed/unsupported browsers and never interrupts a run. */}
      <InstallPopup busy={!!playing || !!modal || !!introLevel || !!purchase || needRefresh} />
      <aside className="side-info left" aria-label="Game menu">
        <img className="side-logo" src="/assets/brand-logo.png" alt="Cartoon Car Adventure" draggable={false} />
        <div className="side-player">
          <span className="side-player-avatar">
            <img src={car.hero} alt="" draggable={false} />
            <span className="side-player-level">Lv {save.unlockedLevel}</span>
          </span>
          <span className="side-player-meta">
            <span className="side-player-name">Player</span>
            <span className="side-player-pill">Lv {save.unlockedLevel}</span>
          </span>
        </div>
        <button type="button" className="side-big-btn green" onClick={() => { clickSfx(); setModal('levels') }}>
          <span className="side-big-ico"><RefMap size={34} /></span>
          <span className="side-big-text">
            <span className="side-big-title">All Levels</span>
            <span className="side-big-sub">Explore all exciting levels</span>
          </span>
          <RefChevronRight size={26} className="side-big-chev" />
        </button>
        <button type="button" className="side-big-btn purple" onClick={() => { clickSfx(); startRun(null) }}>
          <span className="side-big-ico"><Flag size={34} /></span>
          <span className="side-big-text">
            <span className="side-big-title">Endless</span>
            <span className="side-big-sub">How far can you go?</span>
          </span>
          <RefChevronRight size={26} className="side-big-chev" />
        </button>
      </aside>

      <div className="phone">
        {playing ? (
          <Suspense fallback={<div className="loading-race">🏁 Loading the race…</div>}>
          <GameViewport
            key={playing.key}
            level={playing.level}
            car={car}
            boost={save.boost}
            magnet={save.upgrades.magnet}
            shield={save.upgrades.shield}
            tires={save.upgrades.tires}
            vibration={save.settings.vibration}
            muted={save.settings.muted}
            onToggleMute={() => update((d) => { d.settings.muted = !d.settings.muted })}
            onFinish={handleFinish}
            onRetryRequest={chargeHeart}
            onNextLevel={(id) => startRun(getLevel(id))}
            onExit={exitRun}
          />
          </Suspense>
        ) : (
          <>
            {tab === 'home' && <HomeScreen
                  save={save}
                  car={car}
                  currentLevel={currentLevel}
                  heartTimerLabel={heartTimerLabel}
                  coinPulse={coinPulse}
                  onPlay={() => openIntro(getLevel(currentLevel))}
                  onOpenLevels={() => setModal('levels')}
                  onEndless={() => startRun(null)}
                  onDaily={() => setModal('daily')}
                  onClaimMilestone={claimMilestone}
                  onBoostChange={(b) => update((d) => { d.boost = b })}
                  onCycleCar={cycleCar}
                  onOpenGarage={() => setTab('garage')}
                  onCoinsPlus={() => setModal('earn')}
                  onHeartsPlus={() => setModal('hearts')}
            />
            }
            {tab === 'garage' && (
              <GarageScreen
                save={save}
                onBack={() => setTab('home')}
                onSelectCar={selectCar}
                onBuyCar={(c) => setPurchase({ kind: 'car', car: c })}
              />
            )}
            {tab === 'shop' && (
              <ShopScreen
                save={save}
                onBack={() => setTab('home')}
                onBuyCar={(c) => setPurchase({ kind: 'car', car: c })}
                onSelectCar={selectCar}
                onBuyUpgrade={(up) => setPurchase({ kind: 'upgrade', up })}
              />
            )}
            {tab === 'trophies' && (
              <TrophiesScreen
                save={save}
                missions={missions}
                resetLabel={dailyResetLabel}
                onBack={() => setTab('home')}
                onClaimMission={claimMission}
              />
            )}
            {tab === 'settings' && (
              <SettingsScreen
                save={save}
                onBack={() => setTab('home')}
                onSettings={(patch) => update((d) => { Object.assign(d.settings, patch) })}
                onResetRequest={() => setModal('reset')}
              />
            )}
            <BottomNav tab={tab} onTab={setTab} claimableMissions={claimableMissions} />
          </>
        )}

        {/* --------- Level intro (reference-style card) --------- */}
        {introLevel && (
          <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`Level ${introLevel.id}`}>
            <div className="modal-card level-intro">
              <div className="modal-ribbon">
                <span>Level {introLevel.id}</span>
                <button type="button" className="modal-close" onClick={() => { clickSfx(); setIntroLevel(null) }} aria-label="Close">
                  <X size={18} strokeWidth={3.2} />
                </button>
              </div>
              <div className="modal-body">
                <Stars earned={save.records[introLevel.id]?.stars ?? 0} size={40} />
                <h2 className="intro-name">{introLevel.name}</h2>
                <p className="intro-sub">{introLevel.subtitle}</p>
                <div className="objective-box">
                  <p><Flag size={17} /> Drive <strong>{fmt(introLevel.distance)} m</strong> to finish</p>
                  <p><Coins size={17} /> Collect <strong>{introLevel.coinGoal} coins</strong> for a star</p>
                  <p><Trophy size={17} /> Reward <strong>{fmt(introLevel.reward * save.boost)} coins</strong>{save.boost > 1 ? ` (×${save.boost} boost)` : ''}</p>
                  <p><Heart size={17} /> Costs 1 heart — refunded when you finish!</p>
                  {save.records[introLevel.id] && (
                    <p className="intro-best">Your best score: {fmt(save.records[introLevel.id].bestScore)}</p>
                  )}
                </div>
                <button type="button" className="level-btn intro-play" onClick={() => { clickSfx(); startRun(introLevel) }}>
                  <Play size={24} /> Play
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --------- All levels --------- */}
        {modal === 'levels' && (
          <Modal title="Choose a Level" onClose={() => setModal(null)}>
            <LevelList save={save} onOpenLevel={openIntro} />
          </Modal>
        )}

        {/* --------- Daily reward --------- */}
        {modal === 'daily' && (
          <Modal title="Daily Reward" onClose={() => setModal(null)}>
            <p className="modal-text">Come back every day for bigger rewards. Missing a day restarts the streak — no real-world prizes, just coins!</p>
            <div className="daily-grid">
              {DAILY_REWARDS.map((r, i) => {
                const claimedDays = dailyReady ? save.dailyStreak % 7 : ((save.dailyStreak - 1) % 7) + 1
                const isClaimed = i < claimedDays
                const isToday = dailyReady && i === save.dailyStreak % 7
                return (
                  <div key={r} className={`daily-cell ${isClaimed ? 'claimed' : ''} ${isToday ? 'today' : ''}`}>
                    <span>Day {i + 1}</span>
                    <Gift size={20} />
                    <strong>{r}</strong>
                    {isClaimed && <Check size={15} className="daily-check" />}
                  </div>
                )
              })}
            </div>
            {dailyReady ? (
              <button type="button" className="big-btn green" onClick={() => { clickSfx(); claimDaily() }}>
                <Gift size={20} /> Claim today&apos;s reward
              </button>
            ) : (
              <p className="modal-text center">Claimed! Come back tomorrow for Day {((save.dailyStreak) % 7) + 1}.</p>
            )}
          </Modal>
        )}

        {/* --------- Earn coins --------- */}
        {modal === 'earn' && (
          <Modal title="Earn Coins" onClose={() => setModal(null)}>
            <p className="modal-text">Balance: <CoinPrice amount={save.coins} />. Coins are earned by playing — here are the fastest ways:</p>
            <div className="result-actions">
              <button type="button" className="big-btn green" disabled={!dailyReady} onClick={() => { clickSfx(); claimDaily() }}>
                <Gift size={19} /> {dailyReady ? 'Claim daily reward' : 'Daily reward claimed'}
              </button>
              <button type="button" className="big-btn blue" onClick={() => { clickSfx(); setModal(null); setPlaying(null); setTab('trophies') }}>
                <Trophy size={19} /> Daily missions{claimableMissions > 0 ? ` (${claimableMissions} ready!)` : ''}
              </button>
              <button type="button" className="big-btn orange" onClick={() => { clickSfx(); startRun(null) }}>
                <Flag size={19} /> Play Endless for coins
              </button>
            </div>
            <p className="modal-text">Tip: Turbo ×2 and Nitro ×3 boosts multiply your level completion rewards.</p>
          </Modal>
        )}

        {/* --------- Hearts --------- */}
        {modal === 'hearts' && (
          <Modal title="Hearts" onClose={() => setModal(null)}>
            <div className="hearts-display" aria-label={`${save.hearts} of ${MAX_HEARTS} hearts`}>
              {Array.from({ length: MAX_HEARTS }).map((_, i) => (
                <Heart key={i} size={34} fill={i < save.hearts ? '#ff4d5e' : 'transparent'} color={i < save.hearts ? '#d81f31' : '#c3bda9'} />
              ))}
            </div>
            <p className="modal-text center">
              {save.hearts >= MAX_HEARTS
                ? 'Your hearts are full. Let\'s drive!'
                : `Next heart in ${heartTimerLabel ?? '…'} · Starting a run uses 1 heart · Finishing a level refunds it.`}
            </p>
            <button type="button" className="big-btn orange" disabled={save.hearts >= MAX_HEARTS} onClick={() => { clickSfx(); buyHeart() }}>
              <Heart size={19} /> Buy 1 heart · <CoinPrice amount={HEART_PRICE} />
            </button>
            <p className="modal-text center">Balance: <CoinPrice amount={save.coins} /></p>
          </Modal>
        )}

        {/* --------- Purchase confirm --------- */}
        {purchase && (
          <Modal title="Confirm Purchase" onClose={() => setPurchase(null)}>
            <div className="purchase-preview">
              {purchase.kind === 'car' ? (
                <>
                  <img src={purchase.car.hero} alt={purchase.car.name} />
                  <h3>{purchase.car.name}</h3>
                  <p>Speed {purchase.car.speedStat} · Accel {purchase.car.accelStat} · Handling {purchase.car.handlingStat}</p>
                </>
              ) : (
                <>
                  <span className="purchase-icon">
                    {purchase.up.id === 'magnet' ? <Magnet size={40} /> : purchase.up.id === 'shield' ? <Shield size={40} /> : <Zap size={40} />}
                  </span>
                  <h3>{purchase.up.name}</h3>
                  <p>{purchase.up.description}</p>
                </>
              )}
            </div>
            <div className="result-rows">
              <div className="result-row"><span>Price</span><strong><CoinPrice amount={purchasePrice} /></strong></div>
              <div className="result-row"><span>Your balance</span><strong><CoinPrice amount={save.coins} /></strong></div>
              <div className="result-row"><span>After purchase</span><strong><CoinPrice amount={Math.max(0, save.coins - purchasePrice)} /></strong></div>
            </div>
            {!canAfford && (
              <p className="modal-text warn">Not enough coins yet — you need {fmt(purchasePrice - save.coins)} more. Drive levels, grab the daily reward or finish today&apos;s missions!</p>
            )}
            <div className="result-actions">
              <button type="button" className="big-btn green" disabled={!canAfford} onClick={() => { clickSfx(); confirmPurchase() }}>
                <Check size={19} /> Buy now
              </button>
              {!canAfford && (
                <button type="button" className="big-btn orange" onClick={() => { clickSfx(); setPurchase(null); setModal('earn') }}>
                  <Coins size={19} /> Earn coins
                </button>
              )}
              <button type="button" className="big-btn neutral" onClick={() => { clickSfx(); setPurchase(null) }}>
                Cancel
              </button>
            </div>
          </Modal>
        )}

        {/* --------- Reset confirm --------- */}
        {modal === 'reset' && (
          <Modal title="Reset Progress?" onClose={() => setModal(null)}>
            <p className="modal-text">This deletes your coins, cars, unlocked levels, stars and trophies on this device. This cannot be undone.</p>
            <div className="result-actions">
              <button type="button" className="big-btn red" onClick={() => { clickSfx(); handleReset() }}>
                Yes, reset everything
              </button>
              <button type="button" className="big-btn neutral" onClick={() => { clickSfx(); setModal(null) }}>
                Keep my progress
              </button>
            </div>
          </Modal>
        )}

        {toast && <div className="toast" role="status">{toast}</div>}
      </div>

      <aside className="side-info right" aria-hidden="true">
        <section className="side-card">
          <h3>
            <span className="side-hd-ico"><RefLightbulb size={22} /></span> How it works
          </h3>
          <ul className="side-keys">
            <li><span className="key-ico"><RefArrowRight size={22} /></span><b>A / D</b><span>– steer left / right</span></li>
            <li><span className="key-ico"><RefArrowUp size={22} /></span><b>W</b><span>– speed up</span></li>
            <li><span className="key-ico"><RefArrowDown size={22} /></span><b>S</b><span>– brake</span></li>
            <li><span className="key-ico"><RefPause size={20} /></span><b>P / Esc</b><span>– pause</span></li>
          </ul>
        </section>
        {tab !== 'trophies' && (
          <section className="side-card side-missions">
            <h3>
              <span className="side-hd-ico"><Trophy size={20} /></span> Daily Missions
              <span className="side-mission-reset">resets in {dailyResetLabel}</span>
            </h3>
            <ul className="side-mission-list">
              {missions.map((m) => {
                const prog = Math.min(m.target, dailyMissionProgress(m, save))
                const claimed = save.claimedMissions.includes(m.id)
                const ready = prog >= m.target && !claimed
                return (
                  <li key={m.id} className={`side-mission ${ready ? 'ready' : ''} ${claimed ? 'claimed' : ''}`}>
                    <span className={`mi-ico mi-${m.metric}`}>
                      <MissionIcon metric={m.metric} />
                    </span>
                    <span className="side-mission-title">{m.description}</span>
                    <span className="side-mission-reward">
                      <Coins size={15} /> +{m.reward}
                    </span>
                    <span className="side-mission-track">
                      <span className="side-mission-fill" style={{ width: `${Math.round((prog / m.target) * 100)}%` }} />
                    </span>
                    <span className="side-mission-count">
                      {claimed ? 'Claimed' : ready ? 'Claim in Trophies!' : `${fmt(prog)} / ${fmt(m.target)}`}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </aside>
    </div>
  )
}
