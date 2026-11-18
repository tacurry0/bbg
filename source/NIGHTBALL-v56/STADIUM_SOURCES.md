# Stadium dimensions (2026-11-05)

The six clubs use their current principal home stadium; IDs remain stable for old saves. Taipei Dome remains available as an additional venue. Distances are published LF / CF / RF foul-pole/center measurements, in feet. 1 ft = 0.3048 m; internal metric values round to 0.01 m; UI rounds to 0.1 m. The same interpolated fence function drives rendering and home-run detection. Unpublished intermediate wall contours are interpolated rather than asserted to be a survey of the stadium. The game uses stylized 3D models of each venue.

| Club | Stadium | LF / CF / RF (ft) | Source |
|---|---|---|---|
| 中信兄弟 | 臺中洲際棒球場 | 325 / 400 / 325 | https://cpbl.com.tw/field/cont?SId=0M062368578901208901 |
| 味全ドラゴンズ | 天母棒球場 | 325 / 400 / 325 | https://cpbl.com.tw/field/cont?sid=0M061623807974766861 |
| 統一ライオンズ | 臺南亞太成棒主球場 | 330 / 400 / 330 | https://www.uni-lions.com.tw/about/field |
| 富邦ガーディアンズ | 新莊棒球場 | 325 / 400 / 325 | https://www.sa.gov.tw/Resource/Other/f1389930582611.pdf |
| 樂天モンキーズ | 樂天桃園棒球場 | 330 / 400 / 330 | https://www.dst.tycg.gov.tw/cp.aspx?Create=1&n=11738 |
| 台鋼ホークス | 澄清湖棒球場 | 328 / 400 / 328 | https://cpbl.com.tw/field/cont?sid=0M062392119063993008 |
| 共通選択 | 臺北大巨蛋 | 335 / 400 / 335 | https://zh.wikipedia.org/wiki/臺北大巨蛋 |

## v25 fence and venue design

The fence uses five radial distances in metres. The 22.5° rays from the center line define left-center and right-center in the game. Fence panels join these points in plan view. The rendering, foul poles and home-run check use that same outline.

| Venue | Left-center / right-center (m) | Evidence |
|---|---:|---|
| 臺中洲際棒球場 | ~112.7 / ~112.7 | Model estimate. The reported fence height is 2.5 m. |
| 天母棒球場 | ~111.4 / ~111.4 | Model estimate. |
| 臺南亞太成棒主球場 | ~115 / ~115 | Model estimate. |
| 新莊棒球場 | ~113.8 / ~113.8 | Model estimate. |
| 樂天桃園棒球場 | ~114.2 / ~114.2 | Model estimate. |
| 澄清湖棒球場 | ~115.2 / ~115.2 | Model estimate. |
| 臺北大巨蛋 | ~108.5 / ~108.5 | Model estimate reflecting the angular fence described by a player. Reported wall height 3.5 m. |
| 東京ドーム | 110 / 110 | [OmyuTech](https://baseball.omyutech.com/stadiumTop.action?stadiumId=1). [Venue overview](https://www.tokyo-dome.co.jp/dome/about/). |
| 富山市民球場（アルペンスタジアム） | ~114 / ~114 | Model estimate. [Toyama City](https://www.city.toyama.lg.jp/bunka/sports/1010565/1010567/1011160.html) lists 99.1 m down the lines, 122 m to center, and six light towers. |

[Intercontinental and Taipei Dome wall heights and profile](https://www.ltsports.com.tw/article/166952) · [Taipei Dome height and dimensions](https://dome.gov.taipei/News_Content.aspx?n=809D227A1A9DB744&s=8CB6D52021B92DBE&sms=72544237BBE4C5F6) · [Xinzhuang grandstands](https://www.t-sports.ntpc.gov.tw/home.jsp?id=f57762b740db24e7) · [Taoyuan grandstands](https://www.tycg.gov.tw/NewsPage_Content.aspx?n=7&s=1261116)

Grandstands, scoreboards, canopies, and fence colors are simplified scene models. Where wall heights were not established the game uses 2.8 m.

## Tokyo Dome interior

The [official dimensions](https://www.tokyo-dome.co.jp/dome/about/) give a roof height of 61.69 m above the field, 100 m down both lines, 122 m to center and a 4 m fence. The [venue equipment guide](https://www.tokyo-dome.co.jp/dome/about/facility/) lists the 125.6 m main LED vision and outfield ribbon visions. The game builds the air-supported canopy, cable grid, seating sections and curved displays as 3D geometry. The green roof-level sign and the black live baseball display are based on the supplied APBC reference.

## Taoyuan and Taipei models

The supplied reference photos guide the venue geometry and displays. Taoyuan has the open outfield, split rose stands, blue infield sections and two purple LED boards. Taipei has a dark diagonal steel lattice, white and gray seating, white concourse fascia and a high center-field blue LED board. Seating and structure positions are visual estimates. All three screens use the active teams, lineups and scores; player art uses the game's stylized proportions.

## Derby

[2026 NPB event rules](https://npb.jp/allstar/2026/homerun.html). The game runs the eight-player bracket at the selected venue. Eligible opponents are generated from existing CPBL rosters. The game uses seed order based on available season home runs and power rating when overtime remains tied.
