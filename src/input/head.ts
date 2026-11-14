import { DEG, TUNING } from '../tuning';

// The character's head orientation. Every input (mouse, touch, later gyro) drives this one state.
export interface Head {
  yaw: number; // radians, turning left/right
  pitch: number; // radians, looking up/down
}

export interface MoveVector {
  x: number; // strafe: -1 left .. +1 right
  y: number; // walk: -1 back .. +1 forward
}

export function applyLook(head: Head, dx: number, dy: number, sensitivity: number): void {
  const limit = TUNING.player.pitchLimitDeg * DEG;
  head.yaw -= dx * sensitivity;
  head.pitch = Math.max(-limit, Math.min(limit, head.pitch - dy * sensitivity));
}

export function combineMoves(...moves: MoveVector[]): MoveVector {
  let x = 0;
  let y = 0;
  for (const m of moves) {
    x += m.x;
    y += m.y;
  }
  const len = Math.hypot(x, y);
  return len > 1 ? { x: x / len, y: y / len } : { x, y };
}
