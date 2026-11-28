/* v277 — pre-rendered action clips, not a second game renderer. */
(()=>{
 'use strict';
 const home=document.getElementById('home'),modal=document.getElementById('modal');
 if(!home)return;
 const root='./assets/menu/motion-v277/';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const videoStates=[...home.querySelectorAll('video[data-home-clip]')].map(video=>{
  const key=video.dataset.homeClip,host=video.parentElement;
  video.muted=true;video.defaultMuted=true;video.playsInline=true;
  const fallback=document.createElement('img');fallback.className='nb-home-clip nb-home-clip-fallback';fallback.alt='';fallback.setAttribute('aria-hidden','true');fallback.decoding='async';host.insertBefore(fallback,video.nextSibling);
  return {video,key,host,fallback,visible:false,enabled:false,mode:'video',loading:false,playing:false,failed:false,url:null,playToken:0,playPending:false};
 });
 let disposed=false;
 const reducedNow=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const active=()=>!disposed&&!reducedNow()&&!document.hidden&&!home.hidden&&(!modal||modal.hidden);
 function stopVideo(s){s.playToken++;s.playPending=false;s.playing=false;s.video.pause();}
 function fallback(s){
  if(s.mode==='image')return;
  s.mode='image';stopVideo(s);s.video.classList.remove('nb-home-clip-show');s.playing=false;
  if(s.url){URL.revokeObjectURL(s.url);s.url=null;s.video.removeAttribute('src');}
  s.host.classList.remove('nb-home-motion-ready');updateOne(s);
 }
 function showImage(s){
  if(!s.enabled||s.mode!=='image'||s.failed)return;
  const src=root+s.key+'-animated.webp';
  if(s.fallback.getAttribute('src')!==src)s.fallback.src=src;
 }
 function stopImage(s){
  if(!s.fallback.getAttribute('src'))return;
  // Swap to a still or remove the source so off-screen image playback stops.
  if(s.host.classList.contains('nb-home-motion-ready')&&!reducedNow()){
   const src=root+s.key+'.webp';if(s.fallback.getAttribute('src')!==src)s.fallback.src=src;
  }else s.fallback.removeAttribute('src');
 }
 function play(s){
  if(!active()||!s.enabled||!s.visible||s.mode!=='video'||!s.url||s.playPending||!s.video.paused||s.loading)return;
  const token=++s.playToken;s.playPending=true;
  Promise.resolve(s.video.play()).then(()=>{
   if(!active()||!s.enabled||!s.visible)stopVideo(s);
  }).catch(err=>{
   if(token!==s.playToken)return;
   s.playing=false;
   if(active()&&s.enabled&&err?.name!=='AbortError')fallback(s);
  }).finally(()=>{if(token===s.playToken)s.playPending=false;});
 }
 async function load(s){
  if(s.loading||s.url||s.mode!=='video')return;
  if(!s.video.canPlayType('video/mp4; codecs="avc1.4D401E"')){fallback(s);return;}
  s.loading=true;
  try{
   // Fetch a whole small clip, not a Range request. This uses the normal
   // service-worker cache offline and does not create a second 3D context.
   const response=await fetch(root+s.key+'.mp4');if(!response.ok)throw Error('clip');
   const blob=await response.blob();
   if(disposed||s.mode!=='video')return;
   s.url=URL.createObjectURL(blob);s.video.src=s.url;
  }catch{if(!disposed)fallback(s);}
  finally{s.loading=false;}
  if(s.enabled&&s.mode==='video')play(s);
 }
 function updateOne(s){
  s.enabled=active()&&s.visible;
  if(reducedNow()){
   stopVideo(s);s.video.classList.remove('nb-home-clip-show');
   s.fallback.classList.remove('nb-home-clip-show');s.host.classList.remove('nb-home-motion-ready');stopImage(s);return;
  }
  if(!s.enabled){
   stopVideo(s);stopImage(s);return;
  }
  if(s.mode==='image'){showImage(s);return;}
  if(s.url)play(s);else load(s);
 }
 for(const s of videoStates){
  s.video.addEventListener('playing',()=>{
   if(!active()||!s.enabled||!s.visible||s.mode!=='video'){updateOne(s);return;}
   s.playing=true;s.video.classList.add('nb-home-clip-show');s.fallback.classList.remove('nb-home-clip-show');s.host.classList.add('nb-home-motion-ready');
  });
  s.video.addEventListener('play',()=>{if(!active()||!s.enabled||!s.visible)updateOne(s);});
  s.video.addEventListener('error',()=>{if(s.mode==='video'&&s.url)fallback(s);});
  s.fallback.addEventListener('load',()=>{
   if(s.mode!=='image'||reducedNow())return;
   s.fallback.classList.add('nb-home-clip-show');s.host.classList.add('nb-home-motion-ready');
  });
  s.fallback.addEventListener('error',()=>{s.failed=true;s.fallback.classList.remove('nb-home-clip-show');s.host.classList.remove('nb-home-motion-ready');});
 }
 const sync=()=>{
  home.classList.toggle('nb-home-motion-paused',!active());
  for(const s of videoStates)updateOne(s);
 };
 if('IntersectionObserver'in window){
  const observer=new IntersectionObserver(entries=>{
   for(const e of entries){const s=videoStates.find(q=>q.host===e.target);if(s)s.visible=e.isIntersecting&&e.intersectionRatio>=.18;}
   sync();
  },{threshold:[0,.18,.6]});
  videoStates.forEach(s=>observer.observe(s.host));
 }else videoStates.forEach(s=>s.visible=true);
 document.addEventListener('visibilitychange',sync);
 if(reduced.addEventListener)reduced.addEventListener('change',sync);else reduced.addListener?.(sync);
 window.addEventListener('pagehide',e=>{
  for(const s of videoStates){stopVideo(s);stopImage(s);if(!e.persisted&&s.url)URL.revokeObjectURL(s.url);}
  if(!e.persisted)disposed=true;
 });
 window.addEventListener('pageshow',sync);
 // Some WebViews deliver the media-query change asynchronously while
 // resuming a pending play() request. Reconcile only on the visible
 // home screen, not through any per-frame rendering loop.
 let lastReduced=reducedNow();
 const policyTimer=setInterval(()=>{
  if(disposed||document.hidden||home.hidden)return;
  const now=reducedNow();
  if(now!==lastReduced||(now&&videoStates.some(s=>!s.video.paused||s.host.classList.contains('nb-home-motion-ready')))){lastReduced=now;sync();}
 },750);
 window.addEventListener('pagehide',e=>{if(!e.persisted)clearInterval(policyTimer);});

 // Native vector mini-actions: preserve each button's original icon as the
 // reduced-motion fallback, and leave the existing labels and hit areas.
 const bat='<g class="nb-mini-bat"><path d="M14 30 27 8" stroke="#7b461e" stroke-width="5.2" stroke-linecap="round"/><path d="M23 14 29 5" stroke="#dea353" stroke-width="7.2" stroke-linecap="round"/><path d="m13 29-2 4" stroke="#463326" stroke-width="3"/></g>';
 const ball='<circle cx="20" cy="20" r="5" fill="#fffdf4" stroke="#416584" stroke-width="1.2"/><path d="M18 15.5q4 4 0 9m4-9q-4 4 0 9" stroke="#d64954" stroke-width=".8"/>';
 const art={
  practice:'<path d="M5 30h30" stroke="#75a8c5" stroke-width="1.5"/>'+bat+'<g class="nb-mini-hit-ball" transform="translate(-11 3)">'+ball+'</g>',
  derby:bat+'<g class="nb-mini-hr-ball">'+ball+'</g><g class="nb-mini-firework" stroke="#f28a27" stroke-width="2"><path d="M31 3v6m-6-3 4 4m8-4-4 4m-9 2h5m5 0h5"/></g>',
  pitching:'<path d="M5 27h30" stroke="#df7da5" stroke-width="1.5" stroke-dasharray="3 3"/><g class="nb-mini-pitch-ball"><g class="nb-mini-spin">'+ball+'</g></g>',
  bullpen:'<g class="nb-mini-target"><circle cx="28" cy="15" r="10" stroke="#c17725" stroke-width="1.8"/><circle cx="28" cy="15" r="5" stroke="#d78d38" stroke-width="1.8"/><circle cx="28" cy="15" r="1.8" fill="#c17725"/></g><g class="nb-mini-bullpen-ball">'+ball+'</g>',
  apbc:'<g class="nb-mini-flag" style="--flag-delay:0s"><path d="M5 8v23" stroke="#4d6a88" stroke-width="1.8"/><path d="M6 8h13v10H6z" fill="#fff" stroke="#6e93ad" stroke-width=".7"/><circle cx="12.5" cy="13" r="3" fill="#c92c43" stroke="none"/></g><g class="nb-mini-flag" style="--flag-delay:.18s"><path d="M18 5v25" stroke="#4d6a88" stroke-width="1.8"/><path d="M19 5h13v10H19z" fill="#e3484e" stroke="#6e93ad" stroke-width=".7"/><path d="M19 5h6v6h-6z" fill="#214b9c" stroke="none"/><circle cx="22" cy="8" r="1.45" fill="#fff" stroke="none"/></g><g class="nb-mini-flag" style="--flag-delay:.36s"><path d="M25 19v16" stroke="#4d6a88" stroke-width="1.8"/><path d="M26 19h12v9H26z" fill="#fff" stroke="#6e93ad" stroke-width=".7"/><path d="M29 23.5a3 3 0 1 1 6 0" fill="#d44351" stroke="none"/><path d="M29 23.5a3 3 0 1 0 6 0" fill="#2856ad" stroke="none"/><path d="m27 20 1 1m8-1-1 1m-8 5 1-1m8 1-1-1" stroke="#222" stroke-width=".75"/></g>'
 };
 for(const [name,markup] of Object.entries(art)){
  const button=home.querySelector('[data-mode="'+name+'"]'),old=button?.querySelector('svg');
  if(!old)continue;
  old.classList.add('nb-mini-original');
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('class','nb-mini-action nb-mini-action-'+name);svg.setAttribute('viewBox','0 0 40 40');svg.setAttribute('aria-hidden','true');svg.innerHTML=markup;
  button.insertBefore(svg,old.nextSibling);
 }

 // Slide the artwork with the real release entries instead of adding
 // unrelated glow effects. Existing swipe, arrow and text handlers remain.
 const notice=document.getElementById('notice-card'),title=document.getElementById('notice-title');
 if(notice&&title){
  const picture=document.createElement('span');picture.className='nb-home-notice-art';picture.setAttribute('aria-hidden','true');notice.prepend(picture);
  let current='',previousIndex=0,anim;
  const refresh=()=>{
   const text=title.textContent||'';if(!text||text===current)return;
   const idx=[...home.querySelectorAll('[data-notice-index]')].findIndex(b=>b.getAttribute('aria-current')==='true');
   const key=/オンライン|線上|온라인/i.test(text)?'online':/キャリア|選手|生涯|선수/i.test(text)?'career':/ペナント|聯盟|리그/i.test(text)?'season':/ホーム画面|主畫面|홈 화면/i.test(text)?'hero':'match';
   picture.style.backgroundImage='url("'+root+key+'.webp")';
   anim?.cancel();if(current&&active())anim=picture.animate?.([{transform:'translateX('+((idx>=previousIndex?1:-1)*24)+'px) scale(1.06)',opacity:.2},{transform:'translateX(0) scale(1)',opacity:1}],{duration:360,easing:'cubic-bezier(.2,.7,.2,1)'});
   current=text;previousIndex=idx;
  };
  new MutationObserver(refresh).observe(title,{childList:true,characterData:true,subtree:true});refresh();
 }
 // Short entrance effects for actual menu destinations; never the game.
 const pages=[home,...['utility-page','pennant','career','apbc-cup'].map(id=>document.getElementById(id)).filter(Boolean)];
 let lastPage=pages.find(p=>!p.hidden);
 function screenChanged(){
  sync();
  const next=pages.find(p=>!p.hidden);
  if(next!==lastPage){
   if(next&&!reducedNow()&&(next===home||lastPage===home)){
    const target=next===home?home.querySelector('.menu-content'):next;
    target?.classList.remove('nb-home-page-in');
    if(target){void target.offsetWidth;target.classList.add('nb-home-page-in');}
   }
   lastPage=next;
  }
 }
 const observer=new MutationObserver(screenChanged);
 pages.forEach(p=>observer.observe(p,{attributes:true,attributeFilter:['hidden']}));
 if(modal)observer.observe(modal,{attributes:true,attributeFilter:['hidden']});
 sync();
})();
