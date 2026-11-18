#!/usr/bin/env python3
"""Build frozen game ratings from sourced 2026 CPBL performance, never club/position batting templates."""
from pathlib import Path
import json, math, re
ROOT=Path(__file__).resolve().parents[1]
read=lambda name:json.loads((ROOT/'data'/name).read_text())
raw=read('live-trends-2026-10-06.json');identities=read('player-identities-2026.json');scouting=read('pitching-scouting-2026.json');defense=read('defense-evidence-2026.json')
roster_evidence=read('roster-expansion-evidence-2026.json')['players']
def number(v):
 m=re.match(r'^\s*(-?\d+(?:\.\d+)?)',str(v));return float(m.group(1)) if m else 0
def innings(s):
 only=re.match(r'^\s*([12])/3',s)
 if only:return int(only.group(1))/3
 m=re.match(r'^\s*(\d+(?:\.\d+)?)(?:\s+([12])/3)?',s);return float(m.group(1))+(int(m.group(2))/3 if m.group(2) else 0)
def cap(v,lo=35,hi=98):return round(max(lo,min(hi,v)))
def percentile(value,values):
 return (sum(v<value-1e-10 for v in values)+.5*sum(abs(v-value)<1e-10 for v in values))/len(values)
def batter(row):
 keys={'games':'出賽數','pa':'打席','ab':'打數','h':'安打','doubles':'二安','triples':'三安','hr':'全壘打','tb':'壘打數','so':'被三振','sb':'盜壘','cs':'盜壘刺','bb':'四壞','hbp':'死球','rbi':'打點','avg':'打擊率','obp':'上壘率','slg':'長打率','ops':'整體攻擊指數'}
 return {k:number(row[v]) for k,v in keys.items()}
def pitcher(row):
 keys={'games':'出賽數','gs':'先發','era':'防禦率','whip':'每局被上壘率','h':'被安打','hr':'被全壘打','bb':'四壞','ibb':'故四','hbp':'死球','k':'奪三振','er':'自責分','totalPitches':'總投球數','bf':'面對打席','saves':'救援成功','holds':'中繼成功'}
 p={k:number(row[v]) for k,v in keys.items()};p['ipText']=row['投球局數'];p['ip']=innings(p['ipText'])
 for rate,key in [('k9','k'),('bb9','bb'),('hr9','hr')]:p[rate]=p[key]*9/max(p['ip'],1/3)
 return p
all_b=[batter(r) for c in raw.values() for r in c['batters'] if number(r['打數'])>=20]
all_p=[pitcher(r) for c in raw.values() for r in c['pitchers'] if innings(r['投球局數'])>=5]
rat=lambda key,den:sum(p[key] for p in all_b)/sum(p[den] for p in all_b)
base={'avg':rat('h','ab'),'k':rat('so','pa'),'iso':sum(p['tb']-p['h'] for p in all_b)/sum(p['ab'] for p in all_b),'hr':rat('hr','ab'),'attempt':sum(p['sb']+p['cs'] for p in all_b)/sum(p['pa'] for p in all_b),'triples':rat('triples','ab')}
base_p={k:sum(p[v] for p in all_p)*9/sum(p['ip'] for p in all_p) for k,v in [('k9','k'),('bb9','bb'),('hr9','hr'),('era','er')]}
def bmetrics(p):
 # Shrink rate estimates toward the six-club baseline; no PA=8 batting title.
 return {'avg':(p['h']+120*base['avg'])/(p['ab']+120),'avoidK':-(p['so']+100*base['k'])/(p['pa']+100),'iso':(p['tb']-p['h']+100*base['iso'])/(p['ab']+100),'hr':(p['hr']+100*base['hr'])/(p['ab']+100),'attempt':(p['sb']+p['cs']+80*base['attempt'])/(p['pa']+80),'triples':(p['triples']+150*base['triples'])/(p['ab']+150)}
def pmetrics(p):
 return {k:(p[v]+30*base_p[k]/9)/(p['ip']+30)*9 for k,v in [('k9','k'),('bb9','bb'),('hr9','hr'),('era','er')]}
ref_b=[bmetrics(p) for p in all_b if p['pa']>=100];ref_p=[pmetrics(p) for p in all_p if p['ip']>=20]
brank=lambda m,k:percentile(m[k],[p[k] for p in ref_b])
prank=lambda m,k,inv=False:percentile((-1 if inv else 1)*m[k],[(-1 if inv else 1)*p[k] for p in ref_p])
field_prior={'C':74,'1B':66,'2B':74,'3B':70,'SS':78,'LF':66,'CF':74,'RF':68,'DH':52}
arm_prior={'C':81,'1B':61,'2B':68,'3B':78,'SS':79,'LF':66,'CF':74,'RF':79,'DH':62}
# Preserve actual pitch identities. Unmeasured individual pitch speeds/movement are game estimates.
speed_ratios={'fast':1,'sinker':.96,'shoot':.97,'cutter':.95,'slider':.90,'curve':.82,'slowcurve':.78,'change':.90,'fork':.90,'split':.92,'vslider':.89,'knuckle':.68}
natural={'王威晨':'3B','吉力吉撈．鞏冠':'1B','林培緯':'1B','張育成':'SS','林泓育':'C','魔鷹':'1B','陳傑憲':'CF','陳子豪':'RF','曾聖安':'CF','杜家明':'3B'}
position_codes={'捕手':'C','一壘手':'1B','二壘手':'2B','三壘手':'3B','游擊手':'SS','左外野手':'LF','中外野手':'CF','右外野手':'RF','投手':'P'}
records={}
for club,identity in identities.items():
 records[club]={}
 for name,no,pos,hand in identity['batters']:
  rows=[p for p in raw[club]['batters'] if p['姓名']==name];assert len(rows)==1,(club,name)
  s=batter(rows[0]);m=bmetrics(s)
  contact=cap(40+55*(.72*brank(m,'avg')+.28*brank(m,'avoidK')))
  power=cap(35+220*m['iso']+650*m['hr'])
  success=(s['sb']+3)/(s['sb']+s['cs']+4)
  run=cap(38+60*(.75*brank(m,'attempt')+.25*brank(m,'triples'))+4*(success-.7))
  award=defense['awards'].get(name,{})
  defpos=natural.get(name,pos)
  field=cap(field_prior[defpos]+.08*(run-65)+min(14,award.get('points',0)/8))
  if award.get('winner'):field=max(field,92)
  arm=cap(arm_prior[defpos]+(min(12,award.get('assists',0)) if pos in ['LF','CF','RF'] else 0))
  if award.get('caughtStealingRate'):arm=max(arm,cap(65+55*award['caughtStealingRate']))
  trait='韋駄天' if run>=90 and run>power else '長距離砲' if power>=85 else '巧打' if contact>=90 else '守備職人' if field>=90 else '韋駄天' if run>=85 else '巧打' if contact>=80 else '強打' if power>=70 else '俊足巧打' if run>=75 else 'バランス'
  records[club][name]={'contact':contact,'power':power,'run':run,'field':field,'arm':arm,'trait':trait,'stats':s,'sourceUrl':raw[club]['url'],'ratingsProvisional':False,'ratingsBasedOnStats':True,'confidence':round(s['pa']/(s['pa']+120),3),'estimates':['field','arm'],'defenseEvidence':award,'defenseSource':award.get('source',defense['source']) if award else None}
  evidence=roster_evidence.get(name,{})
  positions=list(dict.fromkeys([pos,natural.get(name,pos),position_codes.get(evidence.get('primaryPosition'),pos)]))
  records[club][name].update(positions=positions,identityEvidence=evidence or None)
 for name,no,hand in identity['pitchers']:
  rows=[p for p in raw[club]['pitchers'] if p['姓名']==name];assert len(rows)==1,(club,name)
  s=pitcher(rows[0]);m=pmetrics(s);v=scouting[name]
  control=cap(35+63*prank(m,'bb9',True));movement=cap(40+57*(.6*prank(m,'k9')+.25*prank(m,'hr9',True)+.15*prank(m,'era',True)))
  stamina=cap(26+9*s['ip']/max(1,s['games'])+.05*s['ip'],40,98)
  trait='精密制球' if control>=85 else '奪三振型' if movement>=85 else '緩急派' if v['fastAvg']<140 else '速球派' if v['fastAvg']>=148 else '先発型'
  details={}
  for pitch in v['pitches']:
   label=v.get('labels',{}).get(pitch);individual=v.get('individualSpeeds',{}).get(pitch)
   details[pitch]={'speed':round(individual or v['fastAvg']*speed_ratios[pitch],1),'breakScale':1.18 if pitch==v['signature'] else 1.12 if label=='スイーパー' else 1,'speedBasis':('ゲーム用推定' if v.get('fastAvgEstimated') else '平均実測') if pitch=='fast' else '報道の球種別均速' if individual else 'ゲーム用推定'}
   if label:details[pitch]['label']=label
  records[club][name]={'velocity':round(v['fastAvg']),'control':control,'stamina':stamina,'movement':movement,'pitches':v['pitches'],'pitchDetails':details,'trait':trait,'stats':s,'sourceUrl':raw[club]['url'],'velocityEvidence':v,'ratingsProvisional':False,'ratingsBasedOnStats':True,'confidence':round(s['ip']/(s['ip']+30),3),'estimates':['pitchMovement','individualPitchSpeed']+(['velocity'] if v.get('fastAvgEstimated') else [])+(['pitchRepertoire'] if v.get('repertoireEstimated') else []),'role':'SP' if s['gs']>=max(1,s['games']*.5) else 'CP' if s['saves']>=5 else 'RP','roleEstimated':True,'roleSource':'2026年の登板・先発・救援成功数から分類','pitchingEstimated':bool(v.get('fastAvgEstimated') or v.get('repertoireEstimated')),'speedEstimated':bool(v.get('fastAvgEstimated')),'identityEvidence':roster_evidence.get(name)}
metadata={'version':'stats2026-v2-bench30','period':['2026-03-28','2026-10-06'],'retrieved':'2026-11-05','population':{'batters':len(ref_b),'pitchers':len(ref_p)},'baselines':base,'pitchingBaselines':base_p,'identities':identities,'players':records}
(ROOT/'dist'/'ratings-data.js').write_text('/* Generated by scripts/build-ratings.py from frozen source records. */\nwindow.NightRatings='+json.dumps(metadata,ensure_ascii=False,separators=(',',':'))+';\n')
print('Built',sum(len(p) for p in records.values()),'ratings; reference players:',metadata['population'])
for name in ['魔鷹','陳傑憲','陳晨威','布雷克','鄭浩均','江承諺','杜家明']:
 p=next(p[name] for p in records.values() if name in p);print(name,{k:p[k] for k in ['contact','power','run','field','arm','velocity','control','stamina','movement'] if k in p})
