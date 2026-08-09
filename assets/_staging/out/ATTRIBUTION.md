# Third-party model attribution

Everything in `assets/models/` that is **not** Poly Haven is listed here. Poly Haven assets are
CC0 and need no credit; anything below carries a licence obligation that ships with the game.

Destination when promoted out of `_staging/`: `assets/models/ATTRIBUTION.md`.

## Why this file exists

The original 261 props are Poly Haven (CC0 — credit not mandatory, commercial use allowed).
Any CC BY import adds an obligation the rest of the library does not have: the credit line must
travel with anything the model is distributed in. One missed entry makes the whole build
non-compliant, so a model does not enter `assets/models/` until it has a row here.

## Licence rules applied when sourcing

| Licence | Allowed | Reason |
|---|---|---|
| CC0 | yes | no obligation, matches the existing library |
| CC BY | yes, with the credit below | attribution only |
| CC BY-SA | **no** | would force the derivative under the same licence |
| CC BY-ND / CC BY-NC-ND | **no** | forbids derivatives — the retopo/decimate pass *is* a derivative |
| CC BY-NC / CC BY-NC-SA | **no** | non-commercial |
| Editorial | **no** | newsworthy/public-interest use only |

## Models

### RiceCooker_01

- **Title:** supor Rice cooker 苏泊尔电饭锅
- **Author:** jiuyue — https://sketchfab.com/jiuyue
- **Source:** https://sketchfab.com/3d-models/supor-rice-cooker-a9bf09f4f333493580d75b4bde98f9cb
- **Licence:** CC-BY-4.0 — http://creativecommons.org/licenses/by/4.0/
- **Imported:** 2026-08-07

Required credit line, to be reproduced wherever the game is shared:

> This work is based on "supor Rice cooker 苏泊尔电饭锅"
> (https://sketchfab.com/3d-models/supor-rice-cooker-a9bf09f4f333493580d75b4bde98f9cb)
> by jiuyue (https://sketchfab.com/jiuyue) licensed under CC-BY-4.0
> (http://creativecommons.org/licenses/by/4.0/)

**Modifications made** (CC BY requires that changes be indicated):

- Rescaled from millimetres to metres — the source measured 352 × 318 × 300 **m**
- Decimated 40,488 → 9,000 triangles to sit under the house ceiling (CashRegister_01, 9,927)
- Joined 4 objects into 1; origin moved to floor centre so min-Z is exactly 0
- Materials renamed `material*` → `RiceCooker_01*`; blend mode HASHED → OPAQUE (nothing is
  transparent: alpha 1, transmission 0 on every slot)
- Textures downscaled 2048 → 1024 and converted PNG → JPG
- Textures renamed to the house convention: `_baseColor` → `_diff_1k`,
  `_metallicRoughness` → `_arm_1k`, `_normal` → `_nor_gl_1k`

**Trademark note:** the model carries visible SUPOR (苏泊尔) branding on the control panel. It is
retained deliberately — see the note in the session that produced this file. If the game ships
commercially and the mark is a concern, the fix is a retexture of
`textures/RiceCooker_01_diff_1k.jpg`, not a re-import.
