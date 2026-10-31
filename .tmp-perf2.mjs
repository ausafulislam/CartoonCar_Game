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
const throttle = Number(process.argv[2] || 1)
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
if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle })

const metrics = async () => {
  const { metrics } = await cdp.send('Performance.getMetrics')
  const m = Object.fromEntries(metrics.map((x) => [x.name, x.value]))
  return m
}
const sample = async (label, ms = 3000) => {
  const a = await metrics()
  await page.waitForTimeout(ms)
  const b = await metrics()
  const d = (k) => +((b[k] - a[k]) * 1000 / (ms / 1000)).toFixed(1) // ms of CPU per second
  const frames = b.Frames - a.Frames
  console.log(label, JSON.stringify({
    fps: +(frames / (ms / 1000)).toFixed(1),
    taskMsPerSec: d('TaskDuration'),
    scriptMsPerSec: d('ScriptDuration'),
    layoutMsPerSec: d('LayoutDuration'),
    styleMsPerSec: d('RecalcStyleDuration'),
    layoutsPerSec: +((b.LayoutCount - a.LayoutCount) / (ms / 1000)).toFixed(1),
    styleRecalcsPerSec: +((b.RecalcStyleCount - a.RecalcStyleCount) / (ms / 1000)).toFixed(1),
  }))
  return b
}
const center = async (sel) => { const b = await page.locator(sel).boundingBox(); return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) } }
const left = await center('.steer-pad .pad-steer:first-child')
const gas = await center('.pad-gas')

await sample('idle        ')
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: gas.x, y: gas.y, id: 1 }] })
await page.waitForTimeout(500)
await sample('gas-only    ')
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: gas.x, y: gas.y, id: 1 }, { x: left.x, y: left.y, id: 2 }] })
await page.waitForTimeout(500)
await sample('gas+left    ')

// sampling profiler while both fingers are held
await cdp.send('Profiler.enable')
await cdp.send('Profiler.setSamplingInterval', { interval: 200 })
await cdp.send('Profiler.start')
await page.waitForTimeout(4000)
const { profile } = await cdp.send('Profiler.stop')
const self = new Map()
const byId = new Map(profile.nodes.map((n) => [n.id, n]))
const total = profile.samples.length
for (const id of profile.samples) {
  const n = byId.get(id)
  if (!n) continue
  const f = n.callFrame
  const key = `${f.functionName || '(anon)'} @ ${(f.url || '').split('/').slice(-1)[0]}:${f.lineNumber}`
  self.set(key, (self.get(key) || 0) + 1)
}
console.log('--- top self-time while holding gas+left (total samples ' + total + ') ---')
;[...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).forEach(([k, v]) => console.log(((v / total) * 100).toFixed(1).padStart(5) + '%  ' + k))
await browser.close()
