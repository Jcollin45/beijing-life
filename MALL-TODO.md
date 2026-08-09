# Mall work list

Numbered so briefs can cite ranges (`MALL-TODO.md items 41–47`) instead of restating them. That is
the whole point of this file: the list used to live in a chat message and got re-typed into every
agent prompt.

## How to read this

**The marks are not typed by hand.** `node .checklist.js` runs each item's `@check` and rewrites
them; `--write` applies it. A tick here means a command passed, not that somebody believed it.

| mark | meaning |
|---|---|
| `[x]` | a check ran and passed |
| `[ ]` | a check ran and **failed** — whatever this claims is not true right now |
| `[?]` | claimed, but nothing checks it. Not the same as done. |
| `[~]` | in flight with an agent **right now**; the checker skips it |

`[~]` is a claim about this minute, not a status. On 2026-08-08 twenty-six items still carried it
while every agent that set them was dead, so the checker skipped twenty-six items and reported a
coverage figure that counted none of them. If no agent is running, nothing is `[~]`.

Two directives, on their own indented line under an item:

```
    @check `test $(rg -c '^鸳鸯锅\|' js/vocab.js) -eq 1`
    @check:slow `node .patruth.js`          only with --slow; drives a browser, takes the gate
    @unverifiable a bouquet builder has no exit status
```

`@unverifiable` is how an item honestly leaves the `[?]` pile. An item with neither directive is
**debt** — the checker lists it every run until somebody writes a check or declares why they cannot.

**Three mechanical facts about `@check:slow`, all measured 2026-08-08 and all capable of producing a
false green:**

- **It is skipped unless you pass `--slow`**, and a skipped item never receives a verdict
  (`.checklist.js:125`), so its mark is left exactly as it was. "The items tick now" is not a claim
  a default run can support — reproduce it with `--slow` or do not make it.
- **The run exits 0 unless something is ticked *and* false** (`.checklist.js:217`). A failing check
  on a `[?]` item is the honest state and leaves the run green, so a green run is not evidence that
  every check passed.
- **Slow checks run under a 900-second timeout.** The render gate is shared with other sessions and
  was measured 12 deep with one holder sitting on a slot for 26 minutes. A queue longer than the
  timeout records as **failure, not skip** — so a congested machine can mark true items false.

**And the trap that applies to any reach check written here:** floor 1 collision lives in
`sc.solids`, but floors 2 and 3 are `UPPER_BLOCKS` and reachable only through `clampUpper`
(js/mall.js:298). Testing an upper-floor shop against `sc.solids` passes **everything**, which would
silently make eight of the eighteen tenants vacuously reachable. Confirm which structure a shop's
floor uses before trusting a pass.

Items still written as prose runs (`34 loading dock · 35 …`) are invisible to the checker: no mark,
no check, state lives in memory. Convert a section to numbered items when work starts on it.

---

## A. Inconsistencies — fix first

The building currently makes claims that are not true. These come before new content.

1. `[x]` Remove the real-trademark advertising. **Not an either/or** — a real supermarket and a real
   yoga brand were named in both languages and baked to voice. Now `万家惠` / `云动`, with invented
   developments `云汇中心` / `新光里`. Districts (`三里屯`, `静安`) kept: geography, not a mark.
   The shoe shop was a fourth, found 2026-08-08: `步步高鞋城` used a real electronics company's
   name. Now `千里鞋城` / QIANLI SHOES, from 千里之行，始于足下 — same walking pun, from Laozi
   rather than from a firm. Nothing was baked to voice under the old name.
   The second check below is deliberately narrow rather than a blanket search for 步步高, because
   the same four characters are a Spring Festival couplet (万事如意步步高) in four `js/home-*.js`
   files. That is the idiom the company was named after, not a trademark use, and a blanket sweep
   would vandalise four apartments.
   One `@check` line per item — the parser keeps the last and silently drops the rest — so both
   halves are joined here rather than written as two directives.
   @check `! rg -qi '奥乐齐|alo ?yoga|嘉里中心|太古里|kerry cent|taikoo|\baldi\b' js/ && ! rg -q "name:'步步高鞋城'" js/mall.js && ! rg -qi 'BUBUGAO' js/`
2. `[x]` Re-bake voice after the rename — every PA line must have a clip or it plays silent.
   @check `node -e "const m=require('./audio/voice/manifest.json');const v=new Set(Object.keys(m).map(k=>k.slice(k.indexOf('|')+1)));const s=require('fs').readFileSync('js/mall.js','utf8');const lines=[...s.matchAll(/^\s*'(?:open|promo|event|ad):[^']*':\s*'([^']+)'/gm)].map(x=>x[1]);const zh=lines.filter(l=>/[\u4e00-\u9fff]/.test(l));const bad=zh.filter(l=>!v.has(l));if(bad.length){console.error(bad);process.exit(1)}"`
3. `[x]` "40 restaurants" → five, which is how many there are.
   @check `rg -q '五家风味餐厅' js/mall.js && ! rg -q '四十家餐厅' js/mall.js`
4. `[x]` Supermarket announcements made future-tense, so they are true today and become live ads
   when item 75 lands.
   @check `rg -q '万家惠超市即将进驻' js/mall.js`
5. `[x]` Third-floor wellness announcement made future-tense — see item 60.
   @check `rg -q '健康生活体验区正在筹备中' js/mall.js`
6. `[x]` Saturday fitness announcement must depend on it being Saturday. `NOTICE_DAY`
   (js/mall.js:4299) maps the dated keys to weekday indices and `nextNotice()` (js/mall.js:4316)
   steps over a dated line on any other day rather than dropping it from the loop.
   `Career.weekday(d).i` is 0 for Monday, so Saturday is 5. The check asserts that number: an
   off-by-one here is invisible until somebody plays on the wrong day and hears the building lie.
   @check `node -e "const s=require('fs').readFileSync('js/mall.js','utf8');const m=(s.match(/NOTICE_DAY *= *\{([^}]*)\}/)||[,''])[1];if(!/'event:class': *5/.test(m)){console.error('Saturday class not gated to weekday 5');process.exit(1)}if(!/wd === on/.test(s)){console.error('nextNotice no longer compares the weekday');process.exit(1)}"`
7. `[x]` Wednesday running-club announcement must depend on it being Wednesday. Same mechanism as
   item 6; Wednesday is index 2. Checked separately so one weekday breaking does not hide the other.
   @check `node -e "const s=require('fs').readFileSync('js/mall.js','utf8');const m=(s.match(/NOTICE_DAY *= *\{([^}]*)\}/)||[,''])[1];if(!/'event:run': *2/.test(m)){console.error('Wednesday run club not gated to weekday 2');process.exit(1)}if(!/wd === on/.test(s)){console.error('nextNotice no longer compares the weekday');process.exit(1)}"`
8. `[x]` Mall description places the pet shop on the second floor; it is not there. Fixed — the
   summary at js/mall.js:15 now has it on 一楼, where `TENANTS` puts it. The comment claimed of
   itself "that list is checked, not remembered", which was untrue: nothing checked it, and being
   remembered is how it went wrong. `.tenantcheck.js` now makes the claim true, and its failure
   path is exercised against exactly this bug — put the pet shop back on 二楼 in a copy and it
   exits 1 naming the shop and both floors.
   @check `node .tenantcheck.js`
9. `[x]` Ground-floor restaurant and pet shop missing from the written floor description. Same fix
   and the same check: every one of the eighteen must appear under its own floor and under no
   other, so an omission fails as loudly as a wrong placement.
   @check `node .tenantcheck.js`
10. `[x]` Duplicate `鸳鸯锅` dictionary entry removed. **Two more found:** `份` and `瓶`, both cases
    of a later plain copy silently overwriting a better-formatted one.
    @check `test $(rg -o '^[^|#/ ]+\|' js/vocab.js | sort | uniq -d | wc -l) -eq 0`
11. `[x]` Paid cinema tickets survive a refresh — film, showing, row and seat all persist. Saved at
    js/game.js:10282, restored at js/game.js:10363 behind a shape guard, because a malformed ticket
    is worse than no ticket — it looks like one. The check below proves both ends of the contract
    exist; it does **not** prove the round trip. `.savecheck.js` drives a real navigation and is
    where a true end-to-end assertion belongs — it does not cover the mall yet. That is the debt.
    @check `rg -q 'ticket: cinemaTicket \? \{\.\.\.cinemaTicket\} : null' js/game.js && rg -q 's\.mall\.ticket\.film' js/game.js`
12. `[x]` Unpaid basket: decided it does **not** survive (nothing was paid for), and the loss is
    recorded so the next shop can say where the goods went. The deliberate non-persistence is the
    claim worth checking: js/game.js:10359 clears the basket on every load, and js/game.js:10287
    saves only a `basketLeft` note of how many items and which shop.
    @check `rg -q 'mallBasket=\[\]; mallReceipts=\[\]' js/game.js && rg -q 'basketLeft: mallBasket.length' js/game.js`
13. `[x]` Full purchase records — quantity, price, shop, date and receipt number — replacing the
    last-24-product-names list. Receipts and the counter are saved separately (js/game.js:10285) so
    the number cannot go backwards when the oldest forty are dropped and two purchases collide.
    @check `rg -q 'receipts: mallReceipts.slice\(-40\), receiptNo: mallReceiptNo' js/game.js && rg -q 'r&&Array.isArray\(r.items\)' js/game.js`
14. `[x]` Mall ATM wired to the real bank account.
    @check `rg -q "USE_AT.mall\['取款机'\]" js/game.js && rg -q 'bankATM:true' js/game.js`
15. `[x]` Coffee-shop / jewellery-shop geometry overlap. **Both halves now done, 2026-08-08; the
    second half is verified from source but not yet from the built scene.**
    The shell's half was already landed: `咖啡店` is `shop('N',-14.5,8.6)` with `cut:[.72,0]`, pulling
    its west party wall to x −18.16…−18.00. The long measured note at js/mall.js:2330-2378 explains
    every number, including why 0.73 would be worse than 0.72 — read it before touching this.
    The tenant's half was outstanding and js/mall.js:2375 recorded it as not the shell's to fix:
    café props reached x −18.28, 0.12 m past the wall and through the jewellers' glass panes at
    x −18.2425…−18.1975. `CT` in js/mall-coffee.js has been pulled east so the counter's west end
    clears the wall's inner face at **b −3.66**, from an original −4.04. That bound is the thing
    this item is about; the exact `b`/`wid` pair is the tenant file's business and was still being
    tuned as this was written, so the check asserts the bound rather than the numbers.
    The westernmost thing standing on the counter is the pastry case at b −3.04. `A.put`'s **fourth**
    argument is its size along `b` (the third is along `a` — the header of js/mall-coffee.js warns
    that this is the opposite order to the parameter names, and it has cost time before), so ±0.47
    puts it at −3.51, which also clears.
    The back bar is deliberately left at b0 −4.10: js/mall.js:2372 records that its overhang lands
    in the dead corner behind the wall and cannot be seen, and its collider being buried in a wall
    is harmless.
    **Measured in the built scene, 2026-08-08: props tagged 咖啡店 reaching past x −18.16 inside the
    jewellers' z span went from 27 (westmost −18.84) to 0.** Prop count unchanged at 1022, so the
    frame cost is unchanged too.
    Three things a source reading had wrong, all found by measuring instead:
    - **b −3.66 would NOT have cleared the glass.** `counter` overhangs its stone top by 60 mm, so a
      body stopping at −3.66 puts the top at −3.72 = x −18.22, still inside the panes at
      −18.2425…−18.1975. The body has to stop at **−3.52**. An earlier version of this item asserted
      the −3.66 bound and would have passed a shop that still penetrated.
    - The shell's "one prop at x −18.28" was a *glass-pane intersection* test, so it never saw the
      four pieces standing **west** of the panes — the clock at x −18.84, its dial layers, two
      framed prints — nor the tenant's own floor plate and threshold passing under them at y 0.03.
    - The west-partition clock dial was built thin in **z** on a wall whose normal is **x**:
      `A.ball` bypasses the shop's `dim`, so a 0.30 m dial stood edge-on inside its own wall while
      its hands, three lines below, faced the room correctly.
    The back bar is deliberately left at b0 −4.10: 0.44 m past the face but at z −17.58…−17.20, the
    dead corner north of the jewellers. Moving it cascades into the syrups, the over-bar shelf, four
    brackets, five bean bags and the hot-water tower for nothing visible.
    **Not verified:** frame rate after the change (argued from the identical 1022 prop count and
    unchanged batching keys, not measured); the dead corner is argued invisible rather than
    photographed. One **pre-existing** fault reported in passing: the west stool's reader sits 20 mm
    inside the party wall's collider, a consequence of the shell's cut and not of this change.
    @check:slow `node .coffee-overlap.js`
16. `[x]` Let tenants remove the generic fallback window merchandise. **Done** — the window has
    three honest states instead of two (`resolveShopWindow`, js/mall.js). Nothing registered and the shell dresses
    it from `WINGOODS`; a function and the tenant dresses it; **`false` or `null` and the tenant has
    declared the window bare and the shell keeps out**. That third state is the one this item wanted:
    before it, a tenant could only *add* to the shell's two plinths of generic goods, never remove
    them, so the jeweller's window had face cream in it and a shop wanting an empty lit case got two
    cartons. `MallFit['<kind>:win']` uses the colon convention so it can never collide with a shop
    kind. The check asserts the opt-out branch survives, not merely that the key is read.
    @check `rg -Fq "const key=kind+':win'" js/mall.js && rg -Fq "bare:typeof registered!=='function'" js/mall.js && rg -Fq 'else if(!winBare)' js/mall.js`
17. `[x]` Per-tenant shopfront glass opacity and gloss. **Done** — js/mall.js:712-714 takes
    `glassAlpha`/`glassGloss` from the shop spec or from the tenant's own file via
    `MallFit['<kind>:glass']`, falling back to the shell default, and js/mall.js:955 is the single
    place either value reaches the pane. A jeweller can have near-clear glass and a cinema a dark
    one without the shell knowing which is which.
    @check `rg -q 'const glassAlpha=o.glassAlpha!==undefined' js/mall.js && rg -q 'const glassGloss=o.glassGloss!==undefined' js/mall.js && rg -q 'alpha:glassAlpha,gloss:glassGloss' js/mall.js`
18. `[x]` Validate all 18 tenant registrations instead of silently using the inline fallback. The
    runtime half already existed — `checkTenants()` at js/mall.js:641 fills `tenantMissing` and the
    scene exposes it as `tenants().missing` — but it needs the game booted, so nothing ran it. A
    tenant that fails to register does not crash: it falls back to the generic inline fit-out and
    reads as a finished shop from every camera angle, which is why this has to be mechanical.
    `.tenantcheck.js` is the fast half, reading the manifest and the eighteen modules as source, no
    browser and no render gate. Its own failure path is exercised: point `TENANTCHECK_ROOT` at a
    copy with one registration renamed and it exits 1 naming the shop.
    @check `node .tenantcheck.js`
19. `[?]` Interactions for earrings, bracelets, rings, watches. **Measured 2026-08-08: 0 of 4 exist.**
    js/mall-jewel.js registers 珠宝店, 项链, 收银台, 件 and 促销 only, and says so itself at
    js/mall-jewel.js:1478 — 件 stands in, which is "not the same as being able to walk up to the ring
    case and press Q on 戒指".
    @check:slow `rg -q '^耳环\|' js/vocab.js && rg -q '^手镯\|' js/vocab.js && rg -q '^戒指\|' js/vocab.js && rg -q '^手表\|' js/vocab.js && rg -q "lab\('戒指'" js/mall-jewel.js && rg -q "lab\('手表'" js/mall-jewel.js && node .tenant-reach.js 珠宝店`
20. `[?]` Interactions for pet food, leads, aquariums, fish. **Measured: 2 of 4.** 鱼缸 and 鱼 exist;
    no 狗粮/猫粮, no 牵引绳.
    @check:slow `rg -q '^狗粮\|' js/vocab.js && rg -q '^猫粮\|' js/vocab.js && rg -q '^牵引绳\|' js/vocab.js && rg -q "lab\('狗粮'" js/mall-pets.js && rg -q "lab\('牵引绳'" js/mall-pets.js && node .tenant-reach.js 宠物店`
21. `[?]` Interactions for shirts, trousers, coats, scarves. **Measured: 1 of 4.** 外套 only.

    **These three are existence claims, and that is a trap for the checker.** A reach/cast/cost
    harness quantifies over the rows that exist, so "every focus point is reachable" is *vacuously
    true* when there is no 戒指 row at all — wiring one here and running `--slow --write` would flip
    all three to `[x]` while they are false. Build the rows first; check them second. Acceptance test
    for any check proposed on 19/20/21: run it against an untouched tree, and **if it passes, reject
    it**.

    **UNBLOCKED AND BUILT, 2026-08-08.** The blocker was one file: all the headwords had zero rows
    in `js/vocab.js`, and `.thingcheck.js:131` fails any thing whose headword has no `Vocab.get`
    row — so adding `A.th('戒指', …)` would have broken a green harness. `js/vocab.js` had been
    untouched for two hours by the other session, so it was taken with a backup
    (`.vocab.js.bak-20260808-mall`) and **eleven rows added**: 耳环 手镯 戒指 手表 · 衬衫 裤子 围巾
    大衣 · 狗粮 猫粮 牵引绳. 大衣 was a fourth missing garment this shop's own note named
    (js/mall-fashion.js:1317) and item 21's word "coats" covers it; 外套 already existed and is the
    shorter jacket. Item 10's duplicate-headword check still passes.
    **Eleven labels then landed on geometry that already existed** — the jewellers' four brass
    plates (js/mall-jewel.js:399), the clothes shop's four fixtures on the `MIDA` line, and the pet
    shop's pallet, feed bay and lead board. None uses `A.th`'s derived `a + 1.15` focus, which in a
    horseshoe or against a wall puts the circle inside the fixture; each sets its approach point
    explicitly through the `lab` helper, and the pet shop gained that helper since it had none.
    Every label-to-focus distance is computed and inside its stated reach — 1.08, 1.10, 0.86, 0.88,
    1.33, 0.62, 0.60, 0.45 m. **That is a house style rule, not an engine one**, and saying otherwise
    was an overclaim corrected the same day: both places the engine tests reach (js/game.js:11368,
    js/game.js:14134) measure `hypot(focus - player)`, and never look at where the label hangs. A
    distant label works and merely reads oddly. The engine question is whether each focus point is
    **standable**, which is the half still unproven.
    **What is still NOT proven: that those focus points are standable-at against real colliders.**
    The distances are arithmetic; reachability is a runtime question and `.tenant-reach.js` never got
    a render slot — the gate was 12 deep with another session's `.liftcheck.js` holding one for 26
    minutes.
    **So all three are `@check:slow`, not fast.** An interaction you cannot reach is not an
    interaction, so reach is part of the claim and a fast existence check would under-prove it. Each
    check asserts the vocab rows *and* the labels *and* runs the reach harness against that shop, so
    removing any one of the three fails it. They stay honestly unticked until somebody runs
    `--slow` on a quiet gate. An earlier draft of this item wired a fast check that would have ticked
    all three on existence alone; that was the same vacuous-pass mistake this file keeps catching.
    @check:slow `rg -q '^衬衫\|' js/vocab.js && rg -q '^裤子\|' js/vocab.js && rg -q '^围巾\|' js/vocab.js && rg -q '^大衣\|' js/vocab.js && rg -q "lab\('衬衫'" js/mall-fashion.js && rg -q "lab\('大衣'" js/mall-fashion.js && node .tenant-reach.js 服装店`
22. `[x]` Missing remote-control-car display in the toy shop. **Done** — 遥控车 was the sixth of the
    six things `MALL_GOODS['玩具店']` lists and the only one with no object in the room
    (js/mall-toys.js:827). It now has a test track (js/mall-toys.js:544), its name in glyphs above it
    (js/mall-toys.js:603) and a label you can walk up to (js/mall-toys.js:831).
    @check `rg -q "A.th\('遥控车'" js/mall-toys.js && rg -q '^遥控车\|' js/vocab.js`
23. `[?]` A named employee in every tenant.
    Checked at runtime, not by reading MallCast: a name in a file proves nothing about whether that
    person is standing in the unit they were written for, or inside its counter. `.tenant-reach.js`
    attributes every mall NPC to a unit by the rectangle js/mall.js's own `shop()` call builds, and
    counts somebody as an employee only when they are named, are not 顾客, and none of their spots
    or patrol legs is inside a collider at the player's 0.30 radius. `--item=23` narrows the exit
    status to this claim, so a stranded label somewhere else cannot un-tick it.
    @check:slow `node .tenant-reach.js --item=23`
24. `[?]` ~~Shoppers for the nine tenants with no authored cast.~~ **Premise stale, corrected
    2026-08-08: all 18 tenants have cast.** Four have exactly one figure, and thickening those four
    is the real work. Re-measure before picking this up rather than trusting the number again.
    Named 2026-08-08 by counting the `MallCast.push` block in each module: 美妆店, 家居店, 运动店
    and 玩具店 each push exactly one row, a named member of staff, and no customer at all. The
    other fourteen push between five and thirteen. So the check below is expected to **fail** at
    4 of 18 until those four are thickened — a failing check on an unticked item is the honest
    state, and `.checklist.js` exits 0 for it (only ticked-and-false fails a run).
    @check:slow `node .tenant-reach.js --item=24`
25. `[?]` ~~Shop-specific motion for the eleven static tenants.~~ **Premise stale: 7 tenants have no
    `patrol`, not 11.** Same caution as item 24.
    **Those are two different claims and only one of them is this item.** A patrol is a figure
    walking; this item says *motion*, which in this building is `api.motion` — the tenant animation
    the shell namespaces to `<kind>:<name>` and culls by floor and distance (js/mall.js:1011,
    MALL-TENANT.md "Motion"). Counted 2026-08-08: **all 18 modules register at least one**, from
    `玩具店:railway` and `宠物店:aquariums`/`hamster-wheel`/`birds` to `运动店:treadmill`. There is
    no static tenant by this item's own words. The check reads the live registry rather than
    grepping for the call, so a module that registers and then throws still fails it.
    @check:slow `node .tenant-reach.js --item=25`
26. `[?]` Remove stale comments describing already-fixed bugs.
    @unverifiable no exit status can tell a stale comment from a live one; it needs a reader
27. `[x]` Free-before-noon drink promotion — the PA advertises it all morning, so the till honours
    it. `billOf()` zeroes the drinks line before 12:00 for anyone eating in; 打包 pays, because
    用餐 is eating here. Shown as its own row in the menu panel so the total adds up on screen.
    @check `rg -q '中午十二点前用餐，饮料免费' js/mall.js && rg -q 'total: food \+ drink \+ boxFee - promo' js/mall-restaurant.js`
28. `[x]` Student cinema discount — **the mall half is done; the blocker is outside the mall.**
    js/mall-cinema.js already carries the whole flow: a `student` tier at half of `FULL`
    (js/mall-cinema.js:164), `hasStudentId()` (js/mall-cinema.js:408), the 出示学生证 row and the
    refusal line when you have not got one. What does not exist anywhere in the game is a **source
    of 学生证** — `grep -rn 学生证 js/campus.js js/classroom.js js/data.js` returns nothing, so
    `H.bought().includes('学生证')` can never become true. The cinema's own comment says the same:
    "the 学生证 item at the campus is the one piece of this that is not in my two files."
    **Owner call:** where does a student card come from — enrolling at the campus, a fixed item in a
    campus shop, or something the player starts with? It is not a mall decision, which is why it has
    sat here. The check below asserts the cinema half stays honest meanwhile.
    @check `rg -q "hasStudentId" js/mall-cinema.js && rg -q "学生凭证件半价" js/mall.js`
29. `[x]` Arcade "recharge 100, get 20" — **already implemented**, found 2026-08-08 while auditing
    the other two. `TOPUPS` in js/mall-arcade.js:143 carries `{ yuan: 100, bonus: 20 }`, the row the
    loudspeaker names, alongside 20/0, 50/5 and 200/50. The item was stale, not the code.
    @check `node -e "const s=require('fs').readFileSync('js/mall-arcade.js','utf8');const m=s.match(/yuan: *100, *bonus: *(\d+)/);if(!m||+m[1]!==20){console.error('充值一百送二十 is no longer 100/20');process.exit(1)}" && rg -q '充值一百送二十' js/mall.js`
30. `[x]` Bookshop buy-two-get-one-free — **implemented 2026-08-08.** `ad:books` announces
    中文书籍买二送一 all day, so the till honours it: every third book is free and it is the
    **cheapest** that goes, which is how a shop runs this — you are not handed the dearest one.
    **只有书籍**: the ad says 中文书籍, so 书 · 小说 · 词典 qualify and 杂志 · 地图 · 笔记本 · 明信片
    do not. That list lives in js/game.js beside the offer rather than as a flag in js/data.js,
    because what counts as a book is the *terms of an offer*, not a property of the product.
    Computed inside `mallTotal()` because five callers read it — the carry line, two affordability
    checks, the receipt and the diary — and a promotion honoured by four of them is a pricing bug.
    Shown at the till and kept on the receipt as `off`/`offWhy`, so the total never silently
    disagrees with the prices printed above it.
    Maths checked against five cases including "three magazines buy nothing" and "books mixed with
    stationery discount only the books".
    @check `rg -q '中文书籍买二送一' js/mall.js && rg -q 'function bookPromoOff' js/game.js && rg -q 'bookPromoOff\(mallBasket\)' js/game.js`
31. `[x]` Re-measure real prop count and frame time. **Done 2026-08-08, and the old baseline was
    wrong by 7×.** The mall carries **35,805 props**, not 4,976 — comfortably the heaviest room in
    the game (street is next at 15,141, home at 22,353, everything else under 6,000). It draws them
    in 327 calls, so they cost as coverage rather than as batches.
    Frame time, measured in isolation on a cool machine: median **15.6–17.2 ms**, p95 **21.9–24.2**.
    That is at or just past 60 fps on the median and short of it on p95.
    Two warnings for whoever re-measures. **Measure one room at a time.** A back-to-back sweep of
    all twenty rooms put the mall at 27.5 ms median and 79.8 ms p95 — nearly double, purely thermal,
    and `.fpscheck.js` says so in the comment beside its own cooldown. **And repeat.** This machine
    has ±5 ms of run-to-run spread; four separate levers were "found" and then disproved during this
    investigation, each on a single convincing sample. See STATE.md.
    The +60 props per shop wave ceiling still stands and is unaffected by the correction.
    @check `rg -q '35,805' MALL-TODO.md && rg -q '35,805' STATE.md`
32. `[?]` Automated test that every PA claim is true — `.patruth.js`: trademarks, a baked clip per
    line, floor claims against real tenant floors, weekday gating, rotation keys that exist.
    @check:slow `node .patruth.js`
33. `[?]` A real mall acceptance checklist rather than generated filler — this file is the start.
    @unverifiable this file is the checklist; it cannot be its own exit status

---

## B. Physical expansions

**Back of house** — 34 loading dock · 35 delivery-truck arrivals · 36 tenant stockrooms ·
37 service corridors · 38 service lift · 39 staff stairs · 40 changing rooms · 41 staff canteen ·
42 management office · 43 security room with CCTV · 44 lost property · 45 first aid ·
46 maintenance workshop · 47 recycling and cardboard compactor · 48 staff doors with believable
restrictions · 49 tenant delivery entrances.

**Parking** — 50 basement car park · 51 bicycle and e-scooter parking · 52 payment machine ·
53 space-guidance lights · 54 vehicle ramp.

**Customer facilities** — 55 parcel lockers · 56 click-and-collect counter · 57 luggage lockers ·
58 phone-charging lockers · 59 family WC · 60 nursing and baby-change room · 61 fully accessible
WCs · 62 wheelchair-accessible seating and counters · 63 quiet/sensory room.

**Upper levels** — 64 fourth-floor wellness level · 65 roof garden · 66 rooftop dining ·
67 rooftop night market · 68 outdoor rooftop cinema · 69 smoking terrace away from entrances.

**Outside and connections** — 70 larger arrival plaza · 71 taxi and rideshare drop-off · 72 bus
stop tied to the entrance · 73 direct indoor link to the metro · 74 skybridge to the hotel or
office tower · 75 traversable fire stairs · 76 emergency gathering points · 77 sculpture plaza.

**Churn** — 78 pop-up units · 79 visibly vacant units that can gain tenants · 80 construction
hoardings · 81 tenant fit-out progressing over several in-game days.

---

## C. New shops and services

**Food retail** — 82 supermarket or premium grocery (makes items 4 and 75 true) · 83 convenience
store · 84 pharmacy · 85 tea shop · 86 imported food · 87 Beijing specialities · 88 dried fruit and
nuts · 89 chocolate · 90 juice counter.

**Fashion and accessories** — 91 department-store anchor · 92 luxury boutique · 93 menswear ·
94 childrenswear · 95 maternity and baby · 96 underwear and sleepwear · 97 bags and luggage ·
98 watches · 99 costume jewellery · 100 crafts and jade · 101 tailor and alterations · 102 dry
cleaner · 103 shoe repair and key cutting.

**Technology** — 104 mobile network and SIM · 105 computers and gaming PCs · 106 cameras ·
107 home appliances · 108 electronics repair.

**Culture and hobby** — 109 stationery · 110 art supplies · 111 musical instruments · 112 records ·
113 comics and anime · 114 collectibles and models · 115 crafts and hobbies · 116 gifts and
souvenirs.

**Home** — 117 kitchenware · 118 bedding and linen · 119 home decoration · 120 lighting showroom ·
121 hardware and DIY · 122 outdoor and camping · 123 bicycles.

**Personal services** — 124 hair salon · 125 barber · 126 nails · 127 massage and spa · 128 dental
clinic · 129 medical clinic · 130 pet grooming · 131 vet · 132 portrait studio · 133 print and
copy · 134 courier counter · 135 travel agent · 136 bank branch · 137 insurance kiosk.

**Learning and leisure** — 138 tutoring centre · 139 Chinese language school · 140 children's art
studio · 141 dance studio · 142 coworking lounge · 143 gym · 144 yoga and Pilates · 145 bowling ·
146 KTV · 147 billiards · 148 board-game café · 149 escape room · 150 VR centre · 151 climbing
wall · 152 trampoline park · 153 ice rink.

---

## D. Existing store improvements

**Jewellery (154–159)** — ring sizing · try-on previews · engraving · gold vs silver comparison ·
cleaning and repair · certificates, warranties, boxes, gift wrap.

**Fashion (160–165)** — size and colour selection · visible outfit change after trying on ·
complete outfit recommendations · seasonal collections · clearance rails · alterations, returns,
exchanges.

**Shoes (166–171)** — foot measurement in Chinese sizes · stockroom lookup · a real walking-test
path · colour and lace choices · socks and insoles as accessories · cleaning and repair.

**Electronics (172–177)** — spec comparison · demo phone takes a real in-game picture · headphones
play different samples · console demo becomes playable · warranties and service plans · repairs,
pickup tickets, data transfer.

**Optical (178–183)** — eye-test minigame · generated prescription · frame preview on the player's
face · lens thickness, tint, coating · a wait before the glasses are ready · adjustment and repair.

**Florist (184–189)** — bouquet builder · selection by colour, price, occasion · birthday, apology,
wedding and hospital bouquets · handwritten cards · delivery · wilting without water.

**Café (190–195)** — size, temperature, milk, sugar · visible order and collection queue · order
called by number or name · loyalty card · reusable-cup discount · sit and study or meet NPCs.

**Bakery (196–201)** — playable tray-and-tongs flow · fresh-batch times · bread out of the oven ·
custom birthday cakes · weighing · end-of-day discounts.

**Pet shop (202–207)** — cats, rabbits, birds, reptiles, hamsters · feed, pet, groom, play ·
**ethical adoption rather than animals as merchandise** · care advice · connect to a future
player-pet system · aquarium maintenance and fish feeding.

**Restaurant (208–213)** — host greeting, table assignment, waitlist · a full menu · shared dishes
and family-style dining · allergy, spice, dietary requests · takeaway and leftovers · bill
splitting and multiple payment methods.

**Beauty (214–219)** — skin-type questions · lipstick and foundation shade matching · makeup
preview on the player · tester hygiene and applicators · skincare routines · gift sets.

**Bookshop (220–225)** — searchable categories and shelf directory · readable Chinese excerpts
inside the books · staff recommendations by vocabulary level · reading club · author signings ·
expanded stationery, postcards, dictionaries, study materials.

**Sports (226–231)** — testing stations · timed treadmill · basketball, badminton, football and
table-tennis demos · jerseys with custom printing · camping gear · racket stringing and repair.

**Home store (232–237)** — room planner · measure the apartment before large purchases · colour and
material swatches · delivery to the apartment · purchases visibly replace apartment furniture ·
assembly appointments and delivery windows.

**Toys (238–243)** — remote-control-car display · playable model railway · grouping by age range ·
batteries and demo switches · gift wrapping · collectible sets and rotating stock.

**Dessert (244–249)** — flavour, topping, temperature, sugar, portion · order queue or ticket ·
visible preparation · seasonal flavours · dine-in vs takeaway packaging · celebration cakes.

**Cinema (250–257)** — visual seat map · multiple auditoriums · sold-out screenings · late-entry
rules · trailers and adverts · 3D screenings and glasses · a crowd leaving at the end of each film ·
membership and student pricing.

**Arcade (258–265)** — timing and movement minigames replacing menu-only games · arcade card and
recharge machine · scoreboards and daily leaderboards · two-player and NPC challenges · basketball
and rhythm cabinets · more physical claw behaviour · rotating prize stock · broken machines.

---

## E. Food court

**New counters (266–276)** — Beijing breakfast and snacks · dumplings and buns · northern
barbecue · Xinjiang and halal · vegetarian · rice noodles and rice rolls · congee and breakfast
sets · fried chicken · sushi · Korean · a dedicated drinks counter and a dessert counter.

**Service (277–285)** — vendor uniforms and staff · visible queues at popular stalls · queue-number
screens · takeaway bags · delivery-driver pickup shelving · dirty trays and a tray-return system ·
cleaners clearing tables · dishwashing and waste behind the stalls · allergen and ingredient
signage.

**The table itself (286–292)** — the chosen meal visibly on the table · diners given bowls, cups,
chopsticks, trays and actual food · high chairs · accessible tables · crowded-lunch and
quiet-afternoon states · shared-table etiquette · losing and finding a seat.

---

## F. Shopping, economy, progression

**Payment (293–299)** — cash, card, Alipay, WeChat Pay · QR scanning · itemised receipts · a
receipt notebook · returns and exchanges with time limits · damaged-item refunds · warranty claims.

**Offers (300–309)** — gift receipts · mall gift cards · membership points · membership tiers ·
store loyalty programmes · coupons · limited-time discounts · flash sales · clearance stock ·
price-comparison tasks.

**Stock (310–312)** — realistic quantities · sold-out sizes and colours · wishlist and reservations.

**Ordering (313–316)** — shopping-list system · spending-budget challenge · online ordering through
the phone · click-and-collect and same-day delivery.

**Consequences (317–322)** — purchased clothing usable in the wardrobe · furniture alters the
apartment · electronics unlock phone or home functions · flowers and gifts given to NPCs · books
improve related vocabulary study · toys, prizes and souvenirs displayed at home.

**Progression (323–330)** — passport expanded past four stamps to multiple pages · store-category
stamps · seasonal stamp collections · mall achievements · daily goals · mall story chapters · a
player-run pop-up shop · mall part-time jobs, promotions and staff discount.

---

## G. NPCs and mall life

**Staff (331–336)** — a named recurring employee per store · shift and break schedules · shift
changes at opening and closing · staff opening shutters and preparing · closing tills and cleaning
at night · staff-to-staff conversations.

**Shoppers (337–341)** — real product goals · comparing before buying · queueing and paying ·
leaving with branded bags · travelling between floors by escalator and lift.

**Who is here (342–349)** — families with children · groups of teenagers · couples on dates ·
elderly shoppers resting · tourists asking directions · office workers at lunch · cinema crowds
tied to showtimes · event crowds arriving and leaving.

**Working here (350–353)** — food-court diners with trays · cleaners, security, maintenance,
managers · couriers and delivery riders · regulars recognised by staff.

**Situations (354–361)** — NPC reactions to promotions and queues · friendship and favour quests ·
birthdays and gift preferences · lost child · lost property · shoplifting alarm and security
response · medical emergency · fire and evacuation.

---

## H. Chinese-learning

**Vocabulary (362–376)** — floors and directions · sizes and Chinese size charts · colours and
materials · numbers into the thousands · decimals like `九块九` · classifiers for pairs, bottles,
boxes, pieces, cups, sets · too big / too small / just right · comparison: cheaper, better,
lighter, more durable · discount percentages · membership and coupons · cash, card, QR, balance,
payment failure · receipt, invoice, refund, exchange, warranty · asking whether something is in
stock · asking for another colour or size · gift wrapping.

**Situational (377–381)** — restaurant allergies and dietary restrictions · spice, sweetness, ice,
temperature, portion · cinema times, rows, seats, sold out · event dates and weekdays.

**Exercises (382–390)** — PA announcements as listening challenges · find a store from spoken
directions · receipt reading · product-label reading · menu reading · directory-map comprehension ·
role-play for returns and complaints, eye tests and prescriptions, phone warranties and repairs,
restaurant reservations.

**Production (391–395)** — speech recognition for ordering and shopping · typed production
questions · cloze from staff dialogue · review scheduling by store and topic · HSK tags on mall
vocabulary.

**Register and audio (396–400)** — formal vs casual customer-service language · slowed and
natural-speed announcements · different voices and regional accents · optional Chinese-only store
interactions.

---

## I. Events and seasonal

**Fix the three that exist (401–403)** — the fitness event as a playable class · the fashion event
given a runway, models, announcer and music · the light show given choreography and viewing
positions.

**Calendar (404–414)** — Lunar New Year · Lantern Festival · Qixi/Valentine's · Children's Day ·
618 · summer sale · back to school · Mid-Autumn mooncakes · National Day · Singles' Day ·
winter and New Year.

**Programming (415–427)** — product launches · book signings · cooking demonstrations · tea
ceremonies · children's craft workshops · pet adoption days · esports tournaments · cosplay ·
music and dance · art exhibitions · health screening · job fairs · charity drives.

428. `[?]` Vary events by weekday instead of repeating the same schedule daily.
429. `[?]` Event attendance affects relationships, vocabulary and rewards.

---

## J. Visual and environmental polish

**Light and material (430–440)** — regrade the over-bright white atrium · more contrast and visible
texture · stronger contact shadows · better grounding under food-court furniture · replace the
single player-following hall light with local lights · separate shop-interior lighting · floor and
glass reflections · anti-aliasing on thin signs · sharper Chinese signage at distance · less foggy
shopfront glazing · believable after-hours lighting.

**Shopfronts (441–443)** — a unique window display per storefront · displays rotating by season and
promotion · shutters and partly-closed states.

**Wear and weather (444–447)** — scuffs, fingerprints, grime, floor wear · entrance mats that wet
in rain · umbrellas and an umbrella-bag dispenser · weather visible through the atrium glazing.

**Building fabric (448–453)** — richer ceiling construction and lighting tracks · fire-safety
signage · sprinklers, smoke detectors, exit lights · digital directory screens with changing
content · escalator floor-number signs · lift position and direction indicators.

**Life and clutter (454–462)** — more natural planting · varied shopping bags · strollers,
wheelchairs, carts, cleaning machines · meals, cups, phones, bags and products in NPC hands · a
less toy-like food-court chair palette · more distinct stall counters and equipment · meaningful
table clutter · a proper stage, equipment and staff for events · spectators facing something worth
watching.

463. `[?]` An exterior visible through the opening doors.
464. `[?]` Maintenance and overnight-cleaning states.

---

## K. Audio and motion

**Zones (465–467)** — a separate ambient bed per floor · distinct music zones per store · HVAC and
ventilation ambience.

**Sources (468–477)** — checkout beeps and receipt printers · café grinders, steam, cups · bakery
ovens and trays · restaurant and food-court cooking · arcade audio falling off with distance ·
muffled cinema sound behind doors · escalator motors and steps · lift chimes and voice · fountain
and waterfall · shutters and automatic doors.

**Movement (478–480)** — stroller, cart, trolley and cleaning-machine wheels · footwear-dependent
footsteps · spatial crowd conversation.

**Mixing and access (481–484)** — duck music under the PA · duck the PA under important
conversation · subtitles and replay for every announcement · photosensitivity controls for the
arcade and light show.

---

## L. UI, navigation, accessibility

**Wayfinding (485–491)** — searchable directory · current floor shown clearly · you-are-here
markers · a drawn route to a chosen store · lift vs escalator route options · store hours and
closing warnings · honestly displayed promotions.

**Shopping UI (492–497)** — persistent shopping-list panel · basket contents and total · receipt
and purchase-history screens · return eligibility and warranty expiry · better passport progress ·
a cinema-ticket wallet.

**Notifications (498–499)** — event reminders · queue-number notifications.

**Accessibility (500–506)** — keyboard-navigable directory · larger text and sign-reading mode ·
high-contrast floor maps · colourblind-safe wayfinding · reduced-motion escalator and event
options · visual alternatives for audio cues · close-store camera behaviour.

507. `[?]` Test every mall interaction on touch devices.
     @unverifiable no touch harness exists; the browser tools can emulate a phone viewport but
     nothing here drives real touch events, so this is a person with a device until one is written

---

## M. Technical and QA

**Structure (508–511)** — split the 4,000-line shell into floor and system modules · remove the
duplicated inline tenant implementations once external modules are mandatory · a data-driven tenant
manifest · assert all 18 `MallFit` registrations (see item 18).

**Performance** — numbered because work has started on it (board task #16). Read the measured
findings in `STATE.md` before picking any of these up; four plausible levers have already been
measured and found to be noise, and the machine has ±5 ms of run-to-run spread.

512. `[?]` Portal culling for closed shop interiors. The remaining untested structural idea, and
     the one that matches the evidence: props cost as coverage rather than as draw calls (removing
     all of them moves calls 325 → 168 but halves GPU time), which is what overdraw looks like.
513. `[?]` Cull geometry and NPCs on non-visible floors. **Investigated and rejected**, 2026-08-08.
     The mall exports both hooks this needs — `level()` and `deckY` at js/mall.js:4388 — but
     js/game.js:12951 sets `drawDeck` only for `place === 'home'`, mall props carry no `.deck` tag,
     and the atrium void (js/mall.js:206) means the upper decks are genuinely visible from the
     ground floor. Hiding them would empty the view upward. Do not re-derive this.
     @unverifiable a rejected design cannot pass a check; the reason is recorded above
514. `[?]` Prop LOD for stocked shelves. **Measured, no effect.** `minPx` at 6 and 12 both land
     within ~1 ms of baseline across three repeats each. Small-prop culling is not the lever.
     @unverifiable a disproved lever has no passing state; the numbers are in STATE.md
515. `[x]` Cache floor and shop visibility. Already built: `scene._mainBatchVisibility` at
     js/game.js:13132 keeps a per-batch visible set keyed to an epoch, invalidated on 8 cm of eye
     movement or 0.012 rad of view rotation. The mall qualifies for it (js/game.js:13130).
     @check `rg -q '_mainBatchVisibility' js/game.js && rg -q "place === 'mall' && drawDeck < 0" js/game.js`
516. `[?]` Lazy-load tenant assets by floor.
517. `[?]` Lazy-load store audio.
518. `[?]` Per-store performance budgets.
519. `[?]` An overall mall frame-time budget. Note that `.fpscheck.js` measures with the quality
     ladder frozen at tier 0 (`perfHold(true)`, `LEVEL` defaults to 0), which is the worst case and
     not what a player sees — any budget has to say which tier it applies to.

**Navigation (520–522)** — a mall navmesh · cross-floor NPC pathfinding · robust evacuation paths.

**Visual regression (523–524)** — baselines for every tenant · daytime, night, crowded and closed
baselines.

**Functional tests (525–533)** — every shop entrance for collision and reachability · every
checkout flow · insufficient-funds paths · refunds, discounts, loyalty points, coupons · cinema
tickets across save/load · arcade balances and prizes across save/load · every PA claim against
live state (done, item 32) · every interactable against the dictionary · every floor-directory
entry against actual tenants.

**Stress and integration (534–539)** — geometry-overlap detection between adjacent shops · a
glazing-obstruction check · crowd-overlap and stuck-NPC stress test · a full opening-to-closing
simulation · weekend and seasonal schedule tests · accessible-route tests from the entrance to
every tenant.
