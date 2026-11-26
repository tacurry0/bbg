#!/usr/bin/env python3
"""Aggregate 2026 NPB regular-season pitch-by-pitch archive locally.
Usage: python scripts/collect-npb-pitching.py /path/to/npb-data
Source: https://github.com/wocchi09/npb-data (Sports Navi), aggregate facts only.
"""
import json, sys
from pathlib import Path
from collections import defaultdict, Counter
from statistics import mean
archive=Path(sys.argv[1])
out=Path(__file__).resolve().parents[1]/"data"/"npb-pitch-tracking-2026.json"
groups=defaultdict(lambda: {"speeds": [], "count":0})
players={}
games=set()
errors=[]
for path in sorted((archive/"data"/"2026").glob("*/*/*.json")):
    if not path.stem.isdigit(): continue
    try:
        g=json.loads(path.read_text(encoding="utf-8"))
        if g.get("game_type")!="公式戦": continue
        gid=str(g.get("game_id") or path.stem)
        if gid in games: continue
        if not isinstance(g.get("atbats"),list): raise ValueError("missing atbats")
        games.add(gid)
        for a in g["atbats"]:
            if a.get("valid") is False: continue
            p=a.get("pitcher") or {}
            pid=str(p.get("player_id") or "")
            name=p.get("name")
            team=a.get("fielding_team") or (g.get("home") if a.get("top_bottom")=="表" else g.get("away"))
            if not pid or not name or not team: continue
            players[(pid,team)]={"name":name,"hand":p.get("hand"),"no":p.get("number")}
            seen=set()
            for ball in a.get("pitches",[]):
                typ=ball.get("type")
                if not typ: continue
                n=ball.get("no")
                if n is not None and n in seen: continue
                if n is not None: seen.add(n)
                x=groups[(pid,team,typ)]
                x["count"]+=1
                speed=ball.get("speed_kmh")
                if isinstance(speed,(int,float)) and 50<=speed<=180: x["speeds"].append(speed)
    except (ValueError,TypeError,OSError) as e:
        errors.append({"path":str(path.relative_to(archive)),"error":str(e)})
if not games or not groups: raise SystemExit("No valid 2026 regular-season data; refusing to overwrite")
totals=Counter()
for (pid,team,typ),v in groups.items(): totals[pid,team]+=v["count"]
rows=[]
for (pid,team,typ),v in sorted(groups.items()):
    speeds=v["speeds"]
    rows.append({"league":"NPB","season":2026,"sourceId":pid,"team":team,**players[pid,team],"pitchOriginal":typ,"pitches":v["count"],"speedSamples":len(speeds),"avgKmh":round(mean(speeds),2) if speeds else None,"maxKmh":max(speeds) if speeds else None,"usagePct":round(100*v["count"]/totals[pid,team],2)})
out.write_text(json.dumps({"season":2026,"source":"https://github.com/wocchi09/npb-data","scope":"archived regular-season games; excludes postseason","games":len(games),"pitcherTeamRecords":len(players),"observations":rows,"errors":errors},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(f"games={len(games)} pitcher/team records={len(players)} pitch rows={len(rows)} errors={len(errors)}")
