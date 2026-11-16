import { TUNING } from '../tuning';

export interface Rect2 {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

// Which way smell drifts at each spot: away from the source along open paths
// (around walls, through doorways and windows). Built once as a grid of
// "walking distance from the source"; air flows towards larger distances.
export class SmellFlow {
  private readonly cell = TUNING.smell.flowCell;
  private readonly nx: number;
  private readonly nz: number;
  private readonly dist: Float32Array;

  constructor(
    private readonly bounds: Rect2,
    walls: readonly Rect2[],
    sources: readonly { x: number; z: number }[],
  ) {
    this.nx = Math.ceil((bounds.maxX - bounds.minX) / this.cell);
    this.nz = Math.ceil((bounds.maxZ - bounds.minZ) / this.cell);
    const blocked = new Uint8Array(this.nx * this.nz);
    for (const w of walls) {
      const [x0, z0] = this.cellOf(w.minX, w.minZ);
      const [x1, z1] = this.cellOf(w.maxX, w.maxZ);
      for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) blocked[z * this.nx + x] = 1;
    }
    // Breadth-first "flood" outwards from the sources.
    this.dist = new Float32Array(this.nx * this.nz).fill(Infinity);
    const queue: number[] = [];
    for (const s of sources) {
      const [x, z] = this.cellOf(s.x, s.z);
      const i = z * this.nx + x;
      this.dist[i] = 0;
      queue.push(i);
    }
    for (let head = 0; head < queue.length; head++) {
      const i = queue[head]!;
      const x = i % this.nx;
      const z = Math.floor(i / this.nx);
      const d = this.dist[i]! + 1;
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const ax = x + dx;
        const az = z + dz;
        if (ax < 0 || az < 0 || ax >= this.nx || az >= this.nz) continue;
        const j = az * this.nx + ax;
        if (blocked[j] || this.dist[j]! <= d) continue;
        this.dist[j] = d;
        queue.push(j);
      }
    }
  }

  // Unit direction (x, z) away from the source at this point; (0, 0) if none.
  direction(x: number, z: number, out: { x: number; z: number }): void {
    const [cx, cz] = this.cellOf(x, z);
    const here = this.at(cx, cz);
    if (!Number.isFinite(here)) {
      // Inside a wall cell (or cut off): no flow; the swirl will carry it out.
      out.x = 0;
      out.z = 0;
      return;
    }
    const sample = (ax: number, az: number) => {
      const v = this.at(ax, az);
      return Number.isFinite(v) ? v : here; // walls don't pull
    };
    const gx = sample(cx + 1, cz) - sample(cx - 1, cz);
    const gz = sample(cx, cz + 1) - sample(cx, cz - 1);
    const len = Math.hypot(gx, gz);
    out.x = len > 0 ? gx / len : 0;
    out.z = len > 0 ? gz / len : 0;
  }

  private at(x: number, z: number): number {
    if (x < 0 || z < 0 || x >= this.nx || z >= this.nz) return Infinity;
    return this.dist[z * this.nx + x]!;
  }

  private cellOf(x: number, z: number): [number, number] {
    const cx = Math.min(this.nx - 1, Math.max(0, Math.floor((x - this.bounds.minX) / this.cell)));
    const cz = Math.min(this.nz - 1, Math.max(0, Math.floor((z - this.bounds.minZ) / this.cell)));
    return [cx, cz];
  }
}
