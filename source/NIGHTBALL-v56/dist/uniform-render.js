import * as T from './vendor/three.module.min.js';

// Cylindrical UVs align front at u=.5, back at seam. Split seam triangles
// before mapping a first-party GLB that originally had no UVs.
export function jerseyUV(source){
 const g=source.index?source.toNonIndexed():source.clone(),p=g.attributes.position,uv=new Float32Array(p.count*2);
 for(let i=0;i<p.count;i+=3){
  const us=[0,1,2].map(j=>.5+Math.atan2(p.getX(i+j),p.getZ(i+j))/(Math.PI*2));
  if(Math.max(...us)-Math.min(...us)>.5)for(let j=0;j<3;j++)if(us[j]<.5)us[j]+=1;
  for(let j=0;j<3;j++){uv[(i+j)*2]=us[j];uv[(i+j)*2+1]=T.MathUtils.clamp((p.getY(i+j)-.43)/.58,0,1);}
 }
 g.setAttribute('uv',new T.BufferAttribute(uv,2));return g;
}
export function torsoGeometry(){
 const g=new T.LatheGeometry([[.215,.43],[.24,.48],[.255,.58],[.286,.72],[.307,.82],[.30,.88],[.24,.96],[.125,1.01],[0,1.01]].map(p=>new T.Vector2(...p)),24,-Math.PI,2*Math.PI);
 g.scale(1,1,.87);return jerseyUV(g);
}
export function capGeometry(){
 const g=new T.LatheGeometry([[.416,.12],[.427,.155],[.416,.23],[.382,.31],[.30,.385],[.16,.425],[0,.43]].map(p=>new T.Vector2(...p)),24);
 g.scale(1,1,.95);return g;
}
export function visorGeometry(helmet=false){
 const vertices=[],indices=[],steps=18;
 for(let i=0;i<=steps;i++){
  const a=-1.04+2.08*i/steps,ca=Math.cos(a),sa=Math.sin(a),outer=.43+(helmet?.15:.23)*Math.pow(ca,.7);
  for(const r of [.355,outer])for(const dy of [0,-.014]){
   vertices.push(r*sa,.137-.035*(r-.355)/.31-.04*sa*sa+dy,r*ca);
  }
  if(i<steps){const n=i*4;indices.push(n,n+4,n+2,n+2,n+4,n+6,n+1,n+3,n+5,n+3,n+7,n+5,n+2,n+6,n+3,n+3,n+6,n+7);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function drawText(ctx,word,x,y,maxWidth,size,fill,outline,font='block'){
 // Scene handedness is flipped by NIGHTBALL; mirror only lettering.
 ctx.save();ctx.translate(x,y);ctx.scale(-1,1);
 ctx.font=font==='script'?'italic 900 '+size+'px Georgia, serif':'900 '+size+'px Arial, sans-serif';
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
 const width=ctx.measureText(word)?.width||maxWidth;ctx.scale(Math.min(1,maxWidth/Math.max(1,width)),1);
 ctx.lineWidth=4;ctx.strokeStyle=outline;ctx.strokeText(word,0,0);ctx.fillStyle=fill;ctx.fillText(word,0,0);ctx.restore();
}
export function uniformTexture(kit,no){
 const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d');
 ctx.fillStyle=kit.shirt;ctx.fillRect(0,0,512,256);
 // Fabric shading and low-key seams; no pasted photograph or game artwork.
 if(kit.pattern==='pinstripe'){
  ctx.globalAlpha=.83;ctx.fillStyle=kit.stripe;for(let x=0;x<512;x+=16)ctx.fillRect(x,0,2,256);ctx.globalAlpha=1;
 }
 if(kit.pattern==='chevron'){
  ctx.globalAlpha=.38;ctx.strokeStyle='#59bdf5';ctx.lineWidth=9;
  for(const x of [105,407])for(let y=30;y<260;y+=34){ctx.beginPath();ctx.moveTo(x-38,y+18);ctx.lineTo(x,y);ctx.lineTo(x+38,y+18);ctx.stroke();}
  ctx.globalAlpha=1;
 }
 if(kit.pattern==='contrast'||kit.pattern==='panel'){
  ctx.fillStyle=kit.trim;for(const x of [128,384]){
   ctx.beginPath();ctx.moveTo(x-35,0);ctx.lineTo(x+35,0);ctx.lineTo(x+19,256);ctx.lineTo(x-19,256);ctx.closePath();ctx.fill();
  }
 }
 ctx.fillStyle='rgba(0,0,0,.07)';for(const x of [124,380])ctx.fillRect(x,0,5,256);
 ctx.fillStyle='rgba(255,255,255,.05)';for(let x=3;x<512;x+=7)ctx.fillRect(x,0,1,256);
 const shade=ctx.createLinearGradient(0,0,0,256);shade.addColorStop(0,'rgba(0,0,0,.10)');shade.addColorStop(.22,'rgba(255,255,255,.07)');shade.addColorStop(1,'rgba(0,0,0,.08)');ctx.fillStyle=shade;ctx.fillRect(0,0,512,256);
 // Button placket and stitching under the chest wordmark.
 ctx.fillStyle='rgba(0,0,0,.12)';ctx.fillRect(252,0,8,256);
 ctx.fillStyle=kit.shirt;ctx.fillRect(254,0,4,256);
 for(let y=35;y<248;y+=38){ctx.beginPath();ctx.arc(256,y,2.6,0,2*Math.PI);ctx.fillStyle=kit.outline;ctx.fill();}
 ctx.fillStyle=kit.trim;ctx.fillRect(0,0,512,12);
 drawText(ctx,kit.wordmark,256,93,148,43,kit.letters,kit.outline,kit.font);
 if(kit.frontNumber)drawText(ctx,String(no),291,158,36,44,kit.number,kit.outline);
 // Text on both edges of the wrap, joined seamlessly on the back.
 for(const x of [0,512])drawText(ctx,String(no),x,121,115,124,kit.number,kit.outline);
 const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=T.RepeatWrapping;texture.anisotropy=2;return texture;
}
export function helmetOrCap(role){return ['batter','runner','catcher'].includes(role)?'helmet':'cap';}
export function contrast(color){const n=parseInt(color.slice(1),16);return ((n>>16)*.299+(n>>8&255)*.587+(n&255)*.114)>150?'#172033':'#ffffff';}

export function pantsTexture(kit){
 const c=document.createElement('canvas');c.width=128;c.height=32;const ctx=c.getContext('2d');ctx.fillStyle=kit.pants;ctx.fillRect(0,0,128,32);
 ctx.fillStyle=kit.stripe;for(const x of [32,96])ctx.fillRect(x,0,3,32);
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;
}
