// v271: tap-to-toggle, batch buttons and authoritative multiplayer.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
global.window=global;
for(const file of ['ratings-data','players','pennant','game'])vm.runInThisContext(fs.readFileSync(path.join(root,'dist',file+'.js'),'utf8'),{filename:file+'.js'});
function match(options={}){
 const g=new NightGame('match','standard',()=>{},{userHome:true,manualRunning:true,weather:'clear',...options});
 g.half=options.remoteSide?'top':'bottom';if(options.remoteSide){g.remoteBatter=true;g.remoteRunning=true;}
 g.bases=[true,true,true];g.baseIds=g.bases.map((b,i)=>g.lineups[g.side][5+i].id);
 g.startField(34,0,.1,false);
 for(const r of g.field.runners){r.progress=r.base=r.command=r.target=r.start;r.waiting=true;r.running=false;r.readingFly=false;g.projectRunner(r);}
 g.field.ball.bounces=1;
 return g;
}
function put(g,r,progress,base=Math.floor(progress)){Object.assign(r,{progress,base,command:base,target:base,running:false,waiting:true});g.projectRunner(r);}
const clone=x=>JSON.parse(JSON.stringify(x));
(async()=>{
 const {runnerMapState,bindRunnerMap,renderRunnerMap}=await import('../dist/runner-map.js');
 const g=match(),[b,r1,r2,r3]=g.field.runners;
 assert.deepEqual(g.selectedRunnerIds(),[]);
 assert(g.selectRunner(r1.id));assert(g.selectRunner(r3.id));
 assert.deepEqual(g.selectedRunnerIds(),[r1.id,r3.id]);
 assert(g.commandRunners('advance'));assert.equal(r1.command,2);assert.equal(r3.command,4);assert.equal(r2.command,2);assert.equal(b.command,0);
 assert.deepEqual(g.selectedRunnerIds(),[r1.id,r3.id],'commands do not change selection');
 assert(g.selectRunner(r1.id));assert.deepEqual(g.selectedRunnerIds(),[r3.id]);assert(g.selectRunner(r3.id));assert(!g.commandRunners('advance'),'none selected');
 // All four runner targets are updated in the same tick, and runners stop on arrival.
 for(const r of g.field.runners){put(g,r,r.start);assert(g.selectRunner(r.id));}
 assert(g.commandRunners('advance'));assert.deepEqual(g.field.runners.map(r=>r.command),[1,2,3,4]);
 for(let i=0;i<650;i++)g.updateRunners(.01);
 assert.deepEqual(g.field.runners.map(r=>r.progress),[1,2,3,4]);
 assert(r3.scored);assert(!g.selectedRunnerIds().includes(r3.id));assert.deepEqual(g.selectedRunnerIds(),[b.id,r1.id,r2.id]);
 g.manualOut(r2,'tag');assert(!g.selectedRunnerIds().includes(r2.id));
 // Only selected runners return; an illegal move to home is ignored.
 const h=match(),[hb,h1,h2,h3]=h.field.runners;
 put(h,h1,1.4);put(h,h2,2.3);h.selectRunner(h1.id);h.selectRunner(h2.id);h.selectRunner(hb.id);
 assert(h.commandRunners('return'));assert.deepEqual([h1.command,h2.command,h3.command,hb.command],[1,2,3,0]);
 assert(!h.selectRunner('no-runner'));h.paused=true;assert(!h.selectRunner(h3.id));assert(!h.commandRunners('advance'));h.paused=false;
 // Old scalar selections restore; a modern empty array is not replaced.
 h.field.manual.selection=h1.id;assert.deepEqual(h.selectedRunnerIds(),[h1.id]);
 const restored=NightGame.restore(clone(h.snapshot()),()=>{});assert.deepEqual(restored.selectedRunnerIds(),[h1.id]);
 // Existing tap targets, circles, positions, and individual swipe are unchanged.
 const u=match(),[,u1,u2,u3]=u.field.runners;
 const handlers={},attrs={},markers={innerHTML:''},guide={innerHTML:''};let svg=false,html='',sounds=0;
 const el={hidden:true,classList:{toggle(){}},setAttribute(k,v){attrs[k]=v;},querySelector(q){return q==='svg'?(svg?{}:null):q==='.runner-map-guide'?guide:q==='.runner-map-markers'?markers:null;},
 getBoundingClientRect(){return {left:0,top:0,width:224,height:224};},addEventListener(k,fn){handlers[k]=fn;},setPointerCapture(){},set innerHTML(v){html=v;svg=true;},get innerHTML(){return html;}};
 bindRunnerMap(el,()=>u,()=>sounds++);
 const event=(x,y)=>({clientX:x+12,clientY:y+12,pointerId:1,button:0,preventDefault(){},stopPropagation(){}});
 const tap=(x,y)=>{handlers.pointerdown(event(x,y));handlers.pointerup(event(x,y));};
 tap(180,100);tap(20,100);renderRunnerMap(el,u);
 assert.deepEqual(u.selectedRunnerIds(),[u1.id,u3.id]);
 assert.equal((markers.innerHTML.match(/<circle r="14" fill="none" stroke="white" stroke-width="2"\/>/g)||[]).length,2);
 assert(!html.includes('走者をスワイプ')&&!html.includes('1つの塁へ'));
 tap(180,100);renderRunnerMap(el,u);assert.deepEqual(u.selectedRunnerIds(),[u3.id]);assert.equal((markers.innerHTML.match(/r="14"/g)||[]).length,1);
 handlers.pointerdown(event(100,20));handlers.pointermove(event(45,75));handlers.pointerup(event(45,75));
 assert.equal(u2.command,3);assert.deepEqual(u.selectedRunnerIds(),[u3.id],'swipe does not toggle selection');
 handlers.pointerdown(event(180,100));handlers.pointercancel();assert.deepEqual(u.selectedRunnerIds(),[u3.id]);
 assert(sounds>=4);
 // Authoritative host receives a single batch; mirror selections are local
 // and survive incoming host snapshots, including an empty selection.
 const host=match({remoteSide:'away'}),guest=new NightGame('match','standard',()=>{},{userHome:false,manualRunning:true,weather:'clear'});
 guest.half='top';guest.phase='field';guest.mirror=true;const packets=[];guest.mirrorSend=m=>packets.push(m);
 const frame=(seq=1)=>{guest._fieldFrames=[{fsq:seq,t:performance.now(),f:clone(host.field)}];guest.mirrorTick(0);};
 frame();
 const [,a1,a2,a3]=host.field.runners;
 assert(guest.manualPlay);guest.selectRunner(a1.id);guest.selectRunner(a3.id);
 assert(guest.commandRunners('advance'));assert.equal(packets.length,1);
 assert.deepEqual(packets[0],{t:'runner-commands',commands:[{id:a3.id,base:4},{id:a1.id,base:2}]});
 assert.equal(a1.command,1);assert(host.remoteCommandRunners(packets[0].commands));
 assert.equal(a1.command,2);assert.equal(a3.command,4);assert.equal(a2.command,2);
 assert.deepEqual(host.field.manual.selection,[]);
 frame();assert.deepEqual(guest.selectedRunnerIds(),[a1.id,a3.id]);
 assert.deepEqual(runnerMapState(guest).filter(m=>m.selected).map(m=>m.id),[a1.id,a3.id]);
 host.field.runners.find(r=>r.id===a3.id).scored=true;frame();assert.deepEqual(guest.selectedRunnerIds(),[a1.id]);
 guest.selectRunner(a1.id);host.field.manual.selection=[a2.id];frame();assert.deepEqual(guest.selectedRunnerIds(),[]);
 guest.selectRunner(a1.id);frame(2);assert.deepEqual(guest.selectedRunnerIds(),[],'new play clears selection');
 assert(!host.remoteCommandRunners([{id:a3.id,base:4},{id:'bogus',base:1},{id:a1.id,base:4}]));
 host.paused=true;assert(!host.remoteCommandRunners([{id:a1.id,base:2}]));
 // No extra controls or layout changes: same ids and relative order.
 const idx=fs.readFileSync(path.join(root,'dist/index.html'),'utf8'),app=fs.readFileSync(path.join(root,'dist/app.js'),'utf8');
 assert(idx.includes('<div id="run-actions" class="run-actions" hidden><button id="run-advance" type="button">進塁</button><button id="run-return" type="button">帰塁</button></div>'));
 assert(app.includes("m.t==='runner-commands'&&g.remoteBatter")&&app.includes('g.remoteCommandRunners(m.commands)'));
 console.log('PASS v271: tap/re-tap, multiple work independently, one-base advance/return, out/scored cleanup, old saves, unchanged rings and swipe, single remote batch and mirror-local selection.');
})().catch(e=>{console.error(e);process.exitCode=1;});
