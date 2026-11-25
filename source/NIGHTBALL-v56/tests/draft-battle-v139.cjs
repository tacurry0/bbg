// v139: draft battle mode (checker item "draft-battle").
// The user and the CPU alternately draft from the full cross-league
// pool (all 30 clubs) in snake order, 17 picks each (9 starting
// batters covering every position, 3 bench batters, 5 pitchers), then
// play a regular match with the built squads. Covered here: the snake
// sequence, a seeded full draft (manual user picks + CPU picks) that
// ends with both sides match-legal (every position filled by an
// eligible player, no duplicates within or across teams), the pick
// legality guard that makes a stranded position impossible, the CPU
// filling its missing catcher instead of taking a higher-rated
// redundant bat, auto-complete from a partial draft, a match actually
// starting with the drafted clubs, saved lineups being untouched,
// and the app wiring + v139 pins.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data.js','players.js','pro-parks.js','pennant.js','npb-data.js','npb-rosters.js','kbo-data.js','kbo-rosters.js','game.js','random-roster.js','draft-battle.js'])
 vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/'+file,'utf8'),{filename:file});
const D=global.NightDraftBattle;
assert(D,'NightDraftBattle module loads');
const POS=['C','1B','2B','3B','SS','LF','CF','RF','DH'];
const clubs=NightTeams.matchTeams;
assert(clubs.length>=30,'pool spans all 30 clubs');
const owls=NightTeams.get('owls'),giants=NightTeams.get('npb-g');
const owlsBefore=JSON.stringify(owls),giantsBefore=JSON.stringify(giants);

// ---------- snake pick order ----------
const seq=D.pickSequence();
assert.equal(seq.length,34,'two picks per round over 17 rounds');
assert.deepEqual(seq.slice(0,4),['user','cpu','cpu','user'],'snake: round 1 user first, round 2 CPU first');
assert.deepEqual(seq.slice(4,6),['user','cpu'],'round 3 is user first again');
assert.equal(seq.filter(s=>s==='user').length,17);
assert.equal(seq.filter(s=>s==='cpu').length,17);
assert.equal(D.PICKS_PER_SIDE,17,'9 starters + 3 bench + 5 pitchers');

// ---------- a full seeded draft: user picks by guide, CPU by its AI ----------
{
 const rng=D.mulberry32(42);
 const st=D.createDraft(clubs,42);
 assert.equal(D.currentSide(st),'user','the user picks first');
 let guard=100;
 while(!D.isComplete(st)&&guard-->0){
  const side=D.currentSide(st);
  if(side==='cpu'){
   const id=D.cpuPick(st,rng);
   assert(id,'CPU makes a pick on its turn');
  }else{
   // The "user" follows the same need-aware choice a guided UI offers.
   const id=D.choosePick(st,'user',rng);
   assert(id,'a legal user pick always exists mid-draft');
   assert.equal(D.applyPick(st,'user',id),true,'the user pick applies');
  }
 }
 assert(D.isComplete(st),'the draft completes');
 assert.equal(st.picks.length,34);
 assert.deepEqual(st.picks.map(p=>p.side),seq,'the recorded order is exactly the snake sequence');
 // Re-running with the same seed reproduces the same draft.
 const rng2=D.mulberry32(42),st2=D.createDraft(clubs,42);
 while(!D.isComplete(st2)){const side=D.currentSide(st2);if(side==='cpu')D.cpuPick(st2,rng2);else D.applyPick(st2,'user',D.choosePick(st2,'user',rng2));}
 assert.deepEqual(st2.picks.map(p=>p.playerId),st.picks.map(p=>p.playerId),'same seed drafts the same players');

 // ---------- both built clubs are match-legal ----------
 const built=D.buildMatch(st,owls,giants);
 for(const [side,base,club] of [['user',owls,built.user],['cpu',giants,built.cpu]]){
  assert.equal(club.id,base.id,side+' club keeps the base club identity');
  assert.equal(club.name,base.name);
  assert.equal(club.batters.length,12,side+' drafts 12 batters (9 starters + 3 bench)');
  assert.equal(club.pitchers.length,5,side+' drafts 5 pitchers');
  assert.deepEqual(Object.keys(club.startingFielding).sort(),POS.slice().sort(),side+' fills all nine positions');
  assert.equal(new Set(Object.values(club.startingFielding)).size,9,side+' has nine distinct starters');
  assert.equal(new Set(club.startingOrder).size,9,side+' batting order has nine distinct starters');
  assert.deepEqual(club.startingOrder.slice().sort(),Object.values(club.startingFielding).slice().sort(),side+' order is exactly the starters');
  for(const [pos,id] of Object.entries(club.startingFielding)){
   const player=club.batters.find(p=>p.id===id);
   assert(player,side+' starter at '+pos+' is on the club');
   assert(D.eligible(player,pos),`${side} starter at ${pos} (${player.name}, natural ${player.pos}) is eligible`);
  }
  assert(club.pitchers.every(p=>p.pos==='P'),side+' pitchers come from the pitcher pool');
 }
 const allIds=[built.user,built.cpu].flatMap(c=>[...c.batters,...c.pitchers].map(p=>p.id));
 assert.equal(new Set(allIds).size,allIds.length,'no player appears twice within or across the two teams');
 const origin=new Map();for(const c of clubs){for(const p of c.batters)origin.set(p.id,c.id);for(const p of c.pitchers)origin.set(p.id,c.id);}
 assert(built.user.batters.some(p=>origin.get(p.id)!=='owls'),'the user squad really draws from other clubs');

 // ---------- a match starts with the drafted clubs ----------
 const g=new NightGame('match','standard',()=>{},{clubs:{home:built.user,away:built.cpu},homeTeamId:'owls',awayTeamId:'npb-g',userHome:true,order:built.user.startingOrder.slice(),fielding:{...built.user.startingFielding},pitcher:0});
 assert.deepEqual(g.teams.home.batters.map(p=>p.id),built.user.batters.map(p=>p.id),'the engine plays the drafted home squad');
 assert.deepEqual(g.teams.away.batters.map(p=>p.id),built.cpu.batters.map(p=>p.id),'the engine plays the drafted away squad');
 assert.equal(g.lineups.home.length,9,'a nine-man lineup takes the field');
 assert(g.lineups.home.every(p=>p.fieldPos),'every starter has a defensive position');
 assert.deepEqual(g.lineups.home.map(p=>p.id).slice().sort(),built.user.startingOrder.slice().sort(),'the lineup is the drafted starters');
 assert(g.pitchingStaff.home.length===5&&g.pitchingStaff.away.length===5,'both staffs carry the five drafted pitchers');
}

// ---------- the legality guard: a position can never be stranded ----------
// (manual picks of a single natural position must be rejected once
//  taking another one would leave too few slots for the open spots)
{
 const st=D.createDraft(clubs,7);
 const rfOnly=D.available(st).batters.filter(p=>p.pos==='RF'&&(p.positions||[]).every(x=>x==='RF'));
 assert(rfOnly.length>=3,'the pool has several RF-only batters');
 let applied=0;
 for(const p of rfOnly){if(D.applyPick(st,'user',p.id))applied++;}
 // Force the turn back to the user is unnecessary: applyPick checks
 // the side, so interleave CPU picks to keep the snake moving.
 const stB=D.createDraft(clubs,7);
 let taken=0,guard=40;
 while(guard-->0){
  if(D.currentSide(stB)==='cpu'){D.cpuPick(stB,D.mulberry32(guard+1));continue;}
  const next=rfOnly[taken];
  if(!next)break;
  const before=stB.sides.user.batters.length;
  const ok=D.applyPick(stB,'user',next.id);
  if(ok){taken++;assert.equal(stB.sides.user.batters.length,before+1);}
  else break;
 }
 const guide=D.guideFor(stB,'user');
 assert(guide.positionsNeeded.length<=guide.battersNeeded,'open positions never exceed the batter slots left ('+guide.positionsNeeded.length+' <= '+guide.battersNeeded+')');
 assert(D.autoComplete(stB,D.mulberry32(9)),'even after greedy same-position picks the draft auto-completes');
 const club=D.buildClub(stB,'user',owls);
 assert.deepEqual(Object.keys(club.startingFielding).sort(),POS.slice().sort(),'the completed squad still fills every position');
}

// ---------- the CPU fills its hole instead of hoarding rating ----------
{
 const st=D.createDraft(clubs,11);
 // Hand-craft a CPU squad missing only a catcher among its starters,
 // with all five pitchers already drafted: 8 batters + 5 pitchers.
 const pool=D.available(st);
 const fillers=[];
 for(const pos of ['SS','2B','CF','3B','1B','LF','RF']){
  const p=pool.batters.find(x=>!st.used.has(x.id)&&!D.eligible(x,'C')&&D.eligible(x,pos)&&!fillers.includes(x));
  fillers.push(p);
 }
 fillers.push(pool.batters.find(x=>!st.used.has(x.id)&&!D.eligible(x,'C')&&!fillers.includes(x)));
 // Apply through the real pick flow on CPU turns is impractical for a
 // crafted state, so seed the side directly (the module state shape).
 for(const p of fillers){st.sides.cpu.batters.push(p);st.used.add(p.id);}
 for(const p of pool.pitchers.slice(0,5)){st.sides.cpu.pitchers.push(p);st.used.add(p.id);}
 assert(D.guideFor(st,'cpu').positionsNeeded.includes('C'),'the crafted CPU squad lacks a catcher (open: '+D.guideFor(st,'cpu').positionsNeeded.join('/')+')');
 const pickId=D.choosePick(st,'cpu',()=>0.5);
 const pick=st.byId.get(pickId);
 assert(pick&&pick.pos!=='P','the CPU does not draft a sixth pitcher');
 assert(D.eligible(pick,'C'),`the CPU drafts a catcher-eligible batter (${pick.name}, natural ${pick.pos}) instead of a redundant bat`);
}

// ---------- auto-complete from a partial draft ----------
{
 const st=D.createDraft(clubs,123);
 D.applyPick(st,'user',D.choosePick(st,'user',D.mulberry32(1)));
 D.cpuPick(st,D.mulberry32(2));
 assert.equal(st.picks.length,2,'the draft is partial before auto-complete');
 assert.equal(D.autoComplete(st,D.mulberry32(3)),true,'auto-complete finishes the draft');
 assert(D.isComplete(st));
 const built=D.buildMatch(st,owls,giants);
 for(const club of [built.user,built.cpu])assert.deepEqual(Object.keys(club.startingFielding).sort(),POS.slice().sort(),'auto-completed squads fill every position');
}

// ---------- wrong turn / duplicate / unknown picks are rejected ----------
{
 const st=D.createDraft(clubs,5);
 const someBatter=D.available(st).batters[0];
 assert.equal(D.applyPick(st,'cpu',someBatter.id),false,'the CPU cannot pick on the user turn');
 assert.equal(D.applyPick(st,'user','no-such-player'),false,'unknown players are rejected');
 assert.equal(D.applyPick(st,'user',someBatter.id),true);
 assert.equal(D.pickLegal(st,'cpu',someBatter.id),false,'a drafted player cannot be drafted again');
}

// ---------- source rosters and saved lineups are untouched ----------
assert.equal(JSON.stringify(owls),owlsBefore,'drafting does not mutate the user base club');
assert.equal(JSON.stringify(giants),giantsBefore,'drafting does not mutate the CPU base club');
{
 const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
 assert(!/draftState[^\n]*settings\.matchLineups/.test(app),'the draft never writes into saved match lineups');
 assert(app.includes('pendingDraft'),'app tracks the pending draft flag');
 const startBody=app.slice(app.indexOf('const draftClubs'),app.indexOf('const draftClubs')+400);
 assert(startBody.includes('NightDraftBattle.buildMatch'),'start() builds the match from the completed draft');
}

// ---------- app wiring + v139 pins ----------
const index=fs.readFileSync(__dirname+'/../dist/index.html','utf8');
const sw=fs.readFileSync(__dirname+'/../dist/sw.js','utf8');
const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
assert(index.includes('data-mode="draft"'),'home menu offers the draft battle mode');
assert(index.includes('./draft-battle.js?v=1'),'index loads the draft module');
assert(app.includes('draftSetup'),'app has the draft setup screen');
assert(app.includes('draftRender'),'app has the draft board');
assert(app.includes('data-draft-pick'),'app renders pickable candidates');
assert(app.includes('draft-quit'),'the draft can be abandoned mid-way');
assert(index.includes('./game.js?v=168')&&index.includes('./app.js?v=168'),'index pins move to v139');
assert(sw.includes('nightball-v168-wind-balance'),'SW cache renamed for v139');
assert(sw.includes('./draft-battle.js?v=1'),'SW precaches the draft module');
assert(sw.includes('./game.js?v=168')&&sw.includes('./app.js?v=168'),'SW precaches the v139 scripts');
console.log('draft-battle-v139: all assertions passed');
