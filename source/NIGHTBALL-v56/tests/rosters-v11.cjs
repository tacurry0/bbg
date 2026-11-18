const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');global.window=global;
for(const f of ['ratings-data','players','pennant','derby','game'])vm.runInThisContext(fs.readFileSync('dist/'+f+'.js','utf8'));
const positions=['1B','2B','3B','C','CF','DH','LF','RF','SS'];
for(const club of NightTeams.all){
 assert.equal(club.batters.length,16);assert.equal(club.pitchers.length,14);assert.deepEqual(club.batters.slice(0,9).map(p=>p.pos).sort(),positions);
 assert.equal(new Set([...club.batters,...club.pitchers].map(p=>p.name)).size,30);
 for(const p of [...club.batters,...club.pitchers]){assert(p.name&&(Number.isInteger(p.no)||p.no==='00'));assert(['L','R'].includes(p.hand));assert.equal(p.season,2026);assert(p.ratingsBasedOnStats);}
 const order=club.batters.slice(0,9).map(p=>p.id).reverse(),g=new NightGame('match','standard',()=>{},{homeTeamId:club.id,awayTeamId:'foxes',order});g.half='bottom';g.bases=[true,false,true];g.baseIds=[order[4],null,order[7]];g.homeScore=3;g.box[order[0]]={ab:2,h:1};g.startField(20,35,0,false);
 const old=JSON.parse(JSON.stringify(g.snapshot()));for(const side of ['home','away'])for(const p of old.state.lineups[side])p.name='旧データの架空名';old.state.field.batterName='旧データの架空名';old.state.field.fielders.forEach(f=>f.player='旧データの架空名');
 const fresh=NightGame.restore(old,()=>{});assert.deepEqual(fresh.lineups.home.map(p=>p.id),order);assert.equal(fresh.batter.name,club.batters[8].name);assert.equal(fresh.field.batterName,fresh.batter.name);assert(fresh.field.fielders.every(f=>f.player!=='旧データの架空名'));assert.deepEqual(fresh.baseIds,g.baseIds);assert.equal(fresh.homeScore,3);assert.deepEqual(fresh.box,g.box);
 for(const p of club.batters){const d=new NightGame('derby','standard',()=>{},{homeTeamId:club.id,practiceBatter:p.id});assert.equal(d.batter.name,p.name);}
}
console.log('PASS: 180 real identities, complete defense/DH, all 96 derby choices; stale snapshots migrate names while preserving custom order, runners, score and box stats.');
