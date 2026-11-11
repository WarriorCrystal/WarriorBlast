/* Editor de niveles (solo desarrollo: http://localhost:5173/editor.html) */
import type { Goal, LevelDef } from './core/level';
import neon from './skins/defs/neon';

const TILES: Array<{ ch: string; label: string; color: string }> = [
  { ch: '.', label: '·', color: '#262150' },
  ...neon.blocks.slice(0, 7).map((c, i) => ({ ch: String(i + 1), label: String(i + 1), color: c })),
  { ch: '#', label: '#', color: '#5b5a7a' },
  { ch: 'G', label: '💎', color: '#2a7f9a' },
  { ch: 'X', label: '◎', color: '#7a7a8a' },
];
const board: string[][] = Array.from({ length: 8 }, () => Array(8).fill('.'));
let current = '1';
const $ = (id: string) => document.getElementById(id) as HTMLInputElement;

const grid = $('grid');
const cells: HTMLDivElement[] = [];
let painting = false;
for (let y = 0; y < 8; y++)
  for (let x = 0; x < 8; x++) {
    const d = document.createElement('div');
    const paint = () => {
      board[y][x] = current;
      render();
    };
    d.addEventListener('pointerdown', (e) => {
      painting = true;
      e.preventDefault();
      paint();
    });
    d.addEventListener('pointerenter', () => painting && paint());
    grid.appendChild(d);
    cells.push(d);
  }
window.addEventListener('pointerup', () => (painting = false));

const pal = $('pal');
for (const tile of TILES) {
  const b = document.createElement('button');
  b.textContent = tile.label;
  b.style.background = tile.color;
  b.onclick = () => {
    current = tile.ch;
    pal.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
    b.classList.add('on');
  };
  if (tile.ch === current) b.classList.add('on');
  pal.appendChild(b);
}

function level(): LevelDef {
  const num = (id: string) => (($(id).value ?? '') === '' ? undefined : Number($(id).value));
  const goals: Goal[] = [];
  if (num('g-score')) goals.push({ type: 'score', target: num('g-score')! });
  if (num('g-lines')) goals.push({ type: 'lines', target: num('g-lines')! });
  if (num('g-gems')) goals.push({ type: 'gems', target: num('g-gems')! });
  if (num('g-combo')) goals.push({ type: 'combo', target: num('g-combo')! });
  if ($('g-targets').value) goals.push({ type: 'targets' });
  const rows = board.map((r) => r.join(''));
  const lv: LevelDef = { id: num('id') ?? 31, goals: goals.length ? goals : [{ type: 'lines', target: 5 }], stars: [num('s2') ?? 1000, num('s3') ?? 2000] };
  if (num('moves')) lv.moves = num('moves');
  if (num('diff') != null) lv.difficulty = num('diff');
  if (num('gem')) lv.gemChance = num('gem');
  if (rows.some((r) => r !== '........')) lv.board = rows;
  return lv;
}

function code(lv: LevelDef): string {
  const lines = [`  {`, `    id: ${lv.id},`, `    goals: ${JSON.stringify(lv.goals).replace(/"(\w+)":/g, '$1: ').replace(/"/g, "'").replace(/,/g, ', ')},`];
  if (lv.moves) lines.push(`    moves: ${lv.moves},`);
  if (lv.difficulty != null) lines.push(`    difficulty: ${lv.difficulty},`);
  if (lv.gemChance) lines.push(`    gemChance: ${lv.gemChance},`);
  lines.push(`    stars: [${lv.stars[0]}, ${lv.stars[1]}],`);
  if (lv.board) lines.push(`    board: [`, ...lv.board.map((r) => `      '${r}',`), `    ],`);
  lines.push(`  },`);
  return lines.join('\n');
}

function render() {
  board.flat().forEach((ch, i) => {
    const tile = TILES.find((t) => t.ch === ch)!;
    cells[i].style.background = tile.color;
    cells[i].textContent = ch === '.' ? '' : tile.label;
  });
  const lv = level();
  const full = board.some((r) => r.every((c) => c !== '.')) || [0, 1, 2, 3, 4, 5, 6, 7].some((x) => board.every((r) => r[x] !== '.'));
  $('out').value = (full ? '// ⚠ Hay una fila o columna llena: se limpiaría al instante.\n' : '') + code(lv);
}

document.querySelectorAll('input,select').forEach((el) => el.addEventListener('input', render));
$('copy').onclick = () => navigator.clipboard.writeText(code(level()));
$('clear').onclick = () => {
  board.forEach((r) => r.fill('.'));
  render();
};
$('test').onclick = () => {
  localStorage.setItem('warriorblast.testLevel', JSON.stringify(level()));
  window.open('./?testLevel=1', '_blank');
};
render();
