import { TUNING } from '../tuning';
import { applyLook, type Head, type MoveVector } from './head';

// Twin-stick touch: left half of the screen is a floating joystick, right half drags to look.
// (Gyro look joins this in a later step.)
export class TouchInput {
  readonly move: MoveVector = { x: 0, y: 0 };
  private enabledFlag = true;
  private joyId: number | null = null;
  private joyOrigin = { x: 0, y: 0 };
  private lookId: number | null = null;
  private lookLast = { x: 0, y: 0 };
  private readonly ring: HTMLDivElement;
  private endAll: () => void = () => {};

  set enabled(on: boolean) {
    this.enabledFlag = on;
    if (!on) this.endAll();
  }

  constructor(canvas: HTMLCanvasElement, head: Head) {
    this.ring = document.createElement('div');
    this.ring.className = 'joystick';
    document.body.appendChild(this.ring);

    canvas.addEventListener('pointerdown', (e) => {
      if (!this.enabledFlag || e.pointerType !== 'touch') return;
      canvas.setPointerCapture(e.pointerId);
      if (e.clientX < window.innerWidth / 2 && this.joyId === null) {
        this.joyId = e.pointerId;
        this.joyOrigin = { x: e.clientX, y: e.clientY };
        this.ring.style.left = `${e.clientX}px`;
        this.ring.style.top = `${e.clientY}px`;
        this.ring.style.display = 'block';
      } else if (this.lookId === null) {
        this.lookId = e.pointerId;
        this.lookLast = { x: e.clientX, y: e.clientY };
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.joyId) {
        const r = TUNING.input.joystickRadiusPx;
        let dx = (e.clientX - this.joyOrigin.x) / r;
        let dy = (e.clientY - this.joyOrigin.y) / r;
        const len = Math.hypot(dx, dy);
        if (len > 1) {
          dx /= len;
          dy /= len;
        }
        this.move.x = dx;
        this.move.y = -dy; // dragging up walks forward
      } else if (e.pointerId === this.lookId) {
        applyLook(head, e.clientX - this.lookLast.x, e.clientY - this.lookLast.y, TUNING.input.touchLookSensitivity);
        this.lookLast = { x: e.clientX, y: e.clientY };
      }
    });

    const end = (e: PointerEvent) => {
      if (e.pointerId === this.joyId) {
        this.joyId = null;
        this.move.x = 0;
        this.move.y = 0;
        this.ring.style.display = 'none';
      } else if (e.pointerId === this.lookId) {
        this.lookId = null;
      }
    };
    this.endAll = () => {
      this.joyId = null;
      this.lookId = null;
      this.move.x = 0;
      this.move.y = 0;
      this.ring.style.display = 'none';
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }
}
