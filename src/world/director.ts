import { Vector3 } from 'three';
import { TUNING } from '../tuning';
import type { AudioOut, SoundHandle } from '../audio/audioOut';
import type { SoundName } from '../audio/synth';
import type { Interactable } from '../input/interactPrompt';
import type { SoundField } from '../perception/sound';
import type { Perceivable } from '../perception/tags';
import type { Recorder } from '../replay/recorder';
import type { GreyboxWorld } from './greybox';
import { LIVING_AREA } from './layout';
import { SOUND_SOURCES } from './sounds';

// Runs the walk's sound moments:
// - the alarm clock rings from waking until he switches it off
// - the dog in the backyard barks a few times the first time he enters the living area
// Each sound plays as audio, sends ripples into the perception engine, and is recorded.
export class Director {
  private readonly alarm: Perceivable;
  private readonly dog: Perceivable;
  private alarmSound: SoundHandle | null = null;
  private nextAlarmPulse = 0;
  private dogTriggered = false;
  private barkClipAt: number | null = null; // when the bark clip will start
  private barkTimes: number[] = []; // upcoming barks (one ripple each)
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
  }

  update(time: number, x: number, z: number): void {
    this.now = time;
    if (this.alarmSound && time >= this.nextAlarmPulse) {
      this.pulse(this.alarm, 'alarm');
      this.nextAlarmPulse += TUNING.sound.alarm.pulseSeconds;
    }

    const d = TUNING.sound.dog;
    const inLiving = x >= LIVING_AREA.minX && x <= LIVING_AREA.maxX && z >= LIVING_AREA.minZ && z <= LIVING_AREA.maxZ;
    if (!this.dogTriggered && inLiving) {
      this.dogTriggered = true;
      this.barkClipAt = time + d.startDelay;
      this.barkTimes = d.barkTimes.map((t) => this.barkClipAt! + t);
    }
    // The clip plays once; each bark inside it sends a ripple.
    if (this.barkClipAt !== null && time >= this.barkClipAt) {
      this.barkClipAt = null;
      this.audio.play('bark', this.positionOf(this.dog), { volume: d.volume, radius: d.radius });
      this.log(this.dog, 'bark', 'start');
    }
    while (this.barkTimes.length > 0 && this.barkTimes[0]! <= time) {
      this.barkTimes.shift();
      this.pulse(this.dog, 'bark');
    }
  }

  // End of the walk: silence everything.
  stopAll(): void {
    this.alarmSound = null;
    this.barkClipAt = null;
    this.barkTimes = [];
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
