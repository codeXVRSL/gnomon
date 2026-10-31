# Gnomon

A two-world pixel puzzle-platformer where your shadow is the hand of a sundial.
The sun only moves when you move; your shadow slides east → under you → west through the day.

Play (main): https://codexvrsl.github.io/gnomon/

## Branch `new-update-v2`
- New opening stage **The Hour Hand**: the sun mechanic is taught in the first 60 seconds.
- Contextual controls: FLIP / PIN only appear on stages that use them.
- 2.5D camera shelved (hidden).

## Source (`src/`)
- `engine.js` — game rules and physics (pure, testable)
- `levels.js` — stage maps
- `template.html` — renderer, UI, input, audio
- `build.js` — builds `index.html`; computes par times from the verified runs
- `test.js`, `runall.js` — scripted runs proving every stage can be finished
- `fuzz.js` — random-input stress test

Build: `cd src && node build.js` (writes to `../out/`).
