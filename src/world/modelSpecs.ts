import { TUNING } from '../tuning';
import type { Perceivable } from '../perception/tags';
import type { AnimatedProp } from './animated';
import { dogRoutine } from './dogRoutine';
import type { Direction } from './door';

// Which model replaces which grey box (scene data, keyed by the ids in layout.ts).
// `files` are laid side by side (left to right as you face the front), so a
// counter can be a row of cabinets with the stove where the bacon is.
// `face` is the way the model's front points ('-z' = up the plan, towards the backyard).
// Missing here = stays a grey box (porch posts). Trees: see TREE_SHAPES; hedges and the sidewalk: decor.ts.
// Walls, floors and windows are built from the plan (see surfaces.ts), not from models.
export interface ModelSpec {
  files: string[];
  face: Direction;
  node?: string; // use only this part of the model (e.g. the door leaf without its frame)
  tint?: number; // multiplies the model's own colours (the red front door)
}

const CAB = 'kitchenCabinet';

export const MODEL_SPECS: Record<string, ModelSpec> = {
  // Kitchen. The west counter runs south to north as seen from the room; the stove sits under the bacon.
  kitchen_counter_west: { files: [CAB, CAB, CAB, 'kitchenStove', CAB, CAB], face: '+x' },
  kitchen_counter_north: { files: ['kitchenSink', CAB, CAB], face: '+z' },
  kitchen_island: { files: [CAB, CAB, CAB], face: '-x' },
  kitchen_stool_0: { files: ['stoolBar'], face: '-x' },
  kitchen_stool_1: { files: ['stoolBar'], face: '-x' },
  kitchen_stool_2: { files: ['stoolBar'], face: '-x' },
  // The pan on the stove (the bacon smell and sizzle come from here); handle along the counter.
  kitchen_bacon: { files: ['frying_pan_with_fried_eggs/scene.gltf'], face: '+x' },
  // Living area
  living_sofa_back: { files: ['loungeSofaLong'], face: '+x' },
  living_sofa_return: { files: ['loungeSofa'], face: '+z' },
  living_coffeetable: { files: ['tableCoffee'], face: '+x' },
  // Bedrooms (headboards against the east wall)
  bed2_bed: { files: ['bedDouble'], face: '-x' },
  bed1_bed: { files: ['bedDouble'], face: '-x' },
  bed1_nightstand: { files: ['cabinetBedDrawer'], face: '-x' },
  bed1_alarmclock: { files: ['radio'], face: '-x' }, // a clock radio, until there's an alarm clock model
  // Bath
  bath_vanity: { files: ['bathroomCabinetDrawer', 'bathroomCabinetDrawer'], face: '+z' },
  bath_toilet: { files: ['toilet'], face: '+z' },
  bath_tub: { files: ['bathtub'], face: '-x' },
  // Doors: just the leaf from the kit's doorways. Outside doors have a glass panel.
  door_front: { files: ['doorwayFront'], node: 'door', face: '+z', tint: TUNING.render.colors.frontDoor },
  door_patio: { files: ['doorwayFront'], node: 'door', face: '+z' },
  door_bed2: { files: ['doorway'], node: 'door', face: '+z' },
  door_bed1: { files: ['doorway'], node: 'door', face: '+z' },
  door_bath: { files: ['doorway'], node: 'door', face: '+z' },
};

// The yard fence: wall pieces named fence_* get privacy-fence panels, as many
// as fit the piece's length (a panel is as long as it is tall).
const FENCE_FILE = 'privacy_fence/scene.gltf';
export function modelSpecFor(p: Perceivable): ModelSpec | undefined {
  const spec = MODEL_SPECS[p.id];
  if (spec || !p.id.startsWith('fence_') || p.kind !== 'wall') return spec;
  const s = p.mesh.scale;
  const alongX = s.x >= s.z;
  const panels = Math.max(1, Math.round((alongX ? s.x : s.z) / s.y));
  return { files: Array<string>(panels).fill(FENCE_FILE), node: 'Fence_Full', face: alongX ? '+z' : '+x' };
}

// Trees, from Patrick's low-poly forest set (one file, several trees in it).
// Each yard tree is a trunk box and a canopy box (layout.ts); this says which
// tree from the file it is and its proportions, so the boxes match the model.
// Node names as Three.js loads them (spaces become underscores).
export const TREE_FILE = 'low_polly_forest_trees/scene.gltf';
export const TRUNK_MATERIAL = 'Material.001'; // the brown one; everything else is leaves

export interface TreeShape {
  node: string;
  width: number; // canopy width / tree height
  leavesFrom: number; // where the leaves start, as a fraction of the height
  trunk: number; // trunk width / tree height
}

export const TREE_SHAPES = {
  round: { node: 'tree_3_3', width: 0.66, leavesFrom: 0.32, trunk: 0.07 },
  pine: { node: 'tree_2__1', width: 0.77, leavesFrom: 0.29, trunk: 0.08 },
  tallPine: { node: 'tree_4__4', width: 0.55, leavesFrom: 0.19, trunk: 0.06 },
} satisfies Record<string, TreeShape>;
export type TreeShapeName = keyof typeof TREE_SHAPES;

// Animated models placed in an object's box (see animated.ts).
export const ANIMATED_PROPS: Record<string, AnimatedProp> = {
  yard_dog: { model: 'dog', clip: 'Idle1', yawDeg: TUNING.dog.yawDeg, height: TUNING.dog.height, routine: dogRoutine }, // turned towards the patio door
  // Facing the house from the corner, in different clothes from the main figure.
  yard_caller: { model: 'man', clip: 'idle', yawDeg: -45, height: TUNING.caller.height, recolor: TUNING.caller.recolor, watchPlayer: true },
};
