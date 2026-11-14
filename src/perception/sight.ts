import { Box3, Matrix4, Mesh, Vector3 } from 'three';
import { TUNING } from '../tuning';
import type { Perceivable } from './tags';

// Line-of-sight for Phase 0 (per object). Every object is treated as a box in
// its own local space, so a sight ray can be tested with a cheap slab test
// instead of Three.js's general raycaster. (Real models in Phase 2 will use
// their bounding boxes, or the per-pixel approach replaces this.)

interface Volume {
  p: Perceivable;
  box: Box3; // local-space bounds
  inv: Matrix4; // world -> local
  eye: Vector3; // eye position in local space (refreshed each frame)
  lastBlocker: number; // index of the occluder that blocked this object last time
}

const dir = new Vector3();

export function buildLocalSamples(mesh: Mesh): Vector3[] {
  const box = localBox(mesh);
  const { samplesPerAxis, thinAxisMetres, sampleInset } = TUNING.sight;
  const axisValues = (min: number, max: number, scale: number): number[] => {
    if ((max - min) * Math.abs(scale) < thinAxisMetres || samplesPerAxis < 2) return [(min + max) / 2];
    const inset = (max - min) * sampleInset;
    const out: number[] = [];
    for (let i = 0; i < samplesPerAxis; i++) {
      out.push(min + inset + ((max - min - 2 * inset) * i) / (samplesPerAxis - 1));
    }
    return out;
  };
  const xs = axisValues(box.min.x, box.max.x, mesh.scale.x);
  const ys = axisValues(box.min.y, box.max.y, mesh.scale.y);
  const zs = axisValues(box.min.z, box.max.z, mesh.scale.z);
  const samples: Vector3[] = [];
  for (const x of xs) for (const y of ys) for (const z of zs) samples.push(new Vector3(x, y, z));
  return samples;
}

function localBox(mesh: Mesh): Box3 {
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  return mesh.geometry.boundingBox!;
}

// Distance along the ray (origin o, direction d, both local) where it enters the box.
// Returns 0 if the origin is inside, Infinity if it misses. Unrolled: this runs
// many thousands of times per frame, so it avoids allocating anything.
let t0 = 0;
let t1 = 0;
function slab(oa: number, da: number, lo: number, hi: number): boolean {
  if (Math.abs(da) < 1e-12) return oa >= lo && oa <= hi;
  let ta = (lo - oa) / da;
  let tb = (hi - oa) / da;
  if (ta > tb) {
    const tmp = ta;
    ta = tb;
    tb = tmp;
  }
  if (ta > t0) t0 = ta;
  if (tb < t1) t1 = tb;
  return t0 <= t1;
}
function rayEnter(o: Vector3, dx: number, dy: number, dz: number, b: Box3): number {
  t0 = -Infinity;
  t1 = Infinity;
  if (!slab(o.x, dx, b.min.x, b.max.x)) return Infinity;
  if (!slab(o.y, dy, b.min.y, b.max.y)) return Infinity;
  if (!slab(o.z, dz, b.min.z, b.max.z)) return Infinity;
  if (t1 < 0) return Infinity;
  return Math.max(t0, 0);
}

// Ray enter distance in world units (affine transforms keep the ray parameter).
function enterWorld(v: Volume, d: Vector3): number {
  const e = v.inv.elements;
  const dx = e[0]! * d.x + e[4]! * d.y + e[8]! * d.z;
  const dy = e[1]! * d.x + e[5]! * d.y + e[9]! * d.z;
  const dz = e[2]! * d.x + e[6]! * d.y + e[10]! * d.z;
  return rayEnter(v.eye, dx, dy, dz, v.box);
}

export class SightSystem {
  private readonly volumes: Volume[];
  private readonly occluders: Volume[];

  constructor(items: readonly Perceivable[]) {
    this.volumes = items.map((p) => {
      p.localSamples = buildLocalSamples(p.mesh);
      p.samples = p.localSamples.map((s) => s.clone());
      const v: Volume = { p, box: localBox(p.mesh), inv: new Matrix4(), eye: new Vector3(), lastBlocker: 0 };
      this.refresh(v);
      return v;
    });
    this.occluders = this.volumes.filter((v) => v.p.tags.blocksSight);
  }

  private refresh(v: Volume): void {
    v.p.mesh.updateWorldMatrix(true, false);
    v.inv.copy(v.p.mesh.matrixWorld).invert();
    for (let i = 0; i < v.p.localSamples.length; i++) {
      v.p.samples[i]!.copy(v.p.localSamples[i]!).applyMatrix4(v.p.mesh.matrixWorld);
    }
  }

  // Writes p.sensed.sight for every item.
  update(eye: Vector3, forward: Vector3, cosHalfAngle: number): void {
    for (const v of this.volumes) {
      if (v.p.dynamic) this.refresh(v);
      v.eye.copy(eye).applyMatrix4(v.inv);
    }
    for (const v of this.volumes) v.p.sensed.sight = v.p.tags.sight && this.canSee(v, eye, forward, cosHalfAngle);
  }

  private canSee(v: Volume, eye: Vector3, forward: Vector3, cosHalfAngle: number): boolean {
    const { maxDistance, blockerEpsilon } = TUNING.sight;
    for (const s of v.p.samples) {
      dir.subVectors(s, eye);
      const dist = dir.length();
      if (dist > maxDistance) continue;
      if (dist < 1e-4) return true;
      dir.divideScalar(dist);
      if (dir.dot(forward) < cosHalfAngle) continue;

      const own = enterWorld(v, dir);
      const targetDist = (own === Infinity ? dist : own) - blockerEpsilon;
      if (!this.blocked(v, dir, targetDist)) return true;
    }
    return false;
  }

  private blocked(v: Volume, d: Vector3, targetDist: number): boolean {
    const occ = this.occluders;
    // Try last frame's blocker first: usually the same wall hides the object.
    const first = occ[v.lastBlocker];
    if (first && first !== v && enterWorld(first, d) < targetDist) return true;
    for (let i = 0; i < occ.length; i++) {
      const o = occ[i]!;
      if (o === v || i === v.lastBlocker) continue;
      if (enterWorld(o, d) < targetDist) {
        v.lastBlocker = i;
        return true;
      }
    }
    return false;
  }
}
