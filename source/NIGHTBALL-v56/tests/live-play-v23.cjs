const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');global.window=global;
for(const f of ['ratings-data','players','pennant','apbc-data','matchup-data','game'])vm.runInThisContext(fs.readFileSync('dist/'+f+'.js','utf8'));
const setup=(mask=0,manual=true)=>{const g=new NightGame('match','standard',()=>{},{manualRunning:manual});g.half='bottom';g.bases=[0,1,2].map(i=>!!(mask&(1<<i)));g.baseIds=g.bases.map((b,i)=>b?g.lineups.home[i+5].id:null);g.startField(36,20,.3,false);return g;};
(async()=>{
 const {runnerMapState,swipeDestination}=await import('../dist/runner-map.js');
 const g=setup();const r=g.field.runners[0];assert(!g.commandRunner(r.id,2),'cannot queue a second leg before touching first');
 for(let i=0;i<300;i++)g.updateRunners(.02);assert.equal(r.progress,1);assert(r.waiting);assert(!r.running);assert(g.commandRunner(r.id,2));assert(!g.commandRunner(r.id,3));
 for(let i=0;i<400;i++)g.updateRunners(.02);assert.equal(r.progress,2);for(let i=0;i<100;i++)g.updateRunners(.02);assert.equal(r.progress,2,'arrival must hard stop without new instruction');assert(!runnerMapState(g)[0].moving);
 assert(g.commandRunner(r.id,1));for(let i=0;i<300;i++)g.updateRunners(.02);assert.equal(r.progress,1);const map=runnerMapState(g)[0];assert.equal(map.x,180);assert.equal(map.y,100);assert.equal(swipeDestination(map,-70,-70),2);assert.equal(swipeDestination(map,1,1),null);assert.equal(swipeDestination(map,0,70),null,'cannot return a batter runner to home');
 // Returning lead runner cannot push a waiting trailing runner off his base.
 const crowded=setup(1),br=crowded.field.runners[0],lead=crowded.field.runners[1];Object.assign(br,{base:1,furthest:1,progress:1,command:1});Object.assign(lead,{base:2,furthest:2,progress:2,command:1});for(let i=0;i<300;i++)crowded.updateRunners(.02);assert.equal(br.progress,1);assert(lead.progress>=1.099);assert(lead.progress>br.progress);assert(lead.blocked);
 // Removing a trailing runner removes the force on the runners ahead.
 const chain=setup(7);chain.field.ball.bounces=1;const first=chain.field.runners.find(r=>r.start===1),second=chain.field.runners.find(r=>r.start===2);assert.equal(chain.manualForceBase(second),3);chain.manualOut(first,'force');assert.equal(chain.manualForceBase(second),0);
 // A drive in the gap is a double again: on deep balls the coach judges the
 // advance against the relay return, runners are evaluated while still en
 // route, and a runner who already passed a base cannot be forced out at it.
 // A hard ball to center stays a hit even with a runner forced from first.
 // Routine infield outs still work.
 for(const [shot,mask,kind,outs,base] of [
  [[35,20,.4],0,'double',0,2],[[41,15,0],1,'single',0,1],[[25,0,0],0,'groundout',1,0]
 ]){
  const p=setup(mask,false);p.startField(...shot,false);
  for(let i=0;i<1800&&!p.field.resolved;i++)p.update(20);
  assert.equal(p.field.outcome,kind);assert.equal(p.outs,outs);
  if(base)assert.equal(p.baseIds[base-1],p.field.runners.find(r=>r.batter).id);
 }
 // The opposite-side middle infielder covers second before the outfielder throws.
 const random=Math.random;
 try{
  Math.random=()=>.5;
  for(const [spray,position] of [[.42,'SS'],[-.42,'2B']]){
   for(const manual of [false,true]){
    const game=setup(0,manual);
    game.startField(37,15,spray,false);
    const play=game.field,batter=play.runners[0],bag=NightGame.BASES[2];
    let covering=null,sent=false;
    for(let i=0;i<1000&&!play.resolved;i++){
     game.update(16);
     if(!covering&&!play.manual.secured&&play.elapsed>1&&play.chaser>=6){
      const players=play.fielders.filter(p=>p.target===bag);
      assert.deepEqual(players.map(p=>p.name),[position]);
      covering=players[0];
     }
     if(manual&&!sent&&batter.base===1)sent=game.commandRunner(batter.id,2);
    }
    assert(play.resolved&&covering);
    assert(Math.hypot(covering.x-bag.x,covering.y-bag.y)<.5);
    assert.equal(play.outcome,'single');
    assert.equal(game.outs,manual?1:0);
    assert(game.playEvents.some(e=>e.type==='throw-arrival'&&e.caught&&e.base===(manual?2:null)));
    if(manual)assert(game.playEvents.some(e=>e.type==='out'&&e.method==='tag'));
   }
  }
 }finally{Math.random=random;}
 // Smooth/slow frames and the training entry point use the same visible baserunning.
 const drill=new NightGame('practice','standard',()=>{});
 drill.runningDemo=true;drill.startField(35,20,.4,false);
 drill.update(1000/60);
 assert(drill.field.runners[0].running,'floating-point frame remainder must not overwrite motion');
 assert(runnerMapState(drill)[0].moving);
 for(let i=0;i<90&&!drill.field.resolved;i++)drill.update(240);
 assert.equal(drill.field.outcome,'double');
 assert.equal(drill.field.runners[0].base,2);
 assert(drill.playEvents.some(event=>event.type==='throw-arrival'&&event.base===null),'outfield sends through a real cutoff');
 assert.equal(drill.session.hits,0,'the supplied demo is not a batting record');
 // An early throw reaches the bag before its covering fielder: no catch, no force.
 const empty=setup(),forced=empty.field.runners[0],pos=NightGame.BASES[1];
 Object.assign(forced,{progress:.8,base:0,command:1});
 Object.assign(empty.field.manual,{secured:true,holder:7,bag:null,recovery:1});
 const nearby=empty.field.fielders[2];Object.assign(nearby,{x:pos.x+8,y:pos.y});
 empty.field.throw={from:{x:0,y:30},to:{...pos},receiver:2,base:1,runnerId:forced.id,duration:.05,t:0,manual:true};
 for(let i=0;i<5;i++)empty.update(10);
 assert(!forced.out);assert.equal(empty.outs,0);assert(!empty.field.manual.secured);assert(nearby.x>pos.x+7);
 // Legacy short modes also reject a force if the ball gets to an empty bag.
 const short=new NightGame('pitching','standard',()=>{});
 short.startField(25,0,0,true);
 const distant=short.field.fielders[2];Object.assign(distant,{x:pos.x+8,y:pos.y});
 short.field.throw={from:{x:0,y:22},to:{...pos},receiver:2,base:1,result:'groundout',duration:.05,t:0};
 for(let i=0;i<8&&!short.field.resolved;i++)short.update(10);
 assert.equal(short.outs,0);assert.equal(short.field.outcome,'single');
 // A throw's actual arrival, not an outcome selected at pickup, decides a close play.
 for(const [duration,out]of [[.08,true],[.30,false]]){
  const p=setup(),b=p.field.runners[0],m=p.field.manual;Object.assign(b,{progress:.95,base:0,furthest:0,command:1});m.secured=true;m.holder=3;m.bag=null;m.recovery=1;
  p.field.throw={from:{x:0,y:30},to:{...NightGame.BASES[1]},receiver:2,base:1,runnerId:b.id,duration,t:0,manual:true};p.field.fielders[2].x=19.4;p.field.fielders[2].y=19.4;
  for(let i=0;i<20;i++)p.update(20);assert.equal(b.out,out,'throw duration '+duration);if(!out){assert.equal(b.base,1);assert(!b.running);}
 }
 // The exact tie favors the runner, independent of render frame size.
 for(const frame of [10,20,50]){const p=setup(),b=p.field.runners[0];Object.assign(b,{progress:.9,base:0,furthest:0,command:1});p.field.manual.secured=true;p.field.manual.holder=3;p.field.throw={from:{x:0,y:30},to:{...NightGame.BASES[1]},receiver:2,base:1,runnerId:b.id,duration:.1*27.44/b.speed,t:0,manual:true};for(let i=0;i<50;i++)p.update(frame);assert(!b.out,'same-time arrival must be safe');}
 // Third force out cancels runs; a later tag out preserves an earlier crossing.
 for(const type of ['force','batter','tag']){const p=setup(4);p.outs=2;const b=p.field.runners[0],scorer=p.field.runners[1];Object.assign(b,{base:1,furthest:1,progress:1});Object.assign(scorer,{progress:4,base:4,furthest:4,scored:true,crossedAt:1});p.field.elapsed=2;p.manualOut(b,type);p.finishManualPlay();assert.equal(p.homeScore,type==='tag'?1:0);}
 // A runner who crossed home before a fly catch remains selectable and returns one bag at a time.
 const retouch=setup(2),off=retouch.field.runners.find(r=>r.start===2);Object.assign(off,{progress:4,base:4,furthest:4,scored:true,crossedAt:1});retouch.secureManualBall(7,true);assert(off.needsTag);assert(runnerMapState(retouch).some(m=>m.id===off.id));assert(retouch.commandRunner(off.id,3));for(let i=0;i<400;i++)retouch.updateRunners(.02);assert.equal(off.progress,3);assert(off.waiting);assert(off.needsTag);assert(retouch.commandRunner(off.id,2));for(let i=0;i<400;i++)retouch.updateRunners(.02);assert.equal(off.progress,2);assert(!off.needsTag);
 const oldSave=setup();delete oldSave.runningRevision;oldSave.field.runners[0].command=3;oldSave.field.runners[0].target=3;const migrated=NightGame.restore(JSON.parse(JSON.stringify(oldSave.snapshot())),()=>{});assert.equal(migrated.field.runners[0].command,0,'old queued legs are cleared on restore');assert(migrated.manualPlay);
 // Automatic CPU and manual offense share the same possession object.
 assert(setup(0,false).field.manual);const cpu=setup();cpu.half='top';cpu.startField(30,10,0,true);assert(cpu.field.manual);assert.equal(cpu.field.manual.userControlled,false);
 let simulations=0,results={};for(const home of [true,false])for(let mask=0;mask<8;mask++)for(const outs of [0,1,2])for(const shot of [[25,0,0],[36,20,.3],[32,55,0],[45,12,.65],[19,42,.6]]){
  const p=setup(mask,false);p.userHome=home;p.outs=outs;p.field=null;p.startField(...shot,false);let ticks=0;while(!p.field.resolved&&ticks++<6000)p.update(20);assert(p.field.resolved,'play must settle');assert(p.outs<=3);assert.equal(p.baseIds.filter(Boolean).length,new Set(p.baseIds.filter(Boolean)).size);for(let i=0;i<3;i++)assert.equal(p.bases[i],!!p.baseIds[i]);for(const a of p.field.runners){const marker=runnerMapState(p).find(m=>m.id===a.id);if(marker)assert(Math.abs(marker.x-(100+a.x/19.4*80))<.001&&Math.abs(marker.y-(180-a.y/19.4*80))<.001);}
  results[p.field.outcome]=(results[p.field.outcome]||0)+1;simulations++;
 }
 // Ground, liner, blooper and fence contacts stay visibly distinct in their record.
 const type=setup();for(const [shot,expected]of [[[20,0,0],'ground'],[[30,14,.5],'liner'],[[19,42,.6],'blooper']]){type.startField(...shot,false);assert.equal(type.field.trajectory,expected);}type.field.wallHit=true;assert.equal(type.contactType('double'),'フェンス直撃');
 const snap=NightGame.restore(JSON.parse(JSON.stringify(g.snapshot())),()=>{});assert.equal(snap.field.runners[0].command,1);assert.equal(snap.field.manual.userControlled,true);
 // Verified splits affect only known players and never fabricate Taiwanese splits.
 let covered=0;for(const t of NightTeams.international)for(const p of t.batters)if(p.matchupEvidence?.splits){covered++;assert(p.matchupEvidence.splits.L.ab>0);}
 assert.equal(covered,29);assert.equal(NightTeams.get('apbc-taipei').batters.filter(p=>p.matchupEvidence?.splits).length,0);
 const match=new NightGame('match','standard',()=>{},{homeTeamId:'apbc-japan',awayTeamId:'apbc-korea'});match.half='bottom';match.battingIndex.home=NightTeams.get('apbc-japan').startingOrder.indexOf(NightTeams.get('apbc-japan').batters.find(p=>p.name.includes('宗山')).id);const pit=match.pitcher,hand=pit.hand;pit.hand='L';const left=match.matchup();pit.hand='R';const right=match.matchup();pit.hand=hand;assert.notEqual(left.contact,right.contact);
 // Inherited runners charge the original pitcher and determine the losing pitcher.
 const score=setup(1);const original=score.pitcher.id;score.basePitcherIds[0]=original;score.run(score.baseIds[0],original);assert.equal(score.pitchingStats[original].runs,1);assert.equal(score.leadDecision.loser,original);assert.equal(score.box[score.baseIds[0]].r,1);score.finish();assert(score.matchSummary().decision.winner);
 const reportModule=await import('../dist/results.js'),report=reportModule.buildMatchReport(score);assert(reportModule.resultReportHTML(report).includes('イニング別スコア'));assert(reportModule.playerBoxHTML(report,'home').includes('四球'));
 const app=fs.readFileSync('dist/app.js','utf8'),html=fs.readFileSync('dist/index.html','utf8');assert(!html.includes('id="runner-controls"'));assert(!app.includes("$('runner-controls')"));
 console.log('PASS V23:',simulations,'live plays',results,'; swipe one-base/stop/return, occupied bags, force chain, real throw arrival/ties at 3 frame rates, third-out runs, canonical minimap, save, 29 verified splits, inherited runner records and postgame report.');
})().catch(e=>{console.error(e);process.exit(1)});
