// Something within reach that can be used (a door, the alarm clock).
export interface Interactable {
  distanceTo(x: number, z: number): number;
  readonly label: string | null; // what using it would do, or null if it can't be used now
  activate(): void;
}

// Shows when something usable is within reach: a tappable button on phones,
// a key hint ("E") on desktop.
export class InteractPrompt {
  private readonly el: HTMLButtonElement;
  private readonly isTouch = window.matchMedia('(pointer: coarse)').matches;
  private shown: string | null = null;

  constructor(onPress: () => void) {
    this.el = document.createElement('button');
    this.el.className = 'door-prompt';
    this.el.style.display = 'none';
    this.el.addEventListener('click', onPress);
    document.body.appendChild(this.el);
  }

  update(label: string | null): void {
    const text = label === null ? null : `${this.isTouch ? '' : 'E: '}${label}`;
    if (text === this.shown) return;
    this.shown = text;
    this.el.style.display = text === null ? 'none' : '';
    this.el.textContent = text ?? '';
    this.el.classList.toggle('hint', !this.isTouch);
  }
}
