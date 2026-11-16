import { TUNING } from '../tuning';
import type { SoundName } from '../audio/synth';
import type { Perceivable } from '../perception/tags';
import type { Door } from '../world/door';

// One recorded moment of the walk.
export interface Frame {
  t: number; // seconds since waking
  x: number;
  z: number;
  yaw: number;
  pitch: number;
  eyesOpen: boolean;
  doors: Float32Array; // how open each door was (0..1)
  seen: Uint8Array; // one bit per perceivable object: was it seen?
  heard: Uint8Array; // one bit per perceivable object: was it heard?
  smelled: Uint8Array; // one bit per perceivable object: was it smelled?
}

// Where the smell puffs were (taken a few times a second): per puff x, y, z, age (age < 0 = none).
export interface PlumeSnapshot {
  t: number;
  puffs: Float32Array;
}

// A sound starting, stopping, or sending out a ripple.
export interface SoundEvent {
  t: number;
  item: number; // index of the sound-making object in world.items
  sound: SoundName;
  action: 'start' | 'stop' | 'pulse';
}

export function bit(bits: Uint8Array, index: number): boolean {
  return ((bits[index >> 3] ?? 0) & (1 << (index & 7))) !== 0;
}

function pack(items: readonly Perceivable[], test: (p: Perceivable) => boolean): Uint8Array {
  const bits = new Uint8Array(Math.ceil(items.length / 8));
  items.forEach((p, i) => {
    if (test(p)) bits[i >> 3]! |= 1 << (i & 7);
  });
  return bits;
}

// Logs every POV frame (where he was, where he looked, what he saw and heard)
// plus every sound event.
export class Recorder {
  readonly frames: Frame[] = [];
  readonly events: SoundEvent[] = [];
  readonly plume: PlumeSnapshot[] = [];

  get duration(): number {
    return this.frames.length > 0 ? this.frames[this.frames.length - 1]!.t : 0;
  }

  capture(
    t: number,
    pose: { x: number; z: number; yaw: number; pitch: number },
    eyesOpen: boolean,
    doors: readonly Door[],
    items: readonly Perceivable[],
  ): void {
    this.frames.push({
      t,
      x: pose.x,
      z: pose.z,
      yaw: pose.yaw,
      pitch: pose.pitch,
      eyesOpen,
      doors: Float32Array.from(doors, (d) => d.openFraction),
      seen: pack(items, (p) => p.present),
      heard: pack(items, (p) => p.sensed.sound),
      smelled: pack(items, (p) => p.sensed.smell),
    });
  }

  capturePlume(t: number, puffs: readonly { alive: boolean; x: number; y: number; z: number; age: number }[]): void {
    const last = this.plume[this.plume.length - 1];
    if (last && t - last.t < 1 / TUNING.smell.recordHz) return;
    const data = new Float32Array(puffs.length * 4);
    puffs.forEach((p, i) => data.set([p.x, p.y, p.z, p.alive ? p.age : -1], i * 4));
    this.plume.push({ t, puffs: data });
  }

  logEvent(e: SoundEvent): void {
    this.events.push(e);
  }
}
