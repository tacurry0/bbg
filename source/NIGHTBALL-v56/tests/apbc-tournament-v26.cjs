const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
for(const name of ['ratings-data','players','pennant','apbc-data','apbc-candidates','apbc-tournament','game'])vm.runInThisContext(fs.readFileSync('dist/'+name+'.js','utf8'));
const T=NightAPBCTournament;
const copy=value=>JSON.parse(JSON.stringify(value));
const make=(t)=>new NightGame('match','standard',()=>{},{competition:'apbc2026',apbcFixtureId:t.active.id,apbcFinal:t.active.day===3&&t.active.slot===1,apbcRoster:{team:t.team,ids:t.roster},homeTeamId:t.active.home,awayTeamId:t.active.away,userHome:t.active.home===t.team,park:'tokyo-dome',innings:t.innings});
for(const team of T.teams){
 const official=T.official(team),pool=T.pool(team);
 assert.equal(official.length,28,team);
 assert(T.rosterStatus(team,official).valid);
 assert.equal(new Set(official).size,28);
 assert(pool.length>28,team);
 const alternate=pool.find(p=>!official.includes(p.id)&&p.pos==='P')||pool.find(p=>!official.includes(p.id));
 const outgoing=pool.find(p=>official.includes(p.id)&&p.pos===alternate.pos)||pool.find(p=>official.includes(p.id)&&p.pos!=='P'&&p.pos!=='C');
 const roster=official.map(id=>id===outgoing.id?alternate.id:id);
 assert(T.rosterStatus(team,roster).valid);
 assert(!T.rosterStatus(team,[...roster,outgoing.id]).valid);
 const picked=T.club(team,roster),all=[...picked.batters,...picked.pitchers];
 assert(all.some(p=>p.id===alternate.id));assert(!all.some(p=>p.id===outgoing.id));
 assert.equal(new Set(all.map(p=>p.no)).size,28);
 for(const innings of [1,9])for(const win of [false,true]){
  let t=new T(team,innings,roster);
  for(let day=0;day<4;day++){
   const taipei='apbc-taipei',taipeiPool=T.pool(taipei),taipeiOfficial=T.official(taipei);
const normalizedName=name=>name.normalize('NFKC').replace(/[\s.・．·]/g,'');
assert.equal(taipeiPool.length,new Set(taipeiPool.map(p=>normalizedName(p.name))).size);
assert(!taipeiPool.some(p=>['魔鷹','羅戈','鈴木駿輔'].includes(p.name)));
assert(taipeiPool.some(p=>p.name==='林吳晉瑋'&&p.sourceClubId==='owls'));
assert(taipeiPool.some(p=>p.name==='陽柏翔'&&!p.sourceClubId));
const candidates=NightTeams.all.map(c=>{
 const expected=c.batters.find(p=>taipeiPool.some(q=>q.id===p.id));
 assert(expected,c.name);
 const added=taipeiPool.find(p=>p.id===expected.id);
 assert.equal(added.sourceClubId,c.id);
 assert.equal(added.power,expected.power);
 assert(taipeiPool.some(p=>p.sourceClubId===c.id&&p.pos==='P'));
 return added.id;
});
const combined=taipeiOfficial.slice();
for(const id of candidates){
 const i=combined.findIndex(pid=>!candidates.includes(pid)&&taipeiPool.some(p=>p.id===pid&&p.pos!=='P'&&p.pos!=='C'));
 combined[i]=id;
}
assert(T.rosterStatus(taipei,combined).valid);
const taipeiCup=new T(taipei,1,combined),taipeiGame=make(taipeiCup);
const taipeiRestored=NightGame.restore(copy(taipeiGame.snapshot()),()=>{});
assert(candidates.every(id=>taipeiRestored.teams[taipeiRestored.userSide].batters.some(p=>p.id===id)));
const g=make(t);
   assert.equal(g.totalInnings,innings);
   assert.equal(g.park.id,'tokyo-dome');
   assert.equal(g.teams[g.userSide].id,team);
   assert.equal(g.outs,innings===1?2:0);
   assert.equal(g.bases.filter(Boolean).length,innings===1?3:0);
   g.beginHalf();g.changeHalf();
   assert.equal(g.phase,'change');assert(g.acknowledgeHalf());
   g.inning=innings;g.changeHalf();
   assert.equal(g.inning,innings+1,'a tie enters extras');
   assert.equal(g.outs,innings===1?2:0);
   assert.deepEqual(g.bases,innings===1?[true,true,true]:[true,true,false]);
   t.currentGame=g.snapshot();t=T.restore(copy(t.snapshot()));assert(t.currentGame);
   const r=NightGame.restore(t.currentGame,()=>{});
   assert(r.teams[r.userSide][alternate.pos==='P'?'pitchers':'batters'].some(p=>p.id===alternate.id));
   r[r.userSide+'Score']=win?1:0;r[r.opponentSide+'Score']=win?0:1;r.setPhase('ended');
   assert(t.complete(r,{stub:true}));assert(!t.complete(r,{stub:true}));
   assert.equal(t.results.length,2*(day+1));
   assert.equal(t.standings.reduce((n,x)=>n+x.w,0),2*Math.min(day+1,3));
   t=T.restore(copy(t.snapshot()));assert(t);
  }
  assert.equal(t.place,win?1:4);assert.equal(t.results.length,8);
 }
}
const g=make(new T('apbc-japan',9,T.official('apbc-japan')));
g.inning=7;g.half='bottom';g.homeScore=10;g.changeHalf();assert.equal(g.phase,'ended');
const final=make(new T('apbc-japan',9,T.official('apbc-japan')));
final.apbcFinal=true;final.inning=7;final.half='bottom';final.homeScore=10;final.changeHalf();assert.equal(final.phase,'change');
const australia=new T('apbc-australia',1,T.official('apbc-australia'));
assert.equal(australia.active.away,'apbc-australia');assert.equal(australia.active.home,'apbc-korea');
console.log('PASS: 4-team schedule, 28-player registration with real reserves, 1/9 innings and both tiebreakers, mercy rule, save/restore, CPU scores, championship and third-place path.');
