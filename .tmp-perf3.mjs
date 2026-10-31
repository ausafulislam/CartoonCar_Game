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
const center = async (sel) => { const b = await page.locator(sel).boundingBox(); return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) } }
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: (await center('.pad-gas')).x, y: (await center('.pad-gas')).y, id: 1 }] })
console.log(await page.evaluate(async () => {
  const r0 = window.__gvRenders, t0 = performance.now()
  let frames = 0
  const tick = () => { frames++; requestAnimationFrame(tick) }
  requestAnimationFrame(tick)
  await new Promise((r) => setTimeout(r, 4000))
  const dt = (performance.now() - t0) / 1000
  return { rendersPerSec: +((window.__gvRenders - r0) / dt).toFixed(1), fps: +(frames / dt).toFixed(1) }
}))
await cdp.send('Profiler.enable')
await cdp.send('Profiler.setSamplingInterval', { interval: 200 })
await cdp.send('Profiler.start')
await page.waitForTimeout(3000)
const { profile } = await cdp.send('Profiler.stop')
const byId = new Map(profile.nodes.map((n) => [n.id, n]))
const total = profile.samples.length
const agg = new Map()
for (const id of profile.samples) {
  let n = byId.get(id)
  const chain = []
  while (n) { chain.push(n); n = byId.get(n.parent) }
  const src = chain.find((c) => (c.callFrame.url || '').includes('/src/'))
  const key = src ? `${src.callFrame.functionName || '(anon)'} ${(src.callFrame.url || '').split('/').slice(-1)[0]}` : '(browser/' + (chain[1]?.callFrame.functionName || 'native') + ')'
  agg.set(key, (agg.get(key) || 0) + 1)
}
console.log('--- samples by nearest /src/ frame (total ' + total + ') ---')
;[...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([k, v]) => console.log(((v / total) * 100).toFixed(1).padStart(5) + '%  ' + k))
await browser.close()
