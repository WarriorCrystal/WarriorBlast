import { Container, Sprite, type Texture } from 'pixi.js';
import type { SkinParticles } from '../skins/types';

interface P {
  s: Sprite;
  vx: number;
  vy: number;
  vr: number;
  age: number;
  life: number;
  base: number;
  g: number;
  shrink: boolean;
  alive: boolean;
}

/** Pool de partículas: sin reservas de memoria durante el juego (60 fps estables). */
export class Particles {
  readonly layer = new Container();
  private pool: P[] = [];
  private max: number;

  constructor(max = 420) {
    this.max = max;
  }

  private get(): P | null {
    for (const p of this.pool) if (!p.alive) return p;
    if (this.pool.length >= this.max) return null;
    const s = new Sprite();
    s.anchor.set(0.5);
    this.layer.addChild(s);
    const p: P = { s, vx: 0, vy: 0, vr: 0, age: 0, life: 1, base: 1, g: 0, shrink: true, alive: false };
    this.pool.push(p);
    return p;
  }

  /** Emite n partículas en (x,y). `cell` convierte unidades de celda a px. */
  burst(x: number, y: number, n: number, tex: Texture, cfg: SkinParticles, cell: number, power = 1, upBias = 0.6) {
    for (let i = 0; i < n; i++) {
      const p = this.get();
      if (!p) return;
      const a = Math.random() * Math.PI * 2;
      const sp = (cfg.speed[0] + Math.random() * (cfg.speed[1] - cfg.speed[0])) * cell * power;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp - upBias * cell * 2;
      p.vr = cfg.spin ? (Math.random() - 0.5) * 12 : 0;
      p.age = 0;
      p.life = cfg.life[0] + Math.random() * (cfg.life[1] - cfg.life[0]);
      const size = (cfg.size[0] + Math.random() * (cfg.size[1] - cfg.size[0])) * cell;
      p.base = size / 32;
      p.g = cfg.gravity * cell;
      p.shrink = cfg.shrink;
      p.alive = true;
      const s = p.s;
      s.texture = tex;
      s.blendMode = cfg.blend === 'add' ? 'add' : 'normal';
      s.position.set(x + (Math.random() - 0.5) * cell * 0.5, y + (Math.random() - 0.5) * cell * 0.5);
      s.scale.set(p.base);
      s.alpha = 1;
      s.rotation = Math.random() * Math.PI;
      s.visible = true;
    }
  }

  update(dt: number) {
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.alive = false;
        p.s.visible = false;
        continue;
      }
      const k = p.age / p.life;
      p.vy += p.g * dt;
      p.vx *= 1 - 1.8 * dt;
      p.s.x += p.vx * dt;
      p.s.y += p.vy * dt;
      p.s.rotation += p.vr * dt;
      if (p.shrink) p.s.scale.set(p.base * (1 - k * k));
      p.s.alpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
    }
  }

  clear() {
    for (const p of this.pool) {
      p.alive = false;
      p.s.visible = false;
    }
  }
}

/** Partículas ambientales del fondo (flotan y se reciclan). */
export class Ambient {
  readonly layer = new Container();
  private items: Array<{ s: Sprite; vy: number; vx: number; phase: number }> = [];
  private w = 0;
  private h = 0;

  set(tex: Texture | undefined, cfg: { count: number; size: [number, number]; speed: [number, number]; alpha: [number, number]; blend: 'add' | 'normal' } | undefined, w: number, h: number) {
    this.layer.removeChildren().forEach((c) => c.destroy());
    this.items = [];
    this.w = w;
    this.h = h;
    if (!tex || !cfg) return;
    const r = (a: [number, number]) => a[0] + Math.random() * (a[1] - a[0]);
    const count = Math.round(cfg.count * Math.min(1.5, Math.max(0.6, (w * h) / (420 * 860))));
    for (let i = 0; i < count; i++) {
      const s = new Sprite(tex);
      s.anchor.set(0.5);
      s.scale.set(r(cfg.size) / 64);
      s.alpha = r(cfg.alpha);
      s.blendMode = cfg.blend === 'add' ? 'add' : 'normal';
      s.position.set(Math.random() * w, Math.random() * h);
      this.layer.addChild(s);
      this.items.push({ s, vy: r(cfg.speed), vx: (Math.random() - 0.5) * 6, phase: Math.random() * 10 });
    }
  }

  update(dt: number, time: number) {
    for (const it of this.items) {
      it.s.y += it.vy * dt;
      it.s.x += (it.vx + Math.sin(time * 0.6 + it.phase) * 6) * dt;
      const m = 40;
      if (it.s.y < -m) it.s.y = this.h + m;
      if (it.s.y > this.h + m) it.s.y = -m;
      if (it.s.x < -m) it.s.x = this.w + m;
      if (it.s.x > this.w + m) it.s.x = -m;
    }
  }
}
