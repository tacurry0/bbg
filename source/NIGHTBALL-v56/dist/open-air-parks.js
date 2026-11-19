import * as T from './vendor/three.module.min.js';
import { bowlPoint, boxBatch, dugouts, flatVision, mesh, parkSign, standsSection, strip, varying } from './broadcast-dome.js?v=61';

export const OPEN_AIR_MODELS={night:'intercontinental',brick:'tianmu',sky:'tainan'};
const PI=Math.PI,TAU=PI*2;
const blue=[0x173878,0x264c9c,0x1a3b80,0x3055a3];
const teal=[0x238a85,0x389c92,0x278d83,0x65aea0];
const red=[0xa84342,0xc55d5b,0xd57260,0xab5144];
const fanColors=[0xece6d3,0x2d3040,0xf1ad24,0xfabd39,0xe0d9cb,0x343c5a,0xe9c075];
const lionsColors=[0xf58a42,0xbc5b37,0xf1ede4,0x2a343c,0xeb9951,0x529281,0xd5d7cf];
const blueSky=['#2d65ab','#6cabe2','#c5ddef'];
const duskSky=['#465c83','#8495ae','#e8c6a2'];
const tainanSky=['#6394be','#b2cde0','#e8dfd1'];

function materials(renderer,id){
 const get=(name,color,roughness=.8)=>{
  const surface=renderer.mat('outdoor:'+id+':'+name,color,roughness);
  surface.side=T.DoubleSide;
  return surface;
 };
 return {
  concrete:get('concrete',0xb2b7b2),steps:get('stairs',0xcdcabd),instance:get('instances',0xffffff),
  shadow:get('shadow',0x222b2d),canvas:get('black led',0x101819),steel:get('steel',0x687276,.59),
  eye:get('green pads',0x274f43),blue:get('navy seats',blue[0]),seats:get('teal seats',teal[0]),
  coral:get('coral seats',red[0]),roof:get('roof cladding',0x475157,.69),
  foulTrack:get('foul territory track',id==='brick'?0xa65750:0xaa7457)
 };
}

function boxes(group,name,material,entries){
 return boxBatch(group,name,entries.map(([point,size,color])=>({point,size,color})),material);
}

function section(group,name,m,software,range,shape,palette,base,attendance=0,shirts=fanColors){
 const [start,end]=range,[width,depth,floor,rows,run,rise]=shape;
 standsSection(group,name,m,{start,end,width,depth,floor,rows,run,rise,palette,base,concourse:true,attendance,shirts},software);
}

function supportBeams(group,name,segments,material){
 const beams=new T.InstancedMesh(new T.BoxGeometry(1,1,1),material,segments.length);
 beams.name=name;
 const anchor=new T.Object3D(),axis=new T.Vector3(0,1,0),start=new T.Vector3(),end=new T.Vector3();
 segments.forEach(([a,b,w,d=w],i)=>{
  start.set(...a);end.set(...b).sub(start);
  anchor.position.copy(start).addScaledVector(end,.5);
  anchor.scale.set(w,end.length(),d);
  anchor.quaternion.setFromUnitVectors(axis,end.normalize());
  anchor.updateMatrix();beams.setMatrixAt(i,anchor.matrix);
 });
 group.add(beams);
}

function backstop(renderer,group,m,width,depth){
 const soft=renderer.gl.isSoftwareRenderer,columns=soft?20:130,rows=soft?3:27;
 const low=1.35,high=12.4,start=1.51,end=TAU-start;
 const point=(i,y)=>bowlPoint(start+i/columns*(end-start),width,depth,y);
 const outline=[];
 for(let i=0;i<=columns;i++)outline.push(...point(i,high));
 const frameMat=renderer.mat('outdoor:net posts',0x3c5050,.68);
 const posts=Array.from({length:13},(_,i)=>{
  const a=(start+(end-start)*i/12),foot=bowlPoint(a,width,depth,low),top=bowlPoint(a,width,depth,high+.10);
  return [foot,[top[0],high,top[2]],.074];
 });
 supportBeams(group,'Protective net uprights',posts,frameMat);
 const wires=[];
 for(let i=0;i<=columns;i++)wires.push(...point(i,low),...point(i,high));
 for(let j=0;j<=rows;j++)for(let i=0;i<columns;i++){
  const y=low+(high-low)*j/rows;
  wires.push(...point(i,y),...point(i+1,y));
 }
 const line=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(wires,3)),
  new T.LineBasicMaterial({color:0x34464a,transparent:true,opacity:soft?.29:.17,depthWrite:false}));
 line.name='Infield protective net';line.userData.disposeMaterial=true;group.add(line);
 const rail=new T.Line(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(outline,3)),
  new T.LineBasicMaterial({color:0x323e3e,transparent:true,opacity:.74,depthWrite:false}));
 rail.userData.disposeMaterial=true;group.add(rail);
 strip(group,'Low backstop retaining wall',m.eye,[[width,depth,0],[width,depth,low]],start,end,soft?36:84);
 strip(group,'Curved foul-territory warning track',m.foulTrack,
  [[width-4,depth-2.45,.025],[width,depth,.027]],start,end,soft?36:84);
}

function trees(renderer,group,name,{z,spread,count,colors}){
 const isLow=renderer.gl.isSoftwareRenderer;
 const n=isLow?Math.ceil(count*.66):count;
 const tree=new T.InstancedMesh(new T.IcosahedronGeometry(1,isLow?0:1),renderer.mat('outdoor:tree leaf',0xffffff,.95),n);
 const pose=new T.Object3D();
 for(let i=0;i<n;i++){
  const x=(i/(n-1)-.5)*spread,y=2.2+varying(11+i*51)*1.7;
  pose.position.set(x,y,z+varying(i*139+15)*8);
  pose.scale.set(3.4+varying(37+i*351)*2.4,y*.85,3.6+varying(78+i*120)*2);
  pose.rotation.y=i*.71;pose.updateMatrix();
  tree.setMatrixAt(i,pose.matrix);tree.setColorAt(i,new T.Color(colors[i%colors.length]));
 }
 tree.name=name;group.add(tree);
}

function placeVision(group,r,m,config){
 flatVision(group,r,m,config);
 const {x,y,z,width,height}=config,foot=y-height/2;
 boxes(group,'Vision stanchions',m.steel,[-1,1].map(side=>[[x+side*width*.29,foot/2,z+.15],[1.45,foot,1.57]]));
}

function taichungMall(group,m){
 boxes(group,'Taichung multi-level outfield complex',m.instance,[
  [[13,13,176],[53,26,22],0x353a3e], [[12,29.0,173],[53,9.6,22],0xb5b6a7],
  [[-5,38,171],[18,12,22],0xb39363], [[17,37.3,173],[25.5,9.5,22],0xd2cfc0],
  [[45,21,178],[59,42,24],0xd4d1c0], [[47,17,164.7],[43.5,12,2.0],0xcba26c],
  [[63,41.5,172],[16,11.8,20],0xd7d2bf], [[47,37.7,177],[18,13,19],0xbebbad],
  [[101,19,174],[60,38,24],0xc4c5bb], [[128,22,178],[20,43,24],0xc8c4b7],
  [[76,20,161.5],[6,40,4],0x759093], [[125,20,161.5],[6,40,4],0x718c89]
 ]);
 const bands=[];
 for(const level of [13.0,20.1,27.3,34.1])bands.push([[102,level,161.6],[49,4.1,.4],0x383d43]);
 for(let y=3;y<41;y+=3.1)for(const x of [76,125])bands.push([[x,y,159.38],[6.25,.27,.25],0x567477]);
 for(const [y,x,w] of [[24,40,51],[31.2,14,49],[35.5,36,64],[26,57,25],[43.3,64,14]])
  bands.push([[x,y,161.2],[w,.46,.44],0x65635d]);
 boxes(group,'Parking deck openings and glass tower mullions',m.instance,bands);
}

function intercontinental(group,r,m,soft){
 const green=[0x4d9b79,0x559d82,0x6fac8a],skyBlue=[0x4c79a2,0x5d8ab2,0x638bb8];
 for(const side of [-1,1]){
  for(const [i,[a,b]] of [[.20,.40],[.42,.62],[.64,.91],[.93,1.22],[1.24,1.48]].entries()){
   const palette=[skyBlue,red,green,red,green][(i+(side<0?1:0))%5];
   const seat=r.mat('outdoor:night:strip-'+palette[0],palette[0]);seat.side=T.DoubleSide;
   section(group,'Taichung multicolored outfield terrace',m,soft,side>0?[a,b]:[-b,-a],
    [87,77,2.45,8,.97,.45],palette,seat,.26);
  }
 }
 section(group,'Taichung blue lower infield bowl',m,soft,[1.47,TAU-1.47],[70,69,1.55,20,.92,.49],blue,m.blue,.48);
 section(group,'Taichung green upper infield seats',m,soft,[1.72,TAU-1.72],[89,88,12.5,11,.96,.60],green,m.seats,.23);
 boxes(group,'Taichung center-field sight screen',m.eye,[[[0,4.0,127],[26,8.0,2.25]]]);
 placeVision(group,r,m,{name:'Taichung left-center main vision',x:-33,y:16.45,z:142,width:43,height:12.4,angle:-.095});
 parkSign(group,'洲際棒球場',[-33,23.4,141.25],16.8,1.12,'#ede6cc','#213538').rotation.y=-.095;
 const flags=[];
 for(let i=-2;i<=2;i++){
  const x=-33+i*7;
  flags.push([[x,25.4,142],[.10,5.1,.10],0xc5c5b6],[[x+.73,26.3,142],[1.46,.80,.08],i%2?0x475b77:0xd4c4a5]);
 }
 boxes(group,'Lightweight flags above the vision',m.instance,flags);
 taichungMall(group,m);
 const highway=[[[ -111,9.7,176],[116,1.65,10],0x727673]];
 for(let x=-163;x<-51;x+=20)highway.push([[x,4.6,176],[2,9.2,5],0x838984]);
 boxes(group,'Elevated road beyond left field',m.instance,highway);
 trees(r,group,'Trees beneath the Taichung outfield buildings',{z:155,spread:207,count:28,colors:[0x3b5841,0x455c3d,0x4d6146]});
 backstop(r,group,m,69,68);
 dugouts(group,m);
}

function mountain(group,name,color,distance,base,scale,phase){
 const positions=[],faces=[];
 for(let i=0;i<=80;i++){
  const x=(i-40)*6.6,z=distance+Math.sin(i*.154+phase)*7.2;
  const height=base+scale*(.45*Math.sin(i*.146+phase)+.32*Math.sin(i*.071+phase*2)+.13*Math.sin(i*.45)+.10*varying(i*53+15));
  positions.push(x,0,z,x,height,z);
  if(i<80){const a=i*2;faces.push(a,a+1,a+2,a+1,a+3,a+2);}
 }
 const g=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(positions,3)).setIndex(faces);
 mesh(group,name,g,new T.MeshBasicMaterial({color,side:T.DoubleSide})).userData.disposeMaterial=true;
}

function groundWord(group){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=192;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#f1eddb';ctx.textAlign='center';ctx.font='950 160px system-ui,sans-serif';
 ctx.fillText('T A I P E I',512,151,1004);
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
 const mat=new T.MeshBasicMaterial({map,transparent:true,alphaTest:.40,side:T.DoubleSide,depthWrite:false,toneMapped:false});
 const mark=mesh(group,'TAIPEI lettering behind home plate',new T.PlaneGeometry(29.5,4.7),mat);
 mark.rotation.x=-PI/2;mark.scale.y=-1;mark.position.set(0,.085,-10.9);
 mark.userData.disposeMaterial=true;mark.userData.disposeTexture=true;
}

function tianmu(group,r,m,soft){
 const aqua=[0x3084b3,0x52a4c2,0x347da7,0x66b4cd],green=[0x507d68,0x61927b,0x569580];
 section(group,'Tianmu red field-level seats',m,soft,[1.53,TAU-1.53],[65,64,1.68,7,.98,.44],red,m.coral,.16);
 section(group,'Tianmu sky-blue infield stands',m,soft,[1.47,TAU-1.47],[73,72,5.30,17,.98,.56],aqua,m.seats,.24);
 for(const range of [[.20,1.41],[-1.41,-.20]])section(group,'Tianmu low green outer terraces',m,soft,range,[86,76,2.2,5,1.05,.45],green,m.eye);
 mountain(group,'Distant foothills above Tianmu',0x627f86,256,43,14,.4);
 mountain(group,'Tianmu green mountain ridge',0x45654e,216,30,12,.92);
 const blocks=[];
 for(let i=0;i<19;i++){
  const x=-99+i*12,y=4.5+9*varying(i*83+16);
  blocks.push([[x,y/2,163+varying(i*99+117)*21],[7.3,y,9.0],i%3?0xb3b7ae:0x7b8886]);
 }
 for(let i=0;i<5;i++){
  const x=-95-i*10,y=22+i*3;
  blocks.push([[x,y/2,158+i*3],[8.6,y,9],i%2?0x9b9690:0x898c85]);
  for(let j=4;j<y;j+=2.25)blocks.push([[x,j,153.47+i*3],[8.5,.32,.24],0x525c5e]);
 }
 boxes(group,'Tianmu distant city and apartments',m.instance,blocks);
 trees(r,group,'Tianmu treeline',{z:149,spread:200,count:29,colors:[0x46694d,0x57774e,0x365b47]});
 boxes(group,'Tianmu center sight screen',m.eye,[[[11,3.15,127],[21,6.3,1.6]]]);
 placeVision(group,r,m,{name:'Tianmu low center scoreboard',x:-9.5,y:8.3,z:137,width:20,height:8.3,angle:-.025});
 groundWord(group);backstop(r,group,m,64,64);
 dugouts(group,m);
}

function tainanCanopy(group,m,soft){
 const start=1.24,end=TAU-start;
 const inner=[62,73,27.5],outer=[102,107,35.6],n=soft?24:55;
 const roofMap=(name,mat,profile)=>strip(group,name,mat,profile,start,end,n*2);
 roofMap('Tainan horseshoe canopy',m.roof,[inner,outer]);
 roofMap('Tainan continuous inner catwalk',m.steel,[[61.25,72.35,27.0],[66,77.1,27.09]]);
 roofMap('Tainan leading edge fascia',m.steel,[[62.0,73,27.0],[62.0,73,28.45]]);
 roofMap('Tainan back gutter',m.shadow,[[102,107,34.9],[103,108,36.1]]);
 for(const width of [69,76,83,91,98]){
  const t=(width-62)/40,d=73+t*34,y=26.72+t*8.1;
  roofMap('Tainan longitudinal steel purlin',m.steel,[[width,d,y],[width+.38,d+.31,y+.17]]);
 }
 const beams=[],columns=[],crossings=[];
 for(let i=0;i<=n;i++){
  const a=start+(end-start)*i/n,next=start+(end-start)*Math.min(i+1,n)/n;
  const lip=bowlPoint(a,62,73,27.22),back=bowlPoint(a,102,107,35.40);
  const lower=bowlPoint(a,97,102,29.5);
  beams.push([lip,back,.38,.32],[lip,lower,.25,.26],[lower,back,.28]);
  if(i<n)crossings.push([bowlPoint(a,75,83,29.75),bowlPoint(next,89,96,31.95),.20],
   [bowlPoint(next,75,83,29.75),bowlPoint(a,89,96,31.95),.20]);
  if(i%4===0)columns.push([bowlPoint(a,102,107,1.1),back,.75], [bowlPoint(a,92,98,18.7),lower,.51]);
 }
 supportBeams(group,'Tainan radial canopy trusses',beams,m.steel);
 supportBeams(group,'Tainan diagonal roof bracing',crossings,m.steel);
 supportBeams(group,'Tainan outer canopy columns',columns,m.concrete);
}

function tainan(group,r,m,soft){
 const muted=[0x44786f,0x5a8e84,0x397c77,0x608b80];
 const crowd=soft?.33:.62;
 section(group,'Tainan two-tier lower infield bowl',m,soft,[1.42,TAU-1.42],
  [68,66,1.55,22,.87,.54],muted,m.seats,crowd,lionsColors);
 section(group,'Tainan upper deck beneath the steel roof',m,soft,[1.46,TAU-1.46],
  [83,82,14.62,16,.95,.60],muted,m.seats,crowd,lionsColors);
 strip(group,'Tainan white balcony apron',m.concrete,[[82.35,81.35,12.9],[82.35,81.35,15.05]],1.46,TAU-1.46,soft?36:88);
 for(const range of [[.20,1.36],[-1.36,-.20]])section(group,'Tainan climbing outfield bowl',m,soft,range,
  [87,77,3.25,15,1.10,.59],teal,m.seats,crowd,lionsColors);
 boxes(group,'Tainan green center wall',m.eye,[[[0,5.0,126],[22,10,2.15]]]);
 boxes(group,'Tainan distant construction tower and low pavilions',m.instance,[
  [[27,18.8,184],[22,37.6,15],0x73787b],[[37,18.0,178.6],[6,36.1,6],0x9d927e],
  [[-65,5.4,166],[38,10.8,15],0xb49d87], [[-65,11.2,168],[40,1.7,15],0x6c7473],
  [[81,5,163],[39,10,13],0xb8b5a6],[[57,3.2,174],[19,6.4,13],0xb2b1a8]
 ]);
 const towerFloors=[];
 for(let y=4;y<36;y+=3)towerFloors.push([[27,y,176.34],[21,.39,.26],0x4d5b65]);
 boxes(group,'Tainan skyline floor lines',m.instance,towerFloors);
 placeVision(group,r,m,{name:'Tainan left-center orange main vision',x:-24,y:15.2,z:143,width:29,height:9.2,angle:-.07});
 tainanCanopy(group,m,soft);backstop(r,group,m,67,65);dugouts(group,m);
}

export function decorateOpenAirPark(renderer,park){
 const group=renderer.parkDecor,soft=renderer.gl.isSoftwareRenderer;
 const m=materials(renderer,park.id),taichung=park.id==='night',tianmuPark=park.id==='brick';
 if(taichung)intercontinental(group,renderer,m,soft);
 else if(tianmuPark)tianmu(group,renderer,m,soft);
 else tainan(group,renderer,m,soft);

 renderer.scene.userData.outdoorSky=taichung?duskSky:tianmuPark?blueSky:tainanSky;
 renderer.scene.fog.density=taichung?.00185:.00165;
 renderer.scene.fog.color.setHex(taichung?0xa9a8ae:tianmuPark?0x9fbed4:0xc5c8c2);
 if(renderer.sky){
  const uniforms=renderer.sky.material.uniforms;
  uniforms.uNight.value=0;
  uniforms.uRural.value=tianmuPark?1:0;
  uniforms.zenith.value.set(taichung?0x657b9c:tianmuPark?0x2a62ae:0x688eaf);
  uniforms.horizon.value.set(taichung?0xe3c7ad:tianmuPark?0xaad0e6:0xe3e4dc);
 }
 renderer.grassMaterial.color.setHex(taichung?0x648c46:tianmuPark?0x568744:0x659649);
 renderer.dirt.color.setHex(tianmuPark?0xd48472:0xd7a080);
 renderer.lights.forEach((light,i)=>{
  light.visible=taichung?i!==0&&i!==5:tianmuPark||i===2||i===3;
  light.scale.set(.72,taichung?1.13:tianmuPark?.95:1.18,.72);
 });
}
