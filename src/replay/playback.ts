import type { Perceivable } from '../perception/tags';
import { TUNING } from '../tuning';
import type { Door } from '../world/door';
import { bit, type Frame } from './recorder';

// Steps through the recording. It only reads recorded frames: the replay
// never runs the perception engine itself.
export class Playback {
  time = 0;
  playing = false;

  constructor(
    private readonly frames: readonly Frame[],
    private readonly items: readonly Perceivable[],
    private readonly doors: readonly Door[],
  ) {}

  get duration(): number {
    return this.frames.length > 0 ? this.frames[this.frames.length - 1]!.t : 0;
  }

  get ended(): boolean {
    return this.time >= this.duration;
  }

  seek(t: number): void {
    this.time = Math.max(0, Math.min(this.duration, t));
  }

  togglePlay(): void {
    if (this.ended) this.time = 0;
    this.playing = !this.playing;
  }

  advance(dt: number): void {
    if (!this.playing) return;
    this.seek(this.time + dt * TUNING.replay.playbackSpeed);
    if (this.ended) this.playing = false;
  }

  // The latest frame at or before the current time.
  currentFrame(): Frame | undefined {
    return this.frameAt(this.time);
  }

  // The latest frame at or before time `t`.
  frameAt(t: number): Frame | undefined {
    const f = this.frames;
    if (f.length === 0) return undefined;
    let lo = 0;
    let hi = f.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (f[mid]!.t <= t) lo = mid;
      else hi = mid - 1;
    }
    return f[lo];
  }

  // Put the world into the recorded state: what existed, and door positions.
  apply(frame: Frame): void {
    this.items.forEach((p, i) => {
      p.present = bit(frame.seen, i);
      p.sensed.sight = p.present;
      p.sensed.sound = bit(frame.heard, i);
      p.sensed.smell = bit(frame.smelled, i);
    });
    this.applyDoors(frame);
  }

  applyDoors(frame: Frame): void {
    this.doors.forEach((d, i) => d.setOpenFraction(frame.doors[i] ?? d.openFraction));
  }
}
