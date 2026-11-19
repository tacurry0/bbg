import * as T from './vendor/three.module.min.js';
import { bowlPoint, boxBatch, dugouts, flatVision, mesh, parkSign, standsSection, strip, varying } from './broadcast-dome.js?v=70';

export const OPEN_AIR_MODELS={
 night:'intercontinental',brick:'tianmu',sky:'tainan',
 harbor:'xinzhuang',river:'chengcing-lake',toyama:'alpen-stadium'
};
const PI=Math.PI,TAU=PI*2;
const blue=[0x173878,0x264c9c,0x1a3b80,0x3055a3];
const teal=[0x238a85,0x389c92,0x278d83,0x65aea0];
const red=[0xa84342,0xc55d5b,0xd57260,0xab5144];
const fanColors=[0xece6d3,0x2d3040,0xf1ad24,0xfabd39,0xe0d9cb,0x343c5a,0xe9c075];
const lionsColors=[0xf58a42,0xbc5b37,0xf1ede4,0x2a343c,0xeb9951,0x529281,0xd5d7cf];
function materials(renderer,park){
 const {id}=park;
 const get=(name,color,roughness=.8)=>{
  const surface=renderer.mat('outdoor:'+id+':'+name,color,roughness);
  surface.side=T.DoubleSide;
  return surface;
 };
 return {
  concrete:get('concrete',0xb2b7b2),steps:get('stairs',0xcdcabd),instance:get('instances',0xffffff),
  shadow:get('shadow',0x222b2d),canvas:get('black led',0x101819),steel:get('steel',0x687276,.59),
  eye:get('padded walls',REGIONAL_MODELS[id]?park.wall:0x274f43),blue:get('navy seats',blue[0]),seats:get('teal seats',teal[0]),
  coral:get('coral seats',red[0]),roof:get('roof cladding',0x475157,.69),
  foulTrack:get('foul territory track',park.foulTrack)
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

function backstop(renderer,group,m,width,depth,trackWidth=2.45){
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
  [[width-4,depth-trackWidth,.025],[width,depth,.027]],start,end,soft?36:84);
}

const REFERENCE_BACKSTOPS={
 'tokyo-dome':{width:57,depth:72,trackWidth:2.45,base:0x214136},
 'taipei-dome':{width:62,depth:75,trackWidth:5,base:0x252b35},
 dome:{width:59,depth:70,trackWidth:3.8,base:0x244746}
};

export function addReferenceBackstop(renderer,park){
 const frame=REFERENCE_BACKSTOPS[park.id];
 if(!frame)return;
 const surface=(name,color)=>{
  const material=renderer.mat(park.id+':'+name,color);
  material.side=T.DoubleSide;
  return material;
 };
 backstop(renderer,renderer.parkDecor,{
  eye:surface('backstop padding',frame.base),foulTrack:surface('backstop track',park.foulTrack)
 },frame.width,frame.depth,frame.trackWidth);
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
 backstop(r,group,m,69,68,3.4);
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

function groundWord(group,label,font='950 160px system-ui,sans-serif',width=29.5,depth=4.7,z=-10.9){
 const canvas=document.createElement('canvas');canvas.width=label.length===1?192:1024;canvas.height=192;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#f1eddb';ctx.textAlign='center';ctx.font=font;
 ctx.fillText(label,canvas.width/2,151,canvas.width-20);
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
 const mat=new T.MeshBasicMaterial({map,transparent:true,alphaTest:.40,side:T.DoubleSide,depthWrite:false,toneMapped:false});
 const mark=mesh(group,label.replaceAll(' ','')+' lettering behind home plate',new T.PlaneGeometry(width,depth),mat);
 mark.rotation.x=-PI/2;mark.scale.y=-1;mark.position.set(0,.085,z);
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
 groundWord(group,'T A I P E I');backstop(r,group,m,64,64,3.7);
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
 tainanCanopy(group,m,soft);backstop(r,group,m,67,65,4.2);dugouts(group,m);
}

function residentialSkyline(group,m,name,buildings){
 const frames=[],balconies=[];
 for(const [x,z,width,height,depth,facade] of buildings){
  frames.push([[x,height/2,z],[width,height,depth],facade]);
  const front=z-depth/2;
  for(let y=3.1;y<height-.8;y+=2.8){
   balconies.push([[x,y,front-.12],[width*.94,.82,.28],0x586270],
    [[x,y-.55,front-.26],[width,.22,.61],0xb1b2ac]);
   for(const i of [-.26,0,.26])balconies.push([[x+width*i,y,front-.31],[.22,1.46,.13],facade]);
  }
  frames.push([[x+width*.23,height+.65,z],[width*.26,1.3,depth*.40],0x909a9c]);
 }
 boxes(group,name,m.instance,frames);
 boxes(group,name+' balcony and window bands',m.instance,balconies);
}

function arcadeCanopy(group,r,m,soft){
 const start=1.48,end=TAU-start,count=soft?18:29,sub=soft?4:8;
 const shell=r.mat('Xinzhuang curved light canopy',0xcdd0c9,.63);
 shell.side=T.DoubleSide;
 const vertices=[],faces=[],supports=[],columns=[];
 const lip=(a,y)=>bowlPoint(a,84,84,y);
 for(let bay=0;bay<count;bay++){
  const a=start+(end-start)*bay/count,b=start+(end-start)*(bay+1)/count;
  const index=vertices.length/3;
  for(let i=0;i<=sub;i++){
   const u=i/sub,angle=T.MathUtils.lerp(a,b,u),arch=1.90*Math.sin(PI*u);
   vertices.push(...lip(angle,24.5+arch),...bowlPoint(angle,107,108,28.5+arch*.82));
   if(i<sub){
    const j=index+i*2;faces.push(j,j+1,j+2,j+1,j+3,j+2);
    const angle2=T.MathUtils.lerp(a,b,(i+1)/sub);
    supports.push([lip(angle,24.39+arch),lip(angle2,24.39+1.90*Math.sin(PI*(i+1)/sub)),.13]);
   }
  }
  supports.push([lip(a,23.72),bowlPoint(a,107,108,27.79),.39,.70],
   [lip(a,23.72),bowlPoint(a,104,105,23.0),.22,.29]);
  if(bay%3===0)columns.push([bowlPoint(a,104,105,13),bowlPoint(a,104,105,27.3),.59]);
 }
 const geometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(vertices,3)).setIndex(faces);
 geometry.computeVertexNormals();
 mesh(group,'Xinzhuang scalloped infield canopy',geometry,shell);
 supportBeams(group,'Xinzhuang curved edges and exposed steel beams',supports,m.steel);
 supportBeams(group,'Xinzhuang roof columns',columns,m.concrete);
}

function xinzhuang(group,r,m,soft){
 const seats=[0x1e55a0,0x2c68b3,0x376b9f,0x224682];
 const shirts=[0x1b3560,0x5c77a2,0x1e4f91,0xf0e8da,0xc6c9cb,0x252c41];
 const lower=[1.38,TAU-1.38],upper=[1.45,TAU-1.45];
 const promenade=r.mat('Xinzhuang tan warning-track concourse',0xad8160);promenade.side=T.DoubleSide;
 section(group,'Xinzhuang lower blue bowl',m,soft,lower,[67,69,1.7,18,.86,.55],seats,m.blue,.55,shirts);
 section(group,'Xinzhuang overhanging blue upper deck',m,soft,upper,[81.5,83.5,12.2,13,.88,.67],seats,m.blue,.56,shirts);
 strip(group,'Xinzhuang pale upper-deck fascia',m.concrete,[[81.4,83.4,10.7],[81.4,83.4,12.56]],...upper,soft?30:72);
 strip(group,'Xinzhuang wood-tone field-level promenade',promenade,[[61,64,.03],[68,69,.05]],...lower,soft?36:84);
 const suites=[],windows=[];
 for(let i=0;i<6;i++){
  const angle=PI+(i-2.5)*.102;
  suites.push({point:bowlPoint(angle,95,98,22.15),size:[8.2,2.8,2.7],angle});
  windows.push({point:bowlPoint(angle,94.4,96.6,22.36),size:[6.6,1.65,.20],angle});
 }
 boxBatch(group,'Xinzhuang six infield suites',suites,m.concrete);
 boxBatch(group,'Xinzhuang dark suite glazing',windows,m.shadow);
 for(const range of [[.21,1.43],[-1.43,-.21]])
  section(group,'Xinzhuang low open blue outfield seats',m,soft,range,[86,77,2.75,8,.90,.45],seats,m.blue,.42,shirts);
 for(const side of [-1,1]){
  const range=side<0?[-1.34,-.23]:[.23,1.34];
  strip(group,'Xinzhuang navy outfield ribbon housing',m.blue,[[85.5,76.2,2.84],[85.5,76.2,3.56]],...range,soft?20:48);
 }
 boxes(group,'Xinzhuang black center-field batter’s eye',m.shadow,[
  [[0,5.4,128],[22,10.8,2.15]],[[0,3.15,125.8],[20,2.1,.7]]
 ]);
 const eyeSlats=[];
 for(let y=4.4;y<10.8;y+=.74)eyeSlats.push([[0,y,126.8],[21.7,.12,.16],0x4c5152]);
 boxes(group,'Xinzhuang batters-eye horizontal slats',m.instance,eyeSlats);
 placeVision(group,r,m,{name:'Xinzhuang left-center main vision',x:-23,y:14.0,z:137,width:23,height:9.8,angle:-.07});
 placeVision(group,r,m,{name:'Xinzhuang right-center auxiliary vision',x:23,y:13.55,z:139,width:15.5,height:10.2,angle:.07,variant:'auxiliary'});
 residentialSkyline(group,m,'Xinzhuang apartment skyline',[
  [-115,190,9,38,10,0x858b8c],[-77,166,34,23,12,0xa4aaa8],[-45,178,15,31,15,0xb1b3ae],
  [-23,178,22,34,13,0xbcbab2],[2,184,25,30,14,0x909998],[25,185,10,23,11,0x93a1a4],
  [48,182,19,18,12,0xa3a7a4],[70,191,12,25,11,0x9da8a9],[96,194,28,23,16,0xa8a49e]
 ]);
 trees(r,group,'Xinzhuang trees behind the outfield seating',{z:150,spread:213,count:39,colors:[0x425c36,0x5e6f42,0x45684b]});
 arcadeCanopy(group,r,m,soft);
 backstop(r,group,m,61,64,4.6);
 dugouts(group,m,{lateral:47,depth:18});
 groundWord(group,'G','italic 900 154px Georgia,serif',10,7,-11.7);
}

function chengcingCanopies(group,r,m,soft){
 const shell=r.mat('Chengcing pale roof cladding',0xd7d7cd,.62);
 shell.side=T.DoubleSide;
 const ranges=[[1.43,2.28],[TAU-2.28,TAU-1.43]];
 for(const [a,b] of ranges){
  const segments=soft?13:28;
  strip(group,'Chengcing cantilevered infield wing roofs',shell,
   [[74.5,84,29.8],[83,91,31.44],[99.6,104,32.5],[109,113,31.35]],a,b,segments);
  strip(group,'Chengcing white roof fascia',m.steps,[[74.5,84,29.4],[74.5,84,30.2]],a,b,segments);
  const ribs=[],posts=[];
  for(let i=0;i<=12;i++){
   const angle=a+(b-a)*i/12;
   const lip=bowlPoint(angle,74.7,84.2,29.48),top=bowlPoint(angle,106,110,31.9);
   const tie=bowlPoint(angle,104,107,27.6);
   ribs.push([lip,top,.27],[lip,tie,.18],[tie,top,.24]);
   if(i%3===0)posts.push([bowlPoint(angle,104,107,19.5),tie,.63]);
  }
  supportBeams(group,'Chengcing roof cantilever trusses',ribs,m.steps);
  supportBeams(group,'Chengcing upper deck support piers',posts,m.concrete);
 }
}

function chengcing(group,r,m,soft){
 const green=[0x36756a,0x518a76,0x689b87,0x4f8c82];
 const paleBlue=[0x5597b7,0x5794a9,0x3f768e,0x769eae];
 const shirts=[0xe2e1d4,0x222f3d,0x235143,0x427964,0xc3cbc1,0x99ac99];
 const lower=[1.38,TAU-1.38],middle=[1.43,TAU-1.43];
 section(group,'Chengcing green field-level bowl',m,soft,lower,[62,65,1.85,12,1.04,.55],green,m.seats,.62,shirts);
 section(group,'Chengcing middle concourse seats',m,soft,middle,[75.7,77.7,9.2,13,.96,.59],green,m.seats,.57,shirts);
 section(group,'Chengcing blue seats behind home plate',m,soft,[2.30,TAU-2.30],[89,91,17.7,10,.96,.57],paleBlue,m.blue,.57,shirts);
 for(const [a,b] of [[1.42,2.28],[TAU-2.28,TAU-1.42]]){
  section(group,'Chengcing elevated green infield wings',m,soft,[a,b],[86.8,88.6,17.9,13,1.01,.70],green,m.seats,.54,shirts);
  strip(group,'Chengcing stepped pale concrete balcony',m.concrete,[[86.4,88.2,15.9],[86.4,88.2,18.18]],a,b,soft?18:38);
 }
 const yellow=r.mat('Chengcing yellow rails',0xd6b041,.56);yellow.side=T.DoubleSide;
 for(const [w,d,y] of [[73.8,77.2,8.93],[88.4,90.6,18.2]])
  strip(group,'Chengcing yellow concourse rail',yellow,[[w,d,y],[w,d,y+.2]],...middle,soft?24:70);
 for(const range of [[.17,1.45],[-1.45,-.17]])
  section(group,'Chengcing outfield green terraces',m,soft,range,[87,77,2.82,9,.96,.48],green,m.eye,.40,shirts);
 const steps=[];
 for(let i=0;i<16;i++)steps.push([[0,2.90+i*.30,124.52+i*.88],
  [25.3+i*.09,.31,.89],i%2?0x272f30:0x343d3d]);
 boxes(group,'Chengcing black batter’s-eye steps',m.instance,steps);
 boxes(group,'Chengcing wide green scoreboard tower',m.eye,[
  [[0,10.1,141],[35.0,6.6,3.7]],[[0,16.55,141],[45.2,10.1,2.4]]
 ]);
 flatVision(group,r,m,{name:'Chengcing center-field two-panel vision',x:0,y:16.65,z:139.28,width:37.9,height:8.5});
 boxes(group,'Chengcing LED panel divider',m.eye,[[[-1.52,16.65,138.55],[.44,8.7,.16]]]);
 parkSign(group,'澄 清 湖 棒 球 場',[0,23.1,139.36],34,1.75,'#b2c7bd');
 const flags=[];
 for(const [x,color] of [[-14,0x496179],[0,0xaf4345],[14,0xd1c5a5]])
  flags.push([[x,24.15,140.3],[.09,5.3,.09],0xd1d1c0],[[x+.87,25.85,140.3],[1.74,.91,.075],color]);
 boxes(group,'Chengcing flagpoles above the center board',m.instance,flags);
 residentialSkyline(group,m,'Chengcing distant Kaohsiung buildings',[
  [-131,174,15,53,14,0x465965],[-110,189,13,29,13,0x929d9f],[-86,171,45,21,15,0x908f89],
  [-47,190,18,16,13,0xa8a69b],[-20,195,19,18,11,0x9fa8a5],
  [14,187,14,19,11,0x7f8d90],[73,190,27,16,10,0xa3a9a2],[117,183,20,36,14,0x4b5e67]
 ]);
 mountain(group,'Hills beyond Chengcing Lake',0x637b83,243,18,6,.32);
 trees(r,group,'Trees at the Chengcing Lake stadium edge',{z:154,spread:228,count:31,colors:[0x345642,0x486748,0x45704e]});
 chengcingCanopies(group,r,m,soft);
 backstop(r,group,m,60,63,5.0);
 dugouts(group,m,{lateral:46,depth:18});
}

function alpenScoreboard(group,r,m){
 const cabinet=r.mat('Alpen dark slate scoreboard',0x293746,.77);
 boxes(group,'Alpen 33-metre scoreboard cabinet',cabinet,[[[0,14.0,137],[33,12.685,1.8]]]);
 boxes(group,'Alpen green scoreboard pedestal',m.eye,[[[0,3.85,137.7],[24,7.7,4.0]]]);
 flatVision(group,r,m,{name:'Alpen center-field LED scoreboard',x:0,y:13.32,z:135.97,width:20.16,height:7.68});
 const vents=[];
 for(const side of [-1,1])for(let i=0;i<8;i++)vents.push([[side*13.3,10.5+i*.93,136.04],[3.45,.63,.15],i%2?0x2c4353:0x202d3e]);
 boxes(group,'Alpen scoreboard side ventilation grilles',m.instance,vents);
 parkSign(group,'ALPEN',[-4.6,18.87,136.03],7.0,1.42,'#dae4e5');
 parkSign(group,'STADIUM',[5.1,18.87,136.03],7.6,1.42,'#dae4e5');
 parkSign(group,'富 山 市 民 球 場',[0,8.75,136.03],13,.94,'#d3dadd');
 const ink=r.mat('Alpen clock face',0xdbe4e6,.59);
 const marks=[];
 for(let i=0;i<12;i++){
  const a=TAU*i/12;
  marks.push([[Math.sin(a)*.7,18.86+Math.cos(a)*.7,135.99],[Math.sin(a)*.88,18.86+Math.cos(a)*.88,135.99],.058]);
 }
 marks.push([[0,18.86,135.98],[.42,19.19,135.98],.065],[[0,18.86,135.98],[-.41,19.31,135.98],.058]);
 supportBeams(group,'Alpen scoreboard tower clock',marks,ink);
 const flags=[];
 for(let i=-2;i<=2;i++){
  flags.push([[i*4.2,22.44,137.2],[.083,4.2,.10],0xc5ccd2]);
  flags.push([[i*4.2+.76,23.55,137.2],[1.52,.79,.075],i===0?0xeae3d7:0x677f98]);
 }
 boxes(group,'Alpen scoreboard roof flagpoles',m.instance,flags);
}

function toyama(group,r,m,soft){
 const lower=[1.35,TAU-1.35];
 const mutedBlue=[0x3c6a9a,0x446f9b,0x7291ac,0x5586ad];
 const mutedRed=[0x9c565c,0x9d4e50,0xb16d69,0xaa6061];
 const mixed=[0x326081,0x6484a1,0x6b8fae,0x8aa0af];
 const berm=r.mat('Alpen olive grass berm',0x779052,.98);berm.side=T.DoubleSide;
 section(group,'Alpen lower blue infield seats',m,soft,lower,[66,70,1.45,8,.95,.48],mutedBlue,m.blue);
 section(group,'Alpen middle red infield seating band',m,soft,lower,[74.4,78.4,5.8,17,.91,.55],mutedRed,m.coral);
 section(group,'Alpen open upper blue infield stand',m,soft,[1.47,TAU-1.47],[91.1,95.2,15.85,13,.92,.60],mixed,m.blue);
 strip(group,'Alpen white infield rim',m.steps,[[103,107,23.65],[103.65,107.7,24.55]],1.47,TAU-1.47,soft?30:75);
 for(const [a,b] of [[.14,1.39],[-1.39,-.14]]){
  strip(group,'Alpen grass outfield berms',berm,[[86,76,2.0],[89,78.5,2.8],[103,92,6.45],[113,104,5.7],[118,109,.12]],a,b,soft?25:68);
  strip(group,'Alpen outfield top walk',m.steps,[[102.9,91.9,6.46],[104,93,6.51]],a,b,soft?25:68);
 }
 alpenScoreboard(group,r,m);
 mountain(group,'Alpen distant Tateyama ridgeline',0x9eb6c7,342,58,42,2.17);
 mountain(group,'Alpen near Tateyama foothills',0x789eae,282,33,24,.65);
 const farms=[];
 for(let i=0;i<24;i++){
  const x=-158+i*14,z=168+12*varying(i*76+35);
  farms.push([[x,.03,z],[11.9,.09,30],i%3?0x789753:0xa0a55c]);
  if(i%3!==1){
   const height=3.1+varying(i*68+11)*3.4;
   farms.push([[x,height*.5,z],[7.8,height,7.1],i%3?0x92938b:0xbca68a]);
  }
 }
 boxes(group,'Alpen farmland and village rooftops',m.instance,farms);
 trees(r,group,'Alpen treeline behind the grass terraces',{z:156,spread:236,count:28,colors:[0x3d6048,0x4d7256,0x526b44]});
 backstop(r,group,m,65,69,3.0);
 dugouts(group,m,{lateral:50,depth:17});
 groundWord(group,'T O Y A M A','950 152px system-ui,sans-serif',24,3.0,-15.6);
}

const REGIONAL_MODELS={harbor:xinzhuang,river:chengcing,toyama};
const FLOODLIGHT_LAYOUTS={
 harbor:[[-92,37,32],[-79,111,31],[-43,137,37],[43,137,37],[79,111,31],[92,37,32]],
 river:[[-76,24,5.3,29.1],[-65,120,36.8],[-35,140,35.5],[35,140,35.5],[65,120,36.8],[76,24,5.3,29.1]],
 toyama:[[-99,18,28.8],[-89,91,33],[-56,135,35],[56,135,35],[89,91,33],[99,18,28.8]]
};
function arrangeLightTowers(renderer,id){
 const layout=FLOODLIGHT_LAYOUTS[id];
 const double=id!=='harbor';
 renderer.lights.forEach((light,i)=>{
  const [x,z,height,base=0]=layout[i];
  const paired=double&&base===0;
  light.position.set(x,base,z);light.rotation.y=Math.atan2(x,z-28);
  light.scale.set(paired?.96:.82,height/31,1);
  light.userData.pole.visible=base===0;
  light.userData.pole.position.x=paired?-2.30:0;
  light.userData.secondPole.visible=paired;
 });
}

export function decorateOpenAirPark(renderer,park){
 const group=renderer.parkDecor,soft=renderer.gl.isSoftwareRenderer;
 const m=materials(renderer,park),taichung=park.id==='night',tianmuPark=park.id==='brick';
 const regionalModel=REGIONAL_MODELS[park.id];
 if(regionalModel){
  regionalModel(group,renderer,m,soft);
  arrangeLightTowers(renderer,park.id);
  return;
 }
 if(taichung)intercontinental(group,renderer,m,soft);
 else if(tianmuPark)tianmu(group,renderer,m,soft);
 else tainan(group,renderer,m,soft);

 renderer.lights.forEach((light,i)=>{
  light.visible=taichung?i!==0&&i!==5:tianmuPark||i===2||i===3;
  light.scale.set(.72,taichung?1.13:tianmuPark?.95:1.18,.72);
 });
}
