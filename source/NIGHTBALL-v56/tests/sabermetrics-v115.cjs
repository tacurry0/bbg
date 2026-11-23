// v115: sabermetrics display.
//  - NightGame.saberMetrics(rows) derives OPS / wOBA / WAR-equivalent /
//    ERA context from accumulated rows (pennant playerStats or the
//    all-mode totals), with the league context taken from the same rows.
//  - The engine now tracks at-bats with runners in scoring position:
//    createPitch flags the plate appearance when 2nd or 3rd is occupied,
//    endAtBat records rispAb / rispH into the box score (walks, HBP and
//    sacrifices are not at-bats; simulated at-bats are not recorded).
//  - app.js folds RISP into the totals (3+ inning games only) and counts
//    starts / quality starts for 9-inning games; both stats screens show
//    the new leaderboards (source-guarded here, app.js is not node-loadable).
const assert=require('node:assert/strict');
const fs=require('node:fs');
global.window=global;
for(const file of ['ratings-data','players','pennant','game'])require('../dist/'+file+'.js');

/* ---------------- saberMetrics math ---------------- */
{
 const rows=[
  {name:'strong',pa:115,ab:100,h:30,doubles:5,triples:1,hr:5,bb:10,rbi:20,outs:0,earned:0},
  {name:'weak',pa:110,ab:100,h:20,doubles:2,triples:0,hr:1,bb:5,rbi:8,outs:0,earned:0},
 ];
 const s=NightGame.saberMetrics(rows);
 const strong=s.calc(rows[0]);
 // OBP=(30+10)/110=.3636, TB=19+10+3+20=52, SLG=.52
 assert(Math.abs(strong.obp-40/110)<1e-9,'OBP from (H+BB)/(AB+BB)');
 assert(Math.abs(strong.slg-.52)<1e-9,'SLG from total bases');
 assert(Math.abs(strong.ops-(40/110+.52))<1e-9,'OPS = OBP + SLG');
 assert(strong.batWar>s.calc(rows[1]).batWar,'the stronger bat earns more WAR');
 assert(s.calc(rows[1]).batWar<strong.batWar);
 // wOBA weights: strong (6.9+16.91+6.35+1.62+10.5)/110
 assert(Math.abs(strong.woba-42.28/110)<1e-6,'wOBA uses the standard weights');
 // A league of one identical row: wRAA is 0, WAR is replacement credit only.
 const solo=NightGame.saberMetrics([rows[0]]);
 assert(Math.abs(solo.calc(rows[0]).batWar-(115*(20/600))/10)<1e-9,'league-average bat gets replacement credit only');
 // Pitching: 90 IP, 30 ER = 3.00 ERA; vs a 4.50 league that is real value.
 const pit=[{outs:270,earned:30,pa:0,ab:0,h:0,bb:0},{outs:270,earned:45,pa:0,ab:0,h:0,bb:0}];
 const ps=NightGame.saberMetrics(pit);
 assert(Math.abs(ps.lgEra-3.75)<1e-9,'league ERA from pooled outs/earned');
 assert(Math.abs(ps.calc(pit[0]).era-3.0)<1e-9);
 assert(ps.calc(pit[0]).pitWar>ps.calc(pit[1]).pitWar,'lower ERA earns more pitching WAR');
 // Pennant rows carry plain `runs` instead of `earned`.
 const pen=NightGame.saberMetrics([{outs:27,runs:9,pa:0,ab:0,h:0,bb:0}]);
 assert(Math.abs(pen.calc({outs:27,runs:9}).era-9.0)<1e-9,'runs fallback works for pennant rows');
 // Empty / zero rows are safe.
 const zero=s.calc({});
 assert.equal(zero.ops,0);assert.equal(zero.risp,null);assert.equal(zero.qsRate,null);
}

/* ---------------- RISP tracking in the engine ---------------- */
function takenPitch(g,x){
 g.createPitch(NightGame.TYPES[0],{x,y:0});
 g.pitch.delivered=true;g.setPhase('pitch');
 const random=Math.random;
 try{Math.random=()=>.99;g.take();}finally{Math.random=random;}
}
function battingGame(){
 const g=new NightGame('match','standard',()=>{});
 g.half='bottom';g.inning=1;g.outs=0;g.balls=0;g.strikes=0;
 g.absRemaining=0;g.absCpuRemaining=0;
 return g;
}
{
 // Runner on 2nd (seedRunners(2) fills 1st and 2nd): a strikeout PA is a
 // RISP at-bat without a hit; a walk is not an at-bat at all.
 const g=battingGame();
 g.seedRunners(2,0);
 takenPitch(g,0);takenPitch(g,0);takenPitch(g,0);
 let b=g.box[g.batter.id]||Object.values(g.box)[0];
 const first=Object.values(g.box)[0];
 assert.equal(first.rispAb,1,'strikeout with RISP counts as a RISP at-bat');
 assert.equal(first.rispH||0,0);
 const g2=battingGame();
 g2.seedRunners(2,0);
 for(let i=0;i<4;i++)takenPitch(g2,1.6);
 const wb=Object.values(g2.box)[0];
 assert.equal(wb.bb,1);
 assert.equal(wb.rispAb||0,0,'a walk is not a RISP at-bat');
 // No runner in scoring position: nothing is recorded.
 const g3=battingGame();
 g3.seedRunners(1,0); // 1st only
 takenPitch(g3,0);takenPitch(g3,0);takenPitch(g3,0);
 const nb=Object.values(g3.box)[0];
 assert.equal(nb.rispAb||0,0,'no RISP, no record');
 // A hit with RISP: flag set by createPitch, recorded by endAtBat.
 const g4=battingGame();
 g4.seedRunners(3,0); // bases loaded
 g4.createPitch(NightGame.TYPES[0],{x:0,y:0});
 assert.equal(g4.atBatRisp,true,'createPitch flags the RISP plate appearance');
 g4.endAtBat('single',1);
 const hb=g4.box[g4.batter.id];
 assert.equal(hb.rispAb,1);assert.equal(hb.rispH,1,'a hit with RISP is recorded');
 assert.equal(g4.atBatRisp,false,'the flag resets for the next batter');
}

/* ---------------- app wiring (source guards) ---------------- */
{
 const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
 assert(app.includes('NightGame.saberMetrics(rows)'),'both stats screens use the shared calculator');
 assert(app.includes("g.totalInnings>=3"),'RISP folds only from 3+ inning games (pennant format excluded)');
 assert(app.includes("g.totalInnings===9"),'starts/QS counted only in 9-inning games');
 assert(app.includes('QS率'),'totals screen shows the QS-rate board');
 assert(app.includes('得点圏打率'),'totals screen shows the RISP board');
 assert(app.includes('WAR相当（打者）')&&app.includes('WAR相当（投手）'),'pennant leaders show WAR boards');
 assert(app.includes("'OPS'"),'pennant leaders show the OPS board');
}

console.log('sabermetrics-v115: all assertions passed');
