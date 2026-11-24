/* Intrasquad scrimmage (v163, checker item "intrasquad-scrimmage"):
   a practice game inside ONE club — its registered players are split
   into a red side (紅組) and a white side (白組) that play each other.
   This is NOT the v124 farm game (farm side vs ANOTHER club's farm
   side) and NOT the v139 draft battle (players drafted from the whole
   30-club pool): every player on both sides belongs to the same club
   and no player appears on both sides.
   A club registers 16 batters and 14 pitchers, so two full nines of
   batters do not exist. The split therefore fields 8 batters per side
   at the eight field positions (scarce positions first, eligible =
   natural position or a listed secondary position, "OF" covers the
   outfield), and each side's strongest pitcher also bats as its DH —
   one person pitching and batting, never two copies of anyone.
   Pitchers are snake-split 7/7. The split is strength-balanced: at
   each position the stronger eligible player goes to the side whose
   running total is lower. Results are practice only: the app never
   folds a scrimmage into pennant standings, season stats, farm
   development or the v156 record room. */
(()=>{
'use strict';
const FIELD_POSITIONS=['C','1B','2B','3B','SS','LF','CF','RF'];
const DRAW_ORDER=['C','SS','2B','CF','3B','1B','LF','RF'];
const OUTFIELD=['LF','CF','RF'];
function eligible(player,pos){
 if(player.pos===pos)return true;
 const listed=player.positions||[];
 if(listed.includes(pos))return true;
 return OUTFIELD.includes(pos)&&listed.includes('OF');
}
const batScore=p=>(p.contact||0)*.28+(p.power||0)*.22+(p.run||0)*.16+(p.field||0)*.18+(p.arm||0)*.16;
const pitScore=p=>(p.velocity||0)+(p.control||0)+(p.stamina||0)*.6+(p.movement||0)*.8;
// A pitcher batting as DH: derived modest batting line, same person/id.
function pitcherBatter(p){
 return {...p,pos:'DH',positions:['DH'],contact:48,power:42,run:50,field:52,arm:62,trait:p.trait||'二刀流',scrimmagePitcherBatter:true};
}
function buildSide(base,side,batters,pitchers,fielding){
 const dh=pitchers.length?pitcherBatter(pitchers[0]):null;
 const all=dh?[...batters,dh]:batters.slice();
 const order=all.slice().sort((a,b)=>batScore(b)-batScore(a)).map(p=>p.id);
 const field={...fielding};
 if(dh)field.DH=dh.id;
 const label=side==='red'?'紅組':'白組';
 return {...base,id:base.id+'-scrimmage-'+side,name:base.name+' '+label,short:(base.short||base.name)+' '+label,
  color:side==='red'?'#c22f3d':base.color,scrimmage:true,scrimmageSide:side,baseClubId:base.id,
  batters:all,pitchers:pitchers.slice(),startingOrder:order,startingFielding:field};
}
function splitClub(base){
 if(!base||!Array.isArray(base.batters)||!Array.isArray(base.pitchers))return null;
 const remaining=base.batters.slice();
 const sides={red:{batters:[],fielding:{},total:0},white:{batters:[],fielding:{},total:0}};
 const take=(player,pos,side)=>{remaining.splice(remaining.indexOf(player),1);sides[side].batters.push(player);sides[side].fielding[pos]=player.id;sides[side].total+=batScore(player);};
 for(const pos of DRAW_ORDER){
  const cands=remaining.filter(p=>eligible(p,pos)).sort((a,b)=>batScore(b)-batScore(a));
  for(const pick of cands.slice(0,2)){
   const side=sides.red.total<=sides.white.total?'red':'white';
   if(sides[side].fielding[pos])continue;
   take(pick,pos,side);
  }
 }
 // Fill any position a side still misses with the best remaining batter
 // (then, for very thin rosters, a pitcher converted to a fielder).
 const sparePitchers=base.pitchers.slice().sort((a,b)=>pitScore(b)-pitScore(a));
 for(const sideName of ['red','white']){
  const side=sides[sideName];
  for(const pos of FIELD_POSITIONS){
   if(side.fielding[pos])continue;
   let player=remaining.slice().sort((a,b)=>batScore(b)-batScore(a))[0];
   if(player){take(player,pos,sideName);continue;}
   const conv=sparePitchers.find(p=>!side.batters.some(b=>b.id===p.id));
   if(conv){const b={...pitcherBatter(conv),pos,positions:[pos]};side.batters.push(b);side.fielding[pos]=b.id;}
  }
 }
 // Snake-split the pitchers 7/7 by strength (R W W R R W W R ...).
 const sorted=base.pitchers.slice().sort((a,b)=>pitScore(b)-pitScore(a));
 const pit={red:[],white:[]};
 sorted.forEach((p,i)=>{pit[Math.floor(i/2)%2===0?(i%2?'white':'red'):(i%2?'red':'white')].push(p);});
 return {baseId:base.id,red:buildSide(base,'red',sides.red.batters,pit.red,sides.red.fielding),white:buildSide(base,'white',sides.white.batters,pit.white,sides.white.fielding)};
}
// Swap two real batters between the sides and rebuild both clubs
// (fielding and batting order are recomputed by the same split rules).
function swapBatters(split,idA,idB){
 if(!split||idA===idB)return null;
 const real=c=>c.batters.filter(p=>!p.scrimmagePitcherBatter);
 const reds=real(split.red),whites=real(split.white);
 const aInRed=reds.some(p=>p.id===idA),aInWhite=whites.some(p=>p.id===idA);
 const bInRed=reds.some(p=>p.id===idB),bInWhite=whites.some(p=>p.id===idB);
 if(!((aInRed&&bInWhite)||(aInWhite&&bInRed)))return null;
 const base={id:split.baseId,batters:[...reds,...whites],pitchers:[...split.red.pitchers,...split.white.pitchers]};
 // Rebuild by hand: exchange the two batters, keep each side's pitchers.
 const newRed=(aInRed?reds:whites).map(p=>p.id===idA?whites.concat(reds).find(x=>x.id===idB):p.id===idB?whites.concat(reds).find(x=>x.id===idA):p);
 const newWhite=(aInRed?whites:reds).map(p=>p.id===idA?whites.concat(reds).find(x=>x.id===idB):p.id===idB?whites.concat(reds).find(x=>x.id===idA):p);
 const fieldFor=(batters,pitchers)=>{
  const fielding={},used=new Set();
  for(const pos of DRAW_ORDER){const c=batters.filter(p=>!used.has(p.id)&&eligible(p,pos)).sort((x,y)=>batScore(y)-batScore(x))[0];if(c){fielding[pos]=c.id;used.add(c.id);}}
  for(const pos of FIELD_POSITIONS)if(!fielding[pos]){const c=batters.find(p=>!used.has(p.id));if(c){fielding[pos]=c.id;used.add(c.id);}}
  return fielding;
 };
 const redB=newRed.filter(p=>!p.scrimmagePitcherBatter),whiteB=newWhite.filter(p=>!p.scrimmagePitcherBatter);
 const fakeBase={...split.red,id:split.baseId,name:split.red.name.replace(/ 紅組$/,''),short:split.red.short.replace(/ 紅組$/,''),color:split.white.color};
 return {baseId:split.baseId,red:buildSide(fakeBase,'red',redB,split.red.pitchers,fieldFor(redB,split.red.pitchers)),white:buildSide(fakeBase,'white',whiteB,split.white.pitchers,fieldFor(whiteB,split.white.pitchers))};
}
window.NightScrimmage={FIELD_POSITIONS,DRAW_ORDER,eligible,batScore,pitScore,pitcherBatter,splitClub,swapBatters,buildSide};
})();
