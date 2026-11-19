/* Calendar windows are representative, with compressed school fields.
   Source links and differences are listed in CAREER_WORLD.md. */
(()=>{
 'use strict';
 const jpDistricts=[
  ['北海道'],['青森','岩手','宮城','秋田','山形','福島'],['茨城','栃木','群馬','埼玉','千葉','神奈川','山梨'],
  ['東京'],['新潟','富山','石川','福井','長野'],['岐阜','静岡','愛知','三重'],['滋賀','京都','大阪','兵庫','奈良','和歌山'],
  ['鳥取','島根','岡山','広島','山口'],['徳島','香川','愛媛','高知'],['福岡','佐賀','長崎','熊本','大分','宮崎','鹿児島','沖縄']
 ];
 const krDistricts=[['ソウル','仁川','京畿','江原'],['忠清','大田'],['大邱','慶北','釜山','慶南'],['光州','全羅','済州']];
 const district=(country,region)=>(country==='jp'?jpDistricts:country==='kr'?krDistricts:[]).find(g=>g.includes(region))||[region];
 const countries={
  jp:{label:'日本',league:'NPB',currency:'JPY',start:'04-01',draft:'10-22',region:jpDistricts.flat(),park:'koshien',unit:10000,salary:520,level:5,fa:8,internationalFA:9},
  tw:{label:'台湾',league:'CPBL',currency:'TWD',start:'08-15',draft:'07-02',region:['臺北市','新北市','基隆市','桃園市','新竹市','新竹縣','苗栗縣','臺中市','彰化縣','南投縣','雲林縣','嘉義市','嘉義縣','臺南市','高雄市','屏東縣','宜蘭縣','花蓮縣','臺東縣','澎湖縣','金門縣','連江縣' ],park:'taipei-dome',unit:10000,salary:96,level:0,fa:9,internationalFA:9},
  kr:{label:'韓国',league:'KBO',currency:'KRW',start:'03-02',draft:'09-21',region:['ソウル','仁川','京畿','江原','忠清','大田','大邱','慶北','釜山','慶南','光州','全羅','済州'],park:'gocheok',unit:10000,salary:3200,level:2,fa:8,internationalFA:8}
 };
 const schools={
  jp:['東嶺学院','北峰高校','青波高校','白峰学園','桜陵高校','星南高校'],
  tw:['東港體育高中','明河高商','新灣高中','青溪棒球學院','海岳高工','南林高中'],
  kr:['한빛고','가온공고','백솔고','동해체고','새롬고','푸른상고']
 };
 const names={
  jp:[['香坂','早瀬','田代','桐谷','小峰','森沢','奈良崎','高城','石倉','中沢','林田','榊原','皆川','安斉'],['颯真','晴樹','勇斗','悠生','大地','蒼太','慶介','直人','悠馬','凛太郎','瑛人','航希','陸','暁']],
  tw:[['邱','許','張','魏','郭','謝','曾','何','杜','蔡','劉','廖','詹','馬'],['承翰','柏安','宥澤','彥廷','冠言','子謙','允達','宸睿','宇珩','以恩','德宇','明軒','晉宏','宗展']],
  kr:[['キム','パク','イ','チェ','チョン','カン','ユン','ハン','オ','シン','ソ','アン','ムン','ペ'],['ドユン','ミンギュ','ソジュン','ジウ','ハジュン','テウ','ソンヒョン','ヨンジェ','ジンヒョク','ドンウ','ハンギョル','ミンジェ','ジュウォン','テソン']]
 };
 const phases={
  jp:[
   ['春季都道府県大会','04-24',1],['春季地区大会','05-21',1,'top:0'],['練習試合','06-08',0],
   ['夏の地方大会','07-07',1],['夏の甲子園','08-05',1,'win:3'],['秋季都道府県大会','09-07',1,null,2],
   ['秋季地区大会','10-14',1,'top:5',2],['明治神宮野球大会','11-16',1,'win:6',2],['選抜高校野球大会','03-19',1,'top:6',2]
  ],
  tw:[
   ['校内紅白戦','09-05',0],['中信盃黑豹旗全國高中棒球大賽','10-25',1],
   ['高中棒球聯賽・鋁棒組','11-30',2,'aluminum'],['高中棒球聯賽・木棒組','02-10',2,'wood'],
   ['練習試合','04-13',0],['玉山盃・縣市代表選考','05-13',3],['玉山盃全國青棒錦標賽','06-01',2,'selected']
  ],
  kr:[
   ['練習試合','03-13',0],['新世界Eマート杯','03-25',1],
   ['高校野球週末リーグ・前半','04-08',2],['黄金獅子旗','05-02',1,'top:2'],
   ['高校野球週末リーグ・後半','05-24',2],['青龍旗','06-27',1,'top:4'],
   ['大統領杯','07-18',1,'top:4'],['鳳凰大旗','08-07',1]
  ]
 };
 const leagueCountries=['jp','tw','kr'];
 const positions=['C','1B','2B','3B','SS','LF','CF','RF','DH'];
 const types=['早熟型','標準型','晩成型','天才型','安定型','大器晩成型'];
 const roundRobin=ids=>{
  const ring=ids.slice(),rounds=[];
  if(ring.length%2)ring.push(null);
  for(let i=0;i<ring.length-1;i++){
   const row=[];
   for(let j=0;j<ring.length/2;j++){
    const a=ring[j],b=ring[ring.length-1-j];
    if(a&&b)row.push((i+j)%2?[b,a]:[a,b]);
   }
   rounds.push(row);ring.splice(1,0,ring.pop());
  }
  return rounds;
 };
 const roster=country=>country==='jp'?NightTeams.npb.filter(c=>['central','pacific'].includes(c.division)):
  country==='kr'?NightTeams.kbo:NightTeams.all;
 const name=(country,random)=>{
  const [last,first]=names[country];
  return last[Math.floor(random()*last.length)]+(country==='kr'?'・':'')+first[Math.floor(random()*first.length)];
 };
 const date=(year,stamp)=>year+'-'+stamp;
 const stamp=(d,offset=0)=>new Date(Date.parse(d+'T00:00:00Z')+86400000*offset).toISOString().slice(0,10);
 const park=(country,fallback='night')=>{
  const exists=id=>NightPlayers.parks.some(p=>p.id===id);
  return [countries[country].park,fallback,'night'].find(exists);
 };
 window.NightCareerWorldData={countries,schools,phases,leagueCountries,types,positions,roundRobin,roster,name,date,stamp,park,district};
})();
