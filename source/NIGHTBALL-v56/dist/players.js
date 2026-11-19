/* 2026 CPBL identities and performance-derived abilities. See RATING_METHOD.md. */
(()=>{
'use strict';
const data=NightRatings,rosters={};
for(const [club,identity]of Object.entries(data.identities)){
 const prefix=club==='owls'?'o':club==='foxes'?'f':null;
 const batters=identity.batters.map(([name,no,pos,hand],i)=>({id:prefix?prefix+(i+1):club+'-b'+(i+1),name,no,pos,hand,season:2026,...data.players[club][name]}));
 const pitchers=identity.pitchers.map(([name,no,hand],i)=>({id:prefix?prefix+'p'+(i+1):club+'-p'+(i+1),name,no,hand,pos:'P',season:2026,...data.players[club][name]}));
 rosters[club]={batters,pitchers,startingOrder:batters.slice(0,9).map(p=>p.id),lineupDate:identity.date,rosterNote:identity.rosterNote};
}
window.NightPlayers={rosters,season:2026,ratingVersion:data.version,owls:rosters.owls.batters.slice(0,9),foxes:rosters.foxes.batters.slice(0,9),homePitchers:rosters.owls.pitchers,awayPitchers:rosters.foxes.pitchers,parks:[{"id":"night","name":"臺中洲際棒球場","center":121.92,"corner":99.06,"left":99.06,"right":99.06,"leftFeet":325,"centerFeet":400,"rightFeet":325,"wind":0,"theme":"night","turf":3636296,"source":"https://cpbl.com.tw/field/cont?SId=0M062368578901208901"},{"id":"brick","name":"天母棒球場","center":121.92,"corner":99.06,"left":99.06,"right":99.06,"leftFeet":325,"centerFeet":400,"rightFeet":325,"wind":0,"theme":"brick","turf":5275203,"source":"https://cpbl.com.tw/field/cont?sid=0M061623807974766861"},{"id":"sky","name":"臺南亞太成棒主球場","center":121.92,"corner":100.58,"left":100.58,"right":100.58,"leftFeet":330,"centerFeet":400,"rightFeet":330,"wind":0,"theme":"sky","turf":6265171,"source":"https://www.uni-lions.com.tw/about/field"},{"id":"harbor","name":"新莊棒球場","center":121.92,"corner":99.06,"left":99.06,"right":99.06,"leftFeet":325,"centerFeet":400,"rightFeet":325,"wind":0,"theme":"harbor","turf":3702114,"source":"https://www.sa.gov.tw/Resource/Other/f1389930582611.pdf"},{"id":"dome","name":"樂天桃園棒球場","center":121.92,"corner":100.58,"left":100.58,"right":100.58,"leftFeet":330,"centerFeet":400,"rightFeet":330,"wind":0,"theme":"night","turf":3770994,"source":"https://www.dst.tycg.gov.tw/cp.aspx?Create=1&n=11738"},{"id":"river","name":"澄清湖棒球場","center":121.92,"corner":99.97,"left":99.97,"right":99.97,"leftFeet":328,"centerFeet":400,"rightFeet":328,"wind":0,"theme":"river","turf":5150551,"source":"https://cpbl.com.tw/field/cont?sid=0M062392119063993008"},{"id":"taipei-dome","name":"臺北大巨蛋","center":121.92,"corner":102.11,"left":102.11,"right":102.11,"leftFeet":335,"centerFeet":400,"rightFeet":335,"wind":0,"theme":"dome","turf":3770994,"source":"https://zh.wikipedia.org/wiki/臺北大巨蛋"}],grade:n=>n>=90?'S':n>=80?'A':n>=70?'B':n>=60?'C':n>=50?'D':n>=40?'E':n>=30?'F':'G'};
// Five radial anchors, measured from home plate. Undocumented alleys are model estimates.
const parkDesigns={
 night:{leftCenter:112.7,rightCenter:112.7,turf:0x6e984d,clay:0xd18d6c,track:0x9e5d4a,foulTrack:0xb8775b,trackWidth:3.5,mowing:[.45,.75],wallHeight:2.5,board:[-10,16,143,33,12],stands:[[-1.12,-.21,.8],[.20,1.12,.8]],seats:0x325e71,wall:0x264f54,rail:0xe5c568},
 brick:{leftCenter:111.4,rightCenter:111.4,turf:0x548041,clay:0xaa544c,track:0x914e44,foulTrack:0x975347,trackWidth:3.4,mowing:[.82,1.2],board:[-20,9,134,23,8],stands:[[-1.16,-.55,.35],[.54,1.16,.35]],seats:0x3a6759,wall:0x214d49,rail:0xbebd6c},
 sky:{leftCenter:115,rightCenter:115,turf:0x67914e,clay:0xba805b,track:0xac7953,foulTrack:0xbd916b,trackWidth:3.2,mowing:[.02,1.06],board:[4,15,140,44,12],stands:[[-1.25,-.20,.88],[.20,1.25,.88]],seats:0x387962,wall:0x204c40,rail:0xbbba83},
 harbor:{leftCenter:113.8,rightCenter:113.8,turf:0x679447,clay:0xd09469,track:0x99554b,foulTrack:0x984c47,trackWidth:2.45,mowing:[.08,1.08],board:[-14,14,139,27,11],stands:[[-1.23,-.27,.65],[.25,1.23,.65]],seats:0x226778,wall:0x1f3e62,rail:0xb9a276},
 dome:{leftCenter:114.2,rightCenter:114.2,theme:'taoyuan',turf:0x829252,clay:0xca9b73,track:0x875048,foulTrack:0x7e483d,trackWidth:3.3,mowing:[.55,.46],board:[0,15,142,37,12],stands:[[-1.2,-.26,.72],[.26,1.2,.72]],seats:0x91384d,wall:0x234544,rail:0xb6af7f},
 river:{leftCenter:115.2,rightCenter:115.2,turf:0x78a253,clay:0xcd9d76,track:0xb37b58,foulTrack:0xb98b67,trackWidth:3.6,mowing:[1,1.04],board:[9,15,144,33,12],stands:[[-1.32,-.17,.95],[.17,1.32,.95]],seats:0x2b6a76,wall:0x294c40,rail:0xe5c35d},
 'taipei-dome':{leftCenter:108.5,rightCenter:108.5,turf:0x7f9b46,clay:0xc28770,track:0xcb7341,foulTrack:0xd47c42,trackWidth:4.8,mowing:[.8,.48],wallHeight:3.5,board:[0,22,150,43,14],stands:[[-1.42,1.42,1.18]],seats:0xa9afb4,wall:0x393b40,rail:0xc0b494,roofHeight:68},
 'tokyo-dome':{leftCenter:110,rightCenter:110,turf:0x4c9c70,clay:0xd08d5a,track:0x9f5b41,foulTrack:0x448361,trackWidth:1.15,mowing:[.88,.53],alleysVerified:true,wallHeight:4,board:[0,22,148,48,12],stands:[[-1.42,1.42,1.16]],seats:0x303d71,wall:0x184835,rail:0x49745e,roofHeight:61.69},
 toyama:{leftCenter:114,rightCenter:114,turf:0x637d51,clay:0xba7062,track:0x904c49,foulTrack:0x6b745f,trackWidth:2.6,mowing:[1,.3],board:[0,11,139,31,11],stands:[[-1.20,-.30,.52],[.30,1.20,.52]],seats:0x3d6289,wall:0x315a50,rail:0x5d786b}
};
NightPlayers.parks.push(
 {id:'tokyo-dome',name:'東京ドーム',left:100,right:100,corner:100,center:122,theme:'dome',source:'https://www.tokyo-dome.co.jp/dome/about/'},
 {id:'toyama',name:'富山市民球場（アルペンスタジアム）',left:99.1,right:99.1,corner:99.1,center:122,theme:'toyama',source:'https://www.city.toyama.lg.jp/bunka/sports/1010565/1010567/1011160.html'}
);
// Fictional school venues, with the same distance model used by the match and renderer.
const schoolParks=[
 ['school-yard-river','河川敷グラウンド',70,92,80,81,1.6,0x518e4b,0x285e53],
 ['school-yard-campus','学園グラウンド',70,96,83,82,2,0x67875b,0x345851],
 ['school-district-east','東地区市民球場',85,106,96,94,2.3,0x4a8c52,0x205971],
 ['school-district-west','西地区運動公園球場',85,110,97,99,2.5,0x4d8555,0x2b625e]
];
for(const [id,name,corner,center,leftCenter,rightCenter,wallHeight,turf,wall] of schoolParks){
 NightPlayers.parks.push({id,name,corner,left:corner,right:corner,center,leftCenter,rightCenter,wallHeight,turf,wall,
  school:true,theme:id.includes('-yard-')?'school-yard':'school-district',alleysVerified:true,
  seats:wall,rail:0xe9c777,board:[0,corner===70?5.5:8,center+5,corner===70?17:24,corner===70?6:8],
  stands:corner===70?[[-1.13,-.53,.18],[.53,1.13,.18]]:[[-1.23,-.27,.35],[.27,1.23,.35]]});
}
NightPlayers.schoolPark=(round,variant=0,tryout=false)=>tryout?schoolParks[variant%2][0]:
 round<2?schoolParks[2+(variant+round)%2][0]:'toyama';
NightPlayers.roofSurface=(park,x,z)=>{
 if(!park.roofHeight)return Infinity;
 const taipei=park.id==='taipei-dome',radius=taipei?128:116,edge=taipei?40:33;
 const radiusSquared=(x/radius)**2+((z-48)/radius)**2;
 return edge+(park.roofHeight-edge)*Math.pow(Math.max(0,1-radiusSquared),.65);
};
for(const park of NightPlayers.parks)Object.assign(park,parkDesigns[park.id]);
NightPlayers.fenceHeight=park=>park.wallHeight??2.8;
// Monotone cubic interpolation preserves the five surveyed or configured marks.
NightPlayers.wallDistance=(park,angle)=>{
 const quarter=Math.PI/8,position=Math.max(0,Math.min(4,angle/quarter+2));
 const index=Math.min(3,Math.floor(position)),u=position-index;
 const left=park.left??park.corner,right=park.right??park.corner;
 const anchors=[left,park.leftCenter??(left+park.center)/2,park.center,park.rightCenter??(right+park.center)/2,right];
 const tangent=i=>{
  if(i===2)return 0;
  if(i===0)return anchors[1]-anchors[0];
  if(i===4)return anchors[4]-anchors[3];
  const before=anchors[i]-anchors[i-1],after=anchors[i+1]-anchors[i];
  return before*after>0?2*before*after/(before+after):0;
 };
 const a=anchors[index],b=anchors[index+1],u2=u*u,u3=u2*u;
 return a+(b-a)*(3*u2-2*u3)+tangent(index)*(u3-2*u2+u)+tangent(index+1)*(u3-u2);
};
})();
