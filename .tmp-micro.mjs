import chromium from '@sparticuz/chromium'
import { chromium as pw } from 'playwright-core'
const browser = await pw.launch({
  executablePath: await chromium.executablePath(),
  args: [...chromium.args, '--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  headless: true, env: { ...process.env, LD_LIBRARY_PATH: '/tmp/al2023/lib' },
})
const ctx = await browser.newContext({ viewport: { width: 430, height: 880 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const page = await ctx.newPage()
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /LEVEL \d+/i }).first().waitFor({ timeout: 20000 })
await page.getByRole('button', { name: /LEVEL \d+/i }).first().click()
await page.getByRole('button', { name: /^Play$/ }).click()
await page.waitForSelector('.control-deck')
await page.waitForFunction(() => window.__ccaGame?.scene?.keys?.RacingScene?.state === 'playing', null, { timeout: 60000 })
const r = await page.evaluate(() => {
  const N = 300
  const pts = []
  for (let i = 0; i < N; i++) pts.push([20 + (i % 60) * 6, 700 + (i % 5) * 20])
  // warm up
  for (const [x, y] of pts.slice(0, 30)) document.elementFromPoint(x, y)
  const t0 = performance.now()
  for (const [x, y] of pts) document.elementFromPoint(x, y)
  const hit = performance.now() - t0
  // cached rects path (what the deck does now)
  const boxes = [...document.querySelectorAll('[data-control]')].map((el) => { const b = el.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom } })
  const t1 = performance.now()
  let found = 0
  for (const [x, y] of pts) { for (const b of boxes) if (x >= b.l - 8 && x <= b.r + 8 && y >= b.t - 8 && y <= b.b + 8) { found++; break } }
  const cached = performance.now() - t1
  return { elementFromPointMsEach: +(hit / N).toFixed(4), cachedHitTestMsEach: +(cached / N).toFixed(4), matched: found }
})
console.log(JSON.stringify(r))
await browser.close()
