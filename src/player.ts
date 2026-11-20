import { TUNING } from './tuning';
import type { MoveVector } from './input/head';
import type { Rect } from './world/layout';

// A thin moving blocker, e.g. a door leaf from its hinge to its free edge.
export interface Segment {
  ax: number;
  az: number;
  bx: number;
  bz: number;
}

// The character's body: walks on the ground plane and slides along walls and furniture.
export class Player {
  constructor(
    public x: number,
    public z: number,
  ) {}

  update(dt: number, yaw: number, move: MoveVector, colliders: readonly Rect[], bounds: Rect, segments: readonly Segment[] = []): void {
    const speed = TUNING.player.walkSpeed * dt;
    // Forward is -z when yaw = 0 (Three.js camera convention).
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);
    this.x += (fx * move.y + rx * move.x) * speed;
    this.z += (fz * move.y + rz * move.x) * speed;

    const r = TUNING.player.radius;
    for (let pass = 0; pass < 2; pass++) {
      for (const c of colliders) this.pushOut(c, r);
      for (const sg of segments) this.pushOffSegment(sg, r + TUNING.door.thickness / 2);
    }
    this.x = Math.max(bounds.minX + r, Math.min(bounds.maxX - r, this.x));
    this.z = Math.max(bounds.minZ + r, Math.min(bounds.maxZ - r, this.z));
  }

  // Keep the body at least `r` from a segment (doors, which swing so can't be boxes).
  private pushOffSegment(s: Segment, r: number): void {
    const ex = s.bx - s.ax;
    const ez = s.bz - s.az;
    const len2 = ex * ex + ez * ez;
    const t = len2 > 0 ? Math.max(0, Math.min(1, ((this.x - s.ax) * ex + (this.z - s.az) * ez) / len2)) : 0;
    const dx = this.x - (s.ax + ex * t);
    const dz = this.z - (s.az + ez * t);
    const d = Math.hypot(dx, dz);
    if (d >= r) return;
    if (d > 1e-6) {
      this.x += (dx / d) * (r - d);
      this.z += (dz / d) * (r - d);
    } else {
      const n = Math.sqrt(len2) || 1; // exactly on the line: step off sideways
      this.x += (-ez / n) * r;
      this.z += (ex / n) * r;
    }
  }

  private pushOut(c: Rect, r: number): void {
    const cx = Math.max(c.minX, Math.min(c.maxX, this.x));
    const cz = Math.max(c.minZ, Math.min(c.maxZ, this.z));
    const dx = this.x - cx;
    const dz = this.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= r * r) return;
    if (d2 > 1e-10) {
      const d = Math.sqrt(d2);
      this.x += (dx / d) * (r - d);
      this.z += (dz / d) * (r - d);
      return;
    }
    // Centre is inside the box: push out along the shortest side.
    const left = this.x - c.minX + r;
    const right = c.maxX - this.x + r;
    const down = this.z - c.minZ + r;
    const up = c.maxZ - this.z + r;
    const m = Math.min(left, right, down, up);
    if (m === left) this.x -= left;
    else if (m === right) this.x += right;
    else if (m === down) this.z -= down;
    else this.z += up;
  }
}
