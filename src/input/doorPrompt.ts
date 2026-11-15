// Shows when a door is within reach: a tappable button on phones,
// a key hint ("E") on desktop.
export class DoorPrompt {
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

  // `state`: what pressing would do, or null when no door is near.
  update(state: 'open' | 'close' | null): void {
    const text = state === null ? null : `${this.isTouch ? '' : 'E: '}${state === 'open' ? 'Open' : 'Close'} door`;
    if (text === this.shown) return;
    this.shown = text;
    this.el.style.display = text === null ? 'none' : '';
    this.el.textContent = text ?? '';
    this.el.classList.toggle('hint', !this.isTouch);
  }
}
