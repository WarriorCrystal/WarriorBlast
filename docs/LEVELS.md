# Adventure mode levels

Levels live in `src/levels/levels.ts` as data. Example:

```ts
{
  id: 13,
  goals: [{ type: 'targets' }, { type: 'lines', target: 6 }],
  moves: 40,            // optional: piece limit
  difficulty: 0.3,      // 0 = friendly pieces … 1 = hard pieces
  gemChance: 0.2,       // optional: chance that a piece carries a gem
  stars: [1200, 1900],  // points needed for 2★ and 3★ (1★ = complete the level)
  board: [
    'XX....XX',
    'X......X',
    '........',
    '...G....',
    '........',
    '..1111..',
    'X......X',
    'XX....XX',
  ],
},
```

## Board symbols

| Symbol | Meaning |
|---|---|
| `.` | empty |
| `1`–`7` | colored block |
| `#` | gray block |
| `G` | gem block (collected when its row/column is cleared) |
| `X` | target block (`targets` goal: all of them must be cleared) |

## Goals

`score` (points), `lines` (lines), `gems` (gems), `targets` (target blocks), `combo` (xN combo).
Several can be combined. When you win, each leftover move is worth 40 points.

## Visual editor

Run `npm run dev` and open **http://localhost:5173/editor.html**: paint the board, fill in the goals,
click **Probar en el juego** (test in game), then **Copiar código** (copy code) and paste it into `levels.ts`.

## Rules

- `id`s must be consecutive (1, 2, 3…). The map grows on its own.
- Don't leave full rows or columns in the starting board (they would clear instantly).
- `npm test` checks that every level loads and that a bot can beat it.
