#!/usr/bin/env python3
"""Build the reserve pool using the same player-rating formulas as the official APBC teams."""
import contextlib
import io
import json
from pathlib import Path
import runpy

ROOT = Path(__file__).resolve().parents[1]
with contextlib.redirect_stdout(io.StringIO()):
    reference = runpy.run_path(str(ROOT / "scripts/build-ratings.py"))
cap, brank, prank = (reference[key] for key in ("cap", "brank", "prank"))
bmetrics, pmetrics = (reference[key] for key in ("bmetrics", "pmetrics"))
field_prior, arm_prior = (reference[key] for key in ("field_prior", "arm_prior"))
ratios = reference["speed_ratios"]
raw = json.loads((ROOT / "data/apbc-selection-2026.json").read_text())
rosters = reference["records"]
korea_roster_url = "https://www.japan-baseball.jp/jp/games/apbc2026/player_kor.html"

def rate_pitcher(player, stats):
    ip = stats["ip"]
    for rate, stat in (("k9", "k"), ("bb9", "bb"), ("hr9", "hr")):
        stats[rate] = stats[stat] * 9 / ip
    stats["whip"] = (stats["h"] + stats["bb"]) / ip
    measure = pmetrics(stats)
    control = cap(35 + 63 * prank(measure, "bb9", True))
    movement = cap(40 + 57 * (
        .60 * prank(measure, "k9") + .25 * prank(measure, "hr9", True) + .15 * prank(measure, "era", True)
    ))
    average_ip = ip / stats["games"]
    stamina = cap(26 + 9 * average_ip + .05 * ip, 40)
    speeds = player.get("pitchSpeeds")
    speed = speeds["fast"] if speeds else 143
    repertoire = list(speeds) if speeds else ["fast", "slider", "curve", "change" if player["hand"] == "L" else "fork"]
    details = {}
    for pitch in repertoire:
        details[pitch] = {
            "speed": round(speeds[pitch] if speeds else speed * ratios[pitch], 1),
            "breakScale": 1,
            "speedBasis": "公開球種別平均" if speeds else "ゲーム用推定",
        }
        if label := player.get("pitchLabels", {}).get(pitch):
            details[pitch]["label"] = label
    starts = stats.get("gs")
    is_starter = starts >= stats["games"] / 2 if starts is not None else average_ip >= 3
    role = "SP" if is_starter else "CP" if stats.get("saves", 0) >= 5 else "RP"
    trait = ("精密制球" if control >= 85 else "奪三振型" if movement >= 85 else
             "速球派" if speed >= 148 else "先発型" if role == "SP" else "技巧派")
    basis = "2026年の公開球種別平均" if speeds else "ゲーム用推定（球速・球種の実測未確認）"
    evidence = {"fastAvg": speed, "fastAvgEstimated": not speeds, "speedBasis": basis,
                "pitches": repertoire, "repertoireEstimated": not speeds}
    if speeds:
        evidence.update(fastMax=player["fastMax"], speedSource=player["speedUrl"], repertoireSource=player["speedUrl"])
    return dict(velocity=round(speed), control=control, movement=movement, stamina=stamina, trait=trait,
                confidence=round(ip / (ip + 30), 3), role=role, pitches=repertoire, pitchDetails=details,
                velocityEvidence=evidence, speedEstimated=not speeds, pitchingEstimated=not speeds, roleEstimated=True,
                estimates=["pitchMovement"] + ([] if speeds else ["velocity", "pitchRepertoire"]))

def rate_batter(player, stats):
    stats["ops"] = round(stats["obp"] + stats["slg"], 3)
    measure = bmetrics(stats)
    contact = cap(40 + 55 * (.72 * brank(measure, "avg") + .28 * brank(measure, "avoidK")))
    power = cap(35 + 220 * measure["iso"] + 650 * measure["hr"])
    success = (stats["sb"] + 3) / (stats["sb"] + stats["cs"] + 4)
    run = cap(38 + 60 * (.75 * brank(measure, "attempt") + .25 * brank(measure, "triples")) + 4 * (success - .7))
    pos = player["pos"]
    trait = ("韋駄天" if run >= 85 and run > power else "長距離砲" if power >= 85 else
             "巧打" if contact >= 80 else "強打" if power >= 70 else "俊足巧打" if run >= 75 else "バランス")
    return dict(contact=contact, power=power, run=run, field=cap(field_prior[pos] + .08 * (run - 65)),
                arm=arm_prior[pos], trait=trait, estimates=["field", "arm"],
                confidence=round(stats["pa"] / (stats["pa"] + 120), 3))

def candidate(club_id, group, player):
    previous = rosters.get(player.get("existingClub"), {}).get(player["name"])
    if previous:
        ratings = dict(previous)
        stats = previous["stats"]
        source = previous["sourceUrl"]
        period = ["2026-03-28", "2026-10-06"]
        level = "CPBL一軍"
    else:
        stats = dict(player["stats"])
        ratings = (rate_pitcher if player["pos"] == "P" else rate_batter)(player, stats)
        source = player["statsUrl"]
        period = "2026シーズン終了"
        level = player["statsLevel"]
    identity = player.get("identityUrl", source if not previous else group["selectionSource"])
    selection_source = player.get("selectionSource", group["selectionSource"])
    note = player.get("selectionNote", "APBC出場資格を満たす選外選手")
    if note == "年齢条件を満たすゲーム独自候補":
        selection_source = identity
    ratings.update(
        id=f"{club_id}-reserve-{player['key']}", name=player["name"], nativeName=player.get("nativeName", player["name"]),
        no="—", pos=player["pos"], hand=player["hand"], throwHand=player.get("throwHand", player["hand"]),
        positions=[player["pos"], *player.get("positions", [])],
        club=player["club"], season=2026, statsLevel=level, stats=stats, statsPeriod=period, sourceUrl=source,
        identityUrl=identity, selectionSource=selection_source, selectionNote=note, competition="apbc2026",
        placementNote=note + "。代表背番号は未割当。",
        statsNotes=["詳細な守備位置が未確認の場合はゲーム内の守備位置を割り当て。"] if player["pos"] not in ("P", "C") else [],
        ratingsProvisional=False, ratingsBasedOnStats=True, retrieved=raw["asOf"], representativeCandidate=True,
    )
    for key in ("fieldingAppearances", "fieldingSource"):
        if key in player:
            ratings[key] = player[key]
    return ratings

for update in raw["officialOverrides"]["apbc-korea"].values():
    update.update(identityUrl=korea_roster_url, numberBasis="侍ジャパン公式 APBC2026 大会背番号")

pools = {club_id: [candidate(club_id, group, p) for p in group["players"]] for club_id, group in raw["candidates"].items()}
assignments = {
    "NightAPBCCandidates": pools,
    "NightAPBCOfficialExclusions": raw["officialExclusions"],
    "NightAPBCOfficialOverrides": raw["officialOverrides"],
}
output = "/* Generated by scripts/build-apbc-selection.py from 2026 selection and season data. */\n"
for name, value in assignments.items():
    output += f"window.{name} = {json.dumps(value, ensure_ascii=False, separators=(',', ':'))};\n"
(ROOT / "dist/apbc-candidates.js").write_text(output)
for team, players in pools.items():
    print(team, len(players), "candidates")
