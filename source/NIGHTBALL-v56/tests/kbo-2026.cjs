const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
for(const name of ['ratings-data','players','pro-parks','pennant','apbc-data','npb-data',
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
const ids=new Set(),skills=new Set();let matchedProfiles=0,matchedPositions=0;
const sourceNames=new Map(NightKBOData.teams.flatMap(team=>[...team.batters,...team.pitchers]).map(p=>[p.id,p.name]));
function checkJapaneseName(p){
 assert.match(p.name,/^[ァ-ヺー]+(?:・[ァ-ヺー]+)+$/u,p.id+' has a Japanese display name');
 assert.equal(p.romanizedName,sourceNames.get(p.id),p.id+' retains the original source name');
}
for(const t of NightTeams.kbo){
 assert.equal(t.batters.length,16,t.id);
 assert.equal(t.pitchers.length,14,t.id);
 assert.equal(t.startingOrder.length,9,t.id);
 assert.equal(new Set(t.startingOrder).size,9,t.id);
 assert.equal(t.startingOrder.every(id=>t.batters.some(p=>p.id===id)),true,t.id);
 assert.equal(new Set(Object.keys(t.startingFielding)).size,9,
              'Starting defense covers exactly nine unique positions');
 assert.equal(new Set(Object.values(t.startingFielding)).size,9,
              'Starting defense uses nine unique players');
 assert(t.startingOrder.every(id=>Object.values(t.startingFielding).includes(id)),
        'Every defensive starter appears in the nine-man batting order');
 assert.equal(NightTeams.get(t.id),t);
 assert.equal(t.logo,`./assets/kbo/${t.id}.png`);
 const logo=fs.readFileSync('dist/'+t.logo.slice(2));
 assert.equal(logo.subarray(0,8).toString('hex'),'89504e470d0a1a0a',t.id+' loads a PNG');
 for(const b of t.batters){
  assert(!ids.has(b.id),'unique player identity: '+b.id);ids.add(b.id);
  checkJapaneseName(b);
  assert(b.sourceUrl.includes('eng.koreabaseball.com/Stats/'));
  assert(b.identityUrl.includes('pcode='));
  assert.equal(b.season,2026);
  assert.equal(b.ratingsProvisional,false);
  assert.equal(b.ratingsBasedOnStats,true);
  assert(b.stats.pa>0&&b.stats.h>=0&&b.stats.h<=b.stats.ab);
  assert(b.estimates.includes('field'),'fielding measurements are estimated');
  if(b.identityEvidence){matchedProfiles++;
    assert(!b.handEstimated&&b.nativeName!==b.romanizedName,'2026 profile matching enriches identity');
    if(!b.positionEstimated)matchedPositions++;
  }else assert(b.handEstimated&&b.estimates.includes('hand'),'unknown handedness disclosed');
  for(const k of ['contact','power','run','field','arm'])
   assert(Number.isInteger(b[k])&&b[k]>=35&&b[k]<=98,t.id+'/'+b.name+' '+k);
  skills.add([b.contact,b.power,b.run,b.field,b.arm].join('/'));
 }
 for(const p of t.pitchers){
  assert(!ids.has(p.id),'unique player identity '+p.id);ids.add(p.id);
  checkJapaneseName(p);
  assert(p.sourceUrl.includes('eng.koreabaseball.com/Stats/'));
  assert(p.identityUrl.includes('pcode='));
  assert(p.stats.ip>0&&p.stats.bb>=0&&p.stats.k>=0);
  assert.equal(p.ratingsBasedOnStats,true);
  if(p.pitchingEvidence2026&&Number.isFinite(p.pitchingEvidence2026.avg?.fast)){
   assert.equal(p.speedEstimated,false);
   assert.equal(p.pitchDetails.fast.speed,p.pitchingEvidence2026.avg.fast);
   assert(p.pitchingEvidence2026.source);
  }else{
   assert(p.speedEstimated);
   assert(p.estimates.includes('velocity'));
  }
  assert(p.estimates.includes('pitchMovement'));
  if(p.identityEvidence){matchedProfiles++;
    assert(!p.throwHandEstimated,'historical profile supports pitcher throwing hand');
  }else assert(p.throwHandEstimated,'unknown pitcher throwing hand disclosed');
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
assert.equal(matchedProfiles,117,'114 cached and 3 official player identities');
assert(matchedPositions>=40,'verified primary defensive positions are integrated');
const kia=NightKBO.get('kbo-ht');
assert.equal(kia.batters.find(p=>p.id===kia.startingFielding.SS).name,'ハ・ジュソク');
assert(['ハン・ジュンス','キム・テグン'].includes(kia.batters.find(p=>p.id===kia.startingFielding.C).name));
const doYeong=NightKBO.get('kbo-ht').batters.find(p=>p.name==='キム・ドヨン');
assert.equal(doYeong.nativeName,'김도영');assert.equal(doYeong.no,'5');
assert.equal(doYeong.pos,'3B');assert.equal(doYeong.hand,'R');
const naSung=NightKBO.get('kbo-ht').batters.find(p=>p.name==='ナ・ソンボム');
assert.equal(naSung.hand,'L');assert.equal(naSung.pos,'RF');

const legacyMatch=new NightGame('match','standard',()=>{},
  {homeTeamId:'kbo-hh',awayTeamId:'kbo-kt',userHome:true});
const legacy=structuredClone(legacyMatch.snapshot());
for(const side of ['home','away']){
 for(const player of [...legacy.state.lineups[side],...legacy.state.pitchingStaff[side]])player.name=player.romanizedName;
}
const resumed=NightGame.restore(legacy,()=>{});
assert.equal(resumed.batter.name,legacyMatch.batter.name);
assert.equal(resumed.pitcher.name,legacyMatch.pitcher.name);

assert(skills.size>225,'individualized ability records');
const pennant=new NightPennant('owls',4);
assert.equal(pennant.schedule.length,20);
assert.equal(new Set(pennant.schedule.flat().flatMap(x=>[x.home,x.away])).size,6,
 'existing six-team CPBL season does not accidentally absorb KBO');
const sw=fs.readFileSync('dist/sw.js','utf8'),html=fs.readFileSync('dist/index.html','utf8');
assert(sw.includes('kbo-data.js?v=76')&&sw.includes('kbo-rosters.js?v=74'));
assert(sw.includes('assets/kbo/kbo-wo.png'));
assert(html.indexOf('kbo-data.js?v=76')<html.indexOf('kbo-rosters.js?v=74'));
const rosterScript=html.indexOf('kbo-rosters.js?v=74');
const appScript=html.search(/<script type="module" src="\.\/app\.js\?v=[\w.-]+">/);
assert(rosterScript>=0&&appScript>rosterScript,'rosters must load before the app entry point');
console.log('PASS KBO 2026: 10 independently rated teams, 300 sourced player records, all live matches, 9-position lineups, KBO/NPB/CPBL exhibition, existing CPBL pennant and APBC preserved, offline cache.');
