// The house and yard from Patrick's floor plan (docs/floorplan.png).
// Numbers are plan pixel coordinates; see plan.ts for how they map to metres.
// Simplifications for the grey box: closet bifold doors are drawn as solid
// walls, and the patio slider is a wide hinged door for now.

import type { BoxSpec } from './build';
import type { DoorDef } from './door';
import { boxPx, chunkedBoxPx, doorPx, mx, mz, PX_PER_M, rectPx, wallPx } from './plan';
import { TREE_SHAPES, type TreeShapeName } from './modelSpecs';
import type { WallDef } from './walls';
import { TUNING } from '../tuning';

const C = TUNING.render.colors;

export interface Rect {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

export interface FloorDef {
  id: string;
  rect: Rect;
  outdoor: boolean;
  top?: number; // raised slabs (patio, porch, sidewalk), metres
  color: number;
}

// Bedroom #1, standing beside the bed, facing the bedroom door (north-west).
export const SPAWN = { x: mx(1110), z: mz(1185), yaw: Math.PI / 4 };

// How far you can walk: the sidewalk's full width, back to the rear fence.
export const BOUNDS: Rect = rectPx(0, 230, 1918, 1790);

// The open-plan kitchen + living area (the dog barks when he first walks in).
export const LIVING_AREA: Rect = rectPx(504, 589, 897, 1350);

// The house footprint (stepping outside it sets off the caller).
export const HOUSE_AREA: Rect = rectPx(504, 589, 1376, 1350);

const FENCE_HEIGHT = 1.8;
const HEDGE_HEIGHT = 1.5;
const HEDGE_PIECE = 2.0;

export const FLOORS: FloorDef[] = [
  // Inside
  // Kitchen + living are open plan; the kitchen end is tiled, the rest is wood.
  { id: 'kitchen_floor', rect: rectPx(504, 589, 897, 950), outdoor: false, color: C.tileFloor },
  { id: 'living_floor', rect: rectPx(504, 950, 897, 1350), outdoor: false, color: C.woodFloor },
  { id: 'hall_floor', rect: rectPx(897, 893, 1088, 1043), outdoor: false, color: C.woodFloor },
  { id: 'bed2_floor', rect: rectPx(990, 589, 1376, 893), outdoor: false, color: C.woodFloor },
  { id: 'bath_floor', rect: rectPx(1088, 893, 1376, 1043), outdoor: false, color: C.tileFloor },
  { id: 'bed1_floor', rect: rectPx(990, 1043, 1376, 1350), outdoor: false, color: C.woodFloor },
  // Outside
  { id: 'backyard_floor', rect: rectPx(203, 230, 1740, 589), outdoor: true, color: C.grass },
  { id: 'westyard_floor', rect: rectPx(203, 589, 504, 1350), outdoor: true, color: C.grass },
  { id: 'eastyard_floor', rect: rectPx(1376, 589, 1740, 1350), outdoor: true, color: C.grass },
  { id: 'frontyard_floor', rect: rectPx(203, 1350, 1740, 1645), outdoor: true, color: C.grass },
  { id: 'patio_floor', rect: rectPx(497, 417, 900, 582), outdoor: true, top: 0.1, color: C.concrete },
  { id: 'porch_floor', rect: rectPx(560, 1357, 910, 1522), outdoor: true, top: 0.1, color: C.concrete },
  { id: 'sidewalk_floor', rect: rectPx(0, 1645, 1918, 1790), outdoor: true, top: 0.02, color: C.concrete },
];

export const WALLS: WallDef[] = [
  // Outer walls
  { ...wallPx('wall_north', [504, 589], [1376, 589], [['window', 557, 650], ['door', 745, 835], ['sidelight', 835, 880], ['window', 1113, 1250]]), outward: '-z' },
  { ...wallPx('wall_south', [504, 1350], [1376, 1350], [['window', 590, 722], ['door', 800, 880], ['window', 1113, 1250]]), outward: '+z' },
  { ...wallPx('wall_west', [504, 589], [504, 1350], [['window', 940, 1075]]), outward: '-x' },
  { ...wallPx('wall_east', [1376, 589], [1376, 1350], [['window', 940, 1000]]), outward: '+x' },
  // Closet column (between the living area and the bedrooms), open to the hall in the middle
  wallPx('wall_closets_north_w', [897, 589], [897, 893]),
  wallPx('wall_closets_south_w', [897, 1043], [897, 1350]),
  wallPx('wall_closets_north_e', [990, 589], [990, 893]),
  wallPx('wall_closets_south_e', [990, 1043], [990, 1350]),
  // Hall: bedroom #2 + bath on the north side, bedroom #1 on the south side
  wallPx('wall_hall_north', [897, 893], [1376, 893], [['door', 997, 1080]]),
  wallPx('wall_hall_south', [897, 1043], [1376, 1043], [['door', 997, 1080]]),
  wallPx('wall_bath_west', [1088, 893], [1088, 1043], [['door', 962, 1035]]), // a narrower door, so it swings clear of the vanity
  // Yard fence (open to the sidewalk at the front)
  { ...wallPx('fence_west', [203, 230], [203, 1615], [], FENCE_HEIGHT), color: C.fence },
  { ...wallPx('fence_north', [203, 230], [1740, 230], [], FENCE_HEIGHT), color: C.fence },
  { ...wallPx('fence_east', [1740, 230], [1740, 1603], [], FENCE_HEIGHT), color: C.fence },
];

export const DOORS: DoorDef[] = [
  // ('-z' = up the plan, towards the backyard)
  doorPx('door_front', [880, 1350], '-x', 80, -1, 0), // opens into the living area; starts shut
  doorPx('door_patio', [745, 589], '+x', 90, 1, 0), // starts shut; out to the patio; a fixed glass panel fills the rest of the opening
  doorPx('door_bed2', [997, 893], '+x', 83, 1), // into bedroom #2 (hinge at the closet wall's face, not its middle)
  doorPx('door_bed1', [997, 1043], '+x', 83, -1), // into bedroom #1
  doorPx('door_bath', [1088, 1035], '-z', 73, -1), // into the bath
];

const f = (id: string, x1: number, y1: number, x2: number, y2: number, h: number, y0 = 0): BoxSpec =>
  boxPx(id, 'furniture', x1, y1, x2, y2, y0, h);
const prop = (id: string, x1: number, y1: number, x2: number, y2: number, h: number, y0 = 0): BoxSpec =>
  boxPx(id, 'prop', x1, y1, x2, y2, y0, h);

// A tree: trunk box plus a canopy box, centred on a plan point, sized to its model.
export const TREES: { id: string; shape: TreeShapeName; height: number }[] = [];
function tree(id: string, cx: number, cy: number, shape: TreeShapeName, height: number): BoxSpec[] {
  TREES.push({ id, shape, height });
  const sh = TREE_SHAPES[shape];
  const t = (sh.trunk * height * PX_PER_M) / 2; // half-widths in plan pixels
  const c = (sh.width * height * PX_PER_M * 0.85) / 2; // canopy box just inside the leaves
  const leaves = sh.leavesFrom * height;
  return [f(`${id}_trunk`, cx - t, cy - t, cx + t, cy + t, leaves + 0.3), f(`${id}_canopy`, cx - c, cy - c, cx + c, cy + c, height, leaves)];
}

// Front porch: two posts holding a flat roof that meets the house wall.
// The roof is a 'wall' piece so the replay's dollhouse cut removes it with the walls.
function porch(): BoxSpec[] {
  const { postHeight: h, roofThickness, roofOverhangPx: o } = TUNING.porch;
  const trim = (b: BoxSpec): BoxSpec => ({ ...b, color: C.porchTrim });
  return [
    trim(f('porch_post_w', 558, 1508, 575, 1524, h)),
    trim(f('porch_post_e', 895, 1508, 912, 1524, h)),
    trim(boxPx('porch_roof', 'wall', 558 - o, 1357, 912 + o, 1524 + o, h, h + roofThickness)),
  ];
}

export const FURNITURE: BoxSpec[] = [
  // Kitchen
  f('kitchen_counter_west', 511, 597, 570, 925, 0.9),
  f('kitchen_counter_north', 570, 597, 712, 650, 0.9),
  f('kitchen_island', 650, 735, 735, 905, 0.9),
  f('kitchen_stool_0', 740, 748, 762, 778, 0.65),
  f('kitchen_stool_1', 740, 808, 762, 838, 0.65),
  f('kitchen_stool_2', 740, 862, 762, 892, 0.65),
  prop('kitchen_bacon', 525, 700, 560, 760, 1.0, 0.9), // the egg pan (sized to keep its shape)
  // Living area
  f('living_sofa_back', 547, 1120, 615, 1300, 0.8),
  f('living_sofa_return', 547, 1055, 697, 1120, 0.8),
  f('living_coffeetable', 642, 1165, 697, 1270, 0.45),
  // Bedrooms
  f('bed2_bed', 1182, 667, 1365, 818, 0.55),
  f('bed1_bed', 1182, 1120, 1365, 1272, 0.55),
  f('bed1_nightstand', 1328, 1050, 1366, 1088, 0.55),
  prop('bed1_alarmclock', 1338, 1058, 1358, 1078, 0.68, 0.55),
  // Bath
  f('bath_vanity', 1095, 900, 1200, 960, 0.85),
  f('bath_toilet', 1225, 905, 1265, 970, 0.75),
  f('bath_tub', 1300, 905, 1365, 1030, 0.55),
  // Porch posts
  ...porch(),
  // Yard
  ...tree('yard_tree_big', 347, 362, 'round', 4.0),
  ...tree('yard_tree_ne1', 1492, 320, 'tallPine', 4.0),
  ...tree('yard_tree_ne2', 1652, 345, 'tallPine', 3.8),
  ...tree('yard_tree_ne3', 1664, 503, 'round', 3.2),
  ...chunkedBoxPx('yard_hedge_west', 'furniture', 245, 543, 315, 1503, HEDGE_HEIGHT, HEDGE_PIECE),
  ...chunkedBoxPx('yard_hedge_east', 'furniture', 1631, 617, 1699, 1580, HEDGE_HEIGHT, HEDGE_PIECE),
  prop('yard_dog', 680, 310, 752, 345, 0.6),
  prop('yard_caller', 1542, 422, 1578, 458, TUNING.caller.height), // backyard north-east corner, by the trees
];
