import { TUNING } from '../tuning';
import type { BoxSpec } from './build';

// A gap in a wall, measured in metres along the wall from its start point.
// Doorway: bottom 0, top = door height. Window: bottom = sill, top = head.
export interface Gap {
  from: number;
  to: number;
  bottom?: number;
  top?: number;
}

export interface WallDef {
  id: string;
  a: [number, number]; // start (x, z)
  b: [number, number]; // end (x, z); walls must run along x or z
  gaps?: Gap[];
  height?: number; // defaults to the house wall height (fences are lower)
}

export const doorway = (from: number, to: number): Gap => ({ from, to, bottom: 0, top: TUNING.house.doorHeight });
export const windowGap = (from: number, to: number): Gap => ({
  from,
  to,
  bottom: TUNING.house.windowSill,
  top: TUNING.house.windowHead,
});

// Turn one wall line into box pieces: solid runs (split into short segments)
// plus the bits below windows and above doors/windows.
export function buildWall(def: WallDef): BoxSpec[] {
  const { wallThickness: T, maxWallSegment } = TUNING.house;
  const H = def.height ?? TUNING.house.wallHeight;
  const alongX = def.a[1] === def.b[1];
  const start = alongX ? def.a[0] : def.a[1];
  const end = alongX ? def.b[0] : def.b[1];
  const fixed = alongX ? def.a[1] : def.a[0];
  const sign = Math.sign(end - start);
  const length = Math.abs(end - start);

  const pieces: { t0: number; t1: number; y0: number; y1: number }[] = [];
  const gaps = [...(def.gaps ?? [])].sort((g, h) => g.from - h.from);

  const addSolid = (t0: number, t1: number) => {
    if (t1 - t0 < 1e-3) return;
    const n = Math.max(1, Math.ceil((t1 - t0) / maxWallSegment));
    for (let i = 0; i < n; i++) {
      pieces.push({ t0: t0 + ((t1 - t0) * i) / n, t1: t0 + ((t1 - t0) * (i + 1)) / n, y0: 0, y1: H });
    }
  };

  let cursor = 0;
  for (const g of gaps) {
    addSolid(cursor, g.from);
    const bottom = g.bottom ?? 0;
    const top = g.top ?? H;
    if (bottom > 0) pieces.push({ t0: g.from, t1: g.to, y0: 0, y1: bottom });
    if (top < H) pieces.push({ t0: g.from, t1: g.to, y0: top, y1: H });
    cursor = g.to;
  }
  addSolid(cursor, length);

  return pieces.map((p, i) => {
    // Extend the very ends by half a thickness so corners close up.
    const t0 = p.t0 <= 1e-6 ? p.t0 - T / 2 : p.t0;
    const t1 = p.t1 >= length - 1e-6 ? p.t1 + T / 2 : p.t1;
    const u0 = start + sign * t0;
    const u1 = start + sign * t1;
    const lo = Math.min(u0, u1);
    const hi = Math.max(u0, u1);
    const spec: BoxSpec = alongX
      ? { id: `${def.id}_${i}`, kind: 'wall', min: [lo, p.y0, fixed - T / 2], max: [hi, p.y1, fixed + T / 2] }
      : { id: `${def.id}_${i}`, kind: 'wall', min: [fixed - T / 2, p.y0, lo], max: [fixed + T / 2, p.y1, hi] };
    return spec;
  });
}
