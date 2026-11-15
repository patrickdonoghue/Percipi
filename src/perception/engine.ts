import { Vector3 } from 'three';
import { DEG, TUNING } from '../tuning';
import { SightSystem } from './sight';
import type { SoundField } from './sound';
import type { Perceivable } from './tags';

// The one system that decides, each frame, what is sensed (and so what exists).
// Rendering only reads `present` / `sensed` from the items.
export class PerceptionEngine {
  private readonly sight: SightSystem;
  private readonly cosHalfAngle = Math.cos(TUNING.sight.coneHalfAngleDeg * DEG);

  constructor(
    private readonly items: readonly Perceivable[],
    private readonly sound: SoundField,
  ) {
    this.sight = new SightSystem(items);
  }

  update(eye: Vector3, forward: Vector3, time: number): void {
    this.sight.update(eye, forward, this.cosHalfAngle);
    this.sound.update(time, eye);
    for (const p of this.items) {
      // Never accumulate: an object exists only while it is sensed.
      p.present = p.sensed.sight;
    }
  }
}
