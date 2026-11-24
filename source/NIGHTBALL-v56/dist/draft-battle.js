/* Draft battle mode (v139, checker item "draft-battle"): a short
   versus mode where the user and the CPU alternately draft players
   from the full cross-league pool (NightTeams.matchTeams: CPBL + NPB
   + KBO, all 30 clubs) and then play a regular match with the two
   squads they built. The pick order is a snake (rounds alternate
   user-first / CPU-first, shown in the UI). Each side drafts 17
   players: 9 starting batters covering every defensive position,
   3 bench batters and 5 pitchers — the same shape a regular club
   carries into a match. A pick is rejected when it would make a
   required position impossible to fill with the slots that remain,
   so a draft can always be completed; an auto-complete fills any
   remaining picks for both sides with the same need-aware logic the
   CPU uses. The CPU scores candidates by rating plus a large bonus
   for filling a position it still needs (scarce positions first),
   with a small random spread, so it neither ignores its holes nor
   simply hoards the highest-rated players. Drafted clubs are built
   fresh from the two base clubs' identities (the versus-match clubs
   from the match settings) and live only in memory for this one
   match: saved lineups (settings.matchLineups / settings.order) and
   every other mode are never touched, and nothing is persisted.
   Position eligibility reuses NightRandomRoster.eligible (v132). */
(()=>{
'use strict';
const FIELD_POSITIONS=['C','1B','2B','3B','SS','LF','CF','RF','DH'];
// Scarce positions are assigned first when a drafted batter can cover
// several open positions (same order as the v132 random draw).
const ASSIGN_ORDER=['C','SS','2B','CF','3B','1B','LF','RF','DH'];
const SCARCE=new Set(['C','SS','2B','CF']);
const STARTERS=9,BENCH=3,PITCHERS=5;
const BATTER_SLOTS=STARTERS+BENCH,PICKS_PER_SIDE=BATTER_SLOTS+PITCHERS,ROUNDS=PICKS_PER_SIDE;
function mulberry32(seed){
 let a=Number(seed)>>>0||1;
 return ()=>{
  a=(a+0x6D2B79F5)>>>0;
  let t=a;
  t=Math.imul(t^(t>>>15),t|1);
  t^=t+Math.imul(t^(t>>>7),t|61);
  return ((t^(t>>>14))>>>0)/4294967296;
 };
}
function eligible(player,pos){
 const rr=typeof globalThis!=='undefined'?globalThis.NightRandomRoster:null;
 if(rr&&typeof rr.eligible==='function')return rr.eligible(player,pos);
 if(pos==='DH')return true;
 if(player.pos===pos)return true;
 const listed=player.positions||[];
 if(listed.includes(pos))return true;
 return ['LF','CF','RF'].includes(pos)&&listed.includes('OF');
}
function poolFrom(clubs){
 const batters=[],pitchers=[],seen=new Set();
 for(const club of clubs||[]){
  for(const p of club.batters||[])if(!seen.has(p.id)){seen.add(p.id);batters.push(p);}
  for(const p of club.pitchers||[])if(!seen.has(p.id)){seen.add(p.id);pitchers.push(p);}
 }
 return {batters,pitchers};
}
function rateBatter(p){return (p.contact||0)+(p.power||0)+(p.run||0)+(p.field||0)+(p.arm||0);}
function ratePitcher(p){return (p.control||0)+(p.stamina||0)+(p.movement||0)+(p.velocity||0);}
// Greedy fielding assignment in pick order: each batter takes the
// scarcest open position he is eligible for (DH accepts anyone and is
// considered last), otherwise he is bench. Deterministic.
function assignFielding(batters){
 const fielding={},used=new Set();
 for(const p of batters){
  for(const pos of ASSIGN_ORDER){
   if(!(pos in fielding)&&eligible(p,pos)){fielding[pos]=p.id;used.add(p.id);break;}
  }
 }
 return {fielding,bench:batters.filter(p=>!used.has(p.id))};
}
// Snake order: round 1 user first, round 2 CPU first, and so on.
function pickSequence(){
 const seq=[];
 for(let r=0;r<ROUNDS;r++){
  if(r%2===0)seq.push('user','cpu');else seq.push('cpu','user');
 }
 return seq;
}
function createDraft(clubs,seed){
 const pool=poolFrom(clubs);
 return {
  v:1,seed:typeof seed==='number'?seed:null,
  pool,byId:new Map([...pool.batters,...pool.pitchers].map(p=>[p.id,p])),
  used:new Set(),picks:[],
  sides:{user:{batters:[],pitchers:[]},cpu:{batters:[],pitchers:[]}},
 };
}
function currentSide(state){
 if(!state||state.picks.length>=ROUNDS*2)return null;
 return pickSequence()[state.picks.length];
}
function isComplete(state){return !!state&&state.picks.length>=ROUNDS*2;}
function guideFor(state,side){
 const s=state.sides[side];
 const {fielding}=assignFielding(s.batters);
 const positionsNeeded=FIELD_POSITIONS.filter(pos=>!(pos in fielding));
 return {
  fielding,positionsNeeded,
  startersNeeded:positionsNeeded.length,
  benchNeeded:Math.max(0,BATTER_SLOTS-s.batters.length-positionsNeeded.length),
  battersNeeded:BATTER_SLOTS-s.batters.length,
  pitchersNeeded:PITCHERS-s.pitchers.length,
  picksLeft:PICKS_PER_SIDE-s.batters.length-s.pitchers.length,
 };
}
// A batter pick is only legal while every still-open position can
// still be covered by the batter slots that would remain.
function batterPickLegal(state,side,player){
 const s=state.sides[side];
 if(s.batters.length>=BATTER_SLOTS)return false;
 const after=[...s.batters,player];
 const {fielding}=assignFielding(after);
 const unfilled=FIELD_POSITIONS.length-Object.keys(fielding).length;
 return unfilled<=BATTER_SLOTS-after.length;
}
function pickLegal(state,side,playerId){
 if(!state||currentSide(state)!==side)return false;
 const player=state.byId.get(playerId);
 if(!player||state.used.has(playerId))return false;
 if(player.pos==='P')return state.sides[side].pitchers.length<PITCHERS;
 return batterPickLegal(state,side,player);
}
function applyPick(state,side,playerId){
 if(!pickLegal(state,side,playerId))return false;
 const player=state.byId.get(playerId);
 state.used.add(playerId);
 if(player.pos==='P')state.sides[side].pitchers.push(player);
 else state.sides[side].batters.push(player);
 state.picks.push({side,playerId,kind:player.pos==='P'?'pitcher':'batter',round:Math.floor(state.picks.length/2)+1});
 return true;
}
function available(state){
 return {
  batters:state.pool.batters.filter(p=>!state.used.has(p.id)),
  pitchers:state.pool.pitchers.filter(p=>!state.used.has(p.id)),
 };
}
// Need-aware scoring shared by the CPU and by auto-complete. A player
// who fills an open position scores far above raw rating, scarce
// positions score extra, and a small random spread keeps the CPU
// from mechanically taking the single top-rated player every time.
function scoreCandidate(state,side,player,rng){
 const guide=guideFor(state,side);
 const rand=typeof rng==='function'?rng:Math.random;
 if(player.pos==='P'){
  if(guide.pitchersNeeded<=0)return null;
  let score=ratePitcher(player)+40;
  // When the remaining picks are exactly the pitchers still needed,
  // a pitcher becomes mandatory in effect (huge bonus).
  if(guide.picksLeft<=guide.pitchersNeeded)score+=1000;
  return score+rand()*25;
 }
 if(!batterPickLegal(state,side,player))return null;
 let score=rateBatter(player);
 const fills=guide.positionsNeeded.filter(pos=>eligible(player,pos));
 if(fills.length){
  score+=120;
  if(fills.some(pos=>SCARCE.has(pos)))score+=30;
 }else if(guide.battersNeeded>0){
  score+=10; // bench depth still has some value
 }
 if(guide.picksLeft<=guide.battersNeeded)score+=1000;
 return score+rand()*25;
}
function choosePick(state,side,rng){
 const {batters,pitchers}=available(state);
 let best=null,bestScore=-Infinity;
 for(const player of [...batters,...pitchers]){
  const score=scoreCandidate(state,side,player,rng);
  if(score===null)continue;
  if(score>bestScore){bestScore=score;best=player;}
 }
 return best?best.id:null;
}
function cpuPick(state,rng){
 if(currentSide(state)!=='cpu')return null;
 const id=choosePick(state,'cpu',rng);
 return id&&applyPick(state,'cpu',id)?id:null;
}
function autoPick(state,rng){
 const side=currentSide(state);if(!side)return null;
 const id=choosePick(state,side,rng);
 return id&&applyPick(state,side,id)?id:null;
}
function autoComplete(state,rng){
 let guard=ROUNDS*2+4;
 while(!isComplete(state)&&guard-->0){
  if(!autoPick(state,rng))break;
 }
 return isComplete(state);
}
// Build a match-ready club from one side's drafted players. The
// batting order is a simple strength order (contact + power + speed);
// if a position somehow stayed open (pool exhaustion), the first
// unassigned starter covers it so the club is always match-legal.
function buildClub(state,side,base){
 const s=state.sides[side];
 const {fielding}=assignFielding(s.batters);
 const starterIds=new Set(Object.values(fielding));
 const starters=s.batters.filter(p=>starterIds.has(p.id));
 const missing=FIELD_POSITIONS.filter(pos=>!(pos in fielding));
 for(const pos of missing){
  const extra=s.batters.find(p=>!starterIds.has(p.id))||starters[0];
  if(!extra)break;
  fielding[pos]=extra.id;starterIds.add(extra.id);starters.push(extra);
 }
 const bench=s.batters.filter(p=>!starterIds.has(p.id));
 const order=starters.slice().sort((a,b)=>rateBatter(b)-rateBatter(a)).map(p=>p.id);
 return {...base,batters:[...starters,...bench],pitchers:s.pitchers.slice(),
  startingOrder:order,startingFielding:{...fielding},draftBattle:true};
}
function buildMatch(state,userBase,cpuBase){
 return {user:buildClub(state,'user',userBase),cpu:buildClub(state,'cpu',cpuBase)};
}
const api={FIELD_POSITIONS,ASSIGN_ORDER,STARTERS,BENCH,PITCHERS,BATTER_SLOTS,PICKS_PER_SIDE,ROUNDS,
 mulberry32,eligible,poolFrom,rateBatter,ratePitcher,assignFielding,pickSequence,
 createDraft,currentSide,isComplete,guideFor,batterPickLegal,pickLegal,applyPick,
 available,scoreCandidate,choosePick,cpuPick,autoPick,autoComplete,buildClub,buildMatch};
if(typeof window!=='undefined')window.NightDraftBattle=api;
if(typeof globalThis!=='undefined')globalThis.NightDraftBattle=api;
})();
