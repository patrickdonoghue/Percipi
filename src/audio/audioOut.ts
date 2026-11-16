import { Vector3 } from 'three';
import { TUNING } from '../tuning';
import { synthesize, type SoundName } from './synth';

export interface SoundHandle {
  stop(): void;
}

const SILENT: SoundHandle = { stop: () => {} };
const NAMES: SoundName[] = ['alarm', 'bark', 'sizzle', 'voice'];

// File name (in public/audio, without extension) for each sound.
const FILES: Record<SoundName, string> = { alarm: 'alarm', bark: 'bark', sizzle: 'sizzle', voice: 'HeyOverHere' };

interface Loop {
  name: SoundName;
  src: AudioBufferSourceNode;
  gain: GainNode;
}

// Plays sounds from positions in the world, heard from the camera (his head).
// Browsers only allow audio after a tap, so unlock() must run inside the wake tap.
export class AudioOut {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private readonly buffers = new Map<SoundName, AudioBuffer>();
  private readonly playing = new Set<AudioBufferSourceNode>();
  private readonly loops = new Set<Loop>();
  // Start downloading real recordings straight away (while "tap to wake up" shows).
  private readonly downloads = NAMES.map((name) => ({ name, data: AudioOut.download(name) }));

  private static async download(name: SoundName): Promise<ArrayBuffer | null> {
    for (const ext of ['mp3', 'ogg']) {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}audio/${FILES[name]}.${ext}`);
        const type = res.headers.get('content-type') ?? '';
        if (res.ok && !type.includes('text/html')) return await res.arrayBuffer();
      } catch {
        // try the next format
      }
    }
    return null;
  }

  unlock(): void {
    if (this.ctx) return;
    // iPhones: play even when the ringer switch is on silent (Safari 17+).
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if (nav.audioSession) nav.audioSession.type = 'playback';

    const ctx = new AudioContext();
    this.ctx = ctx;
    void ctx.resume();
    this.master = ctx.createGain();
    this.master.gain.value = TUNING.sound.masterVolume;
    this.master.connect(ctx.destination);
    // A silent blip finishes unlocking audio on older iPhones.
    const blip = ctx.createBufferSource();
    blip.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    blip.connect(ctx.destination);
    blip.start();

    for (const name of NAMES) {
      const data = synthesize(name, ctx.sampleRate);
      const buf = ctx.createBuffer(1, data.length, ctx.sampleRate);
      buf.copyToChannel(data, 0);
      this.buffers.set(name, buf);
    }
    void this.loadFiles(ctx);
  }

  // Real recordings replace the placeholders if public/audio/<name>.mp3 or .ogg exists.
  private async loadFiles(ctx: AudioContext): Promise<void> {
    for (const { name, data } of this.downloads) {
      const bytes = await data;
      if (!bytes) continue;
      try {
        const buf = await ctx.decodeAudioData(bytes.slice(0));
        this.buffers.set(name, buf);
        this.swapLoops(name, buf);
      } catch {
        // undecodable: keep the placeholder
      }
    }
  }

  // A loop that started on the placeholder switches to the real recording.
  private swapLoops(name: SoundName, buf: AudioBuffer): void {
    const ctx = this.ctx;
    if (!ctx) return;
    for (const loop of this.loops) {
      if (loop.name !== name) continue;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(loop.gain);
      src.start();
      this.track(src);
      try {
        loop.src.stop();
      } catch {
        // already stopped
      }
      loop.src = src;
    }
  }

  private track(src: AudioBufferSourceNode): void {
    this.playing.add(src);
    src.onended = () => this.playing.delete(src);
  }

  setListener(position: Vector3, forward: Vector3): void {
    const l = this.ctx?.listener;
    if (!l) return;
    if (l.positionX) {
      l.positionX.value = position.x;
      l.positionY.value = position.y;
      l.positionZ.value = position.z;
      l.forwardX.value = forward.x;
      l.forwardY.value = forward.y;
      l.forwardZ.value = forward.z;
      l.upX.value = 0;
      l.upY.value = 1;
      l.upZ.value = 0;
    } else {
      l.setPosition(position.x, position.y, position.z);
      l.setOrientation(forward.x, forward.y, forward.z, 0, 1, 0);
    }
  }

  // Length of a sound in seconds (0 if not loaded).
  duration(name: SoundName): number {
    return this.buffers.get(name)?.duration ?? 0;
  }

  play(
    name: SoundName,
    at: Vector3,
    opts: { loop?: boolean; volume: number; radius: number; offset?: number },
  ): SoundHandle {
    const ctx = this.ctx;
    const buf = this.buffers.get(name);
    if (!ctx || !this.master || !buf) return SILENT;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = opts.loop ?? false;
    const gain = ctx.createGain();
    gain.gain.value = opts.volume;
    const pan = new PannerNode(ctx, {
      panningModel: 'HRTF',
      distanceModel: 'inverse',
      refDistance: TUNING.sound.refDistance,
      rolloffFactor: TUNING.sound.rolloff,
      maxDistance: opts.radius,
      positionX: at.x,
      positionY: at.y,
      positionZ: at.z,
    });
    src.connect(gain).connect(pan).connect(this.master);
    src.start(0, (opts.offset ?? 0) % buf.duration);
    this.track(src);
    const loop: Loop | null = src.loop ? { name, src, gain } : null;
    if (loop) this.loops.add(loop);
    return {
      stop: () => {
        if (loop) this.loops.delete(loop);
        try {
          (loop?.src ?? src).stop();
        } catch {
          // already stopped
        }
      },
    };
  }

  stopAll(): void {
    for (const src of [...this.playing]) {
      try {
        src.stop();
      } catch {
        // already stopped
      }
    }
    this.playing.clear();
    this.loops.clear();
  }
}
