const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data','players','pennant','game']){
 vm.runInThisContext(fs.readFileSync('dist/'+file+'.js','utf8'));
}
function play(bases=0,outs=0){
 const calls=[],game=new NightGame('match','standard',(event,data)=>{if(event==='play-call')calls.push(data);},{manualRunning:true});
 game.half='bottom';game.outs=outs;
 game.bases=[1,2,4].map(bit=>!!(bases&bit));
 game.baseIds=game.bases.map((on,i)=>on?game.lineups.home[4+i].id:null);
 game.startField(34,18,.30,false);
 return {game,calls};
}
function throwNearFirst(game,progress,touchesBag=false){
 const f=game.field,r=f.runners[0],receiver=f.fielders[2],bag={...NightGame.BASES[1]};
 Object.assign(r,{progress,base:touchesBag?1:0,furthest:touchesBag?1:0,command:1,target:1});
 game.projectRunner(r);
 Object.assign(receiver,bag);
 Object.assign(f.manual,{secured:true,holder:6});
 f.throw={from:{x:40,y:70},to:bag,t:0,duration:.5,fromIndex:6,receiver:2,runnerId:r.id,base:1};
 return r;
}
const early=play(),out=throwNearFirst(early.game,.7);
early.game.updateManualDefense(.5,()=>{});
assert(out.out);assert.deepEqual(early.calls,[{verdict:'out',base:1}]);
const late=play(),safe=throwNearFirst(late.game,1,true);
late.game.updateManualDefense(.5,()=>{});
assert(!safe.out);assert.deepEqual(late.calls,[{verdict:'safe',base:1}]);
const missed=play(),running=throwNearFirst(missed.game,.8);
missed.game.field.fielders[2].x-=4;
missed.game.updateManualDefense(.5,()=>{});
assert.equal(missed.calls.length,0,'a missed throw is not an instant safe call');
for(let i=0;i<500&&running.progress<1;i++)missed.game.updateRunners(.01);
assert.deepEqual(missed.calls,[{verdict:'safe',base:1}]);
late.game.finishManualPlay();
assert.equal(late.game.phase,'result');
late.game.phaseTime=1000;late.game.update(16,true);
assert.equal(late.game.phase,'result','keep the result on screen while the call is visible');
late.game.update(16);
assert.notEqual(late.game.phase,'result');
const scored=play(4,1).game;
const scorer=scored.field.runners[1];Object.assign(scorer,{scored:true,crossedAt:2});
assert.deepEqual(scored.displayScore(),{away:0,home:1});assert.equal(scored.homeScore,0);
Object.assign(scorer,{needsTag:true});
assert.deepEqual(scored.displayScore(),{away:0,home:0});
const force=play(4,2).game;
Object.assign(force.field.runners[1],{scored:true,crossedAt:2});
assert.equal(force.displayScore().home,0,'wait until the batter safely reaches first');
force.manualOut(force.field.runners[0],'batter',1);
assert.equal(force.displayScore().home,0,'third force out cancels the run');
console.log('PASS: SAFE/OUT on contested throws, delayed safe call, result hold and live score without premature run credit.');
