// Stand-in test house for Phase 0 (until Patrick's floor plan is added).
// Units are metres. x runs east, z runs south-to-north (backyard is at high z).
//
//   z=10 +-----------+--door--+-----------------+   backyard beyond (z > 10)
//        |  kitchen  |        |  den            |
//        |           |  hall  +--------+  (gap) |   <- blind corner into den
//   z=6  +-----------+        |        lounge   |
//        |  bath     |        |                 |
//   z=4  +-----------+        |                 |
//        |  bedroom  door     |                 |
//   z=0  +-----------+-front--+-----------------+   front yard (z < 0)
//       x=0         x=4      x=6               x=11

import type { BoxSpec } from './build';
import type { DoorDef } from './door';
import { doorway, windowGap, type WallDef } from './walls';

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
}

export const SPAWN = { x: 2.6, z: 2.4, yaw: -Math.PI / 2 }; // in the bedroom, facing the door (east)

export const BOUNDS: Rect = { minX: -3, minZ: -5, maxX: 14, maxZ: 18 };

export const FLOORS: FloorDef[] = [
  { id: 'bedroom_floor', rect: { minX: 0, minZ: 0, maxX: 4, maxZ: 4 }, outdoor: false },
  { id: 'bath_floor', rect: { minX: 0, minZ: 4, maxX: 4, maxZ: 6 }, outdoor: false },
  { id: 'kitchen_floor', rect: { minX: 0, minZ: 6, maxX: 4, maxZ: 10 }, outdoor: false },
  { id: 'hall_floor', rect: { minX: 4, minZ: 0, maxX: 6, maxZ: 10 }, outdoor: false },
  { id: 'lounge_floor', rect: { minX: 6, minZ: 0, maxX: 11, maxZ: 6 }, outdoor: false },
  { id: 'den_floor', rect: { minX: 6, minZ: 6, maxX: 11, maxZ: 10 }, outdoor: false },
  { id: 'yard_floor', rect: { minX: -3, minZ: 10, maxX: 14, maxZ: 18 }, outdoor: true },
  { id: 'front_floor', rect: { minX: -3, minZ: -5, maxX: 14, maxZ: 0 }, outdoor: true },
  { id: 'westside_floor', rect: { minX: -3, minZ: 0, maxX: 0, maxZ: 10 }, outdoor: true },
  { id: 'eastside_floor', rect: { minX: 11, minZ: 0, maxX: 14, maxZ: 10 }, outdoor: true },
];

export const WALLS: WallDef[] = [
  // Outer walls
  { id: 'wall_south', a: [0, 0], b: [11, 0], gaps: [windowGap(1, 3), doorway(4.5, 5.5), windowGap(7.5, 9.5)] },
  { id: 'wall_north', a: [0, 10], b: [11, 10], gaps: [windowGap(1, 3), doorway(4.4, 5.4), windowGap(8, 10)] },
  { id: 'wall_west', a: [0, 0], b: [0, 10] },
  { id: 'wall_east', a: [11, 0], b: [11, 10], gaps: [windowGap(2, 4)] },
  // Interior walls
  { id: 'wall_hall_west', a: [4, 0], b: [4, 10], gaps: [doorway(1.4, 2.4), doorway(4.6, 5.4), doorway(7.4, 8.6)] },
  { id: 'wall_hall_east', a: [6, 0], b: [6, 10], gaps: [doorway(2.5, 4.0)] },
  { id: 'wall_bed_bath', a: [0, 4], b: [4, 4] },
  { id: 'wall_bath_kitchen', a: [0, 6], b: [4, 6] },
  { id: 'wall_lounge_den', a: [6, 6], b: [9, 6] }, // leaves a gap at x 9..11: the blind corner
];

export const DOORS: DoorDef[] = [
  { id: 'door_bedroom', hinge: [4, 1.42], along: 'z', width: 0.96, swingSign: -1 }, // swings into the bedroom
  { id: 'door_back', hinge: [4.42, 10], along: 'x', width: 0.96, swingSign: -1 }, // swings out to the yard
];

const f = (id: string, min: BoxSpec['min'], max: BoxSpec['max']): BoxSpec => ({ id, kind: 'furniture', min, max });
const prop = (id: string, min: BoxSpec['min'], max: BoxSpec['max']): BoxSpec => ({ id, kind: 'prop', min, max });

export const FURNITURE: BoxSpec[] = [
  f('bedroom_bed', [0.2, 0, 0.2], [2.2, 0.55, 1.8]),
  f('bedroom_nightstand', [2.4, 0, 0.2], [2.9, 0.55, 0.6]),
  f('bedroom_wardrobe', [0.2, 0, 3.2], [1.8, 2.0, 3.8]),
  prop('bedroom_alarmclock', [2.55, 0.55, 0.3], [2.75, 0.68, 0.42]),
  f('bath_tub', [0.2, 0, 4.2], [1.9, 0.6, 5.8]),
  f('bath_sink', [3.2, 0, 4.2], [3.8, 0.9, 4.7]),
  f('kitchen_counter', [0.2, 0, 6.2], [0.8, 0.9, 9.8]),
  f('kitchen_island', [1.8, 0, 7.5], [3.0, 0.9, 8.7]),
  f('kitchen_fridge', [3.2, 0, 9.2], [3.8, 1.9, 9.8]),
  prop('kitchen_bacon', [0.35, 0.9, 7.8], [0.65, 0.98, 8.2]),
  f('hall_sidetable', [5.4, 0, 5.5], [5.85, 0.8, 6.5]),
  f('lounge_sofa', [7, 0, 0.3], [9.5, 0.8, 1.2]),
  f('lounge_coffeetable', [7.5, 0, 2], [9, 0.45, 2.8]),
  f('lounge_tvcabinet', [10.3, 0, 1.5], [10.8, 1.0, 4]),
  f('lounge_armchair', [9.6, 0, 4.4], [10.4, 0.8, 5.2]),
  f('den_desk', [6.3, 0, 9.2], [7.8, 0.75, 9.8]),
  f('den_bookshelf', [6.2, 0, 6.3], [6.6, 2.0, 8.5]),
  prop('den_caller', [8, 0, 8], [8.4, 1.7, 8.4]),
  // Backyard
  f('yard_treetrunk', [2, 0, 14], [2.4, 3, 14.4]),
  f('yard_treecanopy', [1, 2.5, 13], [3.4, 4.5, 15.4]),
  prop('yard_dog', [7, 0, 13], [7.8, 0.6, 13.4]),
  f('yard_doghouse', [9, 0, 14], [10.2, 1.1, 15.2]),
  // Front yard
  f('front_mailbox', [5, 0, -2], [5.2, 1.1, -1.8]),
];
