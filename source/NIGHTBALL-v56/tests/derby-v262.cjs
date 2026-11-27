const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,'dist',f),'utf8');
const scripts=['ratings-data','players','pro-parks','pennant','apbc-data','npb-data','npb-rosters','kbo-data','kbo-rosters','apbc-candidates','apbc-tournament','derby','game','online-derby'];
function context(){const c=vm.createContext({console,performance,structuredClone});c.window=c;for(const f of scripts)vm.runInContext(read(f+'.js'),c,{filename:f+'.js'});return c;}
const c=context(),G=c.NightGame,D=c.NightOnlineDerby;
const make=(mode,opts={})=>new G('derby','standard',()=>{},{park:'tokyo-dome',weather:'clear',crowdAttendance:'full',...opts,derby:{enhanced:true,mode,...opts.derby}});
{
 const g=make('record');g.beginHalf();assert.equal(g.pitch.speed,150);assert.equal(g.derby.remaining,120000);assert.equal(g.crowdAttendanceMode,'full');
 g.update(50);const rem=g.derby.remaining;
 g.startField(62,29,.15,false,true);for(let i=0;i<1000&&g.phase==='field';i++)g.update(16);
 assert.equal(g.derby.turnHR,1);assert(g.derby.remaining<rem-1000,'clock continues in flight');assert.equal(g.field.overFence,true);assert(g.field.ball.bounces>=1,'score at landing, not fence');assert(g.hit.derbyResult.distance>110);assert(Number.isFinite(g.hit.derbyResult.x));assert(Number.isFinite(g.hit.derbyResult.exitKmh));
 g.finishDerbyBall(true);assert.equal(g.derby.turnHR,1,'no duplicate homer');
 const resultRem=g.derby.remaining;g.update(20);assert.equal(g.derby.remaining,resultRem-20,'clock continues in result');
 g.derby.record({kind:'miss',hr:false});assert.equal(g.derby.streak,0);
 g.derby.remaining=1;g.beginHalf();g.update(20);assert.equal(g.derbyTransition,'finish');
}
{
 const clubs=c.NightTeams.matchTeams,cp=clubs.find(t=>!t.id.startsWith('npb-')&&!t.id.startsWith('kbo-')),npb=clubs.find(t=>t.id.startsWith('npb-')),kbo=clubs.find(t=>t.id.startsWith('kbo-'));
 assert(npb&&kbo);const choice=npb.batters[0];
 const g=make('international',{homeTeamId:cp.id,derby:{entrants:[{clubId:npb.id,playerId:choice.id}]}});
 const list=g.derby.rounds[0].flatMap(m=>m.entrants);
 assert.equal(list.length,8);assert.equal(new Set(list.map(e=>e.club.id+'/'+e.player.id)).size,8);
 assert(list.some(e=>e.player.id===choice.id&&e.club.id===npb.id));assert(list.some(e=>e.club.id.startsWith('kbo-')));
 const d=g.derby;if(!d.userBatsSecond){d.turnHR=99;g.finishDerbyTurn();}
 const clips=d.matchup.normalClips;assert(clips?.length);assert.equal(clips.filter(x=>x.result.hr).length,d.matchup.normal[1-d.userIndex]);assert(clips.every(x=>x.result&&Number.isFinite(x.speed)));
 const domestic=make('tournament',{homeTeamId:npb.id});
 assert(domestic.derby.rounds[0].flatMap(m=>m.entrants).every(e=>e.club.id.startsWith('npb-')));
}
{
 const g=make('online');let events=[];g.emit=(t,d)=>events.push(t);g.derby.target=0;g.beginHalf();g.startField(62,29,0,false);g.finishDerbyBall(true);
 assert(g.derby.pendingFinish);assert(events.includes('derby-walkoff'));assert(!events.includes('derby-online-turn'));
 for(let i=0;i<80;i++)g.update(50);assert(events.includes('derby-online-turn'));assert.equal(g.phase,'derby-break');
}
{
 const state=D.createTimed({host:{name:'A'},guest:{name:'B'},first:1});
 const hit={kind:'hr',distance:137,exitKmh:165,x:10,y:136};
 assert.equal(D.duration(state),120000);assert.equal(D.turnIndex(state),1);assert(!D.recordTimed(state,0,hit,0,0));
 assert(D.recordTimed(state,1,hit,0,0));assert(!D.recordTimed(state,1,hit,0,0));assert(D.finishTimed(state,1,0));assert.equal(D.target(state),1);assert(!D.finishTimed(state,1,0));
 assert(D.recordTimed(state,0,hit,1,0));assert(D.finishTimed(state,0,1));assert.equal(D.duration(state),60000);assert.equal(D.turnIndex(state),0);
 assert(D.recordTimed(state,0,hit,2,1));assert(D.finishTimed(state,0,2));
 assert(D.recordTimed(state,1,hit,3,1));assert(!D.isOver(state));assert(D.recordTimed(state,1,hit,3,2));assert(D.finishTimed(state,1,3));assert(D.isOver(state));assert.equal(D.winner(state),1);assert(state.walkOff);
}
// The same actual engine drives solo, online and CPU clips. Compare the
// measured post-landing delays, and keep the moving-ball/timer guarantees.
for(const [launch,spray,kind,limit] of [[2,0,'in-play',.60],[26,1.20,'foul',1.50],[22,0,'in-play',.60]]){
 const g=make('record');g.beginHalf();const before=g.derby.remaining;g.startField(28,launch,spray,false);
 let seconds=0,bounce=null;while(g.phase==='field'&&seconds<12){g.update(10);seconds+=.01;if(g.field.ball.bounces>0&&bounce===null)bounce=seconds;}
 assert.equal(g.hit.kind,kind);assert.equal(g.derby.turnHR,0);
 const wait=G.derbyResultDuration(g.field,g.hit)/1000;
 assert(wait<=.22);if(bounce!==null)assert(seconds-bounce+wait<=limit+.04,{kind,seconds,bounce,wait});else assert(seconds+wait<=limit+.04);
 assert(g.derby.remaining<before);const x=g.field.ball.x,y=g.field.ball.y;g.update(30);
 assert(g.field.ball.x!==x||g.field.ball.y!==y,'ball remains in motion during short result');
 for(let i=0;i<30&&g.phase==='result';i++)g.update(10);assert.notEqual(g.phase,'result','next pitch promptly');
}
assert.equal(G.derbyResultDuration({homerCelebration:{level:1}},{kind:'hr'}),1200);
assert.equal(G.derbyResultDuration({homerCelebration:{level:3}},{kind:'hr'}),1900);
assert.equal(G.derbyResultDuration(null,{kind:'hr'},true),3600);
// Integration test the actual app's online derby block in two VM peers with a
// queued reliable data channel, using the real game engine and score model.
const app=read('app.js'),start=app.indexOf(' // v262: two-minute full turns'),end=app.indexOf(' function hideOnlineGuest()',start);
assert(start>=0&&end>start);
const block=app.slice(start,end);
function peer(amHost){
 const cc=context(),out=[],el={hidden:false,classList:{toggle(){}},textContent:'',style:{}};
 Object.assign(cc,{console,online:{role:amHost?'host':'guest',session:{open:true,send(m){out.push(JSON.parse(JSON.stringify(m)));return true;},canSendState(){return true;}}},game:null,settings:{difficulty:'standard'},modalKind:'',saved:false,lastMode:'',derbyCountdown:-1,NightUniforms:{resolvedKit(){return {};}},closeModal(){},unlockAudio(){},activateGame(){},updateStyle(){},updateUI(){},derbyHud(){},updateDerbyClock(){},derbySpark(){},sound(){},derbyRecord(){},recordOnlineResult(){},onlineParkDefinition(){return null;},modal(){},modalTitle(){return '';},derbyResultHero(){return '';},derbyStats(){return '';},uiEscape:s=>String(s),$:()=>el,records:{hr:0,hits:0,maxDistance:0}});
 vm.runInContext(block,cc);cc.onEvent=(t,d)=>{if(t==='hit')cc.onlineDerbyOnHit(d);else if(t==='derby-ball')cc.onlineDerbyRecord(d);else if(t==='derby-online-turn')cc.onlineDerbyEndTurn();};
 const m={contestId:'test',hostClub:'owls',guestClub:'foxes',hostBatter:cc.NightTeams.get('owls').batters[0].id,guestBatter:cc.NightTeams.get('foxes').batters[0].id,first:0,park:'tokyo-dome',difficulty:'standard'};
 cc.setupOnlineDerby(m,amHost);return {cc,out};
}
const h=peer(true),a=peer(false);
function transfer(src,dst){while(src.out.length){const m=src.out.shift();if(m.t==='derby-view-v2')dst.cc.onlineDerbyApplyFrame(m);else if(m.t==='derby-ball-v2')dst.cc.onlineDerbyPeerBall(m);else if(m.t==='derby-turn-v2')dst.cc.onlineDerbyPeerTurn(m);}}
assert(h.cc.onlineDerbyMyTurn());assert(!a.cc.onlineDerbyMyTurn());assert(a.cc.game.paused);
h.cc.game.beginHalf();h.cc.onlineDerbyFrame(1000);transfer(h,a);assert.equal(a.cc.online.derbySpectator.phase,'windup');assert.equal(a.cc.online.derbySpectator.pitch.speed,150);
h.cc.game.startField(62,29,0,false);h.cc.onlineDerbyFrame(1100);transfer(h,a);assert.equal(a.cc.online.derbySpectator.phase,'field');assert(a.cc.online.derbySpectator.field.ball);
h.cc.game.finishDerbyBall(true);transfer(h,a);assert.equal(a.cc.online.derbyContest.players[0].hr,1);
h.cc.game.finishDerbyTurn();transfer(h,a);assert(!h.cc.onlineDerbyMyTurn());assert(a.cc.onlineDerbyMyTurn());assert.equal(a.cc.game.derby.target,1);assert.equal(a.cc.game.derby.remaining,120000);
for(let i=0;i<2;i++){a.cc.game.beginHalf();a.cc.game.startField(62,29,0,false);a.cc.game.finishDerbyBall(true);transfer(a,h);}
assert(a.cc.game.derby.pendingFinish);
for(let i=0;i<80;i++)a.cc.game.update(50);transfer(a,h);
assert(h.cc.online.derbyContest.done);assert(a.cc.online.derbyContest.done);assert.equal(h.cc.online.derbyContest.winner,1);assert.equal(a.cc.online.derbyContest.winner,1);assert(h.cc.online.derbyContest.walkOff);assert.equal(h.cc.game.phase,'ended');assert.equal(a.cc.game.phase,'ended');
console.log('PASS v262: enhanced derby, league selection, real-physics CPU clips, timed spectator frames, synchronized records and walk-off');
