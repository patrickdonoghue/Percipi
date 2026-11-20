import { BoxGeometry, BufferAttribute, BufferGeometry, Color, Matrix4, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TUNING } from '../tuning';
import type { FacePaint } from './build';

// Geometry for house surfaces that need more than one colour in a single mesh
// (one mesh = one draw call). All of them fill the unit cube, like the grey
// boxes, so they are scaled and placed exactly the same way.

// BoxGeometry face order: +x, -x, +y, -y, +z, -z (4 vertices each).
const FACES = ['+x', '-x', '+y', '-y', '+z', '-z'] as const;
const paintCache = new Map<string, BufferGeometry>();

// A unit box with its own colour on each face (a wall painted differently on
// each side), with shading baked in so walls don't melt into one flat colour:
// each direction gets its own brightness (as if lit from one side), and the
// walls darken slightly towards the floor. It costs nothing to draw: the
// colours ride on the vertices the box has anyway. y0/y1 are the piece's
// bottom and top in metres, so the floor shading lines up across pieces.
// Shared between pieces with the same paint and height.
export function paintedBoxGeometry(paint: FacePaint, y0: number, y1: number): BufferGeometry {
  const key = `${FACES.map((f) => paint[f]).join(',')}|${y0.toFixed(3)}|${y1.toFixed(3)}`;
  let g = paintCache.get(key);
  if (!g) {
    const { faceShade, floorShade } = TUNING.render.wallShading;
    const H = TUNING.house.wallHeight;
    g = new BoxGeometry(1, 1, 1);
    const pos = g.getAttribute('position') as BufferAttribute;
    const colors = new Float32Array(24 * 3);
    const c = new Color();
    for (let v = 0; v < 24; v++) {
      const face = FACES[Math.floor(v / 4)]!;
      const y = pos.getY(v) < 0 ? y0 : y1; // this vertex's height in metres
      const up = Math.min(1, Math.max(0, y / H));
      const side = face !== '+y' && face !== '-y';
      const k = faceShade[face] * (side ? floorShade + (1 - floorShade) * up : 1);
      c.set(paint[face]).multiplyScalar(k);
      colors.set([c.r, c.g, c.b], v * 3);
    }
    g.setAttribute('color', new BufferAttribute(colors, 3));
    g.computeBoundingBox();
    paintCache.set(key, g);
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
