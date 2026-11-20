import { BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, Color, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, Vector3, type Mesh } from 'three';
import { TUNING } from '../tuning';
import { fbm3, noise3 } from '../render/noise';
import type { Perceivable } from '../perception/tags';
import { FLOORS } from './layout';

// Built-in looks for surfaces that have no model: leafy hedges and a sidewalk
// of concrete squares. Like the furniture models, these only replace what an
// object's box looks like; the box itself (sight, dissolve, collisions) is unchanged.

export function applyDecor(items: readonly Perceivable[]): void {
  decorateHedges(items);
  decorateSidewalk(items);
}

function useGeometry(mesh: Mesh, g: BufferGeometry): void {
  mesh.geometry = g;
  const mat = mesh.material as MeshStandardMaterial;
  if (g.getAttribute('color')) {
    mat.color.set(0xffffff);
    mat.vertexColors = true;
  }
  mat.needsUpdate = true;
}

// ---- Hedges --------------------------------------------------------------

// Each hedge is several boxes in a row ('yard_hedge_west_0', '_1', ...). Each piece
// is shaped as part of the whole hedge, so the ends and top edges are rounded only
// where the hedge really ends, and the bumps run on across the joins.
function decorateHedges(items: readonly Perceivable[]): void {
  const hedges = new Map<string, Perceivable[]>();
  for (const p of items) {
    const m = /^(yard_hedge_.+)_\d+$/.exec(p.id);
    if (m) hedges.set(m[1]!, [...(hedges.get(m[1]!) ?? []), p]);
  }
  for (const pieces of hedges.values()) {
    const min = new Vector3(Infinity, Infinity, Infinity);
    const max = new Vector3(-Infinity, -Infinity, -Infinity);
    for (const p of pieces) {
      const h = p.mesh.scale.clone().multiplyScalar(0.5);
      min.min(p.mesh.position.clone().sub(h));
      max.max(p.mesh.position.clone().add(h));
    }
    for (const p of pieces) useGeometry(p.mesh, hedgeGeometry(p.mesh, min, max));
  }
}

function hedgeGeometry(mesh: Mesh, min: Vector3, max: Vector3): BufferGeometry {
  const t = TUNING.hedge;
  const s = mesh.scale;
  const c = mesh.position;
  const seg = (len: number) => Math.max(2, Math.ceil(len / t.step));
  const g = new BoxGeometry(1, 1, 1, seg(s.x), seg(s.y), seg(s.z));
  const pos = g.getAttribute('position') as BufferAttribute;
  const w = new Vector3();
  const inner = new Vector3();
  const r = t.rounding;
  const f = t.bumpScale;
  for (let i = 0; i < pos.count; i++) {
    w.fromBufferAttribute(pos, i).multiply(s).add(c); // to world metres
    // Round off the outer edges (not the bottom, which sits on the grass).
    inner.set(
      Math.min(Math.max(w.x, min.x + r), max.x - r),
      Math.min(w.y, max.y - r),
      Math.min(Math.max(w.z, min.z + r), max.z - r),
    );
    const d = w.clone().sub(inner);
    if (d.length() > r) w.copy(inner).add(d.setLength(r));
    // Leafy bumps. Depends only on position, so shared corners stay together.
    const onGround = w.y < min.y + 1e-3;
    w.x += fbm3(w.x * f, w.y * f, w.z * f) * t.bump;
    if (!onGround) w.y += fbm3(w.x * f + 31, w.y * f + 7, w.z * f + 3) * t.bump;
    w.z += fbm3(w.x * f + 57, w.y * f + 19, w.z * f + 41) * t.bump;
    pos.setXYZ(i, (w.x - c.x) / s.x, (w.y - c.y) / s.y, (w.z - c.z) / s.z);
  }
  const flat = g.toNonIndexed(); // faceted, like the rest of the low-poly scene
  flat.computeVertexNormals();

  // Colour each facet: clumps of lighter and darker leaves, darker near the ground.
  const fp = flat.getAttribute('position') as BufferAttribute;
  const colors = new Float32Array(fp.count * 3);
  const base = new Color(t.color);
  const col = new Color();
  const a = new Vector3();
  const height = max.y - min.y;
  for (let tri = 0; tri < fp.count; tri += 3) {
    a.set(0, 0, 0);
    for (let k = 0; k < 3; k++) a.add(w.fromBufferAttribute(fp, tri + k));
    a.divideScalar(3).multiply(s).add(c);
    const clump = noise3(a.x * 1.8, a.y * 1.8, a.z * 1.8) * 0.6 + noise3(a.x * 6, a.y * 6, a.z * 6) * 0.4;
    const up = Math.min(1, Math.max(0, (a.y - min.y) / height));
    col.copy(base).multiplyScalar((1 + clump * t.shade) * (1 - t.darkerAtBase * (1 - up)));
    for (let k = 0; k < 3; k++) colors.set([col.r, col.g, col.b], (tri + k) * 3);
  }
  flat.setAttribute('color', new BufferAttribute(colors, 3));
  flat.computeBoundingBox();
  flat.computeBoundingSphere();
  return flat;
}

// ---- Sidewalk ------------------------------------------------------------

// Square concrete slabs as wide as the sidewalk, with dark joints between them.
function decorateSidewalk(items: readonly Perceivable[]): void {
  const walk = FLOORS.find((f) => f.id === 'sidewalk_floor');
  if (!walk) return;
  const slab = walk.rect.maxZ - walk.rect.minZ;
  const tex = slabTexture(slab);
  const w = new Vector3();
  for (const p of items) {
    if (!p.id.startsWith('sidewalk_floor_')) continue;
    const g = new BoxGeometry(1, 1, 1);
    const pos = g.getAttribute('position') as BufferAttribute;
    const uv = g.getAttribute('uv') as BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      w.fromBufferAttribute(pos, i).multiply(p.mesh.scale).add(p.mesh.position);
      uv.setXY(i, (w.x - walk.rect.minX) / slab, (w.z - walk.rect.minZ) / slab);
    }
    useGeometry(p.mesh, g);
    (p.mesh.material as MeshStandardMaterial).map = tex;
  }
}

function slabTexture(slab: number): CanvasTexture {
  const t = TUNING.sidewalk;
  const n = 256;
  const canvas = document.createElement('canvas');
  canvas.width = n;
  canvas.height = n;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(n, n);
  const groove = ((t.grooveWidth / slab) * n) / 2; // half a joint on each edge; neighbours make the other half
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const edge = Math.min(x, y, n - 1 - x, n - 1 - y);
      const grain = 1 - t.speckle * (0.5 + 0.5 * noise3(x * 0.9, y * 0.9, 0)) - t.speckle * 0.5 * Math.random();
      const v = Math.round(255 * grain * (edge < groove ? t.grooveShade : 1));
      const k = (y * n + x) * 4;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = v;
      img.data[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}
