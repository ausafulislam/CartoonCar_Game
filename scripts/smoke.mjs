import { chromium } from 'playwright-core'

const base = 'http://localhost:5173'
const errors = []
const executablePath = process.env.CHROMIUM_PATH || undefined
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: executablePath ? ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [],
})
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
await page.waitForSelector('.control-deck', { timeout: 20000 })
await page.waitForFunction(() => window.__ccaGame?.scene?.keys?.RacingScene?.state === 'playing', null, { timeout: 40000 })
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
const dial1 = await page.locator('.speed-dial').innerText()
log('playing; objective:', hud1.replace(/\n/g, ' '), '|', score1, '| dial:', dial1.replace(/\n/g, ' '))
await page.keyboard.up('ArrowUp')

// Control deck: press GAS with a pointer and confirm the pressed state lands on
// the button (this is the touch path used by real phones).
const gas = await page.locator('.pad-gas').boundingBox()
await page.mouse.move(gas.x + gas.width / 2, gas.y + gas.height / 2)
await page.mouse.down()
await page.waitForTimeout(500)
const gasDown = await page.locator('.pad-gas').evaluate((el) => el.classList.contains('is-down'))
const gasAria = await page.locator('.pad-gas').getAttribute('aria-pressed')
await page.mouse.up()
await page.waitForTimeout(250)
const gasUp = await page.locator('.pad-gas').evaluate((el) => !el.classList.contains('is-down'))
log('deck gas press:', gasDown, '| aria-pressed:', gasAria, '| released:', gasUp)
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
log('nav after run:', await page.locator('.nav-item.active').getAttribute('data-tab'))
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
