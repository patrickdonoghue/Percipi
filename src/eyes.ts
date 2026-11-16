import { TUNING } from './tuning';

// He wakes with his eyes closed: a black screen while the alarm rings.
// A tap / click / key press opens them; the black fades away.
export class Eyes {
  private openFlag = false;
  private shownAt = 0;
  private openedAt: number | null = null;
  private readonly el: HTMLDivElement;

  constructor(private readonly onOpen: () => void) {
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    this.el = document.createElement('div');
    this.el.className = 'eyes';
    this.el.textContent = isTouch ? 'tap to open your eyes' : 'click or press any key to open your eyes';
    this.el.style.display = 'none';
    this.el.style.transition = `opacity ${TUNING.eyes.openSeconds}s ease-out`;
    document.body.appendChild(this.el);
    document.addEventListener('pointerdown', () => this.tryOpen());
    window.addEventListener('keydown', () => this.tryOpen());
  }

  get isOpen(): boolean {
    return this.openFlag;
  }

  // Seconds since the eyes opened (null while closed).
  sinceOpen(now: number): number | null {
    return this.openedAt === null ? null : (now - this.openedAt) / 1000;
  }

  // Called by the wake-up tap: start with eyes closed.
  close(): void {
    this.shownAt = performance.now();
    this.el.style.display = '';
  }

  private tryOpen(): void {
    if (this.openFlag || this.el.style.display === 'none') return;
    if (performance.now() - this.shownAt < TUNING.eyes.ignoreTapSeconds * 1000) return;
    this.openFlag = true;
    this.openedAt = performance.now();
    this.el.style.opacity = '0';
    this.el.style.pointerEvents = 'none';
    window.setTimeout(() => (this.el.style.display = 'none'), TUNING.eyes.openSeconds * 1000 + 50);
    this.onOpen();
  }
}
