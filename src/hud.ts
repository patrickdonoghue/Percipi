import { TUNING } from './tuning';

// Performance HUD: FPS, draw calls, triangles, and how many objects currently exist.
export class Hud {
  private readonly el = document.getElementById('hud')!;
  private frames = 0;
  private elapsed = 0;

  frame(dt: number, drawCalls: number, triangles: number, present: number, total: number): void {
    this.frames++;
    this.elapsed += dt;
    if (this.elapsed < TUNING.hud.updateIntervalSeconds) return;
    const fps = Math.round(this.frames / this.elapsed);
    this.el.textContent =
      `FPS ${fps}\n` + `Draw calls ${drawCalls}\n` + `Triangles ${triangles}\n` + `Sensed ${present}/${total}`;
    this.frames = 0;
    this.elapsed = 0;
  }
}
