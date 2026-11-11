import { Application } from 'pixi.js';
import { registerSW } from 'virtual:pwa-register';
import { audio, haptics } from './audio/audio';
import { detectLang, setLang } from './i18n';
import { Progress } from './meta/progress';
import { CascadeView } from './render/CascadeView';
import { GameView } from './render/GameView';
import { SaveStore } from './save/save';
import { App } from './ui/App';
import './ui/styles.css';

async function boot() {
  const store = new SaveStore();
  const progress = new Progress(store);
  const s = store.data.settings;
  setLang(s.lang ?? detectLang());
  audio.setEnabled(s.music, s.sfx);
  haptics.enabled = s.vibration;

  const app = new Application();
  await app.init({
    resizeTo: window,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    backgroundAlpha: 0,
    preference: 'webgl',
    powerPreference: 'high-performance',
  });
  app.canvas.id = 'stage';
  document.body.prepend(app.canvas);

  const view = new GameView(app);
  const cview = new CascadeView(view);
  const ui = document.getElementById('ui')!;
  const game = new App(ui, view, cview, store, progress);

  // iOS: el audio solo arranca tras un gesto del usuario
  const unlock = () => audio.unlock();
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });

  game.start();
  document.getElementById('splash')?.classList.add('gone');
  setTimeout(() => document.getElementById('splash')?.remove(), 600);

  // Service worker: precache total para jugar offline
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    // autoUpdate: la nueva versión se activa y recarga sola; además se
    // busca una versión nueva cada hora por si la pestaña queda abierta.
    registerSW({
      immediate: true,
      onRegisteredSW(_url, reg) {
        if (reg) setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
      },
    });
  }

  // Exponer para depuración en desarrollo
  if (import.meta.env.DEV) Object.assign(window, { __wb: { app, view, cview, store, progress, game } });
}

boot().catch((e) => {
  console.error(e);
  const el = document.getElementById('splash');
  if (el) el.innerHTML = `<p style="padding:24px;color:#fff;font-family:sans-serif">Error: ${String(e?.message ?? e)}</p>`;
});
