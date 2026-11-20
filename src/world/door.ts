import { Group } from 'three';
import { DEG, TUNING } from '../tuning';
import type { Interactable } from '../input/interactPrompt';
import type { Perceivable } from '../perception/tags';
import type { Segment } from '../player';
import type { Rect } from './layout';
import { colorFor, makeBoxMesh, makePerceivable } from './build';

export type Direction = '+x' | '-x' | '+z' | '-z';

// Unit vector (x, z) for each direction, and the pivot yaw that points local +x that way.
const DIR: Record<Direction, { x: number; z: number; yaw: number }> = {
  '+x': { x: 1, z: 0, yaw: 0 },
  '-x': { x: -1, z: 0, yaw: Math.PI },
  '+z': { x: 0, z: 1, yaw: -Math.PI / 2 },
  '-z': { x: 0, z: -1, yaw: Math.PI / 2 },
};

export interface DoorDef {
  id: string;
  hinge: [number, number]; // (x, z) of the hinge
  along: Direction; // direction the closed door runs from its hinge
  width: number;
  swingSign: 1 | -1; // which way it opens
}

// A door that swings on its hinge. It is perceivable (and blocks sight) like any wall.
export class Door implements Interactable {
  readonly pivot = new Group();
  readonly item: Perceivable;
  private openness: number = TUNING.door.startOpenFraction;
  private target: number = TUNING.door.startOpenFraction;
  private readonly closedYaw: number;
  private readonly maxOpenDeg: number;

  // `walls` are the walking blockers: the door stops opening just before it would touch one.
  constructor(
    private readonly def: DoorDef,
    walls: readonly Rect[] = [],
  ) {
    const { doorHeight } = TUNING.house;
    const { thickness } = TUNING.door;
    const height = doorHeight - 0.02;
    const mesh = makeBoxMesh(colorFor('door'), thickness);
    mesh.scale.set(def.width, height, thickness);
    mesh.position.set(def.width / 2, height / 2, 0);
    this.pivot.add(mesh);
    this.pivot.position.set(def.hinge[0], 0, def.hinge[1]);
    // Local +x is the door's length; rotate so it points along `along` when closed.
    this.closedYaw = DIR[def.along].yaw;
    this.maxOpenDeg = this.openLimit(walls);
    this.item = makePerceivable(def.id, 'door', mesh, true);
    this.applyRotation();
  }

  distanceTo(x: number, z: number): number {
    const half = this.def.width / 2;
    const d = DIR[this.def.along];
    const cx = this.def.hinge[0] + d.x * half;
    const cz = this.def.hinge[1] + d.z * half;
    return Math.hypot(x - cx, z - cz);
  }

  // The leaf as a line from hinge to free edge, where it is right now (it blocks walking).
  readonly segment: Segment = { ax: 0, az: 0, bx: 0, bz: 0 };

  get openFraction(): number {
    return this.openness;
  }

  // Used by the replay to put the door exactly where it was.
  setOpenFraction(v: number): void {
    this.openness = v;
    this.target = v;
    this.applyRotation();
  }

  get label(): string {
    return this.openness > 0.5 ? 'Close door' : 'Open door';
  }

  activate(): void {
    this.toggle();
  }

  toggle(): void {
    this.target = this.openness > 0.5 ? 0 : 1;
  }

  update(dt: number): void {
    const step = dt / TUNING.door.swingSeconds;
    if (this.openness < this.target) this.openness = Math.min(this.target, this.openness + step);
    else this.openness = Math.max(this.target, this.openness - step);
    this.applyRotation();
  }

  private angleAt(deg: number): number {
    return this.closedYaw + this.def.swingSign * deg * DEG;
  }

  // How far it can swing (up to openAngleDeg) before the leaf meets a wall, like a door stop.
  // Walls it already touches when shut (its own frame) don't count.
  private openLimit(walls: readonly Rect[]): number {
    const { openAngleDeg } = TUNING.door;
    const frame = new Set(walls.filter((w) => this.leafTouches(w, 0)));
    const others = walls.filter((w) => !frame.has(w));
    for (let deg = 1; deg <= openAngleDeg; deg++) {
      if (others.some((w) => this.leafTouches(w, deg))) return deg - 1;
    }
    return openAngleDeg;
  }

  private leafTouches(w: Rect, deg: number): boolean {
    const { thickness, stopGap, hingeSkip } = TUNING.door;
    const pad = thickness / 2 + stopGap;
    const yaw = this.angleAt(deg);
    const dx = Math.cos(yaw);
    const dz = -Math.sin(yaw);
    const [hx, hz] = this.def.hinge;
    for (let t = hingeSkip; t <= this.def.width + 1e-6; t += 0.05) {
      const x = hx + dx * t;
      const z = hz + dz * t;
      if (x > w.minX - pad && x < w.maxX + pad && z > w.minZ - pad && z < w.maxZ + pad) return true;
    }
    return false;
  }

  private applyRotation(): void {
    const yaw = this.angleAt(this.openness * this.maxOpenDeg);
    this.pivot.rotation.y = yaw;
    // Local +x (the leaf) turned by `yaw` about the up axis.
    const s = this.segment;
    s.ax = this.def.hinge[0];
    s.az = this.def.hinge[1];
    s.bx = s.ax + Math.cos(yaw) * this.def.width;
    s.bz = s.az - Math.sin(yaw) * this.def.width;
  }
}
