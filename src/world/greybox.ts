import { Group } from 'three';
import { TUNING } from '../tuning';
import type { Perceivable } from '../perception/tags';
import { makeBox, type BoxSpec } from './build';
import { Door } from './door';
import { BOUNDS, DOORS, FLOORS, FURNITURE, SPAWN, WALLS, type Rect } from './layout';
import { applySenseTags } from './sounds';
import { buildWall } from './walls';

export interface GreyboxWorld {
  root: Group;
  items: Perceivable[];
  doors: Door[];
  colliders: Rect[];
  bounds: Rect;
  spawn: typeof SPAWN;
}

function floorTiles(id: string, r: Rect, top = 0): BoxSpec[] {
  const { floorTile: size, floorThickness: th } = TUNING.house;
  const tiles: BoxSpec[] = [];
  let i = 0;
  for (let x = r.minX; x < r.maxX - 1e-6; x += size) {
    for (let z = r.minZ; z < r.maxZ - 1e-6; z += size) {
      tiles.push({
        id: `${id}_${i++}`,
        kind: 'floor',
        min: [x, -th, z],
        max: [Math.min(x + size, r.maxX), top, Math.min(z + size, r.maxZ)],
      });
    }
  }
  return tiles;
}

// Walking blockers: boxes that overlap body height (not lintels, not floors).
function isCollider(s: BoxSpec): boolean {
  const { collideBelow, collideAbove } = TUNING.player;
  return s.kind !== 'floor' && s.min[1] < collideBelow && s.max[1] > collideAbove;
}

export function buildGreybox(): GreyboxWorld {
  const root = new Group();
  const items: Perceivable[] = [];
  const colliders: Rect[] = [];

  const add = (spec: BoxSpec, outdoor = false) => {
    const p = makeBox(spec, outdoor);
    root.add(p.mesh);
    items.push(p);
    if (isCollider(spec)) {
      colliders.push({ minX: spec.min[0], minZ: spec.min[2], maxX: spec.max[0], maxZ: spec.max[2] });
    }
  };

  for (const fl of FLOORS) for (const t of floorTiles(fl.id, fl.rect, fl.top)) add(t, fl.outdoor);
  for (const w of WALLS) for (const piece of buildWall(w)) add(piece);
  for (const spec of FURNITURE) add(spec);

  const doors = DOORS.map((d) => new Door(d));
  for (const d of doors) {
    root.add(d.pivot);
    items.push(d.item);
  }

  applySenseTags(items);
  root.updateMatrixWorld(true);
  return { root, items, doors, colliders, bounds: BOUNDS, spawn: SPAWN };
}
