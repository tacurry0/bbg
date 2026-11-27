const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,'dist',f),'utf8');
const c=vm.createContext({console,performance,structuredClone});c.window=c;
for(const name of ['ratings-data','players','pro-parks','pennant','apbc-data','npb-data','npb-rosters','kbo-data','kbo-rosters','apbc-candidates','apbc-tournament','derby','game','online-derby'])vm.runInContext(read(name+'.js'),c,{filename:name+'.js'});
const make=opts=>new c.NightGame('derby','standard',()=>{},{park:'tokyo-dome',weather:'clear',crowdAttendance:'empty',derby:{enhanced:true,mode:'record',...opts}});
const step=(g,n=1)=>{for(let i=0;i<n;i++)g.update(20);};
const shot=(speed,launch,spray)=>{const g=make();g.beginHalf();g.startField(speed,launch,spray,false,true);return g;};
const finish=g=>{const start=g.derby.remaining;let frames=0;while(g.phase==='field'&&frames++<1000)step(g);assert.equal(g.phase,'result');assert.equal(g.derby.remaining,start-20*frames);return g;};
{
 const g=shot(62,29,.15);step(g,40);assert.equal(g.phase,'field');assert(Math.abs(g.field.elapsed-.8)<1e-6,'exactly normal 1x flight');assert.equal(g.derby.remaining,119200);assert.equal(c.NightGame.crowdAttendance(g),1);
 finish(g);assert.equal(g.hit.kind,'hr');assert(g.field.ball.bounces>0);assert(g.field.homerCelebration);const rem=g.derby.remaining;step(g,10);assert.equal(g.derby.remaining,rem-200);
}
{
 const g=shot(48,30,1.1);step(g,40);assert.equal(g.phase,'field','foul must not cut at .65s');finish(g);assert.equal(g.hit.kind,'foul');assert(g.field.ball.bounces);
 const ground=shot(36,-5,0);step(ground,45);assert.equal(ground.phase,'field','grounder not cut on first bounce');finish(ground);assert.equal(ground.hit.kind,'in-play');assert(ground.field.ball.bounces);const before=ground.field.ball.y;step(ground,5);assert.notEqual(ground.field.ball.y,before,'ball keeps rolling during result');
}
{
 const g=make();g.beginHalf();g.derby.remaining=1;step(g);assert.equal(g.derbyTransition,'finish','no extra pitch from windup after expiry');
 const h=shot(62,29,0);h.derby.remaining=500;step(h,40);assert.equal(h.derby.remaining,0);assert.equal(h.phase,'field');let count=0;while(h.phase!=='derby-break'&&count++<1000)step(h);assert.equal(h.derbyTransition,'finish');assert.equal(h.derby.turnHR,1,'released final ball still counts');
}
{
 const g=make({mode:'online'});g.derby.target=0;g.beginHalf();g.startField(62,29,0,false,true);finish(g);assert(g.derby.pendingFinish);assert(g.field.homerCelebration.walkoff);step(g,100);assert.equal(g.phase,'result','walkoff has a longer broadcast cut');step(g,100);assert.equal(g.phase,'derby-break');
}
{
 const g=make();const entry={club:g.teams.home,player:g.batter};const clips=c.NightDerby.simulateTurn(entry,g.park,120000);
 assert(clips.length>0);assert(clips.every(p=>p.startMs+p.windup<120000));let end=0;for(const p of clips){assert(Math.abs(p.startMs-end)<.01);end=p.startMs+p.windup+p.contactTime+p.fieldMs+p.resultMs;}assert(end>=119000);
}
console.log('PASS v263: live clock, full stands, 1x physics, foul/ground roll, final pitch, walk-off, CPU time budget');
