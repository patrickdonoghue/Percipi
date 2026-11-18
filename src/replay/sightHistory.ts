import { Mesh, Vector3 } from 'three';
import { DEG, TUNING } from '../tuning';
import { PixelSight, SIGHT_SLOTS } from '../perception/pixelSight';
import type { Perceivable } from '../perception/tags';
import type { GreyboxWorld } from '../world/greybox';
import type { Character } from './character';
import type { Dollhouse } from './dollhouse';
import type { Playback } from './playback';

interface Slot {
  time: number | null; // playback time this snapshot shows; null = empty
}

const center = new Vector3();
const toCenter = new Vector3();

// Keeps the recent eye snapshots in step with the replay timeline:
// the newest slot follows the current moment every frame, and every
// `intervalSeconds` it is frozen and a fresh slot takes over.
export class SightHistory {
  private readonly slots: Slot[] = Array.from({ length: SIGHT_SLOTS }, () => ({ time: null }));
  private head = 0;
  private lastFreeze = 0;
  private lastTime: number | null = null;
  private readonly drawable = new Set<Perceivable>();

  constructor(
    private readonly sight: PixelSight,
    private readonly playback: Playback,
    private readonly world: GreyboxWorld,
    private readonly dollhouse: Dollhouse,
    private readonly character: Character,
  ) {}

  update(t: number): void {
    const interval = TUNING.pixelSight.intervalSeconds;
    const jumped = this.lastTime === null || t < this.lastTime || t - this.lastTime > 2 * interval;
    if (jumped) {
      this.rebuild(t);
    } else {
      if (t - this.lastFreeze >= interval) {
        this.head = this.oldestSlot();
        this.lastFreeze = t;
      }
      this.withSightScene(() => this.captureAt(this.head, t, false));
    }
    this.lastTime = t;
    this.publish(t);
    this.updateDrawable(t);
  }

  // Could this object have been seen in the recent snapshots? (cheap cone test)
  readonly isDrawable = (p: Perceivable): boolean => this.drawable.has(p);

  // After a scrub: re-render every slot from the recording.
  private rebuild(t: number): void {
    const interval = TUNING.pixelSight.intervalSeconds;
    this.withSightScene(() => {
      for (let k = 0; k < SIGHT_SLOTS; k++) {
        const tk = t - k * interval;
        if (tk < 0) {
          this.slots[k]!.time = null;
          continue;
        }
        this.captureAt(k, tk, true);
      }
      const now = this.playback.frameAt(t);
      if (now) this.playback.applyDoors(now);
    });
    this.head = 0;
    this.lastFreeze = t;
  }

  private captureAt(slot: number, t: number, setDoors: boolean): void {
    const frame = this.playback.frameAt(t);
    if (!frame) return;
    if (!frame.eyesOpen) {
      this.slots[slot]!.time = null; // eyes closed: this moment saw nothing
      return;
    }
    if (setDoors) {
      this.playback.applyDoors(frame);
      this.world.root.updateMatrixWorld(true);
    }
    this.sight.capture(slot, frame);
    this.slots[slot]!.time = t;
  }

  // Snapshots must see the real house: every object, full-height walls, no figure.
  private withSightScene(fn: () => void): void {
    const items = this.world.items;
    const wasVisible = items.map((p) => p.mesh.visible);
    const figureVisible = this.character.root.visible;
    // Glass is left out: the eyes see through it.
    for (const p of items) p.mesh.visible = p.kind !== 'glass';
    this.character.root.visible = false;
    this.dollhouse.withFullWalls(() => {
      this.world.root.updateMatrixWorld(true);
      fn();
    });
    items.forEach((p, i) => (p.mesh.visible = wasVisible[i]!));
    this.character.root.visible = figureVisible;
    this.world.root.updateMatrixWorld(true);
  }

  private oldestSlot(): number {
    let best = 0;
    let bestTime = Infinity;
    this.slots.forEach((s, i) => {
      const time = s.time ?? -Infinity;
      if (time < bestTime) {
        bestTime = time;
        best = i;
      }
    });
    return best;
  }

  private publish(t: number): void {
    const order = this.slots
      .map((s, tile) => ({ tile, age: s.time === null ? null : Math.max(0, t - s.time) }))
      .sort((a, b) => (a.age ?? Infinity) - (b.age ?? Infinity));
    this.sight.publish(order);
  }

  // Objects whose bounding sphere touches a recent view cone may be drawn.
  private updateDrawable(t: number): void {
    const half = TUNING.sight.coneHalfAngleDeg * DEG;
    const maxDist = TUNING.sight.maxDistance;
    const vanish = TUNING.dissolve.vanishSeconds;
    const live = this.slots
      .map((s, tile) => ({ s, tile }))
      .filter(({ s }) => s.time !== null && t - s.time <= vanish + 1e-3);
    this.drawable.clear();
    for (const p of this.world.items) {
      const { c, r } = worldSphere(p.mesh);
      for (const { tile } of live) {
        if (sphereTouchesCone(c, r, this.sight.tileEye[tile]!, this.sight.tileFwd[tile]!, half, maxDist)) {
          this.drawable.add(p);
          break;
        }
      }
    }
  }
}

function worldSphere(mesh: Mesh): { c: Vector3; r: number } {
  const geo = mesh.geometry;
  if (!geo.boundingSphere) geo.computeBoundingSphere();
  const s = geo.boundingSphere!;
  center.copy(s.center).applyMatrix4(mesh.matrixWorld);
  const scale = Math.max(Math.abs(mesh.scale.x), Math.abs(mesh.scale.y), Math.abs(mesh.scale.z));
  return { c: center.clone(), r: s.radius * scale };
}

function sphereTouchesCone(c: Vector3, r: number, eye: Vector3, fwd: Vector3, half: number, maxDist: number): boolean {
  toCenter.subVectors(c, eye);
  const dist = toCenter.length();
  if (dist - r > maxDist) return false;
  if (dist <= r) return true;
  const cosA = Math.max(-1, Math.min(1, toCenter.dot(fwd) / dist));
  return Math.acos(cosA) <= half + Math.asin(Math.min(1, r / dist));
}
