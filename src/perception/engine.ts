import { Vector3 } from 'three';
import { DEG, TUNING } from '../tuning';
import { SightSystem } from './sight';
import type { Perceivable } from './tags';

// The one system that decides, each frame, what exists.
// Rendering only reads `present` / `sensed` from the items.
export class PerceptionEngine {
  private readonly sight: SightSystem;
  private readonly cosHalfAngle = Math.cos(TUNING.sight.coneHalfAngleDeg * DEG);

  constructor(private readonly items: readonly Perceivable[]) {
    this.sight = new SightSystem(items);
  }

  update(eye: Vector3, forward: Vector3): void {
    this.sight.update(eye, forward, this.cosHalfAngle);
    for (const p of this.items) {
      // Never accumulate: an object exists only while it is sensed.
      p.present = p.sensed.sight;
    }
  }
}
