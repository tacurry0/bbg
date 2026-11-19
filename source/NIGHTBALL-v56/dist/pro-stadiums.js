import * as T from './vendor/three.module.min.js';
import {bowlPoint,boxBatch,dugouts,flatVision,mesh,parkSign,standsSection,strip,varying} from './broadcast-dome.js?v=74';
import {backstop,supportBeams,trees,mountain} from './open-air-parks.js?v=74';

const TAU=2*Math.PI;
const blue=[0x255ca0,0x3174b0,0x3a78b6],navy=[0x283e66,0x334970,0x405883];
const green=[0x3d6651,0x49755f,0x5a856d],teal=[0x208c97,0x2f9aa1,0x398090];
const red=[0xa52c36,0xbc3c44,0xc74e55],wine=[0x733041,0x883548,0x983b51];
const orange=[0xcf682f,0xe28748,0xbe653b],gray=[0x636f77,0x808c91,0x9ca5aa];

// Infield terraces: width, depth, front elevation, number of rows, riser height.
// Outfield/wing terraces also provide their individual angular coverage.
const layouts={
 yokohama:{seats:blue,tier:[[62,70,2,19,.51],[76,83,14.6,13,.72]],
  out:[[-1.37,-.14,84,77,5,12,.65],[.14,1.37,84,77,5,12,.65]],
  wings:[[-1.17,-.64,93,85,18,15,.89],[.64,1.17,93,85,18,15,.89]],
  board:[0,18,139,32,12],sides:[[-51,12,119,12,8],[51,12,119,12,8]],accent:0x2764a7,skyline:1},
 koshien:{seats:green,outSeats:[0xc0c3a3,0xbfb899,0xcad1b3],
  tier:[[65,71,1.7,21,.51],[82,86,14,12,.63]],out:[[-1.6,-.16,82,76,2.7,24,.55],[.16,1.6,82,76,2.7,24,.55]],
  canopy:['Koshien Gin-san silver canopy',1.84,4.44,101,104,26.8,26,0x9b9e8a],
  board:[0,16,134,31.6,13],clock:true,accent:0x284b3b,trees:true},
 mazda:{seats:red,tier:[[64,69,1.2,20,.51],[80,83,13,10,.69]],
  out:[[-1.38,-.39,83,81,1.9,10,.45],[.14,1.37,84,78,3.5,11,.57]],
  wings:[[.76,1.32,93,82,12.8,13,.82],[-1.31,-.95,91,84,11,8,.78]],
  canopy:['Mazda asymmetric rear canopy',1.58,3.75,100,104,25,12,0x747d80],
  board:[-21,16,136,35,12],accent:0x9f3330,skyline:2},
 'nagoya-dome':{seats:blue,outSeats:teal,tier:[[67,70,3.2,19,.54],[85,86,16,15,.67]],
  out:[[-1.58,-.13,85,78,4.4,15,.64],[.13,1.58,85,78,4.4,15,.64]],
  wings:[[-.67,-.19,85,76,4.0,4,.32],[.19,.67,85,76,4.0,4,.32]],wingName:'Home Run Wing lower terrace',
  board:[0,25,149,65,11],ribbon:0x438bbb,accent:0x2373bb,wide:true},
 jingu:{seats:blue,tier:[[61,69,1.45,25,.47],[78,86,13.7,8,.54]],
  out:[[-1.54,-.17,82,78,3.2,18,.48],[.17,1.54,82,78,3.2,18,.48]],
  canopy:['Jingu press box cover',2.45,3.83,84,91,20,9,0xa6abb4],
  board:[0,14,135,33,12],sides:[[-35,13,130,15,7],[34,13,130,18,7]],accent:0x24567e,skyline:2},
 'paypay-dome':{seats:gray,outSeats:navy,tier:[[68,73,2.7,24,.55],[88,93,18,14,.68]],
  out:[[-1.55,-.14,85,79,4.7,17,.63],[.14,1.55,85,79,4.7,17,.63]],
  wings:[[-.67,-.21,83,76,4.4,5,.34],[.21,.67,83,76,4.4,5,.34]],wingName:'Home Run Terrace',
  board:[0,24,149,56,12],sides:[[-57,22,131,21,10],[-34,24,144,11,9],[34,24,144,11,9],[57,22,131,21,10]],
  ribbon:0xc9a834,accent:0xa48528,wide:true},
 'es-con':{seats:green,tier:[[67,72,2.3,17,.52],[83,86,13.9,12,.67],[94,97,25,8,.76]],
  out:[[-1.48,-.35,85,78,2.2,12,.47],[.26,1.48,87,81,2.2,8,.50]],
  board:[-56,21.5,129,36,17],sides:[[52,21.5,131,34,16]],ribbon:0x647b62,accent:0x307462},
 miyagi:{seats:wine,tier:[[63,72,2,19,.50],[81,87,13.8,11,.65]],
  out:[[-1.39,-.36,83,78,2.65,11,.56],[.16,1.47,85,79,2.55,14,.61]],
  wings:[[-.70,-.27,83,75,2.5,4,.37],[.22,.63,83,77,2.5,5,.33]],wingName:'Miyagi home run zone',
  canopy:['Sendai grandstand canopy',2.36,3.92,94,96,24,14,0x7b867d],
  board:[38,17,138,36,13],sides:[[67,15,122,18,10]],accent:0x842e46,trees:true,feature:'wheel'},
 'zozo-marine':{seats:navy,outSeats:teal,tier:[[65,72,2,20,.51],[83,88,14.6,13,.64]],
  out:[[-1.56,-.13,86,81,3.75,16,.55],[.13,1.56,86,81,3.75,16,.55]],
  wings:[[-.65,-.16,82,76,3,4,.32],[.16,.65,82,76,3,4,.32]],wingName:'Home Run Lagoon',
  canopy:['ZOZO cantilevered silver rim',1.35,4.93,104,108,28,16,0xa8b2b7],
  board:[0,20,146,37,13],ribbon:0x5595b8,accent:0x275668,feature:'marine'},
 'kyocera-dome':{seats:navy,outSeats:blue,tier:[[68,72,3,22,.54],[86,88,17,15,.65]],
  out:[[-1.52,-.15,87,80,4.6,20,.53],[.15,1.52,87,80,4.6,20,.53]],board:[0,24,143,34,12],ribbon:0x426090,accent:0x305777},
 'belluna-dome':{seats:navy,outSeats:green,tier:[[65,71,1.7,22,.56],[82,87,14.6,16,.66]],
  out:[[-1.52,-.16,82,78,3.7,17,.52],[.16,1.52,82,78,3.7,17,.52]],board:[0,19,142,36,13],
  accent:0x335477,trees:true,feature:'hills'},
 'niigata-eco':{seats:blue,outSeats:teal,tier:[[63,70,1.75,21,.52],[81,85,14,11,.66]],
  out:[[-1.5,-.17,83,80,2.8,12,.47],[.17,1.5,83,80,2.8,12,.47]],
  canopy:['Niigata broad silver canopy',1.62,4.66,102,103,27,20,0xa7b4b9,32,2],
  board:[0,15,135,32,12],accent:0x235a68,trees:true},
 'shimizu-ihara':{seats:orange,tier:[[57,66,1.45,11,.44],[68,77,7.1,7,.42]],upper:blue,
  berms:[[-1.42,-.17],[.17,1.42]],board:[0,9,132,19,7],accent:0x405951,trees:true,feature:'hills',small:true},
 'gwangju-kia':{seats:red,upper:navy,tier:[[65,71,2,20,.51],[81,85,13.8,12,.68]],
  out:[[-1.43,-.37,83,80,2.9,8,.47],[.18,1.43,84,81,2.9,12,.48]],
  canopy:['Gwangju segmented canopy',1.50,4.63,100,103,27,17,0xa4a5a0,12],
  board:[-24,17,137,34,13],accent:0xa33038,skyline:1},
 'daegu-lions':{seats:blue,upper:navy,tier:[[66,72,2.2,20,.52],[82,86,14.2,12,.63]],
  out:[[-1.38,-.76,83,76,2.9,8,.55],[-.72,-.15,86,78,3.2,7,.52],[.15,.73,86,78,3.2,8,.54],[.77,1.39,83,76,2.9,10,.57]],
  canopy:['Daegu polygonal white canopy',1.61,4.67,100,105,27.5,19,0xabb4b8,8],
  board:[41,18,126,32,13],accent:0x2867aa,trees:true,feature:'hills'},
 jamsil:{seats:blue,upper:navy,outSeats:[0x91854e,0xa69a62,0x759371],tier:[[67,74,1.7,23,.49],[86,91,14.4,10,.65]],
  out:[[-1.61,-.14,89,81,2.9,18,.48],[.14,1.61,89,81,2.9,18,.48]],
  canopy:['Jamsil central broadcast roof',2.29,3.99,103,107,24,10,0x8f968b],
  board:[0,15.8,145,36,10],accent:0x3b5973,skyline:1},
 'suwon-kt':{seats:red,upper:wine,tier:[[63,69,1.8,19,.52],[78,83,13,12,.66],[90,93,23,8,.7]],
  out:[[-1.4,-.17,84,78,3,9,.60],[.16,1.39,84,78,3,13,.51]],
  canopy:['Suwon high infield canopy',1.58,4.61,105,105,34,16,0x5f6970],
  board:[25,17,137,35,13],accent:0x9c303c,skyline:2},
 'incheon-landers':{seats:red,upper:navy,tier:[[64,71,1.8,21,.52],[82,88,14.9,12,.64]],
  out:[[-1.49,-.15,83,78,3.2,16,.54],[.15,1.49,83,78,3.2,13,.52]],
  canopy:['Incheon red-edged canopy',1.74,4.63,102,104,28,16,0x9e9b91],
  board:[19,22,142,63.398,17.962],accent:0xa03240,trees:true,wide:true},
 sajik:{seats:orange,upper:blue,tier:[[65,72,2,20,.51],[82,89,14.3,12,.63]],
  out:[[-1.55,-.12,85,77,5.1,18,.55],[.12,1.55,85,77,5.1,18,.55]],
  canopy:['Sajik concrete cornice',1.76,4.52,100,105,27,12,0xa5aba4],
  board:[0,19,140,35,13],accent:0x36537c,skyline:3},
 'daejeon-hanwha':{seats:navy,upper:orange,tier:[[65,71,1.9,20,.54],[82,87,14.3,12,.68]],
  out:[[-1.4,-.17,85,79,2.8,13,.54],[.17,.56,84,81,3,6,.49]],
  canopy:['Hanwha staggered canopy',1.60,4.77,102,106,28,18,0x747d7e],
  board:[-23,18,142,33,18],accent:0xbb4f24,skyline:1,feature:'monster'},
 'changwon-nc':{seats:navy,upper:blue,tier:[[65,72,1.9,20,.51],[82,86,14.3,12,.68]],
  out:[[-1.52,-.79,86,80,3,6,.52],[.15,1.46,88,82,3.1,12,.57]],berms:[[-.78,-.24]],
  canopy:['Changwon cantilevered grandstand',1.35,4.51,101,104,28,19,0x9caaa9],
  board:[-9,16,144,33,13],ribbon:0x5087ab,accent:0x2a608c,skyline:3},
 gocheok:{seats:navy,outSeats:teal,tier:[[66,71,2.1,17,.54],[83,86,14,15,.64]],
  out:[[-1.45,-.18,84,79,3.2,12,.57],[.18,1.45,84,79,3.2,12,.57]],
  board:[-34,20,135,24,12],sides:[[37,18.5,132,23,12],[0,27,147,25,8]],ribbon:0x516f9c,accent:0x40588a}
};

export function proOverview(park){
 const small=layouts[park.id].small;
 return {height:small?15.8:park.roofProfile?23.2:22,behind:small?29:42,
  target:small?54:56,portrait:77,landscape:63,minHorizontal:67};
}

function materials(r,park,l){
 const surface=(name,color)=>{
  const m=r.mat('pro:'+park.id+':'+name,color,.80);
  m.side=T.DoubleSide;
  return m;
 };
 return {concrete:surface('concrete',0xa5aca8),steps:surface('steps',0xc6c6b8),instance:surface('structure',0xffffff),
  seats:surface('infield seats',l.seats[0]),outSeats:surface('outfield seats',(l.outSeats||l.seats)[0]),
  upper:surface('upper seats',(l.upper||l.seats)[0]),steel:surface('steel',0x495861),canvas:surface('inactive LED',0x142025),
  shadow:surface('cabinet',0x233032),eye:surface('eye',park.wall),roof:surface('canopy',l.canopy?.[7]??0x939ea2),
  earth:surface('berm',0x698747),foulTrack:surface('foul track',park.foulTrack),accent:surface('trim',l.accent)};
}

function terraces(group,m,soft,items,palette,range,label,attendance){
 for(const [i,item] of items.entries()){
  const [start,end,width,depth,floor,rows,rise]=range?[...range,...item]:item;
  const colors=i===1&&palette.upper?palette.upper:palette.base;
  standsSection(group,label+' '+(i+1),m,{start,end,width,depth,floor,rows,run:.88,rise,palette:colors,
   base:i===1&&palette.upper?m.upper:palette.material,concourse:true,attendance,
   shirts:[0xe1ddd4,colors[1],colors[2],0x353841,0xdbb99e]},soft);
 }
}

function canopy(group,m,config,soft){
 const [name,start,end,width,depth,y,span,,segments=soft?17:44,wave=0]=config;
 const positions=[],indices=[],supports=[];
 for(let i=0;i<=segments;i++){
  const a=start+(end-start)*i/segments,roofY=y+wave*Math.cos(a*3);
  const front=bowlPoint(a,width-span,depth-span,roofY-.9),back=bowlPoint(a,width,depth,roofY+1.35);
  positions.push(...front,...back);
  if(i<segments){const x=i*2;indices.push(x,x+1,x+2,x+2,x+1,x+3);}
  if(i%Math.max(1,Math.floor(segments/13))===0)supports.push([front,back,.31],[back,[back[0],roofY-8,back[2]],.34]);
 }
 const g=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(positions,3));
 g.setIndex(indices);g.computeVertexNormals();mesh(group,name,g,m.roof);
 supportBeams(group,name+' supports',supports,m.steel);
 strip(group,name+' front edge',m.accent,[[width-span,depth-span,y-1.15],[width-span,depth-span,y-.72]],start,end,segments);
}

function dome(group,r,park,m,soft){
 const {style,radiusX:rx,radiusZ:rz,edge,color}=park.roofProfile;
 const seg=soft?46:92,rows=soft?10:24,rectangular=style==='gable'||style==='barrel';
 const point=(x,z,offset=0)=>[x,NightPlayers.roofSurface(park,x,z)+offset,z];
 const ring=(a,t,dy=0)=>point(Math.sin(a)*rx*t,48+Math.cos(a)*rz*t,dy);
 const vertices=[],indices=[],colors=[],tint=new T.Color(color);
 const columns=rectangular?rows:seg;
 for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
  const a=TAU*i/columns,t=j/rows;
  vertices.push(...(rectangular?point(rx*(i/columns*2-1),48+rz*(t*2-1)):ring(a,t)));
  const shade=rectangular?(i%4?.93:.79):style==='retractable'?.82+.12*Math.cos(3*a):.88;
  colors.push(tint.r*shade,tint.g*shade,tint.b*shade);
  if(j<rows&&i<columns){
   const k=j*(columns+1)+i,b=k+columns+1;
   if(rectangular||j>0)indices.push(k,b,k+1);
   indices.push(k+1,b,b+1);
  }
 }
 const roof=new T.BufferGeometry();
 roof.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
 roof.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 roof.setIndex(indices);roof.computeVertexNormals();
 const panels=r.mat(park.id+' roof shell',soft?color:0xffffff,.87);
 panels.side=T.DoubleSide;panels.vertexColors=!soft;
 mesh(group,park.name+' roof shell',roof,panels).renderOrder=-3;

 const wires=[],bands=[];
 const line=(a,b)=>wires.push(...a,...b);
 if(rectangular){
  const n=soft?9:16;
  for(let j=0;j<=n;j++)for(let i=0;i<n;i++){
   const z=48+rz*(j/n*2-1),end=z+2*rz/n,x=rx*(i/n*2-1),next=x+2*rx/n;
   line(point(x,z,-.55),point(next,z,-.55));
   if(j<n){
    line(point(x,z,-.55),point(x,end,-.55));
    line(point(x,z,-.65),point(next,end,-.65));
   }
  }
 }else{
  const spokes=style==='retractable'?3:soft?22:40,ringCount=style==='rings'?7:style==='lattice'?11:8;
  for(let j=1;j<=ringCount;j++)for(let i=0;i<seg;i++){
   const t=j/(ringCount+1),a=i/seg*TAU,b=(i+1)/seg*TAU;
   line(ring(a,t,-.7),ring(b,t,-.7));
   if(style==='rings')bands.push([ring(a,t,-2),ring(b,t,-2),.75,1.5]);
  }
  if(style!=='rings')for(let i=0;i<spokes;i++)for(let j=0;j<rows;j++){
   const a=i/spokes*TAU,t=j/rows,next=(j+1)/rows;
   line(ring(a,t,-.71),ring(a,next,-.71));
   if(style==='lattice'&&j%2)line(ring(a,t,-.71),ring(a+TAU/spokes,next,-.71));
  }
  const open=style==='open-canopy';
  strip(group,open?'Belluna roof edge and open-air gap':'Dome upper perimeter',m.steel,
   [[rx,rz,open?edge-.8:20],[rx,rz,edge]],0,TAU,seg);
 }
 const trusses=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(wires,3)),
  new T.LineBasicMaterial({color:style==='lattice'?0x565f60:0xb4c0c5,transparent:true,opacity:.75}));
 trusses.name=park.name+' steel truss grid';trusses.userData.disposeMaterial=true;group.add(trusses);
 if(bands.length)supportBeams(group,'Kyocera seven suspended Super Rings',bands,m.steel);

 const lighting=r.mat(park.id+' roof LED arrays',0xe9f1ee,.45);
 lighting.emissive.setHex(0xf2eee0);lighting.emissiveIntensity=1.6;
 const n=soft?30:62;
 boxBatch(group,'Roof-edge LED lamps',Array.from({length:n},(_,i)=>{
  const a=i*TAU/n;
  return {point:ring(a,rectangular?.90:.973,-2.0),size:[2.8,.55,.66],angle:a};
 }),lighting);
}

function esConGlass(group,r,m,park,soft){
 const glass=r.mat('es-con outfield glazing',0x779dac,.39,.16);
 glass.side=T.DoubleSide;glass.transparent=true;glass.opacity=.47;glass.depthWrite=false;
 const vertices=[],indices=[],frames=[],columns=18,width=210,z=156,bottom=12;
 const top=x=>NightPlayers.roofSurface(park,x,z)-.4;
 for(let i=0;i<=columns;i++){
  const x=(i/columns-.5)*width,y=top(x);
  vertices.push(x,bottom,z,x,y,z);
  frames.push([[x,bottom,z-.15],[x,y,z-.15],.43]);
  if(i===columns)continue;
  const next=x+width/columns,k=i*2;
  indices.push(k,k+1,k+2,k+2,k+1,k+3);
  for(let row=18;row<=Math.min(y,top(next));row+=6)frames.push([[x,row,z-.15],[next,row,z-.15],.27]);
 }
 const geometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(vertices,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 mesh(group,'ES CON glass outfield facade',geometry,glass);
 supportBeams(group,'ES CON black window mullions',frames,m.steel);
 trees(r,group,'Trees beyond the glass',{z:185,spread:208,count:soft?16:26,colors:[0x536f59,0x627d5f,0x789076]});
}

function ferrisWheel(group,m){
 const x=-54,y=24,z=153,r=17,ring=[],supports=[[[x-10,0,z+3],[x,y,z],1.2],[[x+10,0,z-3],[x,y,z],1.2]],cabins=[];
 for(let i=0;i<48;i++){
  const a=i*TAU/48,b=(i+1)*TAU/48,p=[x+Math.cos(a)*r,y+Math.sin(a)*r,z];
  ring.push([p,[x+Math.cos(b)*r,y+Math.sin(b)*r,z],.48]);
  if(i%3===0){
   supports.push([[x,y,z],p,.15]);
   cabins.push({point:[p[0],p[1]-1.6,p[2]-.45],size:[2.1,2.35,1.65],color:i%2?0xd8c97b:0xd46069});
  }
 }
 supportBeams(group,'Miyagi Smile Glico Park Ferris wheel',ring,m.accent);
 supportBeams(group,'Wheel spokes and A-frame',supports,m.steps);
 boxBatch(group,'Wheel gondolas',cabins,m.instance);
}

function clock(group,m,x,y,z){
 const dial=mesh(group,'Koshien analog clock',new T.CircleGeometry(2,30),m.steps);
 dial.position.set(x,y,z);
 const hands=[[[x,y,z-.06],[x-.77,y+.28,z-.06],.16],[[x,y,z-.06],[x+.64,y+1.10,z-.06],.11]];
 for(let i=0;i<12;i++){
  const a=i*TAU/12,dx=Math.sin(a),dy=Math.cos(a);
  hands.push([[x+dx*1.48,y+dy*1.48,z-.03],[x+dx*1.77,y+dy*1.77,z-.03],.12]);
 }
 supportBeams(group,'Clock hands and hour marks',hands,m.steel);
}

function skyline(group,m,layers){
 const buildings=[],windows=[];
 for(let i=0;i<16;i++){
  const x=-135+i*18,z=174+24*varying(i*87+8),height=8+layers*3+varying(i*101+39)*layers*11,width=9+varying(i*77+14)*7;
  buildings.push({point:[x,height/2,z],size:[width,height,10],color:[0x808991,0x95938b,0x8f9da1,0x9e9a8c][i%4]});
  for(let y=3.4;y<height;y+=3.3)windows.push({point:[x,y,z-5.06],size:[width*.76,.62,.12],color:0x4f6369});
 }
 boxBatch(group,'Surrounding city buildings',buildings,m.instance);
 boxBatch(group,'Window and balcony bands',windows,m.instance);
}

function monsterWall(group,m,park){
 const pens=[],glass=[];
 for(let i=0;i<10;i++){
  const a=.46+i*.033,d=NightPlayers.wallDistance(park,a),sin=Math.sin(a),cos=Math.cos(a);
  const x=sin*d,z=cos*d;
  pens.push({point:[x+sin*5,6.2,z+cos*5],size:[3.3,12.4,8],angle:a,color:0x465453});
  glass.push({point:[x-sin*.16,5.75,z-cos*.16],size:[d*.030,3.1,.10],angle:a,color:0x415b5e});
 }
 boxBatch(group,'Hanwha two-storey right-field bullpens',pens,m.instance);
 boxBatch(group,'Hanwha high right-field Monster Wall media glass',glass,m.instance);
 boxBatch(group,'Hanwha third-base infinity pool',[
  {point:[-48,21,2],size:[15.8,1.5,5.8],angle:.55,color:0xc3cdd1},
  {point:[-48,21.81,2],size:[14.8,.16,5],angle:.55,color:0x44a6b2}
 ],m.instance);
}

export function decorateProStadium(r,park){
 const l=layouts[park.id],group=r.parkDecor,soft=r.gl.isSoftwareRenderer,m=materials(r,park,l);
 const seats={base:l.seats,upper:l.upper,material:m.seats};
 terraces(group,m,soft,l.tier,seats,[1.41,TAU-1.41],park.name+' infield deck',.53);
 terraces(group,m,soft,l.out||[],{base:l.outSeats||l.seats,material:m.outSeats},null,park.name+' outfield bleachers',.40);
 terraces(group,m,soft,l.wings||[],{base:l.seats,material:m.seats},null,l.wingName||park.name+' raised wings',.57);
 for(const [a,b] of l.berms||[])strip(group,'Outfield picnic lawn',m.earth,
  [[84,78,1.9],[99,91,6.1],[107,99,5.8],[116,104,.12]],a,b,soft?16:32);
 if(l.canopy)canopy(group,m,l.canopy,soft);
 if(park.roofProfile)dome(group,r,park,m,soft);
 if(park.id==='es-con')esConGlass(group,r,m,park,soft);
 if(l.skyline)skyline(group,m,l.skyline);
 if(l.trees)trees(r,group,'Outfield treeline',{z:158,spread:245,count:25,colors:[0x526844,0x647e4c,0x48654a]});
 if(l.feature==='hills'){
  mountain(group,'Distant hills',0x627d6b,248,28,25,1.16);
  mountain(group,'Near wooded hillside',0x506f55,201,10,16,.65);
 }
 if(l.feature==='wheel')ferrisWheel(group,m);
 if(l.feature==='marine')strip(group,'Marine high concrete wind screen',m.concrete,[[103,99,4],[103,99,21]],-1.48,1.48,48);
 if(l.feature==='monster')monsterWall(group,m,park);

 const eye=mesh(group,'Center-field batter’s eye',new T.BoxGeometry(25,4.1,1.5),m.eye);
 eye.position.set(0,NightPlayers.fenceHeight(park)+1.9,park.center+1.4);
 r.proVision={id:park.id,name:park.name,accent:'#'+l.accent.toString(16).padStart(6,'0'),wide:!!l.wide,classic:!!l.clock};
 for(const [i,[bx,by,bz,w,h]] of [l.board,...(l.sides||[])].entries()){
  const bottom=by-h/2,posts=[-1,1].map(side=>({point:[bx+side*w*.30,bottom/2,bz+.4],size:[.76,bottom,1.45]}));
  boxBatch(group,'Vision support columns '+(i+1),posts,m.steel);
  flatVision(group,r,m,{name:park.name+(i?' auxiliary vision '+i:' main vision'),
   x:bx,y:by,z:bz,width:w,height:h,angle:Math.atan2(bx,bz-25)*.38});
 }
 const [x,y,z,width,height]=l.board;
 if(l.clock)clock(group,m,x,y+height/2+2.6,z-.7);
 parkSign(group,park.name,[x,y+height/2+(l.clock?5.6:1.4),z-.68],Math.min(52,width+2),2.35,'#f3e8d5',r.proVision.accent);
 if(l.ribbon){
  const ribbon=r.mat(park.id+' balcony ribbon',l.ribbon,.55);
  ribbon.side=T.DoubleSide;ribbon.emissive.setHex(l.ribbon);ribbon.emissiveIntensity=.5;
  strip(group,'Concourse LED ribbon',ribbon,[[84,84,12.2],[84,84,13.1]],1.25,TAU-1.25,soft?36:72);
 }
 backstop(r,group,m,l.tier[0][0]-5,l.tier[0][1]-5,2.7);
 dugouts(group,m,{lateral:44,depth:15});
 const towers=[[-93,50,36],[-74,112,37],[-34,141,41],[35,142,41],[76,111,37],[94,51,36]];
 for(const [i,light] of r.lights.entries()){
  const [lx,lz,ly]=towers[i];
  light.visible=!park.roofProfile;
  light.position.set(lx,0,lz);light.rotation.y=Math.atan2(lx,lz-25);
  light.scale.set(.83,ly/31,.87);
 }
}
