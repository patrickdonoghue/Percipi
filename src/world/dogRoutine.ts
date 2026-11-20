import { LoopOnce, LoopRepeat, type AnimationAction } from 'three';
import { TUNING } from '../tuning';
import type { AnimatedInstance } from './animated';

// The dog's idle life, so he doesn't just loop one animation: he stands (an ear
// twitch now and then), sits down, sits (a scratch now and then), stands up, and
// starts again, with random timings. He never leaves his spot, so his box (what
// can be seen of him, and what dissolves in the replay) is unchanged.
// Returns null if a clip is missing (then he just plays his plain idle).

export function dogRoutine(inst: AnimatedInstance): ((dt: number) => void) | null {
  const t = TUNING.dog;
  if (!t.routine) return null;
  const get = (name: string) => {
    const c = inst.clip(name);
    return c ? inst.mixer.clipAction(c) : null;
  };
  const stand = get('Idle1');
  const twitch = get('IdleEarTwitch');
  const sitDown = get('SitDown');
  const sit = get('IdleSit');
  const scratch = get('SitScratchEar');
  const standUp = get('StandUp');
  if (!stand || !twitch || !sitDown || !sit || !scratch || !standUp) return null;

  const rand = ([lo, hi]: [number, number]) => lo + Math.random() * (hi - lo);
  const blend = t.blendSeconds;
  let current: AnimationAction = stand;
  let sitting = false;
  let shotLeft = 0; // time left in a one-off move (sit down, stand up, twitch, scratch)
  let postureLeft = rand(t.standSeconds);
  let fidgetLeft = rand(t.twitchEverySeconds);

  const play = (next: AnimationAction, once: boolean) => {
    next.reset();
    next.setLoop(once ? LoopOnce : LoopRepeat, Infinity);
    next.clampWhenFinished = once; // hold the last pose until the next animation fades in
    next.play();
    if (next !== current) current.crossFadeTo(next, blend, false);
    current = next;
    if (once) shotLeft = Math.max(blend, next.getClip().duration - blend);
  };

  stand.time = Math.random() * stand.getClip().duration; // not in step with anything else
  stand.play();

  return (dt) => {
    if (shotLeft > 0) {
      shotLeft -= dt;
      if (shotLeft <= 0) play(sitting ? sit : stand, false);
      return;
    }
    postureLeft -= dt;
    fidgetLeft -= dt;
    if (postureLeft <= 0) {
      sitting = !sitting;
      postureLeft = rand(sitting ? t.sitSeconds : t.standSeconds);
      fidgetLeft = rand(sitting ? t.scratchEverySeconds : t.twitchEverySeconds);
      play(sitting ? sitDown : standUp, true);
    } else if (fidgetLeft <= 0) {
      fidgetLeft = rand(sitting ? t.scratchEverySeconds : t.twitchEverySeconds);
      play(sitting ? scratch : twitch, true);
    }
  };
}
