import { TUNING } from '../tuning';
import type { SoundName } from '../audio/synth';
import type { Perceivable } from '../perception/tags';

// Which objects make sound (scene data). Tags are added to those objects so
// the perception engine can hear them.
export const SOUND_SOURCES = {
  alarm: { itemId: 'bed1_alarmclock', radius: TUNING.sound.alarm.radius },
  dog: { itemId: 'yard_dog', radius: TUNING.sound.dog.radius },
} as const;

// How each sound plays (shared by the live walk and the replay).
export function playSettings(sound: SoundName): { loop: boolean; volume: number; radius: number } {
  const s = sound === 'alarm' ? TUNING.sound.alarm : TUNING.sound.dog;
  return { loop: sound === 'alarm', volume: s.volume, radius: s.radius };
}

export function applySoundTags(items: readonly Perceivable[]): void {
  for (const source of Object.values(SOUND_SOURCES)) {
    const p = items.find((i) => i.id === source.itemId);
    if (p) p.tags.sound = { radius: source.radius };
  }
}
