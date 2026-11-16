import { TUNING } from '../tuning';
import type { SoundName } from '../audio/synth';
import type { Perceivable } from '../perception/tags';

// Which objects make sound or smell (scene data). Tags are added to those
// objects so the perception engine can hear and smell them.
export const SOUND_SOURCES = {
  alarm: { itemId: 'bed1_alarmclock', radius: TUNING.sound.alarm.radius },
  dog: { itemId: 'yard_dog', radius: TUNING.sound.dog.radius },
  bacon: { itemId: 'kitchen_bacon', radius: TUNING.sound.sizzle.radius },
  caller: { itemId: 'yard_caller', radius: TUNING.sound.voice.radius },
} as const;

export const SMELL_SOURCES = ['kitchen_bacon'] as const;

// How each sound plays (shared by the live walk and the replay).
export function playSettings(sound: SoundName): { loop: boolean; volume: number; radius: number } {
  const s = { alarm: TUNING.sound.alarm, sizzle: TUNING.sound.sizzle, bark: TUNING.sound.dog, voice: TUNING.sound.voice }[sound];
  return { loop: sound === 'alarm' || sound === 'sizzle', volume: s.volume, radius: s.radius };
}

export function applySenseTags(items: readonly Perceivable[]): void {
  for (const source of Object.values(SOUND_SOURCES)) {
    const p = items.find((i) => i.id === source.itemId);
    if (p) p.tags.sound = { radius: source.radius };
  }
  for (const id of SMELL_SOURCES) {
    const p = items.find((i) => i.id === id);
    if (p) p.tags.smell = true;
  }
}
