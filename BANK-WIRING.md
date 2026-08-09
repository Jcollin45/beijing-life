# BANK-WIRING — the Hub tickets

The bank is **fully built** as its own files (`js/bank.js` + 8 `js/bank-*.js` + `js/street-bank.js`),
all syntax-checked and passing. It is **not wired into the game yet**, because ChatGPT is actively
editing the shared files (`game.js`, `vocab.js`, `data.js`, `street.js`, `index.html`) for the
hospital, and this repo has **no git** — editing those same files now would collide and corrupt
both builds with no rollback.

This file is the exact set of edits — the **Hub tickets** from `AGENT_ARMY.md` — to apply once
ChatGPT is done. Each is one line, at a verified insertion point. Apply them in order, then run
`node .bootcheck.js` to confirm the bank appears in `PLACES` and boots clean.

## Before applying

- Confirm ChatGPT has stopped: `ls -lt js/game.js js/vocab.js js/data.js js/street.js index.html`
  should show no edits in the last few minutes.
- Back up the five files first (copy them to `*.before-bank`) — no git means no undo.
- Each ticket names the file, the exact line to find, and the line to add/change.

---

## Ticket 1 — register the bank scripts in the loader

**File:** `index.html`
**Find (line ~994):**
```
               'diner','hospital','hosp-floor1','hosp-floor2','hosp-floor3','hosp-floor4',
```
**Add a new line after the hosp-floor4 line (or extend the mall/air line), mirroring it:**
```
               'bank','bank-entry','bank-ticket','bank-counters','bank-atms','bank-desks','bank-safe','bank-vip','bank-office','bank-waiting','street-bank',
```
*Why:* the loader at `index.html:994` is the single list of scripts the game loads. The bank files
define `BankFit`/`BankCore`/`Bank` and register their builders at load time, so they must load
before `game.js` first touches `Bank`. Order within the bank group matters: `bank.js` (which
declares `BankFit`/`BankCore`) must come before the `bank-*.js` zone files that register into it;
`street-bank.js` must come after `street.js` (which declares `StreetFit`).

## Ticket 2 — add `Bank` to the PLACES registry

**File:** `js/game.js`
**Find (line ~55-56):**
```
                 hospital: Hospital, hospital2: Hospital2, hospital3: Hospital3, hospital4: Hospital4,
                 mall: Mall, office: Office,
```
**Add `bank: Bank,` to the registry** — e.g. on the second line:
```
                 mall: Mall, office: Office, bank: Bank,
```
*Why:* `PLACES` (`game.js:54`) is the map `setPlace(name)` reads. Without an entry, `setPlace('bank')`
sets `scene = undefined` and the game crashes on the next frame.

## Ticket 3 — register the door verb (the USE row)

**File:** `js/data.js`
**Find (line ~1586), the 药店 entry to mirror:**
```
  '药店': { zh:'进药店', py:'jìn yàodiàn', en:'go into the pharmacy', secs:2.6, mins:5, ... },
```
**Add a 银行 entry beside it:**
```js
  '银行': { zh:'进银行', py:'jìn yínháng', en:'go into the bank', secs:2.6, mins:5,
            go:'bank',
            done:'推门进了银行。', doneTr:'You push the door and go into the bank.' },
```
*Why:* the street-side `银行` thing in `street-bank.js` sets `.exit = {place:'bank',...}`, which the
game reads directly (`game.js:7539`) — so this USE row is the *fallback* verb path and the
dictionary entry that makes 银行 teachable. The `go:'bank'` is what `def.go` consumes.

## Ticket 4 — push the bank's NPCs into the roster

**File:** `js/game.js`
**Find (line ~1102):**
```
if (typeof HospitalCast !== 'undefined') for (const n of HospitalCast) NPCS.push(n);
```
**Add beside it:**
```js
if (typeof BankCast !== 'undefined') for (const n of BankCast) NPCS.push(n);
```
*Why:* `BankCast` (declared in `bank.js`, currently empty) is where the bank's authored NPCs (teller,
guard, account manager) will be pushed when the Scribe writes them — mirroring the hospital/mall
pattern. Harmless while empty; required once NPCs land.

## Ticket 5 — expose the street-side OUT point

**File:** `js/street.js`
The bank's hall reads `BANK_OUT` from `js/bank.js` directly (it's a top-level const there, like
`HOSPITAL_OUT`), so **no street.js change is strictly required** for the door to work — the hall's
`门` sets `.exit = {place:'street', at:BANK_OUT}` and `BANK_OUT` is already defined.

**Optional polish** (mirror the pharmacy getter at `street.js:3804`): if you want `street-bank.js`'s
dynamic OUT (which accounts for where the facade actually landed) to override the static one, add:
```js
    get BANK_OUT() { return StreetFit.bank && StreetFit.bank.OUT || BANK_OUT; },
```
to the street's finish block near the `PHARMACY_OUT` getter. *Skip this unless the static point
feels wrong after testing — the static `BANK_OUT` in bank.js is a correct fallback.*

---

## After applying

1. `node --check js/game.js js/data.js` — confirm no syntax break.
2. `node .bootcheck.js` — the bank should appear in `PLACES` and the game should boot clean
   (`bootOverlay: false, fails: [], errors: []`).
3. Start the dev server, walk to the west-side civic block on the street, and use the 银行 door.
4. Once confirmed, add audit shots to `.audit.js` (a `B1-hall`, `B2-counter`, `B3-atm`, `B4-safe`
   block) so the Verifier can gate future bank work.

## What's intentionally left as tickets, not done

- **Vocab rows** for every bank `thing()` (存款/取款/开户/密码/余额/转账/身份证/排队/取号/叫号/柜台/
  理财/贵宾/保险箱…). The `thing()` calls already carry their `zh/en/note`, so the game won't crash
  without dict rows — but `.dictcheck.js` will flag them until the Lexicographer adds them.
- **NPC dialogue** (`talk.js`) — `BankCast` is empty by design; the Scribe fills it.
- **Audit shots** — add after the wiring is confirmed, so the shots exercise a working bank.

These are the Scribe/Lexicographer/Verifier roles from `AGENT_ARMY.md`, queued through the Hub.
