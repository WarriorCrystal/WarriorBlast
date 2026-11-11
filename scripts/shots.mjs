// Capturas automáticas con Edge headless (solo para desarrollo/QA).
// Uso: node scripts/shots.mjs <url> <carpetaSalida> [escenario...]
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const [, , url = 'http://localhost:5174/', out = 'shots', ...scenes] = process.argv;
mkdirSync(out, { recursive: true });
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: EDGE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-ES' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && !m.text().includes('vibrate') && errors.push(m.text()));

async function boot(save) {
  await page.goto(url);
  await page.evaluate((s) => {
    localStorage.clear();
    if (s) localStorage.setItem('warriorblast.save', JSON.stringify(s));
  }, save);
  await page.reload();
  await page.waitForFunction(() => window.__wb);
  await wait(900);
}
const shot = async (name) => {
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log('shot', name);
};
const L = () => page.evaluate(() => window.__wb.view.layout);
const sess = () => page.evaluate(() => {
  const s = window.__wb.game.game.session;
  return s && { tray: s.tray.map((p) => p && { w: p.shape.w, h: p.shape.h, cells: p.shape.cells }), ended: s.ended, score: s.score };
});
/** Busca la mejor jugada y la arrastra con el ratón. stopBefore: deja la pieza en el aire. */
async function play(stopBefore = false) {
  const plan = await page.evaluate(() => {
    const s = window.__wb.game.game.session;
    const v = window.__wb.view;
    let best = null;
    s.tray.forEach((p, i) => {
      if (!p || !v.trayPieces[i]) return;
      for (const [x, y] of s.board.positionsFor(p.shape)) {
        const l = s.board.linesIfPlaced(p.shape, x, y);
        const k = l.rows.length + l.cols.length;
        if (!best || k > best.k) best = { i, x, y, k, w: p.shape.w, h: p.shape.h };
      }
    });
    return best;
  });
  if (!plan) return null;
  const l = await L();
  const sx = l.W / 2 + (plan.i - 1) * l.slotW;
  const tx = l.bx + (plan.x + plan.w / 2) * l.cell;
  const ty = l.by + (plan.y + plan.h / 2) * l.cell;
  await page.mouse.move(sx, l.trayY);
  await page.mouse.down();
  for (let k = 1; k <= 8; k++) {
    await page.mouse.move(sx + ((tx - sx) * k) / 8, l.trayY + ((ty - l.trayY) * k) / 8);
    await wait(16);
  }
  if (stopBefore) return plan;
  await page.mouse.up();
  return plan;
}
const baseSave = (extra = {}) => ({ version: 1, tutorialDone: true, coins: 2400, login: { lastDate: new Date().toLocaleDateString('sv-SE'), streak: 1 }, ...extra });

const all = scenes.length ? scenes : ['home', 'game', 'skins', 'menus'];
for (const scene of all) {
  if (scene === 'tutorial') {
    await boot(null);
    await wait(1500);
    await shot('tutorial');
  }
  if (scene === 'home') {
    await boot(baseSave());
    await shot('home');
    await boot({ version: 1, tutorialDone: true });
    await shot('home-reward');
  }
  if (scene === 'game') {
    await boot(baseSave());
    await page.evaluate(() => window.__wb.game.startGame('classic'));
    await wait(900);
    await shot('game-start');
    // jugar hasta encontrar una jugada que limpie y capturar el arrastre y la explosión
    let shotDrag = false;
    for (let m = 0; m < 60; m++) {
      const plan = await play(true);
      if (!plan) break;
      if (plan.k > 0 && !shotDrag) {
        await shot('game-drag-highlight');
        shotDrag = true;
        await page.mouse.up();
        await wait(150);
        await shot('game-clear-150ms');
        await wait(250);
        await shot('game-clear-400ms');
        await wait(800);
        continue;
      }
      await page.mouse.up();
      await wait(140);
      const s = await sess();
      if (s.ended) break;
    }
    await shot('game-mid');
    for (let m = 0; m < 200; m++) {
      const s = await sess();
      if (!s || s.ended) break;
      if (!(await play())) await wait(300);
      await wait(90);
    }
    await wait(2600);
    await shot('game-over');
  }
  if (scene === 'skins') {
    for (const skin of (process.env.SKINS ? process.env.SKINS.split(',') : ['neon', 'pastel', 'pixel', 'blockworld', 'gems', 'dinos', 'starsaga', 'glass'])) {
      await boot(baseSave({ skin, ownedSkins: ['neon', skin] }));
      await page.evaluate(() => window.__wb.game.startGame('adventure', 10));
      await wait(1200);
      for (let m = 0; m < 6; m++) {
        await play();
        await wait(200);
      }
      const plan = await play(true);
      await wait(100);
      await shot(`skin-${skin}`);
      if (plan) await page.mouse.up();
      await wait(180);
      await shot(`skin-${skin}-fx`);
    }
  }
  if (scene === 'menus') {
    await boot(baseSave({ levels: { 1: { stars: 3, best: 900 }, 2: { stars: 2, best: 1000 }, 3: { stars: 1, best: 500 } } }));
    for (const [name, sel] of [['shop', 'shop'], ['adventure', 'adventure'], ['achievements', 'achievements'], ['stats', 'stats'], ['settings', 'settings']]) {
      await page.evaluate((s) => window.__wb.game.show(s), sel);
      await wait(700);
      await shot(`menu-${name}`);
    }
    await page.evaluate(() => window.__wb.game.showLevelIntro(window.__wbLevels?.[3] ?? { id: 4, goals: [{ type: 'gems', target: 3 }], stars: [1, 2] }));
    await wait(600);
    await shot('menu-level-intro');
  }
  if (scene === 'desktop') {
    await page.setViewportSize({ width: 1280, height: 800 });
    await boot(baseSave());
    await shot('desktop-home');
    await page.evaluate(() => window.__wb.game.startGame('timeattack'));
    await wait(1200);
    for (let m = 0; m < 8; m++) {
      await play();
      await wait(150);
    }
    await shot('desktop-game');
    await page.setViewportSize({ width: 390, height: 844 });
  }
}
console.log(errors.length ? 'ERRORES:\n' + [...new Set(errors)].join('\n') : 'Sin errores de consola');
await browser.close();
