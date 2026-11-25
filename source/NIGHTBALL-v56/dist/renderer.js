/* Procedural stadium art: no remote images or runtime dependencies. */
window.NightRenderer=class NightRenderer{
  constructor(canvas,hero=false){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.hero=hero;this.width=0;this.height=0;this.art=this.createStadium();this.resize();}
  resize(){const r=this.canvas.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,2);if(!r.width||!r.height)return;if(this.width===r.width&&this.height===r.height)return;this.width=r.width;this.height=r.height;this.canvas.width=Math.round(r.width*d);this.canvas.height=Math.round(r.height*d);}
  path(c,points,fill,stroke,width=1){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
  ellipse(c,x,y,rx,ry,fill,stroke){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
  createStadium(){
    const art=document.createElement('canvas');art.width=960;art.height=1080;const c=art.getContext('2d');c.scale(2,2);
    let g=c.createLinearGradient(0,0,0,540);g.addColorStop(0,'#0d1b21');g.addColorStop(.42,'#183632');g.addColorStop(1,'#17382b');c.fillStyle=g;c.fillRect(0,0,480,540);
    for(let i=0;i<45;i++){const x=(i*89.47)%480,y=(i*37.91)%160;c.fillStyle=`rgba(211,232,201,${.12+(i%4)*.08})`;c.fillRect(x,y,1,1);}
    this.ellipse(c,367,61,17,17,'#d7e7bc');this.ellipse(c,361,56,17,17,'#0e1e23');
    for(let i=0;i<28;i++){const x=i*21-20,y=126+Math.sin(i*7)*22,h=24+(i*31)%48;c.fillStyle=i%2?'#122a2c':'#0c2226';c.fillRect(x,y,17,h+40);for(let k=0;k<4;k++){c.fillStyle=(i+k)%3?'#8ca57822':'#c6cf7944';c.fillRect(x+4,y+8+k*10,2,3);}}
    // Grandstands, built as nested ellipses.
    this.ellipse(c,240,229,345,105,'#0d2225','#46665d');
    this.ellipse(c,240,229,333,96,'#203e3a');
    for(let row=0;row<11;row++){
      const ry=91-row*3.8,rx=330-row*2.9;
      c.beginPath();c.ellipse(240,229,rx,ry,0,Math.PI,2*Math.PI);c.strokeStyle=row%3===0?'#76928766':'#48685b66';c.lineWidth=1;c.stroke();
      for(let j=0;j<100;j++){const a=Math.PI+(j/100)*Math.PI,x=240+rx*Math.cos(a),y=229+ry*Math.sin(a);c.fillStyle=['#a6b5a36b','#c6be834f','#5b877367','#d5ddc646','#253f3588'][(j*13+row*7)%5];c.fillRect(x,y,1.7,1.6);}
    }
    this.ellipse(c,240,244,330,76,'#365147');
    c.fillStyle='#152f2c';c.fillRect(0,198,480,38);
    c.fillStyle='#587263';c.fillRect(0,198,480,2);
    c.fillStyle='#b2c6ac';c.textAlign='center';c.font='bold italic 9px Arial';c.fillText('NIGHTBALL',63,215);c.font='7px Arial';c.fillStyle='#adbd9366';c.fillText('ONE SWING. ONE MORE NIGHT.',235,216);c.fillStyle='#d5f36a';c.font='bold 9px Arial';c.fillText('09',425,215);
    // Center-field video board.
    c.fillStyle='#14231e';c.fillRect(185,129,110,55);c.strokeStyle='#4d7059';c.strokeRect(185,129,110,55);c.fillStyle='#10201b';c.fillRect(190,134,100,45);c.fillStyle='#c7e98c';c.font='bold italic 14px Arial';c.fillText('NIGHT PARK',240,153);c.fillStyle='#6b9275';c.font='6px Arial';c.fillText('WELCOME TO THE NIGHT',240,168);
    // Light towers and bloom.
    for(const x of [25,455]){
      c.strokeStyle='#6c8274';c.lineWidth=3;c.beginPath();c.moveTo(x,90);c.lineTo(x,204);c.stroke();
      c.strokeStyle='#35584b';c.lineWidth=1;c.beginPath();c.moveTo(x-5,204);c.lineTo(x+4,91);c.moveTo(x+5,204);c.lineTo(x-4,91);c.stroke();
      const glow=c.createRadialGradient(x,91,2,x,91,110);glow.addColorStop(0,'#e6ffd84d');glow.addColorStop(.3,'#daf3c51c');glow.addColorStop(1,'#ddf8cd00');c.fillStyle=glow;c.fillRect(x-110,-20,220,220);
      c.fillStyle='#506b5e';c.fillRect(x-24,74,48,25);for(let a=0;a<6;a++)for(let b=0;b<3;b++){c.fillStyle=b===1?'#efffdc':'#c9e8c4';c.fillRect(x-21+a*7.5,77+b*7,5,4);}
      c.beginPath();c.moveTo(x-20,99);c.lineTo(x+90,360);c.lineTo(x-115,360);c.closePath();const beam=c.createLinearGradient(0,100,0,360);beam.addColorStop(0,'#e4ffd10c');beam.addColorStop(1,'#e4ffd100');c.fillStyle=beam;c.fill();
    }
    // Grass stripes projected across the outfield.
    this.ellipse(c,240,399,390,183,'#28573a');
    c.save();c.beginPath();c.ellipse(240,399,390,183,0,0,Math.PI*2);c.clip();
    for(let i=-5;i<12;i++){this.path(c,[[240+i*95,190],[240+(i+1)*95,190],[240+(i+1)*190,570],[240+i*190,570]],i%2?'#356542':'#2c5b3c');}
    // Warning track and padded wall.
    c.beginPath();c.ellipse(240,399,390,183,0,Math.PI,Math.PI*2);c.strokeStyle='#9b8060';c.lineWidth=11;c.stroke();
    c.beginPath();c.ellipse(240,399,390,190,0,Math.PI,Math.PI*2);c.strokeStyle='#214a37';c.lineWidth=9;c.stroke();c.restore();
    // Infield, grass island and clay paths.
    this.path(c,[[240,462],[106,355],[240,267],[374,355]],'#a38859');
    this.path(c,[[240,429],[151,353],[240,295],[329,353]],'#396343');
    this.ellipse(c,240,348,26,12,'#b29a6a');this.ellipse(c,240,454,43,22,'#ac9365');
    c.strokeStyle='#dce6c0b3';c.lineWidth=1.3;c.beginPath();c.moveTo(-80,210);c.lineTo(240,456);c.lineTo(560,210);c.stroke();
    this.path(c,[[240,456],[365,353],[240,278],[115,353]],null,'#dce6c036');
    for(const [x,y]of [[115,353],[240,278],[365,353]])this.path(c,[[x,y-4],[x+7,y],[x,y+4],[x-7,y]],'#edf0cd');
    this.path(c,[[234,451],[246,451],[246,456],[240,461],[234,456]],'#f3efcf');
    c.fillStyle='#e7dfc0';c.fillRect(232,346,16,2);
    c.strokeStyle='#d8ddbc66';c.lineWidth=.8;c.strokeRect(207,443,18,23);c.strokeRect(255,443,18,23);
    // Fielders.

    const vignette=c.createRadialGradient(240,330,90,240,330,390);vignette.addColorStop(0,'#00171000');vignette.addColorStop(1,'#00100c70');c.fillStyle=vignette;c.fillRect(0,0,480,540);
    return art;
  }
  fielder(c,x,y,s){
    c.save();c.translate(x,y);c.scale(s*2,s*2);this.ellipse(c,0,3,15,5,'#001c1855');
    c.strokeStyle='#b6c0a8';c.lineWidth=9;c.lineCap='round';c.beginPath();c.moveTo(-4,-13);c.lineTo(-7,0);c.moveTo(4,-13);c.lineTo(7,0);c.stroke();
    c.fillStyle='#d6d8bd';c.fillRect(-10,-35,20,24);this.ellipse(c,0,-43,9,9,'#c2996e');c.fillStyle='#e78054';c.fillRect(-10,-51,20,7);c.fillRect(-8,-46,23,3);c.restore();
  }
  pitcher(c,g){
    c.save();c.translate(240,345);c.scale(g?.pitcher.hand==='L'?-1.46:1.46,1.46);this.ellipse(c,0,3,19,7,'#001c1866');
    const wind=g&&g.phase==='windup'?Math.sin(Math.min(1,g.phaseTime/850)*Math.PI):0;
    c.lineCap='round';c.lineWidth=9;c.strokeStyle='#e2dfc5';c.beginPath();c.moveTo(-5,-23);c.lineTo(-9,0);c.moveTo(5,-23);c.lineTo(10+wind*9,-wind*13);c.stroke();
    this.path(c,[[-12,-56],[11,-56],[13,-23],[-10,-23]],g?.defending?'#d1ef83':'#dbd9bf');c.fillStyle='#db825a';c.fillRect(-11,-29,24,4);
    c.strokeStyle='#e6e0c8';c.lineWidth=9;c.beginPath();c.moveTo(-10,-50);c.lineTo(-17,-35-wind*24);c.moveTo(10,-50);c.lineTo(18+wind*4,-38-wind*27);c.stroke();
    this.ellipse(c,18+wind*4,-38-wind*27,7,8,'#826447');this.ellipse(c,0,-66,9,10,'#c9a078');c.fillStyle=g?.defending?'#4e733e':'#dc865e';c.fillRect(-10,-74,20,7);c.fillRect(-9,-68,24,3);c.fillStyle='#714c37';c.fillRect(-4,-59,8,2);
    c.restore();
  }
  batter(c,g,t){
    c.save();c.translate((g?.battingHand||g?.batter.hand)==='L'?420:60,520);c.scale(2,2);if((g?.battingHand||g?.batter.hand)==='L')c.scale(-1,1);
    const sw=g?g.swingAge:9999;const swing=sw<450?Math.sin(Math.min(1,sw/230)*Math.PI*.8):0;
    this.ellipse(c,0,4,30,9,'#00170f88');
    c.strokeStyle='#d8e5c4';c.lineWidth=13;c.lineCap='round';c.beginPath();c.moveTo(-4,-37);c.lineTo(-15,0);c.moveTo(11,-37);c.lineTo(23,0);c.stroke();
    c.strokeStyle='#192d24';c.lineWidth=9;c.beginPath();c.moveTo(-15,0);c.lineTo(-24,3);c.moveTo(23,0);c.lineTo(32,3);c.stroke();
    this.path(c,[[-16,-83],[9,-84],[21,-40],[-7,-35]],(g?.defending?'#e89d76':'#d1ef83'));this.path(c,[[-16,-83],[-9,-57],[-7,-35],[-17,-46]],(g?.defending?'#bd7857':'#a7c56b'));
    c.save();c.translate(4,-65);c.rotate(-.1);c.fillStyle='#25452c';c.font='bold 13px Arial';c.textAlign='center';c.fillText(String(g?.batter.no||9).padStart(2,'0'),0,0);c.restore();
    c.strokeStyle='#c7df9d';c.lineWidth=11;c.beginPath();c.moveTo(-10,-73);c.lineTo(7+swing*13,-60);c.lineTo(22+swing*16,-66+swing*8);c.moveTo(9,-75);c.lineTo(21+swing*12,-65+swing*7);c.stroke();
    this.ellipse(c,-4,-98,13,14,'#c59b70');this.ellipse(c,-5,-106,15,10,'#263f2b');c.fillStyle='#243d29';c.fillRect(-7,-105,27,6);c.fillRect(6,-103,5,16);c.fillStyle='#e2f3c4';c.fillRect(-7,-112,4,2);
    const hx=23+swing*15,hy=-66+swing*8;this.ellipse(c,hx,hy,6,5,'#ecede0');
    const ang=-1.40+swing*2.6;c.strokeStyle='#d8ba7b';c.lineWidth=7;c.beginPath();c.moveTo(hx,hy);c.lineTo(hx+Math.cos(ang)*75,hy+Math.sin(ang)*75);c.stroke();c.strokeStyle='#eddaad';c.lineWidth=2;c.beginPath();c.moveTo(hx+Math.cos(ang)*30,hy+Math.sin(ang)*30);c.lineTo(hx+Math.cos(ang)*73,hy+Math.sin(ang)*73);c.stroke();
    if(sw<250){c.strokeStyle=`rgba(213,243,106,${.4*(1-sw/250)})`;c.lineWidth=13;c.beginPath();c.arc(hx,hy,76,-1.3,1.1);c.stroke();}
    c.restore();
  }
  drawBall(c,x,y,r,rotation,glow=false){
    c.save();c.translate(x,y);c.rotate(rotation);if(glow){c.shadowColor='#f9e49a';c.shadowBlur=15;}this.ellipse(c,0,0,r,r,'#fffbdf');c.shadowBlur=0;
    if(r>3){c.strokeStyle='#c16f59';c.lineWidth=Math.max(.6,r*.11);c.beginPath();c.arc(-r*.5,0,r*.7,-1,1);c.stroke();c.beginPath();c.arc(r*.5,0,r*.7,2.14,4.14);c.stroke();}c.restore();
  }
  pitchPoint(g,u){
    const ball=g.pitchAt(u),depth=Math.min(1,u),approach=u**1.65;
    return {x:240+25*approach+ball.x*(22.4+52.6*depth),y:294+106*approach+ball.y*(22+42*depth)};
  }
  person(c,x,y,scale,team,running,t,label='',action='',pace=1){
    c.save();c.translate(x,y);c.scale(scale*2,scale*2);this.ellipse(c,0,2,14,5,'#001a1480');
    const catching=action==='catch'||action==='jump';
    if(action==='jump')c.translate(0,-11);
    if(action==='dive'||action==='slide'){c.translate(0,3);c.rotate(action==='dive'?1.03:-.79);}
    const stride=running?Math.sin(t*.015*pace+x)*9*pace:0;
    c.lineWidth=7;c.lineCap='round';c.strokeStyle='#dee4cd';c.beginPath();c.moveTo(-4,-18);c.lineTo(-7-stride,0);c.moveTo(4,-18);c.lineTo(7+stride,0);c.stroke();
    const jersey=team==='home'?'#d5f36a':'#eaa27b';c.fillStyle=jersey;c.fillRect(-9,-40,18,24);
    c.strokeStyle=jersey;c.lineWidth=6;c.beginPath();c.moveTo(-8,-36);c.lineTo(-14,-25-stride);c.moveTo(8,-36);c.lineTo(catching?14:14,catching?-51:-25+stride);c.stroke();
    this.ellipse(c,14,catching?-51:-25+stride,5,6,'#aa8151');this.ellipse(c,0,-48,8,9,'#ceab81');c.fillStyle=team==='home'?'#274b31':'#984e36';c.fillRect(-9,-56,18,7);c.fillRect(-7,-50,20,3);
    if(label){c.fillStyle='#273d2b';c.font='bold 7px Arial';c.textAlign='center';c.fillText(label,0,-26);}c.restore();
  }
  fieldPoint(x,y,z=0){return{x:240+x*2.5,y:500-y*2.8-z*3.4};}
  fieldView(c,g,t){
    const f=g.field,b=f.ball,project=(x,y,z=0)=>this.fieldPoint(x,y,z);
    c.fillStyle='#10221e';c.fillRect(0,0,480,540);
    const grad=c.createLinearGradient(0,0,0,540);grad.addColorStop(0,'#0c1b20');grad.addColorStop(1,'#244a32');c.fillStyle=grad;c.fillRect(0,0,480,540);
    // Outfield wall follows the same dimensions as the physics model.
    const arc=[];for(let i=0;i<=90;i++){const a=-Math.PI/4+i/90*Math.PI/2,r=NightPlayers.wallDistance(g.park,a),p=project(Math.sin(a)*r,Math.cos(a)*r);arc.push([p.x,p.y]);}
    const sector=[[240,500],...arc,[240,500]];
    this.path(c,sector,'#2b593b');c.save();this.path(c,sector);c.clip();
    for(let i=0;i<13;i++){c.fillStyle=i%2?'#376744':'#2f5c3d';c.fillRect(0,500-i*32,480,16);}
    c.restore();
    for(let j=6;j>=0;j--){c.beginPath();arc.forEach(([x,y],i)=>i?c.lineTo(x,y-j*5-5):c.moveTo(x,y-j*5-5));c.strokeStyle=j%2?'#536951':'#284536';c.lineWidth=4;c.stroke();}
    c.beginPath();arc.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle='#ae9168';c.lineWidth=10;c.stroke();c.strokeStyle='#78915d';c.lineWidth=3;c.stroke();
    c.font='bold 7px Arial';c.textAlign='center';c.fillStyle='#d8dfb1';c.fillText(g.park.center+' m',240,500-g.park.center*2.8-10);c.fillText((g.park.left??g.park.corner)+' m',45,277);c.fillText((g.park.right??g.park.corner)+' m',435,277);
    const dp=NightGame.BASES.slice(0,4).map(v=>{const p=project(v.x,v.y);return[p.x,p.y];});this.path(c,dp,'#a58a5b');
    this.path(c,[[240,484],[274,445],[240,407],[206,445]],'#376442');
    const mound=project(0,18.4);this.ellipse(c,mound.x,mound.y,12,6,'#b79c6b');
    c.strokeStyle='#edf2c8b8';c.lineWidth=1;c.beginPath();c.moveTo(...arc[0]);c.lineTo(240,500);c.lineTo(...arc.at(-1));c.stroke();
    NightGame.BASES.slice(0,4).forEach((v,i)=>{const p=project(v.x,v.y);this.path(c,[[p.x,p.y-3],[p.x+4,p.y],[p.x,p.y+3],[p.x-4,p.y]],!g.replayView&&g.bases[i-1]?'#d5f36a':'#eeedce');});
    const indicator=g.replayView?null:g.landingIndicator();if(indicator){
     const p=project(indicator.x,indicator.y),ground=indicator.kind==='ground',fly=indicator.kind==='fly';
     const radius=ground?6+indicator.scale*5:fly?13+indicator.scale*22:9+indicator.scale*11;
     this.ellipse(c,p.x,p.y,radius,radius*.44,null,ground?'#ffc96a':fly?'#cdfff0':'#fff2bc');
     if(fly)this.ellipse(c,p.x,p.y,radius*.68,radius*.30,null,'#cdfff0a0');
    }
    const team=g.defending?'home':'away';
    f.fielders.forEach((p,i)=>{if(!g.replayView&&i===f.chaser&&!f.resolved){const loc=project(p.x,p.y);this.ellipse(c,loc.x,loc.y+2,9,4,null,'#e2eea7');}});
    const entities=f.fielders.map((p,i)=>({...p,i,runner:false}));
    if(!f.foul)entities.push(...f.runners.filter(p=>!p.out&&p.progress<3.999).map(p=>({...p,runner:true})));
    const elapsed=f.elapsed+(g.phase==='result'?g.phaseTime/1000:0);
    entities.sort((a,b)=>b.y-a.y).forEach(p=>{
     const q=project(p.x,p.y),action=p.runner?(p.slide&&elapsed-p.slide.time<.46?'slide':''):
      p.action&&elapsed-p.action.time<.43?p.action.type:'';
     const brake=p.runner?Math.max(.5,Math.min(1,.42+Math.abs((p.target??p.progress)-p.progress)*7)):1;
     const pace=Math.max(.58,Math.min(1.22,(p.speed||7)/(p.runner?7.45:6.65)))*brake;
     this.person(c,q.x,q.y,.45,p.runner?(g.defending?'away':'home'):team,p.running,t,p.runner?'':p.name,action,pace);
    });
    for(let i=0;i<f.trail.length;i++){const p=f.trail[i],q=project(p.x,p.y,p.z);c.globalAlpha=(i/f.trail.length)*.3;this.ellipse(c,q.x,q.y,2.2,2.2,'#fff3bf');}c.globalAlpha=1;
    const shadow=project(b.x,b.y),bp=project(b.x,b.y,b.z);this.ellipse(c,shadow.x,shadow.y,3+Math.min(5,b.z*.12),1.8,'#00150f99');
    c.strokeStyle='#eff9b52e';c.setLineDash([2,4]);c.beginPath();c.moveTo(shadow.x,shadow.y);c.lineTo(bp.x,bp.y);c.stroke();c.setLineDash([]);
    if(!(g.phase==='result'&&f.outcome==='hr'&&!g.derby)){
     this.drawBall(c,bp.x,bp.y,4*NightGame.ballVisualScale(b.z,Math.hypot(b.x,b.y)),t*.006,g.hit?.kind==='hr');
    }
    if(!g.replayView){
     const chaser=f.fielders[f.chaser];c.fillStyle='#d5e5c0';c.textAlign='left';c.font='bold 8px Arial';c.fillText(f.throw?'THROW TO BASE':f.resolved?'PLAY COMPLETE':'LIVE BALL',20,70);c.font='8px Arial';c.fillStyle='#a9bd9f';c.fillText(f.throw?'捕球 → 送球':`${chaser?.player||''}${chaser?' / '+chaser.name:''}`,20,84);
     c.textAlign='right';c.fillText(`${Math.round(f.maxTravel)} m`,460,70);
    }
    if(g.hit?.kind==='hr')for(let i=0;i<40;i++){const age=g.phaseTime/2000,d=age*(40+i*3);c.globalAlpha=Math.max(0,1-age);c.fillStyle=i%2?'#d5f36a':'#ffc58c';c.fillRect(240+Math.cos(i*2.4)*d,210+Math.sin(i*2.4)*d*.6+age*50,3,2);}c.globalAlpha=1;
  }
  render(g,t){
    this.resize();if(!this.width)return;const c=this.ctx;c.setTransform(this.canvas.width/480,0,0,this.canvas.height/540,0,0);c.clearRect(0,0,480,540);c.save();
    if(g?.field&&['field','result'].includes(g.phase)){this.fieldView(c,g,t);c.restore();return;}
    c.drawImage(this.art,0,0,480,540);
    for(const [x,y]of [[104,288],[375,288],[240,245],[148,326],[329,326],[186,290],[292,290]])this.person(c,x,y,.30,g?.defending?'home':'away',false,t);
    this.pitcher(c,g);this.batter(c,g,t);
    if(this.hero){const u=(t%5500)/5500;if(u>.6){const p=(u-.6)/.4;this.drawBall(c,244+110*p,405-330*p+120*p*p,5*(1-p)+1,t*.006,true);}c.restore();return;}
    if(g){
      // Umpire mode: same rule as the 3D HUD — no zone frame while a pitch
      // is live; the zone appears only in the post-call reveal window.
      const umpireReveal=g.umpireMode?g.umpireCallReveal?.():null;
      const aiming=!g.replayView&&((['aim','windup','pitch','miss'].includes(g.phase)&&!g.umpireMode)||!!umpireReveal);
      if(aiming){
        const x=265,y=400,w=150,h=128;
        c.fillStyle='#10271924';c.fillRect(x-w/2,y-h/2,w,h);c.lineWidth=.9;c.strokeStyle='#d9efba32';
        c.beginPath();for(let i=1;i<3;i++){c.moveTo(x-w/2+i*w/3,y-h/2);c.lineTo(x-w/2+i*w/3,y+h/2);c.moveTo(x-w/2,y-h/2+i*h/3);c.lineTo(x+w/2,y-h/2+i*h/3);}c.stroke();
        c.strokeStyle='#e8f6d888';c.lineWidth=1.5;c.beginPath();
        for(const [sx,sy]of [[-1,-1],[1,-1],[1,1],[-1,1]]){const px=x+sx*w/2,py=y+sy*h/2;c.moveTo(px-sx*13,py);c.lineTo(px,py);c.lineTo(px,py-sy*13);}c.stroke();
        if(umpireReveal){this.ellipse(c,x+umpireReveal.x*75,y+umpireReveal.y*64,6,6,umpireReveal.strike?'#7dff8a':'#ff9a7d','#14252d');}
        const last=g.pitchTrace.filter(p=>p.half===g.half&&p.inning===g.inning).at(-1);
        if(window.nightSettings?.showTrace&&!g.hardcore&&last&&['aim','windup'].includes(g.phase)){const px=x+last.x*75,py=y+last.y*64;this.ellipse(c,px,py,5,5,'#ffffff0b','#d0e0b65c');c.fillStyle='#b4c79a';c.font='5px Arial';c.textAlign='center';c.fillText('前球',px,py-9);}
        if(!umpireReveal){
        const cx=x+g.cursor.x*75,cy=y+g.cursor.y*64;
        if(g.touch){c.strokeStyle='#eaf4d454';c.lineWidth=1;c.setLineDash([2,4]);c.beginPath();c.moveTo(g.touch.x,g.touch.y-3);c.lineTo(cx,cy+10);c.stroke();c.setLineDash([]);this.ellipse(c,g.touch.x,g.touch.y,3,3,'#e6f3cb40');}
        if(!g.defending){
          const size=g.batSize,rx=size.rx*75,ry=size.ry*64,color=g.power?'#ffcf91':'#e1ff9d';
          c.shadowColor=color;c.shadowBlur=8;c.lineWidth=2;this.ellipse(c,cx,cy,rx,ry,g.power?'#ecc0761c':'#d7f39b1c',color);c.shadowBlur=0;
          c.lineWidth=.7;this.ellipse(c,cx,cy,Math.max(2,rx-4),Math.max(2,ry-4),null,g.power?'#ffdcaa55':'#e3ffc255');
          this.ellipse(c,cx,cy,2,2,'#f4ffe2');c.strokeStyle='#f4ffe2';c.lineWidth=1;c.beginPath();c.moveTo(cx-5,cy);c.lineTo(cx+5,cy);c.moveTo(cx,cy-5);c.lineTo(cx,cy+5);c.stroke();
        }else{c.shadowColor='#ffce8b';c.shadowBlur=5;c.lineWidth=1.5;this.ellipse(c,cx,cy,10,10,'#ffce8b1c','#ffce8b');c.shadowBlur=0;c.strokeStyle='#ffe5bb';c.lineWidth=1;c.beginPath();c.moveTo(cx-16,cy);c.lineTo(cx-6,cy);c.moveTo(cx+6,cy);c.lineTo(cx+16,cy);c.moveTo(cx,cy-16);c.lineTo(cx,cy-6);c.moveTo(cx,cy+6);c.lineTo(cx,cy+16);c.stroke();}
        if(g.pitch&&g.phase==='pitch'&&!g.defending&&!g.hardcore&&(window.nightSettings?.timingGuide!==false||window.nightSettings?.assist)){
          const guide=g.pitchGuidePoint();
          const u=g.pitch.progress;
          c.globalAlpha=.66*Math.max(0,Math.min(1,u/.075,(1-u)/.08));
          this.drawBall(c,x+guide.x*75,y+guide.y*64,7,-.38);
          c.globalAlpha=1;
        }
        }
      }
      if(g.pitch&&(g.phase==='pitch'||g.phase==='miss')){
        const p=g.pitch,u=Math.min(1.24,p.progress+(g.phase==='miss'?g.phaseTime/p.duration:0));
        const pos=this.pitchPoint(g,u),radius=8/(1+3.4*(1-Math.min(1,u)));
        const turns=(p.spinRpm??2000)*u*p.duration/60000;
        this.drawBall(c,pos.x,pos.y,radius,turns*Math.PI*.56);
      }
      if(g.phase==='aim'){
        c.fillStyle='#e6f0cf';c.textAlign='center';c.font='bold 9px Arial';c.fillText('球種とコースを選んで投球',265,333);
      }
    }
    const bottom=c.createLinearGradient(0,490,0,540);bottom.addColorStop(0,'#0b1b1000');bottom.addColorStop(1,'#0b1b10c0');c.fillStyle=bottom;c.fillRect(0,490,480,50);c.restore();
  }
};
