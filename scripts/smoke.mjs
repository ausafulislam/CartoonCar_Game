import { chromium } from 'playwright-core'

const base = 'http://localhost:5173'
const errors = []
const executablePath = process.env.CHROMIUM_PATH || undefined
// The background-throttling flags keep headless Chrome from slowing requestAnimationFrame
// to ~1 fps (which stretches Phaser's countdown timer and makes this test flaky).
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
const page = await browser.newPage({ viewport: { width: 430, height: 880 }, deviceScaleFactor: 1 })
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

const shot = (n) => page.screenshot({ path: `test-shots/${n}.png` })
const log = (...a) => console.log(...a)

// Real assertions: a suite that only logs can "pass" while everything is broken.
const failures = []
const check = (name, ok, extra = '') => {
  if (ok) { log('ok  -', name); return }
  failures.push(name + (extra ? ` (${extra})` : ''))
  log('FAIL-', name, extra)
}

await page.goto(base, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /LEVEL 1/i }).waitFor({ timeout: 15000 })
await page.waitForTimeout(900)
await shot('01-home')
const homeTitle = await page.title()
const navCount = await page.locator('.nav-item').count()
log('home ok; title =', homeTitle)
check('home screen renders with the 5-tab navigation', homeTitle === 'Cartoon Car Adventure' && navCount === 5, `nav=${navCount}`)

// Level intro
await page.getByRole('button', { name: /LEVEL 1/i }).click()
await page.getByRole('button', { name: /^Play$/ }).waitFor({ timeout: 8000 })
await page.waitForTimeout(400)
await shot('02-level-intro')
log('intro ok')

// Start game
await page.getByRole('button', { name: /^Play$/ }).click()
// The scene object appears as soon as the lazy-loaded Phaser chunk is up; on
// software-rendered headless machines that can take a while, so wait for it
// first instead of racing the control deck selector.
await page.waitForFunction(() => !!window.__ccaGame?.scene?.keys?.RacingScene, null, { timeout: 45000 })
await page.waitForSelector('.control-deck', { timeout: 30000 })
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
const runState = await page.evaluate(() => window.__ccaGame?.scene?.keys?.RacingScene?.state)
check('the race actually starts (Phaser scene playing)', runState === 'playing', `state=${runState}`)
check('HUD shows the level objective and a live speed', /\/\s*1,200\s*m/.test(hud1) && /\d/.test(dial1), `hud=${hud1.replace(/\n/g, ' ')} dial=${dial1.replace(/\n/g, ' ')}`)
const deckCount = await page.locator('.control-deck').count()
check('touch control deck is on screen', deckCount === 1, `deck=${deckCount}`)
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
check('gas pad presses and releases (touch path)', gasDown && gasAria === 'true' && gasUp,
  `down=${gasDown} aria=${gasAria} up=${gasUp}`)
await page.keyboard.down('ArrowLeft')
await page.waitForTimeout(700)
await page.keyboard.up('ArrowLeft')
await page.waitForTimeout(2200)
await shot('05-gameplay2')
const hud2 = await page.locator('.objective-label').innerText()
log('later; objective:', hud2.replace(/\n/g, ' '))
check('the car is moving (distance grows)', hud1 !== hud2, `${hud1.replace(/\n/g, ' ')} -> ${hud2.replace(/\n/g, ' ')}`)

// Pause via keyboard
await page.keyboard.press('p')
await page.getByRole('button', { name: /Keep driving/i }).waitFor({ timeout: 8000 })
await page.waitForTimeout(350)
await shot('06-pause')
log('pause ok')

// Exit to home
await page.getByRole('button', { name: /Back to home/i }).click()
await page.getByRole('button', { name: /LEVEL/i }).first().waitFor({ timeout: 8000 })
const activeTab = await page.locator('.nav-item.active').getAttribute('data-tab')
log('nav after run:', activeTab)
check('exiting a run returns to Home', activeTab === 'home', `tab=${activeTab}`)
const save = await page.evaluate(() => localStorage.getItem('cartoon-car-adventure-save-v1'))
log('save persisted:', save ? 'yes' : 'no', save ? ('hearts=' + JSON.parse(save).hearts + ' runs=' + JSON.parse(save).stats.runs) : '')
check('the run was saved', !!save && JSON.parse(save).stats.runs === 1, save ? `runs=${JSON.parse(save).stats.runs}` : 'no save')

// Tabs
for (const [tab, name] of [['Garage', '07-garage'], ['Shop', '08-shop'], ['Trophies', '09-trophies'], ['Settings', '10-settings']]) {
  await page.getByRole('button', { name: tab, exact: true }).click()
  await page.waitForTimeout(550)
  await shot(name)
  const tabActive = await page.locator('.nav-item.active').getAttribute('data-tab')
  log('tab ok:', tab)
  check(`${tab} tab opens`, tabActive === tab.toLowerCase(), `active=${tabActive}`)
}
// Settings footer: the version badge and the builder credit (acceptance criteria).
const versionLine = await page.locator('.version-line').innerText()
const creditHref = await page.locator('.build-credit').getAttribute('href')
const creditText = (await page.locator('.build-credit').innerText()).replace(/\s+/g, ' ')
log('settings footer:', versionLine, '|', creditText, '|', creditHref)
check('Settings shows the version and the built-by credit',
  /v1\.1/.test(versionLine) && /Built by Ausaf/i.test(creditText) && creditHref === 'https://ausafulislam.vercel.app',
  `version="${versionLine}" credit="${creditText}" href=${creditHref}`)

await page.getByRole('button', { name: 'Home', exact: true }).click()
await page.waitForTimeout(500)
await shot('11-home-again')

check('no console errors', errors.length === 0, errors.join(' | '))
log('ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
log(failures.length ? `\n${failures.length} CHECK(S) FAILED` : '\nall checks passed')
await browser.close()
if (failures.length) process.exitCode = 1
