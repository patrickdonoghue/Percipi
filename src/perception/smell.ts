import { Box3, Vector3 } from 'three';
import { TUNING } from '../tuning';
import { SmellFlow, type Rect2 } from './smellFlow';
import type { Perceivable } from './tags';

interface Puff {
  alive: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  age: number;
}

type WallRect = Rect2;

// Smell: each smelly object gives off puffs that drift outwards along open
// paths (see SmellFlow), swirl a little, spread out and fade. Puffs bounce off walls (so smell moves
// through doorways and out of windows). When a strong-enough puff reaches his
// nose, he smells the source, and the smell lingers for a while.
export class SmellField {
  readonly puffs: Puff[];
  private readonly sources: Perceivable[];
  private readonly fragments = new Map<Perceivable, Perceivable[]>(); // source -> objects that flicker with it
  private readonly walls: WallRect[];
  private next = 0;
  private emitTimer = 0;
  private stepTimer = 0;
  private smelledUntil = -Infinity;
  private readonly flow: SmellFlow;
  private readonly dir = { x: 0, z: 0 };

  constructor(
    private readonly items: readonly Perceivable[],
    bounds: Rect2,
  ) {
    const s = TUNING.smell;
    this.puffs = Array.from({ length: s.puffs }, () => ({ alive: false, x: 0, y: 0, z: 0, vx: 0, vz: 0, age: 0 }));
    this.sources = items.filter((p) => p.tags.smell);
    this.walls = wallRectsAt(items, s.height);
    for (const src of this.sources) this.fragments.set(src, nearbyObjects(src, items, s.fragmentRadius));
    const at = this.sources.map((p) => p.mesh.getWorldPosition(new Vector3()));
    this.flow = new SmellFlow(bounds, this.walls, at);
    // The bacon was already frying before he woke: let the plume spread first.
    for (let t = 0; t < s.prewarmSeconds; t += s.stepSeconds) this.step(s.stepSeconds);
  }

  // Strength 0..1 of a puff (fades with age).
  static strength(age: number): number {
    return Math.exp(-age / TUNING.smell.decay);
  }

  static radius(age: number): number {
    const s = TUNING.smell;
    return Math.min(s.maxRadius, s.startRadius + s.growth * age);
  }

  update(dt: number, time: number, nose: Vector3): void {
    const s = TUNING.smell;
    this.stepTimer += dt;
    while (this.stepTimer >= s.stepSeconds) {
      this.stepTimer -= s.stepSeconds;
      this.step(s.stepSeconds);
    }
    for (const p of this.puffs) {
      if (!p.alive || SmellField.strength(p.age) < s.noticeStrength) continue;
      const r = SmellField.radius(p.age);
      const dx = p.x - nose.x;
      const dy = p.y - nose.y;
      const dz = p.z - nose.z;
      if (dx * dx + dy * dy + dz * dz <= r * r) {
        this.smelledUntil = time + s.lingerSeconds;
        break;
      }
    }
    const smelling = time < this.smelledUntil;
    for (const p of this.items) p.sensed.smell = false;
    if (!smelling) return;
    for (const src of this.sources) {
      src.sensed.smell = true;
      for (const f of this.fragments.get(src) ?? []) f.sensed.smell = true;
    }
  }

  private step(dt: number): void {
    const s = TUNING.smell;
    this.emitTimer += dt;
    if (this.emitTimer >= s.emitSeconds) {
      this.emitTimer -= s.emitSeconds;
      for (const src of this.sources) this.emit(src);
    }
    const settle = Math.min(1, s.damping * dt);
    for (const p of this.puffs) {
      if (!p.alive) continue;
      p.age += dt;
      if (p.age > s.lifeSeconds) {
        p.alive = false;
        continue;
      }
      this.flow.direction(p.x, p.z, this.dir);
      p.vx += (Math.random() * 2 - 1) * s.wander * dt * 4 + (this.dir.x * s.flowSpeed - p.vx) * settle;
      p.vz += (Math.random() * 2 - 1) * s.wander * dt * 4 + (this.dir.z * s.flowSpeed - p.vz) * settle;
      const nx = p.x + p.vx * dt;
      if (this.blocked(nx, p.z)) p.vx = -p.vx * 0.5;
      else p.x = nx;
      const nz = p.z + p.vz * dt;
      if (this.blocked(p.x, nz)) p.vz = -p.vz * 0.5;
      else p.z = nz;
    }
  }

  private emit(src: Perceivable): void {
    const s = TUNING.smell;
    const p = this.puffs[this.next]!;
    this.next = (this.next + 1) % this.puffs.length;
    const at = src.mesh.getWorldPosition(new Vector3());
    p.alive = true;
    p.x = at.x;
    p.z = at.z;
    p.y = s.height + (Math.random() * 2 - 1) * s.heightSpread;
    p.vx = 0;
    p.vz = 0;
    p.age = 0;
  }

  private blocked(x: number, z: number): boolean {
    for (const w of this.walls) if (x > w.minX && x < w.maxX && z > w.minZ && z < w.maxZ) return true;
    return false;
  }
}

// Wall pieces that are solid at height h (not window gaps or door openings).
function wallRectsAt(items: readonly Perceivable[], h: number): WallRect[] {
  const box = new Box3();
  return items
    .filter((p) => p.kind === 'wall')
    .map((p) => box.setFromObject(p.mesh).clone())
    .filter((b) => b.min.y <= h && b.max.y >= h)
    .map((b) => ({ minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z }));
}

// Furniture and props within `radius` of the source: they flicker with it.
function nearbyObjects(src: Perceivable, items: readonly Perceivable[], radius: number): Perceivable[] {
  const at = src.mesh.getWorldPosition(new Vector3());
  const box = new Box3();
  return items.filter(
    (p) => p !== src && (p.kind === 'furniture' || p.kind === 'prop') && box.setFromObject(p.mesh).distanceToPoint(at) <= radius,
  );
}
