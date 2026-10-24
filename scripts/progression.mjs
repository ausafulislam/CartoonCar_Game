import { chromium } from 'playwright-core'

const base = 'http://localhost:5173'
const errors = []
const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 430, height: 880 } })
await ctx.addInitScript(() => {
  if (!localStorage.getItem('cca-seeded')) { localStorage.setItem('cca-seeded', '1'); localStorage.setItem('cartoon-car-adventure-save-v1', JSON.stringify({
    version: 1, coins: 3000, hearts: 5, heartsUpdatedAt: Date.now(),
    unlockedLevel: 1, records: {}, ownedCars: ['ruby'], selectedCar: 'ruby',
    upgrades: { magnet: false, shield: false, tires: false }, boost: 1, milestonesClaimed: 0,
    stats: { totalCoins: 0, levelsCompleted: 0, bestScore: 0, endlessBest: 0, endlessBestDist: 0, cleanFinishes: 0, totalDistance: 0, runs: 0 },
    claimedMissions: [], lastDaily: '', dailyStreak: 0,
    settings: { music: 0.55, sfx: 0.85, muted: false, vibration: true },
  })) }
})
const page = await ctx.newPage()
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
const shot = (n) => page.screenshot({ path: `test-shots/${n}.png` })
const log = (...a) => console.log(...a)
const save = () => page.evaluate(() => JSON.parse(localStorage.getItem('cartoon-car-adventure-save-v1')))

await page.goto(base, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /LEVEL 1/i }).waitFor()
log('seeded coins:', (await save()).coins)

// Daily reward
await page.getByRole('button', { name: 'Daily reward available' }).click()
await page.getByRole('button', { name: /Claim today's reward/i }).click()
await page.waitForTimeout(400)
log('after daily (+50 expected):', (await save()).coins)
await page.keyboard.press('Escape').catch(() => {})
await page.locator('.modal-close').click()

// Buy Officer Sky in Shop
await page.getByRole('button', { name: 'Shop', exact: true }).click()
await page.getByRole('button', { name: /Buy.*600/ }).click()
await page.getByRole('button', { name: /Buy now/i }).waitFor()
await shot('12-purchase-confirm')
await page.getByRole('button', { name: /Buy now/i }).click()
await page.waitForTimeout(400)
let s = await save()
log('after buying Sky (2450 expected): coins =', s.coins, '| selected =', s.selectedCar, '| owned =', s.ownedCars.join(','))

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

// Next level button starts Level 2
await page.getByRole('button', { name: /^Level 2$/ }).click()
await page.waitForSelector('.phaser-parent canvas')
await page.waitForFunction(() => {
  const g = window.__ccaGame
  return g && g.scene.keys.RacingScene && g.scene.keys.RacingScene.state === 'playing'
}, null, { timeout: 20000 })
log('level 2 started ok')

// Failure path
await page.evaluate(() => { window.__ccaGame.scene.keys.RacingScene.finish(false) })
await page.getByText('Crashed Out!').waitFor({ timeout: 15000 })
await page.waitForTimeout(500)
await shot('14-gameover')
await page.getByRole('button', { name: /^Home$/ }).click()

// Persistence across reload
await page.reload({ waitUntil: 'networkidle' })
await page.getByRole('button', { name: /LEVEL 2/i }).waitFor({ timeout: 15000 })
log('after reload: LEVEL 2 button visible (persistence ok)')

// Mission claim: "First Finish" + "Careful Driver" should be claimable
await page.getByRole('button', { name: 'Trophies', exact: true }).click()
await page.waitForTimeout(500)
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

log('ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
await browser.close()
