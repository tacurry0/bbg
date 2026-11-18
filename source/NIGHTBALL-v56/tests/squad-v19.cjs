const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');global.window=global;for(const name of ['ratings-data','players','pennant','game','squad'])vm.runInThisContext(fs.readFileSync('dist/'+name+'.js','utf8'));
const positions=['C','1B','2B','3B','SS','LF','CF','RF','DH'];
for(const club of NightTeams.all){
 const original=JSON.stringify(club),fresh=()=>{const c={order:club.startingOrder.slice(),pitcher:0};NightSquad.normalize(club,c);return c;};
 for(let slot=0;slot<9;slot++)for(const reserve of club.batters.filter(p=>!club.startingOrder.includes(p.id))){
  const c=fresh(),before=JSON.stringify(c),old=c.order[slot],pos=positions.find(p=>c.fielding[p]===old);assert(NightSquad.swap(club,c,old,reserve.id));assert.equal(c.order[slot],reserve.id);assert.equal(c.fielding[pos],reserve.id);assert(!c.order.includes(old));assert.equal(new Set(c.order).size,9);assert(NightSquad.swap(club,c,reserve.id,old));assert.equal(JSON.stringify(c),before);
 }
 const c=fresh(),a=c.order[0],b=c.order[8],field=JSON.parse(JSON.stringify(c.fielding));assert(NightSquad.swap(club,c,a,b));assert.equal(c.order[8],a);assert.deepEqual(c.fielding,field);const oldPos=positions.find(pos=>c.fielding[pos]===a),newPos=positions.find(pos=>c.fielding[pos]===b);assert(NightSquad.position(club,c,a,newPos));assert.equal(c.fielding[newPos],a);assert.equal(c.fielding[oldPos],b);
 const reserves=club.batters.filter(p=>!c.order.includes(p.id));assert(!NightSquad.swap(club,c,reserves[0].id,reserves[1].id));assert(!NightSquad.swap(club,c,'missing',a));assert(!NightSquad.swap(club,c,a,a));
 NightSquad.auto(club,c);assert.equal(new Set(c.order).size,9);assert.deepEqual(Object.keys(c.fielding).sort(),positions.slice().sort());assert.equal(new Set(Object.values(c.fielding)).size,9);assert(c.order.every(id=>club.batters.some(p=>p.id===id)));
 for(const userHome of [true,false]){const opts={homeTeamId:userHome?club.id:'foxes',awayTeamId:userHome?'foxes':club.id,userHome,order:c.order,fielding:c.fielding};for(const mode of ['match','pennant']){const g=new NightGame(mode,'standard',()=>{},opts),restored=NightGame.restore(JSON.parse(JSON.stringify(g.snapshot())),()=>{});assert.deepEqual(g.lineups[g.userSide].map(p=>p.id),c.order);assert.deepEqual(restored.lineups[g.userSide].map(p=>p.fieldPos),g.lineups[g.userSide].map(p=>p.fieldPos));}}
 NightSquad.reset(club,c);assert.deepEqual(c.order,club.startingOrder);assert.equal(c.pitcher,0);assert.equal(JSON.stringify(club),original);
}
console.log('PASS: 378 starter/bench exchanges, batting order/position swaps, automatic selection, reset, all clubs, match/pennant, both user sides, save/reload, immutable source roster.');
