import { TUNING } from '../tuning';
import type { BoxSpec } from './build';
import type { Direction } from './door';

// A gap in a wall, measured in metres along the wall from its start point.
// Doorway: bottom 0, top = door height. Window: bottom = sill, top = head.
export interface Gap {
  from: number;
  to: number;
  bottom?: number;
  top?: number;
  glass?: boolean; // a window: filled with a frame and pane
}

export interface WallDef {
  id: string;
  a: [number, number]; // start (x, z)
  b: [number, number]; // end (x, z); walls must run along x or z
  gaps?: Gap[];
  height?: number; // defaults to the house wall height (fences are lower)
  outward?: Direction; // outer walls: which side faces outdoors
  color?: number; // overrides the wall paint (the fence)
}

export const doorway = (from: number, to: number): Gap => ({ from, to, bottom: 0, top: TUNING.house.doorHeight });
export const windowGap = (from: number, to: number): Gap => ({
  from,
  to,
  bottom: TUNING.house.windowSill,
  top: TUNING.house.windowHead,
  glass: true,
});
export const sidelight = (from: number, to: number): Gap => ({ from, to, bottom: 0, top: TUNING.house.doorHeight, glass: true });

// Turn one wall line into box pieces: solid runs (split into short segments)
// plus the bits below windows and above doors/windows.
export function buildWall(def: WallDef): BoxSpec[] {
  const { wallThickness: T, maxWallSegment, cornerInset } = TUNING.house;
  const H = def.height ?? TUNING.house.wallHeight;
  const alongX = def.a[1] === def.b[1];
  const start = alongX ? def.a[0] : def.a[1];
  const end = alongX ? def.b[0] : def.b[1];
  const fixed = alongX ? def.a[1] : def.a[0];
  const sign = Math.sign(end - start);
  const length = Math.abs(end - start);

  const pieces: { t0: number; t1: number; y0: number; y1: number; glass?: boolean }[] = [];
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
    if (g.glass) pieces.push({ t0: g.from, t1: g.to, y0: bottom, y1: top, glass: true });
    cursor = g.to;
  }
  addSolid(cursor, length);

  return pieces.map((p, i) => {
    // Extend the very ends by (just under) half a thickness so corners close up.
    // Exactly half would put the end face in the same plane as the other wall's
    // outside face, and the two colours would flicker against each other.
    const ext = T / 2 - cornerInset;
    const t0 = p.t0 <= 1e-6 ? p.t0 - ext : p.t0;
    const t1 = p.t1 >= length - 1e-6 ? p.t1 + ext : p.t1;
    const u0 = start + sign * t0;
    const u1 = start + sign * t1;
    const lo = Math.min(u0, u1);
    const hi = Math.max(u0, u1);
    const id = p.glass ? `${def.id}_window_${i}` : `${def.id}_${i}`;
    const kind = p.glass ? 'glass' : 'wall';
    const half = p.glass ? TUNING.render.window.frameDepth / 2 : T / 2;
    const spec: BoxSpec = alongX
      ? { id, kind, min: [lo, p.y0, fixed - half], max: [hi, p.y1, fixed + half] }
      : { id, kind, min: [fixed - half, p.y0, lo], max: [fixed + half, p.y1, hi] };
    if (!p.glass) {
      if (def.outward) spec.outward = def.outward;
      if (def.color !== undefined) spec.color = def.color;
    }
    return spec;
  });
}
