import type { Mesh, Vector3 } from 'three';

// The shared sensory tag system. Every perceivable object carries these.
export interface SenseTags {
  sight: boolean; // can be seen
  blocksSight: boolean; // stops lines of sight (walls, doors, furniture)
  sound?: { radius: number }; // makes sound that can be heard up to `radius` metres away
  smell?: true; // gives off a smell plume
}

export type Kind = 'floor' | 'wall' | 'furniture' | 'door' | 'prop';

export interface Perceivable {
  id: string;
  kind: Kind;
  mesh: Mesh;
  tags: SenseTags;
  dynamic: boolean; // moves (doors), so sample points are refreshed each frame
  localSamples: Vector3[]; // line-of-sight sample points in the mesh's own space
  samples: Vector3[]; // same points in world space

  // Written by the perception engine each frame; read by rendering.
  sensed: { sight: boolean; sound: boolean; smell: boolean };
  present: boolean; // does this object exist right now? (seen; heard-only shows hazy in the replay)
}
