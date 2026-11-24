/* Configurable round-robin seasons for CPBL, NPB and KBO. */
(()=>{
 'use strict';
 const P=NightPlayers;
 // IDs are retained so existing seasons and custom orders continue to load.
 const definitions=[
  ['owls','中信兄弟','兄弟','brothers','#f4bd13','#14263e','つなぐ打線','巧打とスピードで、一点をもぎ取る。','night'],
  ['foxes','味全ドラゴンズ','味全','dragons','#c40020','#fff0e4','攻守のバランス','厚い中軸と多彩な変化球を備える。','brick'],
  ['falcons','統一ライオンズ','統一','lions','#ee7f19','#fff4d2','最速の機動力','俊足の走者と広い守備範囲が武器。','sky'],
  ['mariners','富邦ガーディアンズ','富邦','guardians','#004b8d','#d5eeff','精密な野球','高い制球力と巧打で試合を組み立てる。','harbor'],
  ['wolves','樂天モンキーズ','樂天','monkeys','#790826','#ffe0bb','鉄壁の守り','強肩と守備力で、最後のアウトを奪う。','dome'],
  ['comets','台鋼ホークス','台鋼','hawks','#006043','#e7c36a','一発の破壊力','長打力のある打線と剛腕で押し切る。','river']
 ];
 const clubs=definitions.map(([id,name,mark,asset,color,accent,tag,description,park])=>({id,name,short:name,mark,logo:`./assets/clubs/${asset}.png`,color,accent,tag,description,park,...P.rosters[id]}));
 window.NightTeams={all:clubs,get:id=>clubs.find(c=>c.id===id)||clubs[0]};
 const leagues={cpbl:'CPBL', 'npb-central':'セ・リーグ','npb-pacific':'パ・リーグ',kbo:'KBO'};
 const isSplit=id=>id==='npb-central'||id==='npb-pacific';
 const otherLeague=id=>id==='npb-central'?'npb-pacific':'npb-central';
 // ---- Custom leagues (v107, league-editor.js): user-built pennant leagues
 // whose clubs are drawn from the CPBL/NPB/KBO pool. Definitions live in a
 // registry here so clubsFor/standings/playoffs resolve them exactly like a
 // built-in league; league-editor.js owns persistence (localStorage) and
 // registers every stored definition. Built-in league ids never start with
 // 'custom-', so existing resolution is untouched.
 const customLeagues=new Map();
 const CUSTOM_MIN_CLUBS=4;
 const poolClubs=()=>{const seen=new Map();for(const c of [...clubs,...(NightTeams.npb||[]),...(NightTeams.kbo||[])])if(!seen.has(c.id))seen.set(c.id,c);return [...seen.values()];};
 function validateCustomLeague(def){
  const errors=[];
  if(!def||typeof def!=='object')return {ok:false,errors:['リーグ定義がありません'],def:null};
  const id=String(def.id||'');
  if(!/^custom-[a-z0-9-]+$/.test(id))errors.push('リーグIDが不正です');
  const name=String(def.name??'').replace(/[<>&"']/g,'').trim().slice(0,24);
  if(!name)errors.push('リーグ名を入力してください');
  const pool=new Map(poolClubs().map(c=>[c.id,c]));
  const clubIds=Array.isArray(def.clubIds)?def.clubIds.map(String):[];
  if(new Set(clubIds).size!==clubIds.length)errors.push('同じ球団が重複しています');
  if(clubIds.some(c=>!pool.has(c)))errors.push('球団プールにない球団が含まれています');
  if(clubIds.length<CUSTOM_MIN_CLUBS)errors.push(`球団数は${CUSTOM_MIN_CLUBS}球団以上にしてください`);
  else if(clubIds.length%2)errors.push('球団数は偶数にしてください（奇数だと毎節1球団が試合のない節になってしまうため）');
  if(clubIds.length>pool.size)errors.push('球団プールの球団数を超えています');
  const games=def.gamesPerOpponent;
  if(!Number.isInteger(games)||games<1||games>10)errors.push('対戦数は1〜10試合で指定してください');
  if(errors.length)return {ok:false,errors,def:null};
  return {ok:true,errors,def:{id,name,clubIds,gamesPerOpponent:games,dh:def.dh!==false,playoffs:def.playoffs!==false}};
 }
 function registerCustomLeague(def){
  const v=validateCustomLeague(def);
  if(!v.ok)return null;
  customLeagues.set(v.def.id,v.def);
  return v.def;
 }
 const clubsFor=id=>{
  if(customLeagues.has(id))return customLeagues.get(id).clubIds.map(cid=>NightTeams.get(cid));
  if(id==='cpbl')return clubs;
  if(isSplit(id)){
   const division=id.slice(4),farm=division==='central'?'npb-a':'npb-v';
   return (NightTeams.npb||[]).filter(c=>c.division===division||c.id===farm);
  }
  return ['npb','kbo'].includes(id)?NightTeams[id]||[]:[];
 };
 function roundRobin(ids,games,clubId,prefix='r'){
  const rotation=ids.slice();
  if(rotation.length%2)rotation.push(null);
  const rounds=rotation.length-1,base=[];
  for(let r=0;r<rounds;r++){
   const pairs=[];
   for(let i=0;i<rotation.length/2;i++){
    const a=rotation[i],b=rotation[rounds-i];
    if(a&&b)pairs.push((r+i)%2?[b,a]:[a,b]);
   }
   base.push(pairs);rotation.splice(1,0,rotation.pop());
  }
  // Put the controlled club's bye first so the season always ends with a playable round.
  const bye=clubId?base.findIndex(pairs=>!pairs.some(pair=>pair.includes(clubId))):-1;
  if(bye>0)base.unshift(...base.splice(bye,1));
  return Array.from({length:games*rounds},(_,r)=>{
   const reverse=Math.floor(r/rounds)%2;
   return base[r%rounds].map(([h,a],i)=>({id:`${prefix}${r+1}-${i+1}`,round:r,home:reverse?a:h,away:reverse?h:a}));
  });
 }
 function validSchedule(schedule,teamList,count){
  if(!Array.isArray(schedule))return false;
  const size=teamList.length,ids=new Set(teamList.map(c=>c.id));
  const rounds=size%2?size:size-1;
  if(schedule.length!==rounds*count)return false;
  const fixtureIds=new Set(),pairings=new Map();
  for(const round of schedule){
   if(!Array.isArray(round)||round.length!==Math.floor(size/2))return false;
   const playing=new Set(round.flatMap(f=>[f?.home,f?.away]));
   if(playing.size!==round.length*2||[...playing].some(id=>!ids.has(id)))return false;
   for(const f of round){
    if(typeof f.id!=='string'||fixtureIds.has(f.id))return false;
    fixtureIds.add(f.id);
    const pair=[f.home,f.away].sort().join('/');
    pairings.set(pair,(pairings.get(pair)||0)+1);
   }
  }
  return pairings.size===size*(size-1)/2&&[...pairings.values()].every(n=>n===count);
 }
 const hash=s=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
 const random=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
 class NightPennant{
  static leagues=leagues;
  static clubsFor=clubsFor;
  static validSchedule=validSchedule;
  static validateCustomLeague=validateCustomLeague;
  static registerCustomLeague=registerCustomLeague;
  static unregisterCustomLeague=id=>customLeagues.delete(id);
  static customLeague=id=>customLeagues.get(id)||null;
  static clubPool=poolClubs;
  static CUSTOM_MIN_CLUBS=CUSTOM_MIN_CLUBS;
  constructor(clubId,gamesPerOpponent=4,options={}){
   const customDef=options?.customLeague?registerCustomLeague(options.customLeague):null;
   if(options?.customLeague&&!customDef)throw Error('Invalid custom league: '+validateCustomLeague(options.customLeague).errors.join(' / '));
   const leagueId=customDef?customDef.id:Object.keys(leagues).find(id=>clubsFor(id).some(c=>c.id===clubId));
   if(!leagueId)throw Error('Unknown club');
   if(customDef&&!customDef.clubIds.includes(clubId))throw Error('Club is not in the custom league');
   if(!Number.isInteger(gamesPerOpponent)||gamesPerOpponent<1||gamesPerOpponent>10)throw Error('Choose 1–10 games per opponent');
   this.rotation={};this.playerStats={};this.history=[];this.injuries={};this.settledRound=-1;this.season=1;this.rosterMoves={};this.customPlayers={};this.departed=[];this.ratingMods={};this.ages={};this.news=[];this.tradeOffer=null;this.offseason=null;this.titles=[];this.seasonArchive=[];this.mastery={};this.learnedPitches={};this.pitchLearning={};this.farmGameRound=-1;this.farmMoves={};this.farmProgress={};this.allstarPlayed=false;this.celebrated=false;this.faDone=false;this.schema=3;this.leagueId=leagueId;this.customLeague=customDef;this.dh=customDef?customDef.dh:true;this.playoffs=customDef?customDef.playoffs:true;this.gamesPerOpponent=gamesPerOpponent;this.id=Date.now().toString(36)+Math.random().toString(36).slice(2,7);this.clubId=clubId;this.round=0;this.results={};this.currentGame=null;this.postseason=null;this.createdAt=new Date().toISOString();
   this.schedule=roundRobin(this.clubs.map(c=>c.id),gamesPerOpponent,clubId);
   if(this.isNPB){
    this.schema=4;
    this.otherSchedule=roundRobin(clubsFor(this.otherLeague).map(c=>c.id),gamesPerOpponent,null,'other-r');
    this.otherResults={};this.advanceByes();
   }
   this.preseason=this.buildPreseason();
  }
  // ---- Preseason (オープン戦, v137): a short exhibition slate played before
  // opening day. It lives entirely outside the regular schedule: results go
  // to preseason.results (never this.results), simulated stats are discarded
  // instead of folded into playerStats, and standings/totalGames never see
  // it. Three games against the first three other clubs, alternating
  // home/away. Farm-assigned players may appear in live games (app.js lifts
  // the farm exclusion for preseason fixtures) and earn a small development
  // credit, mirroring the v124 farm-game credit cadence at half size.
  static PRESEASON_COUNT=3;
  buildPreseason(){
   const others=this.clubs.filter(c=>c.id!==this.clubId);
   const games=others.slice(0,NightPennant.PRESEASON_COUNT).map((c,i)=>i%2?{id:'pre-'+(i+1),home:this.clubId,away:c.id,preseason:true}:{id:'pre-'+(i+1),home:c.id,away:this.clubId,preseason:true});
   return {games,index:0,results:{},done:games.length===0,skipped:false};
  }
  static normalizePreseason(raw,p){
   // Pre-v137 saves carry no preseason field: their season is already under
   // way, so the preseason is simply over (never re-opened mid-season).
   const over={games:[],index:0,results:{},done:true,skipped:false};
   if(!raw||typeof raw!=='object'||!Array.isArray(raw.games)||!raw.games.length)return over;
   const ids=new Set(p.clubs.map(c=>c.id)),games=[];
   for(const g of raw.games){
    if(!g||typeof g.id!=='string'||!ids.has(g.home)||!ids.has(g.away)||g.home===g.away||games.some(x=>x.id===g.id))return over;
    games.push({id:g.id,home:g.home,away:g.away,preseason:true});
   }
   const results={};
   if(raw.results&&typeof raw.results==='object')for(const g of games){
    const r=raw.results[g.id];
    if(r&&Number.isInteger(r.homeScore)&&Number.isInteger(r.awayScore)&&r.homeScore>=0&&r.awayScore>=0&&r.homeScore!==r.awayScore)results[g.id]={...g,homeScore:r.homeScore,awayScore:r.awayScore,innings:Number.isInteger(r.innings)?r.innings:1,credits:Array.isArray(r.credits)?r.credits.filter(x=>typeof x==='string'):[]};
   }
   const playedCount=Object.keys(results).length;
   // Results must be exactly the first N fixtures in order; anything else is
   // inconsistent, so fail safe to "preseason over" rather than trapping the
   // season behind a broken slate.
   if(games.slice(0,playedCount).some(g=>!results[g.id]))return {games,index:games.length,results:{},done:true,skipped:false};
   const index=Number.isInteger(raw.index)?Math.max(playedCount,Math.min(games.length,raw.index)):playedCount;
   if(index!==playedCount&&!(raw.done===true&&index===games.length))return {games,index:games.length,results:{},done:true,skipped:false};
   return {games,index,results,done:raw.done===true||index>=games.length,skipped:raw.skipped===true};
  }
  get preseasonActive(){return !!this.preseason&&!this.preseason.done;}
  get preseasonFixture(){if(!this.preseasonActive)return null;return this.preseason.games[this.preseason.index]||null;}
  get preseasonPlayed(){return Object.keys(this.preseason?.results||{}).length;}
  // One development step (half the v124 farm-game credit) for each of the
  // user's farm-assigned players who actually appeared in a live preseason
  // game, stepped through the same every-4-rounds bonus cadence.
  preseasonCredit(game){
   if(!game)return [];
   const mine=new Set(this.farmIds(this.clubId));
   const appeared=new Set([...Object.keys(game.box||{}),...Object.keys(game.pitchingStats||{})]);
   const credited=[];
   this.farmProgress=this.farmProgress||{};this.ratingMods=this.ratingMods||{};
   for(const id of mine){
    if(!appeared.has(id))continue;
    const prog=this.farmProgress[id]||(this.farmProgress[id]={rounds:0,bonus:0});
    prog.rounds++;
    if(prog.rounds%4===0&&prog.bonus<6)this._farmBonus(id,prog,this.clubId);
    credited.push(id);
   }
   return credited;
  }
  completePreseasonGame(score,game){
   const pre=this.preseason,f=this.preseasonFixture;
   if(!pre||!f||!score||pre.results[f.id])return false;
   if(![score.homeScore,score.awayScore].every(n=>Number.isInteger(n)&&n>=0)||score.homeScore===score.awayScore)return false;
   const credits=game?this.preseasonCredit(game):[];
   pre.results[f.id]={...f,homeScore:score.homeScore,awayScore:score.awayScore,innings:score.inning||score.innings||1,credits};
   pre.index++;this.currentGame=null;
   if(pre.index>=pre.games.length){pre.done=true;this.pushNews('オープン戦が終了し、ペナントレースが開幕した');}
   else this.pushNews(`オープン戦 第${pre.index}戦が終了（残り${pre.games.length-pre.index}試合）`);
   return true;
  }
  simulatePreseasonGame(){
   const f=this.preseasonFixture;if(!f)return false;
   // The sim's player stats are deliberately discarded: preseason numbers
   // never enter the season's playerStats.
   const s=this.simulate(f);
   return this.completePreseasonGame({homeScore:s.homeScore,awayScore:s.awayScore,inning:s.innings});
  }
  skipPreseason(){
   const pre=this.preseason;
   if(!pre||pre.done)return false;
   pre.done=true;pre.skipped=true;this.currentGame=null;
   this.pushNews('オープン戦をスキップして開幕した');
   return true;
  }
  static restore(s){
   if(![1,2,3,4].includes(s?.schema))return null;
   // A custom-league save embeds its definition, so a season restores (and
   // re-registers its league) even if the definition was removed from the
   // league-editor list in the meantime.
   if(s?.customLeague)registerCustomLeague(s.customLeague);
   const leagueId=s.schema<3?'cpbl':s.leagueId,count=s.schema===1?4:s.gamesPerOpponent;
   const members=clubsFor(leagueId),split=isSplit(leagueId);
   if(split!==(s.schema===4)||!members.some(c=>c.id===s.clubId)||!Number.isInteger(count)||count<1||count>10||
    !validSchedule(s.schedule,members,count)||!Number.isInteger(s.round)||s.round<0||s.round>=s.schedule.length)return null;
   if(!s.schedule[s.round].some(f=>[f.home,f.away].includes(s.clubId)))return null;
   if(split&&!validSchedule(s.otherSchedule,clubsFor(otherLeague(leagueId)),count))return null;
   const p=Object.assign(Object.create(NightPennant.prototype),s,{schema:split?4:3,leagueId,gamesPerOpponent:count});
   if(customLeagues.has(leagueId)){p.customLeague=customLeagues.get(leagueId);p.dh=p.dh!==false;p.playoffs=p.playoffs!==false;}
   else{p.customLeague=null;p.dh=true;p.playoffs=true;}
   p.results ||= {};p.postseason ||= null;p.rotation ||= {};p.playerStats ||= {};p.history ||= [];p.injuries ||= {};p.settledRound ??= -1;p.season ??= 1;p.rosterMoves ||= {};p.customPlayers ||= {};p.departed ||= [];p.ratingMods ||= {};p.ages ||= {};p.news ||= [];p.tradeOffer ??= null;p.offseason ??= null;p.titles ||= [];p.seasonArchive ||= [];p.mastery ||= {};p.learnedPitches=(p.learnedPitches&&typeof p.learnedPitches==='object'&&!Array.isArray(p.learnedPitches))?Object.fromEntries(Object.entries(p.learnedPitches).filter(([,v])=>Array.isArray(v)).map(([k,v])=>[k,v.filter(x=>typeof x==='string')] )):{};p.pitchLearning=(p.pitchLearning&&typeof p.pitchLearning==='object'&&!Array.isArray(p.pitchLearning))?p.pitchLearning:{};p.farmGameRound ??= -1;p.farmMoves ||= {};p.farmProgress ||= {};p.allstarPlayed ??= false;p.celebrated ??= false;p.faDone ??= false;p.preseason=NightPennant.normalizePreseason(p.preseason,p);
   if(split)p.otherResults ||= {};
   if(p.postseason&&!(split?NightNPBPostseason.valid(p):p.validPostseason()))return null;
   return p;
  }
  get totalGames(){return this.gamesPerOpponent*(this.clubs.length-1);}
  get clubs(){return clubsFor(this.leagueId);}
  get isNPB(){return isSplit(this.leagueId);}
  get otherLeague(){return this.isNPB?otherLeague(this.leagueId):null;}
  get club(){return NightTeams.get(this.clubId);}
  get fixture(){return this.schedule[this.round].find(f=>[f.home,f.away].includes(this.clubId));}
  get roundDone(){return !!this.results[this.fixture.id];}
  get completed(){return this.round===this.schedule.length-1&&this.roundDone;}
  get played(){return Object.values(this.results).filter(r=>[r.home,r.away].includes(this.clubId)).length;}
  next(){if(!this.roundDone||this.completed)return false;this.round++;this.currentGame=null;this.advanceByes();return true;}
  starterIndexFor(clubId){
   const club=this.clubRoster(clubId);if(!club)return 0;
   const out=new Set(this.injuredIds(clubId));
   let pool=club.pitchers.map((p,i)=>i).filter(i=>club.pitchers[i].role==='SP'&&!out.has(club.pitchers[i].id)&&!(this.farmMoves||{})[club.pitchers[i].id]);
   if(!pool.length)pool=club.pitchers.map((p,i)=>i).filter(i=>club.pitchers[i].role==='SP');
   const list=pool.length?pool:club.pitchers.map((_,i)=>i).slice(0,4);
   return list[(this.rotation[clubId]||0)%list.length];
  }
  clubRoster(clubId){
   const club=NightTeams.get(clubId);if(!club)return club;
   const moves=this.rosterMoves||{},custom=this.customPlayers||{},gone=new Set(this.departed||[]),mods=this.ratingMods||{};
   if(!Object.keys(moves).length&&!Object.keys(custom).length&&!gone.size&&!Object.keys(mods).length&&!Object.keys(this.learnedPitches||{}).length)return club;
   const sources=[...NightTeams.all,...(NightTeams.npb||[]),...(NightTeams.kbo||[])];
   const batters=[],pitchers=[];
   for(const src of sources){
    for(const p of src.batters||[])if((moves[p.id]||src.id)===clubId&&!gone.has(p.id))batters.push(p);
    for(const p of src.pitchers||[])if((moves[p.id]||src.id)===clubId&&!gone.has(p.id))pitchers.push(p);
   }
   for(const p of Object.values(custom))if(p.clubId===clubId&&!gone.has(p.id))(p.pos==='P'?pitchers:batters).push(p);
   const adj=p=>{const m=mods[p.id],learned=(this.learnedPitches||{})[p.id];if(!m&&!learned?.length)return p;const o={...p};if(m)for(const k of Object.keys(m))o[k]=Math.max(20,Math.min(99,(o[k]||60)+m[k]));if(learned?.length&&(p.pos==='P'||p.velocity))o.pitches=[...(p.pitches||['fast']),...learned.filter(id=>!(p.pitches||[]).includes(id))];return o;};
   const out={...club,batters:batters.map(adj),pitchers:pitchers.map(adj)};
   const avail=new Set(out.batters.map(p=>p.id));
   out.startingOrder=(club.startingOrder||[]).filter(id=>avail.has(id));
   for(const p of [...out.batters].sort((a,b)=>(b.contact+b.power)-(a.contact+a.power)))if(out.startingOrder.length>=9)break;else if(!out.startingOrder.includes(p.id))out.startingOrder.push(p.id);
   out.startingFielding=Object.fromEntries(Object.entries(club.startingFielding||{}).filter(([,id])=>avail.has(id)));
   return out;
  }
  playerValue(p){
   if(!p)return 0;
   return p.pos==='P'||p.velocity?(p.velocity||0)+(p.control||0)+(p.stamina||0)*.6+(p.movement||0)*.8:(p.contact||0)+(p.power||0)+(p.run||0)*.6+(p.field||0)*.5;
  }
  pushNews(text){(this.news||(this.news=[])).unshift({round:this.round,text});this.news=this.news.slice(0,10);}
  maybeTradeOffer(){
   if(this.tradeOffer||this.completed||this.round<2||this.round>this.schedule.length-4||Math.random()>=.3)return;
   const others=this.clubs.filter(c=>c.id!==this.clubId),from=others[Math.floor(Math.random()*others.length)];
   const mine=this.clubRoster(this.clubId),theirs=this.clubRoster(from.id);
   const myPool=[...mine.batters.slice(2,12),...mine.pitchers.slice(1,6)],theirPool=[...theirs.batters.slice(2,12),...theirs.pitchers.slice(1,6)];
   const give=theirPool[Math.floor(Math.random()*theirPool.length)];if(!give||!myPool.length)return;
   const want=myPool.map(p=>({p,d:Math.abs(this.playerValue(p)-this.playerValue(give))})).sort((a,b)=>a.d-b.d)[0].p;
   this.tradeOffer={fromClub:from.id,giveId:give.id,giveName:give.name,takeId:want.id,takeName:want.name,expiresRound:this.round+2};
   this.pushNews(`${from.short}からトレード提案が届いた`);
  }
  acceptTrade(){
   const o=this.tradeOffer;if(!o)return false;
   this.rosterMoves=this.rosterMoves||{};this.rosterMoves[o.giveId]=this.clubId;this.rosterMoves[o.takeId]=o.fromClub;
   this.pushNews(`トレード成立: ${o.giveName} ⇄ ${o.takeName}`);this.tradeOffer=null;return true;
  }
  declineTrade(){if(!this.tradeOffer)return;this.pushNews('トレード提案を見送った');this.tradeOffer=null;}
  cpuTrade(){
   if(Math.random()>=.15)return;
   const cs=this.clubs.filter(c=>c.id!==this.clubId);if(cs.length<2)return;
   const a=cs[Math.floor(Math.random()*cs.length)],b=cs[Math.floor(Math.random()*cs.length)];if(!a||!b||a.id===b.id)return;
   const ra=this.clubRoster(a.id),rb=this.clubRoster(b.id);
   const pa=ra.batters[8+Math.floor(Math.random()*5)],pb=rb.batters[8+Math.floor(Math.random()*5)];if(!pa||!pb)return;
   this.rosterMoves=this.rosterMoves||{};this.rosterMoves[pa.id]=b.id;this.rosterMoves[pb.id]=a.id;
   this.pushNews(`${a.short}と${b.short}の間でトレード成立（${pa.name} ⇄ ${pb.name}）`);
  }
  makeRookie(season,idx){
   const rand=random(hash(this.id+'/rookie/'+season+'/'+idx));
   const sur=['佐藤','鈴木','高橋','田中','渡辺','伊藤','山本','中村','小林','加藤','吉田','山田','佐々木','山口','松本','井上','木村','林','斎藤','清水','陳','王','張','李','劉','黄','呉','蔡','楊','徐'];
   const giv=['翔太','蓮','陽翔','悠真','健太','大輝','拓海','颯太','悠斗','陸','冠宇','子豪','柏融','坤宇','浩宇','承翰','宇翔','家輝','俊逸','哲源'];
   const name=sur[Math.floor(rand()*sur.length)]+giv[Math.floor(rand()*giv.length)],tier=rand();
   const base=tier<.12?74:tier<.45?64:55,v=()=>Math.round(base+(rand()*16-6)),id='draft-'+season+'-'+idx;
   if(idx%3===2){const vel=138+Math.round(rand()*14);return {id,name,no:90+idx,pos:'P',hand:rand()<.25?'L':'R',velocity:vel,control:v(),stamina:v(),movement:v(),pitches:['fast','slider','change'],pitchDetails:{fast:{speed:vel}},stats:{games:0,pa:0}};}
   const poss=['C','1B','2B','3B','SS','LF','CF','RF'];
   return {id,name,no:90+idx,pos:poss[Math.floor(rand()*poss.length)],hand:rand()<.3?'L':'R',contact:v(),power:v(),run:v(),field:v(),arm:v(),trait:'新人',stats:{games:0,pa:0,ab:0,h:0,hr:0,rbi:0,avg:0,slg:0}};
  }
  beginOffseason(){
   if(!this.completed||this.offseason)return false;
   const order=this.standings().slice().reverse().map(r=>r.id);
   this.offseason={order,pool:Array.from({length:order.length*2+4},(_,i)=>this.makeRookie(this.season||1,i)),picks:[],pickIndex:0,rounds:2};
   return true;
  }
  applyDraftPick(clubId,p){
   const d=this.offseason;d.picks.push({clubId,playerId:p.id,name:p.name,pos:p.pos});
   this.customPlayers=this.customPlayers||{};this.customPlayers[p.id]={...p,clubId};
   if(this.ages)this.ages[p.id]=18+Math.floor(Math.random()*4);
   d.pickIndex++;
  }
  draftCpuPick(){
   const d=this.offseason;if(!d||this.draftDone)return false;
   const clubId=d.order[d.pickIndex%d.order.length];if(clubId===this.clubId)return false;
   const taken=new Set(d.picks.map(k=>k.playerId)),pool=d.pool.filter(p=>!taken.has(p.id));
   if(!pool.length)return false;
   this.applyDraftPick(clubId,pool.sort((a,b)=>this.playerValue(b)-this.playerValue(a))[0]);return true;
  }
  runCpuPicks(){let n=0;while(this.draftCpuPick())n++;return n;}
  draftUserPick(playerId){
   const d=this.offseason;if(!d||this.draftDone)return false;
   if(d.order[d.pickIndex%d.order.length]!==this.clubId)return false;
   const p=d.pool.find(x=>x.id===playerId&&!d.picks.some(k=>k.playerId===playerId));if(!p)return false;
   this.applyDraftPick(this.clubId,p);return true;
  }
  get draftDone(){const d=this.offseason;return !!d&&d.pickIndex>=d.order.length*d.rounds;}
  applyDevelopment(){
   this.ratingMods=this.ratingMods||{};this.departed=this.departed||[];this.ages=this.ages||{};this.customPlayers=this.customPlayers||{};
   const rand=random(hash(this.id+'/dev/'+(this.season||1)));
   for(const club of this.clubs){
    const roster=this.clubRoster(club.id);
    for(const p of [...roster.batters,...roster.pitchers]){
     if(this.ages[p.id]==null)this.ages[p.id]=19+Math.floor(rand()*22);
     const age=++this.ages[p.id],m={...(this.ratingMods[p.id]||{})};
     const swing=()=>Math.round((rand()*2-1)*1.5)+(age<=24?1:age>=30?-1:0);
     if(p.pos==='P'||p.velocity){m.velocity=(m.velocity||0)+swing();m.control=(m.control||0)+swing();m.stamina=(m.stamina||0)+(age>=33?-2:swing());}
     else{m.contact=(m.contact||0)+swing();m.power=(m.power||0)+swing();m.run=(m.run||0)+(age>=31?-2:swing());m.field=(m.field||0)+swing();}
     this.ratingMods[p.id]=m;
     if(age>=37&&rand()<.35&&!this.departed.includes(p.id))this.departed.push(p.id);
    }
   }
   for(const club of this.clubs){
    const roster=this.clubRoster(club.id);
    if(roster.batters.length<12){const f=this.makeRookie((this.season||1)+1,club.id+'-f1');this.customPlayers[f.id]={...f,clubId:club.id};this.ages[f.id]=20;}
    if(roster.pitchers.length<8){const f=this.makeRookie((this.season||1)+1,club.id+'-f2');this.customPlayers[f.id]={...f,clubId:club.id};this.ages[f.id]=20;}
   }
  }
  startNextSeason(){
   if(!this.offseason||!this.draftDone)return false;
   if(!this.faDone){this.ensureFaMarket();this.runFaCpu();this.faDone=true;}
   this.applyDevelopment();
   (this.titles||(this.titles=[])).push({season:this.season||1,champion:this.postseason?.champion||this.playoffSeeds()[0]?.clubId||null});
   (this.seasonArchive||(this.seasonArchive=[])).push({season:this.season||1,stats:Object.fromEntries(Object.entries(this.playerStats||{}).map(([k,r])=>[k,{name:r.name,clubId:r.clubId,pos:r.pos,pa:r.pa||0,ab:r.ab||0,h:r.h||0,hr:r.hr||0,rbi:r.rbi||0,bb:r.bb||0,doubles:r.doubles||0,triples:r.triples||0,outs:r.outs||0,k:r.k||0,runs:r.runs||0}]))});
   if(this.seasonArchive.length>10)this.seasonArchive.splice(0,this.seasonArchive.length-10);
   this.season=(this.season||1)+1;
   this.schedule=roundRobin(this.clubs.map(c=>c.id),this.gamesPerOpponent,this.clubId);
   if(this.isNPB){this.otherSchedule=roundRobin(clubsFor(this.otherLeague).map(c=>c.id),this.gamesPerOpponent,null,'other-r');this.otherResults={};}
   this.results={};this.round=0;this.playerStats={};this.history=[];this.injuries={};this.rotation={};this.postseason=null;this.currentGame=null;this.settledRound=-1;this.tradeOffer=null;this.offseason=null;this.news=[];this.allstarPlayed=false;this.celebrated=false;this.preseason=this.buildPreseason();this.pitcher=this.starterIndexFor(this.clubId);
   if(this.isNPB)this.advanceByes();
   return true;
  }
  // Pre-game scouting data for one club: the rotation starter, the last
  // five results (chronological), this season's category leaders from
  // playerStats, and the current standing line.
  // Fold a finished game's pitch usage into the persistent mastery map.
  addMasteryFromGame(game){
   if(!game||!game.pitchUsage)return 0;
   this.mastery=this.mastery||{};
   return NightGame.applyMastery(this.mastery,game.pitchUsage);
  }
  // ---- New-pitch learning (v164, checker item "new-pitch-learning"):
  // unlike mastery (v121, existing pitches get better), this ADDS a pitch
  // the pitcher does not throw yet. User-club pitchers only. Any of the
  // game's pitch types may be targeted (no aptitude gating), but a
  // pitcher holds at most LEARN_MAX_PITCHES pitches in total, may train
  // only once per round, and each attempt succeeds probabilistically:
  // chance scales with movement (and farm assignment helps, tying the
  // system into the v124 farm layer); the 4th attempt on the same target
  // always succeeds, so progress is never a dead end. The default roll is
  // seeded from the league id + player + pitch + attempt count, so a
  // save's outcomes are reproducible; tests may inject a roll instead.
  // Learned pitches persist in learnedPitches ({playerId: [pitchId]})
  // and clubRoster folds them into the pitcher's repertoire, so they
  // appear in the in-game pitch deck and can actually be thrown.
  static LEARN_MAX_PITCHES=5;
  static LEARN_PITY_ATTEMPTS=3;
  learnablePitches(playerId){
   const roster=this.clubRoster(this.clubId);if(!roster)return [];
   const p=roster.pitchers.find(x=>x.id===playerId);if(!p)return [];
   const owned=p.pitches||[];
   if(owned.length>=NightPennant.LEARN_MAX_PITCHES)return [];
   return NightGame.TYPES.filter(t=>!owned.includes(t.id)).map(t=>t.id);
  }
  learnChance(playerId){
   const roster=this.clubRoster(this.clubId);if(!roster)return 0;
   const p=roster.pitchers.find(x=>x.id===playerId);if(!p)return 0;
   const farm=(this.farmMoves||{})[playerId]===this.clubId?.1:0;
   return Math.max(.2,Math.min(.6,.3+(p.movement-55)*.004+farm));
  }
  trainNewPitch(playerId,pitchId,roll){
   this.learnedPitches=this.learnedPitches||{};this.pitchLearning=this.pitchLearning||{};
   if(!NightGame.TYPES.some(t=>t.id===pitchId))return false;
   if(!this.learnablePitches(playerId).includes(pitchId))return false;
   const state=this.pitchLearning[playerId];
   if(state&&state.round===this.round)return false;
   const attempts=state&&state.pitch===pitchId?state.attempts||0:0;
   const chance=attempts>=NightPennant.LEARN_PITY_ATTEMPTS?1:this.learnChance(playerId);
   const r=roll===undefined?random(hash(this.id+'/learn/'+playerId+'/'+pitchId+'/'+attempts))():roll;
   if(!(r>=0&&r<1))return false;
   const roster=this.clubRoster(this.clubId),p=roster.pitchers.find(x=>x.id===playerId);
   if(r<chance){
    (this.learnedPitches[playerId]??=[]).push(pitchId);
    this.pitchLearning[playerId]={pitch:pitchId,attempts:0,round:this.round,learned:true};
    this.pushNews(`${p.name}が新球種「${NightGame.TYPES.find(t=>t.id===pitchId).name}」を習得した`);
    return {learned:true,pitch:pitchId,chance,attempts:attempts+1};
   }
   this.pitchLearning[playerId]={pitch:pitchId,attempts:attempts+1,round:this.round};
   return {learned:false,pitch:pitchId,chance,attempts:attempts+1};
  }
  scoutingReport(clubId){
   const known=[...NightTeams.all,...(NightTeams.npb||[]),...(NightTeams.kbo||[])].some(c=>c.id===clubId);
   if(!known)return null;
   const club=this.clubRoster(clubId);if(!club)return null;
   const starter=club.pitchers[this.starterIndexFor(clubId)]||club.pitchers[0]||null;
   const form=[];
   for(const r of Object.values(this.results||{}).filter(r=>[r.home,r.away].includes(clubId)).slice(-5)){
    const home=r.home===clubId,forRuns=home?r.homeScore:r.awayScore,against=home?r.awayScore:r.homeScore;
    form.push({opponent:home?r.away:r.home,win:forRuns>against,for:forRuns,against});
   }
   const rows=Object.values(this.playerStats||{}).filter(r=>r.clubId===clubId);
   const top=(list,fn)=>list.length?list.reduce((a,b)=>fn(b)>fn(a)?b:a):null;
   const leaders={
    hr:top(rows.filter(r=>(r.hr||0)>0),r=>r.hr),
    avg:top(rows.filter(r=>(r.ab||0)>=3),r=>r.h/Math.max(1,r.ab)),
    era:top(rows.filter(r=>(r.outs||0)>=9),r=>-(r.runs*27/Math.max(1,r.outs))),
   };
   const standing=this.standings().find(r=>r.id===clubId)||null;
   return {clubId,starter,form,leaders,standing};
  }
  // Per-season lines for one player: archived finished seasons (oldest
  // first) plus the current season's live playerStats, flagged current.
  playerSeasonHistory(playerId){
   const find=stats=>{if(!stats)return null;for(const [k,r] of Object.entries(stats))if(k.split('/').slice(1).join('/')===playerId)return r;return null;};
   const out=[];
   for(const a of this.seasonArchive||[]){const r=find(a.stats);if(r)out.push({season:a.season,current:false,...r});}
   const cur=find(this.playerStats);
   if(cur)out.push({season:this.season||1,current:true,...cur});
   return out;
  }
  // ---- Farm (二軍): assignment layer over clubRoster. Farm players sit out
  // first-team games and sims, gain small periodic rating growth, and injured
  // players on rehab assignment come back sooner.
  farmIds(clubId){return Object.entries(this.farmMoves||{}).filter(([,c])=>c===clubId).map(([id])=>id);}
  farmRoster(clubId){const ids=new Set(this.farmIds(clubId));const roster=this.clubRoster(clubId);return [...roster.batters,...roster.pitchers].filter(p=>ids.has(p.id));}
  setFarm(playerId,on){
   const roster=this.clubRoster(this.clubId);
   if(![...roster.batters,...roster.pitchers].some(p=>p.id===playerId))return false;
   this.farmMoves=this.farmMoves||{};
   if(on)this.farmMoves[playerId]=this.clubId;else delete this.farmMoves[playerId];
   return true;
  }
  farmDevelop(){
   this.farmMoves=this.farmMoves||{};this.farmProgress=this.farmProgress||{};this.ratingMods=this.ratingMods||{};
   for(const club of this.clubs){
    if(club.id===this.clubId)continue;
    const roster=this.clubRoster(club.id),age=p=>this.ages[p.id]??25,farm=this.farmRoster(club.id);
    const fb=farm.filter(p=>p.pos!=='P'&&!p.velocity).length,fp=farm.length-fb;
    const fill=(list,have,want)=>{if(have>=want)return;[...list].filter(p=>!this.farmMoves[p.id]).sort((a,b)=>age(a)-age(b)).slice(0,want-have).forEach(p=>{this.farmMoves[p.id]=club.id;});};
    fill(roster.batters.slice(9),fb,3);fill(roster.pitchers.slice(4),fp,2);
   }
   for(const [id,clubId] of Object.entries(this.farmMoves)){
    const inj=this.injuries?.[id];
    if(inj&&inj.returnRound>this.round+1)inj.returnRound--;
    const prog=this.farmProgress[id]||(this.farmProgress[id]={rounds:0,bonus:0});
    prog.rounds++;
    if(prog.rounds%4===0&&prog.bonus<6)this._farmBonus(id,prog,clubId);
   }
  }
  _farmBonus(id,prog,clubId){
   const roster=this.clubRoster(clubId);if(!roster)return;
   const p=[...roster.batters,...roster.pitchers].find(x=>x.id===id);if(!p)return;
   const m={...(this.ratingMods[id]||{})};
   if(p.pos==='P'||p.velocity){const k=prog.bonus%2?'velocity':'control';m[k]=(m[k]||0)+1;}
   else{const k=prog.bonus%2?'power':'contact';m[k]=(m[k]||0)+1;}
   this.ratingMods[id]=m;prog.bonus++;
  }
  // ---- Playable farm games: one per round, against the farm side of the
  // club the first team faces that round (or the first other club on a
  // bye). Lineups lead with the assigned farm players and fill out with
  // the youngest bench players so a side always fields nine.
  farmGameOpponent(){
   const f=this.activeFixture;
   if(f&&(f.home===this.clubId||f.away===this.clubId))return f.home===this.clubId?f.away:f.home;
   return (this.clubs.find(c=>c.id!==this.clubId)||{}).id||null;
  }
  canPlayFarmGame(){return !this.completed&&!this.currentGame&&this.farmGameRound!==this.round&&!!this.farmGameOpponent();}
  farmClub(clubId){
   const base=this.clubRoster(clubId);if(!base)return null;
   const farm=new Set(this.farmIds(clubId)),young=(a,b)=>(this.ages[a.id]??25)-(this.ages[b.id]??25);
   const batters=[...base.batters.filter(p=>farm.has(p.id)),...base.batters.filter(p=>!farm.has(p.id)).sort(young)].slice(0,10);
   const pitchers=[...base.pitchers.filter(p=>farm.has(p.id)),...base.pitchers.filter(p=>!farm.has(p.id)).sort(young)].slice(0,5);
   return {...base,name:base.name+' 二軍',batters,pitchers,startingOrder:batters.slice(0,9).map(p=>p.id),startingFielding:{}};
  }
  // A played farm game credits each appearing farm player with two rounds
  // of development (stepped one round at a time so the every-4-rounds
  // bonus cadence matches farmDevelop exactly). One credit per round.
  farmGameCredit(game){
   if(!game||this.farmGameRound===this.round)return [];
   this.farmGameRound=this.round;
   const mine=new Set(this.farmIds(this.clubId));
   const appeared=new Set([...Object.keys(game.box||{}),...Object.keys(game.pitchingStats||{})]);
   const credited=[];
   this.farmProgress=this.farmProgress||{};this.ratingMods=this.ratingMods||{};
   for(const id of mine){
    if(!appeared.has(id))continue;
    const prog=this.farmProgress[id]||(this.farmProgress[id]={rounds:0,bonus:0});
    for(let s=0;s<2;s++){prog.rounds++;if(prog.rounds%4===0&&prog.bonus<6)this._farmBonus(id,prog,this.clubId);}
    credited.push(id);
   }
   return credited;
  }
  // ---- Free-agent market: runs after the draft in the offseason. Signing
  // uses points (100 per club per offseason), not money; cost scales with
  // playerValue. Released CPU bench players join generated veterans in the
  // pool, and CPU clubs sign from the same pool.
  makeVeteran(season,idx){
   const rand=random(hash(this.id+'/fa/'+season+'/'+idx));
   const sur=['佐藤','鈴木','高橋','田中','渡辺','伊藤','山本','中村','小林','加藤','吉田','山田','佐々木','山口','松本','井上','木村','林','斎藤','清水','陳','王','張','李','劉','黄','呉','蔡','楊','徐'];
   const giv=['翔太','蓮','陽翔','悠真','健太','大輝','拓海','颯太','悠斗','陸','冠宇','子豪','柏融','坤宇','浩宇','承翰','宇翔','家輝','俊逸','哲源'];
   const name=sur[Math.floor(rand()*sur.length)]+giv[Math.floor(rand()*giv.length)],tier=rand();
   const base=tier<.15?76:tier<.5?69:62,v=()=>Math.round(base+(rand()*14-5)),id='fa-'+season+'-'+idx;
   if(idx%3===2){const vel=140+Math.round(rand()*13);return {id,name,no:70+idx,pos:'P',hand:rand()<.25?'L':'R',velocity:vel,control:v(),stamina:v(),movement:v(),pitches:['fast','slider','change'],pitchDetails:{fast:{speed:vel}},stats:{games:0,pa:0}};}
   const poss=['C','1B','2B','3B','SS','LF','CF','RF'];
   return {id,name,no:70+idx,pos:poss[idx%8],hand:rand()<.3?'L':'R',contact:v(),power:v(),run:v(),field:v(),arm:v(),trait:'FA',stats:{games:0,pa:0,ab:0,h:0,hr:0,rbi:0,avg:0,slg:0}};
  }
  faCost(p){return Math.max(12,Math.min(60,Math.round(this.playerValue(p)/6)));}
  ensureFaMarket(){
   const d=this.offseason;if(!d||!this.draftDone||this.faDone)return false;
   if(d.fa)return true;
   const pool=[],points={},season=this.season||1;
   for(const c of this.clubs)points[c.id]=100;
   for(let i=0;i<this.clubs.length+3;i++){const p=this.makeVeteran(season,i);pool.push(p);this.ages[p.id]=26+Math.floor(random(hash(this.id+'/faage/'+season+'/'+i))()*9);}
   for(const c of this.clubs){
    if(c.id===this.clubId)continue;
    const roster=this.clubRoster(c.id),bench=[...roster.batters.slice(10),...roster.pitchers.slice(5)];
    const rand=random(hash(this.id+'/farel/'+season+'/'+c.id)),n=bench.length?(rand()<.7?1:2):0;
    for(let k=0;k<n&&bench.length;k++){
     const p=bench.splice(Math.floor(rand()*bench.length),1)[0];
     if(!p||(this.departed||[]).includes(p.id)||pool.some(x=>x.id===p.id))continue;
     if(this.customPlayers?.[p.id])this.customPlayers[p.id]={...this.customPlayers[p.id],clubId:'fa'};
     else{this.rosterMoves=this.rosterMoves||{};this.rosterMoves[p.id]='fa';}
     pool.push(p);
    }
   }
   d.fa={pool,points,signed:[]};
   return true;
  }
  get faActive(){const d=this.offseason;return !!d&&this.draftDone&&!this.faDone&&!!d.fa;}
  faSign(playerId,clubId=this.clubId){
   if(!this.faActive)return false;
   const fa=this.offseason.fa,i=fa.pool.findIndex(p=>p.id===playerId);if(i<0)return false;
   const p=fa.pool[i],cost=this.faCost(p);if((fa.points[clubId]??0)<cost)return false;
   fa.points[clubId]-=cost;fa.pool.splice(i,1);fa.signed.push({clubId,playerId:p.id,name:p.name,pos:p.pos,cost});
   if(p.id.startsWith('fa-')){this.customPlayers=this.customPlayers||{};this.customPlayers[p.id]={...p,clubId};}
   else if(this.customPlayers?.[p.id])this.customPlayers[p.id]={...this.customPlayers[p.id],clubId};
   else{this.rosterMoves=this.rosterMoves||{};this.rosterMoves[p.id]=clubId;}
   if(clubId===this.clubId)this.pushNews(`FAで${p.name}を獲得（${cost}pt）`);
   return true;
  }
  faCpuSign(){
   if(!this.faActive)return false;
   const fa=this.offseason.fa;if(!fa.pool.length)return false;
   const buyers=this.clubs.filter(c=>c.id!==this.clubId&&(fa.points[c.id]??0)>=12);
   if(!buyers.length)return false;
   const club=buyers[Math.floor(Math.random()*buyers.length)];
   const p=[...fa.pool].sort((a,b)=>this.playerValue(b)-this.playerValue(a)).find(x=>this.faCost(x)<=(fa.points[club.id]??0));
   if(!p)return false;
   return this.faSign(p.id,club.id);
  }
  runFaCpu(){let n=0;while(this.faCpuSign())n++;return n;}
  faFinish(){if(!this.faActive)return false;this.runFaCpu();this.faDone=true;return true;}
  // ---- All-Star exhibition at the schedule midpoint.
  get allstarDue(){return !this.allstarPlayed&&!this.postseason&&this.round>=Math.floor(this.schedule.length/2);}
  allstarClubs(){
   const awards=this.seasonAwards();
   const statsOf=(clubId,pid)=>this.playerStats?.[clubId+'/'+pid];
   const batters=[],pitchers=[];
   for(const club of this.clubs){
    const roster=this.clubRoster(club.id);
    for(const p of roster.batters){const s=statsOf(club.id,p.id);batters.push({p,score:Math.max(s?awards.batScore(s):0,this.playerValue(p)*.4)});}
    for(const p of roster.pitchers){const s=statsOf(club.id,p.id);pitchers.push({p,score:Math.max(s?awards.pitScore(s):0,this.playerValue(p)*.4)});}
   }
   const A={batters:[],pitchers:[]},B={batters:[],pitchers:[]};
   let flip=false;
   for(const pos of ['C','1B','2B','3B','SS','LF','CF','RF','DH']){
    batters.filter(x=>x.p.pos===pos).sort((a,b)=>b.score-a.score).slice(0,2)
     .forEach((x,i)=>{(i===0?(flip?A:B):(flip?B:A)).batters.push(x.p);});
    flip=!flip;
   }
   const used=new Set([...A.batters,...B.batters].map(p=>p.id));
   for(const x of [...batters].sort((a,b)=>b.score-a.score)){
    if(A.batters.length>=13&&B.batters.length>=13)break;
    if(used.has(x.p.id))continue;
    (A.batters.length<=B.batters.length?A:B).batters.push(x.p);used.add(x.p.id);
   }
   [...pitchers].sort((a,b)=>b.score-a.score).slice(0,12).forEach((x,i)=>(i%2?A:B).pitchers.push(x.p));
   const mk=(side,s)=>{
    const club={id:'allstar-'+side,name:side==='a'?'オールスター A':'オールスター B',short:'AS-'+side.toUpperCase(),mark:'★',color:side==='a'?'#c40020':'#004b8d',accent:'#ffffff',logo:'',park:this.club.park,batters:s.batters,pitchers:s.pitchers};
    club.startingOrder=s.batters.slice(0,9).map(p=>p.id);
    club.startingFielding=Object.fromEntries(s.batters.slice(0,9).map(p=>[p.pos,p.id]));
    return club;
   };
   return {away:mk('a',A),home:mk('b',B)};
  }
  simAllstar(){
   const {home,away}=this.allstarClubs();
   const strength=c=>c.batters.slice(0,9).reduce((s,p)=>s+this.playerValue(p),0)+c.pitchers.slice(0,3).reduce((s,p)=>s+this.playerValue(p),0);
   const rand=random(hash(this.id+'/allstar/'+(this.season||1)));
   let hs=Math.max(0,Math.round(strength(home)/Math.max(1,strength(away))*4+rand()*5-1)),as=Math.max(0,Math.round(4+rand()*5-1));
   if(hs===as)hs++;
   return {homeScore:hs,awayScore:as};
  }
  completeAllstar(){if(this.allstarPlayed)return false;this.allstarPlayed=true;this.pushNews('オールスターゲームが開催された');return true;}
  injuredIds(clubId){
   if(!this.injuries)return [];
   return Object.entries(this.injuries).filter(([,i])=>i.clubId===clubId&&i.returnRound>this.round&&this.round>i.fromRound).map(([id])=>id);
  }
  foldSimStats(stats){
   if(!stats)return;
   const mine=this.playerStats||(this.playerStats={});
   for(const [key,s] of Object.entries(stats)){
    const r=mine[key]||(mine[key]={name:s.name,clubId:s.clubId,pos:s.pos||'DH',pa:0,ab:0,h:0,hr:0,rbi:0,outs:0,k:0,runs:0,pitches:0,bb:0,doubles:0,triples:0});
    if(s.pos&&!r.pos)r.pos=s.pos;
    for(const f of ['pa','ab','h','hr','rbi','bb','doubles','triples','outs','k','runs','pitches'])r[f]=(r[f]||0)+(s[f]||0);
   }
  }
  settleRound(){
   if(!this.managed||this.settledRound===this.round)return;
   this.settledRound=this.round;
   const entry={round:this.round,ranks:{},user:{avg:null,era:null}};
   for(const r of this.standings())entry.ranks[r.id]=r.rank;
   const mine=Object.values(this.playerStats||{}).filter(r=>r.clubId===this.clubId);
   const ab=mine.reduce((s,r)=>s+(r.ab||0),0),h=mine.reduce((s,r)=>s+(r.h||0),0),outs=mine.reduce((s,r)=>s+(r.outs||0),0),runs=mine.reduce((s,r)=>s+(r.runs||0),0);
   entry.user={avg:ab?h/ab:null,era:outs?runs*27/outs:null};
   (this.history||(this.history=[])).push(entry);
   this.rollInjuries();this.farmDevelop();
   if(this.tradeOffer&&this.round>this.tradeOffer.expiresRound){this.pushNews('トレード提案は期限切れになった');this.tradeOffer=null;}
   this.maybeTradeOffer();this.cpuTrade();
  }
  rollInjuries(){
   const rate=NightPennant.injuryRate||'normal';if(rate==='off')return;
   this.injuries=this.injuries||{};
   for(const [id,inj] of Object.entries(this.injuries))if(inj.returnRound<=this.round)delete this.injuries[id];
   const chance=rate==='low'?.012:.025;
   for(const club of this.clubs){
    const out=Object.values(this.injuries).filter(i=>i.clubId===club.id).length;
    if(out>=2||Math.random()>=chance)continue;
    const roster=this.clubRoster(club.id),pool=[...roster.batters.slice(0,12),...roster.pitchers.slice(0,6)].filter(p=>!this.injuries[p.id]);
    if(!pool.length)continue;
    const p=pool[Math.floor(Math.random()*pool.length)],span=2+Math.floor(Math.random()*4);
    this.injuries[p.id]={clubId:club.id,name:p.name,fromRound:this.round,returnRound:this.round+span};
   }
  }
  seasonAwards(){
   const rows=Object.entries(this.playerStats||{}).map(([key,r])=>({...r,pid:key.split('/').slice(1).join('/')}));
   const findP=r=>{const club=this.clubRoster(r.clubId);return [...(club?.batters||[]),...(club?.pitchers||[])].find(p=>p.id===r.pid);};
   const posOf=r=>r.pos||findP(r)?.pos||'DH';
   const avg=r=>r.ab?r.h/r.ab:0,slg=r=>r.ab?(r.h+(r.doubles||0)+2*(r.triples||0)+3*r.hr)/r.ab:0;
   const batScore=r=>avg(r)*300+slg(r)*200+r.hr*6+r.rbi*1.5+(r.bb||0)*.5;
   const era=r=>r.outs?r.runs*27/r.outs:99,pitScore=r=>(27-era(r))*4+(r.k||0)*1.2+r.outs*.4;
   const bat=rows.filter(r=>r.pa>=5),pit=rows.filter(r=>r.outs>=9);
   const mvp=bat.length?[...bat].sort((a,b)=>batScore(b)-batScore(a))[0]:null;
   const bestPitcher=pit.length?[...pit].sort((a,b)=>pitScore(b)-pitScore(a))[0]:null;
   const bestNine=[];
   for(const pos of ['C','1B','2B','3B','SS','LF','CF','RF','DH']){
    const cand=rows.filter(r=>r.pa>=1&&posOf(r)===pos).sort((a,b)=>batScore(b)-batScore(a))[0];
    if(cand)bestNine.push({pos,player:cand});
   }
   if(bestPitcher)bestNine.unshift({pos:'P',player:bestPitcher});
   const eligible=r=>{const p=findP(r);return (p?.stats?.pa??999)<150||(p?.stats?.games??99)<=25;};
   const rookieBat=bat.filter(eligible).sort((a,b)=>batScore(b)-batScore(a))[0]||null;
   const rookiePit=pit.filter(eligible).sort((a,b)=>pitScore(b)-pitScore(a))[0]||null;
   const rookie=rookieBat&&rookiePit?(batScore(rookieBat)>=pitScore(rookiePit)?rookieBat:rookiePit):rookieBat||rookiePit;
   return {mvp,bestPitcher,bestNine,rookie,batScore,pitScore,avg,slg,era};
  }
  advanceRotation(f){if(!f)return;for(const id of [f.home,f.away])if(id)this.rotation[id]=(this.rotation[id]||0)+1;}
  simulateRound(fixtures,results){
   for(const f of fixtures)if(!results[f.id]){const s=this.simulate(f);this.foldSimStats(s.stats);results[f.id]={...f,homeScore:s.homeScore,awayScore:s.awayScore,innings:s.innings,weather:s.weather,cold:s.cold};this.advanceRotation(f);}
  }
  advanceByes(){
   while(!this.fixture){
    this.simulateRound(this.schedule[this.round],this.results);
    this.simulateRound(this.otherSchedule[this.round],this.otherResults);
    this.settleRound();
    this.round++;
   }
  }
  completeRound(score){
   const f=this.fixture;if(this.roundDone)return false;
   if(!Number.isInteger(score.homeScore)||!Number.isInteger(score.awayScore)||score.homeScore<0||score.awayScore<0||score.homeScore===score.awayScore)throw Error('A pennant game needs a winner');
   this.results[f.id]={...f,homeScore:score.homeScore,awayScore:score.awayScore,innings:score.inning||1,home: f.home,away:f.away};this.advanceRotation(f);this.pitcher=this.starterIndexFor(this.clubId);
   this.simulateRound(this.schedule[this.round],this.results);
   if(this.isNPB)this.simulateRound(this.otherSchedule[this.round],this.otherResults);
   this.currentGame=null;this.settleRound();return true;
  }
  // Regular season records remain separate from postseason games.
  get regularCompleted(){return this.completed;}
  get activeSeries(){
   if(!this.postseason)return null;
   return this.isNPB?NightNPBPostseason.activeSeries(this):this.postseason.stage==='qualifier'?this.postseason.qualifier:this.postseason.final;
  }
  get activeFixture(){
   if(!this.postseason)return this.fixture;
   const series=this.activeSeries;if(!series)return null;
   if(this.postseason.awaitingNext||series.winner)return series.games.at(-1)||null;
   if(this.isNPB)return NightNPBPostseason.fixture(series);
   const index=series.games.length,upperHome=series.id==='qualifier'?[true,false,true][index]:[true,true,false,false,true,false,true][index];
   return {id:'po-'+series.id+'-'+(index+1),home:upperHome?series.higher:series.lower,away:upperHome?series.lower:series.higher,playoff:true,series:series.id,game:index+1};
  }
  get activeResult(){if(!this.postseason)return this.results[this.fixture.id]||null;return this.activeSeries?.games.find(g=>g.id===this.activeFixture?.id)||null;}
  get activeRoundDone(){return this.postseason?!!this.activeResult:this.roundDone;}
  get postseasonCompleted(){return this.postseason?.stage==='complete';}
  get userInActiveFixture(){const f=this.activeFixture;return !!f&&[f.home,f.away].includes(this.clubId);}
  playoffSeeds(leagueId=this.leagueId){
   const rows=this.standings(leagueId);
   const results=leagueId===this.leagueId?this.results:this.otherResults;
   const direct=(a,b)=>Object.values(results).filter(g=>[g.home,g.away].includes(a)&&[g.home,g.away].includes(b)).reduce((sum,g)=>sum+((g.homeScore>g.awayScore?g.home:g.away)===a?1:-1),0);
   // Reuse league ranking, resolve a completely tied cutoff by head-to-head, runs scored, then club order.
   const order=clubsFor(leagueId).map(c=>c.id);
   if(!this.isNPB)rows.sort((a,b)=>b.wins-a.wins||a.losses-b.losses||b.diff-a.diff||-direct(a.id,b.id)||b.for-a.for||order.indexOf(a.id)-order.indexOf(b.id));
   return rows.slice(0,3).map((r,i)=>({clubId:r.id,seed:i+1}));
  }
  startPlayoffs(){
   if(this.playoffs===false)return false;
   if(!this.regularCompleted||this.postseason)return false;
   if(this.preseason)this.preseason.done=true;
   if(this.isNPB)return NightNPBPostseason.start(this);
   const seeds=this.playoffSeeds(),make=(id,higher,lower,target)=>({id,higher,lower,target,wins:{[higher]:0,[lower]:0},games:[],winner:null});
   this.postseason={schema:1,seeds,stage:'qualifier',qualifier:make('qualifier',seeds[1].clubId,seeds[2].clubId,2),final:null,awaitingNext:false,champion:null};this.currentGame=null;return true;
  }
  completeActiveGame(score){return this.postseason?this.completePlayoffGame(score):this.completeRound(score);}
  completePlayoffGame(score){
   if(!this.postseason||this.postseasonCompleted||this.postseason.awaitingNext)return false;
   if(this.isNPB)return NightNPBPostseason.complete(this,score);
   const f=this.activeFixture,series=this.activeSeries;
   if(!f||![score.homeScore,score.awayScore].every(n=>Number.isInteger(n)&&n>=0)||score.homeScore===score.awayScore)throw Error('A playoff game needs a winner');
   if(score.leagueFixtureId&&score.leagueFixtureId!==f.id)return false;
   if(score.teams&&(score.teams.home.id!==f.home||score.teams.away.id!==f.away))return false;
   const result={...f,homeScore:score.homeScore,awayScore:score.awayScore,innings:score.inning||score.innings||1},winner=score.homeScore>score.awayScore?f.home:f.away;this.advanceRotation(f);this.pitcher=this.starterIndexFor(this.clubId);
   series.games.push(result);series.wins[winner]++;if(series.wins[winner]>=series.target)series.winner=winner;
   this.postseason.awaitingNext=true;this.currentGame=null;
   if(series.id==='final'&&series.winner){this.postseason.stage='complete';this.postseason.champion=series.winner;}
   return true;
  }
  nextPlayoff(){
   const p=this.postseason;if(!p||!p.awaitingNext||this.postseasonCompleted)return false;
   if(this.isNPB)return NightNPBPostseason.next(this);
   if(p.stage==='qualifier'&&p.qualifier.winner){const higher=p.seeds[0].clubId,lower=p.qualifier.winner;p.final={id:'final',higher,lower,target:4,wins:{[higher]:0,[lower]:0},games:[],winner:null};p.stage='final';}
   p.awaitingNext=false;this.currentGame=null;return true;
  }
  simulatePlayoffGame(){
   if(!this.postseason||this.postseasonCompleted||this.activeRoundDone||this.userInActiveFixture)return false;
   return this.completePlayoffGame(this.simulate(this.activeFixture));
  }
  validPostseason(){
   const p=this.postseason;if(p.schema!==1||!this.regularCompleted||!Array.isArray(p.seeds)||p.seeds.length!==3||new Set(p.seeds.map(s=>s.clubId)).size!==3||p.seeds.some((s,i)=>s.seed!==i+1||!this.clubs.some(c=>c.id===s.clubId))||!['qualifier','final','complete'].includes(p.stage)||typeof p.awaitingNext!=='boolean')return false;
   const valid=(s,id,target,higher,lower)=>{
    if(!s||s.id!==id||s.target!==target||s.higher!==higher||s.lower!==lower||higher===lower||!Array.isArray(s.games)||s.games.length>target*2-1)return false;
    const counts={[higher]:0,[lower]:0};let won=null;
    for(const [i,g]of s.games.entries()){
     const upper=id==='qualifier'?[true,false,true][i]:[true,true,false,false,true,false,true][i],home=upper?higher:lower,away=upper?lower:higher;
     if(won||g.id!=='po-'+id+'-'+(i+1)||g.home!==home||g.away!==away||![g.homeScore,g.awayScore].every(n=>Number.isInteger(n)&&n>=0)||g.homeScore===g.awayScore)return false;
     const winner=g.homeScore>g.awayScore?g.home:g.away;if(++counts[winner]===target)won=winner;
    }
    return s.wins?.[higher]===counts[higher]&&s.wins?.[lower]===counts[lower]&&s.winner===won;
   };
   if(!valid(p.qualifier,'qualifier',2,p.seeds[1].clubId,p.seeds[2].clubId))return false;
   if(p.stage==='qualifier')return !p.final&&!p.champion&&(!p.qualifier.winner||p.awaitingNext);
   if(!p.qualifier.winner||!valid(p.final,'final',4,p.seeds[0].clubId,p.qualifier.winner))return false;
   return p.stage==='complete'?p.champion===p.final.winner&&!!p.champion&&p.awaitingNext:!p.champion&&!p.final.winner;
  }
  simulate(f){
   const rand=random(hash(this.id+'/'+f.id)),orders={home:0,away:0},scores={home:0,away:0};let innings=0;
   const regulation=f.innings||1,full=regulation===9,limit=f.maxInnings??Infinity;
   const wrand=random(hash(this.id+'/weather/'+f.id)),weather=wrand()<.15?'rain':wrand()<.4?'cloudy':'clear';
   const cold=weather==='rain'&&regulation>=5&&!f.playoff&&wrand()<.3,effRegulation=cold?5:regulation;
   const stats={};const srand=random(hash(this.id+'/stats/'+f.id));const sRow=(clubId,p)=>stats[clubId+'/'+p.id]||={name:p.name,clubId,pos:p.pos||'P',pa:0,ab:0,h:0,hr:0,rbi:0,bb:0,doubles:0,triples:0,outs:0,k:0,runs:0,pitches:0};
   const half=(side)=>{
    const walkOff=side==='home'&&innings>=regulation;
    const runsToEnd=scores.away+(f.drawClinches&&innings===limit?0:1);
    const allBatters=this.clubRoster(f[side]).batters,outSet=new Set(this.injuredIds(f[side])),avail=allBatters.filter(p=>!outSet.has(p.id)&&!(this.farmMoves||{})[p.id]);let hitters=(avail.length>=9?avail:allBatters).slice(0,9);const defClub=this.clubRoster(f[side==='home'?'away':'home']),pitcher=innings<=3?defClub.pitchers[this.starterIndexFor(defClub.id)]:defClub.pitchers[Math.min(2,Math.floor((innings-1)/3))];
    // No-DH leagues (custom leagues may opt out; every built-in league keeps
    // the DH): the batting club's starting pitcher takes the ninth spot with
    // generic weak batting ratings, since pitcher records carry no batting
    // stats of their own.
    if(this.dh===false&&hitters.length>=9){const mine=this.clubRoster(f[side]),sp=mine.pitchers[this.starterIndexFor(f[side])];if(sp)hitters=[...hitters.slice(0,8),{...sp,contact:sp.contact??32,power:sp.power??28,run:sp.run??40}];}
    const prow=sRow(defClub.id,pitcher),kProb=Math.min(.34,Math.max(.06,.16+(pitcher.velocity-140)*.004+(70-pitcher.control)*.001));
    let outs=full?0:2,bases=Array(3).fill(!full);
    while(outs<3){const b=hitters[orders[side]++%9],v=rand(),walk=.07+(80-pitcher.control)*.0006,hit=.24+(b.contact-75)*.002+(145-pitcher.velocity)*.001,hr=.017+Math.max(0,b.power-65)*.001;
     const brow=sRow(f[side],b),scoreBefore=scores[side],outsBefore=outs;let n=0;
     if(v<walk){if(bases.every(Boolean))scores[side]++;if(bases[0]&&bases[1])bases[2]=true;if(bases[0])bases[1]=true;bases[0]=true;}
     else if(v<walk+hit){n=v<walk+hr?4:rand()<.20?2:rand()<.025?3:1;for(let i=2;i>=0;i--)if(bases[i]){bases[i]=false;if(i+n>=3)scores[side]++;else bases[i+n]=true;}if(n===4)scores[side]++;else bases[n-1]=true;if(walkOff&&n!==4&&scores.home>=runsToEnd)scores.home=runsToEnd;}
     else outs++;
     brow.pa++;brow.rbi+=scores[side]-scoreBefore;prow.runs+=scores[side]-scoreBefore;prow.outs+=outs-outsBefore;
     if(v<walk)brow.bb++;else{brow.ab++;if(n){brow.h++;if(n===2)brow.doubles++;else if(n===3)brow.triples++;else if(n===4)brow.hr++;}}
     for(let o=outsBefore;o<outs;o++)if(srand()<kProb)prow.k++;
     if(walkOff&&scores.home>=runsToEnd)break;
    }
   };
   do{
    innings++;
    half('away');
    if(innings<effRegulation||scores.home<scores.away||
     scores.home===scores.away&&!(f.drawClinches&&innings===limit))half('home');
   }while(innings<effRegulation||scores.home===scores.away&&innings<limit);
   return {homeScore:scores.home,awayScore:scores.away,innings,weather,cold,stats};
  }
  standings(leagueId=this.leagueId){
   const order=clubsFor(leagueId).map(c=>c.id),results=leagueId===this.leagueId?this.results:this.otherResults;
   const rows=order.map(id=>({id,played:0,wins:0,losses:0,for:0,against:0}));
   const byId=Object.fromEntries(rows.map(r=>[r.id,r]));
   Object.values(results).forEach(g=>{const h=byId[g.home],a=byId[g.away];h.played++;a.played++;h.for+=g.homeScore;h.against+=g.awayScore;a.for+=g.awayScore;a.against+=g.homeScore;if(g.homeScore>g.awayScore){h.wins++;a.losses++;}else{a.wins++;h.losses++;}});
   rows.forEach(r=>{r.pct=r.played?r.wins/r.played:0;r.diff=r.for-r.against;});
   const tied=new Map();
   if(this.isNPB)for(const g of Object.values(results)){
    if(byId[g.home].pct!==byId[g.away].pct||byId[g.home].wins!==byId[g.away].wins)continue;
    const winner=g.homeScore>g.awayScore?g.home:g.away;
    tied.set(winner,(tied.get(winner)||0)+1);
   }
   rows.sort((a,b)=>(this.isNPB?b.pct-a.pct:0)||b.wins-a.wins||a.losses-b.losses||
    (this.isNPB?(tied.get(b.id)||0)-(tied.get(a.id)||0):0)||b.diff-a.diff||order.indexOf(a.id)-order.indexOf(b.id));
   rows.forEach((r,i)=>{const prev=rows[i-1];r.rank=!this.isNPB&&prev&&r.wins===prev.wins&&r.losses===prev.losses&&r.diff===prev.diff?prev.rank:i+1;r.behind=((rows[0].wins-r.wins)+(r.losses-rows[0].losses))/2;});return rows;
  }
 }
 // ---- Multiple save slots per league (v136, checker "pennant-save-slots").
 // Three slots per league. Slot 1 is an alias for the legacy key
 // (nightball.pennant for CPBL, nightball.pennant.<leagueId> otherwise), so
 // every pre-v136 save is slot 1 with no migration and no data movement:
 // the bytes stay exactly where they were. Slots 2 and 3 add new keys
 // (<base>.slot2 / <base>.slot3) that did not exist before, so nothing old
 // can be overwritten by them. The last-used slot per league is remembered
 // under <base>.activeSlot. All of these keys start with "nightball.", so
 // the save-data backup (which exports/imports every nightball.* key)
 // covers the extra slots automatically.
 const PENNANT_SLOT_COUNT=3;
 const pennantBaseKey=id=>id==='cpbl'?'nightball.pennant':'nightball.pennant.'+id;
 const normSlot=slot=>{const n=Number(slot);return Number.isInteger(n)&&n>=1&&n<=PENNANT_SLOT_COUNT?n:1;};
 const pennantSlotKey=(id,slot)=>{const n=normSlot(slot);return n===1?pennantBaseKey(id):pennantBaseKey(id)+'.slot'+n;};
 const defaultStorage=()=>{try{return localStorage;}catch{return null;}};
 function slotInfo(storage,id,slot){
  const key=pennantSlotKey(id,slot);let raw=null;
  try{raw=storage?.getItem(key)??null;}catch{}
  if(!raw)return {slot,key,exists:false,valid:false,clubId:null,clubShort:null,season:null,played:null,totalGames:null,savedAt:null,createdAt:null};
  let parsed=null;try{parsed=JSON.parse(raw);}catch{}
  const restored=parsed?NightPennant.restore(parsed):null;
  const ok=!!restored&&restored.leagueId===id;
  return {slot,key,exists:true,valid:ok,
   clubId:ok?restored.clubId:(parsed?.clubId||null),
   clubShort:ok?(NightTeams.get(restored.clubId)?.short||restored.clubId):null,
   season:ok?(restored.season||1):(parsed?.season||null),
   played:ok?restored.played:null,totalGames:ok?restored.totalGames:null,
   savedAt:parsed?.updatedAt||parsed?.createdAt||null,createdAt:parsed?.createdAt||null};
 }
 const NightPennantSlots={
  COUNT:PENNANT_SLOT_COUNT,
  baseKey:pennantBaseKey,
  key:pennantSlotKey,
  activeKey:id=>pennantBaseKey(id)+'.activeSlot',
  getActive(storage,id){storage=storage||defaultStorage();try{return normSlot(storage?.getItem(NightPennantSlots.activeKey(id)));}catch{return 1;}},
  setActive(storage,id,slot){storage=storage||defaultStorage();const n=normSlot(slot);try{storage?.setItem(NightPennantSlots.activeKey(id),String(n));}catch{}return n;},
  restore(storage,id,slot){
   storage=storage||defaultStorage();
   let raw=null;try{raw=storage?.getItem(pennantSlotKey(id,slot))??null;}catch{}
   if(!raw)return null;
   let parsed=null;try{parsed=JSON.parse(raw);}catch{return null;}
   const restored=NightPennant.restore(parsed);
   return restored&&restored.leagueId===id?restored:null;
  },
  // Stamps updatedAt so slot lists can show the last-saved time; older saves
  // without the field fall back to createdAt. Returns false on quota errors
  // so the caller can warn instead of silently losing progress.
  write(storage,id,slot,data){
   storage=storage||defaultStorage();if(!storage||!data)return false;
   try{if(typeof data==='object')data.updatedAt=new Date().toISOString();storage.setItem(pennantSlotKey(id,slot),typeof data==='string'?data:JSON.stringify(data));return true;}catch{return false;}
  },
  remove(storage,id,slot){storage=storage||defaultStorage();try{storage?.removeItem(pennantSlotKey(id,slot));return true;}catch{return false;}},
  info:(storage,id,slot)=>slotInfo(storage||defaultStorage(),id,slot),
  list(storage,id){storage=storage||defaultStorage();return Array.from({length:PENNANT_SLOT_COUNT},(_,i)=>slotInfo(storage,id,i+1));},
  anyExists(storage,id){return NightPennantSlots.list(storage,id).some(s=>s.exists);},
 };
 window.NightPennant=NightPennant;
 window.NightPennantSlots=NightPennantSlots;
})();
