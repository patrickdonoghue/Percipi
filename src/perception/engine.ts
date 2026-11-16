import { Vector3 } from 'three';
import { DEG, TUNING } from '../tuning';
import { SightSystem } from './sight';
import type { SmellField } from './smell';
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
    private readonly smell: SmellField,
  ) {
    this.sight = new SightSystem(items);
  }

  private readonly nose = new Vector3();

  update(eye: Vector3, forward: Vector3, time: number, dt: number, eyesOpen: boolean): void {
    if (eyesOpen) this.sight.update(eye, forward, this.cosHalfAngle);
    else for (const p of this.items) p.sensed.sight = false; // eyes closed: nothing is seen
    this.sound.update(time, eye);
    this.nose.copy(eye).y -= 0.1;
    this.smell.update(dt, time, this.nose);
    for (const p of this.items) {
      // Never accumulate: an object exists only while it is sensed.
      p.present = p.sensed.sight;
    }
  }
}
