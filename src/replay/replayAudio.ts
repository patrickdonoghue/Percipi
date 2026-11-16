import { Vector3 } from 'three';
import type { AudioOut, SoundHandle } from '../audio/audioOut';
import type { Perceivable } from '../perception/tags';
import { playSettings } from '../world/sounds';
import type { SoundEvent } from './recorder';

const JUMP_SECONDS = 0.25; // a bigger time step than this counts as a scrub

// Plays the recorded sounds again in the replay, heard from his head.
// Pausing silences; scrubbing restarts whatever should be sounding at that moment.
export class ReplayAudio {
  private readonly loops = new Map<number, SoundHandle>(); // by sound-object index
  private oneShots: SoundHandle[] = [];
  private lastTime: number | null = null;
  private wasPlaying = false;
  private readonly sounding: SoundEvent[]; // start/stop events only

  constructor(
    private readonly audio: AudioOut,
    events: readonly SoundEvent[],
    private readonly items: readonly Perceivable[],
  ) {
    this.sounding = events.filter((e) => e.action !== 'pulse');
  }

  update(time: number, playing: boolean, ear: Vector3, forward: Vector3): void {
    this.audio.setListener(ear, forward);
    if (!playing) {
      if (this.wasPlaying) this.silence();
      this.wasPlaying = false;
      this.lastTime = time;
      return;
    }
    const last = this.lastTime;
    if (!this.wasPlaying || last === null || time < last || time - last > JUMP_SECONDS) {
      this.silence();
      this.resumeAt(time);
    } else {
      for (const e of this.sounding) if (e.t > last && e.t <= time) this.apply(e, time - e.t);
    }
    this.wasPlaying = true;
    this.lastTime = time;
  }

  silence(): void {
    for (const h of this.loops.values()) h.stop();
    this.loops.clear();
    for (const h of this.oneShots) h.stop();
    this.oneShots = [];
  }

  // Start everything that should be audible at time t (part-way through if needed).
  private resumeAt(t: number): void {
    const loopStart = new Map<number, SoundEvent>();
    for (const e of this.sounding) {
      if (e.t > t) break;
      const settings = playSettings(e.sound);
      if (settings.loop) {
        if (e.action === 'start') loopStart.set(e.item, e);
        else loopStart.delete(e.item);
      } else if (e.action === 'start' && t - e.t < this.audio.duration(e.sound)) {
        this.apply(e, t - e.t);
      }
    }
    for (const e of loopStart.values()) this.apply(e, t - e.t);
  }

  private apply(e: SoundEvent, offset: number): void {
    const source = this.items[e.item];
    if (!source) return;
    const settings = playSettings(e.sound);
    if (e.action === 'start') {
      const at = source.mesh.getWorldPosition(new Vector3());
      const handle = this.audio.play(e.sound, at, { ...settings, offset });
      if (settings.loop) this.loops.set(e.item, handle);
      else this.oneShots.push(handle);
    } else if (e.action === 'stop') {
      this.loops.get(e.item)?.stop();
      this.loops.delete(e.item);
    }
  }
}
