import { TUNING } from './tuning';
import type { MoveVector } from './input/head';
import type { Rect } from './world/layout';

// The character's body: walks on the ground plane and slides along walls and furniture.
export class Player {
  constructor(
    public x: number,
    public z: number,
  ) {}

  update(dt: number, yaw: number, move: MoveVector, colliders: readonly Rect[], bounds: Rect): void {
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
    }
    this.x = Math.max(bounds.minX + r, Math.min(bounds.maxX - r, this.x));
    this.z = Math.max(bounds.minZ + r, Math.min(bounds.maxZ - r, this.z));
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
