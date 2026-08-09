// Dictionary + the knowledge model that decides how much help the world still gives you.
const Vocab = (() => {

// ---- the fourth column: what a word is *about*.
//
// Review in this game is meant to be invisible. Nothing here is ever going to put a flashcard in
// front of anybody; instead the world is supposed to bend towards whatever has come round again —
// food words are due and today's shopping list is made of them, direction words are due and a
// station exit is shut, time words are due and a coworker moves a meeting. None of that could be
// built, because a row knew where a word was found and not what it was about. The sections below
// are organised by PLACE, and place is the wrong axis: 冰箱 and 鸡蛋 are in different sections and
// belong to the same errand, while 冰箱 and 沙发 are in the same section and share nothing at all.
//
// So a row may carry a fourth field. These twelve are the whole of it and the set is closed:
//
//   food       what you eat, cook, order or shop for
//   direction  wayfinding — exits, entrances, sides, floors, maps, asking the way
//   time       the clock, the calendar, and being early or late for something
//   clothing   what you put on, including what the weather makes you put on
//   medical    being ill, the chemist's, and everything inside the hospital
//   number     digits, measure words, counting, and the numbers written on things
//   money      prices, paying, wages, and the bank
//   work       the job, the people you do it with, and the rooms it happens in
//   social     greetings, manners, and the people who talk to you
//   transport  the vehicles, the tickets, and the journey
//   weather    what the sky is doing, and the seasons it does it in
//   home       the flat and the building — furniture, appliances, chores, the lobby
//
// It is short on purpose. A topic earns its place only if a day in the world can be built around
// it, which is why there is no study topic and no animal topic: "revise your campus words" is not
// something that can happen to you, it is a flashcard wearing a costume.
//
// Three rules for anybody adding tags, each of them arrived at by getting it wrong first:
//
//   One topic per word, never a list. The column exists to choose today's event, and a word that
//   votes for three events chooses none of them.
//
//   Untagged is an answer, not an omission. Most of this list is untagged and should stay that
//   way — 东西, 好, 看, 大厦, 熊猫. A word that cannot key an event is better silent than filed
//   somewhere nearly-right, because a wrong tag does not merely fail to help: it makes the world
//   stage the wrong scene, and tells the player a lie about what they were struggling with.
//
//   Where two topics both fit, the one that names the event wins. 票价 is a price and is tagged
//   transport, because a money day should be about your wallet and a fare only ever comes up at a
//   ticket window. 斤 and 串 are met at a food stall and are tagged number, because what they
//   teach is counting. People are social — the cabin crew, the cashier, the man who cleans ears —
//   since the event a person keys is somebody speaking to you; the exceptions are your colleagues
//   (work) and hospital staff (medical), who belong to the scene more than to the conversation.
//
// A three-field row is still a valid row and always will be. Tagging is opt-in, most of the list
// has not opted in, and nothing downstream may assume the field is there.
const TOPICS = ['food', 'direction', 'time', 'clothing', 'medical', 'number',
                'money', 'work', 'social', 'transport', 'weather', 'home'];
const TOPIC_SET = new Set(TOPICS);

const RAW = `
# NO BACKTICKS ANYWHERE BELOW THIS LINE, INCLUDING IN THESE # COMMENTS.
#
# This is a template literal. One backtick ends it, the rest of the word list is then parsed as
# JavaScript, and the game does not boot. It has happened three times in one session — twice while
# writing a comment that was itself warning about backticks — because the older warning lived
# two thousand lines down where you only find it if you are already there.
#
# It is not caught by node --check, which usually finds the remaining backticks re-pair into
# something that parses, and it is not caught by .dictcheck.js, which reads this file as text with
# a regex and never evaluates it. What catches it: load js/vocab.js in a vm and compare
# Object.keys(DICT).length against the count .dictcheck.js prints. They must agree.
门|mén|door|home
窗户|chuānghu|window|home
床|chuáng|bed|home
枕头|zhěntou|pillow|home
# The flat gained eight labelled objects and none of them had a row here, which is not a missing
# gloss — it is a crash. game.js builds the walk-up prompt out of Vocab.get(hz).en, and Vocab.get is
# DICT[hz] with no fallback, so standing near a thing the dictionary has never heard of throws on
# that frame and drops the whole game to the "did not load" overlay. Eight of these were in the room
# the player starts in. See .thingcheck.js, which now refuses to let it happen again.
被子|bèizi|quilt, duvet|home
床头柜|chuángtóuguì|bedside table|home
闹钟|nàozhōng|alarm clock|time
桌子|zhuōzi|desk, table|home
椅子|yǐzi|chair|home
手机|shǒujī|phone|home
电脑|diànnǎo|computer|home
台灯|táidēng|desk lamp|home
灯|dēng|light, lamp|home
书架|shūjià|bookshelf|home
书|shū|book|home
冰箱|bīngxiāng|fridge|home
厨房|chúfáng|kitchen|home
水池|shuǐchí|sink|home
锅|guō|pot, wok|home
沙发|shāfā|sofa|home
电视|diànshì|television|home
遥控器|yáokòngqì|remote control|home
茶几|chájī|coffee table|home
衣柜|yīguì|wardrobe|home
地毯|dìtǎn|rug, carpet|home
植物|zhíwù|plant|home
空调|kōngtiáo|air conditioner|home
钟|zhōng|clock|time
洗手间|xǐshǒujiān|bathroom|home
洗手池|xǐshǒuchí|washbasin|home
马桶|mǎtǒng|toilet|home
淋浴|línyù|shower|home
镜子|jìngzi|mirror|home
毛巾|máojīn|towel|home
牙刷|yáshuā|toothbrush|home
牙膏|yágāo|toothpaste|home
肥皂|féizào|soap|home
洗发水|xǐfàshuǐ|shampoo|home
卫生纸|wèishēngzhǐ|toilet paper|home
垃圾桶|lājītǒng|trash can|home
背包|bēibāo|backpack
行李箱|xínglǐxiāng|suitcase|transport
厕所|cèsuǒ|toilet, restroom|home
心情|xīnqíng|mood
吃饭|chīfàn|to eat (a meal)|food
吃|chī|to eat|food
东西|dōngxi|thing, stuff
做饭|zuòfàn|to cook|food
洗手|xǐshǒu|to wash hands|home
洗澡|xǐzǎo|to shower, to bathe|home
刷牙|shuāyá|to brush teeth|home
休息|xiūxi|to rest
喝|hē|to drink|food
关|guān|to close, turn off
扔|rēng|to throw out|home
垃圾|lājī|rubbish, trash|home
换|huàn|to change
买|mǎi|to buy|money
饿|è|hungry|food
困|kùn|sleepy
房东|fángdōng|landlord|home
房租|fángzū|rent|money
房间|fángjiān|room|home
北京|Běijīng|Beijing
中文|Zhōngwén|Chinese (language)
工作|gōngzuò|work, job|work
钱|qián|money|money
我|wǒ|I, me
你|nǐ|you
的|de|(possessive)
是|shì|to be
有|yǒu|to have
没有|méiyǒu|to not have
在|zài|at, in
上|shàng|on, above|direction
里|lǐ|inside|direction
要|yào|to want, will
了|le|(completed action)
很|hěn|very
太|tài|too (much)
想|xiǎng|to want, to think
睡觉|shuìjiào|to sleep
累|lèi|tired
请|qǐng|please|social
坐|zuò|to sit
看|kàn|to watch, to read
说|shuō|to speak|social
用|yòng|to use
找|zhǎo|to look for
开|kāi|to open, turn on
打开|dǎkāi|to open
出门|chūmén|to go out
给|gěi|to give, for
发|fā|to send
短信|duǎnxìn|text message|social
一个|yí ge|one (thing)|number
一杯|yì bēi|a cup of|number
茶|chá|tea|food
吃的|chī de|something to eat|food
脏|zāng|dirty
干净|gānjìng|clean
新|xīn|new
水|shuǐ|water|food
人|rén|person
碗|wǎn|bowl|home
小|xiǎo|small
可是|kěshì|but
够用|gòuyòng|enough to get by
都|dōu|all
只有|zhǐyǒu|only have
几|jǐ|a few, how many|number
件|jiàn|(measure: clothing)|number
衣服|yīfu|clothes|clothing
留下|liúxià|to leave behind
别|bié|don't
忘|wàng|to forget
浇水|jiāoshuǐ|to water (plants)|home
夏天|xiàtiān|summer|weather
不行|bùxíng|won't do, no good
现在|xiànzài|now|time
点|diǎn|o'clock|time
那边|nàbiān|over there|direction
坏|huài|broken|home
修|xiū|to fix|home
一下|yíxià|(briefly)
满|mǎn|full
护照|hùzhào|passport|transport
和|hé|and
外面|wàimiàn|outside|direction
有点儿|yǒudiǎnr|a little
硬|yìng|hard, firm
黑|hēi|dark
到期|dàoqī|due, expires|time
明天|míngtiān|tomorrow|time
楼|lóu|building, floor|direction
胡同|hútòng|alley, hutong
超市|chāoshì|supermarket|food
# The one by your door and the one at the east end are both 超市 and nobody would confuse them:
# 大 in front of it is doing the same work as "hyper-" does in English.
大超市|dà chāoshì|hypermarket, the big supermarket|food
大门|dàmén|gate, front gate
灯笼|dēnglong|lantern
树|shù|tree
猫|māo|cat
墙|qiáng|wall
自行车|zìxíngchē|bicycle|transport
早餐|zǎocān|breakfast|food
包子|bāozi|steamed bun|food
快递|kuàidì|delivery, parcel|home
花|huā|flower
狗|gǒu|dog
石狮子|shíshīzi|stone lion
修车|xiūchē|to repair a bike, bike repair|transport
电动车|diàndòngchē|e-scooter, e-bike|transport
白菜|báicài|Chinese cabbage|food
窗帘|chuānglián|curtain|home
拉|lā|to pull, to draw
阿姨|āyí|auntie, older woman|social
师傅|shīfu|master, skilled worker|social
维修工|wéixiūgōng|a repair technician, a maintenance worker|social
老板|lǎobǎn|boss, shop owner|social
邻居|línjū|neighbour|social
小孩|xiǎohái|child|social
说话|shuōhuà|to speak, to talk|social
你好|nǐ hǎo|hello|social
谢谢|xièxie|thank you|social
再见|zàijiàn|goodbye|social
名字|míngzi|name|social
叫|jiào|to be called|social
什么|shénme|what
哪儿|nǎr|where|direction
来|lái|to come
去|qù|to go
好|hǎo|good
吗|ma|(question particle)
呢|ne|(and what about…)
# Four that .talkcheck.js's third claim found: it tokenizes every question these people ask and
# lists what falls outside the dictionary, and these came back ungraded out of the tower's own
# greeting — 回来啦？· 您找谁？· 我按一下 · 听得见对讲吗？. 啦 and 得 take a bracketed gloss, which
# is this list's mark for a particle and what makes the tone test skip them (see js/vocab.js:819);
# 谁 and 按 are ordinary words and are toned.
啦|la|(了 and 啊 run together — a change, said warmly)
得|de|(links a verb to how it is done)
谁|shéi|who, whom
按|àn|to press, to push a button
也|yě|also
学|xué|to study
中国|Zhōngguó|China
外国人|wàiguórén|foreigner|social
会|huì|can, to know how
一点儿|yìdiǎnr|a little
上班|shàngbān|to go to work|work
天气|tiānqì|weather|weather
今天|jīntiān|today|time
一起|yìqǐ|together|social
不错|búcuò|not bad, pretty good
对|duì|right, correct
还|hái|still, yet
这个|zhège|this one, this
他|tā|he, him
认识|rènshi|to know (a person)|social
高兴|gāoxìng|glad, pleased|social
走|zǒu|to walk, to leave
吧|ba|(particle: shall we, I suppose)
菜|cài|dish, vegetables|food
行|xíng|all right, that works

# ---- the three places off the alley you can walk into
餐馆|cānguǎn|restaurant|food
公司|gōngsī|company, firm, the office|work
收银台|shōuyíntái|checkout, the till|money
货架|huòjià|shelves, shelving
冰柜|bīngguì|chest freezer
方便面|fāngbiànmiàn|instant noodles|food
水果|shuǐguǒ|fruit|food
购物篮|gòuwùlán|shopping basket|food
购物车|gòuwùchē|shopping cart|food
米|mǐ|rice (uncooked)|food
菜单|càidān|menu|food
牛肉面|niúròumiàn|beef noodle soup|food
餐桌|cānzhuō|dining table|home
鱼缸|yúgāng|fish tank, aquarium
办公桌|bàngōngzhuō|desk|work
打印机|dǎyìnjī|printer|work
白板|báibǎn|whiteboard|work
# ---- 京华大厦 A座. The office is now a whole workplace tower, and every labelled station below
# is a real walk-up thing. Vocab.get intentionally has no fallback, so these rows are as much scene
# integrity as they are the vocabulary for accounting, legal, production and building operations.
收货台|shōuhuò tái|receiving desk|work
分拣台|fēnjiǎn tái|sorting bench|work
快递格|kuàidì gé|parcel pigeonhole|work
货物|huòwù|goods, cargo|work
器材维修台|qìcái wéixiū tái|equipment repair bench|work
零件架|língjiàn jià|spare-parts rack|work
员工储物柜|yuángōng chǔwùguì|staff locker|work
更衣长凳|gēngyī chángdèng|changing-room bench|work
服务器机柜|fúwùqì jīguì|server rack|work
网络监控台|wǎngluò jiānkòng tái|network monitoring console|work
档案架|dàng’àn jià|archive shelving|work
物料架|wùliào jià|supplies rack|work
库存终端|kùcún zhōngduān|inventory terminal|work
回收站|huíshōu zhàn|recycling station|work
访客登记机|fǎngkè dēngjìjī|visitor registration kiosk|work
公司名录|gōngsī mínglù|company directory|work
等候区|děnghòu qū|waiting area|work
总经理|zǒng jīnglǐ|general manager|work
运营总监|yùnyíng zǒngjiān|operations director|work
财务总监|cáiwù zǒngjiān|finance director|work
人力资源总监|rénlì zīyuán zǒngjiān|human-resources director|work
行政助理|xíngzhèng zhùlǐ|executive assistant|work
物业服务台|wùyè fúwù tái|property-management desk|work
报修看板|bàoxiū kànbǎn|maintenance request board|work
安保台|ānbǎo tái|security desk|work
监控墙|jiānkòng qiáng|CCTV wall|work
安检台|ānjiǎn tái|security screening station|work
快递室|kuàidì shì|parcel room|work
快递架|kuàidì jià|parcel rack|work
收发室|shōufā shì|mailroom|work
邮资机|yóuzī jī|postage meter|work
咖啡机|kāfēijī|coffee machine|work
咖啡台|kāfēi tái|coffee counter|work
发票扫描仪|fāpiào sǎomiáoyí|invoice scanner|work
财务打印机|cáiwù dǎyìnjī|finance printer|work
应付账款|yìngfù zhàngkuǎn|accounts payable|work
供应商档案|gōngyìngshāng dàng’àn|vendor files|work
工资系统|gōngzī xìtǒng|payroll system|work
报销窗口|bàoxiāo chuāngkǒu|expense-claim counter|work
报销流程|bàoxiāo liúchéng|reimbursement workflow|work
预算表|yùsuàn biǎo|budget sheet|work
预算桌|yùsuàn zhuō|budget review table|work
财务档案|cáiwù dàng’àn|finance archive|work
银行付款机|yínháng fùkuǎn jī|bank payment terminal|work
付款清单|fùkuǎn qīngdān|payment checklist|work
案件登记|ànjiàn dēngjì|matter registration|work
利益冲突检索|lìyì chōngtū jiǎnsuǒ|conflict-of-interest search|work
案件流程|ànjiàn liúchéng|matter workflow|work
合同审阅台|hétong shěnyuè tái|contract review desk|work
法律数据库|fǎlǜ shùjùkù|legal database|work
盖章台|gàizhāng tái|document stamping desk|work
调解室|tiáojiě shì|mediation room|work
调解原则|tiáojiě yuánzé|mediation principles|work
证据柜|zhèngjù guì|evidence cabinet|work
文件脱敏台|wénjiàn tuōmǐn tái|document redaction desk|work
合规档案|héguī dàng’àn|compliance archive|work
法律图书室|fǎlǜ túshūshì|law library|work
案件工作台|ànjiàn gōngzuò tái|casework desk|work
案件时间线|ànjiàn shíjiānxiàn|case timeline|work
案件会议室|ànjiàn huìyìshì|case conference room|work
总法律顾问办公桌|zǒng fǎlǜ gùwèn bàngōngzhuō|general counsel’s desk|work
签字文件|qiānzì wénjiàn|signed documents|work
策划桌|cèhuà zhuō|project-planning table|work
项目墙|xiàngmù qiáng|project wall|work
审片台|shěnpiàn tái|creative review station|work
资料台|zīliào tái|project records station|work
器材库|qìcái kù|equipment store|work
摄影棚|shèyǐng péng|photo and video studio|work
灯光台|dēngguāng tái|lighting console|work
录音间|lùyīn jiān|recording booth|work
剪辑台|jiǎnjí tái|editing station|work
调色台|tiáosè tái|colour-grading station|work
导出|dǎochū|export|work
打样台|dǎyàng tái|proofing station|work
充电柜|chōngdiàn guì|charging locker|work
培训室|péixùn shì|training room|work
董事会议室|dǒngshì huìyìshì|boardroom|work
投影|tóuyǐng|projection|work
餐盘回收|cānpán huíshōu|tray return|work
安静舱|ānjìng cāng|quiet pod|work
屋顶花园|wūdǐng huāyuán|roof garden|work
凉亭|liángtíng|pavilion
拉伸区|lāshēn qū|stretching area|work
灌溉|guàngài|irrigation
太阳能板|tàiyángnéng bǎn|solar panel
摄影师|shèyǐngshī|photographer, camera operator|work
录音师|lùyīnshī|sound recordist|work
剪辑师|jiǎnjíshī|video editor|work
制片助理|zhìpiàn zhùlǐ|production assistant|work
培训师|péixùnshī|workplace trainer|work
会议协调员|huìyì xiétiáoyuán|meeting coordinator|work
食堂师傅|shítáng shīfu|canteen cook|work
园艺师|yuányìshī|gardener, horticulturist|work
设施技师|shèshī jìshī|facilities technician|work
服务员|fúwùyuán|waiter, waitress, attendant|social
厨师|chúshī|cook, chef|social
收银员|shōuyínyuán|cashier|social
点菜|diǎncài|to order food|food
# The rest of the menu board, and the words you need to hand money over. You read these off
# the wall in the 餐馆 and off the tickets on the shelves in the 超市, so they belong here.
西红柿鸡蛋面|xīhóngshì jīdàn miàn|tomato and egg noodles|food
炸酱面|zhájiàngmiàn|noodles in bean sauce|food
米饭|mǐfàn|cooked rice, a bowl of rice|food
凉菜|liángcài|a cold dish|food
啤酒|píjiǔ|beer|food
饮料|yǐnliào|a drink, soft drink|food
一共|yígòng|altogether, in total|money
多少|duōshao|how much, how many|number
交钱|jiāoqián|to pay, to hand the money over|money
关门|guānmén|to close, to shut (for the day)|time
开门|kāimén|to open (for the day)|time
# The rest of the board in the 餐馆. Seventeen dishes, and you order them by name.
打卤面|dǎlǔmiàn|noodles in thick gravy|food
拉面|lāmiàn|hand-pulled noodles|food
凉面|liángmiàn|cold noodles|food
蛋炒饭|dànchǎofàn|egg fried rice|food
盖饭|gàifàn|rice with a topping on it|food
小菜|xiǎocài|a small side dish|food
拍黄瓜|pāihuánggua|smashed cucumber salad|food
花生米|huāshēngmǐ|fried peanuts|food
土豆丝|tǔdòusī|shredded potato|food
汤|tāng|soup|food
蛋花汤|dànhuātāng|egg drop soup|food
酸辣汤|suānlàtāng|hot and sour soup|food
可乐|kělè|cola|food
坐下|zuòxia|to sit down
等一下|děng yíxià|wait a moment
# ---- 公司 the workplace: the people in it and the jobs on the board
经理|jīnglǐ|manager|work
同事|tóngshì|colleague, workmate|work
会议桌|huìyìzhuō|meeting table|work
打卡机|dǎkǎjī|time clock, the card punch|work
打卡|dǎkǎ|to clock in|work
全勤|quánqín|full attendance (and the bonus for it)|work
开会|kāihuì|to hold or attend a meeting|work
打字|dǎzì|to type|work
打电话|dǎ diànhuà|to make a phone call|work
做表格|zuò biǎogé|to build a spreadsheet|work
写报告|xiě bàogào|to write a report|work
报告|bàogào|report|work
加班|jiābān|to work overtime|work
下班|xiàbān|to knock off, to finish work|work
# The words a job has, as opposed to the words a room has. Everything above this line is something
# you can point at in the office; everything below it is something that happens to you while you
# work there — being paid, being late, asking for a day off, being moved up or not. They are here
# because the whiteboard stopped being five errands and became a career, and a career that never
# says 工资 or 请假 in Chinese is not teaching the language people actually need at work.
工资|gōngzī|wages, salary|work
请假|qǐngjià|to ask for leave, to take time off|work
迟到|chídào|to be late, to arrive late|work
会议|huìyì|a meeting|work
报销|bàoxiāo|to claim expenses, to be reimbursed|work
邮件|yóujiàn|email, post|work
办公室|bàngōngshì|office (the room)|work
面试|miànshì|a job interview|work
升职|shēngzhí|to be promoted|work
实习生|shíxíshēng|intern, trainee|work
职员|zhíyuán|clerk, office staff|work
主管|zhǔguǎn|supervisor, the one in charge|work
# ---- 地铁 the subway, and the line it runs on
地铁|dìtiě|subway, metro|transport
地铁站|dìtiězhàn|subway station|transport
售票机|shòupiàojī|ticket machine|transport
自动售票机|zìdòng shòupiàojī|automatic ticket machine|transport
闸机|zhájī|ticket gate, turnstile|transport
线路图|xiànlùtú|line map, route diagram|direction
地图|dìtú|map|direction
街上|jiē shang|out on the street
票|piào|ticket|transport
单程票|dānchéngpiào|single-journey ticket|transport
交通卡|jiāotōngkǎ|travel card|transport
卡|kǎ|card
刷卡|shuā kǎ|to tap a card|money
充值|chōngzhí|to top up|money
余额|yú'é|balance (on a card or account)|money
补票|bǔ piào|to pay the fare difference|transport
票价|piàojià|fare, ticket price|transport
票价表|piàojiàbiǎo|fare table|transport
服务中心|fúwù zhōngxīn|service centre
问路|wèn lù|to ask the way|direction
元|yuán|yuan (the formal word for kuai)|money
站|zhàn|stop, station|transport
进站|jìn zhàn|to go in through the gate|direction
出站|chū zhàn|to leave the station|direction
通车|tōngchē|open to traffic, in service|transport
在建|zàijiàn|under construction
信号|xìnhào|signal
盲道|mángdào|tactile paving for the blind|direction
无障碍|wúzhàng'ài|accessible, step-free|direction

# ---- 客舱 on board the aeroplane. Everything you can point at inside the cabin.
#
# 安全带 is the word the whole flight is about: it is in the captain's briefing, it is the sign over
# your head, and a member of crew comes down the aisle and says it to you.
安全带|ānquándài|seat belt|transport
行李架|xínglǐjià|overhead luggage rack|transport
舷窗|xiánchuāng|cabin window, porthole|transport
茶水间|cháshuǐjiān|galley|transport
空乘|kōngchéng|cabin crew, flight attendant|social
乘务员|chéngwùyuán|member of the cabin crew|social
机长|jīzhǎng|captain|social
小桌板|xiǎozhuōbǎn|tray table|transport
靠背|kàobèi|seat back|transport
阅读灯|yuèdúdēng|reading light|transport
出风口|chūfēngkǒu|air vent|transport
屏幕|píngmù|screen
遮光板|zhēguāngbǎn|window shade|transport
充电口|chōngdiànkǒu|charging port
舱门|cāngmén|aircraft door|transport
驾驶舱|jiàshǐcāng|cockpit, flight deck|transport
机翼|jīyì|aircraft wing|transport
毛毯|máotǎn|blanket
耳机|ěrjī|headphones
急救包|jíjiùbāo|first-aid kit|medical
飞行护照|fēixíng hùzhào|flight passport|transport
# Both of these were already spoken on board and neither was a headword: the captain tells you to
# press the 服务铃 if you need anything, and the crew offers 果汁 by name when she comes round.
服务铃|fúwùlíng|call button|transport
果汁|guǒzhī|fruit juice|food
换乘|huànchéng|to change lines|transport
# ---- 车厢 inside the train, where the ride actually happens
车厢|chēxiāng|carriage, the inside of the train|transport
车门|chēmén|the train doors|transport
上车|shàngchē|to get on|transport
下车|xiàchē|to get off|transport
下一站|xià yí zhàn|next stop|transport
到站|dàozhàn|to arrive at a station|transport
扶手|fúshǒu|handrail, grab rail|transport
吊环|diàohuán|hanging strap|transport
爱心专座|àixīn zhuānzuò|priority seat|transport
让座|ràngzuò|to give up your seat|transport
关闭|guānbì|to close (of doors)
当心夹手|dāngxīn jiāshǒu|mind your hands — the doors|transport
左边|zuǒbian|the left side|direction
右边|yòubian|the right side|direction
杨柳胡同|Yángliǔ Hútòng|Willow Lane — the hutong you live on
商务区|Shāngwùqū|Business District (station)
大学城|Dàxuéchéng|University Town (station)
火车站|huǒchēzhàn|railway station|transport
公园|gōngyuán|park
动物园|dòngwùyuán|zoo
机场|jīchǎng|airport|transport
# ---- 公园 the park, two stops down the line
湖|hú|lake
桥|qiáo|bridge
亭子|tíngzi|pavilion
长椅|chángyǐ|bench
石桌|shízhuō|stone table
健身器材|jiànshēn qìcái|outdoor exercise equipment
锻炼|duànliàn|to take exercise, to train
音箱|yīnxiāng|loudspeaker
广场舞|guǎngchǎngwǔ|square dancing
下棋|xiàqí|to play a board game
大妈|dàmā|auntie — a woman of about sixty|social
逛|guàng|to stroll around, to wander
# ---- 动物园 the zoo, at the far end of the line. Seven animals, and the words for looking at
# them: every enclosure label here has a matching row, because a thing the dictionary has never
# heard of is not a missing gloss — it is a crash on the frame you walk up to it.
动物|dòngwù|animal
熊猫|xióngmāo|panda
老虎|lǎohǔ|tiger
大象|dàxiàng|elephant
长颈鹿|chángjǐnglù|giraffe
猴子|hóuzi|monkey
企鹅|qǐ'é|penguin
孔雀|kǒngquè|peacock
鸟舍|niǎoshè|aviary, bird house
猴山|hóushān|monkey hill — the enclosure itself
竹子|zhúzi|bamboo
鼻子|bízi|nose; an elephant's trunk|medical
脖子|bózi|neck|medical
翅膀|chìbǎng|wing
尾巴|wěiba|tail
喂|wèi|to feed (an animal)
饲养员|sìyǎngyuán|keeper, zookeeper|social
门票|ménpiào|admission ticket
导游图|dǎoyóutú|visitor map|direction
游泳|yóuyǒng|to swim
爬|pá|to climb
# ---- 大学城 the university district
宿舍|sùshè|dormitory
大学|dàxué|university
教学楼|jiàoxuélóu|teaching building
教室|jiàoshì|classroom
黑板|hēibǎn|blackboard
讲台|jiǎngtái|podium, lectern
学生桌|xuéshēngzhuō|student desk
课程表|kèchéngbiǎo|class schedule, course timetable|time
班级牌|bānjípái|class sign, class placard
书桌|shūzhuō|study desk
图书馆|túshūguǎn|library
借书处|jièshūchù|circulation desk, borrowing counter
食堂|shítáng|canteen|food
煎饼|jiānbing|jianbing (a flat savoury pancake)|food
售货机|shòuhuòjī|vending machine
饮水机|yǐnshuǐjī|drinking fountain, water cooler
打印|dǎyìn|to print|work
复印|fùyìn|to photocopy, to copy|work
布告板|bùgàobǎn|noticeboard
通知|tōngzhī|a notice, an announcement
篮球场|lánqiúchǎng|basketball court
上课|shàngkè|to go to class
下课|xiàkè|for class to end
看书|kànshū|to read
打球|dǎqiú|to play a ball game
学生|xuésheng|student|social
老师|lǎoshī|teacher|social
安静|ānjìng|quiet
# ---- 火车站 the railway station
候车|hòuchē|to wait for a train|transport
座位|zuòwèi|seat|transport
电子屏|diànzǐpíng|electronic display board
检票口|jiǎnpiàokǒu|ticket gate|transport
检票|jiǎnpiào|to have your ticket checked|transport
售票窗口|shòupiào chuāngkǒu|ticket window|transport
售票员|shòupiàoyuán|ticket clerk|social
小卖部|xiǎomàibù|kiosk, little shop
火车票|huǒchēpiào|train ticket|transport
# The two seat classes the clerk offers you. They need to be whole rows: 等 is already in the list as
# the verb "to wait", so 二等座 was tokenizing as 二 · 等 · 座 and reading out as "two, wait, seat".
一等座|yīděngzuò|first class seat|transport
二等座|èrděngzuò|second class seat|transport
正点|zhèngdiǎn|on time|time
晚点|wǎndiǎn|delayed, running late|time
车次|chēcì|train number, service|transport
# ---- 机场 the airport. The longest chain of verbs in the game runs through this room —
# buy, check in, drop the bag, clear security, wait, board — so it gets the longest list.
飞机|fēijī|aeroplane|transport
起飞|qǐfēi|to take off|transport
降落|jiàngluò|to land|transport
值机柜台|zhíjī guìtái|check-in desk|transport
值机|zhíjī|to check in|transport
自助值机|zìzhù zhíjī|self-service check-in|transport
自助|zìzhù|self-service
乘机流程|chéngjī liúchéng|steps for taking a flight|transport
航班信息|hángbān xìnxī|flight information|transport
航班|hángbān|flight|transport
安检|ānjiǎn|security check|transport
座椅|zuòyǐ|seat|transport
行李车|xínglǐchē|baggage trolley|transport
行李|xíngli|luggage|transport
行李托运|xíngli tuōyùn|baggage drop|transport
托运|tuōyùn|to check baggage into the hold|transport
超大行李|chāodà xíngli|oversize baggage|transport
手提行李|shǒutí xíngli|hand luggage|transport
机票|jīpiào|plane ticket|transport
售票处|shòupiàochù|ticket office|transport
登机|dēngjī|to board a plane|transport
登机牌|dēngjīpái|boarding card|transport
登机口|dēngjīkǒu|boarding gate|transport
候机|hòujī|to wait for a flight|transport
地勤|dìqín|ground staff|social
安检员|ānjiǎnyuán|security officer|social
国际|guójì|international|transport
国内|guónèi|domestic|transport
出口|chūkǒu|way out, exit|direction
入口|rùkǒu|way in, entrance|direction
问询处|wènxúnchù|information desk|direction
请问|qǐngwèn|excuse me — may I ask|social
靠窗|kào chuāng|window seat|transport
靠走廊|kào zǒuláng|aisle seat|transport
座位号|zuòwèihào|seat number|number
免税店|miǎnshuìdiàn|duty-free shop
免税|miǎnshuì|duty-free
便利店|biànlìdiàn|convenience store|food
咖啡|kāfēi|coffee|food
取餐|qǔ cān|to collect an order|food
吸烟室|xīyānshì|smoking room
吸烟|xīyān|to smoke
请勿吸烟|qǐng wù xīyān|please do not smoke
充电站|chōngdiànzhàn|charging point
充电|chōngdiàn|to charge (a battery)
延误|yánwù|delayed|time
正常|zhèngcháng|on time, normal
登机中|dēngjī zhōng|now boarding|transport
目的地|mùdìdì|destination|direction
状态|zhuàngtài|status
排队|páiduì|to queue
一米线|yì mǐ xiàn|one-metre waiting line
巧克力|qiǎokèlì|chocolate|food
香烟|xiāngyān|cigarettes
香水|xiāngshuǐ|perfume
白酒|báijiǔ|baijiu, grain spirit|food
上海|Shànghǎi|Shanghai
广州|Guǎngzhōu|Guangzhou
成都|Chéngdū|Chengdu
海口|Hǎikǒu|Haikou
纽约|Niǔyuē|New York
东京|Dōngjīng|Tokyo
曼谷|Màngǔ|Bangkok

往返|wǎngfǎn|return, round trip|transport
单程|dānchéng|one way|transport
回程|huíchéng|the return leg of a journey|transport
确认|quèrèn|to confirm

# ---- 外滩 the Bund, Shanghai. The far end of a flight, and the only place in this game that
# is not Beijing — so it teaches the words for being somewhere else.
外滩|Wàitān|the Bund
黄浦江|Huángpǔ Jiāng|the Huangpu River
江|jiāng|a great river
浦东|Pǔdōng|Pudong, the east bank
东方明珠|Dōngfāng Míngzhū|the Oriental Pearl Tower
金茂大厦|Jīnmào Dàshà|the Jin Mao Tower
大厦|dàshà|tower block, high-rise
万国建筑|wànguó jiànzhù|the row of foreign-built banks on the Bund
建筑|jiànzhù|a building, architecture
海关|hǎiguān|customs
钟楼|zhōnglóu|clock tower
和平饭店|Hépíng Fàndiàn|the Peace Hotel
饭店|fàndiàn|hotel (and, confusingly, restaurant)
一晚上|yì wǎnshang|one night|time
情侣墙|qínglǚ qiáng|the lovers' wall along the embankment
风景|fēngjǐng|scenery, the view
轮渡|lúndù|ferry|transport
过江|guò jiāng|to cross the river
船|chuán|boat, ship|transport
小吃摊|xiǎochītān|snack stall|food
小笼包|xiǎolóngbāo|soup dumplings|food
生煎|shēngjiān|pan-fried pork buns|food
笼|lóng|(measure: a steamer basket)|number
烫|tàng|scalding hot|food
照相|zhàoxiàng|to take a photograph
相机|xiàngjī|camera
张|zhāng|(measure: flat things, photos)|number
公共厕所|gōnggòng cèsuǒ|public toilet
公共|gōnggòng|public
民航|mínháng|civil aviation|transport
机场大巴|jīchǎng dàbā|airport coach|transport
大巴|dàbā|coach, long-distance bus|transport
改签|gǎiqiān|to change a booking|transport
游客|yóukè|tourist|social
阿婆|āpó|granny (Shanghai)|social
侬好|nong hao|hello, in Shanghainese|social
层数|céngshù|the number of floors|number

# ---- 成都 宽窄巷子, the second flight on the board that actually lands somewhere. The Bund
# teaches the words for looking at something; this lane teaches the words for sitting down,
# which is the other half of being away from home — and most of what Chengdu is.
四川|Sìchuān|Sichuan
宽窄巷子|Kuānzhǎi Xiàngzi|Kuanzhai Alley, the old lanes in Chengdu
巷子|xiàngzi|a lane, an alley
门楼|ménlóu|the gatehouse arch over a lane
青石板|qīngshíbǎn|grey flagstones
茶馆|cháguǎn|teahouse — in Chengdu, where the afternoon happens|food
茶博士|chá bóshì|the teahouse man with the long-spouted kettle|social
盖碗|gàiwǎn|a lidded tea bowl|food
盖碗茶|gàiwǎnchá|tea served in a lidded bowl|food
茶客|chákè|somebody sitting in a teahouse|social
竹椅|zhúyǐ|bamboo armchair
掏耳朵|tāo ěrduo|to have your ears cleaned
采耳师傅|cǎi'ěr shīfu|the man who cleans ears|social
耳朵|ěrduo|ear|medical
音叉|yīnchā|tuning fork
川剧|Chuānjù|Sichuan opera
变脸|biànliǎn|face-changing, the Sichuan opera trick
戏台|xìtái|a stage
麻辣|málà|numbing and hot — the Sichuan flavour|food
麻|má|numbing, pins and needles|food
花椒|huājiāo|Sichuan pepper|food
鸳鸯锅|yuānyāng guō|the split hotpot, mild one side and fierce the other|food
客栈|kèzhàn|an inn, a guesthouse
大熊猫|dàxióngmāo|giant panda
双流|Shuāngliú|Shuangliu, the airport Chengdu flies out of
城市|chéngshì|a city

# The 便利店's hot-water urn is a labelled thing in js/air-shop.js with no row here, which is not
# a missing gloss but a crash: Vocab.get has no fallback and the walk-up prompt reads .en off it.
# The other two are painted signage in the same shop with no thing behind them — no gap, but they
# are on the wall and a player will ask. (No backticks in here, ever: RAW is a template literal
# and one of them ends the whole dictionary.)
开水|kāishuǐ|boiled water, from an urn|food
矿泉水|kuàngquánshuǐ|mineral water|food
充电宝|chōngdiànbǎo|a power bank

公交车站|gōngjiāochēzhàn|bus stop|transport
公交车|gōngjiāochē|bus|transport
马路|mǎlù|road, street|direction
车|chē|vehicle, car|transport
住|zhù|to live, to stay
层|céng|floor, storey|direction
老|lǎo|old
四合院|sìhéyuàn|courtyard house
晚上|wǎnshang|evening, at night|time
红|hóng|red
红绿灯|hónglǜdēng|traffic light|direction
对面|duìmiàn|opposite, across|direction
条|tiáo|(measure: long things)|number
只|zhī|(measure: animals)|number
盆|pén|(measure: potted plants)|number
骑|qí|to ride|transport
摸|mō|to touch, to pet
等|děng|to wait
过|guò|to cross, to pass
放|fàng|to put, to place
门口|ménkǒu|doorway, entrance|direction
楼下|lóuxià|downstairs|direction
豆浆|dòujiāng|soy milk|food
块|kuài|(unit of money)|money
两|liǎng|two (of something)|number
很多|hěnduō|many, a lot
就|jiù|right, just
到了|dào le|has arrived
七点|qī diǎn|seven o'clock|time
这些|zhèxiē|these

# ---- 手机 the phone in your pocket. Ordering food and errands without leaving the flat is
# how a great many people in this city actually eat, and it is its own small vocabulary.
外卖|wàimài|food delivery, takeaway|food
外卖员|wàimàiyuán|delivery rider|social
跑腿|pǎotuǐ|errand service, to run errands for someone
下单|xiàdān|to place an order|money
订单|dìngdān|an order|money
配送费|pèisòngfèi|delivery fee|money
送|sòng|to deliver, to send
敲门|qiāomén|to knock at the door
付钱|fùqián|to pay, to hand the money over|money
袋子|dàizi|bag
拿着|názhe|to be holding something
放下|fàngxia|to put down, to set down
收好|shōuhǎo|to put away properly
分钟|fēnzhōng|minute|time
暂停|zàntíng|pause
设置|shèzhì|settings

# ---- the words that hold a sentence together
#
# This list grew a place at a time, so it is dense on things you can point at and was almost empty
# of the words between them. 不 is the clearest case: it is in about a third of the spoken lines in
# the game and it was not in here, so the commonest word in the language rendered as bare hanzi with
# no pinyin over it every single time somebody said it. 这儿 was in twelve lines, 那 in eleven, 没 in
# six — all of them bare. Every entry below was found by running the tokenizer over the Chinese
# strings in the scene files and asking what came out with no reading attached; nothing here was
# added off a frequency list.
#
# Two things a reader would get wrong. First: adding a single character that is already the head of
# longer entries is safe, because tokenize() is greedy longest-match and tries the longest string at
# each position first — 打 cannot steal 打卡, and 一 cannot steal 一起. It is the reverse that bites,
# and 面 below is the example. Second: particles keep their glosses in brackets, the way 吗 and 呢 and
# 吧 already do. That is not decoration. A toneless reading fails .dictcheck.js's tone test, and the
# bracket is what makes it skip the line — write 啊|a|softening particle without them and the harness
# stops the build.
不|bù|not, don't
没|méi|not (with 有, and not yet)
这|zhè|this
那|nà|that, those; in that case
这儿|zhèr|here|direction
那儿|nàr|there|direction
这边|zhèbian|this side, over here|direction
这么|zhème|so, this much
哪个|nǎge|which one
点儿|diǎnr|a bit, some
从|cóng|from
# 还是 is not a convenience. Both halves of it were already entries — 还 as "still" and 是 as "to be" —
# so every A-or-B question in the game was being read out as "still is": 扫码还是现金, 牛肉面还是炸酱面,
# 二等座还是一等座, 靠窗还是靠走廊, 单程还是往返. Five shipped questions, and the choice-between-two is
# the shape almost every transaction in this game takes. It needed the longer row to win the match.
还是|háishi|or (offering a choice between two)
您|nín|you, the polite form — what hotel staff call you where the street says 你|social
我们|wǒmen|we, us
大家|dàjiā|everyone
自己|zìjǐ|oneself, by yourself
能|néng|to be able to, can
可以|kěyǐ|may, can
到|dào|to arrive, to reach
再|zài|again, and then
已经|yǐjīng|already
一直|yìzhí|all along, the whole time
以后|yǐhòu|after, afterwards|time
什么时候|shénme shíhou|when|time
一样|yíyàng|the same
最|zuì|most, the -est
最后|zuìhòu|last, final
多|duō|many, much
够|gòu|enough
半|bàn|half|number
事|shì|matter, something to see to
清楚|qīngchu|clear, clearly
懂|dǒng|to understand
第|dì|(makes an ordinal: 第一, 第二)|number
着|zhe|(action in progress: 开着, 拿着)
啊|a|(softening particle)
呀|ya|(softening particle, lighter than 啊)

# ---- one to ten, a hundred, and the words you count with
#
# Nine of the new conversations put a number in a reply — 八点, 十二点, 二十块, 五分钟, 两张, 六点 —
# and none of the digits were in here, so a line about money or a time of day came out half unread.
# The compounds are deliberately not entries. Greedy longest-match assembles them from the digits on
# its own, so 十二点 tokenizes as 十 · 二 · 点 and the ruby reads shí èr diǎn, which is what you want;
# adding 十二 and 二十 and 三十 as their own rows would be a hundred lines of dead weight for nothing.
一|yī|one|number
二|èr|two|number
三|sān|three|number
四|sì|four|number
五|wǔ|five|number
六|liù|six|number
七|qī|seven|number
八|bā|eight|number
九|jiǔ|nine|number
十|shí|ten|number
百|bǎi|hundred|number
个|ge|(the general measure word, for when nothing better fits)|number
次|cì|(measure: times, occasions)|number
遍|biàn|(measure: times through something)|number
份|fèn|(measure: a portion, a serving)|number
瓶|píng|(measure: a bottle of)|number
桶|tǒng|(measure: a tub of, a barrel of)|number
趟|tàng|(measure: a run, a service)|number

# ---- the verbs the conversations lean on
#
# 完 is the useful one to understand rather than memorise: it attaches to a verb and means the thing
# is finished or run out, which is how 卖完了 and 写完 and 表格做完了 all work. It is entered on its
# own as well as inside the two compounds so that 做完 and 吃完, which nobody has written a row for,
# still come out read.
做|zuò|to do, to make
教|jiāo|to teach, to show someone how
听|tīng|to listen, to hear
听清|tīngqīng|to catch what was said
听懂|tīngdǒng|to understand what was said
写|xiě|to write
写完|xiěwán|to finish writing
完|wán|to finish, to run out
卖|mài|to sell|money
卖完|màiwán|to be sold out
打|dǎ|to hit, to play, to do
交|jiāo|to hand in, to submit
见|jiàn|to see, to meet
回|huí|to go back, to return
进|jìn|to go in, to enter|direction
出|chū|to go out, to come out|direction
下|xià|down, under, to get down|direction
停|tíng|to stop
起|qǐ|to get up, to rise
拿|ná|to take, to hold
先|xiān|first, before anything else
加|jiā|to add
算|suàn|to work out, to add up|number
扫|sǎo|to sweep, to scan
领|lǐng|to collect, to take (a job off the board)
记得|jìde|to remember
学习|xuéxí|to study
复习|fùxí|to revise, to go over again
返回|fǎnhuí|to go back

# ---- how things are, and when
大|dà|big
快|kuài|fast, quickly; hurry up
马上|mǎshàng|right away, in a moment|time
慢|màn|slow, slowly
新鲜|xīnxiān|fresh|food
难|nán|difficult
方便|fāngbiàn|convenient
舒服|shūfu|comfortable
凉快|liángkuai|pleasantly cool|weather
冷|lěng|cold|weather
免费|miǎnfèi|free of charge|money
早上|zǎoshang|morning, early on|time
上午|shàngwǔ|late morning, before noon|time
中午|zhōngwǔ|midday, lunchtime|time
小时|xiǎoshí|hour|time
星期|xīngqī|week|time
# The seven of them, because the office runs a week and not a day: the whiteboard is 本周计划, the
# shift is Monday to Friday, and 周末 is the reason nobody is at the desks. A player who cannot read
# which day it is cannot tell an ordinary lie-in from missing work.
星期一|xīngqīyī|Monday|time
星期二|xīngqī'èr|Tuesday|time
星期三|xīngqīsān|Wednesday|time
星期四|xīngqīsì|Thursday|time
星期五|xīngqīwǔ|Friday|time
星期六|xīngqīliù|Saturday|time
星期天|xīngqītiān|Sunday|time
周末|zhōumò|the weekend|time
周|zhōu|week|time
天|tiān|day, sky|time
冬天|dōngtiān|winter|weather
下雨|xiàyǔ|to rain|weather
雨|yǔ|rain|weather

# ---- what gets asked for at a counter, and what is written up on the wall
#
# 身份证 is the one the ticket window turns on: 王师傅 asks for an ID card you do not have and a 护照
# is the answer, and until now both halves of that exchange arrived unread. 扫码 and 现金 are the two
# ways to pay at the till in the 超市 and they are the whole of 小林's second question.
#
# 里面 has to be here for 面 to be allowed to exist. 面 alone is the noun for noodles and every
# compound already had a row, but 里面 did not, so a bare 面 would have split the five 里面 lines in
# the game into 里 + 面 — "inside" plus "noodles" — and read them out that way with a straight face.
# 拿铁 and 手续 are the same trap sprung by 拿 and 手: without them the café board reads "take iron"
# and the check-in desk reads "hand continue". Any time a single character goes in, the compounds it
# lives inside have to be checked, because greedy matching only protects the ones already listed.
# The three that just became askable. None of them was here before, and none of them could have
# been: a dictionary row is only ever reached through a thing you walk up to, and until now the
# shop's banner and every one of the forty signs on the parade opposite were glyphs with nothing
# attached — writing the player could look at and never question.
#
# 面包房 and 面包 both need whole rows, and the reason is 面. That is already in the list as noodles,
# and greedy longest-match only protects the compounds that are listed — so with 面包 alone a bakery
# would read 面包 + 房, and with neither of them it would come out as noodles, wrap, room. Any time a
# single character is in the list, the words it lives inside have to be checked.
天天低价|tiāntiān dījià|low prices every day (what the banner says)|money
天天|tiāntiān|every day|time
药店|yàodiàn|pharmacy, chemist's|medical
# ---- 药店 inside the chemist's. The street has advertised this shop since the parade got its signs
# and there was no way in; now there is, and this is the vocabulary of the one errand nobody plans.
# Being ill is the most predictable reason a person ends up speaking a language they are still
# learning, and it was the one situation this game could not say a word about: 疼, 感冒 and 发烧 were
# all missing, so a player could describe every object in their flat and not that they felt unwell.
药|yào|medicine|medical
感冒药|gǎnmàoyào|cold medicine|medical
感冒|gǎnmào|a cold; to catch a cold|medical
发烧|fāshāo|to have a fever|medical
头疼|tóuténg|a headache; head hurts|medical
嗓子疼|sǎngziténg|a sore throat|medical
肚子疼|dùziténg|stomach ache|medical
咳嗽|késou|to cough|medical
生病|shēngbìng|to fall ill|medical
疼|téng|to hurt, sore|medical
药方|yàofāng|a prescription|medical
创可贴|chuāngkětiē|sticking plaster|medical
口罩|kǒuzhào|face mask|medical
体温计|tǐwēnjì|thermometer|medical
药剂师|yàojìshī|pharmacist|medical
医生|yīshēng|doctor|medical
医院|yīyuàn|hospital|medical
# ---- 北京市仁和医院. Public-hospital survival vocabulary, in the order a visit teaches it:
# registration and triage, departments, tests, treatment, then the ward and discharge.
挂号|guàhào|to register for a medical appointment|medical
挂号处|guàhàochù|registration desk|medical
自助挂号机|zìzhù guàhào jī|self-service registration machine|medical
挂号条|guàhào tiáo|registration slip|medical
收费处|shōufèichù|cashier, payment desk|medical
门诊|ménzhěn|outpatient care|medical
门诊大厅|ménzhěn dàtīng|outpatient hall|medical
分诊|fēnzhěn|triage|medical
分诊台|fēnzhěntái|triage desk|medical
导诊台|dǎozhěntái|patient guidance desk|medical
护士|hùshi|nurse|medical
护士站|hùshizhàn|nurses' station|medical
病人|bìngrén|patient|medical
患者|huànzhě|patient (formal)|medical
患儿|huàn'ér|child patient|medical
家属|jiāshǔ|patient's family member|medical
家长|jiāzhǎng|parent, guardian|social
候诊|hòuzhěn|to wait to be seen|medical
候诊区|hòuzhěnqū|clinic waiting area|medical
候诊椅|hòuzhěnyǐ|waiting-room chair|medical
叫号|jiàohào|to call a queue number|medical
叫号屏|jiàohàopíng|queue-number display|medical
就诊须知|jiùzhěn xūzhī|patient instructions|medical
楼层索引|lóucéng suǒyǐn|floor directory
指示牌|zhǐshìpái|direction sign
内科|nèikē|internal medicine|medical
外科|wàikē|surgery department|medical
儿科|érkē|paediatrics|medical
口腔科|kǒuqiāngkē|dentistry|medical
呼吸内科|hūxī nèikē|respiratory medicine|medical
普通外科|pǔtōng wàikē|general surgery|medical
儿童保健|értóng bǎojiàn|child health clinic|medical
口腔诊室|kǒuqiāng zhěnshì|dental consulting room|medical
专家门诊|zhuānjiā ménzhěn|specialist clinic|medical
急诊|jízhěn|emergency department|medical
抢救室|qiǎngjiùshì|resuscitation room|medical
观察床|guānchá chuáng|observation bed|medical
除颤仪|chúchànyí|defibrillator|medical
轮椅|lúnyǐ|wheelchair|medical
体温|tǐwēn|body temperature|medical
血压|xuèyā|blood pressure|medical
血压计|xuèyājì|blood-pressure monitor|medical
病历|bìnglì|medical record|medical
扭伤|niǔshāng|sprain, to twist and injure|medical
牙疼|yáténg|toothache|medical
检查|jiǎnchá|medical examination, to examine|medical
口腔检查|kǒuqiāng jiǎnchá|dental examination|medical
检查室|jiǎncháshì|examination room|medical
检查床|jiǎnchá chuáng|examination couch|medical
化验|huàyàn|laboratory test, analysis|medical
抽血|chōuxuè|to draw blood|medical
采血管|cǎixuèguǎn|blood collection tube|medical
离心机|líxīnjī|centrifuge|medical
CT机|CT jī|CT scanner|medical
X光|X guāng|X-ray|medical
X光片|X guāng piàn|X-ray film|medical
超声|chāoshēng|ultrasound|medical
超声探头|chāoshēng tàntóu|ultrasound probe|medical
治疗|zhìliáo|medical treatment, to treat|medical
治疗室|zhìliáoshì|treatment room|medical
治疗车|zhìliáochē|treatment trolley|medical
监护仪|jiānhùyí|patient monitor|medical
输液|shūyè|intravenous infusion|medical
输液架|shūyèjià|IV stand|medical
药房|yàofáng|hospital dispensary|medical
处方|chǔfāng|medical prescription|medical
药品冰箱|yàopǐn bīngxiāng|medicine refrigerator|medical
医疗废物|yīliáo fèiwù|medical waste|medical
住院|zhùyuàn|to be admitted to hospital|medical
病房|bìngfáng|hospital ward|medical
病床|bìngchuáng|hospital bed|medical
探视|tànshì|to visit a patient|medical
探视区|tànshìqū|hospital visiting area|medical
隔离病房|gélí bìngfáng|isolation room|medical
手术|shǒushù|operation, surgery|medical
手术室|shǒushùshì|operating theatre|medical
刷手池|shuāshǒuchí|surgical scrub sink|medical
复苏室|fùsūshì|recovery room|medical
麻醉机|mázuìjī|anaesthesia machine|medical
无菌|wújūn|sterile|medical
康复|kāngfù|rehabilitation, to recover|medical
康复师|kāngfùshī|rehabilitation therapist|medical
康复训练|kāngfù xùnliàn|rehabilitation exercise|medical
康复自行车|kāngfù zìxíngchē|rehabilitation bicycle|medical
训练台阶|xùnliàn táijiē|rehabilitation steps|medical
出院|chūyuàn|to be discharged from hospital|medical
出院处|chūyuànchù|discharge desk|medical
洗手液|xǐshǒuyè|liquid soap, hand sanitiser|home
暖水瓶|nuǎnshuǐpíng|vacuum flask, thermos|home
充电插座|chōngdiàn chāzuò|charging socket
柜台|guìtái|counter
面包房|miànbāofáng|bakery|food
面包|miànbāo|bread|food
# ================================================================ 大超市 the hypermarket
#
# The corner shop off the alley sells five things. That is right for a 便利店 on the ground floor of
# a walk-up, and it is why this list exists separately: a supermarket is the richest vocabulary
# environment in ordinary life — every aisle is a domain, every item is a countable noun with a
# measure word attached — and a game about learning to live in a Chinese city that could not name a
# cucumber was leaving the easiest teaching in the language on the floor.
#
# Grouped by the department they are found in, because that is how they are learned: you do not
# learn 茄子 from a list, you learn it from the sign above the box it is in.
#
# ---- 蔬菜 the vegetables
西红柿|xīhóngshì|tomato|food
黄瓜|huánggua|cucumber|food
土豆|tǔdòu|potato|food
茄子|qiézi|aubergine|food
青椒|qīngjiāo|green pepper|food
胡萝卜|húluóbo|carrot|food
洋葱|yángcōng|onion|food
大蒜|dàsuàn|garlic|food
生姜|shēngjiāng|ginger|food
葱|cōng|spring onion|food
蘑菇|mógu|mushroom|food
菠菜|bōcài|spinach|food
# ---- 水果 the fruit
苹果|píngguǒ|apple|food
香蕉|xiāngjiāo|banana|food
橘子|júzi|tangerine|food
葡萄|pútao|grapes|food
西瓜|xīguā|watermelon|food
梨|lí|pear|food
桃子|táozi|peach|food
草莓|cǎoméi|strawberry|food
# ---- 肉 the butcher's counter
猪肉|zhūròu|pork|food
牛肉|niúròu|beef|food
鸡肉|jīròu|chicken|food
排骨|páigǔ|pork ribs|food
肉馅|ròuxiàn|mince|food
香肠|xiāngcháng|sausage|food
# ---- 海鲜 the fish tanks
鱼|yú|fish|food
虾|xiā|prawn, shrimp|food
螃蟹|pángxiè|crab|food
# ---- 乳制品 the dairy cabinet
酸奶|suānnǎi|yoghurt|food
奶酪|nǎilào|cheese|food
黄油|huángyóu|butter|food
# ---- 冷冻 the freezers
饺子|jiǎozi|dumplings|food
汤圆|tāngyuán|glutinous rice balls|food
# ---- 米面粮油 rice, flour, oil and what goes with them
面条|miàntiáo|noodles|food
油|yóu|cooking oil|food
酱油|jiàngyóu|soy sauce|food
醋|cù|vinegar|food
盐|yán|salt|food
味精|wèijīng|MSG|food
# ---- 零食 the snack aisle
饼干|bǐnggān|biscuits|food
薯片|shǔpiàn|crisps|food
糖果|tángguǒ|sweets|food
瓜子|guāzǐ|melon seeds|food
茶叶|cháyè|tea leaves|food
# ---- 日用品 household
纸巾|zhǐjīn|tissues|home
洗衣粉|xǐyīfěn|washing powder|home
垃圾袋|lājīdài|bin bags|home
# ---- 熟食 the hot counter
熟食|shúshí|cooked food, deli|food
烤鸡|kǎojī|roast chicken|food
# ---- the departments themselves, as they are written on the hanging signs
生鲜|shēngxiān|fresh food|food
冷冻|lěngdòng|frozen|food
日用品|rìyòngpǐn|household goods|home
蔬菜|shūcài|vegetables|food
零食|língshí|snacks|food
酒水|jiǔshuǐ|drinks|food
# ---- 买东西 doing the shop. The words the transaction is made of, which the corner shop's single
# till never needed: weighing your own vegetables, queueing, paying and being handed the receipt.
称重|chēngzhòng|to weigh (produce, yourself)|food
标签|biāoqiān|label, the printed sticker
结账|jiézhàng|to settle up, to check out|money
会员卡|huìyuánkǎ|membership card|money
小票|xiǎopiào|the receipt|money
塑料袋|sùliàodài|plastic bag
盒|hé|a box of|number
袋|dài|a bag of|number
打折|dǎzhé|to be discounted|money
促销|cùxiāo|on offer, promotion|money
售货员|shòuhuòyuán|shop assistant|social

# ---- inside the 面包房. The other shop on the parade whose name the street teaches and which had
# no door in it. What a bakery is for, linguistically, is buying a countable thing by the piece and
# being told what is fresh — 几个, 刚出炉, 甜 or 咸 — which is a different transaction from the
# 超市's basket and till, and the game had no room that asked for it.
豆沙包|dòushābāo|red bean bun|food
肉松面包|ròusōng miànbāo|pork floss bread|food
吐司|tǔsī|sliced white loaf, toast|food
蛋挞|dàntà|egg tart|food
烤|kǎo|to bake, to roast|food
烤箱|kǎoxiāng|oven|home
托盘|tuōpán|tray
夹子|jiāzi|tongs
甜|tián|sweet|food
咸|xián|salty, savoury|food
刚出炉|gāng chūlú|just out of the oven|food
老板娘|lǎobǎnniáng|the woman who runs the shop|social
面粉|miànfěn|flour|food
牛奶|niúnǎi|milk|food
拿铁|nátiě|latte|food
手续|shǒuxù|formalities, the paperwork
身份证|shēnfènzhèng|ID card
扫码|sǎomǎ|to scan the code (to pay)|money
现金|xiànjīn|cash|money
表格|biǎogé|spreadsheet, form|work
计划|jìhuà|plan|work
面|miàn|noodles|food
里面|lǐmiàn|inside|direction
后面|hòumiàn|behind, round the back|direction
路|lù|road, way|direction
家|jiā|home, family|home
电|diàn|electricity, power, battery|home
鸡蛋|jīdàn|egg|food
大厅|dàtīng|hall, concourse
卫生间|wèishēngjiān|toilet, washroom|home
窗口|chuāngkǒu|window, service counter
篮子|lánzi|basket
笔记|bǐjì|notes
声音|shēngyīn|sound, voice
列车|lièchē|train, the service|transport
号线|hàoxiàn|line (as in 二号线, Line 2)|transport
班|bān|a scheduled run, a shift
操场|cāochǎng|sports ground, playground
禁止|jìnzhǐ|prohibited
下一位|xià yí wèi|next, please|social
一路平安|yílù píng'ān|safe journey|social
不好意思|bù hǎoyìsi|sorry, excuse me|social
活儿|huór|a job, a piece of work|work
先生|xiānsheng|sir, Mr|social
马克|Mǎkè|Mark — the name you give people
南京|Nánjīng|Nanjing
西安|Xī'ān|Xi'an
民航售票处|mínháng shòupiàochù|the civil aviation ticket office|transport
买卡|mǎi kǎ|to buy a card|transport
微波炉|wēibōlú|microwave oven|home

# ---- the people standing in these rooms
#
# 棋友 and 行人 are here because of the numbered roster. The park's chess players are 棋友一 and
# 棋友二 and the pavement has 行人一 and 行人二, and introduce() now falls back from a numbered hz to
# the word behind it — so these two became teachable the moment that fallback existed, and were
# the only base words in the whole numbered set still missing from the list.
棋友|qíyǒu|someone you play chess with|social
行人|xíngrén|pedestrian, someone on foot|social

#
# These are not vocabulary choices, they are a repair. game.js introduces a word by the exact hz of
# the thing you touched, so an NPC whose hz is not a key in here teaches you nothing when you walk up
# and talk to them — no new-word card, no notebook entry, silence. All nine below were reachable and
# missing. The numbered ones are still broken and cannot be fixed from this file: 乘客二 through
# 乘客十五, 棋友一, 大妈二, 游客二, 同事二, 地勤二 and 行人一 are separate exact keys, and putting
# fifteen rows in here for 乘客二…乘客十五 would be dead weight. That one is game.js's to fix.
乘客|chéngkè|passenger|social
顾客|gùkè|customer|social
客人|kèrén|guest, customer|social
摊主|tānzhǔ|stall holder|social
大爷|dàye|uncle — an older man|social
快递员|kuàidìyuán|delivery courier|social
扫地的|sǎodì de|the street sweeper|social
登机员|dēngjīyuán|boarding agent|social
照相的|zhàoxiàng de|the photographer|social

# ---- 天气 the weather, and the seasons it happens in
#
# These are not scenery words. weather.js teaches them the way nothing else in this game can: it
# starts snowing on you wherever you happen to be standing, and 下雪 is introduced at the moment
# the sky is already explaining what it means. So every kind the roll can produce needs a row —
# a kind whose word is missing teaches nothing at all on the one day it comes up, and there may
# not be another for a fortnight.
#
# 晴天, 阴天 and 多云 all end in a character already in the list (天 day/sky, 云 was not) and are
# whole words here for the same reason 面包 is: greedy longest-match only protects what is listed,
# and without 晴天 the chip would read out as 晴 + 天 — "fine" plus "day" — which is very nearly
# right and therefore worse than wrong.
晴天|qíngtiān|clear, fine weather|weather
多云|duōyún|cloudy|weather
阴天|yīntiān|overcast|weather
云|yún|cloud|weather
雷雨|léiyǔ|thunderstorm|weather
打雷|dǎléi|to thunder|weather
下雪|xiàxuě|to snow|weather
雪|xuě|snow|weather
雾|wù|fog, mist|weather
刮风|guāfēng|to be windy|weather
风|fēng|wind|weather
# The kind that is most particular to this city and was the one kind with no row. js/weather.js:88
# makes 沙尘暴 a real roll — its own cast, its own dust, its own note — and js/game.js:14726 only
# introduces a weather word if Vocab.get returns something, so without this line the sky could put
# a sandstorm over the whole map and teach nothing on the one morning it happened. Found by lane 12.
沙尘暴|shāchénbào|sandstorm|weather
伞|sǎn|umbrella|weather
雨伞|yǔsǎn|umbrella|weather
# 冷 and 凉快 are not repeated here: both are already in the time-and-comfort block above, and a
# second row would win the parse silently. .dictcheck.js is what caught it.
热|rè|hot|weather
暖和|nuǎnhuo|warm, mild|weather
湿|shī|wet, damp|weather
干|gān|dry|weather
春天|chūntiān|spring|weather
秋天|qiūtiān|autumn|weather
季节|jìjié|season|weather
温度|wēndù|temperature|weather
度|dù|degree|weather
路滑|lù huá|the road is slippery|weather

# ---- 夜市 the night market
#
# Six stalls, and the words are the food rather than the furniture, because the food is what you
# point at. 串 has to be a row of its own as well as inside 羊肉串: it is the measure word you
# order in — 来五串 — and a learner meets it as a bare character on a price board before they ever
# meet it in a compound.
#
# 摊子 and 摊主 both exist because the stall and the person behind it are different words and the
# lane wants both: 摊主 was already in the list from the market on the parade, 摊子 was not, and
# without it the canopy the game tags 摊子 would have taught nothing.
夜市|yèshì|night market|food
小吃|xiǎochī|street food, snacks|food
摊子|tānzi|stall|food
烧烤|shāokǎo|food grilled over charcoal|food
串|chuàn|skewer (and the measure word for one)|food
羊肉串|yángròuchuàn|lamb skewer|food
羊肉|yángròu|mutton, lamb|food
炒面|chǎomiàn|fried noodles|food
炒|chǎo|to stir-fry|food
糖葫芦|tánghúlu|candied haws on a stick|food
糖|táng|sugar, sweets|food
价钱|jiàqian|price|money
斤|jīn|jin — half a kilo|number
辣|là|spicy, hot|food
孜然|zīrán|cumin|food
热闹|rènao|lively, bustling
# 逛 is not repeated: it is already in the shopping block above.

# ---- 购物中心 the shopping mall
购物中心|gòuwù zhōngxīn|shopping centre, mall
商场|shāngchǎng|department store, shopping mall
服务台|fúwùtái|information or service desk
商场地图|shāngchǎng dìtú|mall directory|direction
楼层导览|lóucéng dǎolǎn|floor guide|direction
集章册|jízhāngcè|stamp passport, stamp booklet
中庭活动|zhōngtíng huódòng|atrium event
喷泉|pēnquán|fountain
扶梯|fútī|escalator|direction
电梯|diàntī|lift, elevator|direction
服装店|fúzhuāngdiàn|clothing shop|clothing
服装|fúzhuāng|clothing, apparel|clothing
试穿|shìchuān|to try clothes on|clothing
试衣间|shìyījiān|fitting room|clothing
电子产品|diànzǐ chǎnpǐn|electronic products
数码|shùmǎ|digital technology
平板|píngbǎn|tablet computer
游戏机|yóuxìjī|game console
美食广场|měishí guǎngchǎng|food court|food
电影院|diànyǐngyuàn|cinema
一号厅|yī hào tīng|screen one
游戏厅|yóuxìtīng|arcade, games hall
儿童乐园|értóng lèyuán|children's play area
休息区|xiūxiqu|rest area
导购员|dǎogòuyuán|sales assistant|social
保安|bǎo'ān|security guard|social
二楼|èrlóu|second floor|direction
美妆店|měizhuāngdiàn|cosmetics shop
化妆品|huàzhuāngpǐn|cosmetics
口红|kǒuhóng|lipstick
运动店|yùndòngdiàn|sports shop
运动鞋|yùndòngxié|trainers, sports shoes|clothing
篮球|lánqiú|basketball
跑步机|pǎobùjī|treadmill
家居店|jiājūdiàn|home furnishings shop|home
家具|jiājù|furniture|home
书店|shūdiàn|bookshop
杂志|zázhì|magazine
# The mall grew to three floors, and every new fixture on them needs its row here before it can be
# walked up to at all — see the note at the top of this file, and .thingcheck.js.
一楼|yīlóu|ground floor, level one|direction
三楼|sānlóu|third floor|direction
四楼|sìlóu|fourth floor|direction
天桥|tiānqiáo|footbridge, walkway|direction
珠宝店|zhūbǎodiàn|jewellery shop
项链|xiàngliàn|necklace
鞋店|xiédiàn|shoe shop|clothing
鞋|xié|shoes|clothing
眼镜店|yǎnjìngdiàn|optician's
眼镜|yǎnjìng|glasses
验光师|yànguāngshī|optometrist|social
花店|huādiàn|flower shop
玫瑰|méigui|rose
向日葵|xiàngrìkuí|sunflower
盆栽|pénzāi|potted plant|home
咖啡店|kāfēidiàn|café|food
咖啡豆|kāfēidòu|coffee beans|food
奶茶|nǎichá|milk tea, bubble tea|food
取款机|qǔkuǎnjī|cash machine, ATM|money
自动售货机|zìdòng shòuhuòjī|vending machine
旋转木马|xuánzhuǎn mùmǎ|carousel
玩具店|wánjùdiàn|toy shop
玩具|wánjù|toy
宠物店|chǒngwùdiàn|pet shop
小狗|xiǎogǒu|puppy
面馆|miànguǎn|noodle shop|food
川味小馆|chuānwèi xiǎoguǎn|Sichuan eatery|food
火锅|huǒguō|hot pot|food
烧腊|shāolà|Cantonese roast meats|food
麻婆豆腐|mápó dòufu|mapo tofu|food
回锅肉|huíguōròu|twice-cooked pork|food
水煮鱼|shuǐzhǔyú|fish poached in chilli oil|food
小碗面|xiǎo wǎn miàn|small bowl of noodles|food
加肉牛肉面|jiā ròu niúròu miàn|beef noodles with extra meat|food
毛肚套餐|máodǔ tàocān|tripe hot-pot set|food
鸭肠套餐|yācháng tàocān|duck-intestine hot-pot set|food
叉烧饭|chāshāo fàn|char siu rice|food
烧鸭饭|shāoyā fàn|roast duck rice|food
双拼饭|shuāngpīn fàn|two-meat rice plate|food
珍珠奶茶|zhēnzhū nǎichá|pearl milk tea|food
芋圆奶茶|yùyuán nǎichá|taro-ball milk tea|food
柠檬茶|níngméng chá|lemon tea|food
不辣|bú là|not spicy|food
微辣|wēi là|mildly spicy|food
中辣|zhōng là|medium spicy|food
特辣|tè là|extra spicy|food
细面|xì miàn|thin noodles|food
二细|èr xì|medium-thin noodles|food
韭叶|jiǔyè|chive-leaf-width noodles|food
宽面|kuān miàn|wide noodles|food
清汤|qīngtāng|clear broth|food
鸳鸯|yuānyāng|half spicy and half clear|food
原味|yuánwèi|original flavour|food
少汁|shǎo zhī|a little sauce|food
加汁|jiā zhī|extra sauce|food
加辣|jiā là|add chilli|food
无糖|wú táng|no sugar|food
三分糖|sān fēn táng|thirty per cent sugar|food
半糖|bàn táng|half sugar|food
正常糖|zhèngcháng táng|regular sugar|food
爆米花|bàomǐhuā|popcorn|food
娃娃机|wáwájī|claw machine
投币|tóubì|to insert a coin
兑奖|duìjiǎng|to redeem a prize
赛车|sàichē|racing game, racing car
跳舞机|tiàowǔjī|dance arcade machine
中间|zhōngjiān|the middle|direction
护盾|hùdùn|shield
栏杆|lángān|railing, balustrade
甜品|tiánpǐn|dessert|food
甜品店|tiánpǐndiàn|dessert shop|food
面包店|miànbāodiàn|bakery|food
餐厅|cāntīng|restaurant, dining room|food
银幕|yínmù|cinema screen
排片表|páipiànbiǎo|screening schedule|time
电影票|diànyǐngpiào|cinema ticket
买单|mǎidān|to pay the bill|money
外套|wàitào|coat, jacket|clothing
毛衣|máoyī|jumper, sweater|clothing
裙子|qúnzi|skirt|clothing
墨镜|mòjìng|sunglasses|clothing
词典|cídiǎn|dictionary
小说|xiǎoshuō|novel
蛋糕|dàngāo|cake|food
北京城市画廊|Běijīng chéngshì huàláng|Beijing City Gallery
店员|diànyuán|shop assistant|social
维修师傅|wéixiū shīfu|repair technician|social
# ---- ten goods you could see on a shelf and never learn the word for
#
# The jewellers, the pet shop and the clothes shop each sell things whose names had no row here, and
# a headword with no row cannot be a label at all: .thingcheck.js:131 fails any 'A.th' whose word
# has no 'Vocab.get'. So the counter at js/mall-jewel.js said 手镯 · 耳环 · 戒指 · 手表 in gold leaf
# on four brass plates and not one of them could be walked up to; the shop worked around it with 件,
# the measure word, which at least says *something* but is not the same as pressing Q on 戒指.
# The request has been sitting in that file's own comment (js/mall-jewel.js:1469-1478) waiting for
# somebody to hold this file long enough to transcribe it. MALL-TODO items 19, 20 and 21.
#
# 牵引绳 is the one worth a second look: 绳 alone is rope and 牵引 is to pull or tow, so the compound
# has to be its own row or the parser reads a dog lead as a towing cable.
耳环|ěrhuán|earrings|clothing
手镯|shǒuzhuó|bangle, bracelet|clothing
戒指|jièzhi|ring|clothing
手表|shǒubiǎo|watch|clothing
衬衫|chènshān|shirt|clothing
裤子|kùzi|trousers|clothing
围巾|wéijīn|scarf|clothing
大衣|dàyī|overcoat|clothing
狗粮|gǒuliáng|dog food
猫粮|māoliáng|cat food
牵引绳|qiānyǐnshéng|lead, leash
# ---- the stock of the six shops that had a till and no catalogue
#
# 书店, 家居店, 玩具店, 甜品店, 美妆店 and 运动店 were walk-in rooms you could not buy anything in.
# Their goods lists went into MALL_GOODS; these are the rows those goods need, because the till
# reads the name back in 我要这个X。 and 一共X块。 and a word with no row here has no reading.
#
# 球 has to be its own row for 篮球 and 球拍 to be parsed rather than guessed at, the same way 面
# earns its place under the counter block above. 娃娃 is here as the doll; 娃娃机, the claw machine
# it comes out of, is already above and is the longer match, so the two do not collide.
笔记本|bǐjìběn|notebook
明信片|míngxìnpiàn|postcard
杯子|bēizi|cup, mug|home
盘子|pánzi|plate|home
拖把|tuōbǎ|mop|home
积木|jīmù|building blocks
娃娃|wáwa|doll
球|qiú|ball
拼图|pīntú|jigsaw puzzle
遥控车|yáokòngchē|remote-control car
冰淇淋|bīngqílín|ice cream|food
布丁|bùdīng|pudding|food
豆花|dòuhuā|tofu pudding|food
蛋糕卷|dàngāojuǎn|swiss roll|food
面霜|miànshuāng|face cream
面膜|miànmó|face mask
跑鞋|pǎoxié|running shoes|clothing
球拍|qiúpāi|racket
瑜伽垫|yújiādiàn|yoga mat
水壶|shuǐhú|water bottle, flask|home
运动服|yùndòngfú|tracksuit, sportswear|clothing

# ---- 大堂 the apartment lobby
大堂|dàtáng|lobby|home
门斗|méndǒu|entrance vestibule, porch
门卫室|ménwèishì|security lodge, porter's room
门禁|ménjìn|entry access system, door lock|home
信箱|xìnxiāng|letterbox, mailbox|home
快递柜|kuàidìguì|parcel locker|home
包裹|bāoguǒ|parcel, package|home
取件码|qǔjiànmǎ|collection code|home
通知栏|tōngzhīlán|notice board
发财树|fācáishù|money tree
安全出口|ānquán chūkǒu|emergency exit|direction
楼梯|lóutī|stairs, staircase|direction
消防栓|xiāofángshuān|fire hydrant

# ---- words the rest of the building asks for. Every one of these is the headword of a thing that
# already exists in js/home-*.js with no row here, and Vocab.get has no fallback: walking up to
# (no backticks in this file, ever — RAW is a template literal and one here ends it mid-table,
#  which parses the rest of the word list as JavaScript and takes the whole game down)
# one of them is an uncaught TypeError and the "THE GAME DID NOT LOAD" overlay. Found by
# .thingcheck.js. They belong to the corridor, the lift car and the rooms, and are written here
# rather than left for whoever owns each file, because the cost of the gap is the whole game.
走廊|zǒuláng|corridor, hallway|direction
婴儿车|yīng'érchē|pushchair, pram
电表|diànbiǎo|electricity meter|home
消火栓|xiāohuǒshuān|fire hydrant (the wording used inside a building)
按钮|ànniǔ|button
广告|guǎnggào|advertisement
拖鞋|tuōxié|slippers|clothing
热水壶|rèshuǐhú|vacuum flask, hot-water kettle|home
春联|chūnlián|spring couplets, the red New Year scrolls beside a door|home
日历|rìlì|calendar|time
照片|zhàopiàn|photograph|home

# ---- 三楼 retired couple's flat
门牌|ménpái|doorplate, door number|home
鞋柜|xiéguì|shoe cabinet|home
挂历|guàlì|wall calendar|time
花镜|huājìng|reading glasses
收音机|shōuyīnjī|radio|home
柜子|guìzi|cupboard, cabinet|home
书法|shūfǎ|calligraphy
象棋|xiàngqí|Chinese chess
奖状|jiǎngzhuàng|certificate of merit
饭桌|fànzhuō|dining table|home
阳台|yángtái|balcony|home
君子兰|jūnzǐlán|clivia plant
画眉|huàméi|Chinese hwamei, a songbird
鸟笼|niǎolóng|birdcage
小葱|xiǎocōng|spring onion, scallion|food
晾衣杆|liàngyīgān|clothes-drying pole|home
电饭锅|diànfànguō|rice cooker|home
毛笔|máobǐ|calligraphy brush
砚台|yàntái|inkstone

# ---- 四楼 property office and activity room
物业|wùyè|property management|home
收费标准|shōufèi biāozhǔn|fee schedule|money
公章|gōngzhāng|official seal
钥匙|yàoshi|key|home
公告栏|gōnggàolán|notice board
垃圾分类|lājī fēnlèi|waste sorting|home
活动室|huódòngshì|activity room
乒乓球台|pīngpāngqiútái|table-tennis table
麻将|májiàng|mahjong
舞台|wǔtái|stage
电子琴|diànzǐqín|electronic keyboard
横幅|héngfú|banner
报纸|bàozhǐ|newspaper
党群服务站|dǎngqún fúwùzhàn|Party and community service centre

# ---- 六楼 shared student flat
筷子|kuàizi|chopsticks|home
上下铺|shàngxiàpù|upper and lower bunks|home
卧室|wòshì|bedroom|home
隔断房|géduànfáng|partitioned room|home
便利贴|biànlìtiē|sticky note
考研|kǎoyán|postgraduate entrance exam preparation
客厅|kètīng|living room|home
晾衣架|liàngyījià|clothes-drying rack|home
泡面|pàomiàn|instant noodles|food
合租|hézū|to share a rented home|home

# ---- 七楼 teacher's flat
书房|shūfáng|study, home office|home
作业本|zuòyèběn|exercise book
红笔|hóngbǐ|red pen
教案|jiào'àn|lesson plan
地球仪|dìqiúyí|globe
粉笔|fěnbǐ|chalk
字画|zìhuà|calligraphy and paintings
书案|shū'àn|writing desk
宣纸|xuānzhǐ|xuan paper, calligraphy paper
锦旗|jǐnqí|silk banner of thanks
茶盘|chápán|tea tray|home
茶壶|cháhú|teapot|home
洗衣机|xǐyījī|washing machine|home
电饭煲|diànfànbāo|rice cooker|home
热水瓶|rèshuǐpíng|thermos flask|home
印章|yìnzhāng|seal, stamp
放大镜|fàngdàjìng|magnifying glass
花盆|huāpén|flowerpot|home

# ---- 八楼 chef's flat
炒锅|chǎoguō|wok|home
锅铲|guōchǎn|wok spatula|home
灶台|zàotái|stove, cooktop|home
火|huǒ|fire, flame
抽油烟机|chōuyóuyānjī|extractor hood, range hood|home
蒸锅|zhēngguō|steamer pot|home
高压锅|gāoyāguō|pressure cooker|home
菜刀|càidāo|kitchen knife, cleaver|home
案板|ànbǎn|chopping board|home
八角|bājiǎo|star anise|food
辣椒|làjiāo|chilli pepper|food
蒜|suàn|garlic|food
姜|jiāng|ginger|food
保温桶|bǎowēntǒng|insulated food container|home
大米|dàmǐ|uncooked rice|food
厨师服|chúshīfú|chef's uniform|clothing
证书|zhèngshū|certificate
腊肉|làròu|cured pork, Chinese bacon|food
泡菜|pàocài|pickled vegetables|food
电风扇|diànfēngshàn|electric fan|home
门帘|ménlián|door curtain|home

# ---- 九楼 newlyweds' flat
囍|xǐ|double happiness symbol
# Drawn twice on this floor before it was a word — 新婚之喜 on the door at js/home-f9.js:644 and
# 新婚快乐 on the gift box at :1589 — and it is the floor's own label in js/game.js. Greedy
# longest-match needs the whole compound: 新 and 婚 apart read as "new" plus "to marry".
新婚|xīnhūn|newly married, newlywed|home
纸箱|zhǐxiāng|cardboard box
红包|hóngbāo|red envelope|money
婚纱照|hūnshāzhào|wedding photograph
喜糖|xǐtáng|wedding sweets|food
灯泡|dēngpào|light bulb|home
空|kōng|empty
说明书|shuōmíngshū|instruction manual
气泡膜|qìpàomó|bubble wrap
储藏室|chǔcángshì|storage room|home
热水器|rèshuǐqì|water heater|home
油烟机|yóuyānjī|extractor hood, range hood|home

# ---- 十楼 flat under renovation
装修|zhuāngxiū|renovation, to renovate|home
水泥|shuǐní|cement
沙子|shāzi|sand
瓷砖|cízhuān|ceramic tile
电线|diànxiàn|electrical wire
梯子|tīzi|ladder
油漆|yóuqī|paint
工具|gōngjù|tools
灰桶|huītǒng|mortar bucket
塑料布|sùliàobù|plastic sheeting
安全帽|ānquánmào|hard hat
保温杯|bǎowēnbēi|insulated mug|home
装修许可证|zhuāngxiū xǔkězhèng|renovation permit
防盗门|fángdàomén|security door|home
手推车|shǒutuīchē|handcart, trolley

# ---- 十一楼 residential floor
福|fú|good fortune, the fu character
小心地滑|xiǎoxīn dì huá|caution: slippery floor
水泵|shuǐbèng|water pump
电表箱|diànbiǎoxiāng|electricity meter box|home
屋顶|wūdǐng|roof|home
挂钟|guàzhōng|wall clock|time
凉席|liángxí|cooling mat|home

# ---- 十二楼 roof
女儿墙|nǚ'érqiáng|parapet wall
砖|zhuān|brick
太阳能|tàiyángnéng|solar energy
水箱|shuǐxiāng|water tank
天线|tiānxiàn|antenna, aerial
避雷针|bìléizhēn|lightning rod

# ---- the tower's walk-up things that had no row here at all.
# Every headword below is registered by a js/home-*.js module as a thing you can stand in front
# of, and had no row, so the flat, the roof and the 物业 window all carried objects a learner
# could point at and learn nothing from. Not a crash any more (see .thingcheck.js:1-22), just the
# emptiest possible version of this game.
#
# One thing to know before trusting the count: node .dictcheck.js --home scans for th( and thing(
# case-sensitively (.dictcheck.js:211), and the tower's own modules mostly use the TH( alias. It
# reported 17 of these. The case-insensitive join finds 24 — 地漏, 灰尘, 平面图, 档案, 意见箱,
# 借书 and 棋牌 are real TH() registrations it has never named. Widening that regex is lane 1's.
地漏|dìlòu|floor drain|home
剩菜|shèngcài|leftovers|food
门垫|méndiàn|doormat|home
挂钩|guàgōu|hook, coat hook|home
凳|dèng|stool|home
对讲|duìjiǎng|door intercom|home
石膏板|shígāobǎn|plasterboard|home
工人|gōngrén|a worker, one of the men on the job|social
电钻|diànzuàn|electric drill|home
水平仪|shuǐpíngyí|spirit level, laser level|home
切割机|qiēgējī|cutting machine, tile saw|home
灰尘|huīchén|dust|home
平面图|píngmiàntú|a plan, a site layout drawing|direction
档案|dàng'àn|a file, a personal record|home
意见箱|yìjiànxiāng|suggestions box|home
借书|jiè shū|to borrow a book|home
棋牌|qípái|board games and cards, and the room they are played in|home
锁|suǒ|a lock; to lock|home
鸽子|gēzi|pigeon
杂物|záwù|odds and ends, junk
马扎|mǎzhá|a small folding stool|home
配电箱|pèidiànxiāng|electrical distribution board|home
检修口|jiǎnxiūkǒu|an access hatch|home
储藏|chǔcáng|to store away; storage|home

# ---- 缴费 the bills this building actually charges you.
# 物业 above (:1567) is the office; these are what it collects. HomeLife.BILLS issues them on a
# ten-day cycle, the 物业 window on F4 takes the money, and an unpaid one cuts the hot water — so
# every one of these is read off a 缴费通知 before it is ever glossed.
物业费|wùyèfèi|property management fee|home
水费|shuǐfèi|water charge|home
电费|diànfèi|electricity charge|home
燃气费|ránqìfèi|gas charge|home
取暖费|qǔnuǎnfèi|the winter heating charge|home
欠费|qiànfèi|to be in arrears on a bill|home
燃气|ránqì|gas, piped gas|home

# ---- what is plugged in, and what a tenant puts a hand on.
# These are the objects a 报修 call is about, which is why they have to be words first.
洗碗机|xǐwǎnjī|dishwasher|home
家电|jiādiàn|household appliances|home
花洒|huāsǎ|shower head|home
水龙头|shuǐlóngtóu|tap, faucet|home
插座|chāzuò|power socket|home
开关|kāiguān|a switch; to switch on and off|home
门锁|ménsuǒ|door lock|home
猫眼|māoyǎn|the peephole in a front door|home
纱窗|shāchuāng|insect screen, window screen|home
燃气灶|ránqìzào|gas hob, gas cooker|home
衣架|yījià|coat hanger|home

# ---- the rooms, as a 户型图 labels them and as people say them out loud
玄关|xuánguān|the entrance hall, the space just inside your front door|home
次卧|cìwò|the second bedroom|home

# ---- 家务 the chores. A domestic day has to be about verbs and not only about furniture.
洗衣服|xǐ yīfu|to do the washing|home
晾衣服|liàng yīfu|to hang the washing out to dry|home
倒垃圾|dào lājī|to take the rubbish out|home
拖地|tuōdì|to mop the floor|home
收拾|shōushi|to tidy up, to put in order|home

# ---- the building itself: what is written on it, and what people call its parts
单元|dānyuán|a unit, the stair core a block of flats is divided into|home
单元门|dānyuánmén|the street door of your unit|home
楼道|lóudào|the corridor and stairwell of a block|home
楼梯间|lóutījiān|the stairwell|home
水表|shuǐbiǎo|water meter|home
车棚|chēpéng|the bike shed|home
楼顶|lóudǐng|the roof, the top of the building|home
管理处|guǎnlǐchù|the management office|home
住户|zhùhù|a resident, a household in the block|home
火警|huǒjǐng|fire alarm, a fire emergency|home
安全|ānquán|safe, safety
保洁|bǎojié|cleaning, the block's cleaning service|home
检修|jiǎnxiū|to inspect and repair, maintenance|home
停水|tíngshuǐ|the water is off|home
停电|tíngdiàn|the power is off|home
装修队|zhuāngxiūduì|a decorating crew|home
搬家|bānjiā|to move house|home
租房|zūfáng|to rent a flat|home
中介|zhōngjiè|an agency, an estate agent|home

# ---- things elsewhere in the game that .thingcheck.js reports with no row. Not tower words, and
# here because the join it runs is game-wide and a headword with no row cannot be a label at all.
# 数码城
参数对比|cānshù duìbǐ|a specifications comparison
摄像头|shèxiàngtóu|camera, the camera on a device
试听台|shìtīngtái|a listening bench, a demo station
数据转移|shùjù zhuǎnyí|data transfer
保修|bǎoxiū|warranty, guarantee
维修|wéixiū|repair, servicing
取件|qǔjiàn|to collect a parcel or an order|home
# 眼镜店
验光|yànguāng|an eye test; to test eyesight
镜框|jìngkuàng|spectacle frames
镜片|jìngpiàn|a lens
染色|rǎnsè|to tint, to dye
镀膜|dùmó|a coating; to coat a lens
配镜|pèijìng|to have glasses made up
取镜|qǔjìng|to collect your glasses
试戴|shìdài|to try on
调整|tiáozhěng|to adjust
# 大超市 — four counters that were section headings here and never rows
肉|ròu|meat|food
海鲜|hǎixiān|seafood|food
乳制品|rǔzhìpǐn|dairy|food
米面粮油|mǐmiàn liángyóu|rice, flour and cooking oil, the way the aisle is labelled|food
# 地铁 the platform edge, and what is painted and announced on it
站台|zhàntái|platform|transport
屏蔽门|píngbìmén|platform screen door|transport
黄线|huángxiàn|the yellow line|transport
先下后上|xiān xià hòu shàng|let people off first, then board|transport
末班车|mòbānchē|the last train|transport
值班员|zhíbānyuán|the duty officer|social
失物招领|shīwù zhāolǐng|lost property|transport
隧道|suìdào|tunnel|transport
# 街上
公示栏|gōngshìlán|a public notice board
人行横道|rénxíng héngdào|pedestrian crossing|direction
限速|xiànsù|speed limit|transport

# ---- 银行 the municipal bank branch
# These are walk-up headwords in the banking hall.  Keeping them together makes the branch's
# numbers/forms vocabulary auditable and, more importantly, ensures every labelled service can
# be adopted by game.js without an undefined dictionary row.
银行|yínháng|bank|money
单子|dānzi|form, slip
存款单|cúnkuǎndān|deposit slip|money
取款单|qǔkuǎndān|withdrawal slip|money
取号机|qǔhàojī|queue-ticket machine|number
取号|qǔ hào|to take a queue number|number
号码|hàomǎ|number|number
存款|cúnkuǎn|to deposit money; a deposit|money
取款|qǔkuǎn|to withdraw money; a withdrawal|money
开户|kāihù|to open an account|money
账户|zhànghù|bank account|money
银行卡|yínhángkǎ|bank card|money
密码|mìmǎ|password, PIN|money
插卡|chā kǎ|to insert a card|money
办理|bànlǐ|to handle, process
业务|yèwù|banking service, business|money
出示|chūshì|to present, show
填写|tiánxiě|to fill in
输入|shūrù|to enter, input
金额|jīn'é|amount of money|money
转账|zhuǎnzhàng|to transfer money|money
回单|huídān|transaction receipt|money
柜员|guìyuán|bank teller|social
大堂经理|dàtáng jīnglǐ|lobby manager|social
千|qiān|thousand|number
万|wàn|ten thousand|number
保险箱|bǎoxiǎnxiāng|safe, safe-deposit box|money
保管箱|bǎoguǎnxiāng|safe-deposit box|money
理财|lǐcái|wealth management|money
理财产品|lǐcái chǎnpǐn|wealth-management product|money
利率|lìlǜ|interest rate|money
利息|lìxi|interest|money
基金|jījīn|investment fund|money
风险|fēngxiǎn|risk|money
等候|děnghòu|to wait
贵宾|guìbīn|VIP, honoured guest|social
内部|nèibù|inside; internal area

# ---- 京华大酒店 the Business District landmark and its workplace seams
#
# Almost every row in this section used to be three fields, which meant the biggest single
# building in the game was invisible to the fourth column and could not be staged by dueTopics().
# Tagging it needed a rule rather than a vote, because "hotel" is not one of the twelve and never
# will be: a hotel is not a subject, it is a place several subjects happen in. The rule this
# section is tagged by, and the one a new hotel row should follow:
#
#   direction  the way through the building — lifts, the lobby, the desk you are pointed to
#   work       the rooms the staff work in and the departments they belong to, per the doctrine
#              at the top of this file: work is "the job, the people you do it with, and the
#              rooms it happens in", which is exactly what a linen room is
#   home       the guestroom and everything that happens inside it — its bed, its air
#              conditioning, its towels, and the services that come to its door
#   money      anything that lands on the bill
#   food       meals, and whether they are included
#   time       nights, and the clock the stay is measured by
#   social     the staff you speak to, and the manners you speak to them with
#
# A room that is none of those keeps three fields. 露台 and 水疗 are architecture and a treatment,
# not an errand anybody can be sent on, and a wrong tag is worse than none — see the three rules
# at the top of the file.
京华大酒店|Jīnghuá Dà Jiǔdiàn|Jinghua Grand Hotel
# ---- 酒店 · 饭店 · 宾馆 · 招待所, which are four different buildings in English and one word.
#
# 饭店 is on line 691 with the Bund, glossed "hotel (and, confusingly, restaurant)" and left
# there as a warning with nowhere to teach it. This is the place: the player is standing in a
# 酒店 that is not a 饭店, two doors from a 宾馆 they can compare it against. The distinction is
# register and grade, not size — 酒店 is what a hotel of this class calls itself, 宾馆 is the
# plainer place with the same beds, and 招待所 is the work-unit guesthouse a Chinese speaker over
# fifty will still name without thinking. None is tagged social: the event they key is needing a
# bed, which is home.
# These three are untagged, and that is the whole point of the disambiguation. The notebook is now
# grouped by this column and prints home as 家里 · indoors, which is the player's own flat: a
# building you sleep in for two nights is not that, and none of the twelve is a kind of building.
# Untagged is an answer — see the three rules at the top of the file — and the alternative was
# filing 招待所 under "indoors", which tells the player something false about the word.
酒店|jiǔdiàn|hotel, the grade that calls itself one
宾馆|bīnguǎn|guesthouse hotel, plainer than a 酒店
招待所|zhāodàisuǒ|work-unit guesthouse, the older kind
前台|qiántái|reception, front desk|direction
前台经理|qiántái jīnglǐ|front-office manager|social
礼宾|lǐbīn|concierge service
礼宾部|lǐbīnbù|concierge and bell department|work
礼宾员|lǐbīnyuán|concierge, bell attendant|social
客梯|kètī|passenger lift|direction
服务梯|fúwùtī|service lift|direction
操作盘|cāozuòpán|control panel|direction
轿厢|jiàoxiāng|lift car|direction
电梯门|diàntīmén|lift doors|direction
电梯厅|diàntītīng|lift lobby|direction
落客区|luòkèqū|passenger drop-off zone|direction
酒店前庭|jiǔdiàn qiántíng|hotel forecourt|direction
客房|kèfáng|guestroom|home
客房部|kèfángbù|housekeeping department|work
客房服务|kèfáng fúwù|room service|home
布草间|bùcǎojiān|linen room|work
洗衣房|xǐyīfáng|laundry|work
宴会厅|yànhuìtīng|ballroom, banquet hall|work
工程部|gōngchéngbù|engineering department|work
员工入口|yuángōng rùkǒu|staff entrance|work
水疗|shuǐliáo|spa treatment|money
水疗中心|shuǐliáo zhōngxīn|spa centre|work
行政酒廊|xíngzhèng jiǔláng|executive lounge|work
套房|tàofáng|suite|home
露台|lùtái|terrace|home

# ---- checking in. The grades are the whole of the first conversation: you are asked which one
# you want before you are asked anything else, and 标准间 is the answer nine times in ten.
# 入住 and 订房 are money rather than home for the same reason 退房 and 房价 always were: what you
# do at that desk is a transaction, and the notebook now shows the pair together under 钱 · money
# instead of splitting checking in from checking out across two headings.
入住|rùzhù|to check in|money
订房|dìngfáng|to book a room|money
单人间|dānrénjiān|single room|home
标准间|biāozhǔnjiān|twin room, the standard grade|home
大床房|dàchuángfáng|room with one big bed|home
# The rest of the grades, read off Stay.GRADES in js/stay.js. The booking panel prints these as
# headwords and the room-problem card repeats them, so an untagged gap here is a word the player
# is shown with no pinyin over it rather than one they merely never meet.
家庭房|jiātíngfáng|family room|home
公寓式客房|gōngyùshì kèfáng|serviced apartment room|home
豪华间|háohuájiān|deluxe room|home
行政套房|xíngzhèng tàofáng|junior suite|home
京华套房|Jīnghuá tàofáng|the hotel's signature suite|home
登记|dēngjì|to register at a desk|social
补办|bǔbàn|to have a replacement made|home
间|jiān|measure word for rooms|number
台|tái|measure word for machines|number
副|fù|measure word for things that come in pairs|number
房价|fángjià|the room rate|money
押金|yājīn|deposit, refunded when you leave|money
房卡|fángkǎ|key card|home
房号|fánghào|room number|number
几晚|jǐ wǎn|how many nights|time
晚|wǎn|a night, as in 两晚|time
含早餐|hán zǎocān|breakfast included|food
证件|zhèngjiàn|identification papers|money
签字|qiānzì|to sign your name|money

# ---- the room, and what goes wrong in it. One of these is seeded per stay, so all of them are
# words the player will have to say out loud to somebody in a uniform. 问题 and 需要 are general
# words rather than hotel ones and were simply missing from the whole dictionary; they are here
# because this is where they were first needed, and they are untagged because neither of them can
# key a day on its own.
#
# Re-confirmed once Disrupt.serviceDue() started reading this column, which gave tagging them a
# real payoff for the first time. The intent still holds, and the payoff is the reason to be
# careful rather than the reason to give in: a day cannot be about "problems" or about "needing",
# so whichever of the twelve they were filed under would be a lie told to make a counter go up.
# These two stay three-field on purpose. H151 is closed except for them, and it should be read as
# closed — the remaining two are the answer, not the remainder.
问题|wèntí|a problem, something wrong
需要|xūyào|to need, to require
热水|rèshuǐ|hot water|home
坏了|huài le|broken, out of order|home
换房间|huàn fángjiān|to change rooms|home
隔壁|gébì|next door|home
吵|chǎo|noisy, loud|home
修好|xiūhǎo|to get something fixed|home
报修|bàoxiū|to report a fault|home
房型|fángxíng|room type, the grade you were given|home
消磁|xiāocí|to be demagnetised, what a key card does|home
打扫|dǎsǎo|to clean, to tidy up|home
加床|jiāchuáng|an extra bed|home
# The three things that turn up when you nodded at a sentence you did not follow. They are read
# off the room-service panel rather than heard, so a missing row here is a visible hole.
电扇|diànshàn|electric fan|home
浴巾|yùjīn|bath towel|home
耳塞|ěrsāi|earplugs|home

# ---- service, which is a telephone away and is charged for.
叫醒服务|jiàoxǐng fúwù|wake-up call|time
下午|xiàwǔ|afternoon|time
送餐|sòngcān|room-service delivery|food
洗衣|xǐyī|to launder, laundry service|home
电话|diànhuà|telephone, a phone call|home

# ---- leaving, and the piece of paper you leave with. A Chinese bill is read, queried and
# receipted in that order, and 发票 is not the same document as 收据 — the first is the tax
# invoice you claim expenses with and the second is only proof you paid.
退房|tuìfáng|to check out|money
账单|zhàngdān|the bill|money
房费|fángfèi|the room charge, the first line of every bill|money
服务费|fúwùfèi|service charge|money
发票|fāpiào|official tax invoice|money
收据|shōujù|receipt|money
消费|xiāofèi|a charge, what you spent|money
多收|duōshōu|to overcharge|money
迷你吧|mínǐbā|minibar|money
延迟退房|yánchí tuìfáng|late check-out|time
延迟|yánchí|to delay, to put back|time
刷|shuā|to swipe or tap a card|money
寄存行李|jìcún xíngli|to leave luggage|transport
寄存|jìcún|to leave something in storage|transport
减免|jiǎnmiǎn|a reduction, a charge taken off the bill|money

# ---- the departments, read off HOTEL_DEPARTMENTS in js/hotel.js so the workplace chapter and
# the dictionary name them identically. 客房部, 礼宾部, 工程部, 洗衣房 and 水疗中心 are above.
前厅部|qiántīngbù|front office department|work
餐饮部|cānyǐnbù|food and beverage department|work
宴会部|yànhuìbù|banqueting department|work
保安部|bǎo'ānbù|security department|work
楼层|lóucéng|floor, storey|direction
地下一层|dìxià yī céng|basement level one|direction
顶楼|dǐnglóu|top floor|direction

# ---- and the register. Staff address the player as 您 and every other person in the game says
# 你, which is the one contrast the game had no situation to make until there was a hotel.
麻烦|máfan|trouble, to put somebody to trouble|social
# 欢迎光临 is in four people's barks and in the lobby announcement and was in no row at all, so it
# was the one phrase every player hears on the way in and could not read.
欢迎光临|huānyíng guānglín|welcome — what every shop and hotel says as you walk in|social
接待处|jiēdàichù|reception desk|direction
留言|liúyán|a message left for you|social
领取|lǐngqǔ|to collect something you are owed
挺|tǐng|quite, rather — 挺冷的, the everyday Beijing intensifier
稍等|shāo děng|one moment please|social
客气|kèqi|polite, standing on ceremony|social
别客气|bié kèqi|not at all, don't mention it|social

# ---- the things in the building, which is a longer list than the words about it.
#
# (No backticks below this line: every comment in here lives inside a template literal and one
# would end the string mid-list. node --check does not catch it, because the remaining backticks
# re-pair into something that parses, and .dictcheck.js does not catch it either, because it reads
# this file as text with a regex rather than evaluating it. What it really does is truncate the
# dictionary at that line and run the rest of the word list as code.)
#
# .thingcheck.js reaches all fourteen hotel scenes and found 189 of 282 interactive things with
# no row behind them. A thing with no row is not a crash — the walk-up prompt falls back to the
# bare headword — it is worse than that: it is something the player can walk up to, press the
# button on, and learn nothing from, in a game whose entire subject is learning the word for it.
#
# Tagged on the same rule as the rest of this section. Guest wayfinding is direction, the rooms the
# staff work in are work, the guestroom and its fittings are home, and anything eaten or served is
# food. The views, the artworks and the two spa rooms keep three fields: 青铜亭 is a bronze pavilion
# and nobody can be sent on an errand about it.

# the lobby, and being pointed through it
接待台|jiēdàitái|reception counter|direction
迎宾台|yíngbīntái|greeting desk|direction
行李房|xínglifáng|luggage room, behind the bell desk|work
电梯前厅|diàntī qiántīng|lift lobby|direction
大楼梯|dà lóutī|the grand stair|direction
今日接待|jīnrì jiēdài|the board of today's arrivals and pickups|direction
签到处|qiāndàochù|sign-in desk|direction
西厅|xītīng|the west hall|direction
观景廊|guānjǐngláng|viewing gallery|direction
观景露台|guānjǐng lùtái|viewing terrace|direction
露台门|lùtái mén|terrace door|direction
今日活动|jīnrì huódòng|today's events|time
水景|shuǐjǐng|a water feature
墨韵北京|Mòyùn Běijīng|Ink Beijing, the lobby scroll
城市天际|chéngshì tiānjì|the city skyline
青铜亭|qīngtóng tíng|bronze pavilion
风雨花园|fēngyǔ huāyuán|rain garden

# eating and drinking, on two and on twelve
早餐台|zǎocāntái|breakfast counter|food
早餐自助|zǎocān zìzhù|breakfast buffet|food
全日餐厅|quánrì cāntīng|all-day restaurant|food
明档厨房|míngdàng chúfáng|show kitchen, cooked in front of you|food
传菜口|chuáncàikǒu|the pass, where dishes leave the kitchen|work
备餐间|bèicānjiān|pantry, where a floor plates its food|work
餐厅接待|cāntīng jiēdài|restaurant host desk|direction
包间|bāojiān|private dining room|food
候餐茶廊|hòucān cháláng|tea lounge for waiting diners|food
露台雅座|lùtái yǎzuò|terrace seating|food
吧台|bātái|bar counter|food
茶台|chátái|tea station, where the tea is made|food
茶桌|cházhuō|tea table, where it is drunk|food
云锦茶室|Yúnjǐn cháshì|the Yunjin tea room
会员水吧|huìyuán shuǐbā|members' water bar|food

# the guestrooms and what is in them
豪华客房|háohuá kèfáng|deluxe guestroom|home
转角套房|zhuǎnjiǎo tàofáng|corner suite|home
浴室|yùshì|bathroom|home
主浴|zhǔyù|the main bathroom of a suite|home
衣帽间|yīmàojiān|dressing room|home
长桌|chángzhuō|long table|home
扶手椅|fúshǒuyǐ|armchair|home
暖炉|nuǎnlú|heater, stove|home

# where the work happens
洽谈室|qiàtánshì|small meeting room|work
会议室|huìyìshì|meeting room|work
商务中心|shāngwù zhōngxīn|business centre|work
商务桌|shāngwùzhuō|business desk|work
图书室|túshūshì|library room|work
阅览室|yuèlǎnshì|reading room|work
婚礼沙龙|hūnlǐ shālóng|wedding salon|work
可分隔墙|kě fēngé qiáng|movable partition wall|work
员工通道|yuángōng tōngdào|staff passage|work
垃圾回收间|lājī huíshōujiān|refuse and recycling room|work
暂存区|zàncúnqū|holding area for deliveries|work
工具间|gōngjùjiān|tool room|work

# the spa, which is a treatment and not an errand
桑拿房|sāngnáfáng|sauna
蒸汽房|zhēngqìfáng|steam room
汤池|tāngchí|hot pool
水疗接待|shuǐliáo jiēdài|spa reception|direction
迎宾茶台|yíngbīn chátái|welcome tea counter|food
理疗室|lǐliáoshì|treatment room
更衣室|gēngyīshì|changing room
储物柜|chǔwùguì|locker|work
泳池|yǒngchí|swimming pool
毛巾站|máojīnzhàn|towel station
放松茶廊|fàngsōng cháláng|relaxation tea lounge
健身房|jiànshēnfáng|gym
健身器械|jiànshēn qìxiè|gym machines
自由重量|zìyóu zhòngliàng|free weights

# the family floor, where the rooms connect
亲子连通房|qīnzǐ liántōngfáng|connecting family rooms|home
家庭套房|jiātíng tàofáng|family suite|home
家庭客厅|jiātíng kètīng|family living room|home
家庭影院|jiātíng yǐngyuàn|home cinema|home
连通门|liántōngmén|connecting door between two rooms|home
大床|dàchuáng|a big double bed|home
儿童床|értóngchuáng|child's bed|home
儿童阅读角|értóng yuèdújiǎo|children's reading corner|home
绘画台|huìhuàtái|drawing table|home
玩具桌|wánjùzhuō|toy table|home
客用茶水间|kèyòng cháshuǐjiān|guest pantry|home
制冰机|zhìbīngjī|ice machine|home
家政工作间|jiāzhèng gōngzuòjiān|housekeeping workroom|work
儿童设备间|értóng shèbèijiān|family equipment store|work
工程间|gōngchéngjiān|engineering room|work

# the serviced residences, which are flats with a front desk
睡眠区|shuìmiánqū|sleeping area|home
主卧|zhǔwò|the main bedroom|home
起居室|qǐjūshì|living room|home
窗边榻|chuāngbiāntà|window daybed|home
共享厨房|gòngxiǎng chúfáng|shared kitchen|home
叠衣台|diéyītái|folding table for laundry|home
阅读角|yuèdújiǎo|reading corner|home
欢迎茶|huānyíngchá|welcome tea|food
早餐吧台|zǎocān bātái|breakfast bar|food
共享办公桌|gòngxiǎng bàngōngzhuō|hot desk|work
电话间|diànhuàjiān|telephone booth|work
打印台|dǎyìntái|printing station|work

# ---- the people in the building, which .thingcheck.js counts as things because they are.
#
# Every one of these is somebody the player can walk up to and be spoken to by, so every one of
# them is social by the rule at the top of this file: the event a person keys is somebody talking
# to you. The back-of-house titles are social too rather than work, because the player is a guest
# here and not yet a colleague. When the workplace chapter lands and these become the people you
# do the job with, that is the moment to move them, and not before.
收货员|shōuhuòyuán|goods receiver|social
洗衣房主管|xǐyīfáng zhǔguǎn|laundry supervisor|social
工程师|gōngchéngshī|engineer|social
保安员|bǎo'ānyuán|security officer|social
客房部协调员|kèfángbù xiétiáoyuán|housekeeping coordinator|social
工程部技工|gōngchéngbù jìgōng|engineering technician|social
门童|méntóng|doorman|social
前台接待员|qiántái jiēdàiyuán|receptionist|social
迎宾员|yíngbīnyuán|greeter|social
茶艺师|cháyìshī|tea master|social
会所茶艺师|huìsuǒ cháyìshī|the club tea master|social
书法导师|shūfǎ dǎoshī|calligraphy tutor|social
餐厅接待员|cāntīng jiēdàiyuán|restaurant host|social
中餐厨师|zhōngcān chúshī|chef of the Chinese kitchen|social
备餐间厨师|bèicānjiān chúshī|pantry chef|social
传菜员|chuáncàiyuán|runner who carries dishes out|social
全日餐厅服务员|quánrì cāntīng fúwùyuán|all-day restaurant server|social
中餐厅服务员|zhōngcāntīng fúwùyuán|Chinese-restaurant server|social
云端服务员|Yúnduān fúwùyuán|a Yunduan restaurant server|social
酒廊服务员|jiǔláng fúwùyuán|lounge server|social
酒廊调酒师|jiǔláng tiáojiǔshī|lounge bartender|social
宴会经理|yànhuì jīnglǐ|banqueting manager|social
婚礼顾问|hūnlǐ gùwèn|wedding planner|social
宴会服务员|yànhuì fúwùyuán|banquet server|social
更衣室服务员|gēngyīshì fúwùyuán|changing-room attendant|social
水疗接待员|shuǐliáo jiēdàiyuán|spa receptionist|social
理疗师|lǐliáoshī|therapist|social
救生员|jiùshēngyuán|lifeguard|social
健身教练|jiànshēn jiàoliàn|fitness trainer|social
客房服务员|kèfáng fúwùyuán|room attendant|social
家庭楼层服务员|jiātíng lóucéng fúwùyuán|family-floor attendant|social
楼层管家|lóucéng guǎnjiā|floor butler|social
住店管家|zhùdiàn guǎnjiā|resident butler|social
套房管家|tàofáng guǎnjiā|suite butler|social
住客|zhùkè|a guest staying in the hotel|social
食客|shíkè|a diner|social
商务客人|shāngwù kèrén|a business guest|social
家庭住客|jiātíng zhùkè|a family staying here|social
小住客|xiǎo zhùkè|the smallest guest|social
长住客人|chángzhù kèrén|a long-stay guest|social
长住住客|chángzhù zhùkè|a long-stay resident|social
会所住客|huìsuǒ zhùkè|a guest of the club|social

# ---- and the rest of what they stand next to.
活动隔墙|huódòng géqiáng|movable partition wall|work
宴会家具库|yànhuì jiājùkù|banquet furniture store|work
杯具消毒|bēijù xiāodú|glass and cup sterilising|work
双人理疗室|shuāngrén lǐliáoshì|couples' treatment room
阅读椅|yuèdúyǐ|reading chair|home
无障碍浴室|wúzhàng'ài yùshì|accessible bathroom|home
无障碍客房|wúzhàng'ài kèfáng|accessible guestroom|home
景观浴缸|jǐngguān yùgāng|bathtub with a view|home
转角景观房|zhuǎnjiǎo jǐngguānfáng|corner room with a view|home
小套房|xiǎo tàofáng|junior suite|home
套房起居室|tàofáng qǐjūshì|suite living room|home
套房床|tàofáng chuáng|the suite bed|home
套房浴缸|tàofáng yùgāng|the suite bathtub|home
套房餐桌|tàofáng cānzhuō|the suite dining table|home
石材浴室|shícái yùshì|stone bathroom|home
衣帽柜|yīmàoguì|wardrobe with a luggage shelf|home
书法台|shūfǎtái|calligraphy table|home
藏书架|cángshūjià|shelf of the house collection|home
麻将桌|májiàngzhuō|mahjong table|home
围棋桌|wéiqízhuō|go table|home
文房四宝|wénfáng sìbǎo|the four treasures of the study — brush, ink, paper, inkstone
会所前台|huìsuǒ qiántái|club reception|direction
功夫茶席|gōngfu cháxí|a gongfu tea service|food
茶席|cháxí|a tea service laid out for you|food
京华雅集|Jīnghuá Yǎjí|the Jinghua salon, on nine
云端中餐厅|Yúnduān zhōngcāntīng|the Yunduan Chinese restaurant
天际酒廊|Tiānjì jiǔláng|the Tianji sky lounge
松鹤厅|Sōnghètīng|the Pine and Crane private room
竹韵厅|Zhúyùntīng|the Bamboo Rhyme private room

# back of house on B1
服务通道|fúwù tōngdào|service corridor|work
装卸区|zhuāngxièqū|loading bay|work
传送带|chuánsòngdài|conveyor belt|work
客房部工作间|kèfángbù gōngzuòjiān|housekeeping store|work
员工更衣室|yuángōng gēngyīshì|staff changing room|work
员工食堂|yuángōng shítáng|staff canteen|work
监控中心|jiānkòng zhōngxīn|security control room|work
`;

const DICT = {};
for (const line of RAW.trim().split('\n')) {
  // Blank lines and # headings are for whoever is reading the list, which is now long enough
  // to want dividing into the places the words come from. Without this they became entries.
  const row = line.trim();
  if (!row || row.startsWith('#')) continue;
  const [hz, py, en, topic] = row.split('|');
  DICT[hz] = { hz, py, en };
  // The fourth field is optional and most rows do not have one, so it is attached only when it is
  // really there. Not as an empty string: game.js and the harnesses spread these entries around
  // and a topic of "" would read as "tagged with nothing" everywhere a truthiness check is done,
  // which is a different and much quieter bug than "not tagged". An entry that carries no topic
  // has no topic property at all, and the shape every existing caller sees is untouched.
  //
  // Unknown tags are dropped rather than kept. A typo would otherwise mint a thirteenth topic
  // with one word in it, and dueTopics() would eventually hand the world a whole day built around
  // that single typo — which is much harder to notice than a word that quietly went untagged.
  const t = topic && topic.trim();
  if (t && TOPIC_SET.has(t)) DICT[hz].topic = t;
}

// ---------------------------------------------------------------- HSK banding
// What a word costs a learner. Nothing in this codebase could say that before: a sweep for HSK
// across js/ matched zero lines anywhere, so every row was equally expensive and the world had no
// way to prefer 桌子 over 配电箱 when it needed a word a beginner could actually meet.
//
// WHY THIS IS NOT A FIFTH BAR-SEPARATED FIELD, which is what APARTMENT-TODO.md:309 asked for.
// Two live checks forbid it and both fail silently rather than loudly:
//   .dictcheck.js:56 matches a row as headword, reading, gloss and an OPTIONAL fourth field, and
//     nothing after it. A fifth bar makes every banded row "does not split into three fields", so
//     the harness whose whole job is finding malformed rows would call 512 good ones malformed.
//   APARTMENT-TODO.md:276's own check anchors the topic to the END of the line. A band written
//     after the topic takes the home-tagged count to zero, and the item that asked for the band
//     would be failed by the band.
// So the band rides beside the table rather than inside the row. Widening .dictcheck.js's LINE
// regex is lane 1's file, not this one; when it widens, this block can move onto the rows.
//
// The data is the official HSK 2012 word lists (hskhsk.com/data/lists, freely redistributable),
// joined to this dictionary by exact headword. It is a JOIN, not a judgement: nothing here was
// assigned a level by hand, so nothing here can be a level somebody made up. 512 of the
// dictionary's rows are in HSK 1-6.
//
// Band 0 is "not in HSK 1-6" and is the answer for most of this list — 电饭煲, 抽油烟机, 春联,
// 取件码. That is not a gap to be filled in later. Those words are met because they are in the
// room, which is the whole premise of this game, and pretending they carry an exam level would
// be exactly the lie the topic column's own rules warn about.
const HSK_BANDS = {
  1:
      '桌子 椅子 电脑 书 电视 吃 东西 喝 买 北京 工作 钱 我 你 的 是 有 没有 在 上 里 了 很 太 想 睡觉 请 坐 看 说 开 茶 水 人 小 都 几 '
    + '衣服 现在 点 和 明天 猫 狗 谢谢 再见 名字 叫 什么 哪儿 来 去 好 吗 呢 中国 会 一点儿 天气 今天 他 认识 高兴 菜 水果 米饭 多少 打电话 喂 '
    + '学生 老师 飞机 饭店 住 块 分钟 不 这 那 我们 能 多 一 二 三 四 五 六 七 八 九 十 个 做 听 写 回 下 学习 大 冷 上午 中午 星期 下雨 '
    + '医生 医院 苹果 后面 家 先生 热 杯子 下午',
  2:
      '门 手机 休息 房间 要 累 找 给 新 件 别 一下 黑 说话 也 上班 一起 对 还 走 吧 公司 服务员 票 左边 右边 火车站 机场 游泳 教室 咖啡 晚上 '
    + '红 等 过 两 就 送 从 您 大家 可以 到 再 已经 最 懂 着 百 次 完 卖 进 出 快 慢 早上 小时 药 生病 西瓜 鱼 面条 牛奶 路 鸡蛋 雪 羊肉 '
    + '手表 报纸 千 宾馆 问题',
  3:
      '灯 冰箱 空调 洗手间 行李箱 洗澡 刷牙 关 换 饿 中文 用 发 干净 碗 只有 坏 护照 楼 超市 树 自行车 花 阿姨 邻居 米 菜单 啤酒 饮料 一共 经理 '
    + '同事 请假 迟到 会议 办公室 地铁 地图 元 站 公园 锻炼 动物 熊猫 鼻子 黑板 图书馆 安静 起飞 船 张 耳朵 城市 层 老 条 只 骑 放 还是 自己 '
    + '一直 一样 最后 半 清楚 啊 教 拿 先 记得 复习 马上 新鲜 难 方便 舒服 周末 感冒 发烧 疼 检查 面包 香蕉 甜 声音 班 客人 刮风 伞 季节 电梯 '
    + '中间 裙子 词典 蛋糕 衬衫 裤子 笔记本 盘子 照片 筷子 银行 万 需要 打扫',
  4:
      '窗户 厨房 沙发 植物 镜子 毛巾 牙膏 垃圾桶 厕所 心情 扔 困 房东 短信 脏 可是 满 包子 拉 师傅 行 汤 加班 工资 果汁 桥 逛 老虎 打印 复印 '
    + '通知 座位 降落 航班 登机牌 国际 入口 正常 排队 巧克力 矿泉水 对面 够 呀 遍 份 趟 交 停 凉快 免费 咳嗽 护士 西红柿 葡萄 饺子 盐 饼干 塑料袋 '
    + '打折 售货员 咸 现金 表格 计划 卫生间 禁止 顾客 云 暖和 干 温度 小吃 糖 辣 热闹 家具 杂志 眼镜 餐厅 小说 广告 钥匙 客厅 火 空 收拾 安全 '
    + '号码 密码 台 麻烦 挺',
  5:
      '被子 书架 锅 地毯 肥皂 硬 胡同 墙 窗帘 老板 报告 信号 车厢 关闭 大象 猴子 竹子 脖子 翅膀 尾巴 宿舍 出口 状态 往返 确认 大厦 建筑 海关 风景 '
    + '烫 开水 盆 摸 挂号 内科 急诊 治疗 手术 柜台 土豆 梨 香肠 酱油 醋 日用品 蔬菜 零食 结账 夹子 手续 列车 操场 行人 雾 炒 服装 数码 项链 玩具 '
    + '耳环 戒指 围巾 包裹 日历 象棋 阳台 卧室 辣椒 装修 工具 工人 灰尘 锁 单元 中介 维修 调整 海鲜 账户 办理 业务 出示 输入 利息 风险 内部 登记 '
    + '押金 证件 隔壁 吵 发票 收据 消费 工程师',
  6:
      '枕头 灯笼 灌溉 报销 主管 屏幕 亭子 托运 设置 患者 家属 血压 化验 串 娃娃 走廊 收音机 书法 物业 证书 水泥 油漆 砖 档案 鸽子 水龙头 插座 隧道 '
    + '基金 等候 副',
};
const BAND = {};
for (const L in HSK_BANDS)
  for (const hz of HSK_BANDS[L].split(' ')) if (hz) BAND[hz] = Number(L);
for (const hz in DICT) if (BAND[hz]) DICT[hz].hsk = BAND[hz];

// ---------------------------------------------------------------- the truncation tripwire
// The word list above is a template literal and one backtick inside it ends the literal early.
// The rest of the list is then parsed as JavaScript, which usually still parses, Vocab is never
// defined, and the first thing to touch it throws somewhere else entirely: on 2026-08-08 it was
// paintLabel at js/game.js:1481, and the report was "the game does not load labels", which is
// four files away from the two backticks that caused it.
//
// So the file now says so itself. A truncated RAW cannot produce anything like a full dictionary,
// and this is the cheapest possible statement of that. It is a floor, not an exact count, so
// adding and removing rows never touches it; only losing most of the list can trip it.
if (Object.keys(DICT).length < 1200)
  throw new Error('js/vocab.js: only ' + Object.keys(DICT).length + ' dictionary rows parsed. '
    + 'The RAW template literal is almost certainly truncated by a stray backtick inside it — '
    + 'search js/vocab.js for one and replace it with a single quote. See the note at the top of '
    + 'RAW. node --check js/vocab.js finds it too.');

const KEY = 'bjlife.knowledge.v2';
const OLDKEY = 'bjlife.knowledge.v1';

const MAX = 9;          // familiarity ceiling; at MAX a word retires from review
// Reading a word often enough will hide its English (stage 1) but can never master it (stage 2).
const BRUSH_CAP = 4;
const BRUSH_STEP = 0.12;
// review schedule, in seconds of real time — short enough to close the loop inside one sitting
const IV_FIRST = 75, IV_MUL = 2.3, IV_MAX = 6 * 3600, IV_MISS = 40;

// know[hz] = { n, iv, due, hit, miss }
let know = load();

function load() {
  try {
    const v2 = JSON.parse(localStorage.getItem(KEY));
    if (v2 && typeof v2 === 'object') return v2;
  } catch (e) { /* fall through */ }
  // migrate the flat v1 format ({ hz: number }) so old saves keep their progress
  try {
    const v1 = JSON.parse(localStorage.getItem(OLDKEY));
    if (v1 && typeof v1 === 'object') {
      const out = {};
      for (const k in v1) {
        const n = Math.min(MAX, Number(v1[k]) || 0);
        out[k] = { n, iv: n >= 1 ? IV_FIRST : 0, due: n >= 1 ? Date.now() : 0, hit: 0, miss: 0 };
      }
      localStorage.setItem(KEY, JSON.stringify(out));
      return out;
    }
  } catch (e) { /* fall through */ }
  return {};
}
  // The word behind a numbered one. Crowds in this game are built by numbering the roster — 乘客二
  // through 乘客十五, 棋友一, 大妈三, 游客二, 行人一 — and what gets introduced is the hz of the thing
  // you touched, so every one of those people taught nothing: 乘客二 is not a headword and should
  // never be one, because fifteen rows for the same passenger is fifteen rows of dead weight. The
  // word on the card is 乘客; the number is which of them happened to be standing there, which is a
  // fact about the crowd and not about the language.
  //
  // Chinese numerals, not ASCII digits, and only at the end — 十五 has to come off whole. A word that
  // ends in a number character on its own account must not be shortened away to nothing, which is
  // what the length guard is for.
  const NUMTAIL = /[一二三四五六七八九十]+$/;
  // Two or more Chinese numerals at the front of a headword: a room number, not a word. See `get`.
  const ROOMNUM = /^[零〇一二三四五六七八九十百]{2,4}/;
  const baseWord = hz => {
    // Trimmed, because a thing may be numbered with a space before the digit — hotel-f4.js builds
    // "理疗室 三", treatment room three — and without the trim the base comes back with a trailing
    // space and matches nothing.
    const b = hz.replace(NUMTAIL, '').trim();
    return b.length >= 2 ? b : hz;
  };


function rec(hz) {
  return know[hz] || (know[hz] = { n: 0, iv: 0, due: 0, hit: 0, miss: 0 });
}
const nOf = hz => (know[hz] ? know[hz].n : 0);

let saveT = 0;
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(know)); } catch (e) { /* storage full or blocked */ }
  }, 150);
}

// stage 0 = full assist, 1 = pinyin only, 2 = hanzi only (mastered)
function stage(hz) {
  const n = nOf(hz);
  return n >= 7 ? 2 : n >= 3 ? 1 : 0;
}
const met = hz => nOf(hz) >= 1;
const retired = hz => nOf(hz) >= MAX;
const isDue = hz => met(hz) && !retired(hz) && Date.now() >= rec(hz).due;

let maxLen = 0;
for (const k in DICT) maxLen = Math.max(maxLen, k.length);

// ---------------------------------------------------------------- quiz building
function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function glosses(e) {
  return e.en.split(/[,;]/).map(s => s.trim().toLowerCase()).filter(Boolean);
}

return {
  DICT,
  // ---- get, and the one fallback in it.
  //
  // A thing may be named after the room it stands in: `hotel-f7.js` builds 七零三主卧, which is the
  // main bedroom of room 703. That is not a word and must never become a dictionary row — nobody
  // should be taught "the main bedroom of room 703" — but the thing is still something the player
  // walks up to, and with no row behind it the walk-up prompt shows a bare headword and teaches
  // nothing, which is the whole complaint `.thingcheck.js` exists to make.
  //
  // So a headword that opens with two or more Chinese numerals falls back to what is left when
  // they are stripped: 七零三主卧 answers with 主卧, which is a word, and the player learns it.
  // Two numerals minimum on purpose — one would turn 十分 into 分 and 一下 into 下. And the fallback
  // is only ever reached when the exact lookup already failed, so nothing that resolves today can
  // change: this can only turn `undefined` into an entry.
  //
  // The cleaner fix is upstream — name the thing 主卧 and put the room number in its sentence — and
  // that is a change in the floor module rather than here. This makes the words exist meanwhile.
  // The same applies to a number on the *end* — 理疗室 三 is treatment room three — which is what
  // baseWord already strips for the review queue. Both fallbacks are tried in turn, and both only
  // after the exact lookup has already returned nothing.
  get(hz) {
    const e = DICT[hz];
    if (e) return e;
    if (ROOMNUM.test(hz)) {
      const head = DICT[hz.replace(ROOMNUM, '')];
      if (head) return head;
    }
    const base = baseWord(hz);
    return base !== hz ? DICT[base] : undefined;
  },
  MAX,

  count: () => Object.keys(know).filter(met).length,
  exposure: nOf,
  stage,
  mastered: hz => stage(hz) === 2,
  retired,
  progress: hz => Math.min(1, nOf(hz) / MAX),
  isDue,
  dueIn: hz => Math.max(0, rec(hz).due - Date.now()),

  // Words that have come round again, most overdue first.
  dueList() {
    return Object.keys(know).filter(isDue).sort((a, b) => know[a].due - know[b].due);
  },
  dueCount() { return this.dueList().length; },

  // ---- the same queue, cut by what the words are about.
  //
  // This is the seam the invisible-review idea hangs off. The world does not ask "which words are
  // due", it asks "what should today be about", and the answer is a topic it can build an errand
  // out of. Everything below reads the fourth column described at the top of the file; a word with
  // no topic is invisible to all three of these and still perfectly visible to dueList().
  TOPICS,
  topicOf: hz => (DICT[hz] && DICT[hz].topic) || null,

  // ---- the HSK band, 1 to 6, or 0 for the 1,287 rows that are not in HSK 1-6 at all.
  // Read the note above HSK_BANDS before using this. The two things a caller has to know:
  // 0 is not "hard", it is "not on the exam", and it is the answer for most of this dictionary;
  // and the band says what a word costs a learner, never whether the player knows it — that is
  // what know[] and stage() are for, and confusing the two would stage a beginner's day for
  // somebody who has already mastered every word in it.
  hsk: hz => (DICT[hz] && DICT[hz].hsk) || 0,

  // Due words at or below a band, most overdue first. The narrowing dueByTopic does for subject,
  // this does for difficulty: dueByBand(3, 'home') is "what is waiting in the flat that a
  // three-term learner could plausibly be shown", which is the query a room needs before it turns
  // review into an errand instead of a card. Band 0 is excluded rather than treated as easy.
  dueByBand(max, topic) {
    const src = topic ? this.dueByTopic(topic) : this.dueList();
    return src.filter(hz => { const b = DICT[hz] && DICT[hz].hsk; return b && b <= max; });
  },

  // Due words carrying this topic, most overdue first — dueList()'s order, narrowed. Filtering
  // dueList rather than re-deriving it is deliberate: isDue() and the sort live in one place, so
  // this can never disagree with the review panel about what is waiting.
  dueByTopic(topic) {
    if (!TOPIC_SET.has(topic)) return [];
    return this.dueList().filter(hz => DICT[hz] && DICT[hz].topic === topic);
  },

  // What the day could be about, heaviest first. This is the one the simulation actually calls:
  // it takes the top of this list and stages something out of it.
  //
  // Ranked on how many words are waiting, with the oldest due date settling draws, and pointedly
  // NOT on how overdue anything is in milliseconds. Intervals here run from 75 seconds to six
  // hours of real time, so one word left unanswered while the player went to lunch is millions of
  // milliseconds overdue and would outrank a topic with nine words queued behind it — and the
  // world would spend the whole morning staging an errand about a single forgotten noun. Count is
  // what "this needs work" actually means; the clock is only there to break a tie.
  //
  // Returns objects, not bare strings: { topic, n, due, words }. The words are already in
  // dueList's most-overdue-first order, so a caller that wants three food words for a shopping
  // list takes them off the front and never calls back. The group's due is its oldest due date.
  dueTopics() {
    const by = {};
    for (const hz of this.dueList()) {
      const t = DICT[hz] && DICT[hz].topic;
      if (!t) continue;
      const g = by[t] || (by[t] = { topic: t, n: 0, due: Infinity, words: [] });
      g.n++;
      g.due = Math.min(g.due, know[hz].due);
      g.words.push(hz);
    }
    return Object.values(by).sort((a, b) => (b.n - a.n) || (a.due - b.due));
  },

  // First contact with a word: hand it over for free and put it in the queue.
  introduce(hz) {
    if (!DICT[hz]) hz = baseWord(hz);
    if (!DICT[hz]) return false;
    const r = rec(hz);
    if (r.n >= 1) return false;
    r.n = 1; r.iv = IV_FIRST; r.due = Date.now() + IV_FIRST * 1000;
    save();
    return true;
  },

  // A recall check: hanzi -> meaning, then hanzi -> sound, then meaning -> hanzi.
  quiz(hz) {
    const e = DICT[hz];
    if (!e) return null;
    const n = nOf(hz);
    const kind = n >= 7 ? 'produce' : n >= 3 ? 'pinyin' : 'meaning';
    const face = k => kind === 'produce' ? k : kind === 'pinyin' ? DICT[k].py : DICT[k].en;
    const answerGloss = glosses(e);
    const used = new Set([face(hz).toLowerCase()]);

    const usable = k => {
      if (k === hz || !DICT[k]) return false;
      if (used.has(face(k).toLowerCase())) return false;
      const d = DICT[k];
      // never offer a distractor that is arguably also correct
      if (kind === 'meaning' && glosses(d).some(g => answerGloss.includes(g))) return false;
      if (kind === 'pinyin' && d.py === e.py) return false;
      if (kind === 'produce' && (k.includes(hz) || hz.includes(k))) return false;
      return true;
    };

    const all = Object.keys(DICT);
    const picks = [];
    // words you already know make sharper distractors; top up from the whole dictionary
    for (const src of [shuffled(all.filter(met)), shuffled(all)]) {
      for (const k of src) {
        if (picks.length >= 3) break;
        if (!usable(k)) continue;
        picks.push(k);
        used.add(face(k).toLowerCase());
      }
    }

    const options = shuffled([hz, ...picks]);
    return {
      kind,
      prompt: kind === 'produce' ? e.en : hz,
      hint: kind === 'meaning' ? '这是什么意思？ · what does it mean?'
          : kind === 'pinyin' ? '怎么念？ · how does it sound?'
          : '哪个是这个词？ · which word is this?',
      options: options.map(k => ({ hz: k, label: face(k) })),
      answer: options.indexOf(hz),
    };
  },

  // Score a check. Only this moves a word toward mastery.
  grade(hz, correct) {
    const r = rec(hz), before = stage(hz);
    if (correct) {
      r.hit++;
      r.n = Math.min(MAX, r.n + 1);
      r.iv = r.iv ? Math.min(r.iv * IV_MUL, IV_MAX) : IV_FIRST;
    } else {
      r.miss++;
      r.n = Math.max(1, r.n - 1.5);
      r.iv = IV_MISS;
    }
    r.due = Date.now() + r.iv * 1000;
    save();
    const after = stage(hz);
    return {
      correct, n: r.n, stage: after,
      promoted: after > before, demoted: after < before,
      retired: retired(hz), nextIn: r.iv * 1000,
    };
  },

  // Passive exposure: seeing a word in a sentence teaches you a little, never enough.
  brush(hz) {
    if (!DICT[hz]) return;
    const r = rec(hz);
    if (r.n >= BRUSH_CAP) return;
    r.n = Math.min(BRUSH_CAP, Math.round((r.n + BRUSH_STEP) * 1000) / 1000);
    if (r.n >= 1 && !r.due) { r.iv = IV_FIRST; r.due = Date.now() + IV_FIRST * 1000; }
    save();
  },

  // Greedy longest-match segmentation of a Chinese string.
  tokenize(str) {
    const out = [];
    for (let i = 0; i < str.length;) {
      let hit = null;
      for (let l = Math.min(maxLen, str.length - i); l > 0; l--) {
        const s = str.substr(i, l);
        if (DICT[s]) { hit = s; break; }
      }
      if (hit) { out.push({ t: hit, e: DICT[hit] }); i += hit.length; }
      else { out.push({ t: str[i], e: null }); i++; }
    }
    return out;
  },

  // Sentence with pinyin ruby over anything you haven't mastered yet.
  sentenceHTML(str) {
    return this.tokenize(str).map(({ t, e }) => {
      if (!e) return `<span>${t}</span>`;
      this.brush(t);
      if (stage(t) === 2) return `<span class="kn">${t}</span>`;
      return `<ruby class="unk">${t}<rt>${e.py}</rt></ruby>`;
    }).join('');
  },

  everything() {
    return Object.keys(know).filter(met).map(hz => ({
      hz, ...(DICT[hz] || { py: '', en: '' }),
      n: know[hz].n, st: stage(hz), due: isDue(hz), retired: retired(hz),
    })).sort((a, b) => (b.due - a.due) || (b.n - a.n));
  },

  reset() {
    know = {};
    try { localStorage.removeItem(KEY); } catch (_) {}
    try { localStorage.removeItem(OLDKEY); } catch (_) {}
  },
};
})();
