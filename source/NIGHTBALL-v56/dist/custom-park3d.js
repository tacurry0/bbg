import * as T from './vendor/three.module.min.js';
import { CanvasSceneRenderer } from './canvas3d.js?v=71';
const PI=Math.PI,rad=(a,r,y=0)=>[Math.sin(a)*r,y,Math.cos(a)*r];
const wall=(p,a)=>NightPlayers.wallDistance(p,a);
const height=(p,a)=>NightPlayers.fenceHeight(p,a);
const samples=(a,b,n)=>Array.from({length:n+1},(_,i)=>a+(b-a)*i/n);
const quad=(v,a,b,c,d)=>v.push(...a,...b,...c,...c,...b,...d);
function material(color,extra={}){return new T.MeshStandardMaterial({color,side:T.DoubleSide,roughness:.9,...extra});}
function mesh(g,geo,mat){const m=new T.Mesh(geo,mat);m.userData.disposeMaterial=true;m.receiveShadow=true;g.add(m);return m;}
function triangles(g,v,mat){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(v,3));geo.computeVertexNormals();return mesh(g,geo,mat);}
function box(g,dim,pos,color,angle=0){const m=mesh(g,new T.BoxGeometry(...dim),material(color));m.position.set(...pos);m.rotation.y=angle;return m;}
function polygon(g,points,y,mat){const shape=new T.Shape(points.map(([x,z])=>new T.Vector2(x,-z)));const geo=new T.ShapeGeometry(shape);const m=mesh(g,geo,mat);m.rotation.x=-PI/2;m.position.y=y;return m;}
function surfaceTexture(s){
 const c=document.createElement('canvas');c.width=c.height=128;
 const ctx=c.getContext('2d');ctx.fillStyle='#e4e4e4';ctx.fillRect(0,0,128,128);
 if(s.surface!=='dirt'&&s.mow!=='plain'){
  ctx.fillStyle='rgba(255,255,255,.10)';
  if(s.mow==='checker'){ctx.fillRect(0,0,64,64);ctx.fillRect(64,64,64,64);}
  else{ctx.fillRect(0,0,64,128);}
 }
 if(s.surface!=='artificial'){for(let i=0;i<1500;i++){ctx.fillStyle=i%2?'rgba(0,0,0,.045)':'rgba(255,255,255,.04)';ctx.fillRect((i*73)%128,(i*41+Math.floor(i/9))%128,2,2);}}
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(1/17,1/17);if(s.mow==='diagonal')tex.rotation=PI/4;return tex;
}
function fairOutline(p){return samples(-PI/4,PI/4,96).map(a=>{const [x,,z]=rad(a,wall(p,a));return [x,z];});}
function foulOutline(p){
 const s=p.customSpec,w=s.foulWidth,l=wall(p,-PI/4)/Math.SQRT2,r=wall(p,PI/4)/Math.SQRT2,d=w/Math.SQRT2;
 return [[r,r],[r+d,r-d],...samples(3*PI/4,5*PI/4,20).map(a=>[w*Math.sin(a),w*Math.cos(a)]),[-l-d,l-d],[-l,l]];
}
function boundary(p,a){
 if(Math.abs(a)<=PI/4)return wall(p,a);
 if(Math.abs(a)<3*PI/4){const d=Math.abs(a)-PI/4;return Math.min(wall(p,Math.sign(a)*PI/4)/Math.max(.001,Math.cos(d)),p.foulWidth/Math.max(.001,Math.sin(d)));}
 return p.foulWidth;
}
function addField(g,p,preview){
 const s=p.customSpec;
 box(g,[620,.16,620],[0,-.13,55],0x34434a);
 const tex=surfaceTexture(s),field=polygon(g,[...fairOutline(p),...foulOutline(p).slice(1,-1)],.008,material(s.surface==='dirt'?s.clayColor:s.turfColor,{map:tex}));field.userData.disposeTexture=true;
 if(s.surface!=='dirt'){
  if(s.infield==='cutouts'){for(const [x,z,r] of [[0,0,4],[19.4,19.4,3],[0,38.8,3],[-19.4,19.4,3]]){const m=mesh(g,new T.CircleGeometry(r,24),material(s.clayColor));m.position.set(x,.027,z);m.rotation.x=-PI/2;}}
  else{
   const d=s.infieldSize;
   // Ordered left/right outline follows the infield arc.
   polygon(g,[[0,-2],...samples(PI/4,-PI/4,32).map(a=>[Math.sin(a)*d,Math.cos(a)*d])],.025,material(s.clayColor));
   if(s.infield==='grass')polygon(g,[[0,3.6],[15.5,19.4],[0,34.6],[-15.5,19.4]],.038,material(s.turfColor));
  }
 }
 if(preview){
  const w=[],t=[],rail=[];const a=samples(-PI/4,PI/4,96);
  for(let i=0;i<a.length-1;i++){const x=a[i],z=a[i+1],r=wall(p,x),q=wall(p,z),h=height(p,x),j=height(p,z);quad(w,rad(x,r),rad(x,r,h),rad(z,q),rad(z,q,j));quad(t,rad(x,r,.02),rad(x,r-s.trackWidth,.02),rad(z,q,.02),rad(z,q-s.trackWidth,.02));quad(rail,rad(x,r-.14,h),rad(x,r+.14,h),rad(z,q-.14,j),rad(z,q+.14,j));}
  triangles(g,w,material(s.wallColor));triangles(g,t,material(s.trackColor));triangles(g,rail,material(s.railColor));
  for(const a of [-PI/4,PI/4]){const r=wall(p,a);box(g,[.16,.05,r],rad(a,r/2,.06),0xffffff,a);box(g,[.25,15,.25],rad(a,r,7.5),0xffd34f);}
  for(const [x,z] of [[0,0],[-19.4,19.4],[19.4,19.4],[0,38.8]])box(g,[.65,.12,.65],[x,.09,z],0xffffff,PI/4);
  box(g,[.6,.12,.2],[0,.1,18.4],0xffffff);
 }
 const f=foulOutline(p),v=[];
 for(let i=0;i<f.length-1;i++){const [x,z]=f[i],[a,b]=f[i+1];quad(v,[x,0,z],[x,2,z],[a,0,b],[a,2,b]);}
 triangles(g,v,material(s.wallColor));
}
function standSections(layout){
 return ({full:[[-PI,PI]],outfield:[[-.78,.78]],infield:[[-PI,-.92],[.92,PI]],left:[[-PI,0]],right:[[0,PI]],none:[]})[layout]||[];
}
function addStands(g,p){
 const s=p.customSpec,sections=standSections(s.standLayout),slope=Math.tan(s.standSlope*PI/180),crowd=[];
 for(const [a,b] of sections){
  const angles=samples(a,b,Math.max(12,Math.ceil((b-a)*12))),verts=[],rows=[];
  for(let j=0;j<s.standRows;j++){
   const off=3+j*.82,y=.6+j*.82*slope;
   for(let i=0;i<angles.length-1;i++){const a=angles[i],b=angles[i+1],r=boundary(p,a)+off,q=boundary(p,b)+off;quad(verts,rad(a,r,y),rad(a,r+.82,y+.82*slope),rad(b,q,y),rad(b,q+.82,y+.82*slope));quad(rows,rad(a,r+.2,y+.2),rad(a,r+.45,y+.25),rad(b,q+.2,y+.2),rad(b,q+.45,y+.25));}
   if(j%2===0)for(let i=1;i<angles.length-1;i+=3){if((i*19+j*37)%100<s.crowd){const a=angles[i];crowd.push(rad(a,boundary(p,a)+off+.3,y+.55));}}
  }
  triangles(g,verts,material(s.seatColor));triangles(g,rows,material(new T.Color(s.seatColor).multiplyScalar(1.35)));
 }
 if(crowd.length){const m=new T.InstancedMesh(new T.BoxGeometry(.42,.72,.46),material(0xffffff),crowd.length);m.userData.disposeMaterial=true;const o=new T.Object3D(),colors=[0xd6d9df,0x89b6d9,0xb65265,0xd5b764,0x586c8c];crowd.forEach((p,i)=>{o.position.set(...p);o.updateMatrix();m.setMatrixAt(i,o.matrix);m.setColorAt(i,new T.Color(colors[i%colors.length]));});g.add(m);}
}
export function boardPlacement(p){const s=p.customSpec,a=s.boardPosition==='left'?-.46:s.boardPosition==='right'?.46:0;return {pos:rad(a,wall(p,a)+8,s.boardElevation),angle:a,width:s.boardWidth,height:s.boardHeight};}
function roof(g,p){
 const s=p.customSpec;if(!['dome','retractable'].includes(s.venue))return;
 const closed=s.venue==='dome'||s.roofOpen==='closed',r=Math.max(p.left,p.right,p.center,...(p.fenceAnchors||[]))+s.standRows+18;
 const profile=p.roofProfile||{style:s.roofShape,radiusX:r,radiusZ:r,edge:s.roofHeight*.58,height:s.roofHeight};
 const roofPark={roofHeight:s.roofHeight,roofProfile:profile},v=[];
 const as=samples(0,2*PI,64),rs=samples(closed?0:.72,1,12),point=(a,u)=>{const x=Math.sin(a)*profile.radiusX*u,z=48+Math.cos(a)*profile.radiusZ*u;return [x,NightPlayers.roofSurface(roofPark,x,z),z];};
 for(let i=0;i<as.length-1;i++)for(let j=0;j<rs.length-1;j++)quad(v,point(as[i],rs[j]),point(as[i],rs[j+1]),point(as[i+1],rs[j]),point(as[i+1],rs[j+1]));
 triangles(g,v,material(s.roofColor,{transparent:true,opacity:.82,depthWrite:false}));
}
export function buildCustomPark(g,p,{preview=false}={}){
 const s=p.customSpec;addField(g,p,preview);addStands(g,p);
 const board=boardPlacement(p);
 if(preview){box(g,[board.width,board.height,1.2],board.pos,s.boardStyle==='classic'?0x463e31:0x142b41,board.angle);box(g,[board.width*.9,board.height*.65,.15],[board.pos[0],board.pos[1],board.pos[2]-.68],s.boardStyle==='classic'?0x877653:0x46a6be,board.angle);}
 box(g,[s.eyeWidth,s.eyeHeight,.85],[0,s.eyeHeight/2,p.center+1.1],s.eyeColor);
 for(const sign of [-1,1]){
  const offset=Math.min(s.dugoutOffset,s.foulWidth-.7),a=sign*PI/4,x=sign*(17+offset)/Math.SQRT2,z=(17-offset)/Math.SQRT2;
  box(g,[2.4,2,s.dugoutSize],[x,1,z],s.dugoutColor,a);box(g,[3.2,.25,s.dugoutSize+.8],[x,2.1,z],s.dugoutColor,a);
  if(s.bullpen!=='none'){const c=s.bullpen==='inside'?Math.min(s.foulWidth-1,12):s.foulWidth+5,px=sign*(37+c)/Math.SQRT2,pz=(37-c)/Math.SQRT2;box(g,[3.2,.16,10],[px,.12,pz],s.clayColor,a);box(g,[3.2,.2,1],[px,.22,pz],s.wallColor,a);}
 }
 if(s.adText){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle=s.adColor;ctx.fillRect(0,0,512,96);ctx.fillStyle='#fff';ctx.font='bold 52px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(s.adText,256,48,488);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;for(const a of [-.35,.35]){const r=wall(p,a)-.12,h=height(p,a),m=mesh(g,new T.PlaneGeometry(Math.min(16,r*.13),Math.min(2,h*.76)),material(0xffffff,{map:tex}));m.userData.disposeTexture=true;m.position.set(...rad(a,r,h*.52));m.rotation.y=a;}}
 for(let i=0;i<s.lightCount;i++){
  const a=s.lightLayout==='around'?-PI+(i+.5)*2*PI/s.lightCount:s.lightLayout==='corners'?(i<s.lightCount/2?-1:1)*(.7+(i%(s.lightCount/2))*.17):-.95+(i+.5)*1.9/s.lightCount,r=boundary(p,a)+Math.min(18,s.standRows*.82+4),h=s.lightHeight;
  box(g,[.55,h,.55],rad(a,r,h/2),0x87969e);box(g,[7,3,.6],rad(a,r,h),0x394758,a);for(let j=0;j<4;j++){const pos=rad(a,r-.42,h+(j%2-.5)*1.1);pos[0]+=(Math.floor(j/2)-.5)*2.8;box(g,[2.4,.85,.3],pos,0xfff7dd,a);}
 }
 roof(g,p);
}
function dispose(group){group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){o.material.map?.dispose();o.material.dispose();}if(o.isInstancedMesh)o.dispose();});group.clear();}
export class CustomParkPreview{
 constructor(canvas){this.canvas=canvas;try{this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false});}catch{this.renderer=new CanvasSceneRenderer({canvas});}
  this.scene=new T.Scene();this.scene.background=new T.Color(0x122636);this.camera=new T.PerspectiveCamera(43,1,1,1300);this.group=new T.Group();this.scene.add(this.group,new T.HemisphereLight(0xf1f7ff,0x747866,2.5));const light=new T.DirectionalLight(0xffffff,2.6);light.position.set(-90,160,-70);this.scene.add(light);
  this.angle=.12;this.elev=.83;this.zoom=1;this.drag=null;this.pointers=new Map();
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,[e.clientX,e.clientY]);this.pinch=0;});
  canvas.addEventListener('pointermove',e=>{const last=this.pointers.get(e.pointerId);if(!last)return;this.pointers.set(e.pointerId,[e.clientX,e.clientY]);if(this.pointers.size===2){const [a,b]=[...this.pointers.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(this.pinch)this.zoom=Math.max(.48,Math.min(2.6,this.zoom*this.pinch/d));this.pinch=d;}else{this.angle+=(e.clientX-last[0])*.009;this.elev=Math.max(.16,Math.min(1.48,this.elev+(e.clientY-last[1])*.007));}this.render();});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,e=>{this.pointers.delete(e.pointerId);this.pinch=0;});
  canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(.48,Math.min(2.6,this.zoom*Math.exp(e.deltaY*.001)));this.render();},{passive:false});
  this.observer=new ResizeObserver(()=>this.render());this.observer.observe(canvas);
 }
 update(park){this.park=park;this.scene.userData.staticRevision=(this.scene.userData.staticRevision||0)+1;dispose(this.group);buildCustomPark(this.group,park,{preview:true});this.scene.background.setHex(park.customSpec.daylight==='night'?0x081322:0x253c4d);this.render();}
 render(){if(!this.park)return;const w=Math.max(1,this.canvas.clientWidth),h=Math.max(1,this.canvas.clientHeight);if(this.w!==w||this.h!==h){this.renderer.setSize(w,h,false);this.w=w;this.h=h;}this.camera.aspect=w/h;this.camera.updateProjectionMatrix();const r=(Math.max(this.park.center,this.park.left,this.park.right,...(this.park.fenceAnchors||[]))+this.park.customSpec.standRows*.85+45)*1.7*this.zoom,target=45;this.camera.position.set(Math.sin(this.angle)*r*Math.cos(this.elev),r*Math.sin(this.elev),target-Math.cos(this.angle)*r*Math.cos(this.elev));this.camera.lookAt(0,0,target);this.renderer.render(this.scene,this.camera);}
 dispose(){this.observer.disconnect();dispose(this.group);this.renderer.dispose?.();}
}
