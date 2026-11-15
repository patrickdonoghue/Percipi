import { Vector3 } from 'three';
import { TUNING } from '../tuning';
import { synthesize, type SoundName } from './synth';

export interface SoundHandle {
  stop(): void;
}

const SILENT: SoundHandle = { stop: () => {} };
const NAMES: SoundName[] = ['alarm', 'bark'];

// Plays sounds from positions in the world, heard from the camera (his head).
// Browsers only allow audio after a tap, so unlock() must run inside the wake tap.
export class AudioOut {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private readonly buffers = new Map<SoundName, AudioBuffer>();
  private readonly playing = new Set<AudioBufferSourceNode>();

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
    for (const name of NAMES) {
      for (const ext of ['mp3', 'ogg']) {
        try {
          const res = await fetch(`${import.meta.env.BASE_URL}audio/${name}.${ext}`);
          if (!res.ok) continue;
          this.buffers.set(name, await ctx.decodeAudioData(await res.arrayBuffer()));
          break;
        } catch {
          // missing or undecodable: keep the placeholder
        }
      }
    }
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

  play(name: SoundName, at: Vector3, opts: { loop?: boolean; volume: number; radius: number }): SoundHandle {
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
    src.start();
    this.playing.add(src);
    src.onended = () => this.playing.delete(src);
    return {
      stop: () => {
        try {
          src.stop();
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
  }
}
