# Niveles del modo Aventura

Los niveles están en `src/levels/levels.ts` como datos. Ejemplo:

```ts
{
  id: 13,
  goals: [{ type: 'targets' }, { type: 'lines', target: 6 }],
  moves: 40,            // opcional: límite de piezas
  difficulty: 0.3,      // 0 = piezas amables … 1 = piezas difíciles
  gemChance: 0.2,       // opcional: probabilidad de que una pieza traiga gema
  stars: [1200, 1900],  // puntos para 2★ y 3★ (1★ = completar)
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

## Símbolos del tablero

| Símbolo | Significado |
|---|---|
| `.` | vacío |
| `1`–`7` | bloque de color |
| `#` | bloque gris |
| `G` | bloque con gema (se recoge al limpiar su fila/columna) |
| `X` | bloque diana (objetivo `targets`: hay que limpiarlos todos) |

## Objetivos

`score` (puntos), `lines` (líneas), `gems` (gemas), `targets` (dianas), `combo` (combo xN).
Se pueden combinar varios. Al ganar, cada movimiento sobrante suma 40 puntos.

## Editor visual

Con `npm run dev`, abre **http://localhost:5173/editor.html**: pinta el tablero, rellena los objetivos,
pulsa **Probar en el juego** y luego **Copiar código** para pegarlo en `levels.ts`.

## Reglas

- Los `id` deben ser consecutivos (1, 2, 3…). El mapa crece solo.
- No dejes filas o columnas completas en el tablero inicial (se limpiarían al instante).
- `npm test` comprueba que todos los niveles cargan y que un bot puede superarlos.
