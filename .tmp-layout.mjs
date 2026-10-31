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
const ctx = await browser.newContext({ viewport: { width: 430, height: 880 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' })
await ctx.addInitScript(seed)
const page = await ctx.newPage()
await page.goto('http://localhost:4173', { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /LEVEL \d+/i }).first().waitFor({ timeout: 30000 })
await page.getByRole('button', { name: /LEVEL \d+/i }).first().click()
await page.getByRole('button', { name: /^Play$/ }).click()
await page.waitForSelector('.control-deck')
await page.waitForFunction(() => window.__ccaGame?.scene?.keys?.RacingScene?.state === 'playing', null, { timeout: 60000 })
const cdp = await ctx.newCDPSession(page)
await cdp.send('Performance.enable')
const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]))
const run = async (label) => {
  const a = await metrics(); await page.waitForTimeout(3000); const b = await metrics()
  console.log(label.padEnd(22), JSON.stringify({
    fps: +((b.Frames - a.Frames) / 3).toFixed(1),
    layoutsPerSec: +((b.LayoutCount - a.LayoutCount) / 3).toFixed(1),
    stylePerSec: +((b.RecalcStyleCount - a.RecalcStyleCount) / 3).toFixed(1),
    styleMsPerSec: +(((b.RecalcStyleDuration - a.RecalcStyleDuration) * 1000) / 3).toFixed(1),
    layoutMsPerSec: +(((b.LayoutDuration - a.LayoutDuration) * 1000) / 3).toFixed(1),
  }))
}
await run('as-shipped')
await page.addStyleTag({ content: '.objective-fill{transition:none !important}' })
await run('no-bar-transition')
await page.addStyleTag({ content: '.game-hud{display:none !important}' })
await run('hud-hidden')
await browser.close()
