// v182: online matches share the normal match setup. The host lobby
// offers the same variant rules (full count / metal bat / low-rebound
// bat / no breaking balls / two outs), the same handicap (head-start
// runs and asymmetric outs), hardcore, tiebreak and a starting-pitcher
// pick; the host's choices travel in the start message and are applied
// identically on both engines. The handicap crosses the wire in
// ABSOLUTE home/away terms so its meaning can never flip between the
// host and the guest. The engine gates that used to reject every
// remoteSide game now accept only the explicit onlineMatch opt-in set
// by the two online starters in app.js; umpire / career / spectate and
// the career-world remote path stay blocked exactly as before.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
global.window = global;
for (const file of ['ratings-data', 'players', 'pennant', 'game']) {
  vm.runInThisContext(fs.readFileSync(__dirname + '/../dist/' + file + '.js', 'utf8'), { filename: file + '.js' });
}
const gameSrc = fs.readFileSync(__dirname + '/../dist/game.js', 'utf8');
const app = fs.readFileSync(__dirname + '/../dist/app.js', 'utf8');

// ---------- source guards ----------
{
  const variantGate = gameSrc.split('static normalizeVariantRules')[1].split('static normalizeHandicap')[0];
  assert(variantGate.includes('options.onlineMatch'), 'variant gate has the onlineMatch opt-in');
  assert(variantGate.includes('options.umpire') && variantGate.includes('options.career'), 'variant gate keeps umpire/career blocks');
  const handicapGate = gameSrc.split('static normalizeHandicap')[1].split('static normalizeTimeAttack')[0];
  assert(handicapGate.includes('options.onlineMatch'), 'handicap gate has the onlineMatch opt-in');
  assert(handicapGate.includes('options.timeAttack') && handicapGate.includes('options.competition'), 'handicap gate keeps its other blocks');

  assert(app.includes('function onlineRulesConfig()'), 'app builds the wire rules from settings');
  assert(app.includes('function onlineHandicapWire()'), 'app builds the absolute home/away handicap');
  assert(app.includes('function onlineHandicapLocal('), 'app converts the wire handicap per side');
  assert(app.includes('onlineMatch:true'), 'both online starters opt in explicitly');
  assert(app.split('onlineMatch:true').length - 1 >= 2, 'host AND guest starters opt in');
  assert(app.includes("rules:onlineRulesConfig()"), 'start message carries the rules');
  assert(app.includes('handicap:onlineHandicapWire()'), 'start message carries the absolute handicap');
  assert(app.includes('hostPitcher:'), 'start message carries the host starter');
  assert(app.includes("m.t==='lobby-config'"), 'guest receives the lobby config summary');
  assert(app.includes('data-online-handicap="userRuns:'), 'host lobby offers handicap segmented controls');
  assert(app.includes('data-online-handicap="cpuOuts:'), 'host lobby offers opponent outs handicap');
  assert(app.includes('id="online-starter-select"'), 'lobby offers a starting-pitcher select');
  const index = fs.readFileSync(__dirname + '/../dist/index.html', 'utf8');
  const sw = fs.readFileSync(__dirname + '/../dist/sw.js', 'utf8');
  assert(index.includes('./game.js?v=193') && index.includes('./app.js?v=193'), 'index pins at v182');
  assert(sw.includes("'nightball-v193-derby-bracket'"), 'service worker cache at v182');
}

// ---------- engine gates ----------
{
  const rules = { fullCount: true, metalBat: true, lowReboundBat: false, noBreaking: false, twoOuts: false };
  const off = NightGame.normalizeVariantRules('match', { remoteSide: 'away', variantRules: rules });
  assert(Object.values(off).every(v => v === false), 'remoteSide without the opt-in still blocks variant rules');
  const on = NightGame.normalizeVariantRules('match', { remoteSide: 'away', onlineMatch: true, variantRules: rules });
  assert(on.metalBat === true && on.fullCount === true, 'onlineMatch opt-in lets the rules through');
  const ump = NightGame.normalizeVariantRules('match', { remoteSide: 'away', onlineMatch: true, umpire: true, variantRules: rules });
  assert(Object.values(ump).every(v => v === false), 'umpire mode stays blocked even with the opt-in');
  const car = NightGame.normalizeVariantRules('match', { onlineMatch: true, career: true, variantRules: rules });
  assert(Object.values(car).every(v => v === false), 'career stays blocked even with the opt-in');

  const wire = { userRuns: 1, cpuRuns: 2, userOuts: 2, cpuOuts: 4 };
  assert.equal(NightGame.normalizeHandicap('match', { remoteSide: 'away', handicap: wire }), null, 'remoteSide without the opt-in still blocks handicap');
  const hon = NightGame.normalizeHandicap('match', { remoteSide: 'away', onlineMatch: true, handicap: wire });
  assert.deepEqual(hon, wire, 'online handicap accepts the full 2..4 outs range on both sides');
  assert.equal(NightGame.normalizeHandicap('match', { onlineMatch: true, umpire: true, handicap: wire }), null, 'umpire stays blocked');
  assert.equal(NightGame.normalizeHandicap('match', { onlineMatch: true, competition: 'x', handicap: wire }), null, 'competition stays blocked');
  const offline = NightGame.normalizeHandicap('match', { handicap: { userRuns: 0, cpuRuns: 0, userOuts: 2, cpuOuts: 4 } });
  assert.equal(offline, null, 'offline mapping is unchanged: userOuts 2 / cpuOuts 4 collapse to defaults (no handicap)');
}

// ---------- host/guest pair built from one wire config ----------
{
  const rules = { fullCount: true, metalBat: true, lowReboundBat: false, noBreaking: false, twoOuts: false };
  // Absolute wire handicap: home +2 runs and 4 outs, away +1 run and 2 outs.
  const host = new NightGame('match', 'standard', () => {}, {
    userHome: true, remoteSide: 'away', onlineMatch: true, variantRules: rules,
    handicap: { userRuns: 2, cpuRuns: 1, userOuts: 4, cpuOuts: 2 },
  });
  const guest = new NightGame('match', 'standard', () => {}, {
    userHome: false, onlineMatch: true, variantRules: rules,
    handicap: { userRuns: 1, cpuRuns: 2, userOuts: 2, cpuOuts: 4 },
  });
  for (const [label, g] of [['host', host], ['guest', guest]]) {
    assert.equal(g.homeScore, 2, label + ': home head-start runs applied');
    assert.equal(g.awayScore, 1, label + ': away head-start runs applied');
    assert.equal(g.balls, 2, label + ': full-count start (balls)');
    assert.equal(g.strikes, 2, label + ': full-count start (strikes)');
    assert.equal(g.variantRules.metalBat, true, label + ': metal bat active');
    // Top of the 1st: the AWAY side bats and gets 2 outs on both engines.
    assert.equal(g.outsNeeded, 2, label + ': away batting outs match');
  }
  host.changeHalf(); guest.changeHalf();
  assert.equal(host.outsNeeded, 4, 'host: home batting gets 4 outs');
  assert.equal(guest.outsNeeded, 4, 'guest: home batting gets 4 outs');
  assert.equal(host.balls, 2, 'host: full count also opens the new half');
  assert.equal(guest.balls, 2, 'guest: full count also opens the new half');

  const two = { fullCount: false, metalBat: false, lowReboundBat: false, noBreaking: false, twoOuts: true };
  const h2 = new NightGame('match', 'standard', () => {}, { userHome: true, remoteSide: 'away', onlineMatch: true, variantRules: two });
  const g2 = new NightGame('match', 'standard', () => {}, { userHome: false, onlineMatch: true, variantRules: two });
  assert.equal(h2.outsNeeded, 2, 'two-outs rule: host');
  assert.equal(g2.outsNeeded, 2, 'two-outs rule: guest');
}

// ---------- browser: full lobby -> start flow on the FakePeer stub ----------
(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.log('online-rules-v182: playwright unavailable — browser checks skipped, static + engine assertions passed'); return; }
  const { createServer } = require('node:http');
  const { readFile } = require('node:fs/promises');
  const { extname, resolve, sep } = require('node:path');
  const dir = resolve(__dirname, '../dist');
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
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
  const CHAN = 'nightball-v182-test-' + Math.random().toString(36).slice(2, 9);
  const initScript = `
    window.__bcLog = [];
    const CHAN = ${JSON.stringify(CHAN)};
    let connSeq = 0;
    class FakeConn {
      constructor(localPeer, remoteId, cid) { this.localPeer = localPeer; this.remoteId = remoteId; this.cid = cid; this._h = {}; }
      on(ev, fn) { (this._h[ev] ??= []).push(fn); return this; }
      _emit(ev, ...args) { for (const f of this._h[ev] || []) f(...args); }
      send(data) { window.__bcLog.push(data); this.localPeer._post({ kind: 'data', cid: this.cid, to: this.remoteId, data }); }
      close() { this._emit('close'); this.localPeer._post({ kind: 'conn-close', cid: this.cid, to: this.remoteId }); }
    }
    class FakePeer {
      constructor(id) {
        this.id = typeof id === 'string' ? id : 'guest-' + Math.random().toString(36).slice(2, 10);
        this._h = {}; this._conns = new Map(); this._known = new Set(); this.destroyed = false;
        this._bc = new BroadcastChannel(CHAN);
        this._bc.onmessage = e => this._onMsg(e.data);
        this._post({ kind: 'hello' }); this._post({ kind: 'register' });
        setTimeout(() => this._emit('open', this.id), 25);
      }
      on(ev, fn) { (this._h[ev] ??= []).push(fn); return this; }
      _emit(ev, ...args) { for (const f of this._h[ev] || []) f(...args); }
      _post(msg) { if (!this.destroyed) try { this._bc.postMessage({ ...msg, from: this.id }); } catch {} }
      _onMsg(m) {
        if (!m || m.from === this.id) return;
        if (m.kind === 'hello') { this._known.add(m.from); this._post({ kind: 'register' }); }
        else if (m.kind === 'register') this._known.add(m.from);
        else if (m.kind === 'unregister') this._known.delete(m.from);
        else if (m.kind === 'connect' && m.to === this.id) {
          const conn = new FakeConn(this, m.from, m.cid); this._conns.set(m.cid, conn);
          this._emit('connection', conn);
          this._post({ kind: 'conn-accept', cid: m.cid, to: m.from });
          setTimeout(() => conn._emit('open'), 5);
        }
        else if (m.kind === 'conn-accept' && m.to === this.id) { const c = this._conns.get(m.cid); if (c) setTimeout(() => c._emit('open'), 5); }
        else if (m.kind === 'data' && m.to === this.id) { const c = this._conns.get(m.cid); if (c) c._emit('data', m.data); }
        else if (m.kind === 'conn-close' && m.to === this.id) { const c = this._conns.get(m.cid); if (c) c._emit('close'); }
      }
      connect(remoteId) {
        const cid = 'c' + (++connSeq);
        const conn = new FakeConn(this, remoteId, cid); this._conns.set(cid, conn);
        this._post({ kind: 'hello' });
        setTimeout(() => {
          if (this.destroyed) return;
          if (this._known.has(remoteId)) this._post({ kind: 'connect', cid, to: remoteId });
          else { this._emit('error', { type: 'peer-unavailable' }); conn._emit('error', new Error('peer-unavailable')); }
        }, 15);
        return conn;
      }
      destroy() { if (this.destroyed) return; this.destroyed = true; this._post({ kind: 'unregister' }); try { this._bc.close(); } catch {} }
    }
    window.Peer = FakePeer;
  `;
  const captureGame = `
    (async () => {
      const mod = await import('./stadium3d.js?v=81');
      const proto = mod.StadiumRenderer.prototype;
      if (!proto.__v182hooked) {
        const orig = proto.render;
        proto.render = function (g, w, h) { window.__game = g; return orig.call(this, g, w, h); };
        proto.__v182hooked = true;
      }
    })()
  `;
  const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--no-sandbox'] });
  try {
    const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    const host = await context.newPage();
    const guest = await context.newPage();
    const errors = [];
    host.on('pageerror', e => errors.push('host: ' + e.message));
    guest.on('pageerror', e => errors.push('guest: ' + e.message));
    await host.addInitScript(initScript);
    await guest.addInitScript(initScript);
    const url = 'http://127.0.0.1:' + port + '/';
    await host.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await guest.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Host creates the room and configures rules + handicap in the lobby.
    await host.locator('[data-mode="online"]').click();
    await host.locator('[data-action="online-host"]').click();
    await host.waitForSelector('.online-code', { timeout: 10000 });
    const code = (await host.locator('.online-code').innerText()).trim();
    assert(/^[A-Z0-9]{6}$/.test(code), 'room code shown: ' + code);
    await host.locator('[data-toggle="variantMetalBat"]').click();
    await host.locator('[data-online-handicap="userRuns:2"]').click();
    await host.locator('[data-online-handicap="cpuOuts:2"]').click();
    const lobbyState = await host.evaluate(() => ({
      metal: document.querySelector('[data-toggle="variantMetalBat"]')?.classList.contains('on'),
      runs: document.querySelector('[data-online-handicap="userRuns:2"]')?.classList.contains('active'),
      outs: document.querySelector('[data-online-handicap="cpuOuts:2"]')?.classList.contains('active'),
      starter: !!document.querySelector('#online-starter-select'),
    }));
    assert(lobbyState.metal && lobbyState.runs && lobbyState.outs, 'lobby reflects the host choices: ' + JSON.stringify(lobbyState));
    assert(lobbyState.starter, 'starter select present in the host lobby');

    // Guest joins and picks a club; the host's config summary must reach
    // the guest lobby before the match starts.
    await guest.locator('[data-mode="online"]').click();
    await guest.locator('#online-code-input').fill(code);
    await guest.locator('[data-action="online-join"]').click();
    await guest.waitForSelector('.segmented[aria-label="自分の球団"]', { timeout: 15000 });
    const hostClub = await host.evaluate(() => document.querySelector('.segmented[aria-label="自分の球団"] button.active')?.dataset.onlineClub);
    assert(hostClub, 'host club identified: ' + hostClub);
    await guest.evaluate(hc => {
      const btns = [...document.querySelectorAll('.segmented[aria-label="自分の球団"] button')];
      btns.find(b => b.dataset.onlineClub !== hc).click();
    }, hostClub);
    await guest.waitForFunction(() => document.querySelector('#modal-content')?.textContent.includes('金属バット'), null, { timeout: 10000 });
    const guestSummary = await guest.evaluate(() => document.querySelector('#modal-content').textContent);
    assert(guestSummary.includes('ハンデ'), 'guest lobby shows the handicap summary');

    // Host starts; both engines must agree on rules, handicap and score.
    await host.waitForFunction(() => {
      const b = document.querySelector('[data-action="online-start"]');
      return b && !b.disabled;
    }, null, { timeout: 15000 });
    await host.locator('[data-action="online-start"]').click();
    await host.evaluate(captureGame);
    await guest.evaluate(captureGame);
    await host.waitForFunction(() => !!window.__game, null, { timeout: 20000 });
    await guest.waitForFunction(() => !!window.__game, null, { timeout: 20000 });
    await guest.waitForFunction(() => window.__game.homeScore === 2, null, { timeout: 20000 });

    const startMsg = await host.evaluate(() => window.__bcLog.find(m => m && m.t === 'start'));
    assert(startMsg, 'host sent a start message');
    assert.equal(startMsg.rules.metalBat, true, 'start message carries the metal-bat rule');
    assert.deepEqual(startMsg.handicap, { homeRuns: 2, awayRuns: 0, homeOuts: 3, awayOuts: 2 }, 'start handicap is absolute home/away');

    const snap = async page => page.evaluate(() => {
      const g = window.__game;
      return { metal: g.variantRules.metalBat, handicap: g.handicap, home: g.homeScore, away: g.awayScore, outsNeeded: g.outsNeeded, mirror: !!g.mirror };
    });
    const hs = await snap(host);
    const gs = await snap(guest);
    assert.equal(hs.metal, true, 'host engine: metal bat on');
    assert.equal(gs.metal, true, 'guest engine: metal bat on');
    assert.deepEqual(hs.handicap, { userRuns: 2, cpuRuns: 0, userOuts: 3, cpuOuts: 2 }, 'host handicap (own perspective)');
    assert.deepEqual(gs.handicap, { userRuns: 0, cpuRuns: 2, userOuts: 2, cpuOuts: 3 }, 'guest handicap (converted, meaning unchanged)');
    assert.equal(hs.home, 2, 'host: home starts +2');
    assert.equal(gs.home, 2, 'guest mirror: home starts +2');
    assert.equal(hs.away, 0, 'host: away starts 0');
    assert.equal(gs.away, 0, 'guest mirror: away starts 0');
    assert.equal(hs.outsNeeded, 2, 'host: away (guest) batting side gets 2 outs');
    assert.equal(gs.outsNeeded, 2, 'guest: own batting side gets 2 outs');
    assert.equal(gs.mirror, true, 'guest runs the mirror engine');
    assert.deepEqual(errors, [], 'no page errors: ' + errors.join(' | '));
    console.log('online-rules-v182 browser: host/guest engines agree on rules, handicap and score');
  } finally {
    await browser.close();
    server.close();
  }
  console.log('online-rules-v182: all assertions passed');
})().catch(e => { console.error(e); process.exit(1); });
