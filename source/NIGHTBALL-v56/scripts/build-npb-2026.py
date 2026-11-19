#!/usr/bin/env python3
"""Build 2026 NIGHTBALL NPB ratings from NPB.jp official season tables.
Uses published results as facts, does not copy the site's HTML or artwork.
Run with: python scripts/build-npb-2026.py
Requires requests, beautifulsoup4, lxml. Offline at runtime once generated.
"""
from __future__ import annotations
from collections import defaultdict
from datetime import date
from pathlib import Path
from html import escape
import json, math, re, time, unicodedata

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
YEAR = 2026
BASE = f"https://npb.jp/bis/{YEAR}/stats"
ROSTER_BASE = "https://npb.jp/bis/teams"
# The independent farm members are actual 2026 farm-league clubs.
# (league code, official name, short, original monogram, team colors, park, division)
TEAMS = [
 ("g","読売ジャイアンツ","巨人","G","#ec6415","#ffffff","tokyo-dome","central"),
 ("db","横浜DeNAベイスターズ","DeNA","DB","#006eae","#ffffff","tokyo-dome","central"),
 ("t","阪神タイガース","阪神","T","#f1c600","#1a1a1a","toyama","central"),
 ("c","広島東洋カープ","広島","C","#bf1231","#fff5f5","toyama","central"),
 ("d","中日ドラゴンズ","中日","D","#0754aa","#edfaff","tokyo-dome","central"),
 ("s","東京ヤクルトスワローズ","ヤクルト","YS","#1875a4","#f7f8ed","tokyo-dome","central"),
 ("h","福岡ソフトバンクホークス","ソフトバンク","H","#efc600","#151515","tokyo-dome","pacific"),
 ("f","北海道日本ハムファイターズ","日本ハム","F","#145a94","#fff6ef","tokyo-dome","pacific"),
 ("e","東北楽天ゴールデンイーグルス","楽天","E","#a50a39","#e9e5d7","toyama","pacific"),
 ("m","千葉ロッテマリーンズ","ロッテ","M","#202e3e","#f0f4f8","tokyo-dome","pacific"),
 ("b","オリックス・バファローズ","オリックス","B","#182e56","#d7b774","toyama","pacific"),
 ("l","埼玉西武ライオンズ","西武","L","#12335d","#e9e8cb","toyama","pacific"),
 ("a","オイシックス新潟アルビレックスBC","オイシックス","OX","#e96c24","#fff","toyama","farm-east"),
 ("v","ハヤテベンチャーズ静岡","ハヤテ","HV","#142f54","#f8d74b","toyama","farm-central"),
]
SESSION = requests.Session()
SESSION.headers.update({"User-Agent":"NIGHTBALL/1.0 (+https://github.com/tacurry0/bbg; research-grade 2026 data)"})
CACHE: dict[str,BeautifulSoup] = {}
def get(url):
    if url not in CACHE:
        last = None
        for attempt in range(3):
            try:
                r = SESSION.get(url, timeout=25)
                r.raise_for_status()
                r.encoding = "utf-8"
                soup = BeautifulSoup(r.text, "lxml")
                if not soup.select("table"): raise ValueError("No official table")
                CACHE[url] = soup
                time.sleep(.08)
                break
            except Exception as exc:
                last = exc
                time.sleep(.5 * (attempt + 1))
        else: raise RuntimeError(f"Could not fetch {url}: {last}")
    return CACHE[url]

def norm(v):
    return re.sub(r"[\s\u3000*＊^]", "", unicodedata.normalize("NFKC", str(v))).replace("﨑","崎").replace("髙","高").replace("濵","浜")
def num(v,default=0):
    st=re.sub(r"[,\s]","",str(v)).lstrip(".")
    try: return float(st)
    except ValueError: return default
def integer(v): return int(num(v))
def innings(s):
    s = re.sub(r"\s+","",str(s))
    m=re.match(r"^(\d+)(?:\.([012]))?$",s)
    if m: return int(m[1])+(int(m[2])/3 if m[2] else 0)
    return num(s)
def cap(v,lo=35,hi=98): return round(max(lo,min(hi,v)))
def percentile(value,values):
    if not values:return .5
    low=sum(v<value-1e-10 for v in values)
    tied=sum(abs(v-value)<1e-10 for v in values)
    return (low+.5*tied)/len(values)
def cols(tr): return [c.get_text(" ",strip=True) for c in tr.find_all(["th","td"],recursive=False)]
def table_records(url):
    soup=get(url)
    tables=soup.select("table.tablefix2")
    if not tables: raise RuntimeError(f"Missing official stat tables: {url}")
    t=tables[0]
    rows=t.select("tr")
    header=cols(rows[0])
    records=[]
    for tr in rows[1:]:
        v=cols(tr)
        if len(v)!=len(header):continue
        name=re.sub(r"^\s*[\*＊]\s*","",v[0]).strip()
        if not name or "選手" in name:continue
        obj=dict(zip(header,v))
        obj["name"]=norm(name)
        obj["displayName"]=name.replace("\u3000"," ")
        records.append(obj)
    if len(records)<12:raise RuntimeError(f"Unusually short stats page {url}: {len(records)}")
    return records
def defense_records(url):
    soup=get(url)
    by_name=defaultdict(list)
    sections=["1B","2B","3B","SS","OF","C","P"]
    tables=soup.select("table.tablefix2")
    for i,t in enumerate(tables):
        pos=sections[i] if i<len(sections) else "DH"
        rows=t.select("tr")
        if not rows:continue
        header=cols(rows[0])
        for tr in rows[1:]:
            v=cols(tr)
            if len(v)!=len(header):continue
            obj=dict(zip(header,v))
            key=norm(v[0])
            if not key or integer(obj.get("試合","0"))==0:continue
            by_name[key].append({
                "pos":pos,"games":integer(obj.get("試合","0")),
                "chances":integer(obj.get("刺殺","0"))+integer(obj.get("補殺","0"))+integer(obj.get("失策","0")),
                "assists":integer(obj.get("補殺","0")),"errors":integer(obj.get("失策","0")),
                "fieldPct":num(obj.get("守備率",0)),
                "caughtStealing":num(obj.get("盗塁阻止率",0)) if pos=="C" else None
            })
    return by_name
def roster_records(code):
    url=f"{ROSTER_BASE}/rst_{code}.html"
    if code in ("a","v"):return {}
    soup=get(url)
    out={}
    for t in soup.select("table.rosterlisttbl"):
        pos=None
        for tr in t.select("tr"):
            v=cols(tr)
            if not v:continue
            if v[0]=="No.":
                pos=next((p for p in ("投手","捕手","内野手","外野手") if p in " ".join(v[:3])),None)
                continue
            if pos is None or len(v)<7 or not re.match(r"^\d{1,3}$",v[0].strip()):continue
            name=norm(v[1])
            out[name]={"no":v[0].strip(),"name":v[1].replace("\u3000"," "),"positionGroup":pos,
                "throwHand":"L" if v[5]=="左" else "R",
                "hand":"L" if v[6]=="左" else "S" if v[6]=="両" else "R",
                "rosterSource":url}
    if len(out)<70:raise RuntimeError(f"Incomplete team roster: {code} ({len(out)})")
    return out

def better(season, farm):
    """Select official 1st or 2nd tier season line, never concatenate the two."""
    if season and (integer(season.get("打席",season.get("登板","0")))>=60):return season,"NPB一軍"
    if farm and (integer(farm.get("打席",farm.get("登板","0")))>=25):return farm,"NPBファーム"
    if season and farm:
        key="打席" if "打席" in season else "投球回"
        return (season,"NPB一軍") if num(season.get(key))>=num(farm.get(key)) else (farm,"NPBファーム")
    return (season,"NPB一軍") if season else (farm,"NPBファーム")

def batter(line):
    c=lambda k:integer(line.get(k,0))
    s={"games":c("試合"),"pa":c("打席"),"ab":c("打数"),"h":c("安打"),"doubles":c("二塁打"),
       "triples":c("三塁打"),"hr":c("本塁打"),"tb":c("塁打"),"so":c("三振"),"sb":c("盗塁"),
       "cs":c("盗塁刺"),"bb":c("四球"),"hbp":c("死球"),"rbi":c("打点"),
       "avg":num(line.get("打率")),"obp":num(line.get("出塁率")),"slg":num(line.get("長打率"))}
    s["ops"]=round(s["obp"]+s["slg"],3)
    return s

def pitcher(line):
    c=lambda k:integer(line.get(k,0))
    s={"games":c("登板"),"gs":0,"era":num(line.get("防御率")),"h":c("安打"),"hr":c("本塁打"),
       "bb":c("四球"),"ibb":c("故意四"),"hbp":c("死球"),"k":c("三振"),
       "er":c("自責点"),"bf":c("打者"),"saves":c("セーブ"),"holds":c("ホールド")}
    s["ipText"]=str(line.get("投球回","0")).strip();s["ip"]=innings(s["ipText"])
    for key,src in (("k9","k"),("bb9","bb"),("hr9","hr")):s[key]=s[src]*9/max(1/3,s["ip"])
    return s

def originalLogo(code,monogram,bg,fg):
    name=f"npb-{code}.svg"
    xml=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
 <circle cx="80" cy="80" r="77" fill="{bg}" stroke="#fdfdfd" stroke-width="5"/>
 <circle cx="80" cy="80" r="65" fill="none" stroke="{fg}" stroke-width="2" opacity=".8"/>
 <path d="M27 47 Q80 8 133 47" stroke="{fg}" stroke-width="4" fill="none" opacity=".2"/>
 <text x="80" y="96" fill="{fg}" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="{47 if len(monogram)>1 else 67}">{escape(monogram)}</text>
 <text x="80" y="122" fill="{fg}" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="10" letter-spacing="2">NIGHTBALL</text>
</svg>'''
    folder=ROOT/"dist"/"assets"/"npb"
    folder.mkdir(parents=True,exist_ok=True)
    (folder/name).write_text(xml)
    return f"./assets/npb/{name}"

raw={}
for code,name,short,mono,color,accent,park,div in TEAMS:
    print("SOURCING",code,name,flush=True)
    haveFirst=code not in ("a","v")
    out={}
    for level in ([1,2] if haveFirst else [2]):
        for kind in ("b","p","f"):
            url=f"{BASE}/id{kind}{level}_{code}.html"
            out[(kind,level)]=(defense_records(url) if kind=="f" else table_records(url))
    out["roster"]=roster_records(code)
    raw[code]=out

# All 12 teams provide first-team reference populations. Minor league references
# are kept separate to avoid comparing farm batting averages directly with MLB-level
# (NPB first-team) production.
allBatters={1:[],2:[]};allPitchers={1:[],2:[]}
for code,item in raw.items():
 for level in (1,2):
    for row in item.get(("b",level),[]):
        p=batter(row)
        if p["ab"]>=20:allBatters[level].append(p)
    for row in item.get(("p",level),[]):
        p=pitcher(row)
        if p["ip"]>=5:allPitchers[level].append(p)

def weighted_base_b(pop):
    den=lambda k:max(1,sum(p[k] for p in pop))
    return {
     "avg":sum(p["h"] for p in pop)/den("ab"),
     "k":sum(p["so"] for p in pop)/den("pa"),
     "iso":sum(p["tb"]-p["h"] for p in pop)/den("ab"),
     "hr":sum(p["hr"] for p in pop)/den("ab"),
     "attempt":sum(p["sb"]+p["cs"] for p in pop)/den("pa"),
     "triples":sum(p["triples"] for p in pop)/den("ab")}
def weighted_base_p(pop):
    den=max(1,sum(p["ip"] for p in pop))
    return {k:9*sum(p[src] for p in pop)/den for k,src in (
        ("k9","k"),("bb9","bb"),("hr9","hr"),("era","er"))}

bases={lv:weighted_base_b(allBatters[lv]) for lv in (1,2)}
pbases={lv:weighted_base_p(allPitchers[lv]) for lv in (1,2)}
def bmetrics(p,lv):
    b=bases[lv]
    return {"avg":(p["h"]+120*b["avg"])/(p["ab"]+120),
            "avoidK":-(p["so"]+100*b["k"])/(p["pa"]+100),
            "iso":(p["tb"]-p["h"]+100*b["iso"])/(p["ab"]+100),
            "hr":(p["hr"]+100*b["hr"])/(p["ab"]+100),
            "attempt":(p["sb"]+p["cs"]+80*b["attempt"])/(p["pa"]+80),
            "triples":(p["triples"]+150*b["triples"])/(p["ab"]+150)}
def pmetrics(p,lv):
    base=pbases[lv]
    return {k:(p[v]+30*base[k]/9)/(p["ip"]+30)*9 for k,v in (
      ("k9","k"),("bb9","bb"),("hr9","hr"),("era","er"))}
ref_b={lv:[bmetrics(p,lv) for p in allBatters[lv] if p["pa"]>=100] for lv in (1,2)}
ref_p={lv:[pmetrics(p,lv) for p in allPitchers[lv] if p["ip"]>=20] for lv in (1,2)}
def rank(m,key,ref,reverse=False):
    sign=-1 if reverse else 1
    return percentile(m[key]*sign,[r[key]*sign for r in ref])

field_prior={"C":74,"1B":66,"2B":74,"3B":70,"SS":78,"LF":66,"CF":74,"RF":68,"DH":52}
arm_prior={"C":81,"1B":61,"2B":68,"3B":78,"SS":79,"LF":66,"CF":74,"RF":79,"DH":62}
speedRatios={"fast":1,"slider":.9,"curve":.82,"fork":.9,"change":.88,"cutter":.95}
def trait_b(contact,power,run,field):
    return ("韋駄天" if run>=90 and run>power else "長距離砲" if power>=85 else
            "巧打" if contact>=90 else "守備職人" if field>=90 else
            "韋駄天" if run>=85 else "巧打" if contact>=80 else
            "強打" if power>=70 else "俊足巧打" if run>=75 else "バランス")
def position(evidence,group,idx):
    # NPB fielding records: OF is not split by LF/CF/RF.
    # Those three labels are gameplay positions, not verified official positions.
    if evidence:
        natural=max(evidence,key=lambda e:e["games"])["pos"]
        if natural=="OF":return ["LF","CF","RF"][idx%3]
        if natural!="P":return natural
    if group=="捕手":return "C"
    if group=="外野手":return ["LF","CF","RF"][idx%3]
    return ["1B","2B","3B","SS"][idx%4]
def rating_b(p,lv,defenses,pos):
    m=bmetrics(p,lv);refs=ref_b[lv]
    contact=cap(40+55*(.72*rank(m,"avg",refs)+.28*rank(m,"avoidK",refs)))
    power=cap(35+220*m["iso"]+650*m["hr"])
    success=(p["sb"]+3)/(p["sb"]+p["cs"]+4)
    run=cap(38+60*(.75*rank(m,"attempt",refs)+.25*rank(m,"triples",refs))+4*(success-.7))
    ev=max((e for e in defenses if e["pos"] in (pos,"OF")),key=lambda x:x["games"],default=None)
    field=field_prior[pos]
    if ev:
        reliability=ev["games"]/(ev["games"]+45)
        field=cap(field+(ev["fieldPct"]-.975)*145*reliability+min(4,ev["games"]/25),35,98)
    arm=arm_prior[pos]
    if pos=="C" and ev and ev["caughtStealing"] and ev["games"]>=20:
        arm=max(arm,cap(66+47*ev["caughtStealing"]))
    if pos in ("LF","CF","RF") and ev:
        arm=cap(arm+min(6,max(0,ev["assists"]-2)))
    # NPB farm stats do not imply first-team-equivalent skills.
    if lv==2:contact=cap(contact-7);power=cap(power-6);run=cap(run-3);field=cap(field-3)
    return {"contact":contact,"power":power,"run":run,"field":field,"arm":arm,
            "trait":trait_b(contact,power,run,field)}
def rating_p(p,lv):
    m=pmetrics(p,lv);refs=ref_p[lv]
    control=cap(35+63*rank(m,"bb9",refs,True))
    movement=cap(40+57*(.60*rank(m,"k9",refs)+.25*rank(m,"hr9",refs,True)+.15*rank(m,"era",refs,True)))
    stamina=cap(26+9*p["ip"]/max(1,p["games"])+.05*p["ip"],40,98)
    # The NPB seasonal pitching totals do NOT contain radar-gun readings or pitch
    # classifications. Distinct game estimates are disclosed as estimates.
    velocity=round(max(137,min(154,144+(.95*(p["k9"]-7))+min(2,stamina/40))))
    if lv==2:
        control=cap(control-7);movement=cap(movement-7);velocity=max(136,velocity-2)
    role="CP" if p["saves"]>=7 else "SP" if p["ip"]/max(1,p["games"])>=3.2 else "RP"
    if role=="SP":pitchTypes=["fast","slider","curve","change"]
    elif role=="CP":pitchTypes=["fast","slider","fork"]
    else:pitchTypes=["fast","slider","change"]
    return {"velocity":velocity,"control":control,"movement":movement,"stamina":stamina,
            "role":role,"roleEstimated":True,"pitchingEstimated":True,"speedEstimated":True,
            "pitches":pitchTypes,
            "pitchDetails":{k:{"speed":round(velocity*speedRatios[k],1),"breakScale":1,
                "speedBasis":"ゲーム用推定"} for k in pitchTypes},
            "velocityEvidence":{"fastAvg":velocity,"fastAvgEstimated":True,
                                "repertoireEstimated":True,"speedBasis":"ゲーム用推定。公式年次成績には球速情報なし"},
            "trait":"精密制球" if control>=85 else "奪三振型" if movement>=85 else "先発型" if role=="SP" else "速球派" }

def pick_batters(pool):
    # Ensure a usable starting lineup with a catcher and all infield slots.
    ordered=sorted(pool,key=lambda p:(p["stats"]["pa"],p["stats"]["h"]),reverse=True)
    selected=[]
    for need in ("C","1B","2B","3B","SS","LF","CF","RF"):
        found=next((p for p in ordered if p["pos"]==need and p not in selected),None)
        if found:selected.append(found)
    for p in ordered:
        if p not in selected:selected.append(p)
        if len(selected)==16:break
    if len(selected)<16:raise RuntimeError(f"Not enough position players ({len(selected)})")
    starting=[]
    for need in ("C","1B","2B","3B","SS","LF","CF","RF"):
        p=next((p for p in selected if p["pos"]==need and p not in starting),None)
        if p:starting.append(p)
    for p in selected:
        if p not in starting:starting.append(p)
        if len(starting)>=9:break
    return selected[:16],starting[:9]

teams=[]
for code,name,short,mono,color,accent,park,div in TEAMS:
    x=raw[code];roster=x["roster"]
    first=(code not in ("a","v"))
    def pair(kind):
        a={r["name"]:r for r in x.get((kind,1),[])}
        b={r["name"]:r for r in x.get((kind,2),[])}
        return a,b
    b1,b2=pair("b");p1,p2=pair("p")
    f1=x.get(("f",1),{});f2=x.get(("f",2),{})
    batter_pool=[];pitcher_pool=[]
    allNames=set(b1)|set(b2)|set(p1)|set(p2)
    for key in allNames:
        evidence=roster.get(key,{})
        group=evidence.get("positionGroup")
        # Remove unverified exchanged players from the 12-club 2026 selection;
        # a player must be in the actual team roster snapshot.
        if first and not evidence:continue
        hit=better(b1.get(key),b2.get(key)) if (key in b1 or key in b2) else (None,None)
        pit=better(p1.get(key),p2.get(key)) if (key in p1 or key in p2) else (None,None)
        isPitcher=(group=="投手") if group else (pit[0] is not None and (
              hit[0] is None or integer(hit[0].get("打席",0))<20))
        if isPitcher:
            if pit[0] is None:continue
            line,level=pit;lv=1 if level=="NPB一軍" else 2;st=pitcher(line)
            if st["ip"]<=0:continue
            rating=rating_p(st,lv)
            pitcher_pool.append({
                "name":evidence.get("name",line["displayName"]),"no":evidence.get("no","?"),
                "hand":evidence.get("throwHand","L" if "*" in str(line["displayName"]) else "R"),
                "throwHand":evidence.get("throwHand","R"),"pos":"P","season":YEAR,
                "stats":st,**rating,"statsLevel":level,"sourceUrl":f"{BASE}/idp{lv}_{code}.html",
                "identityUrl":evidence.get("rosterSource",f"{BASE}/idp{lv}_{code}.html"),
                "statsPeriod":["2026-03","2026-10"],"ratingsBasedOnStats":True,
                "ratingsProvisional":False,"confidence":round(st["ip"]/(st["ip"]+30),3),
                "estimates":["velocity","pitchRepertoire","pitchMovement","role"],
                "roleSource":"登板・投球回・セーブ数からの推定",
            })
        else:
            if hit[0] is None:continue
            line,level=hit;lv=1 if level=="NPB一軍" else 2;st=batter(line)
            if st["pa"]<10:continue
            defs=f1.get(key,[]) if lv==1 else f2.get(key,[])
            if not defs:defs=f1.get(key,[])+f2.get(key,[])
            pos=position(defs,group,len(batter_pool))
            ab=rating_b(st,lv,defs,pos)
            player={
                "name":evidence.get("name",line["displayName"]),"no":evidence.get("no","?"),
                "hand":evidence.get("hand","L" if "*" in str(line["displayName"]) else "R"),
                "throwHand":evidence.get("throwHand","R"),"pos":pos,
                "positions":sorted(set([pos]+[e["pos"] for e in defs if e["pos"]!="P"])),
                "positionEstimated":pos in ("LF","RF","CF") or not defs,
                "season":YEAR,"stats":st,**ab,"statsLevel":level,
                "sourceUrl":f"{BASE}/idb{lv}_{code}.html",
                "identityUrl":evidence.get("rosterSource",f"{BASE}/idb{lv}_{code}.html"),
                "defenseSource":f"{BASE}/idf{lv}_{code}.html",
                "defenseEvidence":max(defs,key=lambda d:d["games"],default={}),
                "statsPeriod":["2026-03","2026-10"],
                "ratingsBasedOnStats":True,"ratingsProvisional":False,
                "confidence":round(st["pa"]/(st["pa"]+120),3),
                "estimates":["run","field","arm"]+(["position"] if pos in ("LF","CF","RF") else []),
            }
            batter_pool.append(player)
    bats,starters=pick_batters(batter_pool)
    # Prefer starters (IP/G), closers (saves), then innings volume, not arbitrary
    # player position order. Preserve relief specialists in the bench selection.
    pitcher_pool.sort(key=lambda p:(p["stats"]["ip"]+p["stats"]["saves"]*5, p["movement"]),reverse=True)
    startersP=[p for p in pitcher_pool if p["role"]=="SP"]
    reliefP=[p for p in pitcher_pool if p["role"]!="SP"]
    pitchers=[]
    for p in startersP[:5]+reliefP[:9]+pitcher_pool:
        if p not in pitchers:pitchers.append(p)
        if len(pitchers)==14:break
    if len(pitchers)<14:raise RuntimeError(f"{code}: only {len(pitchers)} pitchers")
    # For positional accuracy start all eight fielding locations plus a DH slot.
    for i,p in enumerate(bats):p["id"]=f"npb-{code}-b{i+1}"
    for i,p in enumerate(pitchers):p["id"]=f"npb-{code}-p{i+1}"
    startids=[p["id"] for p in starters]
    if len(startids)!=9 or len(set(startids))!=9:raise RuntimeError(f"{code}: invalid starters")
    labels={"central":"セントラル・リーグ","pacific":"パシフィック・リーグ",
           "farm-east":"ファーム東地区","farm-central":"ファーム中地区"}
    club={"id":"npb-"+code,"name":name,"short":short,"mark":mono,
          "logo":originalLogo(code,mono,color,accent),"color":color,"accent":accent,
          "league":"npb","division":div,"park":park,"tag":"2026公式成績から査定",
          "description":"2026年公式個人成績をCPBL基準の換算式でゲーム能力に反映",
          "rosterStatus":"2026年シーズン成績から16野手・14投手を選出。現役登録・故障状況とは異なります。",
          "lineupDate":"2026-11-19","season":YEAR,"batters":bats,"pitchers":pitchers,
          "startingOrder":startids,"statsPopulation":{"batters":len(batter_pool),"pitchers":len(pitcher_pool)}}
    if not first:club["farmOnly"]=True
    teams.append(club)
    print(f"BUILT {code} {short}: 16 batters, 14 pitchers; pool {len(batter_pool)}/{len(pitcher_pool)}",flush=True)

metadata={"season":YEAR,"asOf":date.today().isoformat(),
          "version":"npb2026-official-14-clubs-v1",
          "source":"https://npb.jp/bis/2026/stats/",
          "farmSource":"https://npb.jp/bis/2026/stats/index_farm.html",
          "method":"CPBL adjusted percentile/priors; first-team and farm baselines separate; farm penalty explicitly estimated",
          "referencePopulations":{"batters1":len(ref_b[1]),"batters2":len(ref_b[2]),
                                  "pitchers1":len(ref_p[1]),"pitchers2":len(ref_p[2])},
          "baselines":{"first":bases[1],"farm":bases[2]},
          "pitcherBaselines":{"first":pbases[1],"farm":pbases[2]},
          "teams":teams}
assert len(teams)==14 and sum(len(t["batters"])+len(t["pitchers"]) for t in teams)==420
data=ROOT/"dist"/"npb-data.js"
data.write_text("/* Official NPB 2026 performance converted into independent NIGHTBALL ratings; see NPB_RATING_METHOD.md. */\nwindow.NightNPBData="+json.dumps(metadata,ensure_ascii=False,separators=(",",":"))+";\n",encoding="utf8")
# A source-only manifest is retained for scientific audit without reusing HTML.
manifest={"retrieved":date.today().isoformat(),"teams":{}}
for t in teams:
 manifest["teams"][t["id"]]={"name":t["name"],"batters":[p["name"] for p in t["batters"]],
                             "pitchers":[p["name"] for p in t["pitchers"]],
                             "sources":sorted(set(p["sourceUrl"] for p in t["batters"]+t["pitchers"]))}
(ROOT/"data"/"npb-selection-2026.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf8")
print("SUCCESS: 14 clubs, 420 individually sourced season ratings",data.stat().st_size,flush=True)
