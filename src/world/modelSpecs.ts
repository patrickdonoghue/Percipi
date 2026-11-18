import type { Direction } from './door';

// Which model replaces which grey box (scene data, keyed by the ids in layout.ts).
// `files` are laid side by side (left to right as you face the front), so a
// counter can be a row of cabinets with the stove where the bacon is.
// `face` is the way the model's front points ('-z' = up the plan, towards the backyard).
// Missing here = stays a grey box (trees, hedges, dog, caller, bacon pan, porch posts).
// Walls, floors and windows are built from the plan (see surfaces.ts), not from models.
export interface ModelSpec {
  files: string[];
  face: Direction;
  node?: string; // use only this part of the model (e.g. the door leaf without its frame)
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
  door_front: { files: ['doorwayFront'], node: 'door', face: '+z' },
  door_patio: { files: ['doorwayFront'], node: 'door', face: '+z' },
  door_bed2: { files: ['doorway'], node: 'door', face: '+z' },
  door_bed1: { files: ['doorway'], node: 'door', face: '+z' },
  door_bath: { files: ['doorway'], node: 'door', face: '+z' },
};
