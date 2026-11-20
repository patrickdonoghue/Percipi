import { TUNING } from './tuning';

// A short explanation between the walk and the replay: Berkeley's idea in a few
// tappable panels, over a dimmed view of where the walk ended. The last panel
// sends people into the replay ("see it from a different perspective").
// The copy lives here so it's easy to edit. <b>..</b> marks the main line.

const PANELS: string[] = [
  'In 1710, the philosopher George Berkeley had a strange idea:<b>To be is to be perceived.</b>',
  '<b>Everything you know about the world comes through your senses:</b>what you see, hear and smell. Nothing else gets in.',
  '<b>So when you close a door and walk away, is the room still there?</b>You can’t see it, hear it or smell it any more. You just assume it is.',
  '<b>Now step outside yourself.</b>Watch your walk again from a different perspective. Only what you sensed will be there.',
];
const LAST_BUTTON = 'Show me';

export function showIntro(onDone: () => void): void {
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  const root = document.createElement('div');
  root.className = 'intro';
  const text = document.createElement('div');
  text.className = 'intro-text';
  const foot = document.createElement('div');
  foot.className = 'intro-foot';
  const dots = document.createElement('div');
  dots.className = 'intro-dots';
  const next = document.createElement('button');
  next.className = 'intro-next';
  const skip = document.createElement('button');
  skip.className = 'intro-skip';
  skip.textContent = 'Skip';
  foot.append(dots, next);
  root.append(skip, text, foot);
  document.body.appendChild(root);

  const { fadeSeconds, ignoreInputSeconds, dim } = TUNING.intro;
  root.style.setProperty('--intro-fade', `${fadeSeconds}s`);
  root.style.setProperty('--intro-dim', String(dim));
  let index = -1;
  let readyAt = 0;
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    window.removeEventListener('keydown', onKey);
    root.classList.remove('shown');
    window.setTimeout(() => root.remove(), fadeSeconds * 1000);
    onDone();
  };

  const show = (i: number) => {
    index = i;
    readyAt = performance.now() + ignoreInputSeconds * 1000;
    text.classList.remove('shown');
    window.setTimeout(() => {
      text.replaceChildren(...paragraphs(PANELS[i]!));
      text.classList.add('shown');
    }, i === 0 ? 0 : fadeSeconds * 500);
    const last = i === PANELS.length - 1;
    next.textContent = last ? LAST_BUTTON : isTouch ? 'Tap to continue' : 'Click or press Space';
    next.classList.toggle('primary', last);
    dots.replaceChildren(...PANELS.map((_, k) => Object.assign(document.createElement('span'), { className: k === i ? 'on' : '' })));
  };

  const advance = () => {
    if (finished || performance.now() < readyAt) return;
    if (index >= PANELS.length - 1) finish();
    else show(index + 1);
  };

  function onKey(e: KeyboardEvent) {
    if (e.repeat) return;
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowRight') {
      e.preventDefault();
      advance();
    } else if (e.code === 'Escape') finish();
  }

  root.addEventListener('click', (e) => {
    if (e.target === skip) finish();
    else advance();
  });
  window.addEventListener('keydown', onKey);
  requestAnimationFrame(() => root.classList.add('shown'));
  show(0);
}

// "lead <b>main</b> rest" -> paragraphs, with the bold line on its own (as text, not HTML).
function paragraphs(copy: string): HTMLElement[] {
  const parts = copy.split(/<b>|<\/b>/);
  const out: HTMLElement[] = [];
  parts.forEach((part, k) => {
    if (!part.trim()) return;
    const p = document.createElement('p');
    p.textContent = part.trim();
    if (k % 2 === 1) p.className = 'big';
    out.push(p);
  });
  return out;
}
