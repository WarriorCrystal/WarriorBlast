# How to add a skin

A skin is **a single file** in `src/skins/defs/`. It registers itself (via `import.meta.glob`),
so you don't need to touch the game logic, the shop or the renderer.

## Steps

1. Copy an existing skin, for example `src/skins/defs/pastel.ts`, to `src/skins/defs/my-skin.ts`.
2. Change `id` (unique, no spaces), `name`, `description`, `price` and `order` (position in the shop).
3. Adjust the colors and drawings (see the table). Save: with `npm run dev` it shows up in the shop instantly.

## What a skin defines (`src/skins/types.ts`)

| Field | Purpose |
|---|---|
| `blocks` | 7 block colors + 1 "stone" color (gray/target blocks) |
| `ui` | Menu and HUD colors (`bg`, `panel`, `text`, `accent`…), corner radius, `glass` (frosted glass), `font` (system fonts only) |
| `drawBackground(ctx, w, h)` | Full-screen background (Canvas 2D) |
| `drawBoard(ctx, size, cell)` | Board frame and empty cells |
| `drawBlock(ctx, s, color, variant)` | One `s`×`s` block. `variant`: `normal`, `ghost` (shadow while dragging) or `stone` |
| `blockMargin` | Extra space around the block for glows (fraction of a cell) |
| `drawGem` / `drawTarget` | (Optional) gem and target icons drawn on top of a block |
| `particles` | Particle drawing + count, size, speed, gravity, lifetime, blend (`add`/`normal`) |
| `ambient` | (Optional) floating background particles |
| `flash` | Flash color when lines clear |
| `frosted` | The board shows the blurred background behind it (glass effect) |
| `pixelated` | Unsmoothed scaling (pixel art) |
| `sound` | Audio mood: root note, scale, timbres and generative music (tempo, chord progression, instruments, reverb, echo, percussion) |

Everything is drawn with the standard Canvas 2D API and automatically converted into WebGL textures
at the screen's resolution. The helpers in `src/skins/draw.ts` (`roundRect`, `shade`, `rgba`,
`star`, `softDot`, `drawGemIcon`…) save you work.

## Tips

- Test the skin in all four situations: board, dragged piece (`ghost`), clearing (particles and `flash`) and menus (`ui`).
- Keep enough contrast between `ui.text` and `ui.panel`.
- Sounds use Web Audio synthesis: there's no need (and it's not advisable) to add audio files.
- Suggested price: a normal game gives 20–80 coins; 300–1200 makes each skin cost from a few to about twenty games.
