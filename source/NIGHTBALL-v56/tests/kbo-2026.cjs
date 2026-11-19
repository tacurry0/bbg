const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
for(const name of ['ratings-data','players','pennant','apbc-data','npb-data',
                    'npb-rosters','kbo-data','kbo-rosters','game']){
 vm.runInThisContext(fs.readFileSync('dist/'+name+'.js','utf8'),{filename:name+'.js'});
}
assert.equal(NightTeams.all.length,6,'CPBL pennant still has 6 teams');
assert.equal(NightTeams.npb.length,14,'NPB 14 clubs unchanged');
assert.equal(NightTeams.kbo.length,10,'All 10 KBO clubs included');
assert.equal(NightTeams.international.length,4,'APBC four countries preserved');
assert.equal(NightTeams.matchTeams.length,30,'6 CPBL + 14 NPB + 10 KBO in exhibition');
assert.equal(NightTeams.playable.length,34,'practice and derby include all leagues');
assert.equal(NightTeams.get('npb-l').name,'埼玉西武ライオンズ');
assert.equal(NightTeams.get('apbc-japan').id,'apbc-japan');
assert.equal(NightKBO.version,'kbo2026-official-10clubs-v1');
assert.equal(NightKBO.referencePopulations.batters,140);
assert.equal(NightKBO.referencePopulations.pitchers,150);
const expected=['ht','ss','lg','ob','kt','sk','lt','hh','nc','wo'];
assert.deepEqual(NightTeams.kbo.map(x=>x.id),expected.map(x=>'kbo-'+x));
const ids=new Set(),skills=new Set();
for(const t of NightTeams.kbo){
 assert.equal(t.batters.length,16,t.id);
 assert.equal(t.pitchers.length,14,t.id);
 assert.equal(t.startingOrder.length,9,t.id);
 assert.equal(new Set(t.startingOrder).size,9,t.id);
 assert.equal(t.startingOrder.every(id=>t.batters.some(p=>p.id===id)),true,t.id);
 assert.equal(new Set(t.batters.slice(0,9).map(p=>p.pos)).size,9,
              'Starting lineup should cover nine distinct defensive/DH positions');
 assert.equal(NightTeams.get(t.id),t);
 assert(fs.existsSync('dist/'+t.logo.replace(/^\.\//,'')),'original badge '+t.id);
 for(const b of t.batters){
  assert(!ids.has(b.id),'unique player identity: '+b.id);ids.add(b.id);
  assert(b.name&&b.sourceUrl.includes('eng.koreabaseball.com/Stats/'));
  assert(b.identityUrl.includes('pcode='));
  assert.equal(b.season,2026);
  assert.equal(b.ratingsProvisional,false);
  assert.equal(b.ratingsBasedOnStats,true);
  assert(b.stats.pa>0&&b.stats.h>=0&&b.stats.h<=b.stats.ab);
  assert(b.estimates.includes('hand')&&b.estimates.includes('field'),
         'clearly disclose unavailable scouting facts');
  for(const k of ['contact','power','run','field','arm'])
   assert(Number.isInteger(b[k])&&b[k]>=35&&b[k]<=98,t.id+'/'+b.name+' '+k);
  skills.add([b.contact,b.power,b.run,b.field,b.arm].join('/'));
 }
 for(const p of t.pitchers){
  assert(!ids.has(p.id),'unique player identity '+p.id);ids.add(p.id);
  assert(p.name&&p.sourceUrl.includes('eng.koreabaseball.com/Stats/'));
  assert(p.identityUrl.includes('pcode='));
  assert(p.stats.ip>0&&p.stats.bb>=0&&p.stats.k>=0);
  assert.equal(p.ratingsBasedOnStats,true);
  assert.equal(p.speedEstimated,true,'KBO velocity cannot masquerade as verified');
  assert(p.estimates.includes('velocity')&&p.estimates.includes('pitchRepertoire'));
  assert(p.pitches.length>=2);
  for(const k of ['control','stamina','movement'])
   assert(Number.isInteger(p[k])&&p[k]>=35&&p[k]<=98,t.id+'/'+p.name+' '+k);
  assert(p.velocity>=130&&p.velocity<=160);
  skills.add([p.velocity,p.control,p.stamina,p.movement].join('/'));
 }
 const g=new NightGame('match','standard',()=>{},
   {homeTeamId:t.id,awayTeamId:'owls',userHome:true,park:t.park});
 assert.equal(g.teams.home.id,t.id);
 assert.equal(g.lineups.home.length,9);
 assert.equal(g.pitcher.id.startsWith('kbo-'),true);
 g.startField(32,24,0,false);
 assert(g.field?.landing?.time>0,'match flight model accepts KBO team');
 g.update(16);
}
assert.equal(ids.size,300);
assert(skills.size>225,'individualized ability records');
const pennant=new NightPennant('owls',4);
assert.equal(pennant.schedule.length,20);
assert.equal(new Set(pennant.schedule.flat().flatMap(x=>[x.home,x.away])).size,6,
 'existing six-team CPBL season does not accidentally absorb KBO');
const sw=fs.readFileSync('dist/sw.js','utf8'),html=fs.readFileSync('dist/index.html','utf8');
assert(sw.includes('nightball-v66-kbo10-official'));
assert(sw.includes('kbo-data.js?v=66')&&sw.includes('kbo-rosters.js?v=66'));
assert(sw.includes('assets/kbo/kbo-wo.svg'));
assert(html.indexOf('kbo-data.js?v=66')<html.indexOf('kbo-rosters.js?v=66'));
assert(html.indexOf('kbo-rosters.js?v=66')<html.indexOf('app.js?v=66'));
console.log('PASS KBO 2026: 10 independently rated teams, 300 sourced player records, all live matches, 9-position lineups, KBO/NPB/CPBL exhibition, existing CPBL pennant and APBC preserved, offline cache.');
