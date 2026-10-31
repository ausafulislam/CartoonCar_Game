import chromium from '@sparticuz/chromium'
import { chromium as pw } from 'playwright-core'

const seed = function () {
  const d = new Date()
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  localStorage.setItem('cartoon-car-adventure-save-v1', JSON.stringify({
    version: 1, coins: 9000, hearts: 5, heartsUpdatedAt: Date.now(), unlockedLevel: 8, records: {},
    ownedCars: ['ruby', 'nova'], selectedCar: 'nova', upgrades: { magnet: false, shield: false, tires: false },
    boost: 1, milestonesClaimed: 0,
    stats: { totalCoins: 0, levelsCompleted: 0, bestScore: 0, endlessBest: 0, endlessBestDist: 0, cleanFinishes: 0, totalDistance: 0, runs: 0 },
    claimedMissions: [], missionDay: day,
    dailyStats: { coins: 0, levels: 0, clean: 0, distance: 0, runs: 0, bestScore: 0, endlessDist: 0 },
    lastDaily: '', dailyStreak: 0, settings: { music: 0, sfx: 0, muted: true, vibration: false },
  }))
}

const throttle = Number(process.argv[2] || 4)
const browser = await pw.launch({
  executablePath: await chromium.executablePath(),
  args: [...chromium.args, '--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  headless: true, env: { ...process.env, LD_LIBRARY_PATH: '/tmp/al2023/lib' },
})
const ctx = await browser.newContext({ viewport: { width: 430, height: 880 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await ctx.addInitScript(seed)
const page = await ctx.newPage()
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /LEVEL \d+/i }).first().waitFor({ timeout: 20000 })
await page.getByRole('button', { name: /LEVEL \d+/i }).first().click()
await page.getByRole('button', { name: /^Play$/ }).click()
await page.waitForSelector('.control-deck')
await page.waitForFunction(() => window.__ccaGame?.scene?.keys?.RacingScene?.state === 'playing', null, { timeout: 60000 })

const cdp = await ctx.newCDPSession(page)
await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle })

await page.evaluate(() => {
  window.__fps = { frames: 0, t0: performance.now(), renders: 0, hudMutations: 0 }
  const tick = () => { window.__fps.frames++; requestAnimationFrame(tick) }
  requestAnimationFrame(tick)
  const obj = document.querySelector('.objective-label')
  new MutationObserver((m) => { window.__fps.hudMutations += m.length }).observe(obj, { subtree: true, characterData: true, childList: true })
  const dial = document.querySelector('.speed-dial')
  new MutationObserver((m) => { window.__fps.dialMutations = (window.__fps.dialMutations || 0) + m.length }).observe(dial, { subtree: true, characterData: true, attributes: true })
})
const sample = async (label, ms = 3000) => {
  const r = await page.evaluate(async (ms) => {
    const f = window.__fps
    const frames0 = f.frames, hud0 = f.hudMutations, dial0 = f.dialMutations || 0
    const t0 = performance.now()
    await new Promise((res) => setTimeout(res, ms))
    const dt = (performance.now() - t0) / 1000
    const sc = window.__ccaGame.scene.keys.RacingScene
    return { fps: +((f.frames - frames0) / dt).toFixed(1), hudPerSec: +((f.hudMutations - hud0) / dt).toFixed(1), dialPerSec: +(((f.dialMutations || 0) - dial0) / dt).toFixed(1), speed: Math.round(sc.speed), dist: Math.round(sc.distance) }
  }, ms)
  console.log(label, JSON.stringify(r))
  return r
}

const center = async (sel) => { const b = await page.locator(sel).boundingBox(); return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) } }
const left = await center('.steer-pad .pad-steer:first-child')
const gas = await center('.pad-gas')

await sample('idle-noTouch ')
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: gas.x, y: gas.y, id: 1 }] })
await page.waitForTimeout(600)
await sample('gas-held    ')
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: gas.x, y: gas.y, id: 1 }, { x: left.x, y: left.y, id: 2 }] })
await page.waitForTimeout(600)
await sample('gas+left    ')
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
await page.waitForTimeout(600)
await sample('released    ')

// how much does the blur/paint cost? kill backdrop-filter and re-measure while holding
await page.addStyleTag({ content: '*{backdrop-filter:none !important;-webkit-backdrop-filter:none !important}' })
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: gas.x, y: gas.y, id: 3 }, { x: left.x, y: left.y, id: 4 }] })
await page.waitForTimeout(600)
await sample('gas+left noBlur')
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
await browser.close()
