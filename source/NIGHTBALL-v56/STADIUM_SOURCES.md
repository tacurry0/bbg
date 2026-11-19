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

## Taichung, Tianmu and Tainan models

The supplied photos guide the architecture. Taichung Intercontinental uses the dusk and floodlit references, with its left-center vision, low multicolor outfield terraces and the stepped complex beyond right-center. Tianmu has blue and red infield seating, its painted TAIPEI wordmark, wooded hills and a compact center-field board. Tainan Asia-Pacific uses a horseshoe steel canopy with exposed trusses, a two-level infield bowl and an open outfield. The orientation and proportions of the structures are visual estimates. The opening camera shows the stadium from behind home plate before returning to the normal match view.

## Xinzhuang, Chengcing Lake and Alpen Stadium models

| Venue | Reference photos and specifications | Modeled details |
|---|---|---|
| 新莊棒球場 | [2026 season-opening photo (TSNA)](https://tsna.com/article/124823), [New Taipei City venue guide](https://www.t-sports.ntpc.gov.tw/home.jsp?id=f57762b740db24e7) | Scalloped canopy, overhanging blue seating, tan walkway, asymmetric blue video boards around the black batter’s eye, deep-blue fence and red foul-territory surfacing. |
| 澄清湖棒球場 | [Game panorama (DAZN)](https://www.dazn.com/zh-TW/news/%E6%A3%92%E7%90%83/%E5%8F%B0%E9%8B%BC%E9%9B%84%E9%B7%B9%E5%95%9F%E5%8B%95%E5%85%A8%E4%B8%BB%E5%A0%B4%E6%87%89%E6%8F%B4%E6%A8%A1%E5%BC%8F-2025%E7%90%83%E5%AD%A3%E5%8A%9B%E9%82%80%E9%B7%B9%E8%BF%B7%E5%85%B1%E8%A5%84%E7%9B%9B%E8%88%89/1axdv0nisl8r71an1ght5w6gg9), [September 2026 scoreboard photo (Liberty Times)](https://sports.ltn.com.tw/news/breakingnews/5576059) | Green multilevel stands, yellow rails, two-panel center video board, four paired outfield towers, striped grass, tan infield clay and dark green fence. |
| 富山市民球場（アルペンスタジアム） | [Infield and outfield reference (ぶるっく)](https://x.com/buru_photo/status/1399344560468205570), [2023 scoreboard layout and dimensions (Seiko)](https://www.seiko-stc.co.jp/works/detail/case_2118.html), [Toyama City venue guide](https://www.city.toyama.lg.jp/bunka/sports/1010565/1010567/1011160.html) | Open red and blue infield, lawn terraces, center board and clock, six towers, turf with subdued mowing bands, reddish clay, deep green fence and the Tateyama ridgeline. |

The references guide the modeled geometry and surface colors. The stand proportions and positions without published measurements are visual estimates. The opening views render these meshes with the selected time of day.

## Playing surfaces

All nine real venues have separate photo-based colors for turf, infield clay, the outfield warning strip, foul-territory surfacing, fence pads and the top rail. Turf band direction and contrast vary by venue. The Tokyo Dome reference guides the cool turf and orange-brown cutouts, Taipei's reference guides the wider orange perimeter and charcoal fence, and Taoyuan's reference guides the muted green turf and red-brown outer track. The Taichung, Tianmu and Tainan photos guide their green turf, clay and fence palettes. The recorded field dimensions are used separately from these visual estimates.

The turf colors below use representative grass-only samples from the wide shots and field-level photos referenced above. Lighting and striping retain the sampled field colors in both renderers. Colors vary between photos with camera exposure, white balance, roof shadows and the time of day.

| Venue | Reference outfield | Additional samples |
|---|---|---|
| 臺中洲際棒球場 | `#A2BB74` | `#A8BA58` under lights |
| 天母棒球場 | `#627B3E` | |
| 臺南亞太成棒主球場 | `#9BB273` | `#53694C` near the covered home stand |
| 新莊棒球場 | `#88A94C` | |
| 樂天桃園棒球場 | `#878C48` | |
| 澄清湖棒球場 | `#A7C78E` | |
| 臺北大巨蛋 | `#8FAB50` | `#A3AB67` near home plate |
| 東京ドーム | `#89C892` | `#6AAE70` in the near field and `#91AA53` under warmer match lighting |
| 富山市民球場 | `#7B8C67` | |

## Derby

[2026 NPB event rules](https://npb.jp/allstar/2026/homerun.html). The game runs the eight-player bracket at the selected venue. Eligible opponents are generated from existing CPBL rosters. The game uses seed order based on available season home runs and power rating when overtime remains tied.

## NPB and KBO home venues

The 22 new models use original 3D geometry for seating, roof structure, fences, field surfaces and live video boards. The source photos guide geometry and color and are used as references. Published dimensions take precedence over estimates. Seating dimensions, colors and undocumented fence sections are approximate.

| Venue | Photo and specification references | Model details |
|---|---|---|
| Yokohama | [DeNA seating photos](https://www.baystars.co.jp/ticket/regular/seat_type.php), [field dimensions](https://kanagawa-hbf.sakura.ne.jp/ballpark/) | Blue wing stands on both sides, high navy wall, three video boards and city buildings. |
| Koshien | [Hanshin facility overview](https://koshien.hanshin.co.jp/stadium_guide/seat.html), [Hanshin ground photo](https://www.hanshin.co.jp/press/docs/20240925_koshien_dobokuisan.pdf) | Dark infield soil, green seats, silver canopy and a center-field clock. |
| Mazda Stadium | [Hiroshima interior photos](https://www.city.hiroshima.lg.jp/tourism-culture/sports/1021484/1014905/1015598.html), [Hiroshima dimensions](https://www.city.hiroshima.lg.jp/tourism-culture/sports/1021484/1014905/1017941.html) | Uneven foul-line distances, red seats and elevated right-field stand. |
| Vantelin Dome Nagoya | [2026 Home Run Wing renovation](https://www.nagoya-dome.co.jp/newstopics/etc/2026/02/24-2055.php), [renovation photo](https://www.nikkansports.com/baseball/photonews/photonews_nsInc_202602240001179-6.html) | Triangular ceiling lattice, long center video board, blue terraces and shortened alleys. |
| Meiji Jingu | [Field photo](https://stadiumreport.hatenablog.com/entry/2024/10/17/213212), [Swallows facility dimensions](https://www.yakult-swallows.co.jp/company/pdf/company_profile2025.pdf) | Blue shallow tiers, center board with side panels and warm clay cutouts. |
| Mizuho PayPay Dome | [Hawks interior photo](https://www.softbankhawks.co.jp/biz/blog/59), [terrace renovation](https://sportiva.shueisha.co.jp/clm/baseball/npb/2015/03/17/post_527/) | Closed three-part roof, five screen surfaces and home-run terraces. |
| ES CON Field | [Hokkaido tourism interior photo](https://www.visit-hokkaido.jp/spot/detail_12199.html), [field dimensions](https://www.nikkansports.com/baseball/news/202302160000270.html?mode=all) | Gabled roof, glazed outfield wall, green seating and offset screens. |
| Rakuten Mobile Saikyo Park Miyagi | [Field photo](https://news.mynavi.jp/article/20251031-3607701/), [2026 fence and display changes](https://pacificleague.com/news/2025/11/10045111) | Left-field Ferris wheel, right-center LED and asymmetric home-run zones. |
| ZOZO Marine | [Marines 2019 renovation and photos](https://www.marines.co.jp/news/detail/00003818.html), [field dimensions](https://pacificleague.com/news/2022/2/38950) | Silver overhang, outfield wind screen and Home Run Lagoon terraces. |
| Kyocera Dome Osaka | [Venue interior photos](https://www.kyoceradome-osaka.jp/advertisingmedia_guide/static/pdf/advertisingmedia.pdf), [venue guide](https://www.kyoceradome-osaka.jp/download/img/guidemap18.pdf) | Seven suspended rings, blue tiers and an enclosed bowl. |
| Belluna Dome | [Lions facility guide](https://www.seibulions.jp/stadium/dome.html), [Lions interior photo](https://www.seibulions.co.jp/eng.html) | Shallow canopy, exposed perimeter, wooded backdrop and dark blue tiers. |
| HARD OFF ECO Stadium Niigata | [Venue photo](https://www.hardoff-eco-stadium.jp/topics/detail/id/6864), [dimensions](https://www.hardoff-eco-stadium.jp/guide/outline.html) | Blue infield seats under a silver canopy, low outfield stands and artificial turf. |
| Churu Stadium Shimizu | [Venue guide](https://ihara-stadium.com/%E6%9C%AC%E7%90%83%E5%A0%B4%E3%81%AB%E3%81%A4%E3%81%84%E3%81%A6), [2026 infield photo](https://note.com/sidmer352/n/n351336d94846) | Orange and blue infield seating, dirt infield, outfield lawn banks and compact board. |
| Gwangju-KIA Champions Field | [Dong-A field photo](https://www.donga.com/news/Sports/article/all/20240420/124571650/1), [venue geometry](https://miri-bom.com/stadium/gwangju-kia) | Red lower seats, a segmented canopy and a left-center display. |
| Daegu Samsung Lions Park | [Aerial photo](https://sports.news.nate.com/view/20250327n00364), [Yonhap dimensions](https://www.yna.co.kr/view/AKR20160323121400007) | Straight outfield wall segments, blue seating, angular canopy and right-side video board. |
| Jamsil Baseball Stadium | [Yonhap stadium photos and dimensions](https://www.yna.co.kr/view/AKR20260530031700007) | Shared 2026 home of LG and Doosan, broad exposed bowl and deep center field. |
| Suwon KT Wiz Park | [Newsis aerial photo](https://www.newsis.com/view/NISX20261002_0003811982), [field dimensions](https://v-see.app/?seat=203%3A1-1&venue=ktwiz-park) | Pink and red seating, three infield decks, tall canopy and offset scoreboard. |
| Incheon SSG Landers Field | [SSG stadium dimensions and photo](https://www.ssglanders.com/stadium/info), [Samsung Big Board project](https://org-sec-b2b.samsung.com/sec/business/insights/case-study/reference-incheonsk-bigboard/) | Oversize Big Board, red lower seating and low green padding. |
| Sajik Baseball Stadium | [Busan venue guide](https://www.busan.go.kr/stadium/sfcimplexbaseball), [2025 fence restoration](https://news.sbs.co.kr/news/endPagePrintPopup.do?news_id=N1007899382) | Orange and blue seats, round bowl, central LED and towers beyond left and right. |
| Daejeon Hanwha Life Ballpark | [Opening photo](https://v.daum.net/v/fXBDTdiBdK), [field dimensions and facilities](https://v.daum.net/v/20250220155004470), [8 m fence](https://www.mt.co.kr/sports/2025/02/20/2025022010340521549) | Right-field Monster Wall with two-level bullpens, third-base pool and asymmetric field. The high wall is used for hit detection as well. |
| Changwon NC Park | [Sports Seoul field photo](https://www.sportsseoul.com/news/read/1518057), [venue dimensions](https://miri-bom.com/stadium/changwon-nc) | Cantilevered roof, left-field lawn section, dark blue seating and apartments behind the park. |
| Gocheok Sky Dome | [Seoul city coverage](https://mediahub.seoul.go.kr/archives/915463), [venue geometry](https://miri-bom.com/stadium/gocheok), [KBO photos of three boards](https://v.daum.net/v/cYcP502hPv) | Arched steel trusses, blue seats, light banks and outfield boards. |
