import { BoxGeometry, BufferAttribute, BufferGeometry, Color, Matrix4, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TUNING } from '../tuning';
import type { Direction } from './door';

// Geometry for house surfaces that need more than one colour in a single mesh
// (one mesh = one draw call). All of them fill the unit cube, like the grey
// boxes, so they are scaled and placed exactly the same way.

// BoxGeometry face order: +x, -x, +y, -y, +z, -z (4 vertices each).
const FACE_INDEX: Record<Direction, number> = { '+x': 0, '-x': 1, '+z': 4, '-z': 5 };

const wallCache = new Map<Direction, BufferGeometry>();

// A wall box painted inside on every face except the outward one (siding).
export function outerWallGeometry(outward: Direction): BufferGeometry {
  let g = wallCache.get(outward);
  if (!g) {
    g = new BoxGeometry(1, 1, 1);
    const { wallInside, wallOutside } = TUNING.render.colors;
    const inside = new Color(wallInside);
    const outside = new Color(wallOutside);
    const colors = new Float32Array(24 * 3);
    for (let v = 0; v < 24; v++) {
      const c = Math.floor(v / 4) === FACE_INDEX[outward] ? outside : inside;
      colors.set([c.r, c.g, c.b], v * 3);
    }
    g.setAttribute('color', new BufferAttribute(colors, 3));
    g.computeBoundingBox();
    wallCache.set(outward, g);
  }
  return g;
}

// A box with one RGBA colour on every vertex.
function tintedBox(w: number, h: number, d: number, x: number, y: number, z: number, rgba: [number, number, number, number]): BufferGeometry {
  const g = new BoxGeometry(w, h, d).toNonIndexed();
  g.translate(x, y, z);
  const n = g.attributes.position!.count;
  const colors = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) colors.set(rgba, i * 4);
  g.setAttribute('color', new BufferAttribute(colors, 4));
  g.deleteAttribute('uv');
  return g;
}

// A window: a frame around a pale, see-through pane, sized (in metres) to its
// gap in the wall, then squeezed into the unit cube. Colours carry alpha, so
// the material must be transparent.
export function windowGeometry(width: number, height: number, alongX: boolean): BufferGeometry {
  const w = TUNING.render.window;
  const f = w.frameWidth;
  const d = w.frameDepth;
  const frame = new Color(w.frameColor);
  const fc: [number, number, number, number] = [frame.r, frame.g, frame.b, 1];
  const glass = new Color(...w.glassColor);
  const gc: [number, number, number, number] = [glass.r, glass.g, glass.b, w.glassOpacity];
  const parts = [
    tintedBox(width, f, d, 0, height / 2 - f / 2, 0, fc), // head
    tintedBox(width, f, d, 0, -height / 2 + f / 2, 0, fc), // sill
    tintedBox(f, height - 2 * f, d, -width / 2 + f / 2, 0, 0, fc), // left jamb
    tintedBox(f, height - 2 * f, d, width / 2 - f / 2, 0, 0, fc), // right jamb
    tintedBox(f * 0.6, height - 2 * f, d * 0.6, 0, 0, 0, fc), // middle bar
    tintedBox(width - 2 * f, height - 2 * f, w.glassThickness, 0, 0, 0, gc), // pane
  ];
  const g = mergeGeometries(parts)!;
  if (!alongX) g.applyMatrix4(new Matrix4().makeRotationY(Math.PI / 2));
  g.computeBoundingBox();
  const size = g.boundingBox!.getSize(new Vector3());
  g.scale(1 / size.x, 1 / size.y, 1 / size.z);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}
