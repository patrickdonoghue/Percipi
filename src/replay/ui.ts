// On-screen controls: the "end walk" button in POV, and the replay bar.

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = className;
  e.textContent = text;
  return e;
}

export function createEndButton(onEnd: () => void): { show: () => void; hide: () => void } {
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  const btn = el('button', 'end-walk', isTouch ? 'End walk' : 'End walk (Enter)');
  btn.style.display = 'none';
  btn.addEventListener('click', onEnd);
  document.body.appendChild(btn);
  return { show: () => (btn.style.display = ''), hide: () => btn.remove() };
}

function formatTime(t: number): string {
  const s = Math.floor(t);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export interface ReplayBarHandlers {
  onTogglePlay: () => void;
  onSeek: (t: number) => void;
}

export class ReplayBar {
  private readonly root = el('div', 'replay-bar');
  private readonly play = el('button', 'replay-play', '▶');
  private readonly scrub = el('input', 'replay-scrub');
  private readonly label = el('span', 'replay-time', '0:00');
  private readonly again = el('button', 'replay-again', 'Walk again');
  private scrubbing = false;

  constructor(
    private readonly duration: number,
    handlers: ReplayBarHandlers,
  ) {
    this.scrub.type = 'range';
    this.scrub.min = '0';
    this.scrub.max = String(duration);
    this.scrub.step = '0.01';
    this.scrub.value = '0';
    this.play.addEventListener('click', handlers.onTogglePlay);
    this.scrub.addEventListener('input', () => handlers.onSeek(Number(this.scrub.value)));
    this.scrub.addEventListener('pointerdown', () => (this.scrubbing = true));
    window.addEventListener('pointerup', () => (this.scrubbing = false));
    this.again.addEventListener('click', () => location.reload());
    this.root.append(this.play, this.scrub, this.label, this.again);
    this.root.style.display = 'none';
    document.body.appendChild(this.root);
  }

  show(): void {
    this.root.style.display = '';
  }

  update(time: number, playing: boolean): void {
    this.play.textContent = playing ? '❚❚' : '▶';
    if (!this.scrubbing) this.scrub.value = String(time);
    this.label.textContent = `${formatTime(time)} / ${formatTime(this.duration)}`;
  }
}
