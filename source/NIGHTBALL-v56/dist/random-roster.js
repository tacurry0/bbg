/* Random roster matches (v132, checker item "random-roster-match").
   For a regular versus match only, both clubs keep their identity
   (id / name / colours / park) but their players are drawn fresh from
   the cross-league pool of every playable club (NightTeams.matchTeams:
   CPBL + NPB + KBO). Starters are drawn position by position from
   players who are actually eligible for that position (natural position
   or a listed secondary position; any batter may DH), pitchers are
   drawn from the pitcher pool, and the two clubs never share a player.
   The draw is uniform over the whole pool — no strength weighting — so
   a shuffled side is not secretly an all-star team. A numeric seed
   makes a draw reproducible; the app passes a fresh seed per match, so
   rematches draw again. */
(()=>{
'use strict';
const FIELD_POSITIONS=['C','1B','2B','3B','SS','LF','CF','RF','DH'];
// Scarce positions first, so a late position never has to fall back
// just because flexible players were spent elsewhere.
const DRAW_ORDER=['C','SS','2B','CF','3B','1B','LF','RF','DH'];
const OUTFIELD=['LF','CF','RF'];
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
 if(pos==='DH')return true;
 if(player.pos===pos)return true;
 const listed=player.positions||[];
 if(listed.includes(pos))return true;
 // Some rosters record outfield eligibility generically as "OF".
 return OUTFIELD.includes(pos)&&listed.includes('OF');
}
function poolFrom(clubs){
 const batters=[],pitchers=[],seen=new Set();
 for(const club of clubs||[]){
  for(const p of club.batters||[])if(!seen.has(p.id)){seen.add(p.id);batters.push(p);}
  for(const p of club.pitchers||[])if(!seen.has(p.id)){seen.add(p.id);pitchers.push(p);}
 }
 return {batters,pitchers};
}
function shuffled(list,rng){
 const out=list.slice();
 for(let i=out.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
 return out;
}
function drawClub(base,pool,used,rng){
 const pitchers=shuffled(pool.pitchers.filter(p=>!used.has(p.id)),rng).slice(0,(base.pitchers||[]).length);
 for(const p of pitchers)used.add(p.id);
 const starters=[],fielding={};
 for(const pos of DRAW_ORDER){
  let candidates=pool.batters.filter(p=>!used.has(p.id)&&eligible(p,pos));
  if(!candidates.length)candidates=pool.batters.filter(p=>!used.has(p.id));
  const pick=candidates[Math.floor(rng()*candidates.length)];
  used.add(pick.id);starters.push(pick);fielding[pos]=pick.id;
 }
 const benchCount=Math.max(0,(base.batters||[]).length-starters.length);
 const bench=shuffled(pool.batters.filter(p=>!used.has(p.id)),rng).slice(0,benchCount);
 for(const p of bench)used.add(p.id);
 const batters=[...starters,...bench];
 const order=shuffled(starters,rng).map(p=>p.id);
 return {...base,batters,pitchers,startingOrder:order,startingFielding:fielding,randomRoster:true};
}
// Builds both sides of one match from a shared used-set, so no player
// can appear on both teams. Returns {home, away} named after the two
// base clubs passed in (first, second), not after the home/away split.
function buildMatch(firstBase,secondBase,clubs,seed){
 const rng=typeof seed==='function'?seed:mulberry32(seed);
 const pool=poolFrom(clubs),used=new Set();
 const home=drawClub(firstBase,pool,used,rng);
 const away=drawClub(secondBase,pool,used,rng);
 return {home,away,seed:typeof seed==='number'?seed:null};
}
window.NightRandomRoster={FIELD_POSITIONS,DRAW_ORDER,eligible,poolFrom,mulberry32,buildMatch,drawClub};
})();
