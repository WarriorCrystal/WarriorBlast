/* Utilidades DOM mínimas + iconos SVG dibujados para el juego. */

type Child = Node | string | number | null | undefined | false | Child[];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Props = Record<string, any>;

/** h('div.card.big', {onclick}, hijos...) */
export function h(sel: string, props?: Props | Child, ...children: Child[]): HTMLElement {
  const [tag, ...classes] = sel.split('.');
  const el = document.createElement(tag || 'div');
  if (classes.length) el.className = classes.join(' ');
  if (props && (typeof props !== 'object' || props instanceof Node || Array.isArray(props))) {
    children.unshift(props as Child);
    props = undefined;
  }
  if (props) {
    for (const [k, v] of Object.entries(props as Props)) {
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className += ' ' + v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  append(el, children);
  return el;
}

function append(el: HTMLElement, children: Child[]) {
  for (const c of children) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

const P: Record<string, string> = {
  pause: '<rect x="6" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" stroke="none"/>',
  play: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/><circle cx="12" cy="12" r="6.6"/>',
  star: '<path d="M12 2.6l2.85 6.1 6.65.75-4.95 4.5 1.4 6.55L12 17.2l-5.95 3.3 1.4-6.55-4.95-4.5 6.65-.75z" fill="currentColor" stroke="none"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  trophy: '<path d="M8 21h8M12 16.5V21M7 3.5h10v5.5a5 5 0 0 1-10 0z"/><path d="M17 5.5h3v1.5a3.5 3.5 0 0 1-3.5 3.5M7 5.5H4v1.5a3.5 3.5 0 0 0 3.5 3.5"/>',
  chart: '<path d="M5 20V11M11 20V5M17 20v-6M3 20.5h18"/>',
  bag: '<path d="M5.5 8h13l-1.2 12.5H6.7z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9.5 2.5h5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><rect x="7" y="13" width="3" height="3" rx=".6" fill="currentColor" stroke="none"/>',
  leaf: '<path d="M5 19c0-8.5 6-14 15-14 0 9.5-6 15-14 15z"/><path d="M5 19l7.5-7.5"/>',
  map: '<path d="M9 4.5L3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2z"/><path d="M9 4.5v13M15 6.5v13"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.6" fill="currentColor" stroke="none"/><rect x="13" y="4" width="7" height="7" rx="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6" fill="currentColor" stroke="none"/>',
  restart: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 3.5v4.5H9"/>',
  home: '<path d="M3.5 11L12 3.5l8.5 7.5"/><path d="M6 9.5V20h12V9.5"/>',
  music: '<path d="M9 18V5.5l11-2v12.5"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  volume: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  vibrate: '<rect x="8" y="3.5" width="8" height="17" rx="2"/><path d="M4.5 8.5v7M19.5 8.5v7"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.5 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.5-3.5-8.5s1-5.9 3.5-8.5z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  gem: '<path d="M7 4h10l4 5-9 11L3 9z" fill="currentColor" fill-opacity=".25"/><path d="M3 9h18M9 4l3 16 3-16"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  lines: '<rect x="3.5" y="5" width="17" height="4" rx="1"/><rect x="3.5" y="10.5" width="17" height="4" rx="1" fill="currentColor" stroke="none"/><rect x="3.5" y="16" width="17" height="4" rx="1"/>',
  combo: '<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z" fill="currentColor" fill-opacity=".25"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  bolt: '<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z"/>',
  cascade: '<rect x="9.5" y="3" width="5" height="5" rx="1" fill="currentColor" stroke="none"/><rect x="4" y="15" width="5" height="5" rx="1"/><rect x="9.5" y="15" width="5" height="5" rx="1"/><rect x="15" y="15" width="5" height="5" rx="1"/><rect x="15" y="9.5" width="5" height="5" rx="1"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  down: '<path d="M5 9l7 7 7-7"/>',
  drop: '<path d="M5 5l7 7 7-7M5 11.5l7 7 7-7"/><path d="M4 21h16"/>',
  rotate: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 3.5v4.5H15"/>',
  swords: '<path d="M4 4l9.5 9.5M4 4v3.5M4 4h3.5M20 4l-9.5 9.5M20 4v3.5M20 4h-3.5"/><path d="M11 15.5l-4.5 4.5M5 14l5 5M13 15.5l4.5 4.5M19 14l-5 5"/>',
  shield: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z"/>',
  hold: '<rect x="4.5" y="4.5" width="15" height="15" rx="2.5" stroke-dasharray="3 2.4"/><rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" stroke="none"/>',
};

export function icon(name: keyof typeof P | string, cls = ''): HTMLElement {
  const span = document.createElement('span');
  span.className = 'ico ' + cls;
  span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] ?? ''}</svg>`;
  return span;
}

/** Moneda dibujada (no emoji, para que se vea igual en todos los móviles). */
export function coinIcon(cls = ''): HTMLElement {
  const span = document.createElement('span');
  span.className = 'coin ' + cls;
  span.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><defs><radialGradient id="cg" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fff6b0"/><stop offset=".45" stop-color="#ffd23f"/><stop offset="1" stop-color="#d98a00"/></radialGradient></defs><circle cx="12" cy="12" r="10" fill="url(#cg)" stroke="#a86500" stroke-width="1.2"/><circle cx="12" cy="12" r="6.6" fill="none" stroke="#b77400" stroke-width="1.1" opacity=".7"/><path d="M8.2 9l1.4 6 2.4-4 2.4 4 1.4-6" fill="none" stroke="#8a5200" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  return span;
}

export function clearEl(el: HTMLElement) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/** Anima un número en un elemento. */
export function countUp(el: HTMLElement, from: number, to: number, ms: number, format: (n: number) => string) {
  const t0 = performance.now();
  const step = (now: number) => {
    const k = Math.min(1, (now - t0) / ms);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = format(from + (to - from) * e);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  // respaldo: si la pestaña está en segundo plano rAF se pausa
  setTimeout(() => (el.textContent = format(to)), ms + 60);
}
