import * as T from './vendor/three.module.min.js';

const faceWidth=1600, faceHeight=840;
const names={
 'tokyo-dome':'TOKYO DOME',dome:'樂天桃園棒球場','taipei-dome':'臺北大巨蛋',
 night:'臺中洲際棒球場',brick:'天母棒球場',sky:'亞太國際棒球訓練中心',
 harbor:'新莊棒球場',river:'澄清湖棒球場',toyama:'富山市民球場'
};
const colors={
 'tokyo-dome':{ink:'#131417',line:'#54565f',label:'#dfe2e5',accent:'#e31f51',digits:'#11151c'},
 dome:{ink:'#2b0a64',line:'#b96de2',label:'#fff5ee',accent:'#eb40b0',digits:'#ffb1ee'},
 'taipei-dome':{ink:'#0c194c',line:'#3e64bf',label:'#f1f5ff',accent:'#f03b9d',digits:'#fdf3ff'},
 night:{ink:'#211d1b',line:'#675549',label:'#ffeacf',accent:'#b06933',digits:'#fff4df',art:['#946239','#2b1c18']},
 brick:{ink:'#1f1a1e',line:'#684742',label:'#fff3e9',accent:'#a8343d',digits:'#fff4ee',art:['#71363b','#261e25']},
 sky:{ink:'#2a211d',line:'#9a5b3d',label:'#fff2df',accent:'#ce5819',digits:'#fff2de',art:['#b35b2c','#412923']},
 harbor:{ink:'#091c3c',line:'#3c78b2',label:'#eef5fc',accent:'#1769ac',digits:'#eff6ff',art:['#1359a1','#102548']},
 river:{ink:'#1c2d25',line:'#627c61',label:'#e2e5cf',accent:'#4f7446',digits:'#f9e5a9',art:['#4e7863','#23382b']},
 toyama:{ink:'#12191f',line:'#53554c',label:'#eee1c0',accent:'#873237',digits:'#ffe1a3',art:['#244052','#1e252b']}
};
function rect(c,color,x,y,w,h){c.fillStyle=color;c.fillRect(x,y,w,h);}
function text(c,value,x,y,size,color='#fff',max=0,align='center'){
 c.font='900 '+size+'px system-ui,sans-serif';c.fillStyle=color;c.textAlign=align;
 const label=String(value??'');
 const rendered=globalThis.NightI18n?.text(label)??label;
 if(max)c.fillText(rendered,x,y,max);else c.fillText(rendered,x,y);
}
function gradient(c,x,y,w,h,from,to){
 const fill=c.createLinearGradient(x,y,x+w,y+h);
 fill.addColorStop(0,from);fill.addColorStop(1,to);rect(c,fill,x,y,w,h);
}
function clubName(club){return club?.short||club?.name||'—';}
function logo(c,club,images,x,y,size){
 const image=images.get(club?.id);
 if(image?.complete&&image.naturalWidth){
  const ratio=size/Math.max(image.naturalWidth,image.naturalHeight);
  const w=image.naturalWidth*ratio,h=image.naturalHeight*ratio;
  c.drawImage(image,x-w/2,y-h/2,w,h);
 }else text(c,club?.scoreMark||club?.mark||'',x,y+size*.25,size*.72,'#e2e8f9',size*1.6);
}

function lineup(c,g,side,images,theme,x,y,w,h){
 const club=g?.teams?.[side],p=g?.pitchingStaff?.[side]?.[side===g.userSide?g.homePitcherIndex:g.awayPitcherIndex];
 const list=g?.lineups?.[side]??[],active=g?.side===side?g.batter?.id:null;
 const tokyo=theme==='tokyo-dome',taoyuan=theme==='dome',pal=colors[theme];
 const title=h*.14,row=(h-title)/10;
 rect(c,taoyuan?'#ebe3e7':pal.ink,x,y,w,h);
 gradient(c,x,y,w,title,tokyo?'#202023':taoyuan?'#7c104a':pal.art?.[0]??'#df164f',tokyo?'#333439':taoyuan?'#420a56':pal.ink);
 text(c,clubName(club),x+w*.53,y+title*.65,title*.46,'#fff',w*.69);
 logo(c,club,images,x+w*.11,y+title*.51,title*.72);
 for(let i=0;i<10;i++){
  const player=i===9?p:list[i],top=y+title+i*row,selected=player&&player.id===active;
  rect(c,selected?pal.accent:taoyuan?'#28142f':i%2?pal.ink:tokyo?'#292a2e':pal.art?.[1]??'#142455',x,top,w,row-2);
  const cy=top+row*.72,fs=row*.67;
  text(c,i===9?'P':i+1,x+w*.075,cy,fs,selected?'#fff':'#e6dbff');
  text(c,player?.pos??'',x+w*.21,cy,fs*.77,'#c5c9dd',w*.15);
  text(c,player?.name??'',x+w*.31,cy,fs,'#fff',w*.54,'left');
  text(c,player?.no??'',x+w*.92,cy,fs,'#ffd586',w*.15);
 }
}

function score(c,g,images,theme,x,y,w,h){
 const pal=colors[theme],current=Math.max(1,g?.inning??1),first=Math.max(1,current-8);
 const header=h*.25,row=(h-header)/2,label=w*.19,col=(w-label)/12;
 const tokyo=theme==='tokyo-dome',taoyuan=theme==='dome';
 const scoreboard=g?.displayScore?.()??{away:g?.awayScore,home:g?.homeScore};
 rect(c,pal.ink,x,y,w,h);
 rect(c,tokyo?'#292a30':taoyuan?'#4a186f':pal.art?.[1]??'#182850',x,y,w,header);
 text(c,tokyo?'TIME':taoyuan?'局數':'R H E',x+label*.5,y+header*.72,header*.62,pal.label,label*.84);
 for(let i=0;i<12;i++){
  const tx=x+label+i*col+col/2;
  text(c,i<9?first+i:'RHE'[i-9],tx,y+header*.72,Math.min(header*.70,col*.79),pal.label);
 }
 for(const [r,side] of ['away','home'].entries()){
  const cy=y+header+row*r,scores=g?.[side]??[],club=g?.teams?.[side];
  const active=g?.side===side;
  rect(c,tokyo?'#dbdce2':taoyuan?'#eee3ef':pal.art?.[1]??'#17295e',x,cy,label-1,row-1);
  if(active)rect(c,pal.accent,x,cy,5,row-1);
  logo(c,club,images,x+label*.19,cy+row*.50,Math.min(label*.31,row*.70));
  text(c,clubName(club),x+label*.61,cy+row*.70,Math.min(row*.50,label*.18),tokyo||taoyuan?'#24202c':'#fff',label*.66);
  for(let i=0;i<12;i++){
   const inning=first+i,tx=x+label+i*col;
   const lit=i<9&&active&&inning===current;
   const cell=i===9?(scoreboard?.[side]??0):i===10?(g?.[side+'Hits']??0):i===11?(g?.[side+'Errors']??0):
    i<9?((scores[inning-1]??(lit?0:''))!==''
      ?(scores[inning-1]??0)+(lit?(scoreboard?.[side]??0)-(g?.[side+'Score']??0):0):''):'';
   const back=tokyo?(i<9?(lit?'#f1d5db':i%2?'#caced6':'#e0e3e9'):'#1a1b20'):
    lit?(pal.art?pal.accent:'#653997'):taoyuan?(i%2?'#47126e':'#37125f'):
     pal.art?(i%2?pal.ink:pal.art[1]):(i%2?'#111f57':'#152763');
   rect(c,back,tx,cy,col-1,row-1);
   text(c,cell,tx+col/2,cy+row*.72,Math.min(row*.69,col*.70),tokyo?(i<9?pal.digits:'#f7f7fa'):pal.digits);
  }
 }
}

function count(c,g,theme,x,y,w,h){
 const pal=colors[theme];
 rect(c,theme==='dome'?'#260944':'#14161d',x,y,w,h);
 const cells=[['B',g?.balls,3,'#37ee98'],['S',g?.strikes,2,'#ffc544'],['O',g?.outs,2,'#ff4c77']];
 cells.forEach(([letter,n,max,color],i)=>{
  const start=x+w*(.055+i*.237);
  text(c,letter,start,y+h*.71,h*.63,pal.label);
  for(let j=0;j<max;j++){
   c.beginPath();c.arc(start+w*(.05+j*.037),y+h*.48,Math.min(w*.014,h*.15),0,Math.PI*2);
   c.fillStyle=j<(n??0)?color:'#3c4050';c.fill();
  }
 });
 const n=g?.pitchingStats?.[g.pitcher?.id]?.pitches??0;
 text(c,(theme==='tokyo-dome'?'PITCH ':'NP ')+n,x+w*.91,y+h*.67,h*.44,pal.label,w*.17);
}

// Render the current game’s player in the same stylized proportions as the field models.
function portrait(c,club,player,x,y,w,h){
 const color=club?.color||'#465180',skin='#e5af88',dark='#192238';
 const ellipse=(cx,cy,rx,ry,ink)=>{
  c.beginPath();c.ellipse(x+w*cx,y+h*cy,w*rx,h*ry,0,0,Math.PI*2);c.fillStyle=ink;c.fill();
 };
 c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
 ellipse(.5,.89,.44,.44,'#eee9ed');
 rect(c,color,x+w*.25,y+h*.65,w*.50,h*.065);
 ellipse(.50,.42,.33,.29,skin);
 ellipse(.30,.41,.041,.047,dark);ellipse(.68,.41,.041,.047,dark);
 ellipse(.50,.24,.348,.185,color);
 ellipse(.55,.30,.40,.067,color);ellipse(.55,.325,.37,.018,dark);
 text(c,club?.scoreMark||club?.mark||'',x+w*.50,y+h*.254,h*.108,'#fff',w*.38);
 text(c,player?.no??'',x+w*.53,y+h*.87,h*.21,color,w*.6);
 c.restore();
}

function presentation(c,g,images,theme,x,y,w,h){
 const club=g?.teams?.[g.side],player=g?.batter,other=g?.pitcher;
 const taoyuan=theme==='dome';
 const art=colors[theme].art;
 gradient(c,x,y,w,h,taoyuan?'#542288':art?.[0]??'#194cd0',taoyuan?'#260047':art?.[1]??'#100d39');
 for(let i=0;i<9;i++){
  c.beginPath();c.moveTo(x+w*(.04+i*.108),y);c.lineTo(x+w*(.14+i*.108),y);
  c.lineTo(x+w*(.01+i*.108),y+h);c.lineTo(x+w*(-.04+i*.108),y+h);
  c.fillStyle=art?'#fff3cb1d':i%3?'#9456ff24':'#f66ffb35';c.fill();
 }
 const event=g?.phase==='result'?{hr:'HOME RUN',single:'BASE HIT',double:'DOUBLE',triple:'TRIPLE'}[g.hit?.kind]:null;
 const tag=event||(g?.derby?'HOME RUN DERBY':g?.mode==='practice'?'BATTING PRACTICE':names[theme]);
 text(c,tag,x+w*.63,y+h*.16,h*.080,'#f4dcff',w*.67);
 if(player){
  portrait(c,club,player,x+w*.025,y+h*.11,w*.34,h*.88);
  text(c,player.name,x+w*.66,y+h*.39,h*.14,'#fff',w*.55);
  const stats=player.stats??{},live=g.box?.[player.id]??{};
  const avg=stats.ab>0&&Number.isFinite(stats.h)?(stats.h/stats.ab).toFixed(3):'—';
  const rows=taoyuan?[['打擊率',avg],['安打',live.h??0],['全壘打',live.hr??0],['打點',live.rbi??0]]:
   [['PITCHER',other?.name||'—'],['KM/H',g.pitch?.speed??'—']];
  rows.forEach(([label,value],i)=>{
   text(c,label,x+w*.44,y+h*(.54+i*.095),h*.063,'#e6cdfd',w*.21,'left');
   text(c,value,x+w*.83,y+h*(.54+i*.095),h*.065,'#fff',w*.39);
  });
 }else{
  logo(c,club,images,x+w*.5,y+h*.56,h*.41);
  text(c,'NIGHTBALL',x+w*.5,y+h*.78,h*.16,'#fff',w*.8);
 }
}

function tokyo(c,g,images){
 const w=2304,h=256,pal=colors['tokyo-dome'];
 rect(c,'#121316',0,0,w,h);
 for(const [i,side] of ['away','home'].entries()){
  const x=i?2004:0,club=g?.teams?.[side];
  gradient(c,x,0,300,h,i?'#eef2eb':'#1779b1',i?'#bac7be':'#102448');
  logo(c,club,images,x+150,109,108);
  text(c,clubName(club),x+150,198,31,i?'#122b38':'#f7fbff',265);
 }
 lineup(c,g,'away',images,'tokyo-dome',317,1,243,253);
 lineup(c,g,'home',images,'tokyo-dome',1745,1,241,253);
 const pitcherSide=g?.side==='home'?'away':'home';
 const left=g?.side==='away'?g.batter:g?.pitcher,right=g?.side==='home'?g.batter:g?.pitcher;
 if(left)portrait(c,g.teams.away,left,568,17,174,235);
 if(right)portrait(c,g.teams.home,right,1564,17,173,235);
 score(c,g,images,'tokyo-dome',750,3,807,139);
 count(c,g,'tokyo-dome',750,148,807,42);
 rect(c,pal.line,750,191,807,2);
 text(c,'投手  '+(g?.teams?.[pitcherSide]?g.pitcher?.name??'—':'—'),902,228,25,pal.label,270);
 text(c,g?.derby?'HOME RUN DERBY':g?.hit?.kind==='hr'?'HOME RUN!':g?.pitch?.speed?g.pitch.speed+' km/h':'NIGHTBALL',1160,228,30,'#fff5da',285);
 text(c,'打者  '+(g?.batter?.name??'—'),1420,228,25,pal.label,255);
}

function chengcingPanel(c,g,images){
 const theme='river';
 rect(c,colors[theme].ink,0,0,faceWidth,faceHeight);
 presentation(c,g,images,theme,0,0,731,faceHeight);
 rect(c,'#506b58',732,0,14,faceHeight);
 const x=747,mid=563,rest=faceWidth-x-mid;
 score(c,g,images,theme,x,0,faceWidth-x,252);
 presentation(c,g,images,theme,x,254,mid,422);
 count(c,g,theme,x,678,mid,162);
 lineup(c,g,'home',images,theme,x+mid+4,252,rest-4,588);
}

function alpenPanel(c,g,images){
 const theme='toyama',width=253;
 rect(c,colors[theme].ink,0,0,faceWidth,faceHeight);
 lineup(c,g,'away',images,theme,0,0,width,faceHeight);
 lineup(c,g,'home',images,theme,faceWidth-width,0,width,faceHeight);
 const middle=faceWidth-width*2;
 score(c,g,images,theme,width,0,middle,226);
 const left=336;
 count(c,g,theme,width,239,left,126);
 const ballSpeed=g?.pitch?.speed?Math.round(g.pitch.speed)+' km/h':'—';
 text(c,ballSpeed,width+left*.5,428,47,'#fbb35d',left*.89);
 text(c,'富 山 市 民 球 場',width+left*.5,758,34,'#dce5e5',left*.93);
 presentation(c,g,images,theme,width+left+12,245,middle-left-12,595);
}

function xinzhuangAuxiliary(canvas,g,images){
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
 gradient(c,0,0,w,h,'#0e254c','#13579f');
 rect(c,'#067bb9',0,0,w,87);
 const home=g?.teams?.home,away=g?.teams?.away;
 text(c,'GUARDIANS',w/2,62,52,'#eff7ff',w*.88);
 logo(c,away,images,w*.22,h*.39,h*.25);
 logo(c,home,images,w*.78,h*.39,h*.25);
 const runs=g?.displayScore?.();
 text(c,(runs?.away??0)+'  –  '+(runs?.home??0),w*.5,h*.49,104,'#fff',w*.44);
 text(c,clubName(away),w*.22,h*.62,39,'#e1edfc',w*.36);
 text(c,clubName(home),w*.78,h*.62,39,'#e1edfc',w*.36);
 text(c,g?.derby?'HOME RUN DERBY':g?.pitch?.speed?Math.round(g.pitch.speed)+' km/h':'新莊棒球場',w*.5,h*.82,52,'#b6e8fb',w*.86);
}

export function venueVision(renderer,id,variant='main'){
 const cache=renderer.venueVisionCache??=new Map();
 const key=variant==='main'?id:id+':'+variant;
 if(!cache.has(key)){
  const canvas=document.createElement('canvas');
  canvas.width=id==='tokyo-dome'?2304:variant==='auxiliary'?1140:faceWidth;
  canvas.height=id==='tokyo-dome'?256:variant==='auxiliary'?750:faceHeight;
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const material=new T.MeshBasicMaterial({map:texture,side:T.DoubleSide,fog:false,toneMapped:false});
  cache.set(key,{canvas,material});
 }
 return cache.get(key);
}

function drawProVision(c,g,images,id,vision){
 const w=faceWidth,h=faceHeight,name=vision.name;
 colors[id]={ink:'#101818',line:'#4c5c5c',label:'#e1e9e6',accent:vision.accent,digits:vision.classic?'#f0df95':'#f5f6ea',
  art:[vision.accent,vision.classic?'#242b22':'#17262b']};
 rect(c,colors[id].ink,0,0,w,h);
 gradient(c,0,0,w,100,vision.accent,'#121b20');
 text(c,name,w/2,70,61,'#f6f4e8',w*.90);
 if(vision.classic){
  score(c,g,images,id,14,114,w-28,344);
  count(c,g,id,14,467,w-28,94);
  const side=g?.side??'away';
  const order=g?.lineups?.[side]??[];
  for(let i=0;i<9;i++){
   const x=(i+.5)*w/9;
   text(c,i+1,x,645,34,'#f0df95');
   text(c,order[i]?.name??'',x,726,42,'#f4f4e9',w*.104);
  }
  return;
 }
 const wing=vision.wide?268:298,bottom=620;
 for(const [i,side] of ['away','home'].entries()){
  lineup(c,g,side,images,id,i?w-wing:0,106,wing,bottom-106);
 }
 const mid=w-2*wing,active=g?.teams?.[g?.side],player=g?.batter;
 gradient(c,wing,106,mid,414,'#24363b',colors[id].ink);
 logo(c,active,images,w*.50,234,148);
 text(c,player?.name??(g?.derby?'HOME RUN DERBY':'PLAY BALL'),w*.50,375,67,'#fff',mid*.88);
 text(c,g?.pitch?.speed?Math.round(g.pitch.speed)+' km/h':'',w*.50,453,56,'#c4d9e5',mid*.8);
 count(c,g,id,wing,520,mid,100);
 score(c,g,images,id,0,bottom,w,h-bottom);
}

export function drawVenueVision(renderer,id,game){
 const {canvas,material}=venueVision(renderer,id),c=canvas.getContext('2d'),images=renderer.clubImages;
 if(renderer.proVision)drawProVision(c,game,images,id,renderer.proVision);
 else if(id==='tokyo-dome')tokyo(c,game,images);
 else if(id==='river')chengcingPanel(c,game,images);
 else if(id==='toyama')alpenPanel(c,game,images);
 else{
  const taoyuan=id==='dome',wing=taoyuan?319:304,liveHeight=taoyuan?665:626;
  rect(c,colors[id].ink,0,0,faceWidth,faceHeight);
  for(const [i,side] of ['away','home'].entries()){
   lineup(c,game,side,images,id,i?faceWidth-wing:0,0,wing,taoyuan?faceHeight:liveHeight);
  }
  const mid=faceWidth-wing*2;
  presentation(c,game,images,id,wing,0,mid,liveHeight-99);
  count(c,game,id,wing,liveHeight-99,mid,99);
  score(c,game,images,id,taoyuan?wing:0,liveHeight,taoyuan?mid:faceWidth,faceHeight-liveHeight);
 }
 if(game?.derby?.enhanced){const w=canvas.width,h=canvas.height;gradient(c,w*.23,h*.12,w*.54,h*.65,'#061329','#163963');text(c,'HOME RUN DERBY',w*.5,h*.26,h*.09,'#9ddfff',w*.49);text(c,game.batter.name,w*.5,h*.39,h*.09,'#fff',w*.48);text(c,(game.derby.turnHR||0)+' HR',w*.5,h*.67,h*.22,'#ffdc6c',w*.49);}
 const cut=game?.phase==='cinematic'?game.broadcastCut:null,k=cut?.kind==='strikeout'?cut:game?.phase==='result'?game.pitch?.strikeCelebration:null,hr=cut?.kind==='homer'?cut:game?.phase==='result'&&game.hit?.kind==='hr'?(game.field?.homerCelebration||{}):null;
 if(k||hr){const w=canvas.width,h=canvas.height,side=k?k.side:game.side,club=game.teams[side],accent=typeof club?.color==='string'?club.color:k?'#57cfff':'#ffdc77',left=w*.24,top=h*.14,width=w*.52,height=h*.62;gradient(c,left,top,width,height,'#061321','#182b48');rect(c,accent,left,top,width,Math.max(3,h*.025));text(c,k?'STRIKEOUT':hr.tag||'HOME RUN',w*.5,top+height*.49,Math.min(height*.30,width*.10),'#fff',width*.93);text(c,k?`${k.ks||1} K`:(hr.distance||game.hit?.distance||0)+' m'+(game.derby?' · '+game.derby.turnHR+' HR':''),w*.5,top+height*.84,height*.20,k?'#85ddff':'#ffdf79',width*.9);}
 material.map.needsUpdate=true;
 if(id==='harbor'){
  const secondary=venueVision(renderer,id,'auxiliary');
  xinzhuangAuxiliary(secondary.canvas,game,images);
  secondary.material.map.needsUpdate=true;
 }
}
