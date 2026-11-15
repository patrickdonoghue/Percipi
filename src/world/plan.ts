// Helpers for reading positions straight off docs/floorplan.png.
//
// All pixel numbers in layout.ts were measured on the plan scaled to 1918 px wide
// (the original file is 2382 px wide; multiply by 1.242 to find them there).
// The house's south-west outer corner is at pixel (497, 1357), and the house is
// 886 px = 32 ft wide. Right on the plan is +x in the world; up on the plan
// (towards the backyard) is -z, so the world is not mirrored when seen from above.

import type { BoxSpec, Vec3 } from './build';
import type { Kind } from '../perception/tags';
import type { Direction, DoorDef } from './door';
import type { Rect } from './layout';
import { doorway, windowGap, type Gap, type WallDef } from './walls';

const FT = 0.3048;
export const PX_PER_M = 886 / (32 * FT);
const ORIGIN_X = 497;
const ORIGIN_Y = 1357;

export const mx = (px: number): number => (px - ORIGIN_X) / PX_PER_M;
export const mz = (py: number): number => (py - ORIGIN_Y) / PX_PER_M;

// Rectangle from two plan corners.
export function rectPx(x1: number, y1: number, x2: number, y2: number): Rect {
  return { minX: mx(Math.min(x1, x2)), maxX: mx(Math.max(x1, x2)), minZ: mz(Math.min(y1, y2)), maxZ: mz(Math.max(y1, y2)) };
}

// Box from two plan corners plus a height range in metres.
export function boxPx(id: string, kind: Kind, x1: number, y1: number, x2: number, y2: number, y0: number, h: number): BoxSpec {
  const r = rectPx(x1, y1, x2, y2);
  const min: Vec3 = [r.minX, y0, r.minZ];
  const max: Vec3 = [r.maxX, h, r.maxZ];
  return { id, kind, min, max };
}

// A long box (hedge) split into pieces along its long side, so it dissolves in parts.
export function chunkedBoxPx(id: string, kind: Kind, x1: number, y1: number, x2: number, y2: number, h: number, maxLen: number): BoxSpec[] {
  const r = rectPx(x1, y1, x2, y2);
  const alongX = r.maxX - r.minX >= r.maxZ - r.minZ;
  const len = alongX ? r.maxX - r.minX : r.maxZ - r.minZ;
  const n = Math.max(1, Math.ceil(len / maxLen));
  const out: BoxSpec[] = [];
  for (let i = 0; i < n; i++) {
    const a = (len * i) / n;
    const b = (len * (i + 1)) / n;
    out.push(
      alongX
        ? { id: `${id}_${i}`, kind, min: [r.minX + a, 0, r.minZ], max: [r.minX + b, h, r.maxZ] }
        : { id: `${id}_${i}`, kind, min: [r.minX, 0, r.minZ + a], max: [r.maxX, h, r.minZ + b] },
    );
  }
  return out;
}

// Openings along a wall, given as plan pixel coordinates along the wall's axis.
export type GapPx = ['door' | 'window', number, number];

export function wallPx(id: string, a: [number, number], b: [number, number], gaps: GapPx[] = [], height?: number): WallDef {
  const horizontal = a[1] === b[1];
  const start = horizontal ? a[0] : a[1];
  const toGap = ([type, p1, p2]: GapPx): Gap => {
    const o1 = Math.abs(p1 - start) / PX_PER_M;
    const o2 = Math.abs(p2 - start) / PX_PER_M;
    const make = type === 'door' ? doorway : windowGap;
    return make(Math.min(o1, o2), Math.max(o1, o2));
  };
  const def: WallDef = { id, a: [mx(a[0]), mz(a[1])], b: [mx(b[0]), mz(b[1])], gaps: gaps.map(toGap) };
  if (height !== undefined) def.height = height;
  return def;
}

// A door hinged at a plan point, running `along` when closed, filling a gap `widthPx` wide.
export function doorPx(id: string, hinge: [number, number], along: Direction, widthPx: number, swingSign: 1 | -1): DoorDef {
  const clearance = 0.02;
  const ux = along === '+x' ? 1 : along === '-x' ? -1 : 0;
  const uz = along === '+z' ? 1 : along === '-z' ? -1 : 0;
  return {
    id,
    hinge: [mx(hinge[0]) + ux * clearance, mz(hinge[1]) + uz * clearance],
    along,
    width: widthPx / PX_PER_M - 2 * clearance,
    swingSign,
  };
}
