/* v274: best-effort, account-free online community on PeerJS.
 * Separate directory peer; no gameplay input or snapshots pass through it.
 * Active browser coordinates discovery only. Ratings are casual, not verified.
 */
(()=>{
'use strict';
const G=globalThis, KEY='nightball.community.v1', HUB='nightball-bbg-community-v274', TTL=35000, MAX_PEERS=80;
const validId=v=>typeof v==='string'&&/^[a-f0-9]{20}$/.test(v);
const validCode=v=>typeof v==='string'&&/^[A-HJ-KM-NP-Z2-9]{6}$/.test(v);
const cleanName=v=>String(v??'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,24);
const int=(v,min,max)=>Number.isInteger(v)?Math.min(max,Math.max(min,v)):min;
const token=()=>{const bytes=new Uint8Array(10);if(G.crypto?.getRandomValues)G.crypto.getRandomValues(bytes);else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tr=s=>G.NightI18n?.text(s)||s;
const t=s=>esc(tr(s));
function safeProfile(v){
 if(!v||!validId(v.id))return null;
 return {id:v.id,name:cleanName(v.name)||'Player-'+v.id.slice(-5),rating:Number.isInteger(v.rating)?int(v.rating,100,4000):1500,games:int(v.games,0,100000),w:int(v.w,0,100000),l:int(v.l,0,100000),d:int(v.d,0,100000),streak:Number.isInteger(v.streak)?int(v.streak,-100000,100000):0};
}
let memory;
function state(){
 if(memory)return memory;
 try{const raw=JSON.parse(localStorage.getItem(KEY)||'null');if(raw&&validId(raw.id))memory={...raw,...safeProfile(raw),friends:Array.isArray(raw.friends)?raw.friends.filter(f=>validId(f.id)).slice(0,100):[],seen:Array.isArray(raw.seen)?raw.seen.filter(validId).slice(-500):[],pending:Array.isArray(raw.pending)?raw.pending.slice(-20):[]};}catch{}
 if(!memory){const id=token();memory={id,name:'Player-'+id.slice(-5),rating:1500,games:0,w:0,l:0,d:0,streak:0,friends:[],seen:[],pending:[]};persist();}
 return memory;
}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(memory));}catch{}}
function profile(){return safeProfile(state());}
function ratedResult(p,op,result){
 const expected=1/(1+10**((op.rating-p.rating)/400)),actual=result==='win'?1:result==='draw'?.5:0;
 return {...p,rating:Math.max(100,Math.min(4000,p.rating+Math.round(32*(actual-expected)))),games:p.games+1,w:p.w+(result==='win'),l:p.l+(result==='loss'),d:p.d+(result==='draw'),streak:result==='draw'?0:result==='win'?Math.max(0,p.streak)+1:Math.min(0,p.streak)-1};
}
function safeRoom(v,owner){
 if(!v||!validCode(v.code)||!['waiting','full','playing'].includes(v.status)||!['match','derby'].includes(v.mode))return null;
 return {code:v.code,owner:owner.id,host:owner.name,guest:cleanName(v.guest),club:cleanName(v.club),mode:v.mode,status:v.status,innings:[3,5,9].includes(v.innings)?v.innings:5,watch:v.watch===true&&v.mode==='match',rated:v.rated===true&&v.mode==='match'};
}
function newTournament(owner,name,size,id=token()){
 return {id,title:cleanName(name)||'NIGHTBALL CUP',owner:owner.id,size:size===8?8:4,players:[{id:owner.id,name:owner.name}],status:'open',matches:[],champion:null,at:Date.now()};
}
function enroll(c,p){
 if(c.status!=='open'||c.players.length>=c.size||c.players.some(x=>x.id===p.id))return false;
 c.players.push({id:p.id,name:p.name});return true;
}
function drawBracket(c,codegen=()=>G.NightOnline.makeCode()){
 if(c.status!=='open'||c.players.length!==c.size)return false;
 const seeded=c.players.slice();for(let i=seeded.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[seeded[i],seeded[j]]=[seeded[j],seeded[i]];}
 c.matches=[];let round=0;
 for(let n=c.size/2;n>=1;n/=2,round++){
  for(let i=0;i<n;i++){
   let code;do{code=codegen();}while(c.matches.some(m=>m.code===code));
   c.matches.push({id:c.id+'-'+round+'-'+i,round,index:i,code,a:round?null:seeded[i*2].id,b:round?null:seeded[i*2+1].id,winner:null,votes:{},score:null,draws:0,lastGame:null,finished:[]});
  }
 }
 c.status='playing';return true;
}
function reportTournament(c,author,v){
 if(!c||c.status==='open'||!v||!validId(v.game)||![v.aScore,v.bScore].every(x=>Number.isInteger(x)&&x>=0&&x<=999))return false;
 const m=c.matches.find(x=>x.id===v.fixture&&x.code===v.code);
 if(!m||!m.a||!m.b||![m.a,m.b].includes(author))return false;
 if(m.winner||m.lastGame===v.game||m.finished?.includes(v.game))return true; // idempotent retry
 if(c.status!=='playing')return false;
 const vote={game:v.game,aScore:v.aScore,bScore:v.bScore};
 m.votes[author]=vote;
 const other=m.votes[author===m.a?m.b:m.a];
 if(!other||other.game!==vote.game||other.aScore!==vote.aScore||other.bScore!==vote.bScore)return true;
 m.lastGame=vote.game;m.finished=[...(m.finished||[]),vote.game].slice(-20);m.votes={};m.score=[vote.aScore,vote.bScore];
 if(vote.aScore===vote.bScore){m.draws++;return true;}
 m.winner=vote.aScore>vote.bScore?m.a:m.b;
 const next=c.matches.find(x=>x.round===m.round+1&&x.index===Math.floor(m.index/2));
 if(next)next[m.index%2?'b':'a']=m.winner;
 else{c.status='done';c.champion=m.winner;}
 return true;
}
function safeTournament(c){
 if(!c||!validId(c.id)||!validId(c.owner)||![4,8].includes(c.size)||!['open','playing','done'].includes(c.status)||!Array.isArray(c.players)||!Array.isArray(c.matches)||!Number.isFinite(c.at))return null;
 const players=c.players.slice(0,c.size).filter(p=>p&&validId(p.id)).map(p=>({id:p.id,name:cleanName(p.name)}));
 const ids=new Set(players.map(p=>p.id));if(ids.size!==players.length||!ids.has(c.owner))return null;
 const member=id=>ids.has(id)?id:null;
 const matches=c.matches.slice(0,c.size-1).filter(m=>m&&typeof m.id==='string'&&new RegExp('^'+c.id+'-[0-2]-[0-3]$').test(m.id)&&validCode(m.code)&&Number.isInteger(m.round)&&m.round>=0&&m.round<Math.log2(c.size)&&Number.isInteger(m.index)&&m.index>=0&&m.index<c.size/2**(m.round+1)).map(m=>{const a=member(m.a),b=member(m.b),votes={};for(const id of [a,b]){const v=m.votes?.[id];if(id&&v&&validId(v.game)&&[v.aScore,v.bScore].every(x=>Number.isInteger(x)&&x>=0&&x<=999))votes[id]={game:v.game,aScore:v.aScore,bScore:v.bScore};}
  return {id:m.id,round:m.round,index:m.index,code:m.code,a,b,winner:[a,b].includes(m.winner)?m.winner:null,votes,score:Array.isArray(m.score)&&m.score.length===2?m.score.map(x=>int(x,0,999)):null,draws:int(m.draws,0,1000),lastGame:validId(m.lastGame)?m.lastGame:null,finished:Array.isArray(m.finished)?m.finished.filter(validId).slice(-20):[]};
 });
 if(c.status!=='open'&&(players.length!==c.size||matches.length!==c.size-1))return null;
 return {id:c.id,title:cleanName(c.title),owner:c.owner,size:c.size,players,status:c.status,matches,champion:member(c.champion),at:c.at};
}
function assignment(c,id){if(c.status!=='playing')return null;const m=c.matches.find(m=>!m.winner&&m.a&&m.b&&(m.a===id||m.b===id));return m?{tournament:c.id,fixture:m.id,code:m.code,a:m.a,b:m.b}:null;}
function validAssignment(v,code,host,guest){
 return v&&validId(v.tournament)&&typeof v.fixture==='string'&&new RegExp('^'+v.tournament+'-[0-2]-[0-3]$').test(v.fixture)&&v.code===code&&v.a===host&&v.b===guest?{tournament:v.tournament,fixture:v.fixture,code,a:host,b:guest}:null;
}
function beginMatch(code,guest,hostHome,options={}){
 const host=profile(),op=safeProfile(guest);if(!op||op.id===host.id||!validCode(code))return null;
 return {id:token(),code,host,guest:op,hostHome:!!hostHome,rated:options.rated===true,tournament:validAssignment(options.tournament,code,host.id,op.id)};
}
function acceptMatch(v,code){
 if(!v||!validId(v.id)||!validCode(code)||v.code!==code)return null;
 const host=safeProfile(v.host),guest=safeProfile(v.guest);if(!host||!guest||host.id===guest.id||guest.id!==profile().id)return null;
 return {id:v.id,code,host,guest,hostHome:v.hostHome===true,rated:v.rated===true,tournament:validAssignment(v.tournament,code,host.id,guest.id)};
}
function finishMatch(match,hs,as){
 if(!match||!validId(match.id)||!Number.isInteger(hs)||!Number.isInteger(as)||hs<0||as<0||hs>999||as>999)return;
 const st=state(),host=st.id===match.host.id,guest=st.id===match.guest.id;if(!host&&!guest||st.seen.includes(match.id))return;
 st.seen.push(match.id);st.seen=st.seen.slice(-500);
 if(match.rated){
  const myHome=host===match.hostHome,mine=myHome?hs:as,theirs=myHome?as:hs;
  Object.assign(st,ratedResult(st,host?match.guest:match.host,mine===theirs?'draw':mine>theirs?'win':'loss'));
 }
 if(match.tournament){
  const v={...match.tournament,game:match.id,aScore:match.hostHome?hs:as,bScore:match.hostHome?as:hs};
  st.pending.push({...v,at:Date.now()});st.pending=st.pending.slice(-20);
 }
 persist();heartbeat();render();
}
// Discovery leader election. Snapshot replicated to connected clients for best-effort migration.
let peer=null,link=null,leader=false,opening=false,generation=0,started=false,retry=null,timer=null,snapshot={members:[],rooms:[],tournaments:[]},status='idle',room=null;
let members=new Map(),connections=new Map(),tournaments=[],broadcastTimer=null,lastSnapshot=0,retryDelay=1200;
let root=null,handlers=null,tab='rooms',watchSession=null,watchFrame=null,watchStatus='',watchCode='',message='';
function setStatus(s){status=s;render();}
function safeSend(c,v){try{if(c?.open&&!c.bufferSize&&!(c.dataChannel?.bufferedAmount>65536)){c.send(v);return true;}}catch{}return false;}
function cancelNetwork(){
 generation++;clearTimeout(retry);retry=null;clearTimeout(timer);timer=null;clearTimeout(broadcastTimer);broadcastTimer=null;
 const old=peer;peer=null;link=null;leader=false;opening=false;connections.clear();members.clear();
 try{old?.destroy();}catch{}
}
function scheduleRetry(){
 if(!started||retry)return;
 setStatus('retry');retry=setTimeout(()=>{retry=null;connect();},retryDelay+Math.random()*800);
 retryDelay=Math.min(12000,retryDelay*1.5);
}
function fail(gen){if(gen!==generation)return;cancelNetwork();scheduleRetry();}
async function connect(){
 if(!started||opening||peer)return;
 opening=true;const gen=++generation;setStatus('connecting');
 try{
  await G.NightOnline.loadPeer();const options=await G.NightOnline.peerOptions();
  if(gen!==generation||!started)return;
  const attempt=(isLeader)=>{
   if(gen!==generation||!started)return;
   let p;try{p=isLeader?new G.Peer(HUB,options):new G.Peer(options);}catch{fail(gen);return;}
   peer=p;leader=isLeader;let opened=false,timeout=setTimeout(()=>{if(peer===p&&!opened)fail(gen);},10000);
   p.on('error',e=>{
    if(peer!==p||gen!==generation)return;clearTimeout(timeout);
    if(isLeader&&!opened&&e?.type==='unavailable-id'){peer=null;try{p.destroy();}catch{}attempt(false);return;}
    fail(gen);
   });
   p.on('disconnected',()=>{if(peer===p)fail(gen);});
   p.on('close',()=>{if(peer===p)fail(gen);});
   p.on('open',()=>{
    if(peer!==p||gen!==generation)return;clearTimeout(timeout);opened=true;opening=false;
    if(isLeader){
     // A departed leader may be replaced by a browser that saw its last snapshot.
     tournaments=JSON.parse(JSON.stringify(snapshot.tournaments||[])).filter(c=>c.at>Date.now()-8*3600000).slice(0,10);
     ready();return;
    }
    let c;try{c=p.connect(HUB,{reliable:true,metadata:{community:274}});}catch{fail(gen);return;}
    link=c;const wait=setTimeout(()=>{if(link===c&&status!=='ready')fail(gen);},9000);
    c.on('open',()=>{if(link===c){clearTimeout(wait);ready();}});
    c.on('data',m=>{if(link!==c||m?.type!=='snapshot'||!Array.isArray(m.members)||!Array.isArray(m.rooms)||!Array.isArray(m.tournaments))return;lastSnapshot=Date.now();snapshot={members:m.members.slice(0,MAX_PEERS).map(safeProfile).filter(Boolean),rooms:m.rooms.slice(0,MAX_PEERS).map(r=>{const p=safeProfile({id:r.owner,name:r.host});return p?safeRoom(r,p):null;}).filter(Boolean),tournaments:m.tournaments.slice(0,10).map(safeTournament).filter(Boolean)};render();});
    c.on('close',()=>{if(link===c){clearTimeout(wait);fail(gen);}});
    c.on('error',()=>{if(link===c){clearTimeout(wait);fail(gen);}});
   });
   if(isLeader)p.on('connection',c=>{
    if(peer!==p||c.metadata?.community!==274||connections.size>=MAX_PEERS){try{c.close();}catch{}return;}
    connections.set(c,null);let idle=setTimeout(()=>{if(!connections.get(c))try{c.close();}catch{}},10000);
    c.on('data',m=>{if(peer!==p||!connections.has(c))return;receive(c,m);});
    const gone=()=>{clearTimeout(idle);const id=connections.get(c);connections.delete(c);if(id&&members.get(id)?.conn===c)members.delete(id);queueBroadcast();};
    c.on('close',gone);c.on('error',gone);
   });
  };
  attempt(true);
 }catch{fail(gen);}
}
function ready(){retryDelay=1200;lastSnapshot=Date.now();setStatus('ready');heartbeat();clearTimeout(timer);timer=setTimeout(pulse,8500);}
function start(){if(started)return;started=true;connect();}
function pulse(){
 if(!started||status!=='ready')return;
 if(!leader&&Date.now()-lastSnapshot>30000){fail(generation);return;}
 heartbeat();timer=setTimeout(pulse,8500);
}
function setRoom(v){const old=JSON.stringify(room);room=v||null;if(room)start();if(old!==JSON.stringify(room))heartbeat();}
function transmit(v){
 if(status!=='ready')return false;
 if(leader){receive(null,v);return true;}return safeSend(link,v);
}
function heartbeat(){
 if(status!=='ready')return;
 transmit({type:'hello',profile:profile(),room});
 const st=state();
 for(const v of st.pending)transmit({type:'report',...v});
}
function receive(c,m){
 if(!m||typeof m!=='object')return;
 if(m.type==='hello'){
  const p=safeProfile(m.profile);if(!p)return;
  if(c){const prev=connections.get(c);if(prev&&prev!==p.id)return;if(members.has(p.id)&&members.get(p.id).conn!==c)return;connections.set(c,p.id);}
  else if(p.id!==profile().id)return;
  members.set(p.id,{profile:p,room:safeRoom(m.room,p),at:Date.now(),conn:c});queueBroadcast();return;
 }
 const id=c?connections.get(c):profile().id,entry=members.get(id);if(!entry||entry.conn!==c)return;
 const active=()=>tournaments.some(x=>x.status!=='done'&&x.players.some(p=>p.id===id));
 let cup=tournaments.find(x=>x.id===m.tournament);
 if(m.type==='create'&&!active()&&tournaments.filter(x=>x.status!=='done').length<8){
  tournaments=tournaments.filter(x=>x.status!=='done'||x.at>Date.now()-3600000).slice(-9);
  tournaments.push(newTournament(entry.profile,m.title,m.size));queueBroadcast();return;
 }
 if(m.type==='join'&&cup&&!active()){enroll(cup,entry.profile);queueBroadcast();return;}
 if(m.type==='leave'&&cup?.status==='open'){cup.players=cup.players.filter(p=>p.id!==id);if(!cup.players.length)tournaments=tournaments.filter(x=>x!==cup);else if(cup.owner===id)cup.owner=cup.players[0].id;queueBroadcast();return;}
 if(m.type==='start'&&cup?.owner===id){drawBracket(cup);queueBroadcast();return;}
 if(m.type==='cancel'&&cup?.owner===id&&cup.status!=='done'){tournaments=tournaments.filter(x=>x!==cup);queueBroadcast();return;}
 if(m.type==='report'&&cup&&reportTournament(cup,id,m)){queueBroadcast();return;}
}
function queueBroadcast(){if(!leader||broadcastTimer)return;broadcastTimer=setTimeout(()=>{broadcastTimer=null;if(!leader)return;broadcast();},300);}
function broadcast(){
 const now=Date.now();for(const [id,e]of members)if(now-e.at>TTL){members.delete(id);try{e.conn?.close();}catch{}}
 tournaments=tournaments.filter(c=>c.at>now-8*3600000).slice(-10);
 for(const c of tournaments)if(c.status!=='done'&&!members.has(c.owner)){const active=c.players.find(p=>members.has(p.id));if(active)c.owner=active.id;}
 const list=[...members.values()];snapshot={members:list.map(e=>e.profile),rooms:list.map(e=>e.room).filter(Boolean),tournaments:JSON.parse(JSON.stringify(tournaments))};
 for(const c of connections.keys())safeSend(c,{type:'snapshot',...snapshot});
 lastSnapshot=now;render();
}
function resolvePending(){
 const st=state(),before=st.pending.length;
 st.pending=st.pending.filter(v=>{if(!Number.isFinite(v.at)||v.at<Date.now()-8*3600000)return false;const c=snapshot.tournaments.find(x=>x.id===v.tournament),m=c?.matches?.find(x=>x.id===v.fixture);return !(m&&(m.lastGame===v.game||m.finished?.includes(v.game)||m.winner));});
 if(st.pending.length!==before)persist();
}
function leaveIfIdle(){if(!room&&!state().pending.length&&!snapshot.tournaments.some(c=>c.status!=='done'&&c.players.some(p=>p.id===profile().id)))stop();}
function stop(){started=false;cancelNetwork();status='idle';room=null;snapshot={members:[],rooms:[],tournaments:[]};}
function addFriend(id){const st=state();if(!validId(id)||id===st.id||st.friends.some(f=>f.id===id)||st.friends.length>=100)return false;const p=snapshot.members.find(p=>p.id===id);st.friends.push({id,name:p?.name||'Player-'+id.slice(-5)});persist();return true;}
function removeFriend(id){const st=state();st.friends=st.friends.filter(f=>f.id!==id);persist();}
function rename(name){const st=state();const n=cleanName(name);if(n){st.name=n;persist();heartbeat();return true;}return false;}
function findAssignmentFor(code){for(const c of snapshot.tournaments){const a=assignment(c,profile().id);if(a?.code===code)return a;}return null;}
// Lightweight spectator canvas (separate connection, no control input).
function fieldFrame(g){
 if(!g)return null;const f=g.field;
 const coord=p=>[Math.round(Math.max(-180,Math.min(180,Number(p?.x)||0))*10)/10,Math.round(Math.max(-180,Math.min(180,Number(p?.y)||0))*10)/10];
 return {home:cleanName(g.teams?.home?.name),away:cleanName(g.teams?.away?.name),hs:int(g.homeScore,0,999),as:int(g.awayScore,0,999),inning:int(g.inning,1,999),half:g.half==='top'?'top':'bottom',outs:int(g.outs,0,3),balls:int(g.balls,0,4),strikes:int(g.strikes,0,3),bases:Array.from(g.bases||[]).slice(0,3).map(Boolean),phase:cleanName(g.phase),batter:cleanName(g.batter?.name),pitcher:cleanName(g.pitcher?.name),last:cleanName(g.lastPitch?.name),speed:int(Math.round(g.lastPitch?.speed||0),0,250),ball:f?.ball?coord(f.ball):null,fielders:Array.from(f?.fielders||[]).slice(0,9).map(coord),runners:Array.from(f?.runners||[]).filter(r=>!r.out&&!r.scored).slice(0,4).map(coord),ended:g.phase==='ended',paused:!!g.paused};
}
function fieldSVG(f){
 const pos=(p,color,r)=>'<circle cx="'+(140+Math.max(-140,Math.min(140,+p[0]||0))*.82)+'" cy="'+(180-Math.max(-12,Math.min(170,+p[1]||0))*.82)+'" r="'+r+'" fill="'+color+'" stroke="#172f37" stroke-width="1"/>';
 return '<svg class="cl-field" viewBox="0 0 280 205" role="img" aria-label="'+t('フィールドの実況表示')+'"><path d="M140 180L25 65Q140 -35 255 65Z" fill="#32784a" stroke="#a9dc99" stroke-width="2"/><path d="M140 180L164 156L140 132L116 156Z" fill="#ba8a59"/><path d="M140 180L25 65M140 180L255 65" stroke="#fff" stroke-opacity=".7"/><circle cx="140" cy="165" r="4" fill="#c99965"/>'+[[164,156],[140,132],[116,156]].map(([x,y],i)=>'<rect x="'+(x-3.5)+'" y="'+(y-3.5)+'" transform="rotate(45 '+x+' '+y+')" width="7" height="7" fill="'+(f.bases?.[i]?'#ffdc65':'#fff')+'"/>').join('')+(Array.isArray(f.fielders)?f.fielders.slice(0,9).filter(Array.isArray).map(p=>pos(p,'#69b8ff',4)).join(''):'')+(Array.isArray(f.runners)?f.runners.slice(0,4).filter(Array.isArray).map(p=>pos(p,'#ffb751',4)).join(''):'')+(Array.isArray(f.ball)?pos(f.ball,'#fff',3):'')+'</svg>';
}
function endWatch(){const old=watchSession;watchSession=null;watchCode='';watchFrame=null;watchStatus='';try{old?.destroy();}catch{}}
async function observe(code){
 if(!validCode(code))return;
 endWatch();watchCode=code;watchStatus='connecting';tab='watch';render(true);
 try{
  const s=await G.NightOnline.watch(code,{onData:m=>{if(watchCode!==code||m?.t!=='spectate-frame'||!m.frame)return;watchFrame=m.frame;watchStatus='ready';render(true);},onOpen:()=>{if(watchCode===code){watchStatus='ready';render(true);}},onClose:()=>{if(watchCode===code){watchStatus='closed';render(true);}},onError:()=>{if(watchCode===code){watchStatus='closed';render(true);}}});
  if(watchCode!==code){s.destroy();return;}watchSession=s;
 }catch{if(watchCode===code){watchStatus='closed';render(true);}}
}
function button(label,action,id='',kind='',disabled=false){return '<button type="button" class="cl-btn '+kind+'" data-cl-action="'+action+'" data-id="'+esc(id)+'"'+(disabled?' disabled':'')+'>'+t(label)+'</button>';}
function empty(s){return '<p class="cl-empty">'+t(s)+'</p>';}
function roomRow(r){
 const friend=state().friends.some(f=>f.id===r.owner);
 return '<article class="cl-row"><div><b>'+esc(r.host)+(friend?' ★':'')+'</b><small>'+esc(r.club)+' · '+(r.mode==='derby'?'HR':r.innings+t('回'))+' · '+t(r.status==='playing'?'試合中':r.status==='full'?'準備中':'募集中')+(r.rated?' · '+t('参考レート対象'):'')+'</small></div><div>'+ (r.status==='waiting'?button('参加','join-room',r.code,'primary'):r.watch&&r.status==='playing'?button('観戦','watch',r.code,'primary'):t('対戦中'))+'</div></article>';
}
function renderRooms(){
 const rooms=snapshot.rooms.filter(r=>r.owner!==profile().id);
 return '<div class="cl-actions">'+button('公開ルーム作成','host-public','','primary')+'<button type="button" class="cl-btn" data-action="online-host">'+t('非公開ルーム作成')+'</button>'+'</div><p class="cl-hint">'+t('公開ルームは一覧に載り、通常対戦は観戦可能です。非公開ルームは合言葉のみ。')+'</p><h3>'+t('対戦ルーム')+' <span>'+rooms.length+'</span></h3>'+(rooms.length?rooms.map(roomRow).join(''):empty(status==='ready'?'公開ルームはまだありません':'接続を確認しています'))+'<h3>'+t('合言葉で参加')+'</h3><div class="cl-inline"><input id="online-code-input" class="online-code-input" placeholder="'+t('合言葉を入力')+'" maxlength="8" autocomplete="off"><button class="cl-btn primary" data-action="online-join">'+t('参加')+'</button>'+'</div>';
}
function renderFriends(){
 const me=state(),onlineMap=new Map(snapshot.members.map(p=>[p.id,p]));
 const list=me.friends.map(f=>{const p=onlineMap.get(f.id),r=snapshot.rooms.find(r=>r.owner===f.id);return '<article class="cl-row"><div><b>'+esc(p?.name||f.name)+'</b><small>'+t(p?'オンライン':'オフライン')+' · '+esc(f.id)+'</small></div><div class="cl-actions">'+(r&&r.status==='waiting'?button('参加','join-room',r.code,'primary'):r?.watch&&r.status==='playing'?button('観戦','watch',r.code,'primary'):'')+button('解除','remove-friend',f.id)+'</div></article>';}).join('');
 const others=snapshot.members.filter(p=>p.id!==me.id&&!me.friends.some(f=>f.id===p.id));
 return '<div class="cl-id"><small>'+t('あなたのフレンドコード')+'</small><b>'+esc(me.id)+'</b>'+button('コピー','copy-id')+'</div><div class="cl-inline"><input id="cl-friend" placeholder="'+t('フレンドコード')+'" maxlength="20" autocomplete="off">'+button('登録','add-by-code','','primary')+'</div><h3>'+t('フレンド')+'</h3>'+(list||empty('フレンドがいません'))+'<h3>'+t('オンラインのプレイヤー')+'</h3>'+(others.length?others.map(p=>'<article class="cl-row"><div><b>'+esc(p.name)+'</b><small>'+esc(p.id)+'</small></div>'+button('登録','add-friend',p.id)+'</article>').join(''):empty('他のプレイヤーはまだいません'));
}
function renderRanking(){
 const me=profile(),rows=[...snapshot.members];if(!rows.some(p=>p.id===me.id))rows.push(me);
 rows.sort((a,b)=>b.rating-a.rating||b.games-a.games||a.id.localeCompare(b.id));
 return '<div class="cl-rating"><div><small>'+t('あなたの参考レート')+'</small><strong>'+me.rating+'</strong></div><div><small>'+t('勝 / 敗 / 分')+'</small><b>'+me.w+' / '+me.l+' / '+me.d+'</b><small>'+t('連勝')+' '+Math.max(0,me.streak)+'</small></div></div><p class="cl-hint">'+t('ハンデなしの公開通常対戦のElo参考値。現在接続中のプレイヤーのみ集計し、改変防止済みの公式ランキングではありません。')+'</p><h3>'+t('オンラインランキング')+'</h3>'+rows.map((p,i)=>'<article class="cl-row"><div><b>'+ (i+1)+'. '+esc(p.name)+(p.id===me.id?' (YOU)':'')+'</b><small>'+p.w+' W · '+p.l+' L · '+p.d+' D</small></div><strong>'+p.rating+'</strong></article>').join('');
}
function renderCups(){
 const me=profile().id,cups=snapshot.tournaments;
 let out='<p class="cl-hint">'+t('4人または8人の勝ち抜き戦。両者の結果が一致した場合だけ勝者を確定。引き分けは再戦です。')+'</p><div class="cl-inline"><input id="cl-cup-name" maxlength="24" placeholder="'+t('大会名')+'"><select id="cl-cup-size"><option value="4">4'+t('人')+'</option><option value="8">8'+t('人')+'</option></select>'+button('大会作成','create-cup','','primary',status!=='ready')+'</div>';
 for(const c of cups){
  if(!c||!Array.isArray(c.players)||!Array.isArray(c.matches)||!validId(c.id))continue;
  const joined=c.players.some(p=>p.id===me),name=id=>esc(c.players.find(p=>p.id===id)?.name||'—'),mine=assignment(c,me);
  out+='<section class="cl-cup"><div class="cl-row"><div><b>'+esc(c.title)+'</b><small>'+c.players.length+' / '+c.size+' · '+t(c.status==='open'?'募集中':c.status==='done'?'終了':'開催中')+'</small></div>'+(c.status==='open'?(joined?button('退出','leave-cup',c.id):button('参加','join-cup',c.id,'primary')):'')+'</div>';
  if(c.status==='open')out+='<div class="cl-entrants">'+c.players.map(p=>'<span>'+esc(p.name)+'</span>').join('')+'</div>'+(c.owner===me?button('抽選・開始','start-cup',c.id,'primary',c.players.length!==c.size):'');
  else{
   if(c.champion)out+='<p class="cl-win">🏆 '+name(c.champion)+'</p>';
   for(const round of [...new Set(c.matches.map(m=>m.round))])out+='<div class="cl-round"><small>'+t(round===Math.log2(c.size)-1?'決勝':round===Math.log2(c.size)-2?'準決勝':'1回戦')+'</small>'+c.matches.filter(m=>m.round===round).map(m=>'<div class="cl-bracket"><div class="'+(m.winner===m.a?'winner':'')+'">'+name(m.a)+' <b>'+(m.score?.[0]??'—')+'</b></div><div class="'+(m.winner===m.b?'winner':'')+'">'+name(m.b)+' <b>'+(m.score?.[1]??'—')+'</b></div>'+(m.draws&&!m.winner?'<small>'+t('引き分け・再戦')+'</small>':'')+'</div>').join('')+'</div>';
   if(mine)out+='<div class="cl-next"><b>'+t('あなたの次の試合')+'</b><small>'+name(mine.a)+' vs '+name(mine.b)+'</small>'+button(me===mine.a?'試合ルームを開く':'試合に参加','cup-match',mine.code,'primary')+'</div>';
  }
  if(c.owner===me&&c.status!=='done')out+=button('大会中止','cancel-cup',c.id);
  out+='</section>';
 }
 return out+(cups.length?'':empty('開催中の大会はありません'));
}
function renderWatch(){
 const f=watchFrame;return '<div class="cl-watch-head">'+button('観戦終了','watch-exit')+'<b>'+t('LIVE 観戦')+' · '+esc(watchCode)+'</b></div>'+(watchStatus==='closed'?empty('観戦接続が切れました'):'')+(!f?empty(watchStatus==='connecting'?'観戦に接続中':'試合の開始を待っています'):'<div class="cl-score"><div><small>'+esc(f.away)+'</small><strong>'+int(f.as,0,999)+'</strong></div><div><span>'+int(f.inning,1,999)+t('回')+' '+t(f.half==='top'?'表':'裏')+'</span><b>VS</b><small>'+t(f.ended?'試合終了':f.paused?'一時停止':'試合中')+'</small></div><div><small>'+esc(f.home)+'</small><strong>'+int(f.hs,0,999)+'</strong></div></div>'+fieldSVG(f)+'<div class="cl-count"><b>B '+int(f.balls,0,4)+'</b><b>S '+int(f.strikes,0,3)+'</b><b>O '+int(f.outs,0,3)+'</b></div><div class="cl-row"><div><small>'+t('打者')+'</small><b>'+esc(f.batter)+'</b></div><div><small>'+t('投手')+'</small><b>'+esc(f.pitcher)+'</b></div></div><p class="cl-hint">'+esc(f.last)+(f.speed?' · '+int(f.speed,0,250)+' km/h':'')+'</p>')+'<p class="cl-hint">'+t('観戦専用・2D実況。試合操作には影響しません。')+'</p>';
}
function render(force=false){
 resolvePending();
 if(!root?.isConnected)return;
 if(!force&&root.contains(document.activeElement)&&/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName))return;
 const code=root.querySelector('#online-code-input')?.value||handlers?.invite||'',nameValue=root.querySelector('#cl-name')?.value||state().name;
 const tabs=[['rooms','ルーム'],['friends','フレンド'],['cups','大会'],['ranking','ランキング']];
 root.innerHTML='<section class="cl-shell"><header class="cl-header"><span>'+t('ONLINE COMMUNITY')+'</span><small class="'+(status==='ready'?'connected':'')+'">'+t(status==='ready'?'ロビー接続済み':status==='idle'?'未接続':status==='retry'?'再接続中':'接続準備中')+'</small></header>'+(tab==='watch'?renderWatch():'<div class="cl-profile"><input id="cl-name" maxlength="24" aria-label="'+t('公開ニックネーム')+'" value="'+esc(nameValue)+'">'+button('名前変更','rename')+'</div><nav class="cl-tabs">'+tabs.map(([id,label])=>button(label,'tab',id,tab===id?'selected':'')).join('')+'</nav>'+(message?'<p class="cl-message" role="status">'+t(message)+'</p>':'')+(tab==='friends'?renderFriends():tab==='cups'?renderCups():tab==='ranking'?renderRanking():renderRooms())+'<p class="cl-hint">'+t('ニックネーム・参考レートはオンライン中のみ公開。ロビーは接続中の端末が管理するため、全員の退出や通信状態により一覧・大会が消えることがあります。')+'</p>')+'</section>';
 const el=root.querySelector('#online-code-input');if(el&&code)el.value=code;
}
function mount(el,callbacks){
 if(!el)return;root=el;handlers=callbacks;message='';if(tab==='watch'||callbacks.invite)tab='rooms';start();
 el.addEventListener('click',e=>{
  const b=e.target.closest('[data-cl-action]');if(!b)return;e.stopPropagation();const action=b.dataset.clAction,id=b.dataset.id,read=k=>el.querySelector('#'+k)?.value||'';
  if(action==='tab'){tab=id;message='';endWatch();}
  else if(action==='host-public'||action==='host-private'){handlers.host(action==='host-public');return;}
  else if(action==='join-room'){handlers.join(id);return;}
  else if(action==='code-join'){const code=read('online-code-input').trim().toUpperCase();if(!validCode(code)){message='合言葉を確認してください';render(true);return;}handlers.join(code);return;}
  else if(action==='rename'){rename(read('cl-name'));message='名前を保存しました';}
  else if(action==='copy-id'){handlers.copy(profile().id);return;}
  else if(action==='add-friend'||action==='add-by-code'){message=addFriend(action==='add-friend'?id:read('cl-friend').trim().toLowerCase())?'フレンドを登録しました':'コードを確認してください';}
  else if(action==='remove-friend'){removeFriend(id);}
  else if(action==='create-cup'){if(!transmit({type:'create',title:read('cl-cup-name'),size:Number(read('cl-cup-size'))}))message='ロビーに再接続してください';}
  else if(action==='cancel-cup'){if(G.confirm?.(tr('大会を中止しますか？')))transmit({type:'cancel',tournament:id});}
  else if(['join-cup','leave-cup','start-cup'].includes(action)){if(!transmit({type:action.split('-')[0],tournament:id}))message='ロビーに再接続してください';}
  else if(action==='cup-match'){const a=findAssignmentFor(id);if(!a)return;if(a.a===profile().id)handlers.host(true,a);else handlers.join(id,a);return;}
  else if(action==='watch'){observe(id);return;}
  else if(action==='watch-exit'){endWatch();tab='rooms';}
  render(true);
 });
 render(true);
}
function unmount(){root=null;handlers=null;endWatch();if(tab==='watch')tab='rooms';}
G.NightCommunity={profile,safeProfile,safeRoom,safeTournament,ratedResult,newTournament,enroll,drawBracket,reportTournament,assignment,beginMatch,acceptMatch,finishMatch,findAssignmentFor,fieldFrame,start,stop,setRoom,mount,unmount,render,leaveIfIdle,getSnapshot:()=>JSON.parse(JSON.stringify(snapshot)),command:transmit};
})();
