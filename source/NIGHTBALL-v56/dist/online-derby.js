/* Online HR derby (v141, checker item online-hr-derby).
   A short head-to-head home run contest on top of the existing online
   rooms (PeerJS, host-created). Format: the two players alternate ONE
   swing at a time, SWINGS_PER_PLAYER swings each, and compete on home
   run count, then on longest distance. A "swing" is one batted ball
   whose flight resolved (fouls included); takes and whiffs do not spend
   a swing, mirroring the unlimited-pitch feel of the offline derby.

   Sync model (deliberately simple, friends-only): each side plays its
   own swings on its OWN device with the regular derby engine
   (NightGame mode 'derby') and sends only the resolved result
   ({hr, distance}) to the peer. Both sides keep an identical copy of
   the contest state built by this module; record() enforces the
   alternating turn order and per-player swing budget, so out-of-turn
   or duplicate results are ignored on BOTH sides (the host applies the
   same check to guest results before tallying, and sends the final
   {t:'derby-end'} tally). There is NO anti-cheat: a modified client
   could report a fake distance. That trade-off is accepted for a
   friends-only tool and is documented as such. */
(()=>{
 const SWINGS_PER_PLAYER=10;
 function pickBatter(club){
  const batters=club?.batters||[];
  let best=batters[0]||null;
  for(const p of batters)if(p.power>(best?.power??-1))best=p;
  return best;
 }
 function entrant(e){
  return {clubId:e?.clubId||'',batterId:e?.batterId||'',name:e?.name||'',clubName:e?.clubName||'',hr:0,maxDistance:0,used:0,results:[]};
 }
 function create({host,guest,swings}={}){
  const per=Number.isInteger(swings)&&swings>0?swings:SWINGS_PER_PLAYER;
  return {swingsPerPlayer:per,players:[entrant(host),entrant(guest)],taken:0};
 }
 function isOver(state){
  return !!state&&state.players.every(p=>p.used>=state.swingsPerPlayer);
 }
 /* Whose swing is next: players alternate, host (index 0) first. */
 function turnIndex(state){
  if(!state||isOver(state))return -1;
  return state.taken%2;
 }
 function record(state,playerIndex,result){
  if(!state||isOver(state))return false;
  if(playerIndex!==turnIndex(state))return false;
  const p=state.players[playerIndex];
  if(!p||p.used>=state.swingsPerPlayer)return false;
  const distance=Math.max(0,Math.round(Number(result?.distance)||0));
  const hr=!!result?.hr;
  p.used++;p.results.push({hr,distance});
  if(hr)p.hr++;
  if(distance>p.maxDistance)p.maxDistance=distance;
  state.taken++;
  return true;
 }
 /* Winner once the contest is over: more home runs, then longer best
    distance, else a draw. Returns 0, 1, 'draw', or null while playing. */
 function winner(state){
  if(!isOver(state))return null;
  const [a,b]=state.players;
  if(a.hr!==b.hr)return a.hr>b.hr?0:1;
  if(a.maxDistance!==b.maxDistance)return a.maxDistance>b.maxDistance?0:1;
  return 'draw';
 }
 window.NightOnlineDerby={SWINGS_PER_PLAYER,pickBatter,create,isOver,turnIndex,record,winner};
})();
