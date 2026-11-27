const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
for(const p of ['ratings-data','players','pennant','game','match-presets'])vm.runInThisContext(fs.readFileSync('dist/'+p+'.js','utf8'),{filename:p+'.js'});
const g=new NightGame('match','standard',()=>{},{userHome:true});
assert.equal(NightGame.crowdAttendance(g),1,'versus defaults to full');
for(const [mode,n] of [['full',1],['high',.75],['medium',.5],['low',.25],['empty',0]]){g.crowdAttendanceMode=mode;assert.equal(NightGame.stadiumAtmosphere(g).attendance,n);}
g.crowdAttendanceMode='auto';const a=NightGame.crowdAttendance(g);assert.equal(a,NightGame.crowdAttendance(g));assert(a>0&&a<=1);
g.crowdPostseason=true;assert.equal(NightGame.crowdAttendance(g),.98);
g.crowdAttendanceMode='medium';g.half='bottom';g.phase='result';g.hit={kind:'hr'};
let atm=NightGame.stadiumAtmosphere(g);assert.equal(atm.homeExcite,1);assert(atm.awayExcite<.1);
g.half='top';atm=NightGame.stadiumAtmosphere(g);assert.equal(atm.awayExcite,1);assert(atm.homeExcite<.1);
g.phase='play-review';atm=NightGame.stadiumAtmosphere(g);assert.equal(atm.homeExcite,.04);assert.equal(atm.awayExcite,.04);
g.phase='result';g.hit={kind:'groundout'};atm=NightGame.stadiumAtmosphere(g);assert(atm.homeExcite>atm.awayExcite);
assert.equal(NightMatchPresets.snapshot({crowdAttendance:'empty'},0).crowdAttendance,'empty');assert(!('crowdAttendance' in NightMatchPresets.cleanValues({})));
const app=fs.readFileSync('dist/app.js','utf8');assert(app.includes("crowdAttendance:m.crowdAttendance||'full'"));assert(app.includes("t:'lobby-config',crowdAttendance:settings.crowdAttendance"));
console.log('PASS v243 attendance, home/away reactions, preset and online settings');
