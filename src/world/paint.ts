import { TUNING } from '../tuning';
import type { BoxSpec } from './build';
import { FLOORS } from './layout';

// Wall paint by room: each side of a wall gets the colour of the room it faces
// (TUNING.render.roomPaint), outside faces get the siding colour, and anything
// else the default wall paint. Walls are split where rooms meet (see roomEdges),
// so one wall piece never spans two rooms.

const INDOOR = FLOORS.filter((f) => !f.outdoor);
const PAINT = TUNING.render.roomPaint as Record<string, number>;
const C = TUNING.render.colors;
const PROBE = TUNING.house.wallThickness; // how far outside a face we look for a room

function roomPaintAt(x: number, z: number): number | null {
  const room = INDOOR.find((f) => x > f.rect.minX && x < f.rect.maxX && z > f.rect.minZ && z < f.rect.maxZ);
  return room ? (PAINT[room.id] ?? null) : null;
}

// Where rooms start and end, along x and along z (walls are split there).
export function roomEdges(axis: 'x' | 'z'): number[] {
  return INDOOR.flatMap((f) => (axis === 'x' ? [f.rect.minX, f.rect.maxX] : [f.rect.minZ, f.rect.maxZ]));
}

// Fill in spec.paint for a house wall piece (not the fence or the porch, which have their own colour).
export function paintWall(spec: BoxSpec): void {
  if (spec.kind !== 'wall' || spec.color !== undefined) return;
  const [x0, , z0] = spec.min;
  const [x1, , z1] = spec.max;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const side = (dir: '+x' | '-x' | '+z' | '-z', x: number, z: number): number => {
    if (spec.outward === dir) return C.wallOutside;
    return roomPaintAt(x, z) ?? C.wallInside;
  };
  spec.paint = {
    '+x': side('+x', x1 + PROBE, cz),
    '-x': side('-x', x0 - PROBE, cz),
    '+z': side('+z', cx, z1 + PROBE),
    '-z': side('-z', cx, z0 - PROBE),
    '+y': C.wallInside,
    '-y': C.wallInside,
  };
}
