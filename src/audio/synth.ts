// Placeholder sounds made in code, used until real audio files are added
// to public/audio. Each returns raw samples for one channel.

import { TUNING } from '../tuning';

export type SoundName = 'alarm' | 'bark';

// Digital alarm clock: four quick beeps, then a pause (one 1-second loop).
function alarm(rate: number): Float32Array<ArrayBuffer> {
  const out = new Float32Array(Math.round(rate * TUNING.sound.alarm.pulseSeconds));
  const hz = TUNING.sound.alarm.beepHz;
  const beep = 0.07;
  const gap = 0.06;
  for (let b = 0; b < 4; b++) {
    const start = Math.round(b * (beep + gap) * rate);
    const len = Math.round(beep * rate);
    for (let i = 0; i < len; i++) {
      const t = i / rate;
      const env = Math.min(1, i / (0.004 * rate), (len - i) / (0.004 * rate)); // tiny fades, no clicks
      const square = Math.sign(Math.sin(2 * Math.PI * hz * t));
      const sine = Math.sin(2 * Math.PI * hz * t);
      out[start + i] = (0.35 * square + 0.65 * sine) * env * 0.6;
    }
  }
  return out;
}

// One "woof": a falling growl tone mixed with breathy noise.
function woof(rate: number): Float32Array<ArrayBuffer> {
  const dur = 0.32;
  const out = new Float32Array(Math.round(rate * dur));
  let phase = 0;
  let low = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / rate;
    const hz = 170 + 420 * Math.exp(-t * 9);
    phase += hz / rate;
    const saw = 2 * (phase % 1) - 1;
    const noise = Math.random() * 2 - 1;
    const env = Math.min(1, t / 0.012) * Math.exp(-t * 11);
    const raw = 0.7 * saw + 0.45 * noise;
    low += 0.35 * (raw - low); // soften the buzz
    out[i] = low * env * 0.9;
  }
  return out;
}

// A short run of woofs at the same moments as the real clip's barks.
function bark(rate: number): Float32Array<ArrayBuffer> {
  const one = woof(rate);
  const times = TUNING.sound.dog.barkTimes;
  const out = new Float32Array(Math.round(((times[times.length - 1] ?? 0) + 0.4) * rate));
  for (const t of times) out.set(one, Math.round(t * rate));
  return out;
}

export function synthesize(name: SoundName, rate: number): Float32Array<ArrayBuffer> {
  return name === 'alarm' ? alarm(rate) : bark(rate);
}
