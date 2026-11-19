#!/usr/bin/env python3
"""NIGHTBALL 2026 KBO: one-time public-season-facts snapshot and deterministic ratings.

The 10 clubs' two stat pages each for hitting and pitching are sampled once,
at low request rate. Extract only facts, player identifiers and source URLs;
do not republish site HTML or trademark artwork.
For repeat runs, use the committed minimal factual data snapshot offline.
"""
from __future__ import annotations

from datetime import date
from pathlib import Path
from collections import defaultdict
import argparse, json, math, re, time
from html import escape

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "kbo-season-2026.json"
OUT = ROOT / "dist" / "kbo-data.js"
AS_OF = "2026-11-19"
BASE = "https://eng.koreabaseball.com/Stats/"
TEAMS = [
 ("HT","KIAタイガース","KIA","KIA","#bd122a","#ffffff","night"),
 ("SS","サムスン・ライオンズ","サムスン","SS","#1559a5","#ffffff","tokyo-dome"),
 ("LG","LGツインズ","LG","LG","#c41232","#ffffff","tokyo-dome"),
 ("OB","斗山ベアーズ","斗山","DB","#1e3563","#ffffff","tokyo-dome"),
 ("KT","KTウィズ","KT","KT","#292929","#ffffff","tokyo-dome"),
 ("SK","SSGランダース","SSG","SSG","#ba092e","#ffffff","tokyo-dome"),
 ("LT","ロッテ・ジャイアンツ","ロッテ","LOT","#cc1230","#ffffff","toyama"),
 ("HH","ハンファ・イーグルス","ハンファ","HE","#f17519","#ffffff","toyama"),
 ("NC","NCダイノス","NC","NC","#284c82","#e7c17c","night"),
 ("WO","キウム・ヒーローズ","キウム","KH","#7c163b","#ffffff","tokyo-dome")
]
EXPECTED = {t[0] for t in TEAMS}
ENGLISH_TEAM = dict(zip([t[0] for t in TEAMS], ["KIA","SAMSUNG","LG","DOOSAN","KT","SSG","LOTTE","HANWHA","NC","KIWOOM"]))
PITCH_SPEED_RATIO = {"fast":1,"slider":.90,"curve":.82,"change":.89,"fork":.90,"cutter":.95}
FIELD_PRIOR = {"C":74,"1B":66,"2B":74,"3B":70,"SS":78,"LF":66,"CF":74,"RF":68,"DH":52}
ARM_PRIOR = {"C":81,"1B":61,"2B":68,"3B":78,"SS":79,"LF":66,"CF":74,"RF":79,"DH":62}

def numeric(x):
 try:
  text = str(x).replace(",","").strip().replace("%","")
  return float(text) if text not in ("-","—","","---") else 0.
 except (ValueError,TypeError): return 0.
def integer(x): return int(numeric(x))
def clamp(x,lo=35,hi=98): return int(round(max(lo,min(hi,x))))
def innings(text):
 s=re.sub(r"\s+"," ",str(text)).strip()
 if not s: return 0.
 m=re.match(r"^(\d+)\s+([12])/3$",s)
 if m: return int(m[1])+int(m[2])/3
 m=re.match(r"^([12])/3$",s)
 if m:return int(m[1])/3
 m=re.match(r"^(\d+)\.([012])$",s)
 if m:return int(m[1])+int(m[2])/3
 return numeric(s)
def percentile(v,values):
 if not values:return .5
 return (sum(x<v-1e-10 for x in values)+.5*sum(abs(x-v)<1e-10 for x in values))/len(values)

def fetch_source():
 import requests
 from bs4 import BeautifulSoup
 session=requests.Session()
 session.headers.update({"User-Agent":"NIGHTBALL/1.0 (single-date KBO facts audit; https://github.com/tacurry0/bbg)"})
 raw={"retrieved":AS_OF,"season":2026,"source":BASE,"teams":{}}
 for code,_,short,*rest in TEAMS:
  set_={}
  for typ,urlname in [("b1","BattingByTeams.aspx"),("b2","BattingByTeams02.aspx"),
                      ("p1","PitchingByTeams.aspx"),("p2","PitchingByTeams02.aspx")]:
   url=BASE+urlname+"?codeTeam="+code
   page=session.get(url,timeout=30)
   page.raise_for_status()
   page.encoding="utf-8"
   html=BeautifulSoup(page.text,"lxml")
   tables=html.select("table")
   if not tables:raise RuntimeError("Official table not found "+url)
   table=next((t for t in tables if t.select_one("a.stats_player")),None)
   if table is None:raise RuntimeError("No player rows "+url)
   header=[th.get_text(" ",strip=True) for th in table.select_one("tr").find_all(["th","td"],recursive=False)]
   output={}
   for tr in table.select("tr")[1:]:
    cells=tr.find_all(["td","th"],recursive=False)
    if len(cells)!=len(header):continue
    link=tr.select_one("a.stats_player")
    if not link:continue
    m=re.search(r"pcode=(\w+)",link.get("href",""),re.I)
    if not m:continue
    pid=m[1]
    record={h:c.get_text(" ",strip=True) for h,c in zip(header,cells)}
    record["PLAYER"]=link.get_text(" ",strip=True)
    if record.get("TEAM") and record["TEAM"].upper()!=ENGLISH_TEAM[code]:
     raise RuntimeError("Wrong team on "+url+" : "+record["TEAM"])
    if pid in output:raise RuntimeError("Duplicate official KBO code "+pid)
    output[pid]=record
   if len(output)<16:raise RuntimeError("Only "+str(len(output))+" rows at "+url)
   set_[typ]={"url":url,"rows":output}
   print("CAPTURE",code,typ,len(output),flush=True)
   time.sleep(.16)
  raw["teams"][code]=set_
 if set(raw["teams"])!=EXPECTED:raise RuntimeError("Missing KBO club")
 DATA.write_text(json.dumps(raw,ensure_ascii=False,indent=2),encoding="utf8")
 return raw

def base_b(pop):
 den=lambda key:max(1,sum(x[key] for x in pop))
 return {"avg":sum(x["h"] for x in pop)/den("ab"),
         "k":sum(x["so"] for x in pop)/den("pa"),
         "iso":sum(x["tb"]-x["h"] for x in pop)/den("ab"),
         "hr":sum(x["hr"] for x in pop)/den("ab"),
         "attempt":sum(x["sb"]+x["cs"] for x in pop)/den("pa"),
         "triples":sum(x["triples"] for x in pop)/den("ab")}
def base_p(pop):
 den=max(1,sum(x["ip"] for x in pop))
 return {k:9*sum(x[raw] for x in pop)/den for k,raw in
         (("k9","k"),("bb9","bb"),("hr9","hr"),("era","er"))}
def batt_stats(primary,detail):
 get=lambda k:integer(primary.get(k,0))
 extra=lambda k:integer(detail.get(k,0))
 s={"games":get("G"),"pa":get("PA"),"ab":get("AB"),"h":get("H"),
    "doubles":get("2B"),"triples":get("3B"),"hr":get("HR"),"tb":get("TB"),
    "so":extra("SO"),"sb":get("SB"),"cs":get("CS"),
    "bb":extra("BB"),"hbp":extra("HBP"),"rbi":get("RBI"),
    "avg":numeric(primary.get("AVG")),"obp":numeric(detail.get("OBP")),
    "slg":numeric(detail.get("SLG"))}
 s["ops"]=round(s["obp"]+s["slg"],3)
 return s
def pitch_stats(primary,detail):
 get=lambda k:integer(primary.get(k,0))
 ext=lambda k:integer(detail.get(k,0))
 s={"games":get("G"),"gs":0,"era":numeric(primary.get("ERA")),
    "ipText":str(primary.get("IP","0")),"ip":innings(primary.get("IP","0")),
    "h":get("H"),"hr":get("HR"),"bb":ext("BB"),"ibb":ext("IBB"),
    "hbp":ext("HBP"),"k":ext("SO"),"er":ext("ER"),
    "totalPitches":get("NP"),"bf":get("PA"),
    "saves":get("SV"),"holds":get("HLD"),"whip":numeric(detail.get("WHIP"))}
 for k,col in (("k9","k"),("bb9","bb"),("hr9","hr")):
  s[k]=s[col]*9/max(s["ip"],1/3)
 return s

def metric_b(s,base):
 return {"avg":(s["h"]+120*base["avg"])/(s["ab"]+120),
         "avoidK":-(s["so"]+100*base["k"])/(s["pa"]+100),
         "iso":(s["tb"]-s["h"]+100*base["iso"])/(s["ab"]+100),
         "hr":(s["hr"]+100*base["hr"])/(s["ab"]+100),
         "attempt":(s["sb"]+s["cs"]+80*base["attempt"])/(s["pa"]+80),
         "triples":(s["triples"]+150*base["triples"])/(s["ab"]+150)}
def metric_p(s,base):
 return {k:(s[col]+30*base[k]/9)/(s["ip"]+30)*9 for k,col in
        (("k9","k"),("bb9","bb"),("hr9","hr"),("era","er"))}
def rank(m,key,ref,reverse=False):
 sign=-1 if reverse else 1
 return percentile(m[key]*sign,[r[key]*sign for r in ref])
def trait_b(c,p,r,f):
 return ("韋駄天" if r>=90 and r>p else "長距離砲" if p>=85 else
         "巧打" if c>=90 else "守備職人" if f>=90 else "韋駄天" if r>=85 else
         "巧打" if c>=80 else "強打" if p>=70 else
         "俊足巧打" if r>=75 else "バランス")
def bat_rating(s,base,ref,pos):
 m=metric_b(s,base)
 contact=clamp(40+55*(.72*rank(m,"avg",ref)+.28*rank(m,"avoidK",ref)))
 power=clamp(35+220*m["iso"]+650*m["hr"])
 succ=(s["sb"]+3)/(s["sb"]+s["cs"]+4)
 run=clamp(38+60*(.75*rank(m,"attempt",ref)+.25*rank(m,"triples",ref))+4*(succ-.7))
 # The English season table lacks primary defensive position and arm tracking.
 field=clamp(FIELD_PRIOR[pos]+.08*(run-65))
 arm=clamp(ARM_PRIOR[pos])
 return {"contact":contact,"power":power,"run":run,"field":field,"arm":arm,
         "trait":trait_b(contact,power,run,field)}
def pitch_rating(s,base,ref):
 m=metric_p(s,base)
 control=clamp(35+63*rank(m,"bb9",ref,True))
 movement=clamp(40+57*(.60*rank(m,"k9",ref)+.25*rank(m,"hr9",ref,True)+.15*rank(m,"era",ref,True)))
 stamina=clamp(26+9*s["ip"]/max(1,s["games"])+.05*s["ip"],40,98)
 # These are deliberately marked as estimates: team tables have no actual radar speed or repertoire.
 velo=round(max(136,min(155,144+(.95*(s["k9"]-7))+min(2,stamina/40))))
 role=("CP" if s["saves"]>=7 else "SP" if s["ip"]/max(1,s["games"])>=3.2 else "RP")
 pitches=["fast","slider","curve","change"] if role=="SP" else ["fast","slider","fork"] if role=="CP" else ["fast","slider","change"]
 details={k:{"speed":round(velo*PITCH_SPEED_RATIO[k],1),"breakScale":1,"speedBasis":"ゲーム用推定"} for k in pitches}
 return {"velocity":velo,"control":control,"movement":movement,"stamina":stamina,
         "role":role,"roleEstimated":True,"speedEstimated":True,"pitchingEstimated":True,
         "pitches":pitches,"pitchDetails":details,"trait":
         ("精密制球" if control>=85 else "奪三振型" if movement>=85 else "先発型" if role=="SP" else "速球派"),
         "velocityEvidence":{"fastAvg":velo,"fastAvgEstimated":True,
          "repertoireEstimated":True,"speedBasis":"ゲーム用推定。KBO公式球団別年次成績表に球速情報なし"}}
def logo(code,mark,bg,fg):
 folder=ROOT/"dist"/"assets"/"kbo";folder.mkdir(parents=True,exist_ok=True)
 # Original in-game monogram, not an official club logo.
 txt=escape(mark)
 name="kbo-"+code.lower()+".svg"
 xml=('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
<circle cx="80" cy="80" r="76" fill="%s" stroke="#fff" stroke-width="5"/>
<circle cx="80" cy="80" r="65" fill="none" stroke="%s" stroke-width="3" opacity=".6"/>
<path d="M25 50 Q80 13 135 50" fill="none" stroke="%s" stroke-width="3" opacity=".3"/>
<text x="80" y="99" fill="%s" font-family="Arial,sans-serif" font-size="%s"
 font-weight="900" text-anchor="middle">%s</text>
<text x="80" y="122" fill="%s" font-family="Arial,sans-serif" font-size="10"
 font-weight="700" text-anchor="middle" letter-spacing="2">NIGHTBALL</text>
</svg>'''%(bg,fg,fg,fg,62 if len(mark)<3 else 44,txt,fg))
 (folder/name).write_text(xml,encoding="utf8")
 return "./assets/kbo/"+name
def prepare(source):
 all_b=[];all_p=[]
 byTeam={}
 for code,*_ in TEAMS:
  d=source["teams"][code]
  bat={}
  pit={}
  for pid,first in d["b1"]["rows"].items():
   detail=d["b2"]["rows"].get(pid)
   if detail is None:continue
   s=batt_stats(first,detail)
   if s["pa"]>=1:bat[pid]={"id":pid,"name":first["PLAYER"],"stats":s}
   if s["ab"]>=20:all_b.append(s)
  for pid,first in d["p1"]["rows"].items():
   detail=d["p2"]["rows"].get(pid)
   if detail is None:continue
   s=pitch_stats(first,detail)
   if s["ip"]>0:pit[pid]={"id":pid,"name":first["PLAYER"],"stats":s}
   if s["ip"]>=5:all_p.append(s)
  if len(bat)<16 or len(pit)<14:
   raise RuntimeError("Insufficient complete KBO candidates "+code+
                      " bats="+str(len(bat))+" pitchers="+str(len(pit)))
  byTeam[code]={"batters":bat,"pitchers":pit}
 base=base_b(all_b);pbase=base_p(all_p)
 ref_b=[metric_b(s,base) for s in all_b if s["pa"]>=100]
 ref_p=[metric_p(s,pbase) for s in all_p if s["ip"]>=20]
 if len(ref_b)<60 or len(ref_p)<75:raise RuntimeError("Insufficient reference pool")
 print("KBO references",len(ref_b),len(ref_p),"baselines",base,pbase,flush=True)
 teams=[]
 audit={}
 for code,name,short,mark,primary,accent,park in TEAMS:
  pool=byTeam[code]
  all_bat=sorted(pool["batters"].values(),key=lambda x:(-x["stats"]["pa"],-x["stats"]["h"],x["id"]))
  all_pit=sorted(pool["pitchers"].values(),key=lambda x:(-x["stats"]["ip"],-x["stats"]["saves"],x["id"]))
  # Keep the most-used 16 position players; 9 starting spots must have unique
  # defensive roles, with any unknown natural position treated as an estimate.
  bats=[]
  for i,item in enumerate(all_bat[:16]):
   # Positions here are GAME STARTING SLOTS, not presented as verified real positions.
   pos=["CF","RF","1B","DH","3B","LF","2B","SS","C","C","SS","2B","3B","1B","RF","LF"][i]
   stats=item["stats"]
   p={"id":"kbo-"+code.lower()+"-b-"+item["id"],"name":item["name"],
      "nativeName":item["name"],"no":"—","pos":pos,"positions":[pos],
      "positionEstimated":True,"hand":"R","handEstimated":True,"throwHand":"R",
      "throwHandEstimated":True,"season":2026,"stats":stats,
      **bat_rating(stats,base,ref_b,pos),
      "sourceUrl":source["teams"][code]["b1"]["url"],
      "identityUrl":"https://eng.koreabaseball.com/teams/playerinfohitter/summary.aspx?pcode="+item["id"],
      "statsLevel":"KBO一軍","statsPeriod":"KBO 2026",
      "ratingsBasedOnStats":True,"ratingsProvisional":False,
      "confidence":round(stats["pa"]/(stats["pa"]+120),3),
      "estimates":["field","arm","run","position","hand","throwHand"],
      "rosterNote":"守備位置・投打の左右・背番号は公式球団別成績表では確認不可。守備位置/左右はゲーム用仮設定。"}
   bats.append(p)
  ratedP=[]
  for item in all_pit:
   stats=item["stats"];ev=pitch_rating(stats,pbase,ref_p)
   ratedP.append({"id":"kbo-"+code.lower()+"-p-"+item["id"],"name":item["name"],
     "nativeName":item["name"],"no":"—","pos":"P","hand":"R",
     "handEstimated":True,"throwHand":"R","throwHandEstimated":True,
     "season":2026,"stats":stats,**ev,
     "sourceUrl":source["teams"][code]["p1"]["url"],
     "identityUrl":"https://eng.koreabaseball.com/teams/playerinfopitcher/summary.aspx?pcode="+item["id"],
     "statsLevel":"KBO一軍","statsPeriod":"KBO 2026",
     "ratingsBasedOnStats":True,"ratingsProvisional":False,
     "confidence":round(stats["ip"]/(stats["ip"]+30),3),
     "estimates":["velocity","pitchRepertoire","pitchMovement","role","hand","throwHand"]})
  # Build 5 starter candidates and 9 bullpen candidates before filling unused slots.
  starters=[p for p in ratedP if p["role"]=="SP"]
  bullpen=[p for p in ratedP if p["role"]!="SP"]
  ordered=[]
  for item in starters[:5]+bullpen[:9]+ratedP:
   if item not in ordered:ordered.append(item)
   if len(ordered)==14:break
  if len(ordered)<14:raise RuntimeError("Too few pitchers "+code)
  starting=bats[:9]
  team={"id":"kbo-"+code.lower(),"name":name,"short":short,"mark":mark,
        "logo":logo(code,mark,primary,accent),"color":primary,"accent":accent,
        "league":"kbo","division":"kbo","park":park,"season":2026,
        "tag":"2026公式成績に基づく査定",
        "description":"KBO公式英語版2026個人成績をCPBL換算式でゲーム能力化",
        "rosterStatus":"2026年公式成績から選出した16野手・14投手。守備位置・左右・背番号の一部は未確認。",
        "lineupDate":AS_OF,"startingOrder":[p["id"] for p in starting],
        "batters":bats,"pitchers":ordered,
        "statsPopulation":{"batters":len(all_bat),"pitchers":len(all_pit)}}
  teams.append(team)
  audit[code]={"club":name,"batters":[{"id":p["id"],"name":p["name"],"source":p["sourceUrl"]} for p in bats],
   "pitchers":[{"id":p["id"],"name":p["name"],"source":p["sourceUrl"]} for p in ordered]}
  print("BUILT",code,name,"candidates",len(all_bat),len(all_pit),"actual roster",len(bats),len(ordered),flush=True)
 document={"version":"kbo2026-official-10clubs-v1","season":2026,"asOf":AS_OF,
           "source":"https://eng.koreabaseball.com/Stats/BattingByTeams.aspx",
           "method":"CPBL percentile and league average priors; disclosed estimated hand and position",
           "referencePopulations":{"batters":len(ref_b),"pitchers":len(ref_p)},
           "baselines":base,"pitchingBaselines":pbase,"teams":teams}
 assert len(teams)==10
 assert sum(len(t["batters"])+len(t["pitchers"]) for t in teams)==300
 OUT.write_text("/* Game ratings derived from 2026 KBO public season results; see KBO_RATING_METHOD.md. */\nwindow.NightKBOData="+
   json.dumps(document,ensure_ascii=False,separators=(",",":"))+";\n",encoding="utf8")
 (ROOT/"data"/"kbo-selection-2026.json").write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding="utf8")
 print("PASS: 10 KBO clubs, 300 individually evaluated players, "+str(OUT.stat().st_size)+" bytes",flush=True)

if __name__=="__main__":
 parser=argparse.ArgumentParser()
 parser.add_argument("--capture",action="store_true",help="One-time 2026 public table snapshot, low-rate")
 args=parser.parse_args()
 if args.capture:
  if DATA.exists():raise RuntimeError("Snapshot exists; do not scrape repeatedly; use offline build")
  data=fetch_source()
 else:
  if not DATA.exists():raise RuntimeError("Missing frozen source; use --capture once")
  data=json.loads(DATA.read_text(encoding="utf8"))
 prepare(data)
