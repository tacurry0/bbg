// v153: match presets capture the variant rules + random roster
// (checker item "preset-variant-gap").
// The v130 preset key list was fixed before v132 (random roster,
// settings.randomRoster) and v133 (variant rules, settings keys
// variantFullCount / variantMetalBat / variantNoBreaking /
// variantTwoOuts) existed, so saving a preset silently dropped those
// five toggles and applying one left them at whatever the live settings
// happened to hold. v153 adds all five keys to the preset snapshot /
// apply path. Pre-v153 presets carry none of the five keys: they must
// apply without error and must NOT clobber the live values of those
// toggles (the cleaned values omit absent optional keys, so the apply
// Object.assign never touches them). A key that is present but not a
// boolean still falls back to false, like any other malformed field.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
global.window=global;
const store=new Map();
global.localStorage={
 getItem:k=>store.has(k)?store.get(k):null,
 setItem:(k,v)=>store.set(k,String(v)),
 removeItem:k=>store.delete(k),
};
for(const file of ['ratings-data.js','players.js','pro-parks.js','stadium-editor.js','pennant.js','apbc-data.js','npb-data.js','npb-rosters.js','kbo-data.js','kbo-rosters.js','match-presets.js'])
 vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/'+file,'utf8'),{filename:file});
const P=global.NightMatchPresets;
assert(P,'NightMatchPresets module loads');
const KEYS=['randomRoster','variantFullCount','variantMetalBat','variantLowReboundBat','variantNoBreaking','variantTwoOuts'];
assert.deepEqual(P.OPTIONAL_BOOL_KEYS,KEYS,'the six post-v130 toggles are the optional boolean keys');
assert.deepEqual(P.VARIANT_KEYS,KEYS.slice(1),'the five variant-rule keys are exposed (v180 adds the low-rebound bat)');
for(const k of KEYS)assert(P.FIELDS.includes(k),`FIELDS includes ${k}`);

function memStorage(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),_map:m};}
const ctx=()=>({teamIds:[...NightTeams.matchTeams.map(c=>c.id),'dream'],parkIds:NightPlayers.parks.map(p=>p.id),defaults:{matchTeam:'owls',matchOpponent:'foxes',park:'night'}});
const base={matchTeam:'npb-g',matchOpponent:'owls',matchUserHome:false,innings:9,park:'tokyo-dome',gameLighting:'day',difficulty:'pro',customDifficulty:{bat:3,pitch:-2,field:0,run:7},defenseSpeed:2,fieldSpeed:2,manualRunning:false,battingAssist:false,tiebreak:true,pitcher:0};

// ---------- save -> change -> apply restores all five keys ----------
const storage=memStorage();
const onSettings={...base,randomRoster:true,variantFullCount:true,variantMetalBat:true,variantLowReboundBat:true,variantNoBreaking:true,variantTwoOuts:true};
const saved=P.add('変則フルセット',P.snapshot(onSettings,1),storage);
for(const k of KEYS)assert.equal(saved.values[k],true,`snapshot captures ${k}`);
const rawStored=JSON.parse(storage.getItem(P.KEY));
for(const k of KEYS)assert.equal(rawStored[0].values[k],true,`stored JSON carries ${k}`);
// The live settings move on after saving…
const live={...base,innings:3,randomRoster:false,variantFullCount:false,variantMetalBat:false,variantLowReboundBat:false,variantNoBreaking:false,variantTwoOuts:false};
// …and applying the preset (the app's Object.assign path) restores them.
Object.assign(live,P.sanitizeValues(P.get(saved.id,storage).values,ctx()));
for(const k of KEYS)assert.equal(live[k],true,`apply restores ${k}`);
assert.equal(live.innings,9,'apply still restores the classic fields');
// Explicit OFF values are stored as OFF, not dropped.
const offSaved=P.add('変則なし',P.snapshot({...base,randomRoster:false,variantFullCount:false,variantMetalBat:true,variantLowReboundBat:false,variantNoBreaking:false,variantTwoOuts:false},0),storage);
const offLoaded=P.get(offSaved.id,storage);
for(const k of KEYS)assert(k in offLoaded.values,`explicit value for ${k} survives the storage round trip`);
assert.equal(offLoaded.values.variantMetalBat,true);
assert.equal(offLoaded.values.randomRoster,false,'explicit randomRoster OFF is kept');
const live2={...live};
Object.assign(live2,P.sanitizeValues(offLoaded.values,ctx()));
assert.equal(live2.randomRoster,false,'applying an OFF preset turns the toggle back off');
assert.equal(live2.variantFullCount,false);
assert.equal(live2.variantMetalBat,true,'mixed ON/OFF combinations restore exactly');

// ---------- pre-v153 preset: no optional keys, live values preserved ----------
const oldStorage=memStorage();
const oldValues={matchTeam:'owls',matchOpponent:'foxes',matchUserHome:true,innings:3,park:'night',gameLighting:'auto',pitcher:0,difficulty:'standard',customDifficulty:{bat:0,pitch:0,field:0,run:0},defenseSpeed:1,fieldSpeed:1,manualRunning:true,battingAssist:true,tiebreak:false};
oldStorage.setItem(P.KEY,JSON.stringify([{id:'preset-old',name:'旧形式',values:oldValues}]));
const oldLoaded=P.load(oldStorage);
assert.equal(oldLoaded.length,1,'old-format preset still loads');
for(const k of KEYS)assert(!(k in oldLoaded[0].values),`old preset values omit ${k} instead of inventing a value`);
const liveOld={...base,randomRoster:true,variantFullCount:true,variantMetalBat:false,variantLowReboundBat:true,variantNoBreaking:true,variantTwoOuts:false};
assert.doesNotThrow(()=>Object.assign(liveOld,P.sanitizeValues(oldLoaded[0].values,ctx())),'applying an old preset does not throw');
for(const k of KEYS)assert.equal(liveOld[k],{randomRoster:true,variantFullCount:true,variantMetalBat:false,variantLowReboundBat:true,variantNoBreaking:true,variantTwoOuts:false}[k],`old preset preserves the live ${k}`);
assert.equal(liveOld.innings,3,'old preset still applies the fields it does carry');
// Present-but-malformed optional values fall back to false (not preserved, not kept raw).
const malformed=P.cleanValues({randomRoster:'yes',variantFullCount:1,variantMetalBat:null});
assert.equal(malformed.randomRoster,false,'non-boolean randomRoster falls back to false');
assert.equal(malformed.variantFullCount,false,'non-boolean variantFullCount falls back to false');
assert.equal(malformed.variantMetalBat,false,'null variantMetalBat falls back to false');
assert(!('variantNoBreaking' in malformed),'a wholly absent key stays absent');

// ---------- app wiring + version pins ----------
const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
const applyStart=app.indexOf('function applyMatchPreset(id){');
assert(applyStart>0);
const applyBody=app.slice(applyStart,applyStart+1400);
assert(applyBody.includes('Object.assign(settings,values)'),'apply writes the preset values into the live settings');
assert(applyBody.includes('if(settings.randomRoster!==hadRandomRoster)randomMatch=null;'),'a random-roster flip on apply drops the drawn roster like the toggle handler');
assert(applyBody.includes('setupMatch()'),'apply re-renders the setup screen, so the toggle display reflects the restored values');
const setupStart=app.indexOf('function setupMatch(){');
const setupBody=app.slice(setupStart,setupStart+2600);
assert(setupBody.includes('data-toggle="randomRoster"'),'setup screen renders the random roster toggle from settings');
for(const k of KEYS.slice(1))assert(setupBody.includes(`'${k}'`),'setup screen renders the '+k+' toggle from settings');
assert(setupBody.includes("settings[v]?'on':''"),'variant toggles render their on state from the live settings');
const html=fs.readFileSync(__dirname+'/../dist/index.html','utf8');
const sw=fs.readFileSync(__dirname+'/../dist/sw.js','utf8');
assert(html.includes('./match-presets.js?v=3'),'page loads the v153 presets module');
assert(sw.includes('./match-presets.js?v=3'),'service worker precaches the v153 presets module');
assert(html.includes('./game.js?v=193')&&html.includes('./app.js?v=193'),'index pins at v153');
assert(sw.includes('nightball-v193-derby-bracket'),'SW cache renamed for v153');
assert(sw.includes('./game.js?v=193')&&sw.includes('./app.js?v=193'),'SW precaches the v153 scripts');

console.log('preset-variant-v153: module + static assertions passed');

// The browser flow drives the five toggles that can be ON at the
// same time. The sixth key, variantLowReboundBat, is exclusive
// with the metal bat by design (v180): clicking it ON turns the
// metal bat OFF, so it cannot join an all-ON flow; its own
// preset round trip is covered by low-rebound-v180.cjs.
const E2E_KEYS=KEYS.filter(k=>k!=='variantLowReboundBat');
/* ---------- browser E2E (393x852): save, change, apply, old format ---------- */
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.log('preset-variant-v153: playwright unavailable in this environment — browser checks skipped, static assertions passed'); return; }
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
  const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--no-sandbox'] });
  try {
    const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const openSetup = async () => {
      await page.locator('[data-mode="match"]').click();
      await page.locator('[data-action="match-team-next"]').click();
      await page.locator('[data-toggle="randomRoster"]').waitFor({ state: 'visible' });
    };
    const toggleStates = () => page.evaluate(keys => {
      const out = {};
      for (const k of keys) {
        const el = document.querySelector(`[data-toggle="${k}"]`);
        out[k] = el ? { on: el.classList.contains('on'), checked: el.getAttribute('aria-checked') } : null;
      }
      return out;
    }, E2E_KEYS);
    const savedSettings = () => page.evaluate(() => JSON.parse(localStorage.getItem('nightball.settings') || '{}'));

    await page.goto('http://127.0.0.1:' + port + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await openSetup();
    // Turn the five co-existable toggles ON and save them as a preset.
    for (const k of E2E_KEYS) await page.locator(`[data-toggle="${k}"]`).click();
    let states = await toggleStates();
    for (const k of E2E_KEYS) assert.deepEqual(states[k], { on: true, checked: 'true' }, `${k} toggle shows ON before saving`);
    await page.locator('#match-preset-name').fill('変則テスト');
    await page.locator('[data-action="match-preset-save"]').click();
    await page.locator('[data-match-preset]').first().waitFor({ state: 'visible' });
    const storedPresets = await page.evaluate(() => JSON.parse(localStorage.getItem('nightball.matchPresets') || '[]'));
    assert.equal(storedPresets.length, 1, 'one preset was stored');
    for (const k of E2E_KEYS) assert.equal(storedPresets[0].values[k], true, `stored preset carries ${k}=true`);
    // Change every toggle back OFF, then apply the preset.
    for (const k of E2E_KEYS) await page.locator(`[data-toggle="${k}"]`).click();
    states = await toggleStates();
    for (const k of E2E_KEYS) assert.deepEqual(states[k], { on: false, checked: 'false' }, `${k} toggle shows OFF after changing`);
    await page.locator('[data-match-preset]').first().click();
    states = await toggleStates();
    for (const k of E2E_KEYS) assert.deepEqual(states[k], { on: true, checked: 'true' }, `applying the preset restores the ${k} toggle display`);
    let settings = await savedSettings();
    for (const k of E2E_KEYS) assert.equal(settings[k], true, `applying the preset restores settings.${k}`);

    // Old-format preset (values without the five keys), written straight
    // into storage as a pre-v153 build would have left it. After a reload
    // its row appears in the list; applying it must not error and must
    // leave all five live toggles untouched while its own fields apply.
    await page.evaluate(old => {
      localStorage.setItem('nightball.matchPresets', JSON.stringify([{ id: 'preset-old', name: '旧形式', values: old }]));
    }, oldValues);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await openSetup();
    await page.locator('[data-match-preset]').first().click();
    states = await toggleStates();
    for (const k of E2E_KEYS) assert.deepEqual(states[k], { on: true, checked: 'true' }, `old-format preset preserves the ${k} toggle display`);
    settings = await savedSettings();
    for (const k of E2E_KEYS) assert.equal(settings[k], true, `old-format preset preserves settings.${k}`);
    assert.equal(settings.innings, 3, 'old-format preset still applies its own fields (innings)');
    assert.deepEqual(errors, [], 'no page errors during the whole preset flow');
    console.log('preset-variant-v153: browser E2E passed (save/change/apply restores the preset toggles and their display; old-format preset preserves live values)');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
