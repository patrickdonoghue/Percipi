import { Vector3 } from 'three';
import { TUNING } from '../tuning';
import type { Perceivable } from './tags';

interface Ripple {
  source: Perceivable;
  origin: Vector3;
  t0: number; // when it was emitted
  radius: number; // how far it can travel and still be heard
  reached: boolean; // has it reached him yet?
}

// Hearing: each sound sends out ripples that spread at `rippleSpeed`.
// When a ripple reaches his head (within the sound's radius), he hears
// the source for a short while. Ripples pass through walls.
export class SoundField {
  private ripples: Ripple[] = [];
  private readonly heardUntil = new Map<Perceivable, number>();

  constructor(private readonly items: readonly Perceivable[]) {}

  // A sound object emits one ripple now.
  pulse(source: Perceivable, time: number): void {
    const radius = source.tags.sound?.radius;
    if (radius === undefined) return;
    const origin = source.mesh.getWorldPosition(new Vector3());
    this.ripples.push({ source, origin, t0: time, radius, reached: false });
  }

  update(time: number, ear: Vector3): void {
    const { rippleSpeed, hearHoldSeconds } = TUNING.sound;
    for (const r of this.ripples) {
      const front = (time - r.t0) * rippleSpeed;
      const dist = ear.distanceTo(r.origin);
      if (!r.reached && dist <= r.radius && front >= dist) {
        r.reached = true;
        this.heardUntil.set(r.source, time + hearHoldSeconds);
      }
    }
    // Drop ripples that have spread past their range.
    this.ripples = this.ripples.filter((r) => (time - r.t0) * rippleSpeed <= r.radius);
    for (const p of this.items) p.sensed.sound = (this.heardUntil.get(p) ?? -Infinity) > time;
  }
}
