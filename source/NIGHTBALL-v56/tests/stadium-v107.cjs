// v107 stadium-editor coverage:
//  - a custom park feeds the existing wallDistance interpolation exactly at
//    the five anchor angles and monotonically between them,
//  - fenceHeight returns the custom wall height,
//  - the same seeded batted ball is a home run in a shallow custom park and
//    not a home run in a deep custom park (engine HR judgement unchanged),
//  - out-of-range editor values are clamped at save time,
//  - extreme custom parks drive seeded field plays without exceptions,
//  - built-in parks keep their surveyed wallDistance / fenceHeight values.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data','players','stadium-editor','pennant','apbc-data','apbc-candidates','apbc-tournament','derby','game','career-leagues','career-development','career-life','career-extras','squad','career']){
 vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/'+file+'.js','utf8'),{filename:file+'.js'});
}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function seeded(seed){const orig=Math.random;Math.random=mulberry32(seed);return()=>{Math.random=orig;};}
function memStorage(){const mem=new Map();return {getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)};}
const near=(a,b)=>Math.abs(a-b)<1e-6;

// ---------- (a) wallDistance anchors + monotone interpolation ----------
{
 const park=NightStadium.makePark({name:'非対称',left:90,leftCenter:105,center:120,rightCenter:112,right:95,wallHeight:3.4},'custom-test-a');
 const anchors=[[-Math.PI/4,90],[-Math.PI/8,105],[0,120],[Math.PI/8,112],[Math.PI/4,95]];
 for(const [angle,expected] of anchors)assert(near(NightPlayers.wallDistance(park,angle),expected),
  `wallDistance at ${angle} is the configured ${expected} (got ${NightPlayers.wallDistance(park,angle)})`);
 // Rising left half: samples from the left-field line to centre never decrease.
 let prev=-Infinity;
 for(let i=0;i<=40;i++){const a=-Math.PI/4+i/40*Math.PI/4,d=NightPlayers.wallDistance(park,a);assert(d>=prev-1e-9,`left half interpolates monotonically (${d} >= ${prev})`);prev=d;}
 // Falling right half: samples from centre to the right-field line never increase.
 prev=Infinity;
 for(let i=0;i<=40;i++){const a=i/40*Math.PI/4,d=NightPlayers.wallDistance(park,a);assert(d<=prev+1e-9,`right half interpolates monotonically (${d} <= ${prev})`);prev=d;}
 // ---------- (b) fenceHeight ----------
 for(const angle of [-Math.PI/4,-.2,0,.2,Math.PI/4])assert.equal(NightPlayers.fenceHeight(park,angle),3.4,'fenceHeight returns the custom height at every angle');
 assert.equal(park.corner,90,'corner is the shorter foul pole (min of left/right)');
}

// ---------- (d) clamping at save time ----------
{
 const fields=['left','leftCenter','center','rightCenter','right','wallHeight'];
 assert.deepEqual(fields.map(k=>NightStadium.clampSpec({left:10,leftCenter:500,center:999,rightCenter:0,right:-3,wallHeight:0})[k]),[55,180,200,60,55,.5]);
 assert.deepEqual(fields.map(k=>NightStadium.clampSpec({left:200,leftCenter:10,center:50,rightCenter:999,right:131,wallHeight:99})[k]),[160,60,70,180,131,25]);
 const store=memStorage();
 const saved=NightStadium.upsert({name:'<b>悪意</b>',left:1,leftCenter:1,center:1,rightCenter:1,right:1,wallHeight:100},store);
 assert.equal(saved.left,55);assert.equal(saved.center,70);assert.equal(saved.wallHeight,25);
 assert(!saved.name.includes('<'),'park name is stripped of markup characters');
 const persisted=NightStadium.loadSpecs(store);
 assert.equal(persisted.length,1);assert.equal(persisted[0].center,70,'the clamped spec is what reaches storage');
 assert(NightPlayers.parks.some(p=>p.id===saved.id),'saved park is registered in NightPlayers.parks');
 NightStadium.remove(saved.id,store);
 assert(!NightPlayers.parks.some(p=>p.id===saved.id),'deleted park leaves NightPlayers.parks');
 assert.equal(NightStadium.loadSpecs(store).length,0,'deleted park leaves storage');
}

// ---------- (c) HR judgement follows the custom dimensions ----------
function drive(parkId){
 const restore=seeded(11);
 const g=new NightGame('match','standard',()=>{},{userHome:true,manualRunning:false,park:parkId});
 g.half='bottom';restore();
 const fieldSeed=seeded(999);
 g.startField(42,32,0,false,true,{quality:1,side:0});
 let steps=0;while(g.field&&!g.field.resolved&&steps++<3000)g.updateField(1/50);
 fieldSeed();
 assert(g.field.resolved,'field play resolves');
 return g;
}
{
 const store=memStorage();
 const shallow=NightStadium.upsert({name:'浅い球場',left:80,leftCenter:85,center:95,rightCenter:85,right:80,wallHeight:1},store);
 const deep=NightStadium.upsert({name:'深い球場',left:130,leftCenter:145,center:160,rightCenter:145,right:130,wallHeight:12},store);
 const shallowGame=drive(shallow.id),deepGame=drive(deep.id);
 assert.equal(shallowGame.park.id,shallow.id,'game resolves the custom park by id');
 assert.equal(deepGame.park.id,deep.id,'game resolves the deep custom park by id');
 assert.equal(shallowGame.hit.kind,'hr',`the seeded drive clears the 95 m / 1 m fence (got ${shallowGame.hit.kind})`);
 assert.notEqual(deepGame.hit.kind,'hr',`the same drive is not a home run at 160 m / 12 m (got ${deepGame.hit.kind})`);
 NightStadium.remove(shallow.id,store);NightStadium.remove(deep.id,store);
}

// ---------- (e) extreme parks drive seeded plays without exceptions ----------
{
 const store=memStorage();
 const tiny=NightStadium.upsert({name:'最小',left:80,leftCenter:80,center:50,rightCenter:80,right:80,wallHeight:1},store);
 const huge=NightStadium.upsert({name:'最大',left:250,leftCenter:250,center:250,rightCenter:250,right:250,wallHeight:12},store);
 assert.equal(tiny.center,70,'a 50 m centre request clamps to the 70 m floor');
 assert.equal(huge.left,160,'a 250 m foul-pole request clamps to the 160 m ceiling');
 for(const [i,park] of [tiny,huge].entries()){
  const restore=seeded(700+i);
  const g=new NightGame('match','standard',()=>{},{userHome:true,manualRunning:false,park:park.id});
  g.half='bottom';restore();
  for(let play=0;play<8;play++){
   const fieldSeed=seeded(5000+play*17+i);
   g.startField(30+play*2.5,10+play*5,(play%5-2)*.3,false,play%3===0,{quality:.4+.07*play,side:0});
   let steps=0;while(g.field&&!g.field.resolved&&steps++<3000)g.updateField(1/50);
   fieldSeed();
   assert(g.field.resolved,`extreme park ${park.name} resolves play ${play}`);
  }
 }
 NightStadium.remove(tiny.id,store);NightStadium.remove(huge.id,store);
}

// ---------- (f) built-in parks unchanged ----------
{
 const night=NightPlayers.parks.find(p=>p.id==='night');
 assert(near(NightPlayers.wallDistance(night,-Math.PI/4),99.06),'night park left pole unchanged');
 assert(near(NightPlayers.wallDistance(night,-Math.PI/8),112.7),'night park left-centre unchanged');
 assert(near(NightPlayers.wallDistance(night,0),121.92),'night park centre unchanged');
 assert(near(NightPlayers.wallDistance(night,Math.PI/4),99.06),'night park right pole unchanged');
 assert.equal(NightPlayers.fenceHeight(night,0),2.5,'night park wall height unchanged');
 const tokyo=NightPlayers.parks.find(p=>p.id==='tokyo-dome');
 assert(near(NightPlayers.wallDistance(tokyo,0),122),'tokyo dome centre unchanged');
 assert.equal(NightPlayers.fenceHeight(tokyo,0),4,'tokyo dome wall height unchanged');
 assert(!NightPlayers.parks.some(p=>p.custom),'no custom parks leak out of the test');
}
console.log('stadium-v107: all assertions passed');
