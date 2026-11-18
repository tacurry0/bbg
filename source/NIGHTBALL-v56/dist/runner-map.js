// One shared runner state drives the field model, mini diamond and swipe input.
export const MAP_BASES=[[100,180],[180,100],[100,20],[20,100],[100,180]];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function runnerMapState(g){
 if(!g?.field||!['field','result'].includes(g.phase)||g.field.foul)return [];
 return g.field.runners.filter(r=>!r.out&&!r.scored&&(r.progress<3.999999||r.needsTag)).map(r=>{
  const progress=clamp(r.progress,0,4),leg=Math.min(3,Math.floor(progress)),u=progress-leg;
  const x=MAP_BASES[leg][0]+(MAP_BASES[leg+1][0]-MAP_BASES[leg][0])*u,y=MAP_BASES[leg][1]+(MAP_BASES[leg+1][1]-MAP_BASES[leg][1])*u;
  const delta=(r.target??r.command??progress)-progress,moving=!!r.running;
  const next=delta>0?Math.min(4,Math.floor(progress+.000001)+1):Math.max(0,Math.ceil(progress-.000001)-1);
  const angle=moving?Math.atan2(MAP_BASES[next][1]-y,MAP_BASES[next][0]-x)*180/Math.PI+90:0;
  const name=g.lineups[g.side].find(p=>p.id===r.id)?.name||(r.batter?'打者':r.start+'塁走者');
  return {id:r.id,x,y,progress,moving,controllable:g.canControlRunner?.(r.id)??true,own:g.career?.playerId===r.id,waiting:!!r.waiting,blocked:!!r.blocked,angle,name,selected:g.field.manual?.selection===r.id,destination:next};
 });
}
export function swipeDestination(marker,dx,dy){
 if(Math.hypot(dx,dy)<24)return null;
 const p=marker.progress,at=Math.abs(p-Math.round(p))<.000001;
 const candidates=[at?Math.round(p)+1:Math.ceil(p),at?Math.round(p)-1:Math.floor(p)].filter(n=>n>=1&&n<=4);
 const length=Math.hypot(dx,dy);
 const scored=candidates.map(base=>{const [x,y]=MAP_BASES[base],vx=x-marker.x,vy=y-marker.y,n=Math.hypot(vx,vy);return {base,alignment:n?(dx*vx+dy*vy)/(length*n):-1};}).sort((a,b)=>b.alignment-a.alignment);
 return scored[0]?.alignment>.55?scored[0].base:null;
}
export function renderRunnerMap(el,g){
 const visible=!!g.field&&['field','result'].includes(g.phase)&&!g.field.foul&&!g.derby;
 el.hidden=!visible;if(!visible)return;
 el.classList.toggle('interactive',g.manualPlay&&!g.paused);el.setAttribute('role',g.manualPlay?'group':'img');
 if(!el.querySelector('svg'))el.innerHTML=`<svg viewBox="-12 -12 224 224"><defs><linearGradient id="run-turf" x2="0" y2="1"><stop stop-color="#294738"/><stop offset="1" stop-color="#1c342d"/></linearGradient><linearGradient id="run-frame" x2="1" y2="1"><stop stop-color="#57756b"/><stop offset=".5" stop-color="#243c3b"/><stop offset="1" stop-color="#465f59"/></linearGradient></defs><path d="M100 3 197 100 100 197 3 100Z" fill="url(#run-frame)" stroke="#182b2b" stroke-width="3" stroke-linejoin="round"/><path d="M100 14 186 100 100 186 14 100Z" fill="url(#run-turf)" stroke="#8ba39a" stroke-width="2"/><path d="M100 20 180 100 100 180 20 100Z" fill="none" stroke="#334e46" stroke-width="8"/><path d="M100 20 180 100 100 180 20 100Z" fill="none" stroke="#b4c9b6" stroke-width="2.3"/>${MAP_BASES.slice(0,4).map(([x,y],i)=>i===0?`<path d="M${x-8} ${y-7}h16v9l-8 6-8-6Z" fill="#efffff" stroke="#617870" stroke-width="2"/>`:`<path d="M${x} ${y-11}l11 11-11 11-11-11Z" fill="#efffff" stroke="#617870" stroke-width="2"/>`).join('')}<g class="runner-map-guide"></g><g class="runner-map-markers"></g><text class="map-swipe-label" x="100" y="96" text-anchor="middle">走者をスワイプ</text><text class="map-swipe-label" x="100" y="111" text-anchor="middle">1つの塁へ</text></svg>`;
 const markers=runnerMapState(g),markup=markers.map(m=>`<g transform="translate(${m.x.toFixed(2)} ${m.y.toFixed(2)})" data-runner-id="${m.id}" data-own="${m.own}" data-motion="${m.moving?'moving':'stopped'}"><circle r="22" fill="transparent"/>${m.selected?'<circle r="14" fill="none" stroke="white" stroke-width="2"/>':''}${m.moving?`<path transform="rotate(${m.angle.toFixed(1)})" d="M0-11 9 9 0 4-9 9Z" fill="${m.own?'#1dbffe':'#ff8a26'}" stroke="#fff5be" stroke-width="2.8" stroke-linejoin="round"/>`:`<circle r="9" fill="${m.own?'#32c9ff':'#ffad29'}" stroke="#fff6c6" stroke-width="3"/>`}</g>`).join('');
 if(el._markers!==markup){el.querySelector('.runner-map-markers').innerHTML=markup;el._markers=markup;}
 const bases=['本塁','一塁','二塁','三塁','本塁'];el.setAttribute('aria-label',(g.manualPlay?'走者を次の塁・元の塁へスワイプ。':'走者の位置：')+(markers.map(m=>m.name+' '+(m.moving?(bases[m.destination]+'へ移動中'):m.blocked?'前の走者を待機':'停止中')).join('、')||'走者なし'));
}
export function bindRunnerMap(el,getGame,onCommand=()=>{}){
 let gesture=null;
 const point=e=>{const b=el.getBoundingClientRect();return {x:(e.clientX-b.left)/b.width*224-12,y:(e.clientY-b.top)/b.height*224-12};};
 el.addEventListener('pointerdown',e=>{
  const g=getGame();if(!g?.manualPlay||g.paused||gesture||e.button!==0)return;
  const p=point(e),hit=runnerMapState(g).filter(m=>m.controllable).map(m=>({m,d:Math.hypot(m.x-p.x,m.y-p.y)})).sort((a,b)=>a.d-b.d)[0];
  if(!hit||hit.d>27)return;e.preventDefault();e.stopPropagation();g.selectRunner(hit.m.id);
  gesture={pointer:e.pointerId,game:g,field:g.field,id:hit.m.id,start:p};el.setPointerCapture(e.pointerId);
 });
 el.addEventListener('pointermove',e=>{if(!gesture||e.pointerId!==gesture.pointer)return;e.preventDefault();e.stopPropagation();const p=point(e),guide=el.querySelector('.runner-map-guide');if(guide)guide.innerHTML=`<path d="M${gesture.start.x} ${gesture.start.y}L${p.x} ${p.y}" stroke="#fff6ac" stroke-width="4" stroke-linecap="round" opacity=".85"/>`;});
 const clear=()=>{gesture=null;const guide=el.querySelector('.runner-map-guide');if(guide)guide.innerHTML='';};
 el.addEventListener('pointerup',e=>{
  if(!gesture||e.pointerId!==gesture.pointer)return;e.preventDefault();e.stopPropagation();const saved=gesture,p=point(e);clear();
  const g=getGame();if(g!==saved.game||g.field!==saved.field||g.paused||!g.manualPlay)return;
  const marker=runnerMapState(g).find(m=>m.id===saved.id);if(!marker)return;
  const base=swipeDestination(marker,p.x-saved.start.x,p.y-saved.start.y);if(base!==null&&g.commandRunner(marker.id,base))onCommand();
 });
 el.addEventListener('pointercancel',clear);el.addEventListener('lostpointercapture',clear);
}
