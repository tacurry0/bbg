# Player identity sources — 2026 edition

Checked 2026-11-04 (Japan). The game contains 9 selected hitters and 3 selected pitchers per club, not the complete registered roster.

Names, jersey numbers and batting/throwing hands are factual identity data. Defensive positions and default batting orders follow the dated 2026 starting-lineup records below; an assigned game position can differ from the position listed in a player directory. Injuries and daily first-team registrations are not simulated.

Player ratings are now derived from the sourced 2026 records. See RATING_METHOD.md for formulas, periods and the remaining estimates. Pitch names follow reported repertoires; unmeasured movement and some pitch speeds remain game estimates.

Starting-lineup index supplied by the user: https://cpbldatabase.jimdofree.com/全試合スタメン一覧/

## 中信兄弟

Default lineup: 2026-10-26.

Source: https://drive.google.com/file/d/1FdPbp1H1cxkMg3-ehndUM26UfZ9gNhAj/view

Batters: 張仁瑋 / 岳東華 / 陳俊秀 / 王威晨 / 宋晟睿 / 詹子賢 / 江坤宇 / 高宇杰 / 黃韋盛

Pitchers: 羅戈 / 德保拉 / 鄭浩均

## 味全ドラゴンズ

Default lineup: 2026-03-29.

Source: https://drive.google.com/file/d/1Gqgs1N9p6YytEqSFv1KcwRaDaqg4zRQJ/view

Batters: 李凱威 / 劉基鴻 / 吉力吉撈．鞏冠 / 朱育賢 / 陳子豪 / 郭天信 / 劉俊緯 / 蔣少宏 / 曾聖安

Pitchers: 蔣銲 / 梅賽鍶 / 鋼龍

## 統一ライオンズ

Default lineup: 2026-10-12.

Source: https://drive.google.com/file/d/11vh_w_xgzxB6UWdKC3-VbJzeTlC-6CiF/view

Batters: 邱智呈 / 林佳緯 / 陳傑憲 / 林培緯 / 潘傑楷 / 林子豪 / 陳聖平 / 陳重羽 / 林泓弦

Pitchers: 布雷克 / 林詔恩 / 喬登

## 富邦ガーディアンズ

Default lineup: 2026-05-21.

Source: https://drive.google.com/file/d/1MIl8xrnLNoQ3OrSjdGDyqqUkVmwAMt68/view

Batters: 申皓瑋 / 孔念恩 / 張育成 / 范國宸 / 王苡丞 / 林澤彬 / 王念好 / 戴培峰 / 池恩齊

Pitchers: 李東洺 / 魔力藍 / 鈴木駿輔

## 樂天モンキーズ

Default lineup: 2026-09-02.

Source: https://drive.google.com/file/d/1evbDu9A9hjyfbpWeJ2fgKnnzA80aUP-1/view

Batters: 陳晨威 / 林立 / 威克 / 林泓育 / 李勛傑 / 梁家榮 / 林子偉 / 宋嘉翔 / 馬傑森

Pitchers: 威能帝 / 林子崴 / 曾家輝

## 台鋼ホークス

Default lineup: 2026-04-06.

Source: https://drive.google.com/file/d/1LpqWD90AEpOLZZWptxDV8nCu-E05vgPF/view

Batters: 王博玄 / 曾子祐 / 吳念庭 / 魔鷹 / 王柏融 / 陳文杰 / 杜家明 / 劉時豪 / 曾昱磬

Pitchers: 後勁 / 江承諺 / 艾速特

## Jersey numbers and handedness

Cross-checked against the 2026 CPBL roster listings:

- https://tw.sports.yahoo.com/cpbl/teams/中信/roster/
- https://tw.sports.yahoo.com/cpbl/teams/味全/roster/
- https://tw.sports.yahoo.com/cpbl/teams/統一/roster/
- https://tw.sports.yahoo.com/cpbl/teams/富邦/roster/
- https://tw.sports.yahoo.com/cpbl/teams/樂天/roster/
- https://tw.sports.yahoo.com/cpbl/teams/台鋼/roster/

Official supplemental checks:

- https://cpbl.com.tw/team/person?acnt=0000006749 (魔力藍, #44, L/L)
- https://stats.cpbl.com.tw/players/0000007228 (鈴木駿輔, #69, R/R)
- https://stats.cpbl.com.tw/players/0000006739 (李東洺, #66, R/L)
- https://cpbl.com.tw/team/person?Acnt=0000007304 (曾聖安, #50, R/L)

## Save migration

Existing club IDs and batter/pitcher IDs are retained. Loading a saved game resolves lineup IDs to current player records, preserving the saved order, score, occupied bases and statistical totals. Fielding and batter name labels are refreshed too.

## V15 / 30-player squads
Each club selects16batters and14pitchers from its2026 season roster. This is a game squad, not a live first-team registration list. Original9batters/3pitchers remain first, with stableIDs and unchanged numerical ratings. All108 additions have primary identity evidence in data/roster-expansion-evidence-2026.json. All180 ratings use the frozenLiveTrend stat inputs. Of66 addedpitchers,33 have primary measuredfastball averages; the other33 are marked speedEstimated. Unverified repertoires are marked pitchingEstimated. SP/RP/CP roles are derived from appearances,starts,and saves.
