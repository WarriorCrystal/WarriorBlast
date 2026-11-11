// Verifica el modo offline real: arranca `vite preview`, carga la app, espera al service
// worker, APAGA el servidor y recarga. La app debe arrancar y ser jugable sin red.
// Uso: npm run build && node scripts/offline-check.mjs
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const PORT = 4321;
const URL = `http://localhost:${PORT}/`;
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const out = process.argv[2] ?? '.';

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((res) => server.stdout.on('data', (d) => String(d).includes(String(PORT)) && res()));

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-ES' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
let ok = true;
const check = (cond, msg) => {
  console.log(`${cond ? '✔' : '✘'} ${msg}`);
  if (!cond) ok = false;
};

await page.goto(URL);
await page.waitForFunction(() => navigator.serviceWorker?.controller || navigator.serviceWorker?.ready, null, { timeout: 15000 });
await page.evaluate(() => navigator.serviceWorker.ready);
// la primera carga instala el SW; recargamos para que controle la página
await page.reload();
await wait(1500);
const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
check(controlled, 'service worker activo y controlando la página');
const cached = await page.evaluate(async () => {
  const keys = await caches.keys();
  let n = 0;
  for (const k of keys) n += (await (await caches.open(k)).keys()).length;
  return n;
});
const expected = new Set(readFileSync('dist/sw.js', 'utf-8').match(/url:"[^"]+"/g)).size;
check(cached >= expected, `precache completo: ${cached}/${expected} archivos`);

// ---- cortar el servidor: offline real ----
server.kill();
await wait(800);
let reachable = true;
try {
  await fetch(URL);
} catch {
  reachable = false;
}
check(!reachable, 'servidor apagado (sin red)');

await page.reload();
await wait(2000);
const state = await page.evaluate(() => ({
  title: document.title,
  canvas: !!document.getElementById('stage'),
  screen: document.querySelector('.screen')?.className ?? '',
  splashGone: !document.getElementById('splash') || document.getElementById('splash').classList.contains('gone'),
}));
check(state.canvas && state.splashGone, `la app arranca sin conexión (${state.screen})`);

await page.screenshot({ path: `${out}/offline.png` });
check(errors.length === 0, errors.length ? 'errores: ' + errors.join(' | ') : 'sin errores de JavaScript');

await browser.close();
console.log(ok ? '\nOFFLINE OK' : '\nOFFLINE FALLÓ');
process.exit(ok ? 0 : 1);
