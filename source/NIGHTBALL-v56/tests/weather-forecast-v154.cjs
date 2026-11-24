// v154: pre-match weather forecast (checker item "weather-forecast").
// Existing system (verified in code): NightGame decided the weather once
// in its constructor (dome parks always clear, otherwise clear 55% /
// cloudy 30% / rain 15% via Math.random) and it never changed during the
// match; the wind for a normal match was rolled in start() (25% calm,
// otherwise -5..+5 in 0.5 steps, dome parks excluded) while pennant live
// games never rolled wind and used the park's own wind.
// v154 rolls the forecast BEFORE the match with those exact same
// distributions (NightGame.rollForecast) and hands the result to the
// game verbatim (options.weather / options.wind), so the forecast is by
// construction the actual match weather — no divergent "miss" forecast.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
global.window = global;
for (const file of ['ratings-data', 'players', 'pennant', 'apbc-data', 'apbc-candidates', 'apbc-tournament', 'derby', 'game', 'career-leagues', 'career-development', 'career-life', 'career-extras', 'squad', 'career']) {
  vm.runInThisContext(fs.readFileSync(__dirname + '/../dist/' + file + '.js', 'utf8'), { filename: file + '.js' });
}
const park = id => NightPlayers.parks.find(p => p.id === id);
const seq = values => { let i = 0; return () => { assert(i < values.length, 'forecast consumed more random values than expected'); return values[i++]; }; };

// ---------- rollForecast: same distributions as the match itself ----------
let f = NightGame.rollForecast(park('night'), seq([0.9, 0.1]));
assert.deepEqual(f, { weather: 'rain', weatherLabel: '雨', wind: 0, park: 'night' }, 'roll >= .85 is rain; wind roll < .25 is calm');
f = NightGame.rollForecast(park('night'), seq([0.7, 0.5, 0.75]));
assert.deepEqual(f, { weather: 'cloudy', weatherLabel: '曇り', wind: 2.5, park: 'night' }, 'cloudy band and a +2.5 tailwind');
f = NightGame.rollForecast(park('night'), seq([0.2, 0.5, 0.1]));
assert.deepEqual(f, { weather: 'clear', weatherLabel: '晴れ', wind: -4, park: 'night' }, 'clear band and a -4 headwind');
f = NightGame.rollForecast(park('taipei-dome'), () => { throw Error('dome forecast must not roll'); });
assert.deepEqual(f, { weather: 'clear', weatherLabel: '晴れ', wind: 0, park: 'taipei-dome' }, 'dome parks are always clear and windless, without rolling');
f = NightGame.rollForecast(park('night'), seq([0.9]), false);
assert.equal(f.weather, 'rain', 'pennant forecast still rolls the weather');
assert.equal(f.wind, park('night').wind, 'pennant forecast reports the park wind (pennant live games never rolled wind)');

// ---------- NightGame honours a forecast passed in options ----------
const origRandom = Math.random;
Math.random = () => 0; // an unforced game would roll clear with this stub
try {
  const rain = new NightGame('match', 'standard', () => {}, { weather: 'rain', wind: 4.5, park: 'night' });
  assert.equal(rain.weather, 'rain', 'options.weather decides the match weather');
  assert.equal(rain.weatherLabel, '雨');
  assert.equal(rain.wind, 4.5, 'options.wind decides the match wind');
  assert.equal(rain.windNow(), 3.3, 'the rain wind penalty still applies on top of the forecast wind');
  const dome = new NightGame('match', 'standard', () => {}, { weather: 'rain', park: 'taipei-dome' });
  assert.equal(dome.weather, 'clear', 'a dome park stays clear even when a forecast is passed (the forecast itself is clear there)');
  const unforced = new NightGame('match', 'standard', () => {}, { park: 'night' });
  assert.equal(unforced.weather, 'clear', 'without options.weather the constructor roll is unchanged');
  const restored = NightGame.restore(rain.snapshot(), () => {});
  assert.equal(restored.weather, 'rain', 'snapshot/restore keeps the forecast weather');
  assert.equal(restored.wind, 4.5, 'snapshot/restore keeps the forecast wind');
} finally { Math.random = origRandom; }

// ---------- app wiring + version pins ----------
const app = fs.readFileSync(__dirname + '/../dist/app.js', 'utf8');
const setupStart = app.indexOf('function setupMatch(){');
assert(app.slice(setupStart, setupStart + 3000).includes('weatherForecastHTML(ensureMatchForecast())'), 'the match setup screen renders the forecast');
assert(app.includes('weather:forecast?forecast.weather:undefined'), 'start() hands the setup forecast to NightGame');
assert(app.includes('if(forecast)matchForecast=null;'), 'the forecast is consumed when the match starts');
assert(app.includes('const pennantWeather=ensurePennantForecast(f);'), 'playLeague rolls the pennant forecast for the fixture');
assert(app.includes('weather:pennantWeather.weather,wind:pennantWeather.wind'), 'playLeague hands the pennant forecast to NightGame');
assert(app.includes('${weatherForecastHTML(ensurePennantForecast(f))}'), 'the pennant dashboards render the forecast');
assert(app.includes("wf.outerHTML=weatherForecastHTML(ensureMatchForecast())"), 'changing the park on the setup screen refreshes the forecast');
const gameSrc = fs.readFileSync(__dirname + '/../dist/game.js', 'utf8');
assert(gameSrc.includes('static rollForecast('), 'game.js exposes the forecast roller');
const html = fs.readFileSync(__dirname + '/../dist/index.html', 'utf8');
const sw = fs.readFileSync(__dirname + '/../dist/sw.js', 'utf8');
assert(html.includes('./game.js?v=161') && html.includes('./app.js?v=161'), 'index pins at v154');
assert(html.includes('./style.css?v=74') && sw.includes('./style.css?v=74'), 'style.css pin moves with the forecast styles');
assert(sw.includes('nightball-v161-call-banner-band'), 'SW cache renamed for v154');
assert(sw.includes('./game.js?v=161') && sw.includes('./app.js?v=161'), 'SW precaches the v154 scripts');
const style = fs.readFileSync(__dirname + '/../dist/style.css', 'utf8');
assert(style.includes('.weather-forecast{'), 'style.css carries the forecast styles');

console.log('weather-forecast-v154: unit + static assertions passed');

/* ---------- browser E2E (393x852): forecast display == started match ---------- */
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.log('weather-forecast-v154: playwright unavailable in this environment — browser checks skipped, static assertions passed'); return; }
  const dir = resolve(__dirname, '../dist');
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
    '.webp': 'image/webp', '.png': 'image/png', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.woff': 'font/woff' };
  const server = createServer(async (req, res) => {
    const u = new URL(req.url, 'http://localhost');
    const name = decodeURIComponent(u.pathname) === '/' ? '/index.html' : decodeURIComponent(u.pathname);
    const filePath = resolve(dir, '.' + name);
    if (!filePath.startsWith(dir + sep)) { res.writeHead(403); res.end(); return; }
    try { const data = await readFile(filePath); res.writeHead(200, { 'Content-Type': mime[extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data); }
    catch { res.writeHead(404); res.end(); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--no-sandbox'] });
  // Math.random pinned at 0.95: weather roll -> rain, wind calm-roll fails,
  // wind value roll -> +4.5 tailwind. The forecast and the match must agree.
  const stub = page => page.evaluate(() => { Math.random = () => 0.95; });
  const forecastData = page => page.locator('[data-weather-forecast]').first().evaluate(el => ({
    weather: el.dataset.weather, wind: el.dataset.wind, text: el.textContent,
    rect: (() => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width }; })(),
    scrollWidth: el.scrollWidth, clientWidth: el.clientWidth
  }));
  const checkNoOverflow = (fd, label) => {
    assert(fd.rect.left >= -0.5 && fd.rect.right <= 393.5, `${label}: forecast stays inside the 393px viewport (${JSON.stringify(fd.rect)})`);
    assert(fd.scrollWidth <= fd.clientWidth + 1, `${label}: forecast content does not overflow horizontally`);
  };
  try {
    // ----- normal match: setup forecast -> started match -----
    {
      const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto('http://127.0.0.1:' + port + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await stub(page);
      await page.locator('[data-mode="match"]').click();
      await page.locator('[data-action="match-team-next"]').click();
      await page.locator('[data-weather-forecast]').waitFor({ state: 'visible' });
      let fd = await forecastData(page);
      assert.equal(fd.weather, 'rain', 'setup forecast shows rain under the pinned roll');
      assert.equal(fd.wind, '4.5', 'setup forecast shows the +4.5 wind');
      assert(fd.text.includes('天気予報') && fd.text.includes('雨') && fd.text.includes('追い風 4.5 m'), 'forecast text carries label and wind: ' + fd.text);
      checkNoOverflow(fd, 'match setup');
      // Re-rendering the setup screen (innings change) keeps the same forecast.
      await page.locator('[data-innings="3"]').click();
      await page.locator('[data-weather-forecast]').waitFor({ state: 'visible' });
      fd = await forecastData(page);
      assert.equal(fd.weather, 'rain', 'forecast is stable across setup re-renders');
      assert.equal(fd.wind, '4.5', 'forecast wind is stable across setup re-renders');
      // Switching to a dome park refreshes the forecast to clear / calm.
      await page.locator('#park-select').selectOption('taipei-dome');
      fd = await forecastData(page);
      assert.equal(fd.weather, 'clear', 'dome park forecast is clear');
      assert.equal(fd.wind, '0', 'dome park forecast is calm');
      await page.locator('#park-select').selectOption('night');
      fd = await forecastData(page);
      assert.equal(fd.weather, 'rain', 'switching back re-rolls the forecast for the park');
      // Start the match: the in-game weather display must equal the forecast.
      await page.locator('[data-action="match-lineup"]').click();
      await page.locator('[data-action="lineup-play"]').click();
      await page.locator('#game').waitFor({ state: 'visible' });
      await page.waitForFunction(() => document.querySelector('#rain-overlay') && !document.querySelector('#rain-overlay').hidden, null, { timeout: 10000 });
      const hud = await page.evaluate(() => ({
        windLabel: document.querySelector('#wind-hud').getAttribute('aria-label'),
        rainHidden: document.querySelector('#rain-overlay').hidden,
        batter: document.querySelector('#batter-label').textContent
      }));
      assert.equal(hud.windLabel, '追い風 4.5 m', 'in-game wind HUD equals the forecast wind');
      assert.equal(hud.rainHidden, false, 'rain overlay is on: the started match is rainy, as forecast');
      assert(hud.batter.includes('雨'), 'batter label shows the rain label, as forecast');
      assert.deepEqual(errors, [], 'no page errors during the match forecast flow');
      await context.close();
      console.log('weather-forecast-v154: match E2E passed (setup forecast rain / +4.5 == started match)');
    }
    // ----- pennant: dashboard forecast -> started live game -----
    {
      const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto('http://127.0.0.1:' + port + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await stub(page);
      await page.locator('#pennant-mode').click();
      await page.locator('[data-league-action="create"]').click();
      await page.locator('.league-match-card [data-weather-forecast]').waitFor({ state: 'visible', timeout: 15000 });
      const fd = await forecastData(page);
      assert.equal(fd.weather, 'rain', 'pennant pre-match forecast shows rain under the pinned roll');
      assert.equal(fd.wind, '0', 'pennant forecast reports the park wind (0 for the default parks)');
      assert(fd.text.includes('天気予報') && fd.text.includes('雨'), 'pennant forecast text: ' + fd.text);
      checkNoOverflow(fd, 'pennant dashboard');
      await page.locator('[data-league-action="play"]').click();
      await page.locator('[data-action="lineup-play"]').click();
      await page.locator('#game').waitFor({ state: 'visible' });
      await page.waitForFunction(() => document.querySelector('#rain-overlay') && !document.querySelector('#rain-overlay').hidden, null, { timeout: 10000 });
      const hud = await page.evaluate(() => ({
        windLabel: document.querySelector('#wind-hud').getAttribute('aria-label'),
        rainHidden: document.querySelector('#rain-overlay').hidden,
        batter: document.querySelector('#batter-label').textContent
      }));
      assert.equal(hud.rainHidden, false, 'the pennant live game is rainy, as forecast');
      assert.equal(hud.windLabel, '無風', 'the pennant live game wind equals the forecast (park wind)');
      assert(hud.batter.includes('雨'), 'pennant batter label shows the rain label, as forecast');
      assert.deepEqual(errors, [], 'no page errors during the pennant forecast flow');
      await context.close();
      console.log('weather-forecast-v154: pennant E2E passed (dashboard forecast rain / park wind == started live game)');
    }
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
