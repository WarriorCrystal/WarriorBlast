# Warrior Blast

Puzzle de bloques original (tablero 8×8, 3 piezas por turno, limpia filas y columnas, encadena combos).
TypeScript + PixiJS (WebGL) + Vite, instalable como **PWA** y **100 % offline**.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (también en el móvil por la red local: usa la IP que muestra) |
| `npm test` | Tests del núcleo + simulación de balance de niveles |
| `npm run build` | Versión final en `dist/` (con service worker) |
| `npm run preview` | Sirve `dist/` para probarla |
| `npm run icons` | Regenera los iconos PNG por código |
| `node scripts/offline-check.mjs` | Verifica offline real (necesita `npm run build` y Edge) |
| `node scripts/shots.mjs <url> <carpeta>` | Capturas automáticas de QA (Edge headless) |

Editor de niveles: `npm run dev` y abre `/editor.html`.

## Arquitectura

```
src/
  core/        Lógica pura, sin DOM (testeada): rng con semilla, piezas, tablero,
               puntuación/combos, generador justo, sesión con reglas de cada modo
  levels/      30 niveles de Aventura + tutorial, como datos legibles
  skins/       Tipos, utilidades de dibujo y defs/ (un archivo = una skin, autorregistro)
  render/      PixiJS: texturas generadas desde la skin, vista de juego, partículas, tweens
  audio/       Efectos y música generativa con Web Audio (sin archivos), vibración
  i18n/        es.ts / en.ts (detección automática del idioma)
  save/        Guardado local versionado con migraciones
  meta/        Monedas, logros, recompensa diaria, estadísticas
  ui/          Menús y HUD en DOM/CSS + controlador de partida
```

- **Modos:** Clásico, Contrarreloj (2 min, las líneas suman tiempo), Desafío diario (semilla por fecha, 20 rondas),
  Zen (sin game over: si te atascas llegan piezas nuevas; deshacer ilimitado), Aventura (30 niveles, estrellas).
- **Generador justo:** si alguna forma cabe, al menos una pieza del set cabe; con dificultad baja exige que el set
  completo sea colocable, ofrece piezas "salvavidas" y elige el set más amable; se endurece con la puntuación.
- **Combos:** cada jugada que limpia sube el multiplicador (x2, x3…); se mantiene durante 2 jugadas sin limpiar
  (los puntitos del indicador muestran cuántas quedan).

Documentación: [docs/SKINS.md](docs/SKINS.md) · [docs/NIVELES.md](docs/NIVELES.md) · [docs/PUBLICAR.md](docs/PUBLICAR.md)
