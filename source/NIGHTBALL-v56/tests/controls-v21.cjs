const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');global.window=global;for(const file of ['ratings-data','players','pennant','game'])vm.runInThisContext(fs.readFileSync('dist/'+file+'.js','utf8'));
// Actual defense completes the half through ordinary pitch, CPU batting and fielding.
let pitches=0;
for(const mode of ['match','pennant'])for(const home of [true,false])for(const speed of [1,2]){
 const g=new NightGame(mode,'standard',()=>{},{userHome:home,defenseSpeed:speed,fieldSpeed:2,manualRunning:true,homeTeamId:'wolves',awayTeamId:'owls'});g.half=home?'top':'bottom';g.beginHalf();assert(g.setAutoDefense(true));
 let frames=0;while(g.defending&&g.phase!=='ended'&&frames++<30000)g.update(50);
 assert(frames<30000,'automated defense must complete');assert(g.session.thrown>0);pitches+=g.session.thrown;
 if(g.phase!=='ended'){assert.equal(g.autoDefense,false);assert.equal(g.phase,'change');assert(!g.defending);}
}
// 2x applies once even when field speed is also 2x; pause and cancel stay responsive.
const fast=new NightGame('match','standard',()=>{},{fieldSpeed:2,defenseSpeed:2});fast.setPhase('aim');assert(fast.setAutoDefense(true));fast.update(40);assert.equal(fast.phaseTime,80);fast.phase='field';fast.field={runners:[]};fast.updateField=()=>{};fast.update(40);assert.equal(fast.phaseTime,160);fast.paused=true;fast.update(40);assert.equal(fast.phaseTime,160);fast.paused=false;assert(fast.setAutoDefense(false));fast.setPhase('aim');for(let i=0;i<20;i++)fast.update(50);assert.equal(fast.phase,'aim');
fast.field=null;const restored=NightGame.restore(fast.snapshot(),()=>{});assert.equal(restored.defenseSpeed,2);assert.equal(restored.autoDefense,false);
assert(!new NightGame('practice','standard',()=>{}).setAutoDefense(true));fast.half='bottom';assert(!fast.setAutoDefense(true));
// Both user-side orders preserve chosen clubs, roster, starter and per-side scores.
for(const userHome of [true,false]){const own='wolves',opp='foxes',c=NightTeams.get(own),order=c.batters.slice(1,10).map(p=>p.id),g=new NightGame('match','standard',()=>{},{homeTeamId:userHome?own:opp,awayTeamId:userHome?opp:own,userHome,order,pitcher:2});assert.equal(g.teams[g.userSide].id,own);assert.deepEqual(g.lineups[g.userSide].map(p=>p.id),order);assert.equal(g.defending,userHome);g.half=userHome?'top':'bottom';assert.equal(g.pitcher.id,c.pitchers[2].id);}
// Official LF/CF/RF measurements anchor both geometry and gameplay wall lookup.
for(const [id,feet] of [['night',325],['brick',325],['sky',330],['harbor',325],['dome',330],['river',328],['taipei-dome',335]]){const p=NightPlayers.parks.find(p=>p.id===id);assert(p);assert.equal(p.left,Math.round(feet*.3048*100)/100);assert.equal(p.center,121.92);for(const [a,n] of [[-Math.PI/4,p.left],[0,p.center],[Math.PI/4,p.right]])assert(Math.abs(NightPlayers.wallDistance(p,a)-n)<1e-8);assert(p.source.startsWith('https://'));}
const saved=new NightGame('match','standard',()=>{}).snapshot();saved.state.park={id:'dome',name:'GRAND DOME',center:125,corner:110};const migrated=NightGame.restore(saved,()=>{});assert.equal(migrated.park.name,'樂天桃園棒球場');assert.equal(migrated.park.center,121.92);
const html=fs.readFileSync('dist/index.html','utf8'),app=fs.readFileSync('dist/app.js','utf8');assert(!html.includes('data-run-command="hold"'));assert(app.includes('data-run-command="advance"'));assert(app.includes('data-run-command="return"'));assert(app.includes('game?.selectRunner(b.dataset.runner)&&game.commandRunners'));
console.log('PASS: '+pitches+' automated pitches across home/away, match/pennant and 1x/2x; half-boundary handoff, pause/cancel, no compounded speed, match-side lineup/starter, official stadium dimensions and legacy park migration, independent runner commands.');
