const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
for(const f of ['ratings-data','players','pro-parks','pennant','apbc-data','npb-data','npb-rosters','kbo-data','kbo-rosters','game'])vm.runInThisContext(fs.readFileSync('dist/'+f+'.js','utf8'),{filename:f+'.js'});
const all=NightTeams.matchTeams.flatMap(t=>t.pitchers);
const get=id=>all.find(p=>p.id===id);
assert.equal(new Set(all.map(p=>p.id)).size,all.length);
for(const [id,name,avg] of [['npb-h-p-moinelo-2026','モイネロ',148.2],['npb-m-p-taneichi-2026','種市 篤暉',149.9],['owls-p-pena-2026','菲力士',144.5]]){const p=get(id);assert(p);assert.equal(p.name,name);assert.equal(p.pitchDetails.fast.speed,avg);}
const taira=get('npb-l-p2');assert.equal(taira.pitchDetails.fast.speed,153.9);assert.equal(taira.pitchDetails.sinker.label,'ツーシーム');assert.equal(NightGame.pitchSpec(taira,'sinker').speed,NightGame.stretchPitchSpeed(150.8));
assert.equal(get('kbo-wo-p-68341').pitchDetails.slider.speed,140.6);
assert.equal(get('kbo-lg-p-56146').velocityEvidence.fastMax,161.7);
assert.equal(get('kbo-lg-p-56146').speedEstimated,true);
assert.equal(all.find(p=>p.name==='張奕').pitchDetails.fast.speed,149.7);
assert.equal(all.find(p=>p.name==='張奕').pitchingEvidence2026.aggregate.breakingAvg,137.5);
console.log('PASS: sourced 2026 pitching supplement, stable IDs, additional roster players, unknown values retained as estimates.');
