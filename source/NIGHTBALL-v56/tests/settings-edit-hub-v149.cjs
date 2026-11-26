// v227: the v149 edit accordion is superseded by the home edit mode.
// Verify the real editor implementations are still present, and use the
// optional full app browser check to exercise entry/return navigation.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dist=path.resolve(__dirname,'../dist'),read=f=>fs.readFileSync(path.join(dist,f),'utf8');
const app=read('app.js'),html=read('index.html');
for(const [file,marker] of [['stadium-editor.js','NightStadium'],['league-editor.js','NightLeague'],['uniform-editor.js','NightUniforms'],['share-codes.js','NightShare']]){
 assert(read(file).includes(marker));assert(html.includes(file));
}
assert(app.includes("case'stadium-share-import'")&&app.includes("case'league-share-import'"),'share codes remain available');
assert(app.includes("data-league-action=\"league-editor\">＋ カスタムリーグを作成"),'contextual pennant shortcut remains');
assert(app.includes("$('menu-team-edit').onclick=editHubModal;"));
assert(app.includes("if(kind==='team')lineupModal('edit')")&&app.includes("else if(kind==='uniform')uniformModal()")&&app.includes("else if(kind==='stadium')stadiumEditorModal()")&&app.includes("else if(kind==='league')editLeagueList()"));
console.log('PASS: existing real editors and share codes, centralized home entry');
// ---------- browser behaviour (393px) ----------
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, join, extname, sep } = require('node:path');

if(process.argv.includes('--browser')) (async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.log('settings-edit-hub-v149: playwright unavailable in this environment — browser checks skipped, static assertions passed'); return; }
  const dir = resolve(__dirname, '../dist');
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
    '.webp': 'image/webp', '.png': 'image/png', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.woff': 'font/woff' };
  const server = createServer(async (req, res) => {
    const u = new URL(req.url, 'http://localhost');
    const name = decodeURIComponent(u.pathname) === '/' ? '/index.html' : decodeURIComponent(u.pathname);
    const f = resolve(dir, '.' + name);
    if (!f.startsWith(dir + sep)) { res.writeHead(403); res.end(); return; }
    try { const data = await readFile(f); res.writeHead(200, { 'Content-Type': mime[extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data); }
    catch { res.writeHead(404); res.end(); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}), args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--no-sandbox'] });
  try {
    const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:' + port + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => !!document.querySelector('#game-canvas')?.dataset.graphics, { timeout: 20000 });


    const kind=async k=>page.waitForFunction(k=>document.querySelector('#modal-content').dataset.kind===k&&!document.querySelector('#modal').hidden,k);
    await page.click('#menu-settings');await kind('settings');
    assert.deepEqual(await page.locator('[data-settings-section]').evaluateAll(els=>els.map(e=>e.dataset.settingsSection)),['game','controls','display','sound','system']);
    assert.equal(await page.locator('[data-settings-scope]').getAttribute('data-settings-scope'),'home');
    await page.click('[data-settings-section="sound"]');
    assert(await page.locator('[data-music-volume="cheer"]').isVisible());
    await page.locator('#modal-content .close-button').click();
    await page.click('#menu-team-edit');await kind('edit-hub');
    assert.equal(await page.locator('.edit-hub-tile').count(),5);
    await page.click('[data-editor="team"]');await kind('lineup');
    await page.locator('[data-action="editor-done"]').click();await kind('edit-hub');
    await page.click('[data-editor="uniform"]');await kind('uniform');
    await page.locator('#modal-content .close-button').click();await kind('edit-hub');
    await page.click('[data-editor="stadium"]');await kind('stadium-editor');
    assert.equal(await page.locator('[data-action="stadium-back"]').textContent(),'戻る');
    await page.locator('[data-action="stadium-back"]').click();await kind('edit-hub');
    await page.click('[data-editor="music"]');await kind('music-settings');
    assert.equal(await page.locator('[data-music-volume]').count(),0);
    assert(await page.locator('[data-song-slot]').count()>0);
    await page.locator('[data-action="music-back"]').click();await kind('edit-hub');
    await page.click('[data-editor="league"]');await kind('edit-leagues');
    await page.click('[data-action="edit-league-new"]');
    await page.waitForSelector('#league-name-input');
    await page.fill('#league-name-input','Test League v227');
    await page.click('[data-league-action="league-editor-save"]');await kind('edit-leagues');
    assert(await page.locator('[data-action="edit-league-existing"]').filter({hasText:'Test League v227'}).isVisible());
    await page.locator('[data-action="edit-league-existing"]').filter({hasText:'Test League v227'}).click();
    await page.waitForSelector('#league-name-input');
    assert.equal(await page.locator('#league-name-input').inputValue(),'Test League v227');
    await page.click('[data-league-action="picker"]');await kind('edit-leagues');
    await page.locator('#modal-content .close-button').click();await kind('edit-hub');
    await page.locator('#modal-content .close-button').click();
    await page.click('#home [data-mode="match"]');await kind('setup');
    await page.click('[data-action="ui-match-start"]');await page.waitForSelector('#game:not([hidden])');
    await page.click('#settings');await kind('settings');
    assert.equal(await page.locator('[data-settings-scope]').getAttribute('data-settings-scope'),'match');
    assert.deepEqual(await page.locator('[data-settings-section]').evaluateAll(els=>els.map(e=>e.dataset.settingsSection)),['controls','display','sound','speed','running']);
    assert.equal(await page.locator('[data-difficulty], [data-action="backup-import"], [data-action="edit-hub-open"]').count(),0);
    await page.locator('#modal-content .close-button').click();
    assert(!errors.length,'no page errors: '+errors.join(' | '));
    console.log('PASS: all five edit entries/return paths, saved league, home and in-game settings on mobile Chromium');
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
