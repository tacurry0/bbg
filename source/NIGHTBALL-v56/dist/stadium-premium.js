import * as T from './vendor/three.module.min.js';

/**
 * NIGHTBALL premium procedural set dressing.
 * All architecture uses genuine 3D geometry and instancing; no flat stadium screenshots.
 * The physics field, score HUD, camera controls and player proportions are untouched.
 */
const PI=Math.PI;
const colorHex=value=>new T.Color(value).getHex();
const radial=(radius,a,y=0)=>new T.Vector3(Math.sin(a)*radius,y,Math.cos(a)*radius);
const per=(n)=>((n*16807)%2147483647)/2147483647;
const add=(parent,mesh)=>{parent.add(mesh);return mesh;};

function mat(color,roughness=.78,metalness=.08,extra={}){
 return new T.MeshStandardMaterial({color,roughness,metalness,...extra});
}
function box(group,dimensions,point,material){
 const m=add(group,new T.Mesh(new T.BoxGeometry(...dimensions),material));
 m.position.set(...point);m.receiveShadow=true;return m;
}
function beam(group,a,b,width,material){
 const d=new T.Vector3().subVectors(b,a),m=add(group,new T.Mesh(new T.CylinderGeometry(width,width,d.length(),8),material));
 m.position.copy(a).add(b).multiplyScalar(.5);
 m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());
 return m;
}
function strip(group,radius,y,span,material,width=.1){
 const positions=[];
 for(let i=0;i<=Math.ceil((span[1]-span[0])*48);i++){
  const n=Math.ceil((span[1]-span[0])*48),a=span[0]+(span[1]-span[0])*i/n;
  positions.push(radial(radius,a,y));
 }
 const geo=new T.TubeGeometry(new T.CatmullRomCurve3(positions),Math.max(16,positions.length*2),width,5,false);
 return add(group,new T.Mesh(geo,material));
}
function signage(text,subtitle,accent){
 const c=document.createElement('canvas');c.width=1024;c.height=280;
 const x=c.getContext('2d'),gr=x.createLinearGradient(0,0,c.width,c.height);
 gr.addColorStop(0,'#071625');gr.addColorStop(.50,'#10283e');gr.addColorStop(1,'#040b14');
 x.fillStyle=gr;x.fillRect(0,0,c.width,c.height);
 x.fillStyle=accent;x.fillRect(0,0,14,c.height);x.fillRect(14,0,c.width-14,8);
 for(let i=0;i<32;i++){x.fillStyle=i%2?'#ffffff08':'#53b5ff06';x.fillRect(0,i*9,c.width,3);}
 x.textAlign='left';x.fillStyle='#f8fcff';x.shadowColor=accent;x.shadowBlur=15;
 x.font='900 91px Arial';x.fillText(text,56,143);
 x.shadowBlur=0;x.font='600 32px Arial';x.fillStyle='#9bb9ce';x.fillText(subtitle,60,211);
 x.fillStyle=accent;x.fillRect(780,224,190,5);
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;return tex;
}
function addAdBoard(group,at,size,words,accent){
 const frame=box(group,[size[0]+.8,size[1]+.8,.40],[at.x,at.y,at.z],mat(0x121c27,.35,.57));
 frame.rotation.y=at.angle;
 const panel=add(group,new T.Mesh(new T.PlaneGeometry(size[0],size[1]),new T.MeshBasicMaterial({
  map:signage(words[0],words[1],accent),toneMapped:false,side:T.DoubleSide
 })));
 panel.position.set(at.x,at.y,at.z);
 panel.rotation.y=at.angle;panel.translateZ(.23);
 return panel;
}
function addSeatDeck(group,park,span,quality){
 const [a,b,height]=span,school=!!park.school,indoors=park.theme==='dome';
 const start=school?Math.max(park.center,park.corner)+5:129;
 const end=start+29*height,rise=15*height;
 const rows=school?Math.max(3,Math.round(8*height)):Math.max(13,Math.round(17*height));
 const chairs=[],backs=[],heads=[],bodies=[],colors=[];
 const cool=colorHex(park.seats||0x326679);
 const seatMat=mat(cool,.42,.14),backMat=mat(cool,.48,.10);
 const peopleMat=mat(0xffffff,.90),skinMat=mat(0xefc5a3,.92);
 const trim=mat(0xa5b7c5,.37,.35);
 for(let j=0;j<rows;j++){
  const fr=(j+.55)/rows,rad=start+(end-start)*fr,y=.5+(rise-.5)*fr+0.10;
  const cols=Math.max(9,Math.floor((b-a)*rad/(school?2.05:1.29)));
  for(let i=0;i<cols;i++){
   const angle=a+(b-a)*(i+.5)/cols,pt=radial(rad,angle,y);
   const rot=angle+PI;
   chairs.push({p:pt,rot});backs.push({p:new T.Vector3(pt.x,pt.y+.35,pt.z),rot});
   const id=j*991+i,occupancy=school?.12:indoors?.46:.60;
   if(per(id*73+11)<occupancy){
    const hue=(id*37+j*5)%10;colors.push([0xe8f5ff,0x243a4f,0xdcc94b,0xf26a50,0x58b3a2,0xf4f0e2,0x325f9b,0x7b93bd,0x9c2c4b,0xb5d7e2][hue]);
    heads.push({p:new T.Vector3(pt.x,pt.y+1.04,pt.z),rot});
    bodies.push({p:new T.Vector3(pt.x,pt.y+.61,pt.z),rot});
   }
  }
 }
 const dummy=new T.Object3D();
 function instances(geometry,material,objects,scales,instanceColors){
  if(!objects.length)return;
  const mesh=add(group,new T.InstancedMesh(geometry,material,objects.length));
  mesh.instanceMatrix.setUsage(T.StaticDrawUsage);
  for(let i=0;i<objects.length;i++){
   const item=objects[i];dummy.position.copy(item.p);dummy.rotation.set(0,item.rot,0);
   dummy.scale.set(...scales);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
   if(instanceColors)mesh.setColorAt(i,new T.Color(instanceColors[i]));
  }
  mesh.instanceMatrix.needsUpdate=true;
  if(instanceColors)mesh.instanceColor.needsUpdate=true;
  mesh.frustumCulled=false;mesh.receiveShadow=true;
 }
 instances(new T.BoxGeometry(.80,.18,.66),seatMat,chairs,[1,1,1]);
 instances(new T.BoxGeometry(.81,.71,.12),backMat,backs,[1,1,1]);
 instances(new T.SphereGeometry(.29,10,8),skinMat,heads,[1,1,1]);
 instances(new T.SphereGeometry(.46,10,8),peopleMat,bodies,[1,1.0,.56],colors);
 // Premium entry aisles, stepped terraces and continuous safety railings.
 const steps=Math.max(5,Math.floor((b-a)*9));
 for(let k=1;k<=steps;k++){
  if(k%3!==0)continue;
  const ang=a+(b-a)*k/(steps+1);
  const foot=radial(start-.4,ang,.50),top=radial(end+.1,ang,rise+.15);
  beam(group,foot,top,.18,trim);
 }
 strip(group,start-.4,1.13,[a,b],trim,.09);
 strip(group,end+.2,rise+.14,[a,b],trim,.17);
 return {start,end,rise,a,b};
}
function addConcourse(group,park,deck,idx,materials){
 const {a,b,end,rise}=deck,inside=park.theme==='dome';
 if(park.school)return;
 const outer=end+7.3,level=rise+3.5;
 const fascia=materials.fascia,glass=materials.glass,steel=materials.steel,light=materials.light;
 const rail=strip(group,end+1.1,level-2.7,[a,b],steel,.17);
 rail.userData.detail='mezzanine';
 // Concourse skylights and elevated suites: physically enclosed boxes and window mullions.
 for(let j=0;j<Math.max(6,Math.floor((b-a)*22));j++){
  const ang=a+(b-a)*(j+.5)/Math.max(6,Math.floor((b-a)*22));
  if(j%5===4)continue;
  const p=radial(outer,ang,level);
  const suite=new T.Group();suite.position.copy(p);suite.rotation.y=ang+PI;group.add(suite);
  box(suite,[4.8,3.65,3.8],[0,0,0],fascia);
  box(suite,[4.4,2.18,.07],[0,.42,2.01],glass);
  for(const x of [-1.46,0,1.46])box(suite,[.11,2.42,.10],[x,.42,2.08],steel);
  box(suite,[4.9,.20,4.2],[0,2.02,0],fascia);
  box(suite,[4.7,.12,.15],[0,-1.08,2.12],light);
 }
 // Roof-canopy beams and translucent two-sided metal roof panels.
 const span=[a,b],canopyR=outer+5;
 const roofPanel=add(group,new T.Mesh(new T.BufferGeometry(),fascia)); // populated below
 const positions=[],normals=[],uv=[],indices=[],segments=Math.max(14,Math.ceil((b-a)*56));
 for(let i=0;i<=segments;i++){
  const ang=a+(b-a)*i/segments;
  for(const [radius,y] of [[outer-3,level+3.2],[canopyR+6,level+7.7]]){
   const v=radial(radius,ang,y);positions.push(v.x,v.y,v.z);uv.push(i/segments,radius/180);
  }
  if(i<segments){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}
 }
 roofPanel.geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 roofPanel.geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
 roofPanel.geometry.setIndex(indices);roofPanel.geometry.computeVertexNormals();
 roofPanel.material=materials.roof;
 strip(group,outer-3,level+3.2,span,steel,.17);
 strip(group,canopyR+6,level+7.7,span,steel,.19);
 for(let i=0;i<=12;i++){
  const ang=a+(b-a)*i/12;
  beam(group,radial(outer-3,ang,level+3.2),radial(canopyR+6,ang,level+7.7),.14,steel);
  if(i%2===0)beam(group,radial(outer,ang,level-2),radial(canopyR+4,ang,level+7.6),.12,steel);
 }
 // Continuous LED strip across the face of the upper deck.
 strip(group,outer-.65,level-2.4,span,light,.12);
 if(inside)strip(group,canopyR+7,level+7.7,span,light,.22);
}
function addFieldFixtures(group,park,materials){
 const school=!!park.school,indoor=park.theme==='dome';
 const wall=park.center,angleMarks=[-.69,-.48,.48,.69];
 // Foul-territory railings, bullpen shelters and benches; stay away from playable grass.
 for(const sign of [-1,1]){
  const dug=new T.Group();group.add(dug);dug.position.set(sign*26,0,10);dug.rotation.y=sign*.67;
  const roof=materials.fascia,wallMat=materials.steel;
  box(dug,[2.5,.17,11.7],[0,2.66,0],roof);
  for(let i=-2;i<=2;i++){
   box(dug,[.12,2.4,.13],[-1.17,1.2,i*2.55],wallMat);
   box(dug,[1.8,.13,2.1],[.28,.61,i*2.25],materials.wood);
   box(dug,[1.7,.08,.18],[.30,1.25,i*2.25],materials.wood);
  }
  box(dug,[.07,1.1,11.4],[-1.12,.58,0],materials.glass);
  box(dug,[.14,.13,11.5],[-1.12,1.22,0],materials.light);
 }
 if(school)return;
 for(const [i,angle] of angleMarks.entries()){
  const radius=NightPlayers.wallDistance(park,angle)+6.5;
  const pt=radial(radius,angle,4.7);
  const camera=new T.Group();group.add(camera);camera.position.copy(pt);camera.rotation.y=angle+PI;
  box(camera,[.12,7.8,.12],[0,-.6,0],materials.steel);
  box(camera,[1.15,.65,1.48],[0,3.5,.05],materials.fascia);
  box(camera,[.62,.42,.44],[0,3.5,.85],materials.glass);
  box(camera,[.90,.26,.19],[0,3.79,.05],materials.light);
 }
 // Architectural line of metallic fascia trims beneath the primary deck.
 const r=indoor?155:145;
 strip(group,r,3.1,[-1.26,1.26],materials.fascia,.28);
 // Night-safe branded LED ribbons (original text; no unlicensed club advertisements).
 const names=[['NIGHTBALL','THE NEXT GENERATION','#4bdcf2'],['PLAY BALL','EVERY INNING COUNTS','#e4c26d'],['THE SHOW','LIGHTS ON. GAME ON.','#74dbad']];
 for(let i=0;i<3;i++){
  const angle=(i-1)*.28,p=radial(wall+17,angle,7.9);
  addAdBoard(group,{x:p.x,y:p.y,z:p.z,angle:angle+PI},[16.5,4.5],names[i],names[i][2]);
 }
}
/** Adds geometry only on capable WebGL devices; keeps CPU compatibility path intact. */
export function buildPremiumPark(renderer,park){
 if(renderer.gl.isSoftwareRenderer)return;
 const group=renderer.parkDecor;
 if(!group||!park)return;
 const materials={
  steel:mat(0x829ca9,.33,.66), fascia:mat(0x26384e,.48,.36),
  glass:mat(0x385c74,.14,.45,{transparent:true,opacity:.81,side:T.DoubleSide}),
  roof:mat(park.theme==='dome'?0x536c85:0x748fa1,.48,.36,{side:T.DoubleSide}),
  light:new T.MeshBasicMaterial({color:park.theme==='dome'?0xa3ecff:0x70c8e8}),
  wood:mat(0x97785c,.86,.05)
 };
 for(const [idx,segment] of park.stands.entries()){
  const deck=addSeatDeck(group,park,segment,2);
  addConcourse(group,park,deck,idx,materials);
 }
 addFieldFixtures(group,park,materials);
 group.userData.premium=true;
 renderer.scene.userData.staticRevision=(renderer.scene.userData.staticRevision||0)+1;
}

/** Detail additions that preserve the large-head, tiny-body chibi proportions. */
export function decorateChibiPlayer(renderer,p){
 if(renderer.gl.isSoftwareRenderer)return;
 const head=p.head,body=p.body,root=p.root;
 const bright=renderer.mat('premiumFaceHighlight',0xffffff,.14);
 const iris=renderer.mat('premiumEyes',0x162d3c,.22);
 const cheek=renderer.mat('premiumCheeks',0xf0a88d,.92);
 const dark=renderer.mat('premiumDarkTrim',0x152a38,.46);
 const jerseyLight=renderer.mat('premiumWhiteStitch',0xf5f5ea,.72);
 const gold=renderer.mat('premiumGoldStitch',0xf2ca72,.48,.32);
 const cap=p.capMat,accent=p.accentMat;
 const ellipse=(parent,scale,pos,material)=>renderer.ellipsoid(parent,scale,pos,material,true);
 for(const side of [-1,1]){
  // Large sparkling eyes and softened cheeks: deliberately not realistic anatomy.
  ellipse(head,[.047,.067,.013],[side*.143,-.006,.416],iris);
  ellipse(head,[.019,.025,.009],[side*.130,.045,.432],bright);
  ellipse(head,[.048,.025,.012],[side*.225,-.078,.384],cheek);
  // Round helmet ear cover, raised lip, and air vent; keep original silhouette.
  ellipse(head,[.13,.16,.085],[side*.409,-.080,.07],cap);
  ellipse(head,[.045,.014,.013],[side*.282,.305,.278],dark);
  ellipse(head,[.023,.009,.016],[side*.31,.274,.315],gold);
  // Shoulder inserts and sleeve cuff trims share the team's live colour.
  ellipse(body,[.14,.095,.145],[side*.286,.89,.015],accent);
  ellipse(body,[.10,.035,.09],[side*.353,.742,.10],jerseyLight);
  // Premium cleat stripe and tongue details.
  ellipse(root,[.10,.024,.16],[side*.17,.103,.213],jerseyLight);
  ellipse(root,[.062,.015,.08],[side*.17,.115,.276],accent);
 }
 const c=new T.CatmullRomCurve3([
  new T.Vector3(-.13,.93,.232),new T.Vector3(-.09,.81,.295),
  new T.Vector3(-.06,.64,.287),new T.Vector3(-.06,.50,.241)
 ]);
 const c2=new T.CatmullRomCurve3([
  new T.Vector3(.13,.93,.232),new T.Vector3(.09,.81,.295),
  new T.Vector3(.06,.64,.287),new T.Vector3(.06,.50,.241)
 ]);
 for(const curve of [c,c2]){
  const piping=renderer.mesh(new T.TubeGeometry(curve,20,.008,5,false),accent,body);
  piping.castShadow=false;
 }
 // Rounded jersey buttons and polished team badge over the chest.
 for(let j=0;j<3;j++)ellipse(body,[.015,.014,.008],[0,.81-j*.09,.298-j*.008],gold);
 // A fine raised crest on the cap is the only decorative player flourish.
 const crest=ellipse(head,[.16,.015,.14],[0,.355,.11],cap);
 crest.castShadow=false;
}
