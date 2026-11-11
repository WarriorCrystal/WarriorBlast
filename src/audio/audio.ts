import type { SkinSound } from '../skins/types';

/**
 * Todo el audio se sintetiza en tiempo real con Web Audio: no hay archivos de sonido,
 * así que funciona offline y cada skin define su propia ambientación (timbres, escala, música).
 *
 * iOS/Safari: el AudioContext solo puede arrancar dentro de un gesto del usuario,
 * por eso `unlock()` se llama en el primer toque (ver main.ts).
 */
export type SfxName =
  | 'pick'
  | 'place'
  | 'drop'
  | 'clear'
  | 'combo'
  | 'praise'
  | 'gameover'
  | 'win'
  | 'click'
  | 'coin'
  | 'tick'
  | 'gem'
  | 'unlock'
  | 'refresh';

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private reverbIn!: GainNode;
  private echoIn!: GainNode;
  private echoFb!: GainNode;
  private echoDelay!: DelayNode;
  private noise!: AudioBuffer;
  private sound!: SkinSound;
  private musicOn = true;
  private sfxOn = true;
  private music: { timer: number; next: number; step: number; bar: number; lastLead: number; tempo: number } | null = null;
  private wantMusic = false;
  private tempoFactor = 1;
  private lastPlay: Record<string, number> = {};

  setSkin(sound: SkinSound) {
    const changed = this.sound && this.sound !== sound;
    this.sound = sound;
    if (this.ctx && this.reverbIn) this.applyFx();
    if (changed && this.music) {
      this.stopMusic();
      this.startMusic(this.tempoFactor);
    }
  }

  setEnabled(music: boolean, sfx: boolean) {
    this.sfxOn = sfx;
    if (this.musicOn !== music) {
      this.musicOn = music;
      if (!music) this.stopMusic(true);
      else if (this.wantMusic) this.startMusic(this.tempoFactor);
    }
  }

  /** Crear/reanudar el contexto dentro de un gesto del usuario (requisito de iOS). */
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC({ latencyHint: 'interactive' });
        this.build();
      }
      if (this.ctx.state !== 'running') void this.ctx.resume();
      // buffer silencioso: desbloquea la salida en iOS antiguos
      const b = this.ctx.createBuffer(1, 1, 22050);
      const src = this.ctx.createBufferSource();
      src.buffer = b;
      src.connect(this.ctx.destination);
      src.start(0);
      if (this.wantMusic && this.musicOn && !this.music) this.startMusic(this.tempoFactor);
    } catch (e) {
      console.warn('[audio] no disponible', e);
    }
  }

  suspend() {
    void this.ctx?.suspend();
  }

  resume() {
    if (this.ctx && this.ctx.state !== 'running') void this.ctx.resume();
  }

  private build() {
    const ctx = this.ctx!;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.8;
    this.sfxBus.connect(this.master);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0;
    this.musicBus.connect(this.master);

    // reverb con impulso generado
    const conv = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 2.2);
    const imp = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = imp.getChannelData(ch);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    conv.buffer = imp;
    this.reverbIn = ctx.createGain();
    this.reverbIn.connect(conv).connect(this.master);

    // eco
    this.echoIn = ctx.createGain();
    this.echoDelay = ctx.createDelay(1.5);
    this.echoFb = ctx.createGain();
    const echoLp = ctx.createBiquadFilter();
    echoLp.type = 'lowpass';
    echoLp.frequency.value = 2500;
    this.echoIn.connect(this.echoDelay);
    this.echoDelay.connect(echoLp).connect(this.echoFb).connect(this.echoDelay);
    echoLp.connect(this.master);
    echoLp.connect(this.reverbIn);

    // ruido blanco reutilizable
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.applyFx();
  }

  private applyFx() {
    if (!this.sound) return;
    const m = this.sound.music;
    this.reverbIn.gain.value = 0.15 + m.reverb * 0.5;
    this.echoFb.gain.value = 0.15 + m.echo * 0.4;
    this.echoDelay.delayTime.value = (60 / m.bpm) * 0.75;
  }

  private note(deg: number, oct = 0): number {
    const sc = this.sound.scale;
    const o = Math.floor(deg / sc.length);
    const d = ((deg % sc.length) + sc.length) % sc.length;
    return this.sound.root + sc[d] + 12 * (o + oct);
  }

  /** Oscilador con envolvente. */
  private tone(
    freq: number,
    t: number,
    dur: number,
    wave: OscillatorType,
    gain: number,
    dest: AudioNode,
    opts: { attack?: number; slideTo?: number; filter?: number; send?: number; echo?: number; detune?: number } = {},
  ) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = wave;
    o.frequency.setValueAtTime(freq, t);
    if (opts.slideTo) o.frequency.exponentialRampToValueAtTime(opts.slideTo, t + dur);
    if (opts.detune) o.detune.value = opts.detune;
    const g = ctx.createGain();
    const a = opts.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dur);
    let node: AudioNode = o;
    if (opts.filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.filter;
      o.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(dest);
    if (opts.send) {
      const s = ctx.createGain();
      s.gain.value = opts.send;
      g.connect(s).connect(this.reverbIn);
    }
    if (opts.echo) {
      const s = ctx.createGain();
      s.gain.value = opts.echo;
      g.connect(s).connect(this.echoIn);
    }
    o.start(t);
    o.stop(t + a + dur + 0.05);
  }

  private noiseHit(t: number, dur: number, gain: number, type: BiquadFilterType, freq: number, dest: AudioNode, sweepTo?: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    f.Q.value = type === 'bandpass' ? 1.2 : 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  play(name: SfxName, p: { lines?: number; combo?: number; level?: number } = {}) {
    const ctx = this.ctx;
    if (!ctx || !this.sfxOn || ctx.state !== 'running' || !this.sound) return;
    // anti-spam para sonidos repetitivos
    const now = ctx.currentTime;
    if (now - (this.lastPlay[name] ?? 0) < 0.025) return;
    this.lastPlay[name] = now;
    const t = now + 0.005;
    const S = this.sound;
    const bus = this.sfxBus;
    switch (name) {
      case 'click':
        this.tone(mtof(this.note(4, 1)), t, 0.05, S.blip, 0.12, bus, { filter: 3000 });
        break;
      case 'pick':
        this.tone(mtof(this.note(2, 1)), t, 0.06, S.blip, 0.1, bus, { slideTo: mtof(this.note(4, 1)), filter: 3500 });
        break;
      case 'drop':
        this.tone(mtof(this.note(2, 0)), t, 0.1, S.blip, 0.09, bus, { slideTo: mtof(this.note(-1, 0)), filter: 2000 });
        break;
      case 'place': {
        if (S.thump > 0) this.tone(150, t, 0.14, 'sine', 0.45 * S.thump, bus, { slideTo: 55 });
        this.noiseHit(t, 0.05, 0.12, 'bandpass', 2400, bus);
        this.tone(mtof(this.note(0, 1)), t, 0.09, S.blip, 0.08, bus, { filter: 2500 });
        break;
      }
      case 'clear': {
        const lines = Math.max(1, p.lines ?? 1);
        const combo = Math.max(1, p.combo ?? 1);
        const base = Math.min(combo - 1, 9);
        const n = 3 + Math.min(lines, 4);
        for (let i = 0; i < n; i++) {
          const tt = t + i * 0.045;
          const f = mtof(this.note(base + i * 2, 1));
          this.tone(f, tt, 0.22, S.sparkle, 0.07, bus, { filter: 5000, send: 0.4, echo: 0.2 });
          this.tone(f * 2, tt, 0.12, 'sine', 0.035, bus, { send: 0.3 });
        }
        this.noiseHit(t, 0.35 + lines * 0.05, 0.14, 'bandpass', 600, bus, 7000);
        this.tone(90, t, 0.25, 'sine', 0.35 * S.thump, bus, { slideTo: 45 });
        break;
      }
      case 'combo': {
        const c = Math.min(p.combo ?? 2, 12);
        const f0 = mtof(this.note(c, 1));
        this.tone(f0 * 0.5, t, 0.35, S.sparkle, 0.06, bus, { slideTo: f0 * 2, filter: 4000, send: 0.5 });
        [0, 2, 4].forEach((d, i) => this.tone(mtof(this.note(c + d, 2)), t + 0.08 + i * 0.06, 0.25, 'triangle', 0.05, bus, { send: 0.5, echo: 0.3 }));
        break;
      }
      case 'praise': {
        const lv = p.level ?? 1;
        [0, 2, 4, 7].forEach((d) => this.tone(mtof(this.note(lv + d, 1)), t, 0.6, S.sparkle, 0.045, bus, { attack: 0.01, filter: 3500, send: 0.7, detune: (Math.random() - 0.5) * 12 }));
        this.noiseHit(t, 0.6, 0.06, 'highpass', 6000, bus);
        break;
      }
      case 'gem':
        this.tone(mtof(this.note(7, 2)), t, 0.25, 'sine', 0.08, bus, { send: 0.6, echo: 0.3 });
        this.tone(mtof(this.note(11, 2)), t + 0.06, 0.3, 'sine', 0.06, bus, { send: 0.6 });
        break;
      case 'coin':
        this.tone(mtof(83), t, 0.07, 'square', 0.05, bus, { filter: 5000 });
        this.tone(mtof(88), t + 0.07, 0.2, 'square', 0.05, bus, { filter: 5000, send: 0.3 });
        break;
      case 'tick':
        this.tone(mtof(this.note(7, 1)), t, 0.04, 'square', 0.05, bus, { filter: 2500 });
        break;
      case 'refresh':
        [4, 2, 0].forEach((d, i) => this.tone(mtof(this.note(d, 1)), t + i * 0.05, 0.12, S.blip, 0.07, bus));
        break;
      case 'unlock':
      case 'win':
        [0, 2, 4, 7, 9, 11, 14].forEach((d, i) =>
          this.tone(mtof(this.note(d, 1)), t + i * 0.085, 0.35, S.sparkle, 0.06, bus, { filter: 4500, send: 0.6, echo: 0.25 }),
        );
        break;
      case 'gameover':
        [7, 4, 2, 0, -3].forEach((d, i) => this.tone(mtof(this.note(d, 0)), t + i * 0.16, 0.45, S.blip, 0.08, bus, { filter: 1600, send: 0.5 }));
        this.tone(110, t, 1.2, 'sine', 0.2, bus, { slideTo: 40 });
        break;
    }
  }

  /* ---------------- música generativa ---------------- */

  startMusic(tempoFactor = 1) {
    this.wantMusic = true;
    this.tempoFactor = tempoFactor;
    const ctx = this.ctx;
    if (!ctx || !this.musicOn || this.music || !this.sound) return;
    this.musicBus.gain.cancelScheduledValues(ctx.currentTime);
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, ctx.currentTime);
    this.musicBus.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 2);
    this.music = { timer: 0, next: ctx.currentTime + 0.1, step: 0, bar: 0, lastLead: 7, tempo: tempoFactor };
    this.music.timer = window.setInterval(() => this.schedule(), 60);
  }

  stopMusic(hard = false) {
    if (hard) this.wantMusic = false;
    if (!this.music) return;
    clearInterval(this.music.timer);
    this.music = null;
    const ctx = this.ctx;
    if (ctx) {
      this.musicBus.gain.cancelScheduledValues(ctx.currentTime);
      this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, ctx.currentTime);
      this.musicBus.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
    }
  }

  /** Atenúa la música (p. ej. en pausa o game over). */
  duck(on: boolean) {
    const ctx = this.ctx;
    if (!ctx || !this.music) return;
    this.musicBus.gain.cancelScheduledValues(ctx.currentTime);
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, ctx.currentTime);
    this.musicBus.gain.linearRampToValueAtTime(on ? 0.3 : 0.85, ctx.currentTime + 0.5);
  }

  private schedule() {
    const ctx = this.ctx;
    const m = this.music;
    if (!ctx || !m || ctx.state !== 'running') return;
    const M = this.sound.music;
    const stepDur = 60 / (M.bpm * m.tempo) / 2; // corcheas
    // si la pestaña estuvo dormida, no intentes recuperar todo el retraso
    if (m.next < ctx.currentTime - 0.5) m.next = ctx.currentTime + 0.05;
    while (m.next < ctx.currentTime + 0.25) {
      this.playStep(m.step, m.bar, m.next, stepDur);
      m.next += stepDur;
      m.step++;
      if (m.step >= 8) {
        m.step = 0;
        m.bar++;
      }
    }
  }

  private playStep(step: number, bar: number, t: number, stepDur: number) {
    const M = this.sound.music;
    const bus = this.musicBus;
    const deg = M.progression[bar % M.progression.length];
    const barDur = stepDur * 8;
    if (step === 0) {
      // pad: tríada del grado actual
      for (const d of [0, 2, 4]) {
        this.tone(mtof(this.note(deg + d, 0)), t, barDur * 0.9, M.pad, M.padGain, bus, {
          attack: barDur * 0.25,
          filter: M.filter,
          send: M.reverb,
          detune: (Math.random() - 0.5) * 10,
        });
      }
    }
    if (step === 0 || step === 4 || (step === 6 && bar % 2 === 1)) {
      this.tone(mtof(this.note(deg, -2)), t, stepDur * 1.6, M.bass, M.bassGain, bus, { filter: 600, attack: 0.01 });
    }
    if (M.hats && (step % 2 === 1 || (bar % 4 === 3 && step > 4))) {
      this.noiseHit(t, 0.04, 0.035, 'highpass', 8000, bus);
    }
    if (Math.random() < M.leadDensity && bar % 8 !== 7) {
      const m = this.music!;
      // paseo aleatorio por la escala, tirando hacia notas del acorde
      let next = m.lastLead + Math.round((Math.random() - 0.5) * 4);
      if (Math.random() < 0.4) next = deg + [0, 2, 4][Math.floor(Math.random() * 3)] + 7;
      next = Math.max(3, Math.min(16, next));
      m.lastLead = next;
      this.tone(mtof(this.note(next, 0)), t, stepDur * (Math.random() < 0.3 ? 2.5 : 1.2), M.lead, M.leadGain, bus, {
        filter: M.filter * 2.5,
        send: M.reverb * 0.8,
        echo: M.echo,
      });
    }
  }
}

export const audio = new AudioEngine();

/** Vibración háptica (Android; iOS Safari no la soporta). */
export const haptics = {
  enabled: true,
  get supported() {
    return typeof navigator !== 'undefined' && 'vibrate' in navigator;
  },
  vibrate(pattern: number | number[]) {
    if (!this.enabled || !this.supported) return;
    // Chrome bloquea vibrate() hasta el primer toque real
    const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
    if (ua && !ua.hasBeenActive) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignorado */
    }
  },
};
