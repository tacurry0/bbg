const assert = require('node:assert/strict');
(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch(e) { throw new Error('Playwright required', {cause:e}); }
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
  const CHAN = 'nightball-v217-test-' + Math.random().toString(36).slice(2, 9);
  const initScript = `
    window.__bcLog = []; window.__delay = {};
    Object.defineProperty(document,'hidden',{get:()=>false});
    const CHAN = ${JSON.stringify(CHAN)};
    let connSeq = 0;
    class FakeConn {
      constructor(localPeer, remoteId, cid) { this.localPeer = localPeer; this.remoteId = remoteId; this.cid = cid; this._h = {}; }
      on(ev, fn) { (this._h[ev] ??= []).push(fn); return this; }
      _emit(ev, ...args) { for (const f of this._h[ev] || []) f(...args); }
      send(data) { window.__bcLog.push(data); const send=()=>this.localPeer._post({ kind: 'data', cid: this.cid, to: this.remoteId, data }); const delay=window.__delay[data.t]||0; if(delay)setTimeout(send,delay);else send(); }
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

  const browser = await chromium.launch({headless:true, ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,serviceWorkers:'block'});
    const host=await ctx.newPage(),guest=await ctx.newPage(),errors=[];
    const url='http://127.0.0.1:'+port+'/';
    for(const p of [host,guest]){
      p.on('pageerror',e=>errors.push(e.message));
      await p.addInitScript(initScript);
      await p.goto(url,{waitUntil:'domcontentloaded'});
      await p.waitForFunction(()=>document.querySelector('[data-mode="online"]')?.onclick);
      await p.evaluate(()=>{const old=NightGame.prototype.conditionFor;NightGame.prototype.conditionFor=function(p){if(this.onlineGame)window.__game=this;return old.call(this,p);};});
    }
    const tap=async(p,s)=>p.locator(s).first().tap();
    const kind=async(p,k)=>p.locator('#modal-content[data-kind="'+k+'"]').waitFor({state:'visible'});
    const fit=async(p)=>{const b=await p.evaluate(()=>{const m=document.querySelector('#modal-content'),body=m.querySelector('.pf-body'),f=m.querySelector('.pf-footer'),r=f.getBoundingClientRect();return {width:body.scrollWidth<=body.clientWidth+1,footer:r.top>=0&&r.bottom<=innerHeight+1,modal:m.scrollHeight<=m.clientHeight+1};});assert(b.width&&b.footer&&b.modal,JSON.stringify(b));};
    await tap(host,'[data-mode="online"]');await tap(host,'[data-action="online-host"]');
    const code=(await host.locator('.online-code').innerText()).trim();
    await host.waitForFunction(()=>document.querySelector('.pf-online-status')?.textContent.includes('接続を待って'));
    for(const [width,height] of [[320,568],[390,844],[412,915]]){await host.setViewportSize({width,height});await fit(host);}
    await tap(host,'[data-action="online-teams-open"]');await kind(host,'online-teams');
    await tap(host,'[data-online-group="npb"]');
    const hostClub=await host.locator('[data-online-club]').first().getAttribute('data-online-club');
    await tap(host,'[data-online-club="'+hostClub+'"]');await kind(host,'online');
    await tap(host,'[data-online-side="away"]');await tap(host,'[data-online-innings="9"]');
    await tap(host,'[data-action="online-park-open"]');await kind(host,'online-park');
    await tap(host,'[data-online-park-group="npb"]');
    const park=await host.locator('[data-online-park]').first().getAttribute('data-online-park');
    await tap(host,'[data-online-park="'+park+'"]');
    await tap(host,'[data-action="online-options-open"]');await kind(host,'online-options');
    await tap(host,'[data-toggle="variantMetalBat"]');await tap(host,'[data-online-handicap="userRuns:2"]');
    await tap(host,'.pf-footer [data-action="online-lobby-back"]');
    await tap(guest,'[data-mode="online"]');await guest.locator('#online-code-input').fill(code);await tap(guest,'[data-action="online-join"]');
    await guest.waitForFunction(()=>document.querySelector('.pf-online-status')?.textContent.includes('接続しました'));
    await tap(guest,'[data-action="online-teams-open"]');await tap(guest,'[data-online-group="npb"]');
    // Same-club match deliberately exercises explicit host/guest side mapping.
    await tap(guest,'[data-online-club="'+hostClub+'"]');
    await guest.locator('[data-action="online-lineup-open"]').waitFor({state:'visible'});
    assert(await host.locator('[data-action="online-start"]').isDisabled(),'guest not yet ready');
    const edited=[];
    for(const [p,swapIndex] of [[host,1],[guest,2]]){
      await tap(p,'[data-action="online-pitchers-open"]');await kind(p,'online-pitchers');
      const pitcher=Number(await p.locator('[data-online-pitcher]').nth(swapIndex).getAttribute('data-online-pitcher'));
      await p.locator('[data-online-pitcher]').nth(swapIndex).tap();
      await tap(p,'[data-action="online-lineup-open"]');await kind(p,'lineup');
      const forms=()=>p.locator('[data-editor-player]').evaluateAll(xs=>Object.fromEntries(xs.map(x=>[x.dataset.editorPlayer,Number(x.querySelector('.lineup-condition-face')?.dataset.condition)])));
      const before=await forms();assert(Object.values(before).every(v=>Number.isInteger(v)&&v>=-2&&v<=2));
      assert.equal(await p.locator('.lineup-preview-fixed .rating-tiles .rank-tile').count(),5);
      const order=()=>p.locator('.squad-starter-row [data-editor-player]').evaluateAll(xs=>xs.map(x=>x.dataset.editorPlayer));
      const original=await order();
      await tap(p,'.squad-starter-row [data-editor-player]');await p.locator('.squad-starter-row [data-editor-player]').nth(swapIndex).tap();
      const swapped=await order();assert.equal(swapped[0],original[swapIndex]);assert.equal(swapped[swapIndex],original[0]);assert.deepEqual(await forms(),before);
      const pos=p.locator('[data-editor-position]').first(),target=(await pos.inputValue())==='C'?'1B':'C';
      await pos.selectOption(target);
      const fielding=await p.locator('[data-editor-position]').evaluateAll(xs=>Object.fromEntries(xs.map(x=>[x.value,x.dataset.editorPosition])));
      await fit(p);
      await tap(p,'.pf-footer [data-action="online-lineup-done"]');
      await tap(p,'[data-action="online-lineup-open"]');assert.deepEqual(await forms(),before);
      await tap(p,'.pf-footer [data-action="online-lineup-done"]');
      edited.push({order:swapped,fielding,pitcher,forms:before});
    }
    assert.deepEqual(edited[0].forms,edited[1].forms,'same seed on both clients');
    await tap(guest,'[data-action="online-ready"]');
    await host.waitForFunction(()=>!document.querySelector('[data-action="online-start"]').disabled);
    // Editing after readiness revokes it; confirming a lineup alone does not start the match.
    await tap(guest,'[data-action="online-lineup-open"]');
    await host.waitForFunction(()=>document.querySelector('[data-action="online-start"]').disabled);
    await tap(guest,'.pf-footer [data-action="online-lineup-done"]');await tap(guest,'[data-action="online-ready"]');
    await host.waitForFunction(()=>!document.querySelector('[data-action="online-start"]').disabled);
    await tap(host,'[data-action="online-start"]');
    const wire=await host.evaluate(()=>window.__bcLog.find(x=>x.t==='start'));
    assert.equal(wire.home,hostClub);assert.equal(wire.away,hostClub);assert.equal(wire.hostHome,false);assert.equal(wire.park,park);assert.equal(wire.innings,9);assert.equal(wire.rules.metalBat,true);
    for(const [idx,entry] of [[0,wire.hostLineup],[1,wire.guestLineup]]){
      assert.deepEqual(entry.order,edited[idx].order);assert.deepEqual(entry.fielding,edited[idx].fielding);assert.equal(entry.pitcher,edited[idx].pitcher);
    }
    for(const [i,p] of [host,guest].entries()){
      await p.waitForFunction(()=>window.__game?.onlineGame,null,{timeout:30000});
      const state=await p.evaluate(()=>{const g=window.__game;return {home:g.userHome,seed:g.conditionSeed,forms:Object.fromEntries(g.teams[g.userSide].batters.map(b=>[b.id,g.conditionFor(b)])),own:g.lineups[g.userSide].map(b=>b.id),other:g.lineups[g.opponentSide].map(b=>b.id),fielding:Object.fromEntries(g.lineups[g.userSide].map(b=>[b.fieldPos,b.id])),pitcher:g.homePitcherIndex,oppPitcher:g.awayPitcherIndex,metal:g.variantRules.metalBat,score:g.awayScore};});
      assert.equal(state.home,i===1);assert.equal(state.seed,wire.conditionSeed);assert.deepEqual(state.forms,edited[i].forms);assert.deepEqual(state.own,edited[i].order);assert.deepEqual(state.other,edited[1-i].order);assert.deepEqual(state.fielding,edited[i].fielding);assert.equal(state.pitcher,edited[i].pitcher);assert.equal(state.oppPitcher,edited[1-i].pitcher);assert.equal(state.metal,true);assert.equal(state.score,2);
    }
    // v218: two browser clients share a pause/bench/replay lock.
    const gameWait=async(p,fn)=>{
      try{await p.waitForFunction(fn,null,{timeout:40000,polling:100});}
      catch(e){console.error('online game state',await p.evaluate(()=>({phase:window.__game?.phase,pt:window.__game?.phaseTime,paused:window.__game?.paused,modal:document.querySelector('#modal-content')?.dataset.kind,hidden:document.hidden,last:window.__bcLog.slice(-4).map(x=>x.t)})),errors);throw e;}
    };
    const click=(p,s)=>p.evaluate(sel=>document.querySelector(sel).click(),s);
    // In a headless two-tab test Chromium can deprioritize the
    // host's animation loop while the guest's lineup is being edited.
    await host.bringToFront();
    await host.evaluate(()=>{const g=window.__game;if(g.phase==='intro')g.beginHalf();});
    await gameWait(host,()=>window.__game?.phase==='aim');
    await gameWait(guest,()=>window.__game?.phase==='aim');
    await click(host,'#pause');await kind(host,'pause');await kind(guest,'online-hold');
    const phaseTime=await host.evaluate(()=>window.__game.phaseTime);
    await guest.evaluate(()=>{const g=window.__game;g.mirrorSend({t:'pitch-decision',pitchType:'fast',aim:{x:0,y:0}});});
    await host.waitForTimeout(350);
    assert.equal(await host.evaluate(()=>window.__game.phaseTime),phaseTime);
    await click(host,'#modal-content [data-action="close"]');
    for(const p of [host,guest])await gameWait(p,()=>!window.__game.paused&&document.querySelector('#modal').hidden);
    await click(guest,'#pause');await kind(guest,'pause');await kind(host,'online-hold');
    await click(guest,'#modal-content [data-action="bench"]');await kind(guest,'bench');
    await click(guest,'[data-bench-tab="pitch"]');
    const replacement=await guest.locator('[data-bench-pitch]:not([disabled])').first().getAttribute('data-bench-pitch');
    await click(guest,'[data-bench-pitch="'+replacement+'"]');
    await gameWait(guest,()=>window.__game.substitutions.some(s=>s.type==='pitch'));
    await guest.locator('[data-bench-pitch="'+replacement+'"].chosen').waitFor({state:'visible'});
    assert.equal(await guest.evaluate(()=>window.__game.homePitcherIndex),Number(replacement));
    assert.equal(await host.evaluate(()=>window.__game.awayPitcherIndex),Number(replacement));
    await click(guest,'#modal-content [data-action="close"]');
    for(const p of [host,guest])await gameWait(p,()=>!window.__game.paused&&document.querySelector('#modal').hidden);
    // Put a genuine pitch into the guest-eligible ABS call state, then
    // delay the challenge packet past the old host-side countdown.
    await host.evaluate(()=>{
      const g=window.__game;g.remoteThrowPitch();
      if(!g.pitch)throw Error('expected pitch');
      g.pitch.targetX=1.2;g.pitch.targetY=0;g.pitch.isStrike=false;g.pitch.progress=1.24;
      g.absCall={...NightGame.absLocation(1.2,0),strike:false,umpireStrike:false,cpu:true,remote:true};
      g.setPhase('abs-call');g.notify();
    });
    await guest.locator('#abs-challenge').waitFor({state:'visible'});
    await guest.evaluate(()=>{window.__delay['abs-challenge']=2000;});
    await guest.waitForTimeout(1750);
    assert(await guest.locator('#abs-challenge').isVisible(),'guest receives full window');
    await click(guest,'#abs-challenge');
    await gameWait(host,()=>window.__game.phase==='abs-review');
    await gameWait(guest,()=>window.__game.phase==='abs-review');
    await host.evaluate(()=>{const g=window.__game;g.resolveAbsCall(true);g.prepare();});
    await gameWait(host,()=>window.__game.phase==='aim');
    // Canonical pitch replay, with the host skipping first. Neither game
    // resumes until the other endpoint completes the replay.
    await host.evaluate(()=>{const g=window.__game;g.remoteThrowPitch();g.pitch.duration=8000;g.setPhase('result');g.emit('scoring-walk');});
    await guest.locator('#replay-skip').waitFor({state:'visible'});
    await host.locator('#replay-skip').waitFor({state:'visible'});
    await click(host,'#replay-skip');await kind(host,'online-hold');
    assert(await guest.evaluate(()=>window.__game.paused));
    await click(guest,'#replay-skip');
    for(const p of [host,guest])await gameWait(p,()=>!window.__game.paused&&document.querySelector('#modal').hidden);
    assert.deepEqual(errors,[]);
    console.log('PASS: online pregame layout, same-club sides, both lineups, form, pitchers, readiness, rules, synchronized pause/bench/replay and delayed ABS');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
