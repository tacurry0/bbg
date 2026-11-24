// v151: online setup UI unified with the normal match setup's segmented
// style (checker item online-setup-ui-unify).
// Before: every choice in the online lobby (mode / own club / innings /
// side / park) was a .online-club pill button in a .online-club-list,
// while the normal match setup uses .segmented groups whose selected
// button carries .active + aria-pressed.
// v151: the lobby's choice-type items use the exact segmented markup of
// the normal match setup (div.segmented[role=group] > button.active,
// aria-pressed), including the innings labels with <small> sub-notes.
// Multi-choice groups (clubs, parks) add .online-seg-grid so the
// segmented row wraps like the old pill list did. Online-only elements
// are untouched: room code display, code input + join button, copy /
// share buttons, recent rooms, guest waiting state and rejoin button.
// Behaviour is unchanged: the same data-online-* attributes drive the
// same handlers, innings still write settings.innings (v143 linkage),
// and the host start message still carries {home, away, innings, park}.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = f => fs.readFileSync(__dirname + '/../dist/' + f, 'utf8');
const app = read('app.js');
const css = read('style.css');
const index = read('index.html');
const sw = read('sw.js');

// The onlineModal function body only (up to the next top-level function).
const omStart = app.indexOf('function onlineModal(){');
assert(omStart >= 0, 'onlineModal exists');
const om = app.slice(omStart, app.indexOf('let pendingInviteCode', omStart));

// ---------- segmented markup for every choice-type item ----------
assert(!om.includes('online-club-list') && !om.includes('class="online-club'), 'no .online-club pill markup remains in onlineModal');
assert(om.includes('<div class="segmented online-seg" role="group" aria-label="モード">'), 'mode is a segmented group');
assert(om.includes('data-online-mode="${v}" class="${(o.mode||\'match\')===v?\'active\':\'\'}" aria-pressed="${(o.mode||\'match\')===v}"'), 'mode buttons carry active + aria-pressed');
assert(om.includes('<div class="segmented online-seg online-seg-grid" role="group" aria-label="自分の球団">'), 'club picker is a wrapping segmented group');
assert(om.includes('data-online-club="${c.id}" class="${o.myClub===c.id?\'active\':\'\'}" aria-pressed="${o.myClub===c.id}"'), 'club buttons carry active + aria-pressed');
assert(om.includes('<div class="segmented online-seg" role="group" aria-label="イニング">'), 'innings is a segmented group');
assert(om.includes('data-online-innings="${n}" class="${settings.innings===n?\'active\':\'\'}" aria-pressed="${settings.innings===n}">${n}イニング<small>${n===9?\'フル\':n===5?\'通常\':\'短め\'}</small>'), 'innings buttons match the normal setup markup (label + small note)');
assert(om.includes('<div class="segmented online-seg" role="group" aria-label="先攻・後攻（自分）">'), 'side is a segmented group');
assert(om.includes('data-online-side="home" class="${o.hostHome?\'active\':\'\'}" aria-pressed="${o.hostHome}"'), 'side buttons carry active + aria-pressed');
assert(om.includes('<div class="segmented online-seg online-seg-grid" role="group" aria-label="スタジアム">'), 'park picker is a wrapping segmented group');
assert(om.includes('data-online-park="${p.id}" class="${effPark===p.id?\'active\':\'\'}" aria-pressed="${effPark===p.id}"'), 'park buttons carry active + aria-pressed');
// The guest club picker (second occurrence of the grid) is segmented too.
assert.equal(om.split('aria-label="自分の球団"').length - 1, 2, 'host and guest club pickers are both segmented');

// The normal match setup itself keeps the same segmented shape (parity source).
assert(app.includes('<div class="segmented">${[3,5,9].map(n=>`<button data-innings="${n}" class="${settings.innings===n?\'active\':\'\'}\">${n}イニング<small>'), 'normal setup innings segmented markup is the parity source');

// ---------- online-only elements unchanged ----------
assert(om.includes('<div class="online-code">${o.code}</div>'), 'room code display unchanged');
assert(om.includes('id="online-code-input"'), 'guest code input unchanged');
assert(om.includes('data-action="online-host"') && om.includes('data-action="online-join"'), 'host/join buttons unchanged');
assert(om.includes('data-action="online-copy-code"') && om.includes('data-action="online-copy-link"'), 'copy buttons unchanged');
assert(om.includes('${recentRoomsHTML()}'), 'recent rooms list still rendered on the entry screen');
assert(om.includes('data-action="online-rejoin"'), 'guest waiting / rejoin element unchanged');
assert(om.includes('class="online-status-line"'), 'status line unchanged');
assert(om.includes('data-action="online-start"'), 'start button unchanged');

// ---------- handlers unchanged (same data-* wiring) ----------
for (const attr of ['onlineMode', 'onlineClub', 'onlineInnings', 'onlineSide', 'onlinePark']) {
  assert(app.includes(`if(b.dataset.${attr})`), `click handler for ${attr} still exists`);
}
assert(app.includes("o.session?.send({t:'start',home:homeId,away:awayId,innings:settings.innings,difficulty:settings.difficulty,park})"), 'start message shape unchanged');

// ---------- CSS for the segmented lobby groups ----------
assert(css.includes('.segmented.online-seg{margin:6px 0 12px}'), 'segmented lobby groups keep the old list spacing');
assert(css.includes('.segmented.online-seg-grid{flex-wrap:wrap;max-height:180px;overflow:auto}'), 'multi-choice segmented groups wrap and scroll like the old pill list');
assert(css.includes('.segmented.online-seg-grid>button{flex:1 1 30%}'), 'grid buttons share rows evenly');

// ---------- version pins (v151) ----------
assert(index.includes('./game.js?v=153') && index.includes('./app.js?v=153'), 'index pins at v151');
assert(index.includes('./style.css?v=73'), 'index style.css pin moves with the CSS change');
assert(sw.includes('nightball-v153-preset-variant'), 'SW cache renamed for v151');
assert(sw.includes('./game.js?v=153') && sw.includes('./app.js?v=153') && sw.includes('./style.css?v=73'), 'SW precaches the v151 assets');

console.log('online-setup-ui-v151: static assertions passed');

/* ---------- browser E2E (393x852, FakePeer over BroadcastChannel) ---------- */
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.log('online-setup-ui-v151: playwright unavailable — browser checks skipped, static assertions passed'); return; }
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
  const CHAN = 'nightball-v151-test-' + Math.random().toString(36).slice(2, 9);
  // FakePeer stub (same BroadcastChannel design as online-derby-v141),
  // plus a log of every data message this page sends.
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

    // Parity reference: computed style of an active segmented button in
    // the NORMAL match setup (guest page, before it joins the room).
    await guest.locator('[data-mode="match"]').click();
    await guest.locator('[data-action="match-team-next"]').click();
    const matchSegStyle = await guest.evaluate(() => {
      const b = document.querySelector('#modal-content .segmented button.active');
      const cs = getComputedStyle(b);
      return { backgroundImage: cs.backgroundImage, color: cs.color, borderRadius: cs.borderRadius };
    });
    assert(matchSegStyle.backgroundImage !== 'none', 'normal setup segmented active style captured');
    await guest.locator('#modal-content .close-button').click();

    // ---------- host creates a room ----------
    await host.locator('[data-mode="online"]').click();
    await host.locator('[data-action="online-host"]').click();
    await host.waitForSelector('.online-code', { timeout: 10000 });
    const code = (await host.locator('.online-code').innerText()).trim();
    assert(/^[A-Z0-9]{6}$/.test(code), 'room code shown: ' + code);
    await host.waitForFunction(() => document.querySelector('.online-status-line')?.textContent.includes('接続を待っています'), null, { timeout: 10000 });

    // Segmented structure in the live lobby.
    const lobby = await host.evaluate(() => {
      const q = s => document.querySelector('#modal-content ' + s);
      const qa = s => [...document.querySelectorAll('#modal-content ' + s)];
      const grp = label => q(`.segmented[aria-label="${label}"]`);
      return {
        modeBtns: qa('.segmented[aria-label="モード"] button').length,
        modeActive: q('.segmented[aria-label="モード"] button.active')?.dataset.onlineMode,
        clubBtns: qa('.segmented[aria-label="自分の球団"] button').length,
        clubActive: q('.segmented[aria-label="自分の球団"] button.active')?.dataset.onlineClub,
        innBtns: qa('.segmented[aria-label="イニング"] button').length,
        innActive: q('.segmented[aria-label="イニング"] button.active')?.dataset.onlineInnings,
        innSmall: q('.segmented[aria-label="イニング"] button.active small')?.textContent,
        sideActive: q('.segmented[aria-label="先攻・後攻（自分）"] button.active')?.dataset.onlineSide,
        parkBtns: qa('.segmented[aria-label="スタジアム"] button').length,
        parkActive: q('.segmented[aria-label="スタジアム"] button.active')?.dataset.onlinePark,
        oldPills: qa('.online-club').length,
        segStyle: (() => { const b = q('.segmented[aria-label="モード"] button.active'); const cs = getComputedStyle(b); return { backgroundImage: cs.backgroundImage, color: cs.color, borderRadius: cs.borderRadius }; })(),
        // Layout at 393px: every lobby control inside the modal box, and
        // the club grid wraps onto multiple rows.
        layout: (() => {
          const modal = document.getElementById('modal-content').getBoundingClientRect();
          let overflow = 0;
          for (const el of document.querySelectorAll('#modal-content button, #modal-content input')) {
            const r = el.getBoundingClientRect();
            if (r.width && (r.left < modal.left - 1 || r.right > modal.right + 1)) overflow++;
          }
          const tops = new Set(qa('.segmented[aria-label="自分の球団"] button').map(b => Math.round(b.getBoundingClientRect().top)));
          return { overflow, clubRows: tops.size, modalWidth: modal.width };
        })(),
      };
    });
    assert.equal(lobby.modeBtns, 2, 'mode segmented has 2 options');
    assert.equal(lobby.modeActive, 'match', 'mode defaults to match');
    assert(lobby.clubBtns >= 30, 'club segmented lists all clubs: ' + lobby.clubBtns);
    assert.equal(lobby.clubActive, 'owls', 'host club defaults to settings.matchTeam');
    assert.equal(lobby.innBtns, 3, 'innings segmented has 3 options');
    assert.equal(lobby.innActive, '5', 'innings defaults to settings.innings (5)');
    assert.equal(lobby.innSmall, '通常', 'innings active button shows the normal-setup sub note');
    assert.equal(lobby.sideActive, 'home', 'side defaults to home');
    assert(lobby.parkBtns >= 5, 'park segmented lists parks: ' + lobby.parkBtns);
    assert(lobby.parkActive, 'park segment has an active park');
    assert.equal(lobby.oldPills, 0, 'no old pill buttons rendered');
    assert.deepEqual(lobby.segStyle, matchSegStyle, 'online segmented active style matches the normal match setup exactly');
    assert.equal(lobby.layout.overflow, 0, 'no lobby control overflows the modal horizontally at 393px');
    assert(lobby.layout.clubRows >= 3, 'club segmented grid wraps onto multiple rows: ' + lobby.layout.clubRows);
    console.log(`online-setup-ui-v151: host lobby OK (clubs=${lobby.clubBtns}, parks=${lobby.parkBtns}, clubRows=${lobby.layout.clubRows}, modalWidth=${lobby.layout.modalWidth.toFixed(1)}px)`);
    await host.screenshot({ path: resolve(__dirname, 'screenshots/online-setup-v151-host.png') });

    // ---------- host changes settings through the segmented controls ----------
    await host.locator('.segmented[aria-label="イニング"] button[data-online-innings="9"]').click();
    await host.waitForFunction(() => document.querySelector('.segmented[aria-label="イニング"] button.active')?.dataset.onlineInnings === '9');
    const savedInnings = await host.evaluate(() => JSON.parse(localStorage.getItem('nightball.settings')).innings);
    assert.equal(savedInnings, 9, 'innings change via segmented writes settings.innings and persists (v143 linkage)');
    await host.locator('.segmented[aria-label="先攻・後攻（自分）"] button[data-online-side="away"]').click();
    await host.waitForFunction(() => document.querySelector('.segmented[aria-label="先攻・後攻（自分）"] button.active')?.dataset.onlineSide === 'away');
    const parkId = await host.evaluate(() => {
      const btns = [...document.querySelectorAll('.segmented[aria-label="スタジアム"] button')];
      const other = btns.find(b => !b.classList.contains('active'));
      other.click();
      return other.dataset.onlinePark;
    });
    await host.waitForFunction(p => document.querySelector('.segmented[aria-label="スタジアム"] button.active')?.dataset.onlinePark === p, parkId);
    const hostClub = await host.evaluate(() => {
      const btns = [...document.querySelectorAll('.segmented[aria-label="自分の球団"] button')];
      const other = btns.find(b => b.dataset.onlineClub !== 'owls');
      other.click();
      return other.dataset.onlineClub;
    });
    await host.waitForFunction(c => document.querySelector('.segmented[aria-label="自分の球団"] button.active')?.dataset.onlineClub === c, hostClub);

    // Mode toggle there and back (derby hides innings/side; match restores).
    await host.locator('.segmented[aria-label="モード"] button[data-online-mode="derby"]').click();
    await host.waitForFunction(() => !document.querySelector('.segmented[aria-label="イニング"]'));
    await host.locator('.segmented[aria-label="モード"] button[data-online-mode="match"]').click();
    await host.waitForFunction(() => document.querySelector('.segmented[aria-label="イニング"] button.active')?.dataset.onlineInnings === '9');

    // ---------- guest joins and picks a club ----------
    await guest.locator('[data-mode="online"]').click();
    await guest.locator('#online-code-input').fill(code);
    await guest.locator('[data-action="online-join"]').click();
    await guest.waitForSelector('.segmented[aria-label="自分の球団"] button', { timeout: 15000 });
    const guestClub = await guest.evaluate(hc => {
      const btns = [...document.querySelectorAll('.segmented[aria-label="自分の球団"] button')];
      const pick = btns.find(b => b.dataset.onlineClub !== hc);
      pick.click();
      return pick.dataset.onlineClub;
    }, hostClub);
    // Host start button enables once the guest club arrives.
    await host.waitForFunction(() => {
      const b = document.querySelector('[data-action="online-start"]');
      return b && !b.disabled;
    }, null, { timeout: 15000 });

    // ---------- host starts: the start message carries the segmented choices ----------
    await host.locator('[data-action="online-start"]').click();
    await host.waitForFunction(() => window.__bcLog.some(m => m.t === 'start'), null, { timeout: 10000 });
    const startMsg = await host.evaluate(() => window.__bcLog.find(m => m.t === 'start'));
    assert.equal(startMsg.innings, 9, 'start message carries the segmented innings choice');
    assert.equal(startMsg.park, parkId, 'start message carries the segmented park choice');
    assert.equal(startMsg.home, guestClub, 'host picked away, so the guest club is home in the start message');
    assert.equal(startMsg.away, hostClub, 'host club is away in the start message');
    // Guest receives the start and leaves the lobby for the game.
    await guest.waitForFunction(() => document.getElementById('modal').hidden === true, null, { timeout: 15000 });
    assert(!errors.length, 'no page errors: ' + errors.join(' | '));
    console.log(`online-setup-ui-v151: stub E2E OK (code=${code}, host=${hostClub}, guest=${guestClub}, park=${parkId}, start=${JSON.stringify(startMsg)})`);
    console.log('online-setup-ui-v151: all assertions passed');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
