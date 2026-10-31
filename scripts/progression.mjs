import { chromium } from 'playwright-core'

const base = 'http://localhost:5173'
const errors = []
const executablePath = process.env.CHROMIUM_PATH || undefined
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: [
    ...(executablePath ? ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []),
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
  ],
})
const ctx = await browser.newContext({ viewport: { width: 430, height: 880 } })
await ctx.addInitScript(() => {
  if (!localStorage.getItem('cca-seeded')) {
    localStorage.setItem('cca-seeded', '1')
    const d = new Date()
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    localStorage.setItem('cartoon-car-adventure-save-v1', JSON.stringify({
      version: 1, coins: 3000, hearts: 5, heartsUpdatedAt: Date.now(),
      unlockedLevel: 1, records: {}, ownedCars: ['ruby'], selectedCar: 'ruby',
      upgrades: { magnet: false, shield: false, tires: false }, boost: 1, milestonesClaimed: 0,
      stats: { totalCoins: 0, levelsCompleted: 0, bestScore: 0, endlessBest: 0, endlessBestDist: 0, cleanFinishes: 0, totalDistance: 0, runs: 0 },
      claimedMissions: [], missionDay: day,
      dailyStats: { coins: 0, levels: 0, clean: 0, distance: 0, runs: 0, bestScore: 0, endlessDist: 0 },
      lastDaily: '', dailyStreak: 0,
      settings: { music: 0.55, sfx: 0.85, muted: false, vibration: true },
    }))
  }
})
const page = await ctx.newPage()
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
const shot = (n) => page.screenshot({ path: `test-shots/${n}.png` })
const log = (...a) => console.log(...a)
const save = () => page.evaluate(() => JSON.parse(localStorage.getItem('cartoon-car-adventure-save-v1')))

// Real assertions: a suite that only logs can "pass" while everything is broken.
const failures = []
const check = (name, ok, extra = '') => {
  if (ok) { log('ok  -', name); return }
  failures.push(name + (extra ? ` (${extra})` : ''))
  log('FAIL-', name, extra)
}

await page.goto(base, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /LEVEL 1/i }).waitFor()
log('seeded coins:', (await save()).coins)

// Daily reward
await page.getByRole('button', { name: 'Daily reward available' }).click()
await page.getByRole('button', { name: /Claim today's reward/i }).click()
await page.waitForTimeout(400)
const afterDaily = (await save()).coins
log('after daily (+50 expected):', afterDaily)
check('daily reward pays 50 coins', afterDaily === 3050, `coins=${afterDaily}`)
await page.keyboard.press('Escape').catch(() => {})
await page.locator('.modal-close').click()

// Buy Officer Sky in Shop
await page.getByRole('button', { name: 'Shop', exact: true }).click()
await page.locator('.shop-card', { hasText: 'Officer Sky' }).getByRole('button', { name: /Buy/ }).click()
await page.getByRole('button', { name: /Buy now/i }).waitFor()
await shot('12-purchase-confirm')
await page.getByRole('button', { name: /Buy now/i }).click()
await page.waitForTimeout(400)
let s = await save()
log('after buying Sky (2450 expected): coins =', s.coins, '| selected =', s.selectedCar, '| owned =', s.ownedCars.join(','))
check('shop purchase charges 600 and selects the car', s.coins === 2450 && s.selectedCar === 'sky' && s.ownedCars.includes('sky'),
  `coins=${s.coins} selected=${s.selectedCar}`)
log('daily missions today:', s.missionDay, '| daily runs started:', s.dailyStats.runs)

// Play Level 1 and drive it to the finish via the debug handle
await page.getByRole('button', { name: 'Home', exact: true }).click()
await page.getByRole('button', { name: /LEVEL 1/i }).click()
await page.getByRole('button', { name: /^Play$/ }).click()
await page.waitForSelector('.phaser-parent canvas')
await page.waitForFunction(() => {
  const g = window.__ccaGame
  return g && g.scene.keys.RacingScene && g.scene.keys.RacingScene.state === 'playing'
}, null, { timeout: 20000 })
await page.evaluate(() => {
  const sc = window.__ccaGame.scene.keys.RacingScene
  sc.invulnerableUntil = sc.time.now + 60000
  sc.hits = 0
  sc.clean = true
  sc.coinsCollected = 9
  sc.distance = 1185
})
await page.getByText('Level Complete!').waitFor({ timeout: 20000 })
await page.waitForTimeout(1400)
await shot('13-victory')
s = await save()
log('after victory: unlocked =', s.unlockedLevel, '| record L1 =', JSON.stringify(s.records[1]), '| coins =', s.coins, '| hearts =', s.hearts, '| completed =', s.stats.levelsCompleted, '| clean =', s.stats.cleanFinishes)
log('daily mission counters: levels =', s.dailyStats.levels, '| clean =', s.dailyStats.clean, '| distance =', s.dailyStats.distance, '| coins =', s.dailyStats.coins)
check('3-star victory unlocks the next level', s.unlockedLevel === 2 && s.records[1]?.stars === 3,
  `unlocked=${s.unlockedLevel} stars=${s.records[1]?.stars}`)
check('victory refunds the heart and counts the run', s.hearts === 5 && s.stats.levelsCompleted === 1, `hearts=${s.hearts}`)
check('daily mission counters track the run', s.dailyStats.levels === 1 && s.dailyStats.distance >= 1185,
  `levels=${s.dailyStats.levels} distance=${s.dailyStats.distance}`)

// Next level button starts Level 2
await page.getByRole('button', { name: /^Level 2$/ }).click()
await page.waitForSelector('.phaser-parent canvas')
await page.waitForFunction(() => {
  const g = window.__ccaGame
  return g && g.scene.keys.RacingScene && g.scene.keys.RacingScene.state === 'playing'
}, null, { timeout: 20000 })
log('level 2 started ok')
check('next level starts a new run', true)

// Failure path
await page.evaluate(() => { window.__ccaGame.scene.keys.RacingScene.finish(false) })
await page.getByText('Crashed Out!').waitFor({ timeout: 15000 })
await page.waitForTimeout(500)
await shot('14-gameover')
await page.getByRole('button', { name: /^Home$/ }).click()

// Daily mission rollover: yesterday's progress + claims must reset on reload
await page.evaluate(() => {
  const key = 'cartoon-car-adventure-save-v1'
  const prev = JSON.parse(localStorage.getItem(key))
  prev.missionDay = '2020-01-01'
  prev.claimedMissions = ['finish1']
  prev.dailyStats = { coins: 500, levels: 5, clean: 2, distance: 5000, runs: 9, bestScore: 9999, endlessDist: 900 }
  localStorage.setItem(key, JSON.stringify(prev))
})
await page.reload({ waitUntil: 'networkidle' })
await page.getByRole('button', { name: /LEVEL 2/i }).waitFor({ timeout: 15000 })
const today = await page.evaluate(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})
// The rollover runs as soon as the app mounts; give a slow headless start a moment.
await page
  .waitForFunction(
    (day) => {
      const raw = localStorage.getItem('cartoon-car-adventure-save-v1')
      if (!raw) return false
      const sv = JSON.parse(raw)
      return sv.missionDay === day && sv.claimedMissions.length === 0 &&
        Object.values(sv.dailyStats).every((v) => v === 0)
    },
    today,
    { timeout: 6000 },
  )
  .catch(() => {})
s = await save()
log('after reload: LEVEL 2 button visible (persistence ok)')
log('daily rollover: day =', s.missionDay, '| today =', today,
  '| stats zeroed =', Object.values(s.dailyStats).every((v) => v === 0),
  '| claims cleared =', s.claimedMissions.length === 0)
check('progress survives a reload (level 2 unlocked)', s.unlockedLevel === 2)
check('stale daily missions roll over on load',
  s.missionDay === today && s.claimedMissions.length === 0 && Object.values(s.dailyStats).every((v) => v === 0),
  `day=${s.missionDay} claims=${s.claimedMissions.length}`)

// Mission claim: "First Finish" + "Careful Driver" should be claimable
await page.getByRole('button', { name: 'Trophies', exact: true }).click()
await page.waitForTimeout(500)
const missionCards = await page.locator('.mission-card').count()
log('daily missions listed in Trophies:', missionCards)
check('three daily missions are listed', missionCards === 3, `count=${missionCards}`)
const claimButtons = await page.getByRole('button', { name: /^Claim/ }).all()
log('claimable mission buttons:', claimButtons.length)
if (claimButtons.length > 0) {
  await claimButtons[0].click({ force: true })
  await page.waitForTimeout(400)
  s = await save()
  log('after mission claim: claimed =', s.claimedMissions.join(','), '| coins =', s.coins)
}
await shot('15-trophies-after')

// Desktop layout
const desk = await browser.newPage({ viewport: { width: 1440, height: 900 } })
desk.on('pageerror', (e) => errors.push('desktop pageerror: ' + e.message))
await desk.goto(base, { waitUntil: 'networkidle' })
await desk.getByRole('button', { name: /LEVEL/i }).first().waitFor()
await desk.waitForTimeout(700)
await desk.screenshot({ path: 'test-shots/16-desktop-home.png' })
log('desktop ok')

check('no console errors', errors.length === 0, errors.join(' | '))
log('ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
log(failures.length ? `\n${failures.length} CHECK(S) FAILED` : '\nall checks passed')
await browser.close()
if (failures.length) process.exitCode = 1
