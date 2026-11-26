const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');global.window=global;for(const f of ['ratings-data','players','pennant','derby','game'])vm.runInThisContext(fs.readFileSync('dist/'+f+'.js','utf8'));
const all=NightTeams.all.flatMap(c=>[...c.batters,...c.pitchers]),find=name=>all.find(p=>p.name===name);
assert.equal(all.length,181);for(const p of all){assert(p.ratingsBasedOnStats);assert.equal(p.ratingsProvisional,false);assert(p.stats);for(const k of p.pos==='P'?['control','stamina','movement']:['contact','power','run','field','arm'])assert(Number.isInteger(p[k])&&p[k]>=35&&p[k]<=98,p.name+'/'+k);if(p.pos==='P'){assert(p.pitches.includes('fast'));assert(!p.pitches.includes('knuckle'));assert(p.pitches.every(id=>NightGame.TYPES.some(t=>t.id===id)));}}
assert.equal(find('陳晨威').stats.sb,23);assert.equal(find('魔鷹').stats.hr,20);assert.equal(find('陳傑憲').stats.avg,.322);
assert(find('魔鷹').power>find('王威晨').power);assert(find('陳晨威').power<80);assert(find('宋晟睿').power<85);assert(find('陳晨威').run>find('林泓育').run);assert(find('陳傑憲').contact>find('曾聖安').contact);assert(find('布雷克').control>find('鄭浩均').control);
assert.equal(find('江承諺').velocity,135);assert.equal(find('喬登').velocity,150);assert(Math.abs(find('德保拉').stats.ip-(99+2/3))<1e-8);assert.equal(find('杜家明').stats.pa,20);assert(find('杜家明').confidence<.2);assert(find('杜家明').power<80);
assert.equal(find('江坤宇').field>=90,true);assert.equal(find('宋嘉翔').arm>=90,true);
assert.equal(NightGame.pitchSpec(find('鄭浩均'),'curve').name,'ナックルカーブ');assert.equal(NightGame.pitchSpec(find('蔣銲'),'change').name,'バルカンチェンジ');assert.equal(NightGame.pitchSpec(find('艾速特'),'slider').name,'スイーパー');
const oldRandom=Math.random;Math.random=()=>.5;
try{for(const club of NightTeams.all)for(let i=0;i<3;i++){const g=new NightGame('match','standard',()=>{},{homeTeamId:club.id,pitcher:i});g.beginHalf();g.pitchType='fast';assert(g.throwPitch());assert.equal(g.pitch.speed,Math.round(NightGame.stretchPitchSpeed(club.pitchers[i].velocityEvidence.fastAvg)));assert(g.pitch.duration>0);}}
finally{Math.random=oldRandom;}
function derby(club,name){const p=NightTeams.get(club).batters.find(p=>p.name===name);return new NightGame('derby','standard',()=>{},{homeTeamId:club,practiceBatter:p.id});}
assert(derby('wolves','陳晨威').runnerSpeed>derby('wolves','林泓育').runnerSpeed);assert(derby('falcons','陳傑憲').batSize.rx>derby('foxes','曾聖安').batSize.rx);
// v183 note: the thrown-fastball assertion above now expects the
// measured fastAvg run through NightGame.stretchPitchSpeed — the
// pitch-feel rebalance stretches every set speed around 124 km/h, so
// gameplay speeds are the measured averages widened by that map, not
// the raw averages themselves.
console.log('PASS: all 180 performance-based ratings; real stat inputs, sensible player strengths, small-sample correction, innings fractions, verified pitch labels and measured fastball speeds (v183-stretched) in gameplay.');
