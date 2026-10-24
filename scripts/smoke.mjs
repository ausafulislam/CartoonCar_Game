import { chromium } from 'playwright-core'

const base = 'http://localhost:5173'
const errors = []
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 430, height: 880 }, deviceScaleFactor: 1 })
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

const shot = (n) => page.screenshot({ path: `test-shots/${n}.png` })
const log = (...a) => console.log(...a)

await page.goto(base, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /LEVEL 1/i }).waitFor({ timeout: 15000 })
await page.waitForTimeout(900)
await shot('01-home')
log('home ok; title =', await page.title())

// Level intro
await page.getByRole('button', { name: /LEVEL 1/i }).click()
await page.getByRole('button', { name: /^Play$/ }).waitFor({ timeout: 8000 })
await page.waitForTimeout(400)
await shot('02-level-intro')
log('intro ok')

// Start game
await page.getByRole('button', { name: /^Play$/ }).click()
await page.waitForSelector('.phaser-parent canvas', { timeout: 20000 })
await page.waitForTimeout(1200)
await shot('03-countdown')
log('canvas ok')

await page.waitForTimeout(2600)
await page.keyboard.down('ArrowRight')
await page.waitForTimeout(550)
await page.keyboard.up('ArrowRight')
await page.keyboard.down('ArrowUp')
await page.waitForTimeout(1800)
await shot('04-gameplay')
const hud1 = await page.locator('.objective-label').innerText()
const score1 = await page.locator('.score-chip').innerText()
const speedo = await page.locator('.speedo').innerText()
log('playing; objective:', hud1.replace(/\n/g, ' '), '|', score1, '| speedo:', speedo.replace(/\n/g, ' '))
await page.keyboard.up('ArrowUp')
await page.keyboard.down('ArrowLeft')
await page.waitForTimeout(700)
await page.keyboard.up('ArrowLeft')
await page.waitForTimeout(2200)
await shot('05-gameplay2')
const hud2 = await page.locator('.objective-label').innerText()
log('later; objective:', hud2.replace(/\n/g, ' '))

// Pause via keyboard
await page.keyboard.press('p')
await page.getByRole('button', { name: /Keep driving/i }).waitFor({ timeout: 8000 })
await page.waitForTimeout(350)
await shot('06-pause')
log('pause ok')

// Exit to home
await page.getByRole('button', { name: /Back to home/i }).click()
await page.getByRole('button', { name: /LEVEL/i }).first().waitFor({ timeout: 8000 })
const save = await page.evaluate(() => localStorage.getItem('cartoon-car-adventure-save-v1'))
log('save persisted:', save ? 'yes' : 'no', save ? ('hearts=' + JSON.parse(save).hearts + ' runs=' + JSON.parse(save).stats.runs) : '')

// Tabs
for (const [tab, name] of [['Garage', '07-garage'], ['Shop', '08-shop'], ['Trophies', '09-trophies'], ['Settings', '10-settings']]) {
  await page.getByRole('button', { name: tab, exact: true }).click()
  await page.waitForTimeout(550)
  await shot(name)
  log('tab ok:', tab)
}
await page.getByRole('button', { name: 'Home', exact: true }).click()
await page.waitForTimeout(500)
await shot('11-home-again')

log('ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
await browser.close()
