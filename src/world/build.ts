import { BoxGeometry, BufferGeometry, Mesh, MeshStandardMaterial } from 'three';
import { TUNING } from '../tuning';
import { createDissolveMaterial } from '../render/dissolve';
import type { Kind, Perceivable, SenseTags } from '../perception/tags';
import type { Direction } from './door';
import { paintedBoxGeometry, windowGeometry } from './surfaces';

export type Vec3 = [number, number, number];

export interface BoxSpec {
  id: string;
  kind: Kind;
  min: Vec3;
  max: Vec3;
  color?: number; // overrides the colour for its kind (floors per room, the fence)
  outward?: Direction; // outer walls: this face is painted as outside siding
  paint?: FacePaint; // a colour per face (walls: each side painted for its room; see paint.ts)
}

export type FacePaint = Record<Direction | '+y' | '-y', number>;

// One shared 1x1x1 box; each mesh is scaled to size.
const unitBox = new BoxGeometry(1, 1, 1);
unitBox.computeBoundingBox();

const COLORS = TUNING.render.colors;

export function colorFor(kind: Kind, outdoor = false): number {
  if (kind === 'floor') return outdoor ? COLORS.outdoorFloor : COLORS.floor;
  if (kind === 'wall') return COLORS.wallInside;
  return COLORS[kind];
}

export function defaultTags(kind: Kind): SenseTags {
  // Floors are underfoot and glass is see-through: neither stops a line of sight.
  return { sight: true, blocksSight: kind !== 'floor' && kind !== 'glass' };
}

export function makePerceivable(id: string, kind: Kind, mesh: Mesh, dynamic = false): Perceivable {
  mesh.name = id;
  mesh.visible = false; // nothing is drawn until the walk begins
  return {
    id,
    kind,
    mesh,
    tags: defaultTags(kind),
    dynamic,
    localSamples: [],
    samples: [],
    sensed: { sight: false, sound: false, smell: false },
    present: false,
  };
}

export function makeBoxMesh(color: number, sightThickness = 0, geometry: BufferGeometry = unitBox): Mesh {
  const mesh = new Mesh(geometry, createDissolveMaterial(color, sightThickness));
  if (geometry.getAttribute('color')) {
    const mat = mesh.material as MeshStandardMaterial;
    mat.color.set(0xffffff); // the geometry carries the colours
    mat.vertexColors = true;
  }
  return mesh;
}

function geometryFor(spec: BoxSpec): BufferGeometry {
  if (spec.kind === 'glass') {
    const [x0, y0, z0] = spec.min;
    const [x1, y1, z1] = spec.max;
    const alongX = x1 - x0 >= z1 - z0;
    return windowGeometry(alongX ? x1 - x0 : z1 - z0, y1 - y0, alongX);
  }
  if (spec.paint) return paintedBoxGeometry(spec.paint);
  return unitBox;
}

export function makeBox(spec: BoxSpec, outdoor = false): Perceivable {
  const thickness = spec.kind === 'wall' ? TUNING.house.wallThickness : 0;
  const mesh = makeBoxMesh(spec.color ?? colorFor(spec.kind, outdoor), thickness, geometryFor(spec));
  if (spec.kind === 'glass') {
    const mat = mesh.material as MeshStandardMaterial;
    mat.transparent = true;
    mat.depthWrite = false; // see-through: never hides what's behind it
  }
  const [x0, y0, z0] = spec.min;
  const [x1, y1, z1] = spec.max;
  mesh.scale.set(x1 - x0, y1 - y0, z1 - z0);
  mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return makePerceivable(spec.id, spec.kind, mesh);
}
