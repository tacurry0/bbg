#!/usr/bin/env python3
"""APBC2026: reproduce the existing CPBL ability conversion from sourced individual stats."""
from pathlib import Path
import contextlib,copy,hashlib,io,json,math,runpy
R=Path(__file__).resolve().parents[1]
with contextlib.redirect_stdout(io.StringIO()):ref=runpy.run_path(str(R/'scripts/build-ratings.py'))
old=json.loads((R/'dist/ratings-data.js').read_text().split('window.NightRatings=',1)[1].rsplit(';',1)[0])
cap,bmetrics,pmetrics,brank,prank=[ref[k] for k in ['cap','bmetrics','pmetrics','brank','prank']]
base,base_p=ref['base'],ref['base_p'];ratios=ref['speed_ratios'];clubs=[]
def numeric(v):return isinstance(v,(int,float)) and math.isfinite(v)
def n(s,k,default=0):return s[k] if numeric(s.get(k)) else default
for country,color,accent,mark in [('taipei','#1047a6','#e52a45','CT'),('korea','#2164b8','#d52940','K'),('japan','#152441','#cf1f3f','J'),('australia','#123c31','#f4c945','AUS')]:
 raw=json.loads((R/'data'/f'apbc-{country}-2026.json').read_text());cid='apbc-'+country;players=[];candidates=[]
 for p,is_candidate in [(p,False) for p in raw['players']]+[(p,True) for p in raw.get('candidates',[])]:
  s=copy.deepcopy(p['stats']);pit=p['pos']=='P';provisional=not n(s,'ip' if pit else 'ab');prior=old['players'].get(p.get('existingClub'),{}).get(p.get('existingName'))
  if not pit:
   if s.get('so') is None:s['so']=s.get('k')
   if s.get('ops') is None and numeric(s.get('obp')) and numeric(s.get('slg')):s['ops']=round(s['obp']+s['slg'],3)
  else:
   for rate,key in [('k9','k'),('bb9','bb'),('hr9','hr')]:
    if numeric(s.get(key)) and n(s,'ip')>0:s[rate]=n(s,key)*9/n(s,'ip')
   if s.get('whip') is None and numeric(s.get('h')) and numeric(s.get('bb')) and n(s,'ip')>0:s['whip']=(n(s,'h')+n(s,'bb'))/n(s,'ip')
   if numeric(s.get('ip')) and s['ip']>0:s.setdefault('ipText',str(s['ip']))
  if prior:v=copy.deepcopy(prior)
  elif not pit:
   ab=n(s,'ab');pa=n(s,'pa',ab+n(s,'bb'));metric={k:n(s,k) for k in ['h','hr','sb','cs','triples']};metric.update(ab=ab,pa=pa,so=n(s,'so',base['k']*pa),tb=n(s,'tb',n(s,'slg',base['avg']+base['iso'])*ab));m=bmetrics(metric)
   contact=cap(40+55*(.72*brank(m,'avg')+.28*brank(m,'avoidK')));power=cap(35+220*m['iso']+650*m['hr']);success=(metric['sb']+3)/(metric['sb']+metric['cs']+4);run=cap(38+60*(.75*brank(m,'attempt')+.25*brank(m,'triples'))+4*(success-.7))
   trait='韋駄天' if run>=85 and run>power else '長距離砲' if power>=85 else '巧打' if contact>=80 else '強打' if power>=70 else '俊足巧打' if run>=75 else 'バランス'
   v=dict(contact=contact,power=power,run=run,field=cap(ref['field_prior'][p['pos']]+.08*(run-65)),arm=ref['arm_prior'][p['pos']],trait=trait,confidence=round(pa/(pa+120),3),estimates=['field','arm'])
  else:
   ip=n(s,'ip');m=pmetrics(dict(ip=ip,**{k:n(s,k,base_p[rate]*ip/9) for k,rate in [('k','k9'),('bb','bb9'),('hr','hr9'),('er','era')]}));control=cap(35+63*prank(m,'bb9',True));movement=cap(40+57*(.60*prank(m,'k9')+.25*prank(m,'hr9',True)+.15*prank(m,'era',True)));stamina=cap(26+9*ip/max(1,n(s,'games'))+.05*ip,40,98)
   ev=copy.deepcopy(p.get('velocityEvidence') or {});speed=p.get('velocity',ev.get('fastAvg'));measured=numeric(speed) and not p.get('velocityEstimated',ev.get('fastAvgEstimated',False));maxspeed=p.get('velocityMax') or ev.get('fastMax')
   if p.get('velocityKind')=='max' and numeric(speed):maxspeed=speed;speed=speed-6;measured=False
   if not numeric(speed):speed=143;measured=False
   speed=round(speed,1);ev.update(fastAvg=speed,fastMax=maxspeed,fastAvgEstimated=not measured,speedBasis=ev.get('speedBasis') or ('公開された2026年の球速データ' if measured else 'ゲーム用推定（球速実測なし）'))
   if p.get('velocitySource'):ev['speedSource']=p['velocitySource']
   repertoire=p.get('pitches') or ev.get('pitches');estimated=bool(p.get('repertoireEstimated',not repertoire) or ev.get('repertoireEstimated',False))
   if not repertoire:repertoire=['fast','slider','curve','change' if p['hand']=='L' else 'fork']
   repertoire=list(dict.fromkeys(['fast']+[t for t in repertoire if t in ratios]));ev.update(pitches=repertoire,repertoireEstimated=estimated)
   if p.get('repertoireSource') or p.get('pitchingSource'):ev['repertoireSource']=p.get('repertoireSource') or p.get('pitchingSource')
   speeds=p.get('pitchSpeeds',{});labels=p.get('pitchLabels',{});details={}
   for t in repertoire:
    measured_pitch=numeric(speeds.get(t));details[t]=dict(speed=round(speeds.get(t) or speed*ratios[t],1),breakScale=1,speedBasis='公開球種別平均' if measured_pitch else ('公開球速' if measured else 'ゲーム用推定') if t=='fast' else 'ゲーム用推定')
    if labels.get(t):details[t]['label']=labels[t]
   gs=s.get('gs');role='SP' if numeric(gs) and gs>=max(1,n(s,'games')*.5) or gs is None and ip/max(1,n(s,'games'))>=3 else 'CP' if n(s,'saves')>=5 else 'RP'
   trait='精密制球' if control>=85 else '奪三振型' if movement>=85 else '速球派' if speed>=148 else '緩急派' if speed<140 else '先発型' if role=='SP' else '技巧派'
   v=dict(velocity=round(speed),control=control,stamina=stamina,movement=movement,pitches=repertoire,pitchDetails=details,trait=trait,confidence=round(ip/(ip+30),3),velocityEvidence=ev,speedEstimated=not measured,pitchingEstimated=estimated or not measured,role=role,roleEstimated=True,roleSource=f"{p['season']}年の登板・先発・投球回から分類",estimates=['pitchMovement','individualPitchSpeed']+(['velocity'] if not measured else [])+(['pitchRepertoire'] if estimated else []))
  positions=list(dict.fromkeys([p['pos']]+p.get('positions',[])+(v.get('positions') or [])))
  v.update({k:p[k] for k in ['name','nativeName','no','pos','hand','throwHand','club','season','statsLevel','identityUrl','fieldingAppearances','fieldingSource','statsAsOf','statsNotes','additionalStats','numberBasis','numberSource','selectionSource','selectionNote'] if k in p})
  v.update(id=cid+('-p-' if pit else '-b-')+hashlib.sha1(p['name'].encode()).hexdigest()[:10],competition='apbc2026',stats=s,sourceUrl=p['statsUrl'],statsPeriod=p.get('statsPeriod'),retrieved=raw['asOf'],ratingsBasedOnStats=not provisional,ratingsProvisional=provisional,positions=positions,placementNote=p.get('placementNote') or p.get('positionBasis'))
  (candidates if is_candidate else players).append(v)
 bats=[p for p in players if p['pos']!='P'];pitchers=[p for p in players if p['pos']=='P'];chosen=[];fielding={};used=set()
 for pos in ['C','SS','2B','CF','3B','RF','LF','1B','DH']:
  pool=[p for p in bats if p['id'] not in used]
  def score(p):return p['contact']*.32+p['power']*.25+p['run']*.13+p['field']*.2+p['arm']*.1+(p['power']*.3 if pos=='DH' else 90 if pos==p['pos'] else 65 if pos in p['positions'] else 40 if pos=='2B' and p['pos']=='SS' else 0)
  best=max(pool,key=score);chosen.append(best);used.add(best['id']);fielding[pos]=best['id']
 lead=max(chosen,key=lambda p:p['contact']+p['run']*.6);order=[lead]+sorted([p for p in chosen if p is not lead],key=lambda p:p['contact']+p['power']*.8,reverse=True);recommended=raw.get('recommendedStarterNo')
 pitchers.sort(key=lambda p:(p['no']==recommended if recommended is not None else False,p['role']=='SP',p['stamina']*1.2+p['movement']*.5+p['confidence']*5),reverse=True)
 clubs.append(dict(reserveBatters=[p for p in candidates if p['pos']!='P'],reservePitchers=[p for p in candidates if p['pos']=='P'],id=cid,name=raw['label'],short=raw['label'],mark=mark,logo=f'./assets/nations/{country}.svg',color=color,accent=accent,park='tokyo-dome',country=country,rosterStatus=raw['rosterStatus'],rosterSources=raw['rosterSources'],asOf=raw['asOf'],batters=bats,pitchers=pitchers,startingOrder=[p['id'] for p in order],startingFielding=fielding))
text='/* Generated by scripts/build-apbc.py from sourced 2026 individual records. */\nwindow.NightAPBC='+json.dumps(dict(asOf=max(c['asOf'] for c in clubs),teams=clubs),ensure_ascii=False,separators=(',',':'))+';\n'
text+="""(()=>{const national=NightAPBC.teams,baseGet=NightTeams.get;NightTeams.international=national;NightTeams.playable=[...NightTeams.all,...national];NightTeams.get=id=>national.find(c=>c.id===id)||baseGet(id);if(!NightPlayers.parks.some(p=>p.id==='tokyo-dome'))NightPlayers.parks.push({id:'tokyo-dome',name:'東京ドーム',left:100,right:100,corner:100,center:122,wallHeight:4,wind:0,theme:'dome',turf:0x3d8d70,source:'https://www.tokyo-dome.co.jp/dome/about/'});})();\n"""
(R/'dist/apbc-data.js').write_text(text)
for c in clubs:print(c['name'],len(c['batters']),'+',len(c['pitchers']),'starter',c['pitchers'][0]['name'])
