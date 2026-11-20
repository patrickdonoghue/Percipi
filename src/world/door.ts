import { Group } from 'three';
import { DEG, TUNING } from '../tuning';
import type { Interactable } from '../input/interactPrompt';
import type { Perceivable } from '../perception/tags';
import type { Segment } from '../player';
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

  constructor(private readonly def: DoorDef) {
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

  private applyRotation(): void {
    const yaw = this.closedYaw + this.def.swingSign * this.openness * TUNING.door.openAngleDeg * DEG;
    this.pivot.rotation.y = yaw;
    // Local +x (the leaf) turned by `yaw` about the up axis.
    const s = this.segment;
    s.ax = this.def.hinge[0];
    s.az = this.def.hinge[1];
    s.bx = s.ax + Math.cos(yaw) * this.def.width;
    s.bz = s.az - Math.sin(yaw) * this.def.width;
  }
}
