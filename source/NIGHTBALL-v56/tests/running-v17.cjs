const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');global.window=global;
for(const f of ['ratings-data','players','pennant','game'])vm.runInThisContext(fs.readFileSync('dist/'+f+'.js','utf8'));
function game(mask=0,outs=0,userHome=true){const g=new NightGame('match','standard',()=>{},{manualRunning:true,userHome});g.half=userHome?'bottom':'top';g.outs=outs;g.bases=[0,1,2].map(i=>!!(mask&(1<<i)));g.baseIds=g.bases.map((b,i)=>b?g.lineups[g.side][i+5].id:null);return g;}
function tick(g,n=3200){for(let i=0;i<n&&!g.field.resolved;i++)g.updateField(.02);assert(g.field.resolved,'a secured play must finish');assert(g.outs<=3);const ids=g.baseIds.filter(Boolean);assert.equal(ids.length,new Set(ids).size);return g;}
// Automatic mode and CPU offense continue on the established engine.
const auto=new NightGame('match','standard',()=>{});auto.half='bottom';auto.startField(36,20,.3,false);assert(!auto.field.manual);
const defense=game();defense.half='top';defense.startField(30,10,0,true);assert(!defense.field.manual);
// Both control sides, all base occupancies and out counts: no identity loss or hangs.
for(const home of [true,false])for(let mask=0;mask<8;mask++)for(const outs of [0,1,2])for(const shot of [[30,0,0],[36,20,.3],[32,55,0]]){
 const g=game(mask,outs,home);g.startField(...shot,false);tick(g);
 for(let i=0;i<3;i++)assert.equal(g.bases[i],!!g.baseIds[i]);
 if(g.field.manual?.fly)assert.equal(g[g.side+'Score'],0,'holding on a fly never scores');
}
// Extra bases are requested explicitly. Without a command the batter stops at first.
const single=tick((()=>{const g=game();g.startField(36,20,.3,false);return g;})());assert.equal(single.field.outcome,'single');assert.equal(single.field.runners[0].progress,1);assert.equal(single.baseIds[0],single.batter.id);
const extra=game();extra.startField(36,20,.3,false);assert(extra.commandRunners('advance'));assert(extra.commandRunners('advance'));assert.equal(extra.field.runners[0].command,2);tick(extra);assert.equal(extra.field.outcome,'double');assert.equal(extra.baseIds[1],extra.batter.id);
// Forced runners keep their reached base rather than automatically running backwards.
const force=game(1);force.startField(36,20,.3,false);tick(force);assert.equal(force.outs,0);assert.deepEqual(force.bases,[true,true,false]);assert.equal(force.field.runners.find(r=>r.start===1).progress,2);
// Individual/all selection, stop and return work without affecting another runner's command.
const controls=game(3);controls.startField(34,25,.3,false);const r=controls.field.runners.find(r=>r.start===1),other=controls.field.runners.find(r=>r.start===2);assert(controls.selectRunner(r.id));controls.commandRunners('advance');assert.equal(r.command,2);assert.equal(other.command,null);for(let i=0;i<50;i++)controls.updateRunners(.02);controls.commandRunners('hold');const stop=r.progress;for(let i=0;i<50;i++)controls.updateRunners(.02);assert.equal(r.progress,stop);controls.commandRunners('return');for(let i=0;i<300;i++)controls.updateRunners(.02);assert.equal(r.progress,1);assert(!controls.selectRunner('missing'));controls.paused=true;assert(!controls.commandRunners('advance'));
// A waiting fielder tags a runner trying an unforced extra base.
const tag=game(2);tag.startField(36,20,.3,false);const tagged=tag.field.runners.find(r=>r.start===2);tag.selectRunner(tagged.id);tag.commandRunners('advance');tag.field.manual.secured=true;tag.field.manual.holder=5;tag.field.manual.bag=3;tag.field.ball.bounces=1;for(let i=0;i<350&&!tagged.out;i++)tag.updateRunners(.02);assert(tagged.out);assert.equal(tag.outs,1);assert.equal(tag.field.manual.lastOut.type,'tag');
// Catch + return/appeal, and legal tag-up after retouching the original base.
const fly=game(4);fly.startField(32,55,0,false);const third=fly.field.runners.find(r=>r.start===3);fly.selectRunner(third.id);fly.commandRunners('advance');for(let i=0;i<70;i++)fly.updateRunners(.02);assert(third.progress>3);fly.secureManualBall(8,true);assert(third.needsTag);assert.equal(fly.outs,1);assert.equal(fly.landingIndicator(),null);assert.equal(fly.manualRuns().length,0);for(let i=0;i<400;i++)fly.updateRunners(.02);assert.equal(third.progress,3);assert(!third.needsTag);fly.commandRunners('advance');for(let i=0;i<400;i++)fly.updateRunners(.02);assert(third.scored);fly.finishManualPlay();assert.equal(fly.homeScore,1);assert.equal(fly.homeHits,0);
// A third force/batter out cancels all runs. A later third tag out preserves an earlier run.
for(const type of ['force','batter','tag']){const g=game(4,2);g.startField(36,20,.3,false);const f=g.field,br=f.runners[0],scorer=f.runners[1];br.base=br.furthest=1;br.progress=1;scorer.progress=4;scorer.base=4;scorer.scored=true;scorer.crossedAt=1;f.elapsed=2;g.manualOut(br,type);g.finishManualPlay();assert.equal(g.homeScore,type==='tag'?1:0);}
const beforeFirst=game(4,2);beforeFirst.startField(36,20,.3,false);beforeFirst.manualOut(beforeFirst.field.runners[0],'tag');assert.equal(beforeFirst.field.manual.lastOut.type,'batter');
// Walk-off limits the score, including when the player has sent everyone home.
const win=game(7);win.inning=5;win.startField(36,20,.3,false);for(const r of win.field.runners){r.base=4;r.furthest=4;r.progress=4;r.scored=true;r.crossedAt=4-r.start;}win.field.elapsed=6;assert(win.manualWalkoffReady());win.finishManualPlay();assert.equal(win.homeScore,1);assert.equal(win.next,'finish');assert.equal(win.batterStats().rbi,1);
// Fixed-probability bunts and homers retain their automatic awarded bases.
const bunt=game(7);bunt.pitch={swung:false,progress:1};bunt.phase='pitch';bunt.bunt=true;bunt.swing();assert.equal(bunt.field.manual,null);
const homer=game(7);homer.inning=5;homer.startField(45,35,0,false);homer.finishBall('hr');assert.equal(homer.homeScore,4);assert.equal(homer.field.manual,null);
// A save/reload preserves targets, selection, possession and subsequent outcomes.
const saved=game(1);saved.startField(36,20,.3,false);saved.selectRunner(saved.batter.id);saved.commandRunners('advance');saved.commandRunners('advance');for(let i=0;i<120;i++)saved.updateField(.02);const restored=NightGame.restore(JSON.parse(JSON.stringify(saved.snapshot())),()=>{});assert.equal(restored.manualRunning,true);assert.deepEqual(restored.field.manual,saved.field.manual);tick(saved);tick(restored);assert.deepEqual(restored.baseIds,saved.baseIds);assert.equal(restored.outs,saved.outs);assert.equal(restored.homeScore,saved.homeScore);assert.equal(restored.field.outcome,saved.field.outcome);
console.log('PASS: 144 live-ball scenarios, both sides; auto/CPU preservation; explicit extra bases; forces/hold/return/individual selection; tag outs/tag-up/third-out scoring; walk-off/HR/bunt; save/reload.');
