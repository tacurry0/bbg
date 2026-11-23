// v119: crowd atmosphere dynamics. NightGame.crowdExcitement() scores the
// situation (late innings, close score, runners in scoring position, a
// final-inning comeback chance); NightAudio.setExcitement swells the bed
// and scales every cheer with it. app.js feeds the value on each UI update.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data','players','pennant','apbc-data','apbc-candidates','apbc-tournament','derby','game','career-leagues','career-development','career-life','career-extras','squad','career','audio'])vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/'+file+'.js','utf8'),{filename:file+'.js'});

function game(){return new NightGame('match','standard',()=>{});}
{ // Early blowout, bases empty: a quiet crowd.
 const g=game();g.inning=1;g.half='top';g.homeScore=8;g.awayScore=0;g.bases=[false,false,false];
 assert(g.crowdExcitement()<.25,'blowout stays quiet: '+g.crowdExcitement());
}
{ // Bottom of the last inning, tied, runner on second: maximum tension.
 const g=game();g.inning=g.totalInnings;g.half='bottom';g.homeScore=2;g.awayScore=2;g.bases=[false,true,false];
 assert(g.crowdExcitement()>.8,'late tie with RISP is electric: '+g.crowdExcitement());
}
{ // The same tie scores lower early and higher with a runner aboard.
 const early=game();early.inning=1;early.half='top';early.homeScore=2;early.awayScore=2;early.bases=[false,false,false];
 const late=game();late.inning=late.totalInnings;late.half='top';late.homeScore=2;late.awayScore=2;late.bases=[false,false,false];
 assert(late.crowdExcitement()>early.crowdExcitement(),'later innings raise excitement');
 const risp=game();risp.inning=1;risp.half='top';risp.homeScore=2;risp.awayScore=2;risp.bases=[false,true,false];
 assert(risp.crowdExcitement()>early.crowdExcitement(),'scoring position raises excitement');
}
assert.equal(game().crowdExcitement()>=0,true);
{ const d=new NightGame('derby','standard',()=>{});assert.equal(d.crowdExcitement(),.3,'derby has a fixed buzz'); }

// Audio side: excitement clamps, and cheer gain scales with it.
const a=new NightAudio();
a.setExcitement(2);assert.equal(a.excitement,1,'excitement clamps to 1');
a.setExcitement(-1);assert.equal(a.excitement,0,'excitement clamps to 0');
a.context={currentTime:0};
a.buffers={'crowd-cheer':{duration:4}};
a.scene={...a.scene,enabled:true,crowd:50};
let lastGain=null;
a.sample=(id,opts)=>{lastGain=opts.gain;return {source:{stop(){}},nodes:[],amp:{gain:{setTargetAtTime(){}}}};};
a.lastCheer=-100;a.cheer(1,3);
const calmGain=lastGain;
a.setExcitement(1);a.lastCheer=-100;a.cheerVoice=null;a.cheer(1,3);
assert(lastGain>calmGain*1.5,'the same cheer is much louder at full excitement');
assert(Math.abs(calmGain-.54*.72)<.001,'calm cheer uses the .72 base scale');

const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
assert(app.includes('stadiumAudio.setExcitement(g.crowdExcitement())'),'UI updates feed the crowd level');

console.log('crowd-v119: all assertions passed');
