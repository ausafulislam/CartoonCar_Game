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
await cdp.send('Performance.enable')
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
const center = async (sel) => { const b = await page.locator(sel).boundingBox(); return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) } }
const gas = await center('.pad-gas'); const left = await center('.steer-pad .pad-steer:first-child')
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: gas.x, y: gas.y, id: 1 }, { x: left.x, y: left.y, id: 2 }] })

const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]))
const run = async (label, throttleMs) => {
  await page.evaluate((t) => { window.__hudThrottleMs = t; window.__gvRenders = 0 }, throttleMs)
  const a = await metrics()
  await page.waitForTimeout(4000)
  const b = await metrics()
  const dt = 4
  const r = await page.evaluate(() => window.__gvRenders)
  console.log(label.padEnd(16), JSON.stringify({
    rendersPerSec: +(r / 4).toFixed(1),
    scriptMsPerSec: +(((b.ScriptDuration - a.ScriptDuration) * 1000) / dt).toFixed(0),
    taskMsPerSec: +(((b.TaskDuration - a.TaskDuration) * 1000) / dt).toFixed(0),
    layoutMsPerSec: +(((b.LayoutDuration - a.LayoutDuration) * 1000) / dt).toFixed(1),
    framesPerSec: +((b.Frames - a.Frames) / dt).toFixed(1),
  }))
}
await run('hud-throttle=0', 0)
await run('hud-throttle=110', 110)
await run('hud-throttle=0 (again)', 0)
await run('hud-throttle=110 (again)', 110)
await browser.close()
