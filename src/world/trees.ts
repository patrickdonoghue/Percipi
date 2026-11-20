import { Matrix4, MeshStandardMaterial, Vector3, type BufferGeometry } from 'three';
import type { Perceivable } from '../perception/tags';
import { TREES } from './layout';
import { loadMerged } from './models';
import { TREE_FILE, TREE_SHAPES, TRUNK_MATERIAL } from './modelSpecs';

// Put a model tree on each yard tree's two boxes: the trunk part is drawn by the
// trunk box and the leaves by the canopy box, so in the replay they appear and
// dissolve with what was seen, like any other object. The tree keeps its own
// proportions (scaled evenly to the planned height, base on the ground).

export async function applyTrees(items: readonly Perceivable[]): Promise<void> {
  const byId = new Map(items.map((p) => [p.id, p]));
  await Promise.all(
    TREES.map(async (t) => {
      const trunk = byId.get(`${t.id}_trunk`);
      const canopy = byId.get(`${t.id}_canopy`);
      if (!trunk || !canopy) return;
      const node = TREE_SHAPES[t.shape].node;
      try {
        const [whole, wood, leaves] = await Promise.all([
          loadMerged(TREE_FILE, { node }),
          loadMerged(TREE_FILE, { node, materials: (m) => m === TRUNK_MATERIAL, tag: 'trunk' }),
          loadMerged(TREE_FILE, { node, materials: (m) => m !== TRUNK_MATERIAL, tag: 'leaves' }),
        ]);
        // Model space -> world: trunk centred on the trunk box, base on the ground.
        whole.computeBoundingBox();
        wood.computeBoundingBox();
        const wb = whole.boundingBox!;
        const base = wood.boundingBox!.getCenter(new Vector3());
        const scale = t.height / (wb.max.y - wb.min.y);
        const at = trunk.mesh.position;
        const toWorld = new Matrix4()
          .makeTranslation(at.x, 0, at.z)
          .multiply(new Matrix4().makeScale(scale, scale, scale))
          .multiply(new Matrix4().makeTranslation(-base.x, -wb.min.y, -base.z));
        place(trunk, wood, toWorld);
        place(canopy, leaves, toWorld);
      } catch (err) {
        console.warn(`Percipi: keeping the grey boxes for ${t.id}`, err);
      }
    }),
  );
}

// Give a box the model part, expressed in the box's own (unit cube) space.
function place(p: Perceivable, part: BufferGeometry, toWorld: Matrix4): void {
  p.mesh.updateMatrix();
  const g = part.clone().applyMatrix4(new Matrix4().copy(p.mesh.matrix).invert().multiply(toWorld));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  p.mesh.geometry = g;
  const mat = p.mesh.material as MeshStandardMaterial;
  mat.color.set(0xffffff);
  mat.vertexColors = true;
  mat.needsUpdate = true;
}
