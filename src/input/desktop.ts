import { TUNING } from '../tuning';
import { applyLook, type Head, type MoveVector } from './head';

// WASD / arrow keys to move, mouse look while pointer-locked (or click-drag
// if pointer lock is unavailable), E to open/close doors.
export class DesktopInput {
  readonly move: MoveVector = { x: 0, y: 0 };
  enabled = true;
  private readonly keys = new Set<string>();

  constructor(canvas: HTMLCanvasElement, head: Head, onInteract: () => void) {
    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      this.keys.add(e.code);
      if (e.code === 'KeyE' && !e.repeat) onInteract();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    document.addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      const locked = document.pointerLockElement === canvas;
      const dragging = e.buttons !== 0 && e.target === canvas;
      if (!locked && !dragging) return;
      applyLook(head, e.movementX, e.movementY, TUNING.input.mouseSensitivity);
    });
  }

  update(): void {
    if (!this.enabled) {
      this.keys.clear();
      this.move.x = 0;
      this.move.y = 0;
      return;
    }
    const k = (...codes: string[]) => (codes.some((c) => this.keys.has(c)) ? 1 : 0);
    this.move.x = k('KeyD', 'ArrowRight') - k('KeyA', 'ArrowLeft');
    this.move.y = k('KeyW', 'ArrowUp') - k('KeyS', 'ArrowDown');
  }
}
