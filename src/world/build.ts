import { BoxGeometry, Mesh } from 'three';
import { TUNING } from '../tuning';
import { createDissolveMaterial } from '../render/dissolve';
import type { Kind, Perceivable, SenseTags } from '../perception/tags';

export type Vec3 = [number, number, number];

export interface BoxSpec {
  id: string;
  kind: Kind;
  min: Vec3;
  max: Vec3;
}

// One shared 1x1x1 box; each mesh is scaled to size.
const unitBox = new BoxGeometry(1, 1, 1);
unitBox.computeBoundingBox();

const COLORS = TUNING.render.colors;

export function colorFor(kind: Kind, outdoor = false): number {
  if (kind === 'floor') return outdoor ? COLORS.outdoorFloor : COLORS.floor;
  return COLORS[kind];
}

export function defaultTags(kind: Kind): SenseTags {
  return { sight: true, blocksSight: kind !== 'floor' };
}

export function makePerceivable(id: string, kind: Kind, mesh: Mesh, dynamic = false): Perceivable {
  mesh.name = id;
  return {
    id,
    kind,
    mesh,
    tags: defaultTags(kind),
    dynamic,
    localSamples: [],
    samples: [],
    sensed: { sight: false },
    present: false,
  };
}

export function makeBoxMesh(color: number): Mesh {
  return new Mesh(unitBox, createDissolveMaterial(color));
}

export function makeBox(spec: BoxSpec, outdoor = false): Perceivable {
  const mesh = makeBoxMesh(colorFor(spec.kind, outdoor));
  const [x0, y0, z0] = spec.min;
  const [x1, y1, z1] = spec.max;
  mesh.scale.set(x1 - x0, y1 - y0, z1 - z0);
  mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return makePerceivable(spec.id, spec.kind, mesh);
}
