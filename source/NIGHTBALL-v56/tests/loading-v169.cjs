// v169 regression: loading progress display (checker item
// loading-progress-display). Waits that used to look like a freeze — the
// ~9 MB on-demand Tokyo Dome download and match-start preparation — now
// surface in one shared overlay with real or indeterminate progress.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'dist', 'app.js'), 'utf8');
const tokyo = fs.readFileSync(path.join(root, 'dist', 'tokyo-nightball.js'), 'utf8');
const style = fs.readFileSync(path.join(root, 'dist', 'style.css'), 'utf8');
const index = fs.readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'dist', 'sw.js'), 'utf8');

// ---------- static: app-side overlay machinery ----------
assert(app.includes("window.addEventListener('nightball-loading'"), 'app listens for nightball-loading events');
assert(app.includes('const loadingState={prep:false,asset:null'), 'shared loading state exists');
assert(app.includes("label:'試合を準備しています'"), 'match-prep indeterminate label exists');
assert(app.includes('loadingState.prep=true;renderLoading();'), 'activateGame raises the prep indicator');
assert(app.includes('paintLoading') && app.includes('},250)'), 'overlay has the anti-flicker grace period');
assert(app.includes('never re-armed by progress'), 'grace timer is not reset by progress updates');
assert(index.includes('id="loading-overlay"') && index.includes('id="loading-bar"') && index.includes('id="loading-pct"'), 'overlay DOM is in index.html');
assert(style.includes('#loading-overlay') && style.includes('@keyframes loading-slide') && style.includes('#loading-bar.indeterminate'), 'overlay styles incl. indeterminate animation are in style.css');

// ---------- static: the GLB download reports real progress ----------
assert(tokyo.includes("reportLoading({phase:'start'"), 'download start is reported');
assert(tokyo.includes('getReader'), 'download is streamed so progress can be measured');
assert(tokyo.includes("headers.get('Content-Length')"), 'progress fraction uses Content-Length');
assert(tokyo.includes("phase:'progress'"), 'download progress is reported');
assert(tokyo.includes("phase:'decode'"), 'decode phase is reported');
assert(tokyo.includes("reportLoading({phase:'done'})"), 'completion is reported');
assert(tokyo.includes("phase:'error'"), 'failure clears the overlay');

// ---------- version pins (v169) ----------
assert(index.includes('./game.js?v=187') && index.includes('./app.js?v=187'), 'index pins at v169');
assert(index.includes('./style.css?v=77'), 'style.css pin bumped for the overlay styles');
assert(sw.includes('nightball-v187-pitch-directions'), 'SW cache renamed for v169');
assert(sw.includes('./game.js?v=187') && sw.includes('./app.js?v=187') && sw.includes('./style.css?v=77'), 'SW precaches the v169 assets');

console.log('loading-v169: static assertions passed');

// ---------- browser behaviour (393x852) ----------
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.log('loading-v169: playwright unavailable — browser checks skipped, static assertions passed'); return; }
  const dir = resolve(__dirname, '../dist');
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
    '.webp': 'image/webp', '.png': 'image/png', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.woff': 'font/woff' };
  let glbRequests = 0;
  const server = createServer(async (req, res) => {
    const u = new URL(req.url, 'http://localhost');
    const name = decodeURIComponent(u.pathname) === '/' ? '/index.html' : decodeURIComponent(u.pathname);
    const f = resolve(dir, '.' + name);
    if (!f.startsWith(dir + sep)) { res.writeHead(403); res.end(); return; }
    try {
      const data = await readFile(f);
      if (name === '/assets/3d/tokyo-dome-real.glb') {
        // Stream the real GLB slowly so byte progress is observable.
        glbRequests++;
        res.writeHead(200, { 'Content-Type': 'model/gltf-binary', 'Content-Length': data.length, 'Cache-Control': 'no-store' });
        const CHUNK = 512 * 1024;
        for (let off = 0; off < data.length; off += CHUNK) {
          res.write(data.subarray(off, Math.min(data.length, off + CHUNK)));
          await new Promise(r => setTimeout(r, 90));
        }
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': mime[extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--no-sandbox'] });
  try {
    const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:' + port + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => !!window.nightSettings, null, { timeout: 30000 });
    await page.waitForSelector('#loading-overlay', { state: 'attached' });

    const overlay = () => page.evaluate(() => {
      const el = document.getElementById('loading-overlay');
      return { hidden: el.hidden, label: document.getElementById('loading-label').textContent, pct: document.getElementById('loading-pct').textContent };
    });
    let o = await overlay();
    assert(o.hidden, 'overlay starts hidden');

    // Event bridge: a synthetic progress report shows the overlay with %.
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('nightball-loading', { detail: { phase: 'progress', label: '東京ドームを読み込んでいます', fraction: .4 } })));
    await page.waitForFunction(() => !document.getElementById('loading-overlay').hidden, null, { timeout: 8000 });
    o = await overlay();
    assert(o.label.includes('東京ドーム'), 'overlay shows the download label');
    assert.equal(o.pct, '40%', 'overlay shows the reported percentage');
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('nightball-loading', { detail: { phase: 'done' } })));
    await page.waitForFunction(() => document.getElementById('loading-overlay').hidden, null, { timeout: 8000 });

    // Real producer: drive showTokyoDome with a minimal non-software renderer
    // so the actual streamed download runs and reports progress.
    const drivePromise = page.evaluate(async () => {
      const m = await import('./tokyo-nightball.js');
      const renderer = { gl: { isSoftwareRenderer: false, capabilities: { getMaxAnisotropy: () => 1 } }, parkKey: 'tokyo-dome', scene: { add() {} }, canvas: { dataset: {} } };
      m.rememberOriginalGround(renderer, []);
      window.__domeDone = false;
      m.showTokyoDome(renderer).then(() => { window.__domeDone = true; });
    });
    const samples = [];
    const t0 = Date.now();
    while (Date.now() - t0 < 20000) {
      const s = await overlay();
      if (!s.hidden && s.pct) samples.push(parseInt(s.pct, 10));
      if (await page.evaluate(() => window.__domeDone)) break;
      await page.waitForTimeout(200);
    }
    assert(glbRequests >= 1, 'the GLB was actually requested');
    assert(samples.length >= 2, `progress percentages were shown during the real download (samples: ${samples.join(',')})`);
    for (let i = 1; i < samples.length; i++) assert(samples[i] >= samples[i - 1], `progress never goes backwards (${samples.join(',')})`);
    assert(samples[samples.length - 1] > samples[0], 'progress advances during the download');
    await page.waitForFunction(() => document.getElementById('loading-overlay').hidden, null, { timeout: 15000 });
    assert.deepEqual(errors, [], 'no page errors during the loading flow');
    console.log(`loading-v169: browser checks passed (real GLB download progress samples: ${samples.join('%, ')}%)`);
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error('loading-v169 FAILED:', e.message); process.exit(1); });
