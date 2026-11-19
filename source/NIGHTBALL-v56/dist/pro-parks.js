/* NPB and KBO home venues. Field dimensions are metres; see STADIUM_SOURCES.md. */
(()=>{
 'use strict';
 const home={};
 const add=(id,name,clubs,dimensions,surfaces,options={})=>{
  const [left,leftCenter,center,rightCenter,right,wallHeight]=dimensions;
  const [turf,turfNear,clay,wall,rail,track,foulTrack]=surfaces;
  const league=clubs[0].startsWith('npb-')?'npb':'kbo';
  const park={id,name,league,pro:true,left,leftCenter,center,rightCenter,right,corner:Math.min(left,right),
   wallHeight,turf,turfNear,clay,wall,rail,track,foulTrack,theme:'pro-outdoor',wind:0,mowing:[.55,.60],...options};
  NightPlayers.parks.push(park);
  for(const club of clubs)home[club]=id;
 };
 const roof=(style,radiusX,radiusZ,edge,height,color)=>{
  return {theme:style==='open-canopy'?'pro-outdoor':'dome',daylight:style==='open-canopy',roofHeight:height,
   roofProfile:{style,radiusX,radiusZ,edge,height,color}};
 };
 home['npb-g']='tokyo-dome';
 add('yokohama','横浜スタジアム',['npb-db'],[94,111.4,118,111.4,94,5],
  [0x64954b,0x75a75c,0xb97955,0x203f63,0xabb8a8,0x9a6958,0x946353],{cutouts:true,mowing:[.72,.34],daylight:true});
 add('koshien','阪神甲子園球場',['npb-t'],[95,118,118,118,95,2.6],
  [0x6a9541,0x819249,0x4f3c34,0x184838,0xd8d19a,0x624b3d,0x514039],{infield:'dirt',mowing:[.76,.71],daylight:true});
 add('mazda','MAZDA Zoom-Zoom スタジアム広島',['npb-c'],[101,116,122,115,100,2.5],
  [0x75a546,0x85b451,0xb47950,0x295d42,0xc4d793,0xaa644c,0xb87755],
  {wallSections:[[-.786,-.66,3.6],[.66,.786,3.4]],mowing:[.53,.85]});
 add('nagoya-dome','バンテリンドーム ナゴヤ',['npb-d'],[100,110,122,110,100,3.6],
  [0x7eab65,0x659352,0xb97c56,0x234777,0xa6c3c9,0x6b8d57,0x739359],
  {...roof('lattice',112,113,31,64.3,0xb4b7b6),cutouts:true,alleysVerified:true,mowing:[.60,.25]});
 add('jingu','明治神宮野球場',['npb-s'],[97.5,112.3,120,112.3,97.5,3.3],
  [0x5c984e,0x74a95e,0xb1674d,0x263d68,0xd8c59a,0x925a48,0x9d6556],{cutouts:true,mowing:[.52,.40]});
 add('paypay-dome','みずほPayPayドーム福岡',['npb-h'],[100,110,122,110,100,4.2],
  [0x548f50,0x679d55,0xc1855c,0x273c2c,0xb4c183,0x88684f,0x567b4e],
  {...roof('retractable',119,119,32,68,0xa9aeb2),cutouts:true,alleysVerified:true,mowing:[.83,.27]});
 add('es-con','エスコンフィールドHOKKAIDO',['npb-f'],[97,114,121,112,99,2.8],
  [0x7fae4d,0x6c993f,0xb47553,0x283744,0xa1a5a6,0xa7604b,0x9e6654],
  {...roof('gable',110,119,32,70,0x424b50),mowing:[.42,.84]});
 add('miyagi','楽天モバイル 最強パーク宮城',['npb-e'],[100.1,110,122,112,100.1,2.5],
  [0x81ae54,0x74a34a,0xb98258,0x26423d,0xd7bb7d,0xb27655,0xb97758],{alleysVerified:true,mowing:[.38,.92]});
 add('zozo-marine','ZOZOマリンスタジアム',['npb-m'],[99.5,113,122,113,99.5,3.3],
  [0x559049,0x65a45a,0xb57452,0x214a42,0xe0ca92,0x9c674e,0xa47257],{cutouts:true,mowing:[.59,.33]});
 add('kyocera-dome','京セラドーム大阪',['npb-b'],[100,116,122,116,100,4.2],
  [0x749c53,0x83ad61,0xc18152,0x243a5b,0xb8bcc6,0x547950,0x537d49],
  {...roof('rings',116,116,31,60,0x7c8396),cutouts:true,mowing:[.61,.30]});
 add('belluna-dome','ベルーナドーム',['npb-l'],[100,116,122,116,100,3.2],
  [0x57934d,0x61a04f,0xb57055,0x173c4d,0xb8b78c,0xa37151,0x995f48],
  {...roof('open-canopy',116,116,32,64.5,0xb9b9ac),cutouts:true,mowing:[.64,.31]});
 add('niigata-eco','HARD OFF ECOスタジアム新潟',['npb-a'],[100,115,122,115,100,3.1],
  [0x638f44,0x78a34f,0xab6e56,0x224952,0xb6bfa5,0x975d4d,0x956151],{cutouts:true,mowing:[.57,.35]});
 add('shimizu-ihara','ちゅ〜るスタジアム清水',['npb-v'],[100,114,122,114,100,2.6],
  [0x65834b,0x749650,0x61483a,0x2b5245,0xc5c092,0x805c48,0x7e5b47],{infield:'dirt',mowing:[.4,.40],daylight:true});

 add('gwangju-kia','光州起亜チャンピオンズフィールド',['kbo-ht'],[99,117,121,117,99,2.6],
  [0x729748,0x789d46,0xb07b54,0x263c39,0xd2b789,0x9e674f,0xa16d52],{alleysVerified:true,mowing:[.74,.75]});
 add('daegu-lions','大邱サムスンライオンズパーク',['kbo-ss'],[99.5,107,122,107,99.5,3],
  [0x81ad50,0x6a9d43,0xba8158,0x253f65,0xd5cba3,0xa16d50,0xa76c50],{alleysVerified:true,straightFence:true,mowing:[.36,.93]});
 add('jamsil','蚕室野球場',['kbo-lg','kbo-ob'],[100,120,125,120,100,2.6],
  [0x6c9745,0x79a650,0xba8059,0x264b43,0xc8bfa0,0xa06b52,0x9d6552],{mowing:[.65,.68]});
 add('suwon-kt','水原KTウィズパーク',['kbo-kt'],[98,115,120,115,98,4],
  [0x70a443,0x819d4d,0xbb8055,0x303c3d,0xd6c596,0xa16e4d,0xa37154],{alleysVerified:true,mowing:[.19,.78]});
 add('incheon-landers','仁川SSGランダースフィールド',['kbo-sk'],[95,115,120,115,95,2.8],
  [0x739c49,0x7aa954,0xb67a53,0x25493e,0xcad195,0xa46e51,0xb47358],{mowing:[.43,.80]});
 add('sajik','社稷野球場',['kbo-lt'],[95,113,118,113,95,4.8],
  [0x72954e,0x84a754,0xb6805d,0x243e45,0xb7bd8a,0xa06b52,0xa37458],{mowing:[.57,.65]});
 add('daejeon-hanwha','大田ハンファ生命ボールパーク',['kbo-hh'],[99,115,122,112,95,2.4],
  [0x79a443,0x89b050,0xb97b53,0x253d39,0xbfb88c,0x9e684e,0xa66a4d],
  {wallSections:[[.43,.786,8]],alleysVerified:true,straightFence:true,mowing:[.38,1.05]});
 add('changwon-nc','昌原NCパーク',['kbo-nc'],[101,123,122,123,101,3.3],
  [0x76a34a,0x86ad54,0xb17a58,0x263b43,0xb8c49e,0x9b684e,0xa67457],{alleysVerified:true,mowing:[.51,.89]});
 add('gocheok','高尺スカイドーム',['kbo-wo'],[99,113,122,113,99,4],
  [0x619851,0x6da257,0xb47d59,0x314049,0xb9bcad,0x8f634d,0x916750],
  {...roof('barrel',104,115,31,67.6,0x6d828f),cutouts:true,alleysVerified:true,mowing:[.63,.36]});

 NightPlayers.proHomeParks=home;
})();
