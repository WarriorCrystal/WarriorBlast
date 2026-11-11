# Cómo añadir una skin

Una skin es **un solo archivo** en `src/skins/defs/`. Se registra sola (con `import.meta.glob`):
no hay que tocar la lógica del juego, la tienda ni el render.

## Pasos

1. Copia una skin existente, por ejemplo `src/skins/defs/pastel.ts`, a `src/skins/defs/mi-skin.ts`.
2. Cambia `id` (único, sin espacios), `name`, `description`, `price` y `order` (posición en la tienda).
3. Ajusta los colores y los dibujos (ver tabla). Guarda: con `npm run dev` aparece al instante en la tienda.

## Qué define una skin (`src/skins/types.ts`)

| Campo | Para qué sirve |
|---|---|
| `blocks` | 7 colores de bloque + 1 color "piedra" (bloques grises/diana) |
| `ui` | Colores de menús y HUD (`bg`, `panel`, `text`, `accent`…), radio de esquinas, `glass` (vidrio esmerilado), `font` (solo fuentes del sistema) |
| `drawBackground(ctx, w, h)` | Fondo de pantalla completo (Canvas 2D) |
| `drawBoard(ctx, size, cell)` | Marco del tablero y celdas vacías |
| `drawBlock(ctx, s, color, variant)` | Un bloque de `s`×`s`. `variant`: `normal`, `ghost` (sombra al arrastrar) o `stone` |
| `blockMargin` | Espacio extra alrededor del bloque para brillos (fracción de celda) |
| `drawGem` / `drawTarget` | (Opcional) iconos de gema y diana encima de un bloque |
| `particles` | Dibujo de una partícula + cantidad, tamaño, velocidad, gravedad, vida, mezcla (`add`/`normal`) |
| `ambient` | (Opcional) partículas flotantes del fondo |
| `flash` | Color del destello al limpiar líneas |
| `frosted` | El tablero muestra el fondo desenfocado detrás (efecto vidrio) |
| `pixelated` | Escalado sin suavizado (pixel art) |
| `sound` | Ambientación: nota raíz, escala, timbres y música generativa (tempo, progresión de acordes, instrumentos, reverb, eco, percusión) |

Todo se dibuja con la API Canvas 2D estándar y se convierte en texturas WebGL automáticamente,
a la resolución de la pantalla. Las utilidades de `src/skins/draw.ts` (`roundRect`, `shade`, `rgba`,
`star`, `softDot`, `drawGemIcon`…) ahorran trabajo.

## Consejos

- Prueba la skin en las cuatro situaciones: tablero, pieza arrastrada (`ghost`), limpieza (partículas y `flash`) y menús (`ui`).
- Mantén el contraste entre `ui.text` y `ui.panel`.
- Los sonidos usan síntesis Web Audio: no hace falta (ni conviene) añadir archivos de audio.
- Precio orientativo: una partida normal da 20–80 monedas; 300–1200 hace que cada skin cueste entre unas pocas y unas veinte partidas.
