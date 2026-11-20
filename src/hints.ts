import { TUNING } from './tuning';

// Quiet "how to move" hints for people who don't play games. One short line
// appears by itself near the bottom when the walk starts (and again when the
// replay starts), fades once you've done the thing or after a while, and a
// small "?" button (or the H key) brings it back.

export type HintStage = 'walk' | 'replay';

const TEXT: Record<HintStage, { mouse: string; touch: string }> = {
  walk: {
    mouse: 'WASD or arrow keys to walk · mouse to look · E opens doors',
    touch: 'Drag left side to walk · drag right side to look · tap a door button to open it',
  },
  replay: {
    mouse: 'Drag to turn · scroll to zoom · Space pauses · drag the bar to rewind',
    touch: 'Drag to turn · pinch to zoom · ❚❚ pauses · drag the bar to rewind',
  },
};

export class Hints {
  private readonly line = document.createElement('div');
  private readonly help = document.createElement('button');
  private readonly isTouch = window.matchMedia('(pointer: coarse)').matches;
  private stage: HintStage | null = null;
  private shownAt = 0;
  private finishing = false; // done() already called for the hint on screen
  private auto = false; // shown by itself (not asked for with "?"), so done() may close it
  private timers: number[] = [];

  constructor() {
    this.line.className = 'controls-hint';
    this.help.className = 'help-button';
    this.help.textContent = '?';
    this.help.title = 'Show the controls (H)';
    this.help.setAttribute('aria-label', 'Show the controls');
    this.help.style.display = 'none';
    this.help.addEventListener('click', () => {
      this.help.blur();
      this.toggle();
    });
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyH' && !e.repeat && this.stage) this.toggle();
    });
    document.body.append(this.line, this.help);
  }

  get visible(): boolean {
    return this.line.classList.contains('visible');
  }

  // Start a stage: its hint appears after a short pause.
  setStage(stage: HintStage | null): void {
    this.stage = stage;
    this.hide();
    this.help.style.display = stage ? '' : 'none';
    if (stage) this.later(() => this.show(true), TUNING.hints.delaySeconds);
  }

  // The player has done what the hint says: let it go (after it's been readable).
  done(): void {
    if (!this.visible || !this.auto || this.finishing) return;
    this.finishing = true;
    const left = TUNING.hints.minSeconds - (performance.now() - this.shownAt) / 1000;
    this.later(() => this.hide(), Math.max(0, left));
  }

  private toggle(): void {
    if (this.visible) this.hide();
    else this.show(false);
  }

  private show(auto: boolean): void {
    if (!this.stage) return;
    this.clearTimers();
    const t = TEXT[this.stage];
    this.line.textContent = this.isTouch ? t.touch : t.mouse;
    this.line.classList.add('visible');
    this.shownAt = performance.now();
    this.finishing = false;
    this.auto = auto;
    this.later(() => this.hide(), TUNING.hints.maxSeconds);
  }

  private hide(): void {
    this.clearTimers();
    this.line.classList.remove('visible');
  }

  private later(fn: () => void, seconds: number): void {
    this.timers.push(window.setTimeout(fn, seconds * 1000));
  }

  private clearTimers(): void {
    for (const t of this.timers) window.clearTimeout(t);
    this.timers = [];
  }
}
