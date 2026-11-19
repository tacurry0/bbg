const assert=require('node:assert/strict');
const {readFileSync,existsSync}=require('node:fs');
const vm=require('node:vm');
global.window=global;
const dist='dist/';
for(const f of ['ratings-data','players','pro-parks','pennant','apbc-data','npb-data','npb-rosters','game'])
 vm.runInThisContext(readFileSync(dist+f+'.js','utf8'),{filename:f+'.js'});

assert.equal(NightNPBData.season,2026);
assert.equal(NightNPB.teams.length,14);
assert.equal(NightTeams.all.length,6,'legacy CPBL pennant stays six-team');
assert.equal(NightTeams.playable.length,24,'6 CPBL, 4 APBC, 14 NPB playable');
assert.equal(NightTeams.matchTeams.length,20,'exhibition: 6 CPBL and 14 NPB');
assert.equal(NightTeams.get('apbc-japan').id,'apbc-japan','international squads must be preserved');
assert.equal(NightNPB.divisions.central.length,6);
assert.equal(NightNPB.divisions.pacific.length,6);
assert.deepEqual(NightNPB.divisions.farm.map(t=>t.id),['npb-a','npb-v']);
assert.equal(NightNPB.get('npb-a').name,'オイシックス新潟アルビレックスBC');
assert.equal(NightNPB.get('npb-v').name,'ハヤテベンチャーズ静岡');

const names=[],ids=new Set(),values=new Set();
for(const club of NightNPB.teams){
 assert(club.id.startsWith('npb-'));
 assert.equal(club.batters.length,16,club.id+' batters');
 assert.equal(club.pitchers.length,14,club.id+' pitchers');
 assert.equal(club.startingOrder.length,9);
 assert.equal(new Set(club.startingOrder).size,9);
 assert.equal(club.startingOrder.filter(id=>club.batters.some(p=>p.id===id)).length,9);
 assert(existsSync('dist/'+club.logo.slice(2)),'original team monogram exists: '+club.logo);
 assert.equal(NightTeams.get(club.id),club);
 const lineup=NightGame.arrangeLineup(club);
 assert.equal(lineup.length,9);
 assert.equal(new Set(lineup.map(p=>p.fieldPos)).size,9,'every defensive position and DH is assigned');
 assert.equal(new Set(lineup.map(p=>p.id)).size,9);
 for(const p of club.batters){
  assert(!ids.has(p.id));ids.add(p.id);
  assert(p.name&&p.club===club.name);
  assert(p.sourceUrl.includes('npb.jp/bis/2026/stats/'),'official source link');
  assert(['NPB一軍','NPBファーム'].includes(p.statsLevel));
  assert(p.stats.pa>=10&&p.stats.ab>=0&&p.stats.h>=0&&p.stats.h<=p.stats.ab);
  assert(p.ratingsBasedOnStats&&!p.ratingsProvisional);
  assert(p.confidence>0&&p.confidence<1);
  assert(p.estimates.includes('field'),'uncertainty is disclosed');
  for(const key of ['contact','power','run','field','arm'])
   assert(Number.isInteger(p[key])&&p[key]>=35&&p[key]<=98,club.short+'/'+p.name+': '+key+' '+p[key]);
  values.add([p.contact,p.power,p.run,p.field,p.arm].join('/'));
 }
 for(const p of club.pitchers){
  assert(!ids.has(p.id));ids.add(p.id);
  assert(p.name&&p.club===club.name);
  assert(p.sourceUrl.includes('npb.jp/bis/2026/stats/'));
  assert(p.stats.ip>0&&p.stats.k>=0&&p.stats.bb>=0);
  assert(p.ratingsBasedOnStats&&!p.ratingsProvisional);
  assert(p.speedEstimated,'ballpark fastball radar is not measured');
  assert(p.estimates.includes('velocity')&&p.estimates.includes('pitchRepertoire'),'estimates are disclosed');
  assert(p.pitches.length>=2);
  for(const key of ['control','movement','stamina'])
   assert(Number.isInteger(p[key])&&p[key]>=35&&p[key]<=98,club.short+'/'+p.name+': '+key+' '+p[key]);
  assert(p.velocity>=130&&p.velocity<=160);
  values.add([p.velocity,p.control,p.movement,p.stamina].join('/'));
 }
 const g=new NightGame('match','standard',()=>{},{homeTeamId:club.id,awayTeamId:'owls',userHome:true,park:club.park});
 assert.equal(g.teams.home.id,club.id);
 assert.equal(g.pitcher.id.startsWith('npb-'),true,'NPB starting staff is active when defending');
 assert.equal(g.lineups.home.length,9);
 g.startField(32,24,0,false);
 assert(g.field&&g.field.landing.time>0,'real match starts and computes live ball');
 g.update(16);
}
assert.equal(ids.size,420);
assert(values.size>300,'most players have distinguishable ability profiles');
const cpbl=new NightPennant('owls',4);
assert.equal(cpbl.schedule.length,20);
assert.equal(cpbl.schedule[0].length,3);
assert.equal(new Set(cpbl.schedule.flat().flatMap(g=>[g.home,g.away])).size,6,'CPBL old standings and schedule remain unchanged');
const checkCache=readFileSync('dist/sw.js','utf8');
assert(checkCache.includes('npb-data.js?v=64')&&checkCache.includes('npb-rosters.js?v=74'));
assert(checkCache.includes('assets/npb/npb-v.svg'));
const html=readFileSync('dist/index.html','utf8');
assert(html.indexOf('npb-data.js?v=64')<html.indexOf('npb-rosters.js?v=74'));
const rosterScript=html.indexOf('npb-rosters.js?v=74');
const appScript=html.search(/<script type="module" src="\.\/app\.js\?v=[\w.-]+">/);
assert(rosterScript>=0&&appScript>rosterScript,'rosters must load before the app entry point');
console.log('PASS NPB 2026: 14 teams, 420 uniquely sourced players, independent farm clubs, each playable in live match, official evidence/uncertainty, CPBL and APBC compatibility, offline cache.');
