import { BufferAttribute, BufferGeometry, Color, Matrix4, Mesh, MeshStandardMaterial, Object3D, Vector3, type Texture } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Perceivable } from '../perception/tags';
import type { Direction } from './door';
import { attachAnimated, preloadAnimated } from './animated';
import { applyDecor } from './decor';
import { ANIMATED_PROPS, modelSpecFor, type ModelSpec } from './modelSpecs';
import { applyTrees } from './trees';

// Real furniture models (Patrick's Kenney kit in public/models).
// Each object's grey box is a unit cube scaled and placed from the floor plan.
// Here each model is merged into one geometry (its material colours baked in
// as vertex colours), turned to face the right way, and squeezed into that
// same unit cube. So the model fills exactly the measured footprint, stays a
// single mesh (one draw call, one dissolve material), and every system that
// relied on the box (sight, dollhouse, smell, colliders) keeps working.
// Anything without a model, or whose file fails to load, stays a grey box.

// Yaw that turns a model's front (+z in the Kenney kit) to face `dir`.
const FACE_YAW: Record<Direction, number> = { '+z': 0, '+x': Math.PI / 2, '-x': -Math.PI / 2, '-z': Math.PI };

const loader = new GLTFLoader();
const cache = new Map<string, Promise<BufferGeometry>>();

function insideNode(o: Object3D, name: string): boolean {
  for (let n: Object3D | null = o; n; n = n.parent) if (n.name === name) return true;
  return false;
}

// A Kenney kit name ('bedDouble') or a Sketchfab folder path ('privacy_fence/scene.gltf').
const urlOf = (file: string): string => (file.includes('/') ? `models/${file}` : `models/${file}.glb`);

// Which part of a file to use: everything under a named node, optionally only
// some of its materials (e.g. a tree's trunk without its leaves).
export interface Part {
  node?: string;
  materials?: (name: string) => boolean;
  tag?: string; // names the material filter in the cache key
}

// One file (or one part of it) -> one geometry in the file's own space, with vertex colours.
export function loadMerged(file: string, part: Part = {}): Promise<BufferGeometry> {
  const key = `${file}#${part.node ?? ''}#${part.tag ?? ''}`;
  let p = cache.get(key);
  if (!p) {
    p = loader.loadAsync(urlOf(file)).then((gltf) => {
      gltf.scene.updateMatrixWorld(true);
      const parts: BufferGeometry[] = [];
      let map: Texture | null = null;
      gltf.scene.traverse((o) => {
        if (!(o instanceof Mesh)) return;
        if (part.node && !insideNode(o, part.node)) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        const src = (o.geometry as BufferGeometry).toNonIndexed();
        // Split by material group so each part gets its own colour.
        const groups = src.groups.length ? src.groups : [{ start: 0, count: src.attributes.position!.count, materialIndex: 0 }];
        for (const grp of groups) {
          const mat = mats[grp.materialIndex ?? 0] as MeshStandardMaterial | undefined;
          if (part.materials && !part.materials(mat?.name ?? '')) continue;
          const g = new BufferGeometry();
          for (const name of ['position', 'normal'] as const) {
            const a = src.getAttribute(name) as BufferAttribute;
            g.setAttribute(name, new BufferAttribute(a.array.slice(grp.start * 3, (grp.start + grp.count) * 3), 3));
          }
          const c = mat?.color ?? new Color(1, 1, 1);
          const colors = new Float32Array(grp.count * 3);
          for (let i = 0; i < grp.count; i++) colors.set([c.r, c.g, c.b], i * 3);
          g.setAttribute('color', new BufferAttribute(colors, 3));
          // A textured model (the egg pan) keeps its texture: carry the uvs and the map along.
          const uv = src.getAttribute('uv') as BufferAttribute | undefined;
          if (mat?.map && uv) {
            g.setAttribute('uv', new BufferAttribute(uv.array.slice(grp.start * 2, (grp.start + grp.count) * 2), 2));
            map = mat.map;
          }
          g.applyMatrix4(o.matrixWorld);
          parts.push(g);
        }
      });
      const merged = parts.length ? mergeGeometries(parts) : null;
      if (!merged) throw new Error(`could not merge ${key}`);
      merged.userData.map = map;
      return merged;
    });
    cache.set(key, p);
  }
  return p;
}

// Lay the files side by side along the model's own x, face them, and fit to the unit cube.
async function buildModel(spec: ModelSpec): Promise<BufferGeometry> {
  const pieces = await Promise.all(spec.files.map((f) => loadMerged(f, spec.node ? { node: spec.node } : {})));
  let x = 0;
  const placed = pieces.map((piece) => {
    const g = piece.clone();
    g.computeBoundingBox();
    const b = g.boundingBox!;
    g.translate(x - b.min.x, 0, 0);
    x += b.max.x - b.min.x;
    return g;
  });
  const g = placed.length === 1 ? placed[0]! : mergeGeometries(placed);
  if (!g) throw new Error('could not merge tiles');
  g.userData.map = pieces[0]?.userData.map ?? null; // a textured model keeps its texture
  g.applyMatrix4(new Matrix4().makeRotationY(FACE_YAW[spec.face]));
  g.computeBoundingBox();
  const b = g.boundingBox!;
  const size = b.getSize(new Vector3());
  const centre = b.getCenter(new Vector3());
  g.translate(-centre.x, -centre.y, -centre.z);
  g.scale(1 / size.x, 1 / size.y, 1 / size.z);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

// Swap the grey boxes for models. Resolves once every model has loaded or failed.
export async function applyModels(items: readonly Perceivable[]): Promise<void> {
  const animated = preloadAnimated(['man', 'dog']).then(() => {
    for (const p of items) {
      const spec = ANIMATED_PROPS[p.id];
      if (spec) attachAnimated(p, spec);
    }
  });
  applyDecor(items);
  await Promise.all([
    animated,
    applyTrees(items),
    ...items.map(async (p) => {
      const spec = modelSpecFor(p);
      if (!spec) return;
      try {
        p.mesh.geometry = await buildModel(spec);
        const mat = p.mesh.material as MeshStandardMaterial;
        mat.color.set(spec.tint ?? 0xffffff);
        mat.vertexColors = true;
        mat.map = (p.mesh.geometry.userData.map as Texture | null) ?? null;
        mat.needsUpdate = true;
      } catch (err) {
        console.warn(`Percipi: keeping the grey box for ${p.id}`, err);
      }
    }),
  ]);
}
