import { AnimationClip, AnimationMixer, Box3, Group, Mesh, MeshStandardMaterial, Object3D, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { createDissolveMaterial } from '../render/dissolve';
import type { Perceivable } from '../perception/tags';

// Animated models (the man and the dog, from Sketchfab; see CREDITS.md).
// Both face +z in their own space. Loaded once up front; each use is a clone.

export type AnimatedName = 'man' | 'dog';

interface Source {
  scene: Object3D;
  clips: AnimationClip[];
}

const sources = new Map<AnimatedName, Source>();
const mixers: AnimationMixer[] = [];

export async function preloadAnimated(names: AnimatedName[]): Promise<void> {
  const loader = new GLTFLoader();
  await Promise.all(
    names.map(async (name) => {
      try {
        const gltf = await loader.loadAsync(`models/${name}.glb`);
        sources.set(name, { scene: gltf.scene, clips: gltf.animations });
      } catch (err) {
        console.warn(`Percipi: no ${name} model, keeping the stand-in`, err);
      }
    }),
  );
}

export interface AnimatedInstance {
  root: Object3D; // the model itself, feet at y = 0, facing +z
  mixer: AnimationMixer;
  clip(name: string): AnimationClip | undefined;
  size: Vector3; // bind-pose size in metres before any scaling
}

// A fresh copy of a preloaded model with its own animation mixer (null if it failed to load).
export function instanceOf(name: AnimatedName): AnimatedInstance | null {
  const src = sources.get(name);
  if (!src) return null;
  const model = cloneSkinned(src.scene);
  model.traverse((o) => {
    if (o instanceof Mesh) o.frustumCulled = false; // bones move it beyond its bind-pose bounds
  });
  // Skinned bounds depend on the skeleton's world matrices, so place it first.
  model.updateMatrixWorld(true);
  const box = new Box3().setFromObject(model);
  const size = box.getSize(new Vector3());
  const centre = box.getCenter(new Vector3());
  const root = new Group();
  model.position.set(-centre.x, -box.min.y, -centre.z);
  root.add(model);
  const mixer = new AnimationMixer(model);
  mixers.push(mixer);
  return { root, mixer, size, clip: (n) => src.clips.find((c) => c.name === n) };
}

// Advance every animation (the walk and the replay both call this each frame).
export function updateAnimations(dt: number): void {
  for (const m of mixers) m.update(dt);
}

export interface AnimatedProp {
  model: AnimatedName;
  clip: string; // looping animation it plays
  yawDeg: number; // which way it faces (0 = +z, 90 = +x)
}

// Put an animated model inside a perceivable object's box. The box stays as the
// object's sight volume and dissolve state but is no longer drawn; the model is
// fitted inside it (uniformly scaled) and dissolves with it.
export function attachAnimated(p: Perceivable, spec: AnimatedProp): boolean {
  const inst = instanceOf(spec.model);
  if (!inst) return false;
  const boxMat = p.mesh.material as MeshStandardMaterial;
  inst.root.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const old = o.material as MeshStandardMaterial;
    const mat = createDissolveMaterial(0xffffff, 0, boxMat);
    mat.color.copy(old.color);
    mat.map = old.map;
    mat.side = old.side;
    o.material = mat;
  });

  // Undo the box's (non-uniform) scale so the model keeps its proportions.
  const holder = new Group();
  const s = p.mesh.scale;
  holder.scale.set(1 / s.x, 1 / s.y, 1 / s.z);
  holder.position.y = -0.5; // the box's floor
  const turn = new Group();
  turn.rotation.y = (spec.yawDeg * Math.PI) / 180;
  turn.add(inst.root);
  turn.updateMatrixWorld(true);
  const turned = new Box3().setFromObject(turn).getSize(new Vector3());
  turn.scale.setScalar(Math.min(s.x / turned.x, s.y / turned.y, s.z / turned.z));
  holder.add(turn);
  p.mesh.add(holder);
  boxMat.visible = false; // the model is drawn instead of the box

  const clip = inst.clip(spec.clip);
  if (clip) inst.mixer.clipAction(clip).play();
  return true;
}
