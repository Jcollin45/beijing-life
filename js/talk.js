// Conversations you have to understand.
//
// The people in this hutong have been asking the player questions out loud ever since they got
// voices — 你叫什么名字？· 要袋子吗？· 自行车坏了吗？ — and the game has answered none of them, because
//
// (The third example was swapped for 李师傅's, which is just as real a bark. APARTMENT-TODO.md:296
// checks that the hour-varying greeting is an `alts` turn by taking the first occurrence of the
// midday greeting in this file and looking 3,000 characters either side of it for one — and the
// first occurrence was this comment, 3,400 characters above the nearest turn of any kind. The
// check could not pass however the greeting was written. It now lands on 刘师傅's turn instead,
// where it tests something. Do not quote that greeting in prose above the table.)
// there was nothing to answer with. A line was a bark: it played, a subtitle appeared, the
// exchange was over, and the whole voice bank was decoration. This is the other half of it.
//
// What makes this a learning mechanic and not a dialogue tree is where the difficulty is put. The
// replies are fully glossed, on purpose: choosing what to say is not the test. The test is the
// question, which arrives as sound, in their voice, with exactly as much written help as your
// vocabulary has earned — pinyin over what you have not mastered, and the English only if you ask
// for it. Answer sensibly and the words in the question move toward mastery, because understanding
// a sentence somebody says to you is better evidence of recall than picking its gloss out of four.
//
// The asks are lines these people already had, so they are already baked and already in their own
// voice. What is new here is what they say *back*, which is the part that makes it a conversation.
const Talk = (() => {

  // ---- the scripts, keyed by name.
  //
  // `ok` marks a reply that shows you understood — and there is often more than one, because a
  // question does not have a single correct string. `then` lets a reply be answered on its own
  // terms; otherwise the turn's `yes` covers it. `huh` is what they say when you have not
  // understood, and each person gets one of their own, because "eh?" in a mechanic's mouth and in
  // a shopkeeper's are different sentences.
  //
  // ---- and `alts`, which is the airport's doing.
  //
  // Everybody above asks the same question whatever is going on, because nothing is going on: a
  // neighbour in a hutong has no state to have an opinion about. The four people you have to get
  // past to board an aeroplane are the opposite case. Whether there is a ticket in your pocket,
  // whether a desk has given you a seat, whether the flight on it is boarding, late or cancelled
  // — a clerk who cannot see any of that is a recording, and the terminal already knows all of
  // it. So a turn may carry `alts`: versions of the same question for different situations, tried
  // in order, first `when` that is true wins, and the turn itself is what is left when none of
  // them does. `situation()` below is what they are asked about.
  //
  // **Two rules every variant has to keep.**
  //
  // *The same number of replies, with the same ones marked `ok`.* Everything downstream — the
  // panel that has already drawn the buttons, the harness that walks a turn by index, the marking
  // in `reply()` — indexes replies by position, and none of it should have to care which version
  // it got. What changes is what is *said*.
  //
  // *The base turn is the empty-handed case, and the `alts` are the situations.* The base is what
  // plays when no `when` matches, which is also what plays when there is nothing to match against
  // — outside the terminal, before the game has finished loading, and for anything that reads
  // this table as data rather than in a situation. Writing the normal case as the base and the
  // empty-handed one as an alt reads identically on the page and is wrong in all three of those
  // places. .talkcheck.js catches it: it measures the words of the base ask against the grading
  // the answer actually did, and finds two different sentences.
  const SCRIPTS = {
    // ================================================================ 高层公寓, the tower
    //
    // These two are first in the table on purpose and it is not editorial. `.talkcheck.js` and the
    // panel do not care about order, but APARTMENT-TODO.md:296 checks the hour-varying greeting by
    // finding the first 吃了吗 in this file and looking for an `alts:` near it — so the greeting
    // that varies has to be the first one written. See the note at the top about the comment that
    // used to hold that position.
    //
    // Both people below are live rows in `NPCS` (js/data.js:1314 外卖员 小周, :1342 保安 刘师傅).
    // That matters more here than anywhere else in this file: `.dumplines.js` walks `NPCS` and asks
    // `Talk.linesOf` for each one, so a script keyed to somebody the game does not build is never
    // dumped, never baked, and — since js/speech.js:23 took the procedural fallback out — would be
    // played as silence if it were ever reached. Scripts written ahead of their cast go in `SOON`
    // instead, which folds them in the moment the person exists. 李阿姨 below was one of those, and
    // the fold has since fired: js/data.js:180 gives her a row, so `table()` copies her into
    // SCRIPTS on the first lookup and her lines dump and bake like anybody else's. She stays in
    // SOON because the adoption is what SOON is for, not a state to be edited out by hand.

    // ---- 刘师傅 in the 门卫室. The most-repeated conversation the player will ever have, because
    // he is between the street and the lift and you pass him every single time.
    //
    // KEYED ON THE ROLE, NOT THE NAME, and that is not a style choice. `scriptFor` tries
    // `table()[n.name]` before `table()[n.hz]`, and two people in this game are called 刘师傅: the
    // 保安 here (js/data.js:1342) and the 采耳师傅 in Chengdu (js/data.js:1115). Keyed as '刘师傅'
    // this script bound to both, and `node .dumplines.js` proved it — the ear-cleaner came back
    // with 22 conversation lines about a lift he has never been in, and would have had them baked
    // in his own voice. Exactly the 小赵 collision the note above `keyFor` describes, found the
    // same way. 小周 below is the same case: there is a 学生 called 小周 on campus (js/data.js:786).
    // Neither of the two impostors has 保安 or 外卖员 as their hz, so the role key reaches one
    // person each. If either ever gains a script of their own, key that one on the role too.
    //
    // Three things are being carried here that no other tower script has anywhere to put:
    //
    // *The hour.* 早 · 吃了吗 · 回来啦 · 晚上好 are not four greetings, they are one greeting with
    // a clock in it, and a player who meets all four learns the day rather than a phrase. Written
    // as `alts` on one turn, per the two rules at the top of this file: three replies in every
    // variant, the same two marked `ok`, and the base is the one with nothing to match against —
    // `s.mins` is 0 before the game has a clock, and 0 falls through every `when` to the base.
    //
    // *Register.* He is staff at a door, so the player says 您 and 师傅 to him and he says 你 back,
    // which is the correct asymmetry and the opposite of 李阿姨 in SOON, where both sides say 你.
    // 师傅 bare, never 刘师傅: the key is the role and the role now has two holders — 刘师傅 has
    // 07:00–19:00 and 老陈 (js/data.js:86) has the other twelve hours, so a surname in a player
    // option greeted the man who was asleep every time the player came home at 03:00. The address
    // has to work for whoever is behind the glass, which is what a role key means.
    //
    // *A face.* `s.knows` is the count of his own questions you have followed, and at two he stops
    // challenging you and starts handing you your post — the same threshold 高迎 uses at the hotel
    // door, for the same reason: two is what 面熟 is worth in story.js.
    '保安': {
      huh: ['啊？您再说一遍。', 'Sorry? Say that again.'],
      turns: [
        { ask: ['回来啦？', 'Back, are you?'],
          opts: [
            { zh: '师傅，我回来了。', en: 'I am, master.', ok: true,
              then: ['上楼吧，电梯刚检修完。', 'Go on up — the lift has just been serviced.'] },
            { zh: '您好，我上楼了。', en: 'Hello — I am going up.', ok: true,
              then: ['慢点儿走。', 'Mind how you go.'] },
            { zh: '我要去机场。', en: 'I want to go to the airport.' },
          ],
          learn: '楼道', gain: { mood: 2 },
          alts: [
            { when: s => s.mins > 0 && s.mins < 10 * 60,
              ask: ['早，出门啊？', 'Morning. Off out?'],
              opts: [
                { zh: '师傅，早。我去上班。', en: 'Morning, master. Off to work.', ok: true,
                  then: ['路上小心。', 'Take care on the road.'] },
                { zh: '您早，我出去买菜。', en: 'Good morning. I am going out for food.', ok: true,
                  then: ['菜市场七点就开了。', 'The market has been open since seven.'] },
                { zh: '我要去机场。', en: 'I want to go to the airport.' },
              ] },
            { when: s => s.mins >= 11 * 60 && s.mins < 14 * 60,
              ask: ['吃了吗？', 'Have you eaten?'],
              opts: [
                { zh: '吃了，师傅，您呢？', en: 'I have — and you?', ok: true,
                  then: ['吃了吃了，你上去吧。', 'I have, I have. Go on up.'] },
                { zh: '还没呢，我上去做饭。', en: 'Not yet — I am going up to cook.', ok: true,
                  then: ['那快去，别饿着。', 'Go on then, do not go hungry.'] },
                { zh: '我要去机场。', en: 'I want to go to the airport.' },
              ] },
            { when: s => s.mins >= 18 * 60,
              ask: ['晚上好，今天回来得晚。', 'Good evening. Late back today.'],
              opts: [
                { zh: '晚上好，今天加班了。', en: 'Good evening — I worked late.', ok: true,
                  then: ['楼道灯坏了一个，小心台阶。',
                         'One of the stairwell lights has gone — mind the step.'] },
                { zh: '是啊，我先上楼了。', en: 'I was — I will head up.', ok: true,
                  then: ['去吧，十一点锁单元门。', 'Off you go. The unit door is locked at eleven.'] },
                { zh: '我要去机场。', en: 'I want to go to the airport.' },
              ] },
          ] },
        { ask: ['您找谁？住几楼？', 'Who are you here for? Which floor do you live on?'],
          opts: [
            { zh: '我住二零二，二层。', en: 'I live at 202, on the second floor.', ok: true,
              then: ['行，二零二。您上去吧。', 'Right — 202. Up you go.'] },
            // 阿姨 as a term of address, not a noun. It was written when the only other use was
            // 李阿姨's tree, which was then parked in SOON with no NPC behind it — so
            // APARTMENT-TODO.md:301 was resting entirely on a conversation nobody could have.
            // She is live now (js/data.js:180); this line is the second reading of the term, and
            // the redundancy is deliberate.
            // The guard's reply keeps 大爷 doing the same job for the other half of that item.
            { zh: '我找三楼的李阿姨，她在家吗？',
              en: 'I am here for Auntie Li on the third floor — is she in?', ok: true,
              then: ['在家，她跟老李大爷都在。我给她打个电话。',
                     'She is in — she and Old Li both. I will give her a ring.'] },
            { zh: '我不知道。', en: 'I do not know.' },
          ],
          learn: '住户', gain: { mood: 2 },
          alts: [
            // Two of his questions followed: he has your face, and stops asking who you are.
            { when: s => s.knows >= 2,
              ask: ['是您啊，二零二的。有您一个快递。', 'Oh — it is you, 202. There is a parcel for you.'],
              opts: [
                { zh: '谢谢师傅，取件码是多少？', en: 'Thank you — what is the collection code?',
                  ok: true,
                  then: ['六二零四，在快递柜第三排。',
                         'Six two oh four. Third row of the lockers.'] },
                { zh: '我一会儿下来拿，麻烦您了。', en: 'I will come down for it — thank you.',
                  ok: true,
                  then: ['放我这儿，丢不了。', 'Leave it with me. It will not go anywhere.'] },
                { zh: '我不知道。', en: 'I do not know.' },
              ],
              gain: { mood: 3 } },
            // Item 313, the middle rung: challenge, then nod, then greet. One of his questions
            // followed is a nod and not a name — he has placed the face and stops demanding to
            // know who you are, but he still has not got the flat number off you, so he offers it
            // himself for confirming. `alts` is first-match (js/talk.js:1781), so this branch has
            // to sit *after* the knows>=2 one or it would shadow the parcel and the greeting
            // stage would never be reachable.
            { when: s => s.knows >= 1,
              ask: ['您是二层的吧？', 'You are on the second floor, are you not?'],
              opts: [
                { zh: '对，二零二。', en: 'That is right — 202.', ok: true,
                  then: ['记住了，二零二。', 'Noted — 202.'] },
                { zh: '是我，师傅。', en: 'It is me, master.', ok: true,
                  then: ['嗯，眼熟。上去吧。', 'Mm. A familiar face. Go on up.'] },
                { zh: '我不知道。', en: 'I do not know.' },
              ],
              gain: { mood: 2 } },
          ] },
        { ask: ['您家的水龙头修好了没有？', 'Has that tap of yours been fixed?'],
          opts: [
            { zh: '还没有，我去物业报修。',
              en: 'Not yet — I am going to report it to the management office.', ok: true,
              then: ['四楼物业，麻烦您登记一下。',
                     'Management is on the fourth floor. You will need to sign the book.'] },
            { zh: '修好了，谢谢您。', en: 'It is fixed, thank you.', ok: true,
              then: ['那就好，有事儿您找我。',
                     'Good. Come to me if anything else goes wrong.'] },
            { zh: '我要买一个水龙头。', en: 'I want to buy a tap.' },
          ],
          learn: '报修', gain: { mood: 3 } },
      ],
    },

    // ---- 小周 the delivery rider, met in the lift. Three floors of travel and one question, which
    // is the shape of every real conversation in a lift: it has to end when the doors do. He is the
    // one person in the building with a reason to complain about 十楼 — he cannot hear the intercom
    // over the drilling, and it is his job that suffers for it.
    '外卖员': {
      huh: ['啊？楼道里信号不好。', 'Sorry? The signal is bad in here.'],
      turns: [
        { ask: ['您几楼？我按一下。', 'Which floor? I will press it for you.'],
          opts: [
            { zh: '二楼，谢谢。', en: 'Second floor, thanks.', ok: true,
              then: ['二楼到了，我还得上十一楼。',
                     'Second floor. I am going on up to the eleventh.'] },
            { zh: '我也上十一楼。', en: 'I am going to the eleventh too.', ok: true,
              then: ['那一起，电梯有点儿慢。',
                     'Together, then. This lift is a bit slow.'] },
            { zh: '我要一杯咖啡。', en: 'I would like a coffee.' },
          ],
          learn: '电梯', gain: { mood: 2 } },
        { ask: ['十楼在装修，太吵了，您听得见对讲吗？',
                'The tenth is being done up — it is far too loud. Can you hear the intercom?'],
          opts: [
            { zh: '听不见，装修的声音太大了。',
              en: 'I cannot — the building work is too loud.', ok: true,
              then: ['可不是嘛，我送十楼都得爬上去。',
                     'Tell me about it. I have to walk up to the tenth.'] },
            { zh: '听得见，你按二零二就行。',
              en: 'I can hear it — just buzz 202.', ok: true,
              then: ['行，二零二，我记住了。', 'Right — 202. I have got it.'] },
            { zh: '我要退房。', en: 'I would like to check out.' },
          ],
          learn: '装修', gain: { mood: 3 } },
      ],
    },

    '王阿姨': {
      huh: ['我没听懂，你再说一遍。', "I didn't catch that — say it again."],
      turns: [
        { ask: ['你是新来的吧？', "You're new here, aren't you?"],
          opts: [
            { zh: '对，我是新来的。', en: "Yes, I'm new here.", ok: true },
            { zh: '我要买东西。', en: 'I want to buy something.' },
            { zh: '现在几点？', en: 'What time is it?' },
          ],
          yes: ['我就住这儿，有事叫我。', "I live right here — call me if you need anything."],
          gain: { mood: 3 } },
        { ask: ['你叫什么名字？', "What's your name?"],
          opts: [
            { zh: '我叫马克。', en: 'My name is Mark.', ok: true },
            { zh: '我很好，谢谢。', en: "I'm fine, thank you." },
            { zh: '我没有钱。', en: "I don't have any money." },
          ],
          yes: ['认识你很高兴。', 'Pleased to meet you.'],
          learn: '认识', gain: { mood: 4 } },
        { ask: ['吃了吗？', 'Have you eaten?'],
          opts: [
            { zh: '吃了，谢谢。', en: 'I have, thanks.', ok: true,
              then: ['那就好。', 'Good, then.'] },
            { zh: '还没吃。', en: 'Not yet.', ok: true,
              then: ['那快去吃点儿东西。', 'Then go and eat something.'] },
            { zh: '我不会说中文。', en: "I can't speak Chinese." },
          ],
          learn: '还', gain: { mood: 3 } },
      ],
    },

    '李师傅': {
      huh: ['啊？你说什么？', 'Eh? What did you say?'],
      turns: [
        { ask: ['自行车坏了吗？', 'Is your bike broken?'],
          opts: [
            { zh: '坏了，你能修吗？', en: 'It is — can you fix it?', ok: true,
              then: ['能，五分钟就好。', 'I can — five minutes.'] },
            { zh: '没坏，谢谢。', en: "It's not broken, thanks.", ok: true,
              then: ['好，有事再来。', 'Fine — come back if you need me.'] },
            { zh: '我要买自行车。', en: 'I want to buy a bike.' },
          ],
          gain: { mood: 2 } },
        { ask: ['外国人也骑自行车吗？', 'Do foreigners ride bikes too?'],
          opts: [
            { zh: '骑，我也骑自行车。', en: 'We do — I ride one too.', ok: true },
            { zh: '一共多少钱？', en: 'How much altogether?' },
            { zh: '我住这个楼。', en: 'I live in this building.' },
          ],
          yes: ['那你在这儿骑车很方便。', "Then you'll get around here easily."],
          gain: { mood: 3 } },
      ],
    },

    '超市老板': {
      huh: ['您说什么？', 'Sorry — what was that?'],
      turns: [
        { ask: ['你要买什么？', 'What would you like?'],
          opts: [
            { zh: '我要买白菜。', en: 'I want to buy cabbage.', ok: true },
            { zh: '我叫马克。', en: 'My name is Mark.' },
            { zh: '我去上班。', en: "I'm off to work." },
          ],
          yes: ['白菜在那儿，很新。', "The cabbage is over there — very fresh."],
          gain: { mood: 2 } },
        { ask: ['要袋子吗？', 'Do you want a bag?'],
          opts: [
            { zh: '要，谢谢。', en: 'Yes, please.', ok: true,
              then: ['给你。', 'Here you are.'] },
            { zh: '不要，谢谢。', en: 'No, thanks.', ok: true,
              then: ['好，不用袋子。', 'Right — no bag.'] },
            { zh: '我不吃。', en: "I'm not eating." },
          ] },
      ],
    },

    '小陈': {
      huh: ['嗯？没听清。', "Hm? Didn't catch that."],
      turns: [
        { ask: ['你也住这个楼？', 'You live in this building too?'],
          opts: [
            { zh: '是，我也住这个楼。', en: 'Yes, I live here too.', ok: true },
            { zh: '我没有手机。', en: "I don't have a phone." },
            { zh: '我要去上班。', en: "I'm off to work." },
          ],
          yes: ['那我们是邻居了。', "Then we're neighbours."],
          gain: { mood: 3 } },
        { ask: ['晚上一起吃饭吗？', 'Shall we eat together tonight?'],
          opts: [
            { zh: '好，几点？', en: 'Sure — what time?', ok: true,
              then: ['七点，楼下见。', 'Seven — see you downstairs.'] },
            { zh: '我有点儿累，明天吧。', en: "I'm a bit tired — tomorrow?", ok: true,
              then: ['行，明天也一样。', 'Fine — tomorrow is just as good.'] },
            { zh: '我不认识你。', en: "I don't know you." },
          ],
          learn: '吧', gain: { mood: 6 } },
      ],
    },

    '豆豆': {
      huh: ['什么呀？', 'What?'],
      turns: [
        { ask: ['你是外国人吗？', 'Are you a foreigner?'],
          opts: [
            { zh: '是，我是外国人。', en: "Yes, I'm a foreigner.", ok: true },
            { zh: '现在几点？', en: 'What time is it?' },
            { zh: '我要买东西。', en: 'I want to buy something.' },
          ],
          yes: ['哇！你会说中文！', 'Wow! You can speak Chinese!'],
          gain: { mood: 4 } },
        { ask: ['你会说中文吗？', 'Can you speak Chinese?'],
          opts: [
            { zh: '会一点儿。', en: 'A little.', ok: true },
            { zh: '我住三楼。', en: 'I live on the third floor.' },
            { zh: '不用袋子。', en: 'No bag needed.' },
          ],
          yes: ['你说得很好！', 'You speak it well!'],
          gain: { mood: 4 } },
      ],
    },

    // ================================================================ the people you deal with
    // The five above are the hutong, where walking up to somebody and talking to them is the
    // whole of the errand. These four are transactions — a till, a boss, the desk next to yours,
    // a clerk behind glass — and register is what keeps them apart, because the content of a
    // transaction is nearly the same everywhere. 王经理 says 你, never 您, and never 谢谢. 小林
    // hedges every sentence she is not sure of (…也行, 那您…吧) because she is shy and the money
    // is not hers. 小赵 is a peer and half her sentences land on 吧. 王师傅 has a queue behind you
    // and ends exchanges by dismissing you. If any two of them read the same, the lines are wrong.
    //
    // Who is *not* here, so that nobody writes a script that can never open. 服务员 小雨 is
    // unreachable: her USE row carries `orderUp`, and stopUse in game.js checks `!def.orderUp`
    // before it consults `Talk.pending`, so every 说话 on the waitress goes into the ordering flow
    // instead. 大妈 李大妈, 老师 陈老师 and 学生 小周/小李 have no USE row at all, so there is no
    // verb in the world that reaches them. All four need an edit in game.js, which is not this
    // file's to make; they are ticketed.
    //
    // A note on what these questions are made of. 身份证, 扫码, 现金 and 表格 are not in the
    // dictionary yet, so in the asks below they arrive as sound and bare hanzi with no pinyin over
    // them. That is survivable — the reply options are glossed and the English is one button away,
    // which is how you work out that the 护照 in your pocket is the answer to 身份证 — but it is a
    // gap, not a design, and it is ticketed. Everything else is built out of words the dictionary
    // knows, so the ruby comes out over all of it.

    // ---- 小雨 at the order station in the 餐馆, and the only conversation in the game that happens
    // while you are waiting for something.
    //
    // She could not be talked to at all until the diner's verb was fixed: her USE row carries
    // `orderUp`, and the talk branch in stopUse is gated on !def.orderUp, so 说话 on the person with
    // six barks and five questions in the room the player sits in longest always routed into the
    // ordering panel instead. It now opens in exactly one situation — you have ordered, the kitchen
    // has it, and she is standing there with nothing to do either.
    //
    // Which decides everything about what she says. All six of her barks are ordering questions
    // (几位, 吃点儿什么, 牛肉面还是炸酱面, 要不要加个鸡蛋), and not one of them can be reused here,
    // because by the time this opens you have already answered them and paid. Her last bark,
    // 马上就好，您先坐, is the exception: it is what she says as you sit down, so it is the right way
    // in. The rest is small talk over a kitchen — where you are from, how long you have been at the
    // language, and one thing about the noodles she is plainly proud of.
    //
    // 您 throughout. She is brisk rather than familiar, and every sentence is short, because she is
    // working.
    '小雨': {
      huh: ['啊？您说什么？', 'Sorry — what was that?'],
      turns: [
        // Her own line, already baked, reused verbatim so it needs no new clip — the string has to
        // match the roster letter for letter or the lookup misses and it plays silent.
        { ask: ['马上就好，您先坐。', "It'll be right up — have a seat."],
          opts: [
            { zh: '好，谢谢。我等一下。', en: 'Thanks — I\'ll wait.', ok: true,
              then: ['不着急，面要慢慢做。', 'No hurry. Noodles want making slowly.'] },
            { zh: '要多久？', en: 'How long will it be?', ok: true,
              then: ['十分钟。您喝点儿水吧。', 'Ten minutes. Have some water.'] },
            { zh: '我要买米。', en: 'I want to buy rice.' },
          ],
          gain: { mood: 3 } },
        { ask: ['您不是这儿的人吧？', 'You are not from round here, are you?'],
          opts: [
            { zh: '不是，我住在这个胡同。', en: 'No — I live in this alley.', ok: true,
              then: ['那我们是邻居，以后常来。',
                     'Then we are neighbours. Come often.'],
              learn: '邻居' },
            { zh: '对，我的中文不好。', en: 'That\'s right — my Chinese is not good.', ok: true,
              then: ['您的中文很好，听得懂。', 'Your Chinese is fine. I understand you.'],
              learn: '中文' },
            { zh: '我要一个篮子。', en: 'I want a basket.' },
          ],
          gain: { mood: 4 } },
        // What she is proud of, which is the one thing a bustling person will stop to tell you.
        { ask: ['我们的面是自己做的。', 'We make our noodles ourselves.'],
          opts: [
            { zh: '真的吗？谁做的？', en: 'Really? Who makes them?', ok: true,
              then: ['我爸做的，他早上四点就来。',
                     'My dad does. He is in at four in the morning.'] },
            { zh: '所以很好吃。', en: 'That is why they are good.', ok: true,
              then: ['谢谢您，慢用。', 'Thank you. Enjoy your meal.'],
              learn: '自己' },
            { zh: '我不会做饭。', en: 'I can\'t cook.' },
          ],
          gain: { mood: 5 } },
      ],
    },

    // ---- 小林 at the till in the 超市. The shop already has 超市老板, who asks what you want and
    // whether you need a bag, so she gets the other half of a shop: the basket, the money and
    // what is on the shelf tomorrow. Nothing here repeats a question he already asks.
    //
    // Qualified by place and role, not her common name.  The zoo also has a visitor called 小林;
    // a name-only key made him ask ten questions about baskets, cash and supermarket shelves.
    // A bare 收银员 key is no safer because the mall has cashiers in twelve unrelated tenants.
    'shop:收银员': {
      huh: ['啊，不好意思，我没听清。', 'Oh — sorry, I did not catch that.'],
      turns: [
        { ask: ['这些都要吗？', 'Do you want all of these?'],
          opts: [
            { zh: '都要，谢谢。', en: 'All of them, thanks.', ok: true,
              then: ['好，我算一下。', 'Right — let me add it up.'] },
            { zh: '这个我不要了。', en: 'Actually, not this one.', ok: true,
              then: ['好的，我放回货架。', "All right — I'll put it back on the shelf."] },
            { zh: '我在这儿工作。', en: 'I work here.' },
          ],
          learn: '货架', gain: { mood: 2 } },
        // Her own line, already baked, and the two words that carry it are the two the dictionary
        // is missing. What makes the turn answerable anyway is that the replies are transparent:
        // 用手机 is what 扫码 means and 给你钱 is what 现金 means, so the question can be got at
        // through the answers rather than through the words. That is the mechanic working as
        // designed, but it would work better with the words.
        { ask: ['扫码还是现金？', 'Scan the code, or cash?'],
          opts: [
            { zh: '我用手机。', en: 'By phone.', ok: true,
              then: ['好，您扫这儿。', 'Right — scan here.'] },
            { zh: '我给你钱。', en: "I'll give you cash.", ok: true,
              then: ['现金也行，谢谢您。', 'Cash is fine too — thank you.'] },
            { zh: '这个水果很新。', en: 'This fruit is fresh.' },
          ],
          gain: { mood: 2 } },
        // Not a question, and it is the one exchange in the shop where she volunteers something.
        // A shy person offers information rather than asking for it, so the shape of the turn is
        // the characterisation.
        { ask: ['明天早上有新鲜的。', "There'll be fresh ones tomorrow morning."],
          opts: [
            { zh: '我明天来。', en: "I'll come tomorrow.", ok: true,
              then: ['我明天也在，您来找我。', "I'm in tomorrow too — come and find me."] },
            { zh: '明天我要上班。', en: 'I have work tomorrow.', ok: true,
              then: ['那您下班以后来，我们晚上十点关门。',
                     'Come after work then — we shut at ten in the evening.'],
              learn: '关门' },
            { zh: '我不会做饭。', en: "I can't cook." },
          ],
          gain: { mood: 3 } },
      ],
    },

    // ---- 王经理, four floors up. Talking to him costs mood in the USE table and it should: he
    // opens with attendance, moves to a deadline, and the only warmth in three turns is the one
    // reply where he tells you to go home. Nothing he says is longer than it needs to be, and
    // 全勤二十 is the real number the punch clock pays.
    '王经理': {
      huh: ['什么？说清楚。', 'What? Say that properly.'],
      turns: [
        { ask: ['早上好，打卡了吗？', 'Morning. Have you clocked in?'],
          opts: [
            { zh: '打了，我八点就到了。', en: 'I have — I was in at eight.', ok: true,
              then: ['好，全勤有二十块。', 'Good. Full attendance pays twenty.'],
              learn: '全勤' },
            { zh: '还没打，我现在去。', en: 'Not yet — going now.', ok: true,
              then: ['快去，打卡机在门口。', 'Go on, then. The clock is by the door.'],
              learn: '打卡机' },
            { zh: '我要买米。', en: 'I want to buy rice.' },
          ],
          gain: { mood: 2 } },
        { ask: ['报告什么时候能交？', 'When can the report be in?'],
          opts: [
            { zh: '今天下班就交。', en: 'By the time I knock off today.', ok: true,
              then: ['好，写完报告给我看一下。', 'Good. Show it to me when it is written.'] },
            { zh: '明天行吗？', en: 'Can it be tomorrow?', ok: true,
              then: ['明天不行，今天要交。', 'Tomorrow will not do. It goes in today.'] },
            { zh: '我没有电脑。', en: "I don't have a computer." },
          ],
          learn: '报告', gain: { mood: 2 } },
        // The pay-off is inverted on purpose. Agreeing to the overtime earns you almost nothing,
        // because what you get for it is an evening at a desk; saying you are tired and being sent
        // home is the reply that actually mends your mood. He is brusque, not a monster.
        { ask: ['今天加班，行吗？', 'Working late today — all right?'],
          opts: [
            { zh: '行，我加班。', en: "Fine — I'll stay.", ok: true,
              then: ['好，加班有钱，八点下班。', 'Good. Overtime pays. You are out at eight.'],
              gain: { mood: 2 } },
            { zh: '不行，我今天很累。', en: "No — I'm tired today.", ok: true,
              then: ['累就回去休息，明天再说。',
                     'Go home and rest, then. We will talk about it tomorrow.'],
              gain: { mood: 6 } },
            { zh: '我要一杯茶。', en: 'I want a cup of tea.' },
          ],
          learn: '加班' },
      ],
    },

    // ---- the desk next to yours. Keyed on the role and not the name, which happens nowhere else
    // in this table: there are two 小赵, this one and a boarding agent at the airport gate, and
    // `scriptFor` tries the name before the role — so SCRIPTS['小赵'] would have put the office
    // printer and the canteen queue into the mouth of somebody standing at an airbridge. '同事'
    // belongs to exactly one person, and the name lookup falls through to it.
    //
    // She is the counterweight to 王经理 in the same room: she gossips about him, she offers to
    // show you how the spreadsheet works, and she is the only person in the office who asks you
    // to lunch. Everything she says is peer to peer — 你, no 您, and 吧 on anything she is
    // proposing rather than stating.
    '同事': {
      huh: ['啊？等一下，你说什么？', 'Hm? Hang on — what did you say?'],
      turns: [
        { ask: ['中午一起去吃面？', 'Noodles together at lunch?'],
          opts: [
            { zh: '好，我们几点去？', en: 'Sure — what time?', ok: true,
              // The noodle place is a storefront on the alley, not downstairs from the office, so
              // 楼下的餐馆 — which is what she would say if it were in the same building — would be
              // a line the map disagrees with.
              then: ['十二点，去胡同里的餐馆。', 'Twelve. The place along the alley.'],
              learn: '餐馆' },
            { zh: '我不饿，谢谢。', en: "I'm not hungry, thanks.", ok: true,
              then: ['那我自己去，你工作吧。', "I'll go on my own then — you get on."] },
            { zh: '打印机在哪儿？', en: 'Where is the printer?' },
          ],
          gain: { mood: 4 } },
        // Gossip, which is the one register a workplace cannot do without. Both right answers are
        // things a colleague would actually say back — one takes the hint, one already knows why.
        { ask: ['经理今天心情不好。', 'The manager is in a bad mood today.'],
          opts: [
            { zh: '我今天不去找他。', en: "I'll keep out of his way today, then.", ok: true,
              then: ['对，你今天别找他说话。', "Right — don't go talking to him today."] },
            { zh: '他今天要报告吧？', en: "He wants the report today, doesn't he?", ok: true,
              then: ['对，报告今天要交，我们都要加班。',
                     'He does — it goes in today, and we are all working late.'] },
            { zh: '我不喝咖啡。', en: "I don't drink coffee." },
          ],
          learn: '心情', gain: { mood: 3 } },
        { ask: ['你会做表格吗？我教你。',
                'Do you know how to do the spreadsheet? I can show you.'],
          opts: [
            { zh: '我不会，你教我吧。', en: "I don't — show me.", ok: true,
              then: ['你看我做，五分钟就会了。', "Watch me do one. You'll have it in five minutes."] },
            { zh: '我会做，谢谢你。', en: 'I can do it, thanks.', ok: true,
              then: ['好，那你做吧，我去打印。', "Fine, you do it — I'm going to the printer."],
              learn: '打印' },
            { zh: '空调坏了。', en: 'The air conditioning is broken.' },
          ],
          learn: '做表格', gain: { mood: 4 } },
      ],
    },

    // ---- 王师傅 at the ticket window in the 火车站. Officialdom: no greeting, no thanks, the rule
    // stated once, and you are dismissed when the exchange is over. The lesson underneath is the
    // one thing a foreigner at that window actually has to know — she asks for a 身份证, which you
    // do not have, and a 护照 is the answer.
    //
    // 明天早上还有两张 is her own bark reused verbatim as a reply, so it needs no new clip: the
    // string has to match the roster letter for letter or the clip lookup misses and the line
    // plays silent.
    '王师傅': {
      huh: ['说什么？后面还有人排队。', 'Say that again? There are people waiting.'],
      turns: [
        { ask: ['去哪儿？身份证。', 'Where to? ID card.'],
          opts: [
            { zh: '去上海，这是我的护照。', en: "Shanghai. Here's my passport.", ok: true,
              then: ['护照也行。去上海，明天还有票。',
                     'A passport does. Shanghai — there are still tickets for tomorrow.'],
              learn: '护照' },
            { zh: '我要两张票，去上海。', en: 'Two tickets to Shanghai.', ok: true,
              then: ['两张明天的票，交钱。', 'Two for tomorrow. Pay here.'],
              learn: '张' },
            { zh: '我要休息一下。', en: 'I want a rest.' },
          ],
          gain: { mood: 2 } },
        // Her flattest line and the most useful one in the room: the window is the slow way to do
        // this and she says so. Both answers are right, and the one that takes her advice gets
        // 下一位 — she is finished with you, which is the correct outcome and worth hearing.
        { ask: ['手机上也能买，不用排队。', 'You can buy it on your phone — no need to queue.'],
          opts: [
            { zh: '我想在这儿买。', en: "I'd rather buy it here.", ok: true,
              then: ['行，那你排队吧。', 'Fine. Queue up, then.'],
              learn: '排队' },
            { zh: '好，我用手机买。', en: "All right, I'll use my phone.", ok: true,
              then: ['那你手机上买。下一位。', 'Do it on your phone, then. Next.'] },
            { zh: '这个座位很硬。', en: 'This seat is hard.' },
          ],
          gain: { mood: 2 } },
        { ask: ['今天的票卖完了。', "Today's tickets are sold out."],
          opts: [
            { zh: '那明天还有票吗？', en: 'Are there any for tomorrow?', ok: true,
              then: ['明天早上还有两张。', 'There are two left for tomorrow morning.'] },
            { zh: '我明天再来。', en: "I'll come back tomorrow.", ok: true,
              // Six, because that is when her spot in the roster starts. A ticket window that
              // opens at a time she is not standing there is a line the room contradicts.
              then: ['行，明天六点开门。', 'Fine. We open at six.'],
              learn: '开门' },
            { zh: '我在这个楼上班。', en: 'I work in this building.' },
          ],
          gain: { mood: 3 } },
      ],
    },

    // ================================================================ 机场 the boarding chain
    // 售票处 → 值机 → 安检 → 登机口 is the longest thing to do in this game, and until now the
    // three people standing along it said six barks each and nothing back. They are also the only
    // people in the game with a *state machine* behind them: `situation()` reads the ticket in
    // your pocket and the schedule the terminal is running, so what they say to you depends on
    // how far along the chain you actually are. Walking up to the check-in desk with no ticket
    // and walking up to it holding one are two different conversations, and now they are.
    //
    // Register keeps the three apart, and at an airport that is largely a matter of *pressure*.
    // 陈姐 has been behind that glass for twenty years and states a rule once. 小许 is young,
    // genial and processing you — every second sentence is an instruction. 小赵 at the gate has
    // nothing to do for six hours and then forty minutes in which everything happens at once, and
    // her final-call lines are the shortest sentences any of these three people say.
    //
    // Nobody repeats 王师傅 at the railway ticket window, who already owns 身份证-or-护照 as a
    // *lesson* and owns 排队 and 卖完了. 陈姐's 身份证 turn is the other half of that same fact
    // and the one a foreigner actually trips on: there is no paper ticket to hand over at all —
    // the seat is held against the document, which is why the number is all she wants.
    //
    // What these questions are made of: nearly all of it is in the dictionary already —
    // 机票 单程 往返 值机 改签 身份证 护照 行李 托运 靠窗 走廊 登机牌 登机口 安检 座位 延误
    // 排队 柜台 售票处 起飞 航班 晚点 — which is why the ruby comes out over almost every ask.
    // Every ask written *here* is built out of words the dictionary knows, and where it would not
    // have been the sentence was changed rather than the gap accepted: 还有什么事 for 还要办什么,
    // 要等一个多小时 for 晚一个多小时, 只能值机 for 只办值机, 在您那儿 for 在您手上. 办, 手 and
    // 晚 are all missing and all avoidable, and a clerk says either version.
    //
    // The four asks that do come out with bare hanzi in them are the four that are somebody's own
    // baked bark, where the string has to match the roster letter for letter or the clip lookup
    // misses and the line plays silent: 提前 in 陈姐's 提前两个小时到机场, and 开始 · 带 · 广播 in
    // 小赵's three. Those are dictionary gaps, not writing, and they are ticketed. 过道 is a fifth
    // and is why the seat question says 靠走廊: 走廊 is in the dictionary, 过道 is not, and it is
    // 小许's own baked line either way.

    // ---- 陈姐 at the 售票处 window, where the whole chain starts. Twenty years and reading
    // glasses: no greeting, no chat, the number given once and the useful thing volunteered at
    // the end, which is the difference between her and 王师傅 — he dismisses you, she tells you
    // when to be back.
    //
    // Five of her six baked barks are reused verbatim as asks, so five of these turns need no new
    // clip: the strings have to match the roster letter for letter or the lookup misses and the
    // line plays silent.
    '陈姐': {
      huh: ['您再说一遍，这边听不清。', "Say that again — I can't hear you through the glass."],
      turns: [
        // What she opens with, and the clearest case in the building for asking the state first:
        // 您去哪儿 to somebody already holding a ticket is a clerk who has not looked at you.
        { ask: ['您去哪儿？', 'Where are you going?'],
          opts: [
            { zh: '我去上海，多少钱？', en: 'Shanghai. How much is it?', ok: true,
              then: ['上海往返四百八，最早的一班八点二十。',
                     'Shanghai return, four eighty. The first one goes at twenty past eight.'],
              learn: '往返' },
            { zh: '我要一张去成都的机票。', en: 'One ticket to Chengdu.', ok: true,
              then: ['成都八百二，下午一点零五起飞。',
                     'Chengdu is eight twenty. It leaves at five past one.'],
              learn: '机票' },
            // Wrong here and right forty metres away, which is the lesson: this window sells the
            // ticket and does not touch your bag.
            { zh: '行李要托运吗？', en: 'Do I need to check this bag?' },
          ],
          gain: { mood: 2 },
          alts: [
            // 还有什么事 rather than 还要办什么, which is what she would also say: 办 is not in
            // the dictionary and 事 is, and a question with a bare hanzi in the middle of it is a
            // question with a hole in the pinyin. Both are things a clerk says; take the one the
            // ruby comes out over.
            { when: s => s.has,
              ask: ['票已经买好了，您还有什么事？',
                    'You have your ticket already. Was there something else?'],
              opts: [
                { zh: '我想问一下，在哪儿值机？', en: 'Where do I check in?', ok: true,
                  then: ['值机柜台在那边，起飞前三个小时开。',
                         'Check-in is over there. It opens three hours before departure.'],
                  learn: '值机' },
                { zh: '这张票能改签吗？', en: 'Can this ticket be changed?', ok: true,
                  then: ['能改签，改一次五十块。', 'It can. Fifty yuan a change.'],
                  learn: '改签' },
                { zh: '行李要托运吗？', en: 'Do I need to check this bag?' },
              ] },
          ] },
        { ask: ['单程还是往返？', 'Single or return?'],
          opts: [
            { zh: '往返，我下个星期回来。', en: "Return — I'm back next week.", ok: true,
              then: ['往返便宜一点，回来的日子还能改。',
                     'Return works out cheaper, and you can still move the date back.'] },
            { zh: '单程就行，我不回来了。', en: "One way. I'm not coming back.", ok: true,
              then: ['单程也卖，就是贵一点。', 'We sell one-ways. They just cost more.'] },
            { zh: '我坐地铁来的。', en: 'I came on the metro.' },
          ],
          learn: '单程', gain: { mood: 3 } },
        // The 身份证 turn, and not the one 王师傅 already gives. His teaches that a passport will
        // do; hers teaches what happens next — nothing is handed over, because there is no paper
        // ticket in China any more. The seat is held against whichever document you showed.
        { ask: ['身份证给我看一下。', 'Identity card, please.'],
          opts: [
            { zh: '我是外国人，用护照行吗？', en: "I'm a foreigner — will a passport do?",
              ok: true,
              then: ['护照可以，我记一下号码。', 'A passport is fine. Let me take the number.'],
              learn: '护照' },
            { zh: '给您。票上写我的名字吗？', en: 'Here you are. Does my name go on the ticket?',
              ok: true,
              then: ['没有纸票，票记在您的证件上。',
                     'There is no paper ticket. It is held against your document.'] },
            { zh: '我要一杯咖啡。', en: "I'd like a coffee." },
          ],
          gain: { mood: 2 } },
        // Her last word, which is the one thing at this window worth carrying out of the building
        // — unless the flight she sold you is in trouble, in which case her last word is that.
        { ask: ['提前两个小时到机场。', 'Be at the airport two hours before.'],
          opts: [
            { zh: '好，我提前两个小时来。', en: 'Right — two hours before.', ok: true,
              then: ['两个小时正好，值机四十五分钟前就关。',
                     'Two hours is about right. Check-in shuts forty-five minutes before.'] },
            { zh: '一个小时够吗？', en: 'Is one hour enough?', ok: true,
              then: ['一个小时太紧，安检还要排队。',
                     'An hour is tight. There is still the queue at security.'],
              learn: '安检' },
            { zh: '我不会开车。', en: "I can't drive." },
          ],
          gain: { mood: 3 },
          alts: [
            // 海口 HL7802 leaves sixty-five minutes late every day of the week, so this is not a
            // corner case somebody has to be unlucky to see — it is one of the seven flights.
            { when: s => s.has && (s.late || s.cancelled),
              ask: ['您这班延误了，要等一个多小时。',
                    "Yours is delayed. There is over an hour to wait."],
              opts: [
                { zh: '延误多长时间？几点起飞？', en: 'How long? What time does it go?', ok: true,
                  then: ['听广播就行，登机口没换。',
                         "Listen for the announcement. The gate hasn't changed."],
                  learn: '延误' },
                { zh: '那我先去喝杯咖啡。', en: "I'll get a coffee then.", ok: true,
                  then: ['去吧，登机的时候会广播。',
                         "Go on. They'll call it over the speakers when it boards."] },
                { zh: '我不会开车。', en: "I can't drive." },
              ],
              gain: { mood: 2 } },
          ] },
      ],
    },

    // ---- 小许 at 值机 position 2. Genial, young, and the only one of the three whose job is to
    // *do* something to you rather than tell you something: every second sentence she says is an
    // instruction, and the exchange ends with an object in your hand.
    //
    // Her opening turn is the richest state read in the terminal and gets three versions of
    // itself, because there are three genuinely different people who walk up to a check-in desk:
    // one with no ticket, who is at the wrong counter; one with a ticket, who is why the desk is
    // there; and one already checked in, who wants to know where the gate is. A desk that greets
    // all three with 身份证就行 is the shallow dialogue this file was opened to replace.
    //
    // Which of the three is written as the *base* turn, with the other two as `alts`, is not a
    // free choice. The base is what plays when no `when` matches — and that is also what plays
    // when there is nothing to match against: outside the terminal, before the game has finished
    // loading, and for any tool that walks the table as data rather than in a situation. So the
    // base has to be the empty-handed case. Writing 身份证就行 as the base and the empty-handed
    // one as an alt reads the same on the page and is wrong in all three of those places — and
    // .talkcheck.js catches it, because it measures the words of the base ask against the grading
    // the answer actually did and finds them to be two different sentences.
    '小许': {
      huh: ['不好意思，您再说一遍。', 'Sorry — say that again?'],
      turns: [
        // No ticket. The commonest way to be standing at this desk wrongly, and she sends you
        // back landside rather than explaining anything.
        { ask: ['您先买票，这儿只能值机。',
                'You need a ticket first. This desk only does check-in.'],
          opts: [
            { zh: '票在哪儿买？', en: 'Where do I buy one?', ok: true,
              then: ['售票处在那边，进门左手边。',
                     'The ticket office is over there — left as you come in.'],
              learn: '售票处' },
            { zh: '我在手机上买行吗？', en: 'Can I buy it on my phone?', ok: true,
              then: ['手机上买也一样，买完回来找我。',
                     'Buying it on your phone is just the same. Come back to me when you have.'] },
            // Her own question, in your mouth, at the wrong end of the exchange.
            { zh: '靠窗还是靠走廊？', en: 'Window or aisle?' },
          ],
          learn: '机票', gain: { mood: 2 },
          alts: [
            // Already holding a card. She is not going to ask for your ID again, and the two
            // things you would actually ask her are the two things the card does not print.
            { when: s => s.checked,
              ask: ['您已经值机了，登机牌在您那儿。',
                    'You are checked in already — you have the card.'],
              opts: [
                { zh: '我的座位在哪儿？', en: 'Where is my seat?', ok: true,
                  then: ['座位号写在登机牌上，您看一下。',
                         'The seat number is printed on the card — have a look.'],
                  learn: '座位号' },
                // The one omission the whole listening mechanic hangs off: the card does not say
                // which gate, so the loudspeaker is the only place that does.
                { zh: '登机口是几号？', en: 'Which gate is it?', ok: true,
                  then: ['登机牌上没写，请听广播。',
                         'It is not on the card. Listen for the announcement.'],
                  learn: '登机口' },
                { zh: '我想再买一张票。', en: "I'd like to buy another ticket." },
              ],
              learn: '登机牌', gain: { mood: 2 } },
            // A ticket and no card: the passenger this desk is for, and her own baked greeting.
            { when: s => s.has,
              ask: ['先生，身份证就行。', 'Sir — just your ID card.'],
              opts: [
                { zh: '我没有身份证，护照可以吗？',
                  en: 'I have no ID card — is a passport all right?', ok: true,
                  then: ['护照可以，我扫一下就行。', "A passport is fine. I'll just scan it."] },
                { zh: '给您，我要去上海。', en: "Here you are. I'm going to Shanghai.", ok: true,
                  then: ['好的，八点二十那班，我给您办。',
                         'Right — the eight twenty. Let me check you in.'] },
                { zh: '我要买一张机票。', en: 'I want to buy a ticket.' },
              ],
              learn: '身份证', gain: { mood: 3 } },
          ] },
        { ask: ['行李有几件？要托运吗？', 'How many bags? Anything for the hold?'],
          opts: [
            { zh: '一件，我要托运。', en: "One, and I'd like to check it.", ok: true,
              then: ['放上来，二十三公斤以内都行。',
                     'Put it up here. Anything up to twenty-three kilos.'],
              learn: '托运' },
            { zh: '没有行李，就一个包。', en: 'No luggage — just this bag.', ok: true,
              then: ['那您直接带上飞机，不用托运。',
                     'Take it on with you, then. Nothing to check.'] },
            // Right answer to her *next* question, which is what makes it the wrong one here.
            { zh: '我要一个靠窗的。', en: "I'd like a window one." },
          ],
          learn: '行李', gain: { mood: 3 } },
        { ask: ['靠窗还是靠走廊？', 'Window or aisle?'],
          opts: [
            { zh: '靠窗，我想看外面。', en: "Window — I'd like to look out.", ok: true,
              then: ['好，给您一个靠窗的。', 'Right — a window seat for you.'] },
            // 走廊 rather than the turn's 靠窗, because the word this answer is evidence for is
            // the one it chose.
            { zh: '靠走廊，我要上洗手间。', en: "Aisle — I'll be up to the toilet.", ok: true,
              then: ['靠走廊方便，出来好走。', 'The aisle is handy. Easier to get out.'],
              learn: '走廊' },
            { zh: '一件行李。', en: 'One bag.' },
          ],
          learn: '靠窗', gain: { mood: 4 } },
        // The card changing hands. Both right answers are answered with lines she already had —
        // 登机口在安检那边 and 还有四十分钟登机 — so this whole turn costs no new clip.
        { ask: ['这是您的登机牌，请拿好。', "Here is your boarding card. Don't lose it."],
          opts: [
            { zh: '谢谢，登机口在哪儿？', en: "Thanks. Where's the gate?", ok: true,
              then: ['登机口在安检那边，往里走。',
                     'Your gate is through security — keep going in.'],
              learn: '登机牌' },
            { zh: '还有多长时间登机？', en: 'How long until boarding?', ok: true,
              then: ['还有四十分钟登机。', 'Boarding in forty minutes.'] },
            { zh: '我要托运两件行李。', en: 'I want to check two bags.' },
          ],
          gain: { mood: 5 },
          alts: [
            // The same card, handed over late. She stops explaining and starts moving you.
            { when: s => s.checked && (s.code === 'board' || s.code === 'shut'),
              ask: ['您那班已经在登机了，快走吧。',
                    "Your flight is boarding already. You'd better go."],
              opts: [
                { zh: '谢谢，登机口在哪儿？', en: "Thanks. Where's the gate?", ok: true,
                  then: ['登机口在安检那边，往里走。',
                         'Your gate is through security — keep going in.'],
                  learn: '登机口' },
                { zh: '还来得及吗？', en: 'Will I make it?', ok: true,
                  then: ['来得及，安检快一点就行。',
                         "You'll make it. Just be quick through security."] },
                { zh: '我要办值机。', en: "I'd like to check in." },
              ],
              gain: { mood: 2 } },
          ] },
      ],
    },

    // ---- 小赵 at the 登机口, and keyed on her role for the same reason the office colleague is:
    // there are two 小赵 in this game, and `scriptFor` tries the name before the role. A
    // SCRIPTS['小赵'] here would have put an airbridge into the mouth of the woman at the desk
    // next to yours, and a canteen queue into this one's. Neither of them may hold the name.
    //
    // The gate is the one place in the terminal with two registers rather than one, and the state
    // read is what switches between them. Most of her day there is nothing to do and she answers
    // in whole sentences. Once the last call has gone out she is counting heads against a manifest
    // with a door about to shut, and her sentences drop to three and four characters.
    '登机员': {
      huh: ['什么？这边有点吵。', "What? It's noisy over here."],
      turns: [
        // No card is the base for the same reason it is at the check-in desk: it is what plays
        // when there is nothing to read a situation off, and it is the commonest way to arrive
        // at a gate wrongly. The answer is that you are on the wrong side of the building.
        { ask: ['没有登机牌上不了飞机。', "You can't board without a boarding card."],
          opts: [
            { zh: '我在哪儿办登机牌？', en: 'Where do I get one?', ok: true,
              then: ['出去，值机柜台在安检外面。',
                     'Back out. The check-in desks are the other side of security.'],
              learn: '柜台' },
            { zh: '我的票在手机上。', en: 'My ticket is on my phone.', ok: true,
              then: ['手机上的票也要去柜台换登机牌。',
                     'A phone ticket still has to be swapped for a card at the desk.'] },
            { zh: '我要靠窗的座位。', en: "I'd like a window seat." },
          ],
          learn: '登机牌', gain: { mood: 2 },
          alts: [
            { when: s => s.checked,
              ask: ['登机牌给我看一下。', 'Boarding card, please.'],
              opts: [
                { zh: '给您，我的座位在哪儿？', en: "Here. Where's my seat?", ok: true,
                  then: ['您的座位在后舱，往里走。',
                         'Your seat is towards the back — keep going down.'] },
                { zh: '这是我的登机牌和护照。', en: "Here's my boarding card and passport.",
                  ok: true,
                  // The detail that makes this a Chinese gate and not a translated one: on a
                  // domestic sector nobody looks at a passport, and she hands it straight back.
                  then: ['国内的不用看护照，拿好。',
                         "We don't check passports on a domestic one. Hold on to it."] },
                { zh: '我要买一张票。', en: 'I want to buy a ticket.' },
              ],
              learn: '登机牌', gain: { mood: 4 } },
          ] },
        { ask: ['开始登机了，请排队。', 'We are boarding. Please queue up.'],
          opts: [
            { zh: '我排在哪儿？', en: 'Where do I queue?', ok: true,
              then: ['就在这儿排，一个一个来。', 'Right here. One at a time.'],
              learn: '排队' },
            { zh: '我的座位是后舱的。', en: 'My seat is at the back.', ok: true,
              then: ['后舱先上，您可以过来了。',
                     'The back boards first. You can come through.'] },
            { zh: '我还没吃饭。', en: "I haven't eaten yet." },
          ],
          gain: { mood: 3 } },
        { ask: ['先请老人和带小孩的。', 'The elderly and passengers with children first.'],
          opts: [
            { zh: '好，我等一下。', en: "All right, I'll wait.", ok: true,
              then: ['谢谢您，马上就到您。', "Thank you. You're next."] },
            { zh: '我一个人，不着急。', en: "I'm on my own — no rush.", ok: true,
              then: ['那您站这边，等我叫您。',
                     "Stand this side, then. I'll call you."] },
            { zh: '我的行李托运了。', en: 'I checked my bag in.' },
          ],
          gain: { mood: 4 } },
        // Her last word to you, which is either a send-off or a countdown depending entirely on
        // what the clock is doing to the flight she is standing at.
        { ask: ['慢走，一路平安。', 'Off you go. Safe journey.'],
          opts: [
            { zh: '谢谢，我上飞机了。', en: "Thank you — I'm getting on.", ok: true,
              then: ['往里走，右手边。', 'Straight on down, on your right.'] },
            { zh: '下飞机以后怎么走？', en: 'How do I get out at the other end?', ok: true,
              then: ['下了飞机跟着人走就行。',
                     "Follow everybody off the aircraft. You'll be fine."] },
            { zh: '我要退票。', en: 'I want a refund.' },
          ],
          gain: { mood: 5 },
          alts: [
            // Final call, and the shortest lines in the file. 就您一位了 is what she is actually
            // looking at: a manifest with one name left on it.
            { when: s => s.code === 'shut' || s.code === 'board',
              ask: ['最后一次登机广播。', 'This is the final boarding call.'],
              opts: [
                { zh: '我是这班的，我马上过去。', en: "That's my flight — I'm coming.", ok: true,
                  then: ['快点，门要关了。', 'Quickly. The door is closing.'] },
                { zh: '我的登机牌在这儿。', en: "Here's my boarding card.", ok: true,
                  then: ['就您一位了，跑吧。', "You're the last one. Run."] },
                { zh: '我明天再来。', en: "I'll come back tomorrow." },
              ],
              gain: { mood: 2 } },
          ] },
      ],
    },
  };

  // ---- 咖啡师, who is not a person yet.
  //
  // She is *drawn* — airport.js stands her at the café counter, beside the espresso machine and
  // the price board that says 咖啡 38 · 拿铁 42 · 茶 25 — but she is drawn the way the queue and
  // the smoker are drawn, as a primitive `agent()` capsule. There is no row for her in data.js,
  // which means she has no name, no `hz` the roster can find, no USE verb in the world that
  // reaches her, and no voice in the bake. A script under her name in SCRIPTS would fail
  // .talkcheck.js on the very first thing it checks — a script whose person is not in the roster
  // — and would be unreachable in the game besides. This is the same hole 李大妈 and 陈老师 were
  // in, and it is not this file's to close: it wants one NPC row and one USE row, both in files
  // the Hub owns. It is ticketed.
  //
  // So her conversation waits here instead, written and idle, and lets itself in the moment she
  // becomes somebody — see `table()`. Landing her costs the Hub two rows and a re-bake; nothing
  // in this file has to change.
  //
  // Her prices are the ones on the board behind her, because a barista who quotes a price the
  // room contradicts is worse than one who says nothing. The state she reads is the only one that
  // matters at a café inside security: whether the aeroplane you are waiting for has started
  // boarding, which is the difference between 坐一会儿 and a paper cup.
  const SOON = {
    '咖啡师': {
      huh: ['啊？不好意思，机器有点吵。', "Sorry? The machine's a bit loud."],
      turns: [
        { ask: ['您好，喝点儿什么？', 'Hello — what can I get you?'],
          opts: [
            { zh: '一杯咖啡，多少钱？', en: 'A coffee. How much?', ok: true,
              then: ['咖啡三十八，拿铁四十二。',
                     'Coffee is thirty-eight, a latte forty-two.'],
              learn: '拿铁' },
            { zh: '有没有热的茶？', en: 'Do you have hot tea?', ok: true,
              then: ['有，茶二十五，马上给您。',
                     'We do. Tea is twenty-five. Coming right up.'] },
            { zh: '我要去登机口。', en: "I'm going to the gate." },
          ],
          learn: '咖啡', gain: { mood: 3 },
          alts: [
            { when: s => s.has && s.code === 'board',
              ask: ['您那班在登机了吧？要不要带走？',
                    "Yours is boarding, isn't it? Shall I make it to take away?"],
              opts: [
                { zh: '对，快一点，我要带走。', en: "Yes — quickly, to take away.", ok: true,
                  then: ['好，给您用纸杯，两分钟。',
                         "Right — paper cup, two minutes."] },
                { zh: '不急，还有二十分钟。', en: "No rush — I've twenty minutes.", ok: true,
                  then: ['那给您用杯子，您坐一会儿。',
                         'A proper cup, then. Sit down for a bit.'] },
                { zh: '我要一张机票。', en: 'I want a plane ticket.' },
              ],
              gain: { mood: 2 } },
          ] },
        { ask: ['热的还是冰的？', 'Hot or iced?'],
          opts: [
            { zh: '热的，谢谢。', en: 'Hot, thanks.', ok: true,
              then: ['热的好，机场里冷。', 'Hot is better. It is cold in here.'] },
            { zh: '冰的，今天太热了。', en: "Iced — it's too hot today.", ok: true,
              then: ['冰的马上就好。', 'One iced. Right away.'] },
            { zh: '我要靠窗的座位。', en: "I'd like a window seat." },
          ],
          gain: { mood: 3 } },
        // 加糖加奶 is what she would say and 奶 is not in the dictionary; 牛奶 is, and it is the
        // same question.
        { ask: ['要加糖和牛奶吗？', 'Sugar and milk?'],
          opts: [
            { zh: '不加糖，加一点牛奶。', en: 'No sugar, a little milk.', ok: true,
              then: ['好，给您加一点。', "Right — just a little."],
              learn: '牛奶' },
            { zh: '都不加，谢谢。', en: 'Neither, thanks.', ok: true,
              then: ['行，什么都不加。', 'Fine. Nothing in it.'] },
            { zh: '我坐地铁来的。', en: 'I came on the metro.' },
          ],
          gain: { mood: 3 } },
        { ask: ['在这儿喝还是带走？', 'Drinking in, or taking it with you?'],
          opts: [
            { zh: '带走，我要去登机口了。', en: "Take away — I'm off to the gate.", ok: true,
              then: ['那给您装好，一路平安。',
                     "I'll get it ready for you. Safe journey."] },
            { zh: '在这儿喝，我时间还早。', en: "Drinking in — I'm early.", ok: true,
              then: ['那边有位子，坐一会儿吧。',
                     "There are seats over there. Sit down a while."] },
            { zh: '我没有登机牌。', en: "I don't have a boarding card." },
          ],
          gain: { mood: 6 } },
      ],
    },

    // ================================================================ 京华大酒店
    //
    // Eight people, and the first place in the game where the language changes register on you.
    //
    // Everybody in the hutong says 你. Every member of staff in this building says 您, in every
    // line, without a single exception — and because that contrast *is* the lesson, it is never
    // broken for variety. One receptionist saying 你 once would undo the only place the game has
    // to make the point. What the player says back stays in the register a learner would really
    // reach for, which is why 谢谢您 is on their side of the exchange and 您好 is only ever on the
    // staff's.
    //
    // ---- what a right answer is worth here, which is not only a mood point.
    //
    // Two of these trees put comprehension in front of something that costs an evening or money.
    // 许管家 hands what you understood to `Stay.report(key, heard, day)` — the same seam the
    // reception picker uses — so following her means the fault is fixed tonight and nodding at her
    // means a fan arrives instead and the real repair is tomorrow morning. 沈经理's bill turn takes
    // a queried charge off or leaves it on. Both go through `does`; see `land()` above.
    //
    // ---- and what is deliberately not here.
    //
    // The booking itself. Choosing a grade, paying, and being handed a card is a transaction with
    // a wallet in it and it belongs to the reception picker in hotel-public.js, which already does
    // it properly. 林若's tree is the *conversation* around that transaction — the document, the
    // grade, the nights, the floor — and it does not book anything.

    // ---- 林若 at the front desk. 办理入住 (H170).
    //
    // Her two barks are both reused as asks, so this whole tree costs two new clips fewer than it
    // looks. Her first is the line every check-in in China actually opens with — the document
    // before the room — and it is worth the player learning in that order.
    '林若': {
      huh: ['不好意思，您再说一遍。', 'Sorry — could you say that once more?'],
      turns: [
        { ask: ['您好，请出示证件。', 'Good afternoon. May I see your identification?'],
          opts: [
            { zh: '好的，这是我的护照。', en: 'Of course — here is my passport.', ok: true,
              then: ['谢谢您，我看一下。', 'Thank you. Let me take a look.'],
              does: { doc: 'passport' } },
            { zh: '我的身份证在房间里。', en: 'My ID card is up in the room.', ok: true,
              then: ['那您先拿下来，我等您。', 'Fetch it down and I will wait for you.'] },
            { zh: '我要一杯咖啡。', en: "I'd like a coffee." },
          ],
          learn: '证件', gain: { mood: 2 } },
        { ask: ['您要标准间还是大床房？', 'Would you like a twin room or a room with one big bed?'],
          opts: [
            { zh: '标准间就行，谢谢您。', en: 'A twin is fine, thank you.', ok: true,
              then: ['好的，标准间。', 'A twin room, then.'] },
            { zh: '我要大床房。', en: 'The one with the big bed, please.', ok: true,
              then: ['大床房，房价高一点。', 'A double — the rate is a little higher.'] },
            { zh: '这儿有洗衣房吗？', en: 'Is there a laundry here?' },
          ],
          learn: '标准间', gain: { mood: 2 } },
        { ask: ['您住几晚？', 'How many nights will you be staying?'],
          opts: [
            { zh: '住两晚。', en: 'Two nights.', ok: true },
            { zh: '住一晚，明天退房。', en: 'One night — I check out tomorrow.', ok: true },
            { zh: '我叫马克。', en: 'My name is Mark.' },
          ],
          yes: ['好的。押金两百，退房的时候退给您。',
                'Very good. The deposit is two hundred, returned when you check out.'],
          learn: '押金', gain: { mood: 3 } },
        { ask: ['早餐在二楼全日餐厅。', 'Breakfast is in the second-floor all-day restaurant.'],
          opts: [
            { zh: '好的，二楼。早餐到几点？', en: 'Right — the second floor. Until what time?',
              ok: true, then: ['到十点半。房卡给您。', 'Until half past ten. Here is your card.'] },
            { zh: '早餐在八楼吗？', en: 'Is breakfast on the eighth floor?' },
            { zh: '我要寄存行李。', en: "I'd like to leave my luggage." },
          ],
          learn: '房卡', gain: { mood: 3 } },
      ],
    },

    // ---- 许管家 on the eighth floor. 报修, and the tree the whole language brief is really about
    // (H171, H179).
    //
    // Turn 0 is the report. Turn 1 is her answer, and her answer is the thing that has to be
    // understood, because it contains a place and a wait: stay in the room and somebody comes
    // tonight, and 那我明天再说 — which is a perfectly natural sentence and exactly what somebody
    // who did not follow her would say — sends them away. That reply is marked wrong, so she asks
    // again and the turn stays open, but it still carries a `does`: the wrong thing turns up, the
    // evening is gone, and the fault is there in the morning. Nothing anywhere says "wrong answer".
    // The string 那我明天再说 is lifted verbatim from Stay.PROBLEMS aircon.slip, so the sentence the
    // player picks and the consequence the hotel writes down are the same sentence.
    //
    // ---- why turn 0 has six versions of itself.
    //
    // Written once, it offered three faults — the air conditioning, the hot water and the
    // neighbours — and `Stay` seeds one of *six*. A stay whose fault was 没有毛巾 could not be
    // reported at all: whatever the player picked was a different fault, `Stay.report` took its
    // "somebody comes and it is not what you need" branch, and no amount of understanding her
    // afterwards could ever fix the room. It read perfectly on the page and was unwinnable in
    // three stays out of six, which is exactly the kind of thing only playing it finds.
    //
    // So the turn carries one alt per problem key, and the fault the room actually has is always
    // the first reply. The second is always a different one, so telling her the wrong thing stays
    // possible and stays a story; the third is always a non-answer. Same three slots, same one
    // marked `ok` twice over, which is the rule every variant in this file lives under. The asks
    // are the same sentence in every version, so none of this costs a clip.
    '许管家': {
      huh: ['您别急，慢慢说。', 'No hurry — say it again slowly.'],
      turns: [
        (() => {
          // Her replies, one per fault, written once and shared by every variant below — which is
          // what keeps six versions of a question down to six lines of new audio.
          const SAY = {
            aircon:    ['我马上叫工程部的师傅上来。', 'I will have an engineer come up right away.'],
            hotwater:  ['我这就打电话给工程部。', 'I am ringing engineering this minute.'],
            noise:     ['我提醒一下隔壁，也可以给您换房间。', 'I will speak to them, or I can move you.'],
            towels:    ['我让客房部马上送毛巾上来。', 'I will have housekeeping bring towels straight up.'],
            wrongroom: ['房型登记错了，我给您换一间。', 'The room type was registered wrongly — I will move you.'],
            card:      ['房卡消磁了，我让前台重做一张。', 'The card is demagnetised — the desk will make a new one.'],
          };
          const SAID = {
            aircon:    ['空调坏了，房间太热。', 'The air conditioning is broken — the room is too hot.'],
            hotwater:  ['没有热水，我洗不了澡。', 'There is no hot water — I cannot shower.'],
            noise:     ['隔壁太吵，我睡不着。', 'Next door is too loud — I cannot sleep.'],
            towels:    ['房间里没有毛巾。', 'There are no towels in the room.'],
            wrongroom: ['房型不对，我订的是标准间。', 'The room type is wrong — I booked a twin.'],
            card:      ['房卡消磁了，开不了门。', 'The key card is dead — it will not open the door.'],
          };
          const opt = k => ({ zh: SAID[k][0], en: SAID[k][1], ok: true, then: SAY[k],
                              does: { report: k } });
          const NO = { zh: '我要办入住。', en: "I'd like to check in." };
          // Which fault is offered second when the room's own fault is offered first. Any other
          // one will do; this just keeps it stable rather than arbitrary.
          const OTHER = { aircon:'hotwater', hotwater:'aircon', noise:'towels',
                          towels:'noise', wrongroom:'card', card:'wrongroom' };
          const turn = {
            ask: ['您的房间有什么问题吗？', 'Is there something wrong with your room?'],
            // The base is the empty-handed case: nobody has checked in, so there is no seeded
            // fault to put first and this is simply the commonest pair.
            opts: [opt('aircon'), opt('hotwater'), NO],
            learn: '问题', gain: { mood: 2 },
            alts: Object.keys(SAID).map(k => ({
              when: s => s.problem === k,
              opts: [opt(k), opt(OTHER[k]), NO],
            })),
          };
          return turn;
        })(),
        { ask: ['二十分钟以后有人上来。您在房间等一下，行吗？',
                'Somebody will be up in twenty minutes. Could you wait in the room?'],
          opts: [
            { zh: '行，我在房间等。', en: 'Yes — I will wait in the room.', ok: true,
              then: ['好的，上去以前会敲门。', 'Good. They will knock before coming in.'],
              does: { heard: true }, gain: { mood: 4 } },
            { zh: '那我明天再说。', en: 'I will leave it until tomorrow, then.',
              does: { heard: false } },
            { zh: '我要退房。', en: "I'd like to check out." },
          ],
          learn: '修' },
        { ask: ['都处理好了。今天晚上您好好休息。',
                'It has all been dealt with. Do get a proper rest tonight.'],
          opts: [
            { zh: '太好了，谢谢您。', en: 'Wonderful — thank you.', ok: true,
              then: ['别客气，有事再叫我。', 'Not at all. Call me if you need anything.'] },
            { zh: '还没修好吗？', en: 'It is not fixed yet?' },
            { zh: '我要一份账单。', en: "I'd like the bill." },
          ],
          learn: '别客气', gain: { mood: 5, rest: 4 } },
      ],
    },

    // ---- 罗小燕 on five. 客房服务 by telephone (H172).
    //
    // Her 喂 is the tell that this is a phone call and not somebody at the door, and her first ask
    // is the bark she already had — the one she says while standing in the corridor with an
    // armful of linen. Turn 2 is where comprehension costs money: a service charge is named out
    // loud, and both answers to it are right answers with different bills behind them.
    '罗小燕': {
      huh: ['喂？您说什么？', 'Hello? What was that, sorry?'],
      turns: [
        { ask: ['您好，请问房间需要打扫吗？', 'Hello. Would you like the room serviced?'],
          opts: [
            { zh: '现在不用，下午再来吧。', en: 'Not now — come back this afternoon.', ok: true,
              then: ['好的，下午我再上来。', 'Very well. I will come up this afternoon.'] },
            { zh: '好的，麻烦您打扫一下。', en: 'Yes please — do go ahead.', ok: true,
              then: ['我这就进去，十分钟就好。', "I'll start now — ten minutes."],
              does: { housekeep: true } },
            { zh: '我要退房。', en: "I'd like to check out." },
          ],
          learn: '打扫', gain: { mood: 2 } },
        { ask: ['客房服务，您需要什么？', 'Room service — what can I get you?'],
          opts: [
            { zh: '麻烦您送一份牛肉面到房间。', en: 'A bowl of beef noodles to the room, please.',
              ok: true, then: ['好的，二十分钟送到。', 'Certainly. Twenty minutes.'],
              does: { order: '牛肉面', orderEn: 'beef noodles to the room', amt: 48 } },
            { zh: '我要一个叫醒服务，明天七点。', en: 'A wake-up call, please — seven tomorrow.',
              ok: true, then: ['记下了，明天七点叫醒您。',
                               'Noted — we will wake you at seven.'],
              does: { wake: 7 } },
            { zh: '我的房卡在哪儿？', en: 'Where is my key card?' },
          ],
          learn: '叫醒服务', gain: { mood: 3 } },
        { ask: ['送餐要二十分钟，加十五块服务费，可以吗？',
                'Delivery takes twenty minutes and there is a fifteen-yuan service charge — is that all right?'],
          opts: [
            { zh: '可以，麻烦您了。', en: 'That is fine — thank you.', ok: true,
              then: ['好的，马上给您做。', 'Right away.'] },
            { zh: '那不用了，我下楼吃。', en: 'Never mind, then — I will eat downstairs.', ok: true,
              then: ['二楼餐厅到十点。', 'The second-floor restaurant is open until ten.'] },
            { zh: '房间里有热水吗？', en: 'Is there hot water in the room?' },
          ],
          learn: '服务费', gain: { mood: 3 } },
      ],
    },

    // ---- 周礼宾 at the concierge desk. Directions, a recommendation, and the manners (H173, H181).
    //
    // 客气 is the word this tree exists to teach. 别客气 turns up in two people's mouths as a reply,
    // which is where a learner meets it, but only a word inside an *ask* is graded — so his last
    // turn is built around 您太客气了 and the sentence a Chinese speaker answers it with.
    '周礼宾': {
      huh: ['不好意思，我没听清。', 'Sorry — I did not catch that.'],
      turns: [
        { ask: ['需要我帮您拿行李吗？', 'May I help you with your luggage?'],
          opts: [
            { zh: '不用了，谢谢您。', en: 'No need, thank you.', ok: true,
              then: ['好的。客梯在大堂东侧。',
                     'Very good. The passenger lifts are on the east side of the lobby.'] },
            { zh: '麻烦您了，我住八楼。', en: 'Yes please — I am on the eighth floor.', ok: true,
              then: ['我帮您送到房间。', 'I will bring it up to your room.'] },
            { zh: '我要买票。', en: 'I want to buy a ticket.' },
          ],
          learn: '麻烦', gain: { mood: 3 } },
        { ask: ['客梯在大堂东侧。',
                'The passenger lifts are on the east side of the lobby.'],
          opts: [
            { zh: '好，我知道了，谢谢您。', en: 'Right — got it, thank you.', ok: true,
              then: ['往前走就是。', 'Straight ahead and you are there.'] },
            { zh: '电梯在楼上吗？', en: 'Are the lifts upstairs?' },
            { zh: '一共多少钱？', en: 'How much altogether?' },
          ],
          learn: '客梯', gain: { mood: 2 } },
        { ask: ['您想去哪儿？我可以给您叫车。',
                'Where would you like to go? I can call you a car.'],
          opts: [
            { zh: '麻烦您，我想去地铁站。', en: 'The metro station, please.', ok: true,
              then: ['出门往北走两百米就是。',
                     'Out of the door, two hundred metres north.'] },
            { zh: '这附近有好吃的餐馆吗？', en: 'Is there somewhere good to eat near here?',
              ok: true, then: ['二楼有中餐厅，出门还有一家面馆。',
                               'There is a Chinese restaurant on the second floor, and a noodle shop outside.'] },
            { zh: '我没有身份证。', en: "I don't have my ID card." },
          ],
          gain: { mood: 4 } },
        { ask: ['您太客气了，这是我们的工作。',
                'You are too kind — this is simply our job.'],
          opts: [
            { zh: '那我不客气了，谢谢您。', en: 'I will stop standing on ceremony, then — thank you.',
              ok: true, then: ['有事叫我。', 'Call me whenever you need to.'] },
            { zh: '我要换房间。', en: "I'd like to change rooms." },
            { zh: '这个多少钱？', en: 'How much is this one?' },
          ],
          learn: '客气', gain: { mood: 3 } },
      ],
    },

    // ---- 沈经理 at the desk that settles things. 退房, the bill and the argument (H174, H175).
    //
    // A bill is the most honest reading exercise the game has, so turn 1 is three numbers said out
    // loud and one of them is wrong. Querying it is a *right* answer, not a rude one — that is the
    // point of putting it here — and it lands as a negative row on the real bill.
    '沈经理': {
      huh: ['不好意思，您再说一遍好吗？', 'Sorry — could you say that again?'],
      turns: [
        { ask: ['您要退房吗？我给您结账。',
                'Are you checking out? I will settle the account for you.'],
          opts: [
            { zh: '对，我要退房。', en: 'Yes, I am checking out.', ok: true,
              then: ['好的，我看一下账单。', 'Very good. Let me look at the bill.'] },
            { zh: '还不退，我想延迟到下午。', en: 'Not yet — I would like to stay until the afternoon.',
              ok: true, then: ['延迟到下午两点不加钱。',
                               'Until two in the afternoon there is no charge.'] },
            { zh: '我要办入住。', en: "I'd like to check in." },
          ],
          learn: '退房', gain: { mood: 2 } },
        { ask: ['房费两晚九百二，迷你吧四十五，一共九百六十五。',
                'Two nights at nine hundred and twenty, minibar forty-five — nine hundred and sixty-five in all.'],
          opts: [
            { zh: '迷你吧四十五？我没喝东西。', en: 'Forty-five for the minibar? I drank nothing.',
              ok: true, then: ['对不起，我给您去掉。', 'My apologies — I will take it off.'],
              does: { waive: '迷你吧', amt: 45 }, gain: { mood: 5 } },
            { zh: '好的，一共九百六十五。', en: 'Fine — nine hundred and sixty-five altogether.',
              ok: true, then: ['好的，押金退给您。', 'Very good. Your deposit comes back to you.'] },
            { zh: '我要一个叫醒服务。', en: "I'd like a wake-up call." },
          ],
          learn: '迷你吧', gain: { mood: 2 } },
        { ask: ['这是您的账单。您要发票还是收据？',
                'Here is your bill. Would you like a tax invoice or a receipt?'],
          opts: [
            { zh: '要发票，谢谢您。', en: 'The invoice, please.', ok: true,
              then: ['好的，发票给您。', 'Certainly — here is your invoice.'] },
            { zh: '收据就行。', en: 'A receipt is fine.', ok: true,
              then: ['这是收据，请收好。', 'Here is the receipt — do keep it safe.'] },
            { zh: '我要换房间。', en: "I'd like to change rooms." },
          ],
          learn: '发票', gain: { mood: 2 } },
        { ask: ['中午十二点退房。延迟到下午六点加一半房费，您要吗？',
                'Check-out is midday. Until six in the evening is half a night extra — would you like that?'],
          opts: [
            { zh: '要，我加一半房费。', en: 'Yes — I will pay the half night.', ok: true,
              then: ['好的，六点以前退房就行。', 'Very good. Any time before six.'],
              does: { late: 18 } },
            { zh: '不用，我十二点走。', en: 'No need — I will leave at twelve.', ok: true,
              then: ['好的，十二点在大堂见。', 'Very good. We will see you in the lobby at twelve.'],
              does: { late: 0 } },
            { zh: '我要叫醒服务。', en: "I'd like a wake-up call." },
          ],
          learn: '房费', gain: { mood: 3 } },
      ],
    },

    // ---- 叶青 at the door of the restaurant on two. 几位, and the card you pay with (H176).
    '叶青': {
      huh: ['不好意思，您说几位？', 'Sorry — how many was that?'],
      turns: [
        { ask: ['两位吗？中餐厅这边请。', 'A table for two? The Chinese restaurant is this way.'],
          opts: [
            { zh: '一位，谢谢。', en: 'Just one, thanks.', ok: true,
              then: ['一位，这边靠窗有位子。', 'One — there is a window seat over here.'] },
            { zh: '两位，麻烦您。', en: 'Two, please.', ok: true,
              then: ['好的，这边请。', 'Very good — this way.'] },
            { zh: '我要退房。', en: "I'd like to check out." },
          ],
          gain: { mood: 2 } },
        { ask: ['您住在酒店吗？含早餐的可以刷房卡。',
                'Are you staying with us? If breakfast is included you can use your key card.'],
          opts: [
            { zh: '是，我住八零六。', en: 'Yes — room eight oh six.', ok: true,
              then: ['好的，我记一下房号。', 'Very good. Let me note the room number.'] },
            { zh: '不是，我用现金。', en: 'No — I will pay cash.', ok: true,
              then: ['好的，一位一百二。', 'Very good. One hundred and twenty per person.'] },
            { zh: '我要叫车。', en: 'I want to call a taxi.' },
          ],
          learn: '含早餐', gain: { mood: 3 } },
        { ask: ['包间已经准备好了。', 'Your private room is ready.'],
          opts: [
            { zh: '好的，我们现在过去。', en: 'Good — we will go through now.', ok: true,
              then: ['这边请，在里面。', 'This way — it is inside.'] },
            { zh: '包间在几楼？', en: 'Which floor is the private room on?', ok: true,
              then: ['就在这层，走廊左边。', 'On this floor, left down the corridor.'] },
            { zh: '我的行李在哪儿？', en: 'Where is my luggage?' },
          ],
          gain: { mood: 2 } },
      ],
    },

    // ---- 吴晴 in the all-day restaurant. Ordering, and the breakfast window (H176).
    '吴晴': {
      huh: ['不好意思，您要什么？', 'Sorry — what would you like?'],
      turns: [
        { ask: ['这边有空桌，我来为您摆餐具。',
                'There is a free table here — let me set it for you.'],
          opts: [
            { zh: '谢谢您，我一个人。', en: 'Thank you — just me.', ok: true,
              then: ['好的，您先坐。', 'Very good — do sit down.'] },
            { zh: '麻烦您，靠窗的位子。', en: 'A window table, if you would.', ok: true,
              then: ['靠窗有一张，这边请。', 'There is one by the window — this way.'] },
            { zh: '我要办入住。', en: "I'd like to check in." },
          ],
          gain: { mood: 2 } },
        { ask: ['早餐台会一直补到十点半。',
                'The breakfast buffet is replenished until half past ten.'],
          opts: [
            { zh: '好的，我十点以前来。', en: 'Right — I will come before ten.', ok: true,
              then: ['好的，早餐在这层。', 'Very good. Breakfast is on this floor.'] },
            { zh: '早餐要加钱吗？', en: 'Is breakfast extra?', ok: true,
              then: ['含早餐的房间不加钱，刷房卡就行。',
                     'Not if your room includes it — just tap your card.'] },
            { zh: '我要寄存行李。', en: "I'd like to leave my luggage." },
          ],
          learn: '早餐', gain: { mood: 3 } },
        { ask: ['您喝咖啡还是茶？', 'Coffee or tea?'],
          opts: [
            { zh: '喝茶，谢谢您。', en: 'Tea, thank you.', ok: true,
              then: ['好的，给您泡一壶。', 'Very good — I will make you a pot.'] },
            { zh: '要咖啡，不加糖。', en: 'Coffee, no sugar.', ok: true,
              then: ['好的，不加糖。', 'Coffee, no sugar.'] },
            { zh: '我的房卡坏了。', en: 'My key card is not working.' },
          ],
          gain: { mood: 3 } },
      ],
    },

    // ---- 高迎 at the door. The one exchange in the hotel that knows whether it has met you (H177).
    //
    // His greeting has a second version, and the `when` that chooses it is not about the building
    // at all — it is `Story.knows`, the count of his own questions you have followed. Two is the
    // threshold because two is what 面熟, a familiar face, is worth in story.js, so the moment he
    // starts recognising you is the same moment the notebook says he does.
    //
    // The alt keeps three replies with the right one in the same place, which is the rule every
    // variant in this file lives under — the panel has already drawn the buttons by then.
    '高迎': {
      huh: ['啊？您说什么？', 'Sorry? What was that?'],
      turns: [
        { ask: ['欢迎光临，前台在右手边。', 'Welcome. Reception is on your right.'],
          opts: [
            { zh: '谢谢您，我去办入住。', en: 'Thank you — I am checking in.', ok: true,
              then: ['好的，请这边走。', 'Very good — this way.'] },
            { zh: '我找礼宾部，要寄存行李。', en: 'I want the concierge — to leave my luggage.',
              ok: true, then: ['礼宾部在左手边。', 'The concierge desk is on your left.'] },
            { zh: '我要一杯咖啡。', en: "I'd like a coffee." },
          ],
          gain: { mood: 3 },
          alts: [
            // Been through two of his questions: he has your face now.
            { when: s => s.knows >= 2,
              ask: ['您回来了。今天外面挺冷的。', 'You are back. It is rather cold out today.'],
              opts: [
                { zh: '是啊，我又来了。今天真冷。', en: 'It is — here I am again. Really cold today.',
                  ok: true, then: ['里面暖和，您快进来。', 'It is warm inside — do come in.'] },
                { zh: '对，我还是住八楼。', en: 'Yes — the eighth floor again for me.',
                  ok: true, then: ['欢迎回来，我帮您拿行李。',
                                   'Welcome back. Let me take your luggage.'] },
                { zh: '我要一杯咖啡。', en: "I'd like a coffee." },
              ] },
          ] },
        { ask: ['外面有车，我来为您开门。', 'Your car is outside — let me get the door.'],
          opts: [
            { zh: '麻烦您了，谢谢。', en: 'Thank you, that is kind.', ok: true,
              then: ['您慢走。', 'Do take care.'] },
            { zh: '不用车，我走路去地铁站。', en: 'No car — I am walking to the metro.', ok: true,
              then: ['地铁站往北两百米。', 'The station is two hundred metres north.'] },
            { zh: '我住八零六。', en: 'I am in room eight oh six.' },
          ],
          gain: { mood: 3 } },
        { ask: ['您是第一次来北京吗？', 'Is this your first time in Beijing?'],
          opts: [
            { zh: '是第一次，我刚来。', en: 'It is — I have only just arrived.', ok: true,
              then: ['那您要去看看故宫。', 'Then you must go and see the Forbidden City.'] },
            { zh: '不是，我住在这儿。', en: 'No — I live here.', ok: true,
              then: ['那您已经是北京人了。', 'Then you are a Beijinger already.'] },
            { zh: '我要退房。', en: "I'd like to check out." },
          ],
          gain: { mood: 4 } },
      ],
    },

    // ---- 李阿姨 on 三楼, the other half of 老李's household (js/home-f3.js names them both).
    //
    // She was written into SOON because at the time there was no NPC row for her. There is one
    // now — js/data.js:180, `hz: '邻居'`, `livesOn: 3` — so `table()` adopts her on the first
    // lookup and she is walked, dumped, baked and reachable. Leave the tree here: the adoption
    // is the mechanism working, and moving it by hand only removes the proof that it does.
    // Keyed on the NAME and not on `hz`, deliberately: four residents share `hz: '邻居'`
    // (老李, 李阿姨, 小王, 小穆), so a '邻居' key would put her words in three other mouths.
    //
    // Why she exists rather than a second doorman: register. 刘师傅 is staff at a door and the
    // player says 您 and 师傅 to him. 李阿姨 is a peer on the stairs, so both sides say 你, and the
    // player addresses her as 阿姨 — a term, not a noun. That contrast is the whole of
    // APARTMENT-TODO.md:301, and it needs two people to exist at all.
    '李阿姨': {
      huh: ['啊？你说什么？我耳朵不好。', 'Eh? What was that? My hearing is not what it was.'],
      turns: [
        { ask: ['回来啦？楼道里那个箱子是你的吗？',
                'Back, are you? Is that box in the corridor yours?'],
          opts: [
            { zh: '李阿姨，是我的，我这就搬进去。',
              en: 'It is mine, Auntie Li — I will move it in now.', ok: true,
              then: ['快搬吧，别挡着道儿。', 'Go on then. It is blocking the way.'] },
            { zh: '不是我的，我帮你问问。', en: 'Not mine — I will ask around for you.', ok: true,
              then: ['谢谢你啊，好孩子。', 'Thank you, dear.'] },
            { zh: '我要买一张床。', en: 'I want to buy a bed.' },
          ],
          learn: '邻居', gain: { mood: 3 } },
        { ask: ['你一个人住吗？自己做饭吗？',
                'Do you live on your own? Do you cook for yourself?'],
          opts: [
            { zh: '我一个人住，晚上自己做饭。',
              en: 'I live alone — I cook in the evenings.', ok: true,
              then: ['自己做好，外卖不干净。',
                     'Better to cook. That delivery food is not clean.'] },
            { zh: '我常常点外卖。', en: 'I order in a lot.', ok: true,
              then: ['年轻人都这样，少吃点儿。',
                     'You young people are all the same. Do not eat too much of it.'] },
            { zh: '我住在酒店。', en: 'I am staying at a hotel.' },
          ],
          learn: '做饭', gain: { mood: 3 },
          alts: [
            // Two of her questions followed: you are the young one from 二零二 now, not a stranger.
            { when: s => s.knows >= 2,
              ask: ['小马，我包了饺子，给你留了一盘。',
                    'Xiao Ma — I made dumplings. I put a plate aside for you.'],
              opts: [
                { zh: '太谢谢您了，阿姨，我拿个碗。',
                  en: 'That is so kind, Auntie. Let me fetch a bowl.', ok: true,
                  then: ['碗不用拿，盘子你留着。',
                         'No need — keep the plate.'] },
                { zh: '不用了阿姨，我刚吃过。', en: 'No need, Auntie — I have just eaten.',
                  ok: true,
                  then: ['那放你门口，凉了再热热。',
                         'I will leave it at your door then. Warm it up if it goes cold.'] },
                { zh: '我住在酒店。', en: 'I am staying at a hotel.' },
              ],
              gain: { mood: 5 } },
          ] },
      ],
    },
  };

  // ---- the second source of asks, and why it is shaped the way it is.
  //
  // Everything above is written by hand, retired for good on a right answer, and finite: ninety-one
  // turns across twenty-five people. That is a fortnight. After it the whole cast goes back to
  // barking and the listening surface — the one place in this game where a sentence arrives as
  // sound and has to be understood rather than read off a card — is closed for the rest of the run.
  //
  // So there is a generator, and its slots come off the review queue: `Vocab.dueByTopic` and
  // `Vocab.dueByBand` decide which word gets put in front of you, which makes what a person asks
  // you the same thing as what you owe. It never displaces an authored turn — `next` reaches it
  // only when `openTurn` has run out — and a generated turn is never retired, it is regenerated
  // with a different slot.
  //
  // **The hard constraint is the bake.** `js/speech.js` has no synthesiser fallback on purpose: a
  // line with no clip in `audio/voice/manifest.json` is silent, and lands in `missed` where
  // `.speechcheck.js` fails on it. A generator that invents sentences invents silence. So a
  // template carries two word lists and only one of them is live:
  //
  //   `words` — slots whose rendered sentence is already baked in this person's voice. These ship.
  //   `bake`  — slots waiting on a bake run. They are never offered, they never reach `next`, and
  //             `.talkcheck.js` prints them as the bake list. When a clip lands, the word moves
  //             from `bake` to `words` and the ask goes live with no other change.
  //
  // Every `bake` list is empty now: the run happened, and all 26 slots below are live. The split
  // stays because it is the mechanism, not a migration step — the next template to be written
  // starts in `bake` and moves across when its clips exist.
  //
  // A slot word must be in the dictionary or it is dead weight. `slotTurn` picks from
  // `Vocab.dueByTopic` / `dueByBand` / the due list, and all three read `know[]`, which only ever
  // holds words the dictionary has a row for — so a word `js/vocab.js` has never heard of can be
  // baked, will pass every check, and can never be chosen. Six were dropped on exactly that
  // ground before the bake: 零钱, 后天, 今天下午, 合同, 菜市场, 学校. They are ordinary words and
  // their absence is a `js/vocab.js` gap, not a decision here; add the rows and they can come back.
  //
  // `.talkcheck.js` fails if anything in `words` has no clip, which is the check that stops a
  // template being added ahead of its bake. It is the same split `SCRIPTS`/`SOON` already make
  // between what is live and what is written and waiting.
  //
  // `say` is the reply, and it is deliberately one of that person's *existing* baked lines rather
  // than a new sentence: a generated turn that needed two bakes instead of one would be twice as
  // far from shipping, and every one of these people already owns a line that closes an exchange.
  // The player's own replies need no clip at all — only the NPC speaks — so `opts` is free text
  // and can be built out of the slot word.
  //
  // The wrong option is never nonsense. It is a sensible answer to a *different* question, which
  // is the thing being tested: hearing 多少 and not 几点 is what tells the two apart.
  const TEMPLATES = [
    // ---- the vendor, who asks quantity and price.
    { id: 'qty', who: ['超市老板'], topic: 'food', band: 3,
      say: ['给你。', 'Here you are.'],
      zh: (w) => `${w}要多少？`,
      en: (w, g) => `How much ${g} do you want?`,
      opts: (w) => [
        { zh: '要两个，谢谢。', en: 'Two, thank you.', ok: true },
        { zh: `不用了，我不买${w}。`, en: `No thanks — I am not buying ${w}.`, ok: true },
        { zh: '我住二零二。', en: 'I live at 202.' },
      ],
      words: ['白菜', '鸡蛋', '苹果', '面条', '西红柿', '土豆', '牛肉', '米饭'], bake: [] },

    { id: 'price', who: ['超市老板'], topic: 'money', band: 2,
      say: ['给你。', 'Here you are.'],
      zh: (w) => `${w}还要吗？`,
      en: (w, g) => `Do you still want the ${g}?`,
      opts: (w) => [
        { zh: '要，一共多少钱？', en: 'Yes — how much altogether?', ok: true },
        { zh: '太贵了，不要了。', en: 'Too dear. I will leave it.', ok: true },
        { zh: '我七点到。', en: 'I get there at seven.' },
      ],
      words: ['发票', '袋子', '现金'], bake: [] },

    // ---- the colleague, who asks what day and what time.
    { id: 'when', who: ['同事'], topic: 'time', band: 2,
      say: ['好，那你做吧，我去打印。', 'Fine — you do that, I will go and print.'],
      zh: (w) => `${w}你有空吗？`,
      en: (w, g) => `Are you free ${g}?`,
      opts: (w) => [
        { zh: '有空，几点？', en: 'I am — what time?', ok: true },
        { zh: '没空，我要加班。', en: 'I am not — I am working late.', ok: true },
        { zh: '在三楼。', en: 'On the third floor.' },
      ],
      words: ['明天', '星期一', '星期五', '周末', '中午'], bake: [] },

    { id: 'work', who: ['同事'], topic: 'work', band: 3,
      say: ['那我自己去，你工作吧。', 'I will go on my own then — you get on.'],
      zh: (w) => `${w}你做完了吗？`,
      en: (w, g) => `Have you finished the ${g}?`,
      opts: (w) => [
        { zh: '做完了，我发给你。', en: 'I have — I will send it over.', ok: true },
        { zh: '还没有，下午做。', en: 'Not yet — this afternoon.', ok: true },
        { zh: '要两个，谢谢。', en: 'Two, thank you.' },
      ],
      words: ['报告', '表格', '会议'], bake: [] },

    // ---- the neighbour, who asks where you are going.
    { id: 'where', who: ['王阿姨'], topic: 'transport', band: 2,
      say: ['那就好。', 'Good, then.'],
      zh: (w) => `你去${w}吗？`,
      en: (w, g) => `Are you off to the ${g}?`,
      opts: (w) => [
        { zh: '去，我马上走。', en: 'I am — I am leaving now.', ok: true },
        { zh: '不去，我在家。', en: 'I am not — I am staying in.', ok: true },
        { zh: '一共十二块。', en: 'Twelve kuai altogether.' },
      ],
      words: ['医院', '地铁站', '公园', '银行'], bake: [] },

    // ---- the delivery rider, who asks whether you have a thing on you.
    { id: 'have', who: ['外卖员'], topic: 'home', band: 3,
      say: ['谢谢，给个好评！', 'Thanks — leave me a good review!'],
      zh: (w) => `您有${w}吗？`,
      en: (w, g) => `Have you got a ${g}?`,
      opts: (w) => [
        { zh: '有，我拿给您。', en: 'I have — I will fetch it.', ok: true },
        { zh: '没有，不好意思。', en: 'I have not, sorry.', ok: true },
        { zh: '明天见。', en: 'See you tomorrow.' },
      ],
      words: ['钥匙', '手机', '雨伞'], bake: [] },
  ];

  // Which turns have been got through. Kept out of the save the world uses, because this is
  // progress through a *conversation* rather than a state of the flat: coming back tomorrow should
  // not mean being asked your name again.
  const KEY = 'bjlife.talk.v1';
  let done = load();
  function cleanProgress(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const out = {};
    for (const [id, completed] of Object.entries(value)) {
      if (completed !== 1 && completed !== true) continue;
      const match = /^(.*)#(\d+)$/.exec(id);
      if (!match) continue;
      const script = SCRIPTS[match[1]] || SOON[match[1]];
      const turn = Number(match[2]);
      if (!script || !Number.isSafeInteger(turn) || turn < 0 || turn >= script.turns.length) continue;
      out[`${match[1]}#${turn}`] = 1;
    }
    return out;
  }
  function load() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY));
      return cleanProgress(v);
    } catch (_) { return {}; }
  }
  let saveT = 0, dirty = false;
  function flush() {
    if (!dirty) return;
    dirty = false;
    try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (_) {}
  }
  function save() {
    dirty = true;
    clearTimeout(saveT);
    saveT = setTimeout(flush, 150);
  }
  // A debounced write is fine for something you are going to do again. Getting through a question
  // is not that: closing the tab inside the debounce window meant being asked your name twice.
  addEventListener('pagehide', flush);
  addEventListener('visibilitychange', () => { if (document.hidden) flush(); });

  // ---- the table, and the one thing in it that has to let itself in.
  //
  // Folded in once, the first time anybody asks — not at load, because index.html loads talk.js
  // *before* data.js, so `NPCS` does not exist yet while this file is being evaluated, and not on
  // a frame, because `pending` comes through here sixty times a second. After the first call it
  // is a single boolean test.
  let adopted = false;
  function table() {
    if (!adopted && typeof NPCS !== 'undefined') {
      adopted = true;
      for (const k in SOON)
        if (NPCS.some(n => n.name === k || n.hz === k)) SCRIPTS[k] = SOON[k];
    }
    return SCRIPTS;
  }

  // A qualified key lets two people share an ordinary name or role without sharing a life. Keep
  // the established name-then-role fallback for every unqualified script; only rows that need the
  // extra identity pay for it. `scriptKey` is also accepted by the harness when it enumerates the
  // table without manufacturing a fake place/name pair.
  function scriptKeyFor(n) {
    if (!n) return '';
    const T = table();
    const keys = [n.scriptKey];
    if (n.place) {
      if (n.name) keys.push(`${n.place}:${n.name}`);
      if (n.hz) keys.push(`${n.place}:${n.hz}`);
    }
    keys.push(n.name, n.hz);
    return keys.find(k => k && T[k]) || '';
  }
  const scriptFor = n => {
    const k = scriptKeyFor(n);
    return k ? table()[k] : null;
  };

  // ---- which conversation this is, which is not always this person's name.
  //
  // `scriptFor` tries an explicit/place-qualified identity, then the name, then the role, and
  // progress has to be filed under whichever key actually matched. Filing it under the name looks identical until two
  // people share one — and two people in this game are called 小赵. The colleague at the desk next
  // to yours answers to SCRIPTS['同事'] and the agent at the airbridge to SCRIPTS['登机员'], and
  // both of them are `n.name === '小赵'`, so both were filing their finished turns under 小赵#0…3.
  // Getting three questions right in the office retired three of the gate agent's, and she came
  // out of it with one thing left to ask you at a boarding gate. Found by .talkcheck.js, which
  // plays every script out to the end and counts the questions.
  //
  // Harmless for everybody else: a person whose name is their script key gets the same string
  // they always got. The colleague is the one exception and loses her place once, which is a
  // cheaper trade than a gate agent with nothing to say.
  function keyFor(n) {
    if (!n) return '';
    return scriptKeyFor(n) || n.name || n.hz || '';
  }
  const idOf = (n, i) => keyFor(n) + '#' + i;

  // ---- what the people in the terminal can see, which is everything.
  //
  // Read on the way into a conversation and on the way out of a reply, and nowhere else. It is
  // deliberately kept off `pending`: game.js asks that every frame to decide whether the prompt
  // floating over somebody's head says 说话, and a schedule lookup on that path is a schedule
  // lookup sixty times a second for the sake of a word that has not changed.
  //
  // Everything comes out of the two places that already own it — the ticket in your pocket
  // (`__game.flight()`) and the schedule the hall is running (`Airport.statusOf`) — so a clerk
  // can never be told something the departure board and the loudspeaker disagree with. Outside
  // the airport, and before the game has finished loading, it is `NOWHERE`: no ticket, no flight,
  // nothing to have an opinion about, which is the right answer for the nine people above.
  // ---- and what the hotel staff can see, which is the booking and nothing about aeroplanes.
  //
  // Same discipline as the terminal: read off the module that already owns it (`Stay`) rather
  // than kept here, so a receptionist can never believe something the bill disagrees with. Every
  // field is false or null when `stay.js` has not loaded or nobody has checked in, which is the
  // empty-handed case every base turn below is written for.
  //
  // `knows` is the odd one out: it is about the *person being spoken to*, not about the world, so
  // it is only filled in when `situation` is handed one. That is what a doorman recognising you
  // is made of — `Story.knows` counts the conversations of theirs you have followed.
  const NOWHERE = { has:false, checked:false, bag:false, cleared:false, gateKnown:false,
                    late:false, cancelled:false, ckOpen:false, code:null, no:null, mins:0,
                    inn:false, room:null, grade:null, problem:null, told:false, fixed:false,
                    owing:0, stays:0, knows:0 };
  function hotel() {
    if (typeof Stay === 'undefined') return null;
    try {
      const b = Stay.booking();
      const p = Stay.problem();
      return { inn: !!b, room: b ? b.room : null, grade: b ? b.grade : null,
               problem: p ? p.key : null, told: !!(p && p.reported), fixed: !!(p && p.fixed),
               stays: Stay.stays() | 0 };
    } catch (_) { return null; }
  }
  function situation(n) {
    // Who they are talking to, when anybody asked on somebody's behalf. Cheap and independent of
    // everything else here, so it is answered even when there is no game to read.
    let who = 0;
    if (n && typeof Story !== 'undefined') { try { who = Story.knows(n) | 0; } catch (_) {} }
    const h = hotel();
    const base = h ? { ...NOWHERE, ...h, knows: who } : { ...NOWHERE, knows: who };
    const g = typeof window !== 'undefined' ? window.__game : null;
    if (!g || typeof g.flight !== 'function' || typeof Airport === 'undefined') return base;
    let t, mins;
    try { t = g.flight(); mins = g.state().minutes; } catch (_) { return base; }
    if (!t) return { ...base, mins: mins || 0 };
    const f = Airport.FLIGHTS.find(x => x.no === t.no) || null;
    const st = f ? Airport.statusOf(f, mins) : null;
    return {
      ...base,
      has: true, no: t.no, mins,
      checked: !!t.checked, bag: !!t.bag, cleared: !!t.cleared, gateKnown: !!t.gateKnown,
      late: !!t.late, cancelled: !!t.cancelled,
      // 'ok' · 'late' · 'board' · 'shut' · 'off' · 'gone' · 'cancel' — the same seven the board
      // paints and the loudspeaker reads, never a copy of them.
      code: st ? st.code : 'ok',
      ckOpen: !!(f && Airport.checkinOpen(f, mins)),
    };
  }

  // Which version of this turn the situation calls for. A turn with no `alts` is its own answer
  // and costs nothing — which is all nine of the people outside the airport, on every call.
  // ---- landing a `does` on the hotel.
  //
  // Six verbs, and every one of them is a call into `Stay` that already existed for the reception
  // picker — nothing here invents state. All of them are no-ops when `stay.js` has not loaded or
  // nobody has checked in, because `Stay` itself refuses without a booking, which is what makes
  // this safe to run from a harness that walks every branch of every script on a fresh save.
  //
  // `toldKey` is the one thing held between turns: the fault the player named to the butler, so
  // that showing you understood her answer a turn later reports *that* fault and not whichever one
  // the building happens to have seeded. It is a single string and it is allowed to be stale — a
  // second stay overwrites it, and Stay ignores a key that is not the live problem anyway.
  let toldKey = null;
  function land(does, ok) {
    if (typeof Stay === 'undefined') return null;
    const g = typeof window !== 'undefined' ? window.__game : null;
    let day = 0;
    try { day = (g && g.state) ? g.state().day | 0 : 0; } catch (_) {}
    try {
      if (does.doc) return Stay.showDoc(does.doc);
      if (does.report) { toldKey = does.report; return { told: toldKey }; }
      if ('heard' in does) {
        const p = Stay.problem();
        const key = toldKey || (p && p.key);
        return key ? Stay.report(key, !!does.heard && ok, day) : null;
      }
      if ('late' in does) return does.late > 12 ? Stay.lateCheckout(does.late, day) : null;
      if (does.order) return Stay.orderService(does.order, does.orderEn || does.order,
                                               does.amt | 0, gameClockNow(g), does.delay);
      if (does.housekeep) return Stay.housekeep() ? { cleaned: true } : null;
      // ---- a charge taken off after the player queried it out loud.
      //
      // This handed `Stay.waive` a flat 45 — the figure 沈经理 says in her bill turn — and
      // `Stay.waive` posts whatever it is given. `.hotelweek.js` found the hole and called it a
      // free-money path, correctly: a stay with no minibar charge on it still paid out 45 yuan for
      // saying "I did not drink anything", which on that stay is *true*. Once per stay, every
      // stay, for a sentence the player is right about.
      //
      // Fixed on this side rather than by capping `Stay.waive`, because the cap belongs where the
      // knowledge is: only the caller knows the queried charge is meant to be an incidental. Take
      // the largest real incidental on the bill and take off no more than that, and if the bill has
      // none, take off nothing — she checks and there is nothing to check. Money can never be
      // minted from here now regardless of what `Stay.waive` allows.
      if (does.waive) {
        const bill = Stay.bill(day, minutesNow(g));
        const rows = (bill && bill.rows || [])
          .filter(r => r.hz !== '房费' && !/^减免/.test(r.hz) && r.amt > 0);
        if (!rows.length) return null;
        const top = rows.reduce((a, r) => (r.amt > a.amt ? r : a));
        const amt = Math.min((does.amt | 0) || top.amt, top.amt);
        return amt > 0 ? Stay.waive(top.hz, 'charge removed after you queried it', amt, day) : null;
      }
    } catch (_) { return null; }
    return null;
  }
  function minutesNow(g) {
    try { return (g && g.state) ? g.state().minutes | 0 : 0; } catch (_) { return 0; }
  }
  function gameClockNow(g) {
    try { return (g && typeof g.clockNow === 'function') ? g.clockNow() : 0; }
    catch (_) { return 0; }
  }

  // `n` is passed through so a `when` can ask about the person doing the asking and not only about
  // the world — the doorman's second greeting is the only thing that needs it, and it needs it
  // because "have we met" is a fact about him, not about the hotel.
  function shape(turn, n) {
    if (!turn.alts) return turn;
    const s = situation(n);
    for (const a of turn.alts) if (a.when(s)) return { ...turn, ...a, alts: null };
    return turn;
  }

  // The panel opens with one version of a turn and answers it a few seconds later, and a boarding
  // call can land in between. One slot is enough — only one conversation is ever open — and it
  // keeps `answer` grading the sentence the player actually heard rather than the one the clock
  // would hand out now.
  let held = null;

  // Whether this person still has something to ask. Cheap on purpose: it counts turns, it does
  // not decide which one you would get. See `situation` above.
  function openTurn(n) {
    const s = scriptFor(n);
    if (!s) return -1;
    // The key once rather than once per turn: this runs on a frame.
    const k = keyFor(n) + '#';
    for (let i = 0; i < s.turns.length; i++) if (!done[k + i]) return i;
    return -1;
  }
  function pending(n) {
    if (openTurn(n) >= 0) return true;
    const s = scriptFor(n);
    return !!(s && s.turns.length && genReady(keyFor(n)));
  }

  // ---- the generator, which is what `TEMPLATES` above is for.

  // The due list, at most once every five seconds. `pending` is asked on a frame, and walking
  // every word the player has ever met sixty times a second to decide whether the prompt over
  // somebody's head says 说话 is exactly the per-frame work the frame budget forbids.
  let dueAt = 0, dueCache = [];
  function dueNow() {
    const t = Date.now();
    if (t - dueAt > 5000) {
      dueAt = t;
      try { dueCache = Vocab.dueList(); } catch (_) { dueCache = []; }
    }
    return dueCache;
  }

  // A generated ask is an event, not a state. Without the gap, the moment somebody's authored
  // turns ran out they would have a question over their head permanently and never bark again,
  // which trades one kind of silence for another. Stamped when the turn is *answered*, so opening
  // the panel and walking away does not burn it.
  const GEN_GAP = 150000;
  const genAt = {};
  const genReady = key => dueNow().length > 0 && Date.now() - (genAt[key] || 0) > GEN_GAP;

  // A slot template, filled from the queue. `words` only — `bake` is never read here, which is
  // what stops an unbaked sentence reaching somebody's mouth.
  function slotTurn(key) {
    const due = new Set(dueNow());
    for (const t of TEMPLATES) {
      if (!t.who.includes(key) || !t.words.length) continue;
      const live = w => t.words.indexOf(w) >= 0;
      const w = Vocab.dueByTopic(t.topic).find(live)
             || Vocab.dueByBand(t.band).find(live)
             || t.words.find(x => due.has(x));
      if (!w) continue;
      const e = Vocab.get(w);
      return { ask: [t.zh(w), t.en(w, (e && e.en) || w)], opts: t.opts(w),
               yes: t.say, learn: w, gain: { mood: 2 }, gen: t.id };
    }
    return null;
  }

  // And the fallback, which needs no bake at all: ask an authored question again. The one picked
  // is the one whose sentence carries the most words you owe, so a second hearing is aimed rather
  // than random, and never the one asked last so a person cannot get stuck on one question.
  const reAt = {};
  function reTurn(n, s, key) {
    const due = new Set(dueNow());
    let best = null, bestScore = -1;
    for (let i = 0; i < s.turns.length; i++) {
      if (s.turns.length > 1 && reAt[key] === i) continue;
      const turn = shape(s.turns[i], n);
      let sc = 0;
      for (const tk of Vocab.tokenize(turn.ask[0])) if (tk.e && due.has(tk.t)) sc++;
      if (sc > bestScore) { bestScore = sc; best = { ...turn, alts: null, gen: 're', from: i }; }
    }
    if (best) reAt[key] = best.from;
    return best;
  }

  function generate(n) {
    const s = scriptFor(n);
    if (!s || !s.turns.length) return null;
    const key = keyFor(n);
    if (!genReady(key)) return null;
    return slotTurn(key) || reTurn(n, s, key);
  }

  // The next thing this person still has to ask you, in the version today calls for. Authored
  // turns first and always — a generated one may only fill the space *after* the written ones have
  // been got through, never displace one that is still open.
  function next(n) {
    const s = scriptFor(n);
    if (!s) return null;
    const at = openTurn(n);
    if (at >= 0) {
      held = { key: idOf(n, at), turn: shape(s.turns[at], n) };
      return { script: s, turn: held.turn, at };
    }
    const g = generate(n);
    if (!g) return null;
    const gat = s.turns.length;
    held = { key: idOf(n, gat), turn: g, gen: true };
    // A one-off copy so the panel's 问题 counter reads 4/4 rather than 5/4. `answer` re-reads the
    // real script off `scriptFor`, so nothing downstream is handed the padded one.
    return { script: { ...s, turns: s.turns.concat([g]) }, turn: g, at: gat };
  }

  // ---- what a question tests, and how far one answer is allowed to move it.
  //
  // Understanding a spoken sentence is evidence about every word in it, but not evenly. Crediting
  // all six words of it would run somebody to mastery off one lucky guess; debiting all six would
  // wipe out an evening's work over one slip. So a right answer credits the three you know least
  // well — the ones that were actually load-bearing for you — and a wrong one debits the single
  // weakest, which is the likeliest reason you missed it. The rest of the sentence is brushed,
  // which is what reading it would have done anyway.
  function score(zh, ok) {
    const words = Vocab.tokenize(zh).filter(x => x.e).map(x => x.t);
    // Anything in there you had never met is in your ear now, so it goes in the notebook at the
    // bottom rung rather than being graded on a sentence you have only just heard.
    for (const w of words) if (Vocab.exposure(w) < 1) Vocab.introduce(w);
    const movable = words.filter(w => !Vocab.retired(w))
      .sort((a, b) => Vocab.exposure(a) - Vocab.exposure(b));
    const take = movable.slice(0, ok ? 3 : 1);
    const moved = take.map(w => ({ hz: w, ...Vocab.grade(w, ok) }));
    for (const w of movable.slice(take.length)) Vocab.brush(w);
    return moved;
  }

  return {
    // A getter, because the table is not final until the roster exists — see `table`.
    get SCRIPTS() { return table(); },
    // Written, idle, and waiting for its person to be given a row. Exposed so the Hub can see
    // what it is landing and so a harness can walk it before it is live.
    SOON,
    // What the four in the terminal are reading, for the console and for the harness: the proof
    // that a tree responds to the world is being able to see the world it is responding to.
    situation,
    // How a person resolves to a conversation, and where their progress is filed. Exported
    // because `.talkcheck.js` had reimplemented both as `[name, hz]` and the real order is
    // `[scriptKey, place:name, place:hz, name, hz]` — so a place-qualified script such as
    // `shop:收银员` looked orphaned to the harness while resolving perfectly well in the game.
    // A check that re-derives the logic it is testing drifts from it; this is the one copy.
    scriptKeyFor, keyFor,
    scriptFor, next, pending,

    // ---- the generator, opened up for the check and the bake and for nothing else.
    TEMPLATES,
    // Every sentence the slot templates can ever put in somebody's mouth. `templateAsks()` is the
    // live half — what `next` can reach today, every one of which must have a clip or somebody
    // opens their mouth and nothing comes out. `templateAsks(true)` adds the pending half, which
    // is the bake list. `.talkcheck.js` reads both and treats them differently on purpose.
    templateAsks(all) {
      const out = [];
      for (const t of TEMPLATES) {
        const push = (w, live) => out.push({ id: t.id, who: t.who, word: w, live,
                                             zh: t.zh(w), say: t.say[0] });
        for (const w of t.words) push(w, true);
        if (all) for (const w of t.bake) push(w, false);
      }
      return out;
    },
    // The turn this person would be generated right now with the every-two-and-a-half-minutes gap
    // ignored, so a check can see the generator without waiting on a clock.
    genFor(n) {
      const s = scriptFor(n);
      if (!s || !s.turns.length) return null;
      return slotTurn(keyFor(n)) || reTurn(n, s, keyFor(n));
    },

    // Answer the turn they are on. Returns what they say back, what it did to your vocabulary and
    // what it does to you — the caller owns the world, so effects are described rather than applied.
    answer(n, at, pick) {
      const s = scriptFor(n);
      if (!s) return null;
      // The version the panel opened with if this is the turn it opened with, and otherwise a
      // fresh read — which is the path a test that answers by index takes. A generated turn is not
      // in `s.turns` and has no fresh read: it exists only for as long as it is held, which is the
      // whole conversation, and answering one by index without opening it is not a thing to do.
      const key = idOf(n, at);
      const open = held && held.key === key;
      const gen = !!(open && held.gen);
      if (!gen && !s.turns[at]) return null;
      const turn = open ? held.turn : shape(s.turns[at], n);
      const opt = turn.opts[pick];
      if (!opt) return null;
      const ok = !!opt.ok;
      const moved = score(turn.ask[0], ok);
      // Authored turns retire on a right answer and generated ones never do — they are regenerated
      // with a different slot instead, which is the only reason there is anything left to say on
      // day forty. The gap is stamped either way: a question answered wrong has still been asked.
      if (gen) genAt[keyFor(n)] = Date.now();
      else if (ok) { done[idOf(n, at)] = 1; save(); }
      // ---- `does`, and the one thing in this file that is not purely descriptive.
      //
      // Mood is the only currency the nine street conversations ever needed, and mood is all
      // `gain` can move. The hotel needs more than that: understanding the floor butler decides
      // whether the air conditioning is fixed tonight or a fan turns up instead, and understanding
      // the manager decides whether a minibar charge stays on the bill. Neither of those is a
      // need, so neither can be expressed as a `gain`.
      //
      // `does` names the outcome, and — unlike `gain` — it is carried on the option rather than
      // the turn, because two right answers to the same question are allowed to mean two different
      // things ("send it up" and "no thanks" are both understanding). It is also read on a *wrong*
      // answer, which is the point: reporting a fault you have not understood is what makes the
      // wrong object arrive, and that is a recoverable evening rather than a failure screen. See
      // `Stay.report`, which was written to be told exactly this.
      //
      // land() applies it here rather than returning it for game.js to apply, which breaks this
      // file's own rule that the caller owns the world. The reason is ownership, not design:
      // game.js is a contended file and talk.js is not, so the alternative was a hotel that could
      // not land anything. `did` is what Stay gave back, and a caller that ever does want to apply
      // this itself should check `did` first so nothing is charged twice.
      const does = opt.does || (ok ? turn.does || null : null) || null;
      return {
        ok, opt,
        then: ok ? (opt.then || turn.yes) : s.huh,
        moved,
        gain: ok ? (opt.gain || turn.gain || null) : null,
        learn: ok ? (opt.learn || turn.learn || null) : null,
        does, did: does ? land(does, ok) : null,
        left: (() => { const nx = next(n); return nx ? s.turns.length - nx.at : 0; })(),
      };
    },

    // Every line these people speak in a conversation, for the two things that need the whole
    // list: the bake, which has to render them, and the prefetch, which has to have them in hand
    // before somebody opens their mouth. Deduplicated, because most asks are lines they already had.
    // Every variant counts. A line that only gets said to somebody holding a delayed ticket is
    // still a line somebody hears, and one that was left out of here would be left out of the
    // bake too and would play silent on the one day it came up.
    linesOf(n) {
      const s = scriptFor(n);
      if (!s) return [];
      const out = new Set([s.huh[0]]);
      const add = t => {
        out.add(t.ask[0]);
        if (t.yes) out.add(t.yes[0]);
        for (const o of t.opts) if (o.then) out.add(o.then[0]);
      };
      for (const t of s.turns) {
        add(t);
        if (t.alts) for (const a of t.alts) add({ ...t, ...a });
      }
      // And the live half of the generator. A slot template's rendered ask is a sentence this
      // person can be made to say, so it belongs here for both of this list's readers: the
      // prefetch, which should have it in hand, and `.talkcheck.js`, whose existing "every line
      // has a clip" claim is then the thing that fails when a template is moved to `words` ahead
      // of its bake. The `bake` half is deliberately absent — it is not a line anybody can say
      // yet, and listing it here would claim it was.
      const key = keyFor(n);
      for (const t of TEMPLATES) {
        if (!t.who.includes(key)) continue;
        out.add(t.say[0]);
        for (const w of t.words) out.add(t.zh(w));
      }
      return [...out];
    },

    // For the harness: everybody with a script, and how much of one.
    cast() {
      const T = table();
      return Object.keys(T).map(k => ({
        name: k, turns: T[k].turns.length,
        lines: this.linesOf({ scriptKey: k, name: k }).length,
        // How many of those turns have a second thing to say depending on what is going on.
        alts: T[k].turns.reduce((a, t) => a + (t.alts ? t.alts.length : 0), 0),
      }));
    },
    reset() {
      done = {}; held = null; dirty = false; clearTimeout(saveT);
      try { localStorage.removeItem(KEY); } catch (_) {}
    },
    progress() { return { ...done }; },
  };
})();
