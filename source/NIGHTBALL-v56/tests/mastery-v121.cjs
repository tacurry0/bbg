// v121: per-pitch-type mastery. Pitch usage is counted exactly in
// completePitch (pitchUsage), NightGame.applyMastery folds a finished
// game's usage into a persistent map at +0.2/pitch (cap 100), and a
// pitcher's mastered pitches break more (createPitch) and locate better
// (throwPitch). Pennant persists the map in its save; career does the
// same through gameOptions/complete (source-guarded).
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data','players','pennant','apbc-data','apbc-candidates','apbc-tournament','derby','game','career-leagues','career-development','career-life','career-extras','squad','career'])vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/'+file+'.js','utf8'),{filename:file+'.js'});
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

// Growth math.
{
 const m={};
 assert.equal(NightGame.applyMastery(m,{p1:{fast:10,slider:5}}),2);
 assert.equal(m.p1.fast,2);assert.equal(m.p1.slider,1);
 NightGame.applyMastery(m,{p1:{fast:10}});
 assert.equal(m.p1.fast,4,'growth accumulates');
 NightGame.applyMastery(m,{p1:{fast:10000}});
 assert.equal(m.p1.fast,100,'mastery caps at 100');
 assert.equal(NightGame.applyMastery(m,{p1:{fast:0}}),0,'zero usage improves nothing');
 assert.equal(NightGame.applyMastery(null,{p1:{fast:1}}),0,'null map is a no-op');
}

// Usage is counted per pitcher and pitch type as pitches complete.
{
 const g=new NightGame('match','standard',()=>{});
 const before=Object.values(g.pitchUsage).reduce((s,t)=>s+Object.values(t).reduce((a,b)=>a+b,0),0);
 for(let i=0;i<6000&&g.phase!=='ended';i++){
  if(g.phase==='aim'&&g.defending)g.throwPitch();
  g.update(50);
 }
 const after=Object.values(g.pitchUsage).reduce((s,t)=>s+Object.values(t).reduce((a,b)=>a+b,0),0);
 assert(after>before+3,'completed pitches were counted: '+after);
 for(const [pid,types] of Object.entries(g.pitchUsage))for(const t of Object.keys(types))assert(NightGame.TYPES.some(x=>x.id===t),'counted type is real: '+t);
}

// Effect: at mastery 100 the same slider breaks exactly 25% more, with
// paired seeds so every other random draw is identical.
function thrownSlider(mastery){
 const restore=Math.random;Math.random=mulberry32(12101);
 try{
  const home=NightTeams.all[0],away=NightTeams.all[1];
  const g=new NightGame('match','standard',()=>{},{clubs:{home,away},homeTeamId:home.id,awayTeamId:away.id,userHome:true,innings:5,park:home.park,pitcher:0,opponentPitcher:0,order:home.startingOrder,fielding:home.startingFielding,mastery});
  const pid=g.pitcher.id;
  assert(g.pitcher.pitches.includes('slider'),'test pitcher throws a slider');
  g.half='top';g.setPhase('aim');g.pitchType='slider';
  assert(g.throwPitch());
  return {bx:g.pitch.bx,pid};
 }finally{Math.random=restore;}
}
{
 const plain=thrownSlider(null);
 const boosted=thrownSlider({[plain.pid]:{slider:100}});
 assert(Math.abs(Math.abs(boosted.bx)-Math.abs(plain.bx)*1.25)<1e-9,'mastery 100 multiplies break by 1.25');
 const g=new NightGame('match','standard',()=>{},{mastery:{x:{slider:50},y:{fast:'lots'}}});
 assert.equal(g.masteryFor('x','slider'),50);
 assert.equal(g.masteryFor('y','fast'),0,'non-numeric mastery reads as 0');
 assert.equal(g.masteryFor('nobody','fast'),0);
}

// Pennant persistence: growth lands in the league map and survives saves.
{
 const league=new NightPennant('comets');
 assert.deepEqual(league.mastery,{},'a new league starts with no mastery');
 assert.equal(league.addMasteryFromGame({pitchUsage:{op1:{fast:25}}}),1);
 assert.equal(league.mastery.op1.fast,5);
 assert.equal(league.addMasteryFromGame(null),0);
 const restored=NightPennant.restore(JSON.parse(JSON.stringify(league)));
 assert.equal(restored.mastery.op1.fast,5,'mastery survives save/restore');
 const legacy=JSON.parse(JSON.stringify(league));delete legacy.mastery;
 assert.deepEqual(NightPennant.restore(legacy).mastery,{},'legacy saves gain an empty map');
}

const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
assert(app.includes('mastery:league.mastery'),'pennant games receive the mastery map');
assert(app.includes('league.addMasteryFromGame(g)'),'finished pennant games grow mastery');
assert(app.includes('masteryHTML(selected'),'roster shows mastery bars');
const careerSrc=fs.readFileSync(__dirname+'/../dist/career.js','utf8');
assert(careerSrc.includes('mastery:this.mastery||(this.mastery={})'),'career games receive the map');
assert(careerSrc.includes('NightGame.applyMastery(this.mastery'),'career completions grow mastery');

console.log('mastery-v121: all assertions passed');
