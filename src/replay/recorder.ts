import type { Perceivable } from '../perception/tags';
import type { Door } from '../world/door';

// One recorded moment of the walk.
export interface Frame {
  t: number; // seconds since waking
  x: number;
  z: number;
  yaw: number;
  pitch: number;
  doors: Float32Array; // how open each door was (0..1)
  sensed: Uint8Array; // one bit per perceivable object: was it sensed?
}

export function isSensed(frame: Frame, index: number): boolean {
  return ((frame.sensed[index >> 3] ?? 0) & (1 << (index & 7))) !== 0;
}

// Logs every POV frame: where he was, where he looked, and what he sensed.
export class Recorder {
  readonly frames: Frame[] = [];
  private time = 0;

  get duration(): number {
    return this.time;
  }

  capture(
    dt: number,
    pose: { x: number; z: number; yaw: number; pitch: number },
    doors: readonly Door[],
    items: readonly Perceivable[],
  ): void {
    this.time += dt;
    const sensed = new Uint8Array(Math.ceil(items.length / 8));
    items.forEach((p, i) => {
      if (p.present) sensed[i >> 3]! |= 1 << (i & 7);
    });
    this.frames.push({
      t: this.time,
      x: pose.x,
      z: pose.z,
      yaw: pose.yaw,
      pitch: pose.pitch,
      doors: Float32Array.from(doors, (d) => d.openFraction),
      sensed,
    });
  }
}
