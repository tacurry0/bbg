// v107 physics-overhaul coverage:
//  - batted-ball spin derivation: squared-up contact spins more than a
//    mishit at the same launch angle; grounders stay near-neutral.
//  - side spin curves the ball in flight (landing point shifts sideways,
//    initial spray untouched).
//  - pitch spinRpm exists per pitch type with the designed ordering, and
//    reaches the live pitch object and lastPitch (Statcast chip data).
//  - irregular hops: a small, bounded share of infield grounders, never
//    on fly balls, tracked on ball.irregular.
//  - the legacy startField call shape (no contact info) still resolves.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data','players','pennant','apbc-data','apbc-candidates','apbc-tournament','derby','game','career-leagues','career-development','career-life','career-extras','squad','career']){
 vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/'+file+'.js','utf8'),{filename:file+'.js'});
}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function seeded(seed){const orig=Math.random;Math.random=mulberry32(seed);return()=>{Math.random=orig;};}
function match(seed){
 const restore=seeded(seed);
 const g=new NightGame('match','standard',()=>{},{userHome:true,manualRunning:false});
 g.half='bottom';restore();return g;
}
function resolve(g){
 let steps=0;
 while(g.field&&!g.field.resolved&&steps++<900)g.updateField(1/50);
 assert(g.field.resolved,'field play resolves');
 return g.hit.kind;
}

// ---------- manual batting: pull, opposite field and fouls ----------
{
 const random=Math.random;
 Math.random=()=>.5;
 try{
  const swingAt=(hand,delta,{course=0,strikes=0}={})=>{
   const g=match(187);
   g.battingIndex.home=g.lineups.home.findIndex(batter=>batter.hand===hand);
   assert.equal(g.battingHand,hand);
   g.strikes=strikes;
   g.createPitch(NightGame.TYPES[0],{x:course,y:0});
   g.pitch.delivered=true;
   g.pitch.progress=1+delta;
   g.cursor={x:course,y:0};
   g.setPhase('pitch');
   assert(g.swing());
   return g;
  };
  for(const hand of ['R','L']){
   const pull=hand==='R'?-1:1;
   const onTime=swingAt(hand,0);
   assert.equal(Math.abs(onTime.hit.sprayAngle),0);
   assert(onTime.hit.perfect);
   for(const timing of [-1,1]){
    const side=-timing*pull;
    const fair=swingAt(hand,timing*.077);
    assert(!fair.field.foul && fair.hit.sprayAngle*side>20);
    assert(!fair.hit.perfect);
    const foul=swingAt(hand,timing*.16,{strikes:2});
    assert(foul.field.foul && foul.hit.sprayAngle*side>45);
    assert.equal(resolve(foul),'foul');
    assert.equal(foul.strikes,2);
   }
   assert(swingAt(hand,0,{course:.9*pull}).hit.sprayAngle*pull>4);
   assert(swingAt(hand,0,{course:-.9*pull}).hit.sprayAngle*pull<-4);
   assert.equal(swingAt(hand,.18).phase,'miss');
  }
 }finally{
  Math.random=random;
 }
}

// ---------- spin derivation direction ----------
{
 const restore=seeded(10701);
 const core=match(11);core.startField(42,32,0,false,true,{quality:1,side:0});
 const mishit=match(11);mishit.startField(42,32,0,false,false,{quality:.15,side:0});
 assert(core.field.ball.spinBack>mishit.field.ball.spinBack,
  `squared-up fly spins more (${core.field.ball.spinBack} > ${mishit.field.ball.spinBack})`);
 assert.equal(core.hit.spinBack,core.field.ball.spinBack,'hit readout carries backspin');
 const grounder=match(11);grounder.startField(36,2,0,false,false,{quality:1,side:0});
 assert.equal(grounder.field.ball.spinBack,0,'grounder has no backspin lift');
 assert.equal(grounder.field.ball.spinSide,0,'centred contact has no side spin');
 const balloon=match(11);balloon.startField(34,55,0,false,false,{quality:.1,side:0});
 const driven=match(11);driven.startField(34,55,0,false,false,{quality:.1,side:0});
 assert(balloon.field.ball.spinBack>1400,'undercut mishit balloons on excess backspin');
 assert.equal(balloon.field.ball.spinBack,driven.field.ball.spinBack,'derivation is deterministic');
 restore();
}

// ---------- side spin curves the flight ----------
{
 const land={};
 for(const side of [1,0,-1]){
  const g=match(23);
  const restore=seeded(555);
  g.startField(40,30,0,false,false,{quality:.8,side});
  land[side]=g.field.landing;
  restore();
 }
 assert(land[1].x<land[0].x-.4,`positive side spin curves the ball (-x): ${land[1].x} vs ${land[0].x}`);
 assert(land[-1].x>land[0].x+.4,`negative side spin curves the ball (+x): ${land[-1].x} vs ${land[0].x}`);
 assert(Math.abs(land[1].y-land[0].y)<Math.abs(land[1].x-land[0].x)+6,'curve is mostly lateral, not extra carry');
}

// ---------- pitch spin ----------
{
 const g=match(31);
 const pitcher=g.pitcher;
 const spec=id=>NightGame.pitchSpec(pitcher,id);
 for(const t of NightGame.TYPES){
  const s=spec(t.id);
  assert(Number.isFinite(s.spinRpm)&&s.spinRpm>0,t.id+' has a real spinRpm');
 }
 assert(spec('fast').spinRpm>spec('knuckle').spinRpm,'fastball out-spins the knuckleball');
 assert(spec('slider').spinRpm>spec('fork').spinRpm,'slider out-spins the fork');
 assert(spec('curve').spinRpm>spec('change').spinRpm,'curve out-spins the changeup');
 assert(spec('knuckle').spinRpm<700,'knuckleball barely spins');
 assert(spec('fast').spinRpm>1700&&spec('fast').spinRpm<2900,'fastball spin in a plausible band');
 // Break character preserved: slider still breaks more than a fastball,
 // and the Magnus correction keeps every type within a few % of its
 // pre-physics break scale relationship (slider >> fastball).
 assert(Math.hypot(spec('slider').bx,spec('slider').by)>Math.hypot(spec('fast').bx,spec('fast').by)*3,'break individuality preserved');
 // Live pitch + lastPitch carry spinRpm for the Statcast chip.
 const restore=seeded(777);
 g.createPitch(NightGame.TYPES[0],{x:2.4,y:0});
 assert(Number.isFinite(g.pitch.spinRpm)&&g.pitch.spinRpm>1500,'live pitch carries spinRpm');
 g.pitch.delivered=true;g.setPhase('pitch');g.phaseTime=6000;
 g.update(16); // taken pitch resolves -> completePitch fills lastPitch
 assert(g.lastPitch&&Number.isFinite(g.lastPitch.spinRpm),'lastPitch carries spinRpm');
 restore();
}

// ---------- irregular hops ----------
{
 let irregular=0;const N=400;
 for(let i=0;i<N;i++){
  const g=match(41);
  const restore=seeded(20000+i);
  g.startField(32,2,(i%7-3)*.02,false,false,{quality:.5,side:0});
  assert.equal(g.field.trajectory,'ground');
  resolve(g);
  if(g.field.ball.irregular)irregular++;
  restore();
 }
 assert(irregular>0,'irregular hops do occur');
 assert(irregular/N<=.08,`irregular rate bounded (got ${irregular}/${N})`);
 // Fly balls never hop irregularly.
 for(let i=0;i<25;i++){
  const g=match(43);
  const restore=seeded(30000+i);
  g.startField(40,34,0,false,true,{quality:.9,side:0});
  resolve(g);
  assert(!g.field.ball.irregular,'fly ball never flagged irregular');
  restore();
 }
}

// ---------- legacy call shape still works ----------
{
 const g=match(53);
 const restore=seeded(909);
 g.startField(38,24,.1,false); // pre-v107 signature: no contact argument
 const kind=resolve(g);
 assert(typeof kind==='string'&&kind.length>0,'legacy startField resolves to an outcome');
 assert(Number.isFinite(g.field.ball.spinBack),'spin fields exist on the ball');
 restore();
}
console.log('physics-v107: all assertions passed');
