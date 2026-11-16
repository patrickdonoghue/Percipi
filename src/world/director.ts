import { Vector3 } from 'three';
import { TUNING } from '../tuning';
import type { AudioOut, SoundHandle } from '../audio/audioOut';
import type { SoundName } from '../audio/synth';
import type { Interactable } from '../input/interactPrompt';
import type { SoundField } from '../perception/sound';
import type { Perceivable } from '../perception/tags';
import type { Recorder } from '../replay/recorder';
import type { GreyboxWorld } from './greybox';
import { HOUSE_AREA, LIVING_AREA, type Rect } from './layout';
import { playSettings, SOUND_SOURCES } from './sounds';

// Moments inside a one-shot clip that each send a ripple.
function rippleTimes(sound: SoundName): readonly number[] {
  if (sound === 'bark') return TUNING.sound.dog.barkTimes;
  if (sound === 'voice') return TUNING.sound.voice.phraseTimes;
  return [0];
}

// Runs the walk's sound moments:
// - the alarm clock rings from waking until he switches it off
// - the bacon sizzles in the kitchen the whole time (quiet, heard only nearby)
// - the dog in the backyard barks a few times the first time he enters the living area
// - the caller by the backyard trees calls "hey, over here" the first time he steps
//   outside (either door), and again a couple of times until he looks at them
// Each sound plays as audio, sends ripples into the perception engine, and is recorded.

interface Clip {
  at: number; // when it starts
  source: Perceivable;
  sound: SoundName;
}

const inside = (r: Rect, x: number, z: number) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;
export class Director {
  private readonly alarm: Perceivable;
  private readonly dog: Perceivable;
  private readonly bacon: Perceivable;
  private readonly caller: Perceivable;
  private callerTriggered = false;
  private callsMade = 0;
  private nextCall: number | null = null;
  private nextSizzlePulse = 0;
  private alarmSound: SoundHandle | null = null;
  private nextAlarmPulse = 0;
  private dogTriggered = false;
  private clips: Clip[] = []; // one-shot clips waiting to start
  private ripples: { at: number; source: Perceivable; sound: SoundName }[] = []; // upcoming ripples inside clips
  private now = 0;
  readonly alarmSwitch: Interactable;

  constructor(
    private readonly world: GreyboxWorld,
    private readonly audio: AudioOut,
    private readonly field: SoundField,
    private readonly recorder: Recorder,
  ) {
    const find = (id: string) => {
      const p = world.items.find((i) => i.id === id);
      if (!p) throw new Error(`Missing sound object ${id}`);
      return p;
    };
    this.alarm = find(SOUND_SOURCES.alarm.itemId);
    this.dog = find(SOUND_SOURCES.dog.itemId);
    this.bacon = find(SOUND_SOURCES.bacon.itemId);
    this.caller = find(SOUND_SOURCES.caller.itemId);

    const alarmPos = this.alarm.mesh.position;
    const isRinging = () => this.alarmSound !== null;
    this.alarmSwitch = {
      distanceTo: (x, z) => Math.hypot(x - alarmPos.x, z - alarmPos.z),
      get label() {
        return isRinging() ? 'Turn off alarm' : null;
      },
      activate: () => this.turnOffAlarm(),
    };
  }

  // He wakes up: the alarm is ringing.
  start(time: number): void {
    this.now = time;
    const a = TUNING.sound.alarm;
    this.alarmSound = this.audio.play('alarm', this.positionOf(this.alarm), {
      loop: true,
      volume: a.volume,
      radius: a.radius,
    });
    this.log(this.alarm, 'alarm', 'start');
    this.nextAlarmPulse = time;

    const z = TUNING.sound.sizzle;
    this.audio.play('sizzle', this.positionOf(this.bacon), { loop: true, volume: z.volume, radius: z.radius });
    this.log(this.bacon, 'sizzle', 'start');
    this.nextSizzlePulse = time;
  }

  update(time: number, x: number, z: number): void {
    this.now = time;
    if (this.alarmSound && time >= this.nextAlarmPulse) {
      this.pulse(this.alarm, 'alarm');
      this.nextAlarmPulse += TUNING.sound.alarm.pulseSeconds;
    }
    if (time >= this.nextSizzlePulse) {
      this.pulse(this.bacon, 'sizzle');
      this.nextSizzlePulse += TUNING.sound.sizzle.pulseSeconds;
    }

    if (!this.dogTriggered && inside(LIVING_AREA, x, z)) {
      this.dogTriggered = true;
      this.clips.push({ at: time + TUNING.sound.dog.startDelay, source: this.dog, sound: 'bark' });
    }

    const v = TUNING.sound.voice;
    if (!this.callerTriggered && !inside(HOUSE_AREA, x, z)) {
      this.callerTriggered = true;
      this.nextCall = time;
    }
    if (this.nextCall !== null && time >= this.nextCall) {
      this.clips.push({ at: time, source: this.caller, sound: 'voice' });
      this.callsMade++;
      this.nextCall = this.callsMade < v.maxCalls ? time + v.repeatSeconds : null;
    }
    // Once he has seen the caller, they stop calling.
    if (this.caller.sensed.sight) this.nextCall = null;

    this.runClips(time);
  }

  // Start due clips (played once); each bark/phrase inside a clip sends a ripple.
  private runClips(time: number): void {
    for (const clip of this.clips.filter((c) => c.at <= time)) {
      const settings = playSettings(clip.sound);
      this.audio.play(clip.sound, this.positionOf(clip.source), settings);
      this.log(clip.source, clip.sound, 'start');
      for (const offset of rippleTimes(clip.sound)) {
        this.ripples.push({ at: clip.at + offset, source: clip.source, sound: clip.sound });
      }
    }
    this.clips = this.clips.filter((c) => c.at > time);
    for (const r of this.ripples.filter((r) => r.at <= time)) this.pulse(r.source, r.sound);
    this.ripples = this.ripples.filter((r) => r.at > time);
  }

  // End of the walk: silence everything.
  stopAll(): void {
    this.alarmSound = null;
    this.clips = [];
    this.ripples = [];
    this.nextCall = null;
    this.audio.stopAll();
  }

  private turnOffAlarm(): void {
    if (!this.alarmSound) return;
    this.alarmSound.stop();
    this.alarmSound = null;
    this.log(this.alarm, 'alarm', 'stop');
  }

  private pulse(source: Perceivable, sound: SoundName): void {
    this.field.pulse(source, this.now);
    this.log(source, sound, 'pulse');
  }

  private log(source: Perceivable, sound: SoundName, action: 'start' | 'stop' | 'pulse'): void {
    this.recorder.logEvent({ t: this.now, item: this.world.items.indexOf(source), sound, action });
  }

  private positionOf(p: Perceivable): Vector3 {
    return p.mesh.getWorldPosition(new Vector3());
  }
}
