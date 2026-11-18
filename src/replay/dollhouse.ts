import { TUNING } from '../tuning';
import type { Perceivable } from '../perception/tags';

interface Piece {
  p: Perceivable;
  minY: number; // bottom of the piece (in its parent's space)
  maxY: number; // top of the piece
}

// Replay view: walls and doors are shown cut down to a low height so we can
// see into the rooms from above. Pieces entirely above the cut are hidden.
export class Dollhouse {
  private readonly pieces: Piece[];
  private readonly hiddenSet = new Set<Perceivable>();

  constructor(items: readonly Perceivable[]) {
    this.pieces = items
      .filter((p) => p.kind === 'wall' || p.kind === 'door' || p.kind === 'glass')
      .map((p) => ({
        p,
        minY: p.mesh.position.y - p.mesh.scale.y / 2,
        maxY: p.mesh.position.y + p.mesh.scale.y / 2,
      }));
  }

  private amount = 0;

  // Temporarily restore full-height walls (sight snapshots must see real walls).
  withFullWalls(fn: () => void): void {
    const keep = this.amount;
    this.setCut(0);
    fn();
    this.setCut(keep);
  }

  // 0 = full height (POV), 1 = fully cut (replay).
  setCut(amount: number): void {
    this.amount = amount;
    const full = TUNING.house.wallHeight;
    const h = full + (TUNING.replay.wallCutHeight - full) * amount;
    this.hiddenSet.clear();
    for (const piece of this.pieces) {
      const top = Math.min(piece.maxY, h);
      if (top <= piece.minY + 1e-3) {
        this.hiddenSet.add(piece.p);
        continue;
      }
      piece.p.mesh.scale.y = top - piece.minY;
      piece.p.mesh.position.y = (piece.minY + top) / 2;
    }
  }

  readonly isHidden = (p: Perceivable): boolean => this.hiddenSet.has(p);
}
