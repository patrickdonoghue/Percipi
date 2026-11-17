import { BufferAttribute, BufferGeometry, Color, Matrix4, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Perceivable } from '../perception/tags';
import type { Direction } from './door';
import { MODEL_SPECS, type ModelSpec } from './modelSpecs';

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

// One file -> one geometry in the model's own space, with vertex colours.
function loadMerged(file: string): Promise<BufferGeometry> {
  let p = cache.get(file);
  if (!p) {
    p = loader.loadAsync(`models/${file}.glb`).then((gltf) => {
      gltf.scene.updateMatrixWorld(true);
      const parts: BufferGeometry[] = [];
      gltf.scene.traverse((o) => {
        if (!(o instanceof Mesh)) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        const src = (o.geometry as BufferGeometry).toNonIndexed();
        // Split by material group so each part gets its own colour.
        const groups = src.groups.length ? src.groups : [{ start: 0, count: src.attributes.position!.count, materialIndex: 0 }];
        for (const grp of groups) {
          const g = new BufferGeometry();
          for (const name of ['position', 'normal'] as const) {
            const a = src.getAttribute(name) as BufferAttribute;
            g.setAttribute(name, new BufferAttribute(a.array.slice(grp.start * 3, (grp.start + grp.count) * 3), 3));
          }
          const mat = mats[grp.materialIndex ?? 0] as MeshStandardMaterial | undefined;
          const c = mat?.color ?? new Color(1, 1, 1);
          const colors = new Float32Array(grp.count * 3);
          for (let i = 0; i < grp.count; i++) colors.set([c.r, c.g, c.b], i * 3);
          g.setAttribute('color', new BufferAttribute(colors, 3));
          g.applyMatrix4(o.matrixWorld);
          parts.push(g);
        }
      });
      const merged = mergeGeometries(parts);
      if (!merged) throw new Error(`could not merge ${file}`);
      return merged;
    });
    cache.set(file, p);
  }
  return p;
}

// Lay the files side by side along the model's own x, face them, and fit to the unit cube.
async function buildModel(spec: ModelSpec): Promise<BufferGeometry> {
  const pieces = await Promise.all(spec.files.map(loadMerged));
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
  await Promise.all(
    items.map(async (p) => {
      const spec = MODEL_SPECS[p.id];
      if (!spec) return;
      try {
        p.mesh.geometry = await buildModel(spec);
        const mat = p.mesh.material as MeshStandardMaterial;
        mat.color.set(0xffffff);
        mat.vertexColors = true;
        mat.needsUpdate = true;
      } catch (err) {
        console.warn(`Percipi: keeping the grey box for ${p.id}`, err);
      }
    }),
  );
}
