const lamps=[['B',3,'green'],['S',2,'gold'],['O',3,'red']];

function cubeHTML(g){
 return `<div class="score-cube" role="img"><svg viewBox="0 0 156 120" aria-hidden="true">
  <defs>
   <linearGradient id="cube-edge" x2="0" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#d9ecff"/></linearGradient>
   <linearGradient id="cube-blue" x2="1" y2="1"><stop stop-color="#223d64"/><stop offset=".42" stop-color="#0e2546"/><stop offset="1" stop-color="#081a35"/></linearGradient>
   <linearGradient id="cube-black" x2="0" y2="1"><stop stop-color="#12191e"/><stop offset="1" stop-color="#050b13"/></linearGradient>
   <radialGradient id="cube-green" cx=".34" cy=".22" r=".78"><stop stop-color="#e2ffb2"/><stop offset=".34" stop-color="#8bff2c"/><stop offset="1" stop-color="#00a521"/></radialGradient>
   <linearGradient id="cube-gold" x2="1" y2="1"><stop stop-color="#fff5a0"/><stop offset=".4" stop-color="#ffe12b"/><stop offset="1" stop-color="#f2ae00"/></linearGradient>
   <radialGradient id="cube-red" cx=".32" cy=".23" r=".75"><stop stop-color="#ffb5a1"/><stop offset=".34" stop-color="#ff3a2b"/><stop offset="1" stop-color="#bb0c17"/></radialGradient>
  </defs>
  <path d="M3 25 74 3 153 25 88 46Z" fill="url(#cube-black)" stroke="url(#cube-edge)" stroke-width="2"/>
  <path d="M3 25 88 46 88 117 3 96Z" fill="url(#cube-blue)" stroke="url(#cube-edge)" stroke-width="2"/>
  <path d="M3 59 88 80" stroke="#7696bc" stroke-width=".7"/>
  ${['away','home'].map((side,i)=>{
   const club=g.teams[side];
   return `<g transform="translate(5 ${28+i*35}) skewY(14)"><rect width="30" height="32" rx="1" fill="${club.color}"/>
    ${club.scoreMark?`<text x="15" y="21" fill="#fff" font-size="${club.scoreMark.length>1?13:19}" font-weight="900" text-anchor="middle">${club.scoreMark}</text>`:`<image href="${club.logo}" x="2" y="3" width="26" height="26" preserveAspectRatio="xMidYMid meet"/>`}
    <text data-score="${side}" x="57" y="26" text-anchor="middle" fill="white" font-size="24" font-weight="900"></text>
   </g>`;
  }).join('')}
  <path d="M88 46 153 25 153 96 88 117Z" fill="url(#cube-black)" stroke="url(#cube-edge)" stroke-width="2"/>
  <g>${[[1,'M136 25 145 22 153 25 145 28Z'],[2,'M64 5 74 2 86 5 76 9Z'],[3,'M10 25 21 22 33 25 22 29Z']].map(([n,d])=>`<path class="cube-bag" data-bag="${n}" d="${d}"/>`).join('')}</g>
  <text x="82" y="32" text-anchor="middle" fill="white" font-size="20" font-weight="900"><tspan data-inning></tspan><tspan data-half dx="3" font-size="10"></tspan></text>
  <g transform="translate(95 52) skewY(-18)">${lamps.map(([l,max,color],row)=>`<g transform="translate(0 ${row*20})"><text y="11" fill="white" font-size="13" font-weight="900">${l}</text>${Array.from({length:max},(_,i)=>
   `<ellipse class="cube-lamp" data-count="${l}" data-count-index="${i}" data-color="${color}" cx="${20+i*12}" cy="6" rx="5" ry="6.4"/>`
  ).join('')}</g>`).join('')}</g>
 </svg></div>`;
}
export function updateScoreCube(board,g){
 const key=JSON.stringify([g.teams.away,g.teams.home].map(({id,logo,scoreMark,color})=>[id,logo,scoreMark,color]));
 if(board.dataset.cube!==key||!board.firstElementChild?.classList.contains('score-cube')){
  board.innerHTML=cubeHTML(g);board.dataset.cube=key;
 }
 const cube=board.firstElementChild,{home,away}=g.displayScore();
 const half=g.half==='top'?'表':'裏',bases=g.bases.map((v,i)=>v?`${i+1}塁`:null).filter(Boolean).join('・')||'走者なし';
 const label=`${g.inning}回${half} ${g.teams.away.name} ${away}対${home} ${g.teams.home.name}、${bases}、${g.balls}ボール ${g.strikes}ストライク ${g.outs}アウト`;
 if(cube.getAttribute('aria-label')===label)return;
 cube.setAttribute('aria-label',label);
 for(const [selector,value] of [['inning',g.inning],['half',half],['score="away"',away],['score="home"',home]]){
  const node=cube.querySelector(`[data-${selector}]`);
  if(node.textContent!==String(value))node.textContent=value;
 }

 for(const path of cube.querySelectorAll('[data-bag]'))path.classList.toggle('lit',!!g.bases[Number(path.dataset.bag)-1]);
 const counts={B:g.balls,S:g.strikes,O:g.outs};
 for(const lamp of cube.querySelectorAll('[data-count]'))lamp.classList.toggle('lit',Number(lamp.dataset.countIndex)<counts[lamp.dataset.count]);
}

const posLabels={P:'投',C:'捕','1B':'一','2B':'二','3B':'三',SS:'遊',LF:'左',CF:'中',RF:'右',DH:'指',OF:'外',IF:'内'};
const colors={P:'pitch',C:'catch',LF:'outfield',CF:'outfield',RF:'outfield',OF:'outfield',DH:'dh'};
function face(condition,ident){
 return `<svg class="hud-face" viewBox="0 0 24 24" role="img" aria-label="調子 ${condition.label}" style="--face:${condition.color}">
  <defs><radialGradient id="hud-face-${ident}" cx=".35" cy=".24" r=".74"><stop stop-color="#fff6ff"/><stop offset=".39" stop-color="${condition.color}"/><stop offset="1" stop-color="${condition.color}" stop-opacity=".72"/></radialGradient></defs>
  <circle cx="12" cy="12" r="10.9" fill="url(#hud-face-${ident})" stroke="#07101c" stroke-width=".6"/>
  <circle cx="8.4" cy="9.6" r="1.4" fill="#101124"/><circle cx="15.6" cy="9.6" r="1.4" fill="#101124"/>
  <path d="${condition.mouth}" fill="${condition.label==='絶好調'?'#101124':'none'}" stroke="#101124" stroke-width="1.55" stroke-linecap="round"/>
 </svg>`;
}
function card(el,p,pos,order,condition,ratings){
 const style=colors[pos]||'infield';
 const grades=ratings.map(([label,value])=>[label,NightPlayers.grade(value)]);
 const key=JSON.stringify([p.id,p.name,pos,order,condition.label,grades]);
 if(el.dataset.key===key)return;
 el.dataset.key=key;
 el.dataset.positionStyle=style;
 el.setAttribute('aria-label',`${p.name}、調子 ${condition.label}、${grades.map(([l,g])=>l+' '+g).join('、')}。選手の能力を見る`);
 el.innerHTML=`<span class="hud-player-main"><b class="hud-order">${order}</b><strong class="hud-name"></strong>${face(condition,el.id)}<b class="hud-position">${posLabels[pos]||'野'}</b></span>
  <span class="hud-player-ratings">${grades.map(([l,k])=>`<span>${l}<b data-hud-grade="${k}">${k}</b></span>`).join('')}</span>`;
 el.querySelector('.hud-name').textContent=p.name;
}
export function updatePlayerHUD(batterCard,pitcherCard,g){
 const b=g.batter,p=g.pitcher;
 const match=g.matchup(),fatigue=g.pitchFatigue();
 const battingOrder=g.mode==='career-bat'&&!g.career.continuous?g.lineups[g.side].findIndex(x=>x.id===b.id)+1:(g.battingIndex[g.side]%9)+1;
 const position=g.lineups[g.side].find(x=>x.id===b.id)?.fieldPos||b.pos;
 card(batterCard,b,position,battingOrder||1,NightGame.conditionInfo(g.conditionFor(b)),[['ミート',match.contact],['パワー',match.power],['走力',g.runnerRating(b)]]);
 card(pitcherCard,p,'P','P',NightGame.conditionInfo(g.conditionFor(p)),[
  ['コントロール',p.control+g.conditionFor(p)*3],['スタミナ',p.stamina*(1-fatigue)]
 ]);
}
