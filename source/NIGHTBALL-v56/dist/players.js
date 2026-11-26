/* 2026 CPBL identities and performance-derived abilities. See RATING_METHOD.md. */
(()=>{
'use strict';
const data=NightRatings,rosters={};
// 2026-11-26 sourced pitch supplement. Generated roster files remain the original
// season-stat inputs; the supplement survives rebuilding them. IDs never change.
const pitching2026={"season":2026,"checked":"2026-11-26","coverage":"Partial reconstruction from report and public pages; unknown values are omitted. CPBL aggregate breaking-ball data is not per-pitch data. Historical repertoire for Pena is explicitly not 2026 measured.","pitchers":{"npb-l-p2":{"name":"平良 海馬","source":"https://baseball-data-store.com/player/%E5%B9%B3%E8%89%AF%20%E6%B5%B7%E9%A6%AC/pitch_by_pitch","avg":{"fast":153.9,"slider":132.7,"cutter":146.5,"sinker":150.8,"fork":136.34},"max":{"fast":160,"sinker":155,"fork":146},"labels":{"sinker":"ツーシーム"}},"npb-b-p2":{"name":"エスピノーザ","source":"https://baseball-data-store.com/player/%E3%82%A8%E3%82%B9%E3%83%94%E3%83%8E%E3%83%BC%E3%82%B6/pitch_by_pitch","avg":{"fast":149.18,"sinker":149.9,"curve":130.6,"slider":133.6,"change":139.6},"max":{"fast":153,"sinker":157,"curve":137,"change":144},"labels":{"sinker":"ツーシーム"}},"npb-f-p5":{"name":"有原 航平","source":"https://baseball-data-store.com/player/%E6%9C%89%E5%8E%9F%20%E8%88%AA%E5%B9%B3/pitch_by_pitch","avg":{"fast":146.1,"change":132.1,"cutter":142.2,"sinker":145.1},"max":{"fast":151},"observed":["fork"],"labels":{"sinker":"ツーシーム"}},"npb-e-p6":{"name":"藤平 尚真","source":"https://baseball-data-store.com/player/%E8%97%A4%E5%B9%B3%20%E5%B0%9A%E7%9C%9F/pitch_by_pitch","avg":{"fast":152,"slider":141,"fork":141.4},"max":{"fast":157}},"npb-h-p-moinelo-2026":{"name":"モイネロ","source":"https://baseball-data-store.com/player/%E3%83%A2%E3%82%A4%E3%83%8D%E3%83%AD/pitch_by_pitch","avg":{"fast":148.2,"cutter":142.3,"slider":131,"curve":121.6},"max":{"fast":153,"curve":130}},"npb-m-p-taneichi-2026":{"name":"種市 篤暉","source":"https://baseball-data-store.com/player/%E7%A8%AE%E5%B8%82%20%E7%AF%A4%E6%9A%89/pitch_by_pitch","avg":{"fast":149.9,"fork":141.6,"slider":136.1,"curve":122.5},"max":{"fast":154,"curve":123}},"kbo-ob-p-68220":{"name":"GWAK Been","source":"https://www.yagoonara.com/players/1292","avg":{"fast":151.4,"cutter":146.1,"slider":136.3,"change":133.6}},"kbo-wo-p-68341":{"name":"AN Woo Jin","source":"https://www.yagoonara.com/players/1302/season","avg":{"fast":151.2,"slider":140.6,"curve":126.5,"change":134.3}},"kbo-lg-p-56146":{"name":"RIOS Yacksel","source":"https://www.koreabaseball.com/MediaNews/News/KboPhoto/View.aspx?bdSe=538341","max":{"fast":161.7}},"cpbl:羅戈":{"name":"羅戈","source":"https://stats.cpbl.com.tw/players/0000005151","avg":{"fast":147.9},"max":{"fast":154.1},"aggregate":{"breakingAvg":133.3,"breakingMax":144.8},"scope":"CPBL公式計測サンプル"},"cpbl:鄭浩均":{"name":"鄭浩均","source":"https://stats.cpbl.com.tw/players/0000002345","avg":{"fast":146},"max":{"fast":154.3},"aggregate":{"breakingAvg":128.9},"scope":"既存のCPBL公式2026年計測記録"},"cpbl:張奕":{"name":"張奕","source":"https://stats.cpbl.com.tw/players/0000005790","avg":{"fast":149.7},"max":{"fast":155.3},"aggregate":{"breakingAvg":137.5,"breakingMax":149.5,"fastSamples":203},"scope":"CPBL公式一軍計測サンプル（8月10日時点）"},"cpbl:菲力士":{"name":"菲力士","source":"https://stats.cpbl.com.tw/players/0000007560","avg":{"fast":144.5},"max":{"fast":148.5},"aggregate":{"breakingAvg":132.5,"breakingMax":140.2,"fastSamples":155},"scope":"CPBL公式二軍計測サンプル（8月10日時点）","historical":["sinker","slider","change"],"historicalSource":"https://baseballsavant.mlb.com/savant-player/felix-pena-570240?playerType=pitcher"}},"additions":{"npb-h":[{"id":"npb-h-p-moinelo-2026","name":"モイネロ","no":"35","hand":"L","throwHand":"L","pos":"P","season":2026,"stats":{"games":7,"gs":7,"era":0.76,"h":22,"hr":3,"bb":11,"ibb":0,"hbp":2,"k":34,"er":4,"bf":175,"saves":0,"holds":0,"ipText":"47.1","ip":47.333333333333336,"k9":6.464788732394366,"bb9":2.091549295774648,"hr9":0.5704225352112676},"control":76,"movement":65,"stamina":89,"velocity":148,"role":"SP","roleEstimated":false,"pitchingEstimated":true,"speedEstimated":true,"pitches":["fast"],"pitchDetails":{"fast":{"speed":148.2,"breakScale":1}},"velocityEvidence":{"fastAvg":148.2,"fastAvgEstimated":true},"trait":"先発型","statsLevel":"NPB一軍","sourceUrl":"https://npb.jp/bis/2026/stats/idp1_h.html","identityUrl":"https://npb.jp/bis/players/63965134.html","statsPeriod":["2026-03","2026-10"],"ratingsBasedOnStats":true,"ratingsProvisional":false,"confidence":0.612,"estimates":["pitchMovement","pitchRepertoire","velocity","ratingsFromSelectedRosterReference"],"roleSource":"2026年先発登板","ratingNote":"既存一軍選出投手の成績分布を参照したゲーム能力推定"}],"npb-m":[{"id":"npb-m-p-taneichi-2026","name":"種市 篤暉","no":"16","hand":"R","throwHand":"R","pos":"P","season":2026,"stats":{"games":2,"gs":2,"era":0,"h":6,"hr":0,"bb":0,"ibb":0,"hbp":0,"k":7,"er":0,"bf":28,"saves":0,"holds":0,"ipText":"7.2","ip":7.666666666666667,"k9":8.217391304347826,"bb9":0,"hr9":0},"control":83,"movement":70,"stamina":61,"velocity":150,"role":"SP","roleEstimated":false,"pitchingEstimated":true,"speedEstimated":true,"pitches":["fast"],"pitchDetails":{"fast":{"speed":149.9,"breakScale":1}},"velocityEvidence":{"fastAvg":149.9,"fastAvgEstimated":true},"trait":"先発型","statsLevel":"NPB一軍","sourceUrl":"https://npb.jp/bis/2026/stats/idp1_m.html","identityUrl":"https://npb.jp/bis/players/71275134.html","statsPeriod":["2026-03","2026-10"],"ratingsBasedOnStats":true,"ratingsProvisional":false,"confidence":0.204,"estimates":["pitchMovement","pitchRepertoire","velocity","ratingsFromSelectedRosterReference"],"roleSource":"2026年先発登板","ratingNote":"既存一軍選出投手の成績分布を参照したゲーム能力推定"}],"owls":[{"id":"owls-p-pena-2026","name":"菲力士","no":34,"hand":"R","throwHand":"R","pos":"P","season":2026,"stats":{"games":12,"gs":12,"era":3.56,"whip":1.45,"h":67,"hr":3,"bb":32,"ibb":0,"hbp":0,"k":56,"er":27,"totalPitches":1158,"bf":299,"saves":0,"holds":0,"ip":68.33333333333333,"ipText":"68 1/3","k9":7.375609756097561,"bb9":4.214634146341464,"hr9":0.3951219512195122},"control":43,"movement":78,"stamina":81,"velocity":145,"role":"SP","roleEstimated":true,"roleSource":"2026年の先発数から分類","trait":"先発型","pitches":["fast","sinker","slider","change"],"pitchDetails":{"fast":{"speed":144.5,"breakScale":1},"sinker":{"speed":138.7,"breakScale":1,"speedBasis":"ゲーム用推定"},"slider":{"speed":130.1,"breakScale":1,"speedBasis":"ゲーム用推定"},"change":{"speed":130.1,"breakScale":1,"speedBasis":"ゲーム用推定"}},"velocityEvidence":{"fastAvg":144.5,"fastAvgEstimated":true,"repertoireEstimated":true},"sourceUrl":"https://bbm3.joybomb.tw/LiveTrend/trends?t=b","ratingsBasedOnStats":true,"ratingsProvisional":false,"confidence":0.695,"estimates":["pitchMovement","individualPitchSpeed","pitchRepertoire","velocity"],"identityEvidence":{"source":"https://stats.cpbl.com.tw/players/0000007560","primaryPosition":"投手"}}]}};
const ratios2026={fast:1,sinker:.96,cutter:.95,slider:.90,curve:.82,change:.90,fork:.90,split:.92};
function applyPitching2026(player,league){
 const key=league==='cpbl'?'cpbl:'+player.name:player.id;
 const e=pitching2026.pitchers[key];
 if(!e||e.name!==player.name)return player;
 const p={...player,pitches:[...player.pitches],pitchDetails:{...player.pitchDetails},velocityEvidence:{...player.velocityEvidence},estimates:[...(player.estimates||[])]};
 const avg=e.avg||{},max=e.max||{},previous=p.pitchDetails;
 const observed=[...new Set([...Object.keys(avg),...(e.observed||[])])];
 // Keep unverified existing choices unless we have a fully identified 2026
 // repertoire; a partial source must not erase other potentially valid pitches.
 const exact=league!=='cpbl'&&['npb-e-p6','npb-m-p-taneichi-2026','npb-b-p2'].includes(key);
 if(exact)p.pitches=observed;
 else for(const id of [...observed,...(e.historical||[])])if(!p.pitches.includes(id))p.pitches.push(id);
 if(!p.pitches.includes('fast'))p.pitches.unshift('fast');
 const fast=avg.fast??p.velocityEvidence.fastAvg??p.velocity;
 if(Number.isFinite(avg.fast)){
  p.velocity=Math.round(avg.fast);p.speedEstimated=false;
  p.estimates=p.estimates.filter(x=>x!=='velocity');
  p.velocityEvidence.fastAvg=avg.fast;p.velocityEvidence.fastAvgEstimated=false;
 }
 if(Number.isFinite(max.fast))p.velocityEvidence.fastMax=max.fast;
 for(const id of p.pitches){
  const old=previous[id]||{};
  const d={...old,breakScale:old.breakScale||1};
  if(Number.isFinite(avg[id])){
   d.speed=avg[id];d.measuredAverage=avg[id];d.speedBasis='2026年実測平均';d.sourceUrl=e.source;
  }else if(!Number.isFinite(d.speed)|| (Number.isFinite(avg.fast)&&/推定/.test(d.speedBasis||'')&&ratios2026[id])){
   d.speed=Math.round(fast*(ratios2026[id]||.9)*10)/10;d.speedBasis='ゲーム用推定';
  }
  if(Number.isFinite(max[id])){d.measuredMax=max[id];d.sourceUrl=e.source;}
  if(e.labels?.[id])d.label=e.labels[id];
  p.pitchDetails[id]=d;
 }
 if(exact){p.estimates=p.estimates.filter(x=>x!=='pitchRepertoire');p.velocityEvidence.repertoireEstimated=false;}
 else if(league!=='cpbl'&&!p.estimates.includes('pitchRepertoire'))p.estimates.push('pitchRepertoire');
 if(p.pitches.some(id=>!Number.isFinite(p.pitchDetails[id]?.measuredAverage))&&!p.estimates.includes('individualPitchSpeed'))p.estimates.push('individualPitchSpeed');
 if(e.aggregate)Object.assign(p.velocityEvidence,e.aggregate);
 p.velocityEvidence.sourceUrl=e.source;p.velocityEvidence.speedBasis=Number.isFinite(avg.fast)?'2026年実測平均（'+(e.scope||league.toUpperCase())+'）':p.velocityEvidence.speedBasis;
 p.pitchingEvidence2026={...e,season:2026,checked:pitching2026.checked,partial:!exact};
 p.pitchingEstimated=Boolean(p.speedEstimated||p.estimates.includes('pitchRepertoire')||p.estimates.includes('individualPitchSpeed'));
 return p;
}
function extraPitchers2026(club,existing,league){
 const current=new Set(existing.map(p=>p.id));
 const names=new Set(existing.map(p=>p.name.replace(/\s/g,'')));
 return (pitching2026.additions[club]||[]).filter(p=>!current.has(p.id)&&!names.has(p.name.replace(/\s/g,''))).map(p=>applyPitching2026(p,league));
}

for(const [club,identity]of Object.entries(data.identities)){
 const prefix=club==='owls'?'o':club==='foxes'?'f':null;
 const batters=identity.batters.map(([name,no,pos,hand],i)=>({id:prefix?prefix+(i+1):club+'-b'+(i+1),name,no,pos,hand,season:2026,...data.players[club][name]}));
 const pitchers=identity.pitchers.map(([name,no,hand],i)=>applyPitching2026({id:prefix?prefix+'p'+(i+1):club+'-p'+(i+1),name,no,hand,pos:'P',season:2026,...data.players[club][name]},'cpbl'));
 pitchers.push(...extraPitchers2026(club,pitchers,'cpbl'));
 rosters[club]={batters,pitchers,startingOrder:batters.slice(0,9).map(p=>p.id),lineupDate:identity.date,rosterNote:identity.rosterNote};
}
window.NightPlayers={rosters,season:2026,ratingVersion:data.version,owls:rosters.owls.batters.slice(0,9),foxes:rosters.foxes.batters.slice(0,9),homePitchers:rosters.owls.pitchers,awayPitchers:rosters.foxes.pitchers,parks:[{"id":"night","name":"臺中洲際棒球場","center":121.92,"corner":99.06,"left":99.06,"right":99.06,"leftFeet":325,"centerFeet":400,"rightFeet":325,"wind":0,"theme":"night","turf":3636296,"source":"https://cpbl.com.tw/field/cont?SId=0M062368578901208901"},{"id":"brick","name":"天母棒球場","center":121.92,"corner":99.06,"left":99.06,"right":99.06,"leftFeet":325,"centerFeet":400,"rightFeet":325,"wind":0,"theme":"brick","turf":5275203,"source":"https://cpbl.com.tw/field/cont?sid=0M061623807974766861"},{"id":"sky","name":"臺南亞太成棒主球場","center":121.92,"corner":100.58,"left":100.58,"right":100.58,"leftFeet":330,"centerFeet":400,"rightFeet":330,"wind":0,"theme":"sky","turf":6265171,"source":"https://www.uni-lions.com.tw/about/field"},{"id":"harbor","name":"新莊棒球場","center":121.92,"corner":99.06,"left":99.06,"right":99.06,"leftFeet":325,"centerFeet":400,"rightFeet":325,"wind":0,"theme":"harbor","turf":3702114,"source":"https://www.sa.gov.tw/Resource/Other/f1389930582611.pdf"},{"id":"dome","name":"樂天桃園棒球場","center":121.92,"corner":100.58,"left":100.58,"right":100.58,"leftFeet":330,"centerFeet":400,"rightFeet":330,"wind":0,"theme":"night","turf":3770994,"source":"https://www.dst.tycg.gov.tw/cp.aspx?Create=1&n=11738"},{"id":"river","name":"澄清湖棒球場","center":121.92,"corner":99.97,"left":99.97,"right":99.97,"leftFeet":328,"centerFeet":400,"rightFeet":328,"wind":0,"theme":"river","turf":5150551,"source":"https://cpbl.com.tw/field/cont?sid=0M062392119063993008"},{"id":"taipei-dome","name":"臺北大巨蛋","center":121.92,"corner":102.11,"left":102.11,"right":102.11,"leftFeet":335,"centerFeet":400,"rightFeet":335,"wind":0,"theme":"dome","turf":3770994,"source":"https://zh.wikipedia.org/wiki/臺北大巨蛋"}],grade:n=>n>=90?'S':n>=80?'A':n>=70?'B':n>=60?'C':n>=50?'D':n>=40?'E':n>=30?'F':'G'};
NightPlayers.applyPitching2026=applyPitching2026;
NightPlayers.extraPitchers2026=extraPitchers2026;
// Five radial anchors, measured from home plate. Undocumented alleys are model estimates.
const parkDesigns={
 night:{leftCenter:112.7,rightCenter:112.7,turf:0xa2bb74,turfNight:0xa8ba58,clay:0xd18d6c,track:0x9e5d4a,foulTrack:0xb8775b,trackWidth:3.5,mowing:[.45,.52],wallHeight:2.5,board:[-10,16,143,33,12],stands:[[-1.12,-.21,.8],[.20,1.12,.8]],seats:0x325e71,wall:0x264f54,rail:0xe5c568},
 brick:{leftCenter:111.4,rightCenter:111.4,turf:0x627b3e,clay:0xaa544c,track:0x914e44,foulTrack:0x975347,trackWidth:3.4,mowing:[.82,.60],board:[-20,9,134,23,8],stands:[[-1.16,-.55,.35],[.54,1.16,.35]],seats:0x3a6759,wall:0x214d49,rail:0xbebd6c},
 sky:{leftCenter:115,rightCenter:115,turf:0x9bb273,turfNear:0x53694c,clay:0xba805b,track:0xac7953,foulTrack:0xbd916b,trackWidth:3.2,mowing:[.10,.60],board:[4,15,140,44,12],stands:[[-1.25,-.20,.88],[.20,1.25,.88]],seats:0x387962,wall:0x204c40,rail:0xbbba83},
 harbor:{leftCenter:113.8,rightCenter:113.8,turf:0x88a94c,clay:0xd09469,track:0x99554b,foulTrack:0x984c47,trackWidth:2.45,mowing:[.10,.62],board:[-14,14,139,27,11],stands:[[-1.23,-.27,.65],[.25,1.23,.65]],seats:0x226778,wall:0x1f3e62,rail:0xb9a276},
 dome:{leftCenter:114.2,rightCenter:114.2,theme:'taoyuan',turf:0x878c48,clay:0xca9b73,track:0x875048,foulTrack:0x7e483d,trackWidth:3.3,mowing:[.55,.42],board:[0,15,142,37,12],stands:[[-1.2,-.26,.72],[.26,1.2,.72]],seats:0x91384d,wall:0x234544,rail:0xb6af7f},
 river:{leftCenter:115.2,rightCenter:115.2,turf:0xa7c78e,clay:0xcd9d76,track:0xb37b58,foulTrack:0xb98b67,trackWidth:3.6,mowing:[.96,.72],board:[9,15,144,33,12],stands:[[-1.32,-.17,.95],[.17,1.32,.95]],seats:0x2b6a76,wall:0x294c40,rail:0xe5c35d},
 'taipei-dome':{leftCenter:108.5,rightCenter:108.5,turf:0x8fab50,turfNear:0xa3ab67,clay:0xc28770,track:0xcb7341,foulTrack:0xd47c42,trackWidth:4.8,mowing:[.80,.28],wallHeight:3.5,board:[0,22,150,43,14],stands:[[-1.42,1.42,1.18]],seats:0xa9afb4,wall:0x393b40,rail:0xc0b494,roofHeight:68},
 'tokyo-dome':{leftCenter:110,rightCenter:110,turf:0x89c892,turfNear:0x6aae70,turfNight:0x91aa53,clay:0xd08d5a,track:0x9f5b41,foulTrack:0x448361,trackWidth:1.15,mowing:[.88,.23],alleysVerified:true,wallHeight:4,board:[0,22,148,48,12],stands:[[-1.42,1.42,1.16]],seats:0x303d71,wall:0x184835,rail:0x49745e,roofHeight:61.69},
 toyama:{leftCenter:114,rightCenter:114,turf:0x7b8c67,clay:0xba7062,track:0x904c49,foulTrack:0x6b745f,trackWidth:2.6,mowing:[1,.26],board:[0,11,139,31,11],stands:[[-1.20,-.30,.52],[.30,1.20,.52]],seats:0x3d6289,wall:0x315a50,rail:0x5d786b}
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
 if(park.roofProfile){
  const {style,radiusX,radiusZ,edge,height}=park.roofProfile;
  const cross=Math.abs(x/radiusX),length=(z-48)/radiusZ;
  const crown=style==='gable'?Math.max(0,1-cross):style==='barrel'?Math.sqrt(Math.max(0,1-cross*cross)):
   Math.pow(Math.max(0,1-cross*cross-length*length),style==='open-canopy'?.60:.72);
  return edge+(height-edge)*crown;
 }
 const taipei=park.id==='taipei-dome',radius=taipei?128:116,edge=taipei?40:33;
 const radiusSquared=(x/radius)**2+((z-48)/radius)**2;
 return edge+(park.roofHeight-edge)*Math.pow(Math.max(0,1-radiusSquared),.65);
};
for(const park of NightPlayers.parks)Object.assign(park,parkDesigns[park.id]);
NightPlayers.fenceHeight=(park,angle=0)=>{
 const section=park.wallSections?.find(([from,to])=>angle>=from&&angle<=to);
 return section?.[2]??park.wallHeight??2.8;
};
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
 if(park.straightFence)return a*b*Math.sin(quarter)/(b*Math.sin(quarter*(1-u))+a*Math.sin(quarter*u));
 return a+(b-a)*(3*u2-2*u3)+tangent(index)*(u3-2*u2+u)+tangent(index+1)*(u3-u2);
};
})();
