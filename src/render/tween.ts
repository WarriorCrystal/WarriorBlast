/** Mini motor de tweens basado en el ticker (sin dependencias). */
export type Ease = (t: number) => number;

export const ease = {
  linear: (t: number) => t,
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  inQuad: (t: number) => t * t,
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inCubic: (t: number) => t * t * t,
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  inBack: (t: number) => {
    const c1 = 1.70158;
    return (c1 + 1) * t * t * t - c1 * t * t;
  },
  outElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Target = any;

interface Tween {
  target: Target;
  from: Record<string, number>;
  to: Record<string, number>;
  dur: number;
  delay: number;
  t: number;
  ease: Ease;
  onUpdate?: (k: number) => void;
  onComplete?: () => void;
  started: boolean;
  dead: boolean;
}

function getProp(o: Target, k: string): number {
  if (k === 'scale') return o.scale.x;
  if (k === 'scaleX') return o.scale.x;
  if (k === 'scaleY') return o.scale.y;
  return o[k];
}
function setProp(o: Target, k: string, v: number) {
  if (k === 'scale') o.scale.set(v);
  else if (k === 'scaleX') o.scale.x = v;
  else if (k === 'scaleY') o.scale.y = v;
  else o[k] = v;
}

export class Tweens {
  private list: Tween[] = [];

  to(
    target: Target,
    to: Record<string, number>,
    dur: number,
    opts: { delay?: number; ease?: Ease; onUpdate?: (k: number) => void; onComplete?: () => void; from?: Record<string, number> } = {},
  ): Tween {
    const tw: Tween = {
      target,
      from: opts.from ?? {},
      to,
      dur: Math.max(1, dur),
      delay: opts.delay ?? 0,
      t: 0,
      ease: opts.ease ?? ease.outCubic,
      onUpdate: opts.onUpdate,
      onComplete: opts.onComplete,
      started: false,
      dead: false,
    };
    if (opts.from && target) for (const k of Object.keys(opts.from)) setProp(target, k, opts.from[k]);
    this.list.push(tw);
    return tw;
  }

  /** Llama a fn tras ms milisegundos (en tiempo de juego). */
  delay(ms: number, fn: () => void): Tween {
    return this.to(null, {}, 1, { delay: ms, onComplete: fn });
  }

  wait(ms: number): Promise<void> {
    return new Promise((res) => this.delay(ms, res));
  }

  kill(target: Target) {
    for (const tw of this.list) if (tw.target === target) tw.dead = true;
  }

  clear() {
    this.list = [];
  }

  update(dtMs: number) {
    const list = this.list;
    for (let i = 0; i < list.length; i++) {
      const tw = list[i];
      if (tw.dead) continue;
      if (tw.delay > 0) {
        tw.delay -= dtMs;
        if (tw.delay > 0) continue;
        dtMs = -tw.delay;
        tw.delay = 0;
      }
      if (tw.target && (tw.target.destroyed || (tw.target.scale === null))) {
        tw.dead = true;
        continue;
      }
      if (!tw.started) {
        tw.started = true;
        if (tw.target) for (const k of Object.keys(tw.to)) if (!(k in tw.from)) tw.from[k] = getProp(tw.target, k);
      }
      tw.t += dtMs;
      const k = Math.min(1, tw.t / tw.dur);
      const e = tw.ease(k);
      if (tw.target) for (const key of Object.keys(tw.to)) setProp(tw.target, key, tw.from[key] + (tw.to[key] - tw.from[key]) * e);
      tw.onUpdate?.(e);
      if (k >= 1) {
        tw.dead = true;
        tw.onComplete?.();
      }
    }
    if (list.length > 64) this.list = list.filter((t) => !t.dead);
    else if (list.length && list.every((t) => t.dead)) this.list = [];
  }
}
