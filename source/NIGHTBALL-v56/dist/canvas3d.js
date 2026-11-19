import * as T from './vendor/three.module.min.js';
/* A CPU compatibility renderer for the same scene and player models. */
export class CanvasSceneRenderer {
 constructor({canvas}){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.capabilities={getMaxAnisotropy:()=>1};this.shadowMap={};this.ratio=1;this.isSoftwareRenderer=true;this.v=new T.Vector3();this.c=new T.Color();this.bounds=new T.Sphere();this.frustum=new T.Frustum();this.pv=new T.Matrix4();this.lightDirection=new T.Vector3(-.4,.8,-.35).normalize();this.cacheCanvas=document.createElement('canvas');}
 setPixelRatio(){this.ratio=1;}
 setSize(w,h){this.width=w;this.height=h;this.canvas.width=Math.round(w);this.canvas.height=Math.round(h);this.cacheKey='';}
 color(color,f=1){return '#'+color.clone().multiplyScalar(f).getHexString(T.SRGBColorSpace);}
 render(scene,camera){
  if(!this.width||!this.height)return;const c=this.ctx,w=this.width,h=this.height;c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);this.view=camera.matrixWorldInverse;this.proj=camera.projectionMatrix;this.camera=camera;this.frustum.setFromProjectionMatrix(this.pv.multiplyMatrices(this.proj,this.view));
  const cacheKey=[w,h,scene.userData.staticRevision||0,...camera.matrixWorldInverse.elements.map(v=>v.toFixed(3)),...camera.projectionMatrix.elements.map(v=>v.toFixed(3))].join('/'),refresh=cacheKey!==this.cacheKey;
  const {nightLighting:night,venueClay}=scene.userData;
  if(refresh){const sky=scene.background,indoors=scene.userData.indoors,broadcast=scene.userData.broadcastDome,outdoor=scene.userData.outdoorSky;
   const bg=c.createLinearGradient(0,0,0,h);
   const indoorNight=indoors&&night?['#172338','#314558','#53677a']:null;
   bg.addColorStop(0,(outdoor||indoorNight)?.[0]??(broadcast?'#354860':indoors?'#537082':sky?.isColor?this.color(sky,.22):'#0b1830'));
   bg.addColorStop(.42,(outdoor||indoorNight)?.[1]??(broadcast?'#9cafc2':indoors?'#8199a6':sky?.isColor?this.color(sky,.79):'#243e51'));
   bg.addColorStop(.70,(outdoor||indoorNight)?.[2]??(broadcast?'#536d88':indoors?'#aebbc5':sky?.isColor?this.color(sky,1.68):'#425a68'));
   bg.addColorStop(1,'#516556');c.fillStyle=bg;c.fillRect(0,0,w,h);}else c.drawImage(this.cacheCanvas,0,0);
  const staticItems=[],staticGround=[],dynamicItems=[],dynamicGround=[];let items=staticItems,ground=staticGround,serial=0;
  const project=v=>{const q=v.clone().applyMatrix4(this.proj);return{x:(q.x*.5+.5)*w,y:(-.5*q.y+.5)*h};};
  const addMesh=(obj,matrix,colorOverride)=>{
   if(obj.userData.roof)return;const geo=obj.geometry,mat=Array.isArray(obj.material)?obj.material[0]:obj.material;if(!geo?.attributes?.position||!mat||mat.opacity<.01)return;
   if(!geo.boundingSphere)geo.computeBoundingSphere();
   this.bounds.copy(geo.boundingSphere).applyMatrix4(matrix);
   if(!this.frustum.intersectsSphere(this.bounds))return;
   const mv=new T.Matrix4().multiplyMatrices(this.view,matrix),center=new T.Vector3().setFromMatrixPosition(mv);
   const baseColor=colorOverride||mat.color||new T.Color(0xffffff),opacity=mat.opacity??1;
   const dim=night&&!mat.isMeshBasicMaterial&&!(mat.emissive?.getHex()&&mat.emissiveIntensity>.5);
   const color=dim?baseColor.clone().multiplyScalar(items===dynamicItems?.90:.74):baseColor;
   const normalMatrix=new T.Matrix3().getNormalMatrix(matrix);
   const kind=mat.map?.userData?.kind;
   if(geo.type==='PlaneGeometry'&&mat.map&&!kind&&mat.side!==T.DoubleSide){const n=new T.Vector3(0,0,1).applyMatrix3(normalMatrix).normalize(),world=new T.Vector3().setFromMatrixPosition(matrix);if(n.dot(camera.position.clone().sub(world))<=0)return;}
   const isSphere=geo.type==='SphereGeometry';
   if(isSphere){
    const radius=geo.parameters.radius||1,cp=project(center),ex=project(new T.Vector3(radius,0,0).applyMatrix4(mv)),ey=project(new T.Vector3(0,radius,0).applyMatrix4(mv)),ez=project(new T.Vector3(0,0,radius).applyMatrix4(mv));
    const rx=Math.max(1,Math.hypot(ex.x-cp.x,ex.y-cp.y),Math.abs(ez.x-cp.x)),ry=Math.max(1,Math.hypot(ey.x-cp.x,ey.y-cp.y),Math.abs(ez.y-cp.y));
    if(center.z<-.1){if(cp.x+rx<0||cp.x-rx>w||cp.y+ry<0||cp.y-ry>h)return;items.push({type:'sphere',x:cp.x,y:cp.y,rx,ry,color,opacity,depth:-center.z,mat,cap:geo.parameters.thetaLength<Math.PI-.01&&rx>=4,serial:serial++});return;}
   }
   const pos=geo.attributes.position,norm=geo.attributes.normal,uv=geo.attributes.uv,index=geo.index,verts=[];
   for(let i=0;i<pos.count;i++)verts.push(new T.Vector3().fromBufferAttribute(pos,i).applyMatrix4(mv));
   const isGround=Math.abs(new T.Vector3(0,0,1).transformDirection(matrix).y)>.99&&Math.abs(new T.Vector3().setFromMatrixPosition(matrix).y)<.1&&['PlaneGeometry','ShapeGeometry','CircleGeometry','RingGeometry'].includes(geo.type);
   const total=index?index.count:pos.count;
   for(let k=0;k<total;k+=3){const ids=[0,1,2].map(j=>index?index.getX(k+j):k+j);let vs=ids.map(i=>({p:verts[i],u:uv?.getX(i)||0,v:uv?.getY(i)||0}));
    if(vs.every(v=>v.p.z>-.08))continue;
    if(vs.some(v=>v.p.z>-.08)){const clip=[];for(let i=0;i<vs.length;i++){const a=vs[i],b=vs[(i+1)%vs.length],ina=a.p.z<=-.08,inb=b.p.z<=-.08;if(ina)clip.push(a);if(ina!==inb){const t=(-.08-a.p.z)/(b.p.z-a.p.z);clip.push({p:a.p.clone().lerp(b.p,t),u:a.u+(b.u-a.u)*t,v:a.v+(b.v-a.v)*t});}}vs=clip;}
    if(vs.length<3)continue;
    let normal;if(norm)normal=new T.Vector3().fromBufferAttribute(norm,ids[0]).applyMatrix3(normalMatrix).normalize();else normal=new T.Vector3(0,1,0);
    const lighting=mat.isMeshBasicMaterial?1:.58+.42*Math.max(0,normal.dot(this.lightDirection));
    let fill=kind==='grass'?this.color(color,1.08):this.color(color,lighting);
    if(kind==='dirt'&&!venueClay)fill=scene.userData.broadcastDome?'#b68167':'#ac805d';
    const ps=vs.map(v=>project(v.p));if(ps.every(p=>p.x<0)||ps.every(p=>p.x>w)||ps.every(p=>p.y<0)||ps.every(p=>p.y>h))continue;
    const depth=-vs.reduce((a,v)=>a+v.p.z,0)/vs.length;
    const item={type:'poly',ps,vs,fill,depth,opacity,kind,groundColor:color,texture:!kind?mat.map?.image:null,serial:serial++,layer:new T.Vector3().setFromMatrixPosition(matrix).y,order:obj.renderOrder||0};(isGround?ground:items).push(item);
   }
  };
  scene.traverseVisible(obj=>{
   let dynamic=false;for(let p=obj;p;p=p.parent)if(p.userData.dynamic){dynamic=true;break;}if(!dynamic&&!refresh)return;items=dynamic?dynamicItems:staticItems;ground=dynamic?dynamicGround:staticGround;
   if(obj.isInstancedMesh){const matrix=new T.Matrix4(),world=new T.Matrix4(),color=new T.Color();for(let i=0;i<obj.count;i++){obj.getMatrixAt(i,matrix);world.multiplyMatrices(obj.matrixWorld,matrix);if(obj.instanceColor)obj.getColorAt(i,color);else color.copy(obj.material.color);addMesh(obj,world,color.clone());}}
   else if(obj.isMesh)addMesh(obj,obj.matrixWorld);
   else if(obj.isSprite){const center=new T.Vector3().setFromMatrixPosition(obj.matrixWorld).applyMatrix4(this.view);if(center.z<-.1){const p=project(center),size=obj.getWorldScale(new T.Vector3()),edge=project(center.clone().add(new T.Vector3(size.x/2,0,0))),r=Math.abs(edge.x-p.x);items.push({type:'sprite',x:p.x,y:p.y,r,texture:obj.material.map?.image,opacity:obj.material.opacity,depth:-center.z,serial:serial++});}}
   else if(obj.isLine){const ps=obj.geometry.attributes.position;if(!ps)return;const mv=new T.Matrix4().multiplyMatrices(this.view,obj.matrixWorld),color=this.color(obj.material.color);let last=null;for(let i=0;i<ps.count;i++){if(obj.isLineSegments&&i%2===0)last=null;const p=new T.Vector3().fromBufferAttribute(ps,i).applyMatrix4(mv);if(p.z<-.1){const q=project(p);if(last)items.push({type:'line',a:last.q,b:q,depth:-(last.z+p.z)/2,color,opacity:obj.material.opacity,serial:serial++});last={q,z:p.z};}else last=null;}}
  });
  const groundStyles=new Map();
  const groundStyle=item=>{
   const key=item.kind+item.fill;
   if(groundStyles.has(key))return groundStyles.get(key);
   const grad=c.createLinearGradient(0,h*.27,0,h);
   if(item.kind==='grass'){
    grad.addColorStop(0,this.color(item.groundColor,.62));
    grad.addColorStop(.60,this.color(item.groundColor,1.12));
    grad.addColorStop(1,this.color(item.groundColor,1.36));
   }else if(venueClay){
    grad.addColorStop(0,this.color(item.groundColor,.68));
    grad.addColorStop(.58,this.color(item.groundColor,.91));
    grad.addColorStop(1,this.color(item.groundColor,1.07));
   }else{
    const dome=scene.userData.broadcastDome;
    grad.addColorStop(0,night?'#735445':dome?'#815d4e':'#977151');
    grad.addColorStop(.58,night?'#9c6a50':dome?'#ad755e':'#ad7654');
    grad.addColorStop(1,night?'#b28160':dome?'#c69576':'#bd8963');
   }
   groundStyles.set(key,grad);return grad;
  };
  const draw=item=>{
   c.globalAlpha=item.opacity;
   if(item.type==='sphere'){
    const {x,y,rx,ry}=item;c.save();c.translate(x,y);c.scale(rx,ry);if(item.cap){c.beginPath();c.rect(-1.1,-1.1,2.2,1.5);c.clip();}c.beginPath();c.arc(0,0,1,0,Math.PI*2);if(item.mat.isMeshBasicMaterial||rx<2.5||ry<2.5)c.fillStyle=this.color(item.color);else{const grad=c.createRadialGradient(-.32,-.40,.02,0,0,1.1);grad.addColorStop(0,this.color(item.color,1.18));grad.addColorStop(.5,this.color(item.color,.95));grad.addColorStop(1,this.color(item.color,.47));c.fillStyle=grad;}c.fill();c.restore();
   }else if(item.type==='poly'){
    c.beginPath();item.ps.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();
    if(item.texture&&item.vs.length===3&&item.texture.width){const a=item.vs[0],b=item.vs[1],d=item.vs[2],tw=item.texture.width,th=item.texture.height;const us=[a.u*tw,b.u*tw,d.u*tw],vs=[(1-a.v)*th,(1-b.v)*th,(1-d.v)*th],ps=item.ps;const den=us[0]*(vs[1]-vs[2])+us[1]*(vs[2]-vs[0])+us[2]*(vs[0]-vs[1]);if(Math.abs(den)>.01){const coeff=values=>[(values[0]*(vs[1]-vs[2])+values[1]*(vs[2]-vs[0])+values[2]*(vs[0]-vs[1]))/den,(values[0]*(us[2]-us[1])+values[1]*(us[0]-us[2])+values[2]*(us[1]-us[0]))/den,(values[0]*(us[1]*vs[2]-us[2]*vs[1])+values[1]*(us[2]*vs[0]-us[0]*vs[2])+values[2]*(us[0]*vs[1]-us[1]*vs[0]))/den];const X=coeff(ps.map(p=>p.x)),Y=coeff(ps.map(p=>p.y));c.save();c.clip();c.setTransform(X[0],Y[0],X[1],Y[1],X[2],Y[2]);c.drawImage(item.texture,0,0);c.restore();}else{c.fillStyle=item.kind?groundStyle(item):item.fill;c.fill();if(item.opacity>.95){c.strokeStyle=c.fillStyle;c.lineWidth=.55;c.lineJoin='round';c.stroke();}}}
    else{c.fillStyle=item.kind?groundStyle(item):item.fill;c.fill();if(item.opacity>.95){c.strokeStyle=c.fillStyle;c.lineWidth=.55;c.lineJoin='round';c.stroke();}}
   }else if(item.type==='sprite'&&item.texture){c.save();c.globalCompositeOperation='screen';c.drawImage(item.texture,item.x-item.r,item.y-item.r,item.r*2,item.r*2);c.restore();}
   else if(item.type==='line'){c.strokeStyle=item.color;c.lineWidth=1;c.beginPath();c.moveTo(item.a.x,item.a.y);c.lineTo(item.b.x,item.b.y);c.stroke();}
  };
  if(refresh){staticGround.sort((a,b)=>a.layer-b.layer||b.depth-a.depth).forEach(draw);staticItems.sort((a,b)=>(a.order||0)-(b.order||0)||b.depth-a.depth||a.serial-b.serial).forEach(draw);c.globalAlpha=1;if(this.cacheCanvas.width!==w||this.cacheCanvas.height!==h){this.cacheCanvas.width=w;this.cacheCanvas.height=h;}this.cacheCanvas.getContext('2d').drawImage(this.canvas,0,0);this.cacheKey=cacheKey;}
  dynamicGround.sort((a,b)=>a.layer-b.layer||b.depth-a.depth).forEach(draw);dynamicItems.sort((a,b)=>(a.order||0)-(b.order||0)||b.depth-a.depth||a.serial-b.serial).forEach(draw);c.globalAlpha=1;
 }
}
