# Warrior Blast

An original block puzzle game (8×8 board, 3 pieces per turn, clear rows and columns, chain combos).
TypeScript + PixiJS (WebGL) + Vite, installable as a **PWA** and **100% offline**.

Play it: https://warriorcrystal.github.io/WarriorBlast/

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server (also reachable from a phone over the local network: use the IP it prints) |
| `npm test` | Core logic tests + level balance simulation |
| `npm run build` | Production build in `dist/` (with service worker) |
| `npm run preview` | Serves `dist/` for testing |
| `npm run icons` | Regenerates the PNG icons from code |
| `node scripts/offline-check.mjs` | Verifies real offline behavior (needs `npm run build` and Edge) |
| `node scripts/shots.mjs <url> <folder>` | Automated QA screenshots (headless Edge) |

Level editor: run `npm run dev` and open `/editor.html`.

## Architecture

```
src/
  core/        Pure logic, no DOM (tested): seeded RNG, pieces, board,
               scoring/combos, fair generator, session with each mode's rules
  levels/      30 Adventure levels + tutorial, as readable data
  skins/       Types, drawing helpers and defs/ (one file = one skin, self-registering)
  render/      PixiJS: textures generated from the skin, game view, particles, tweens
  audio/       Effects and generative music with Web Audio (no files), vibration
  i18n/        es.ts / en.ts (automatic language detection)
  save/        Versioned local save with migrations
  meta/        Coins, achievements, daily reward, statistics
  ui/          Menus and HUD in DOM/CSS + game controller
```

- **Modes:** Classic, Time Attack (2 min, clearing lines adds time), Daily Challenge (date-based seed, 20 rounds),
  Zen (no game over: new pieces arrive if you get stuck; unlimited undo), Adventure (30 levels, stars).
- **Fair generator:** if any shape fits, at least one piece in the set fits; at low difficulty the whole set
  must be placeable, "lifesaver" pieces are offered, and the friendliest set is chosen. It gets harder as your score grows.
- **Combos:** every move that clears lines raises the multiplier (x2, x3…); it holds for 2 moves without a clear
  (the indicator dots show how many are left).

## Deployment

Every push to `main` is tested, built and published to GitHub Pages by
[.github/workflows/deploy.yml](.github/workflows/deploy.yml). Installed copies of the game update themselves
automatically. See [docs/PUBLISHING.md](docs/PUBLISHING.md).

## Documentation

[docs/SKINS.md](docs/SKINS.md) · [docs/LEVELS.md](docs/LEVELS.md) · [docs/PUBLISHING.md](docs/PUBLISHING.md)
