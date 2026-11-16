// Placeholder sounds made in code, used until real audio files are added
// to public/audio. Each returns raw samples for one channel.

import { TUNING } from '../tuning';

export type SoundName = 'alarm' | 'bark' | 'sizzle' | 'voice';

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

// Frying bacon: a soft hiss with random crackles (a 2-second loop).
function sizzle(rate: number): Float32Array<ArrayBuffer> {
  const out = new Float32Array(Math.round(rate * 2));
  let prev = 0;
  for (let i = 0; i < out.length; i++) {
    const n = Math.random() * 2 - 1;
    const hiss = n - prev; // brighter, hissy noise
    prev = n;
    out[i] = hiss * 0.08;
  }
  for (let c = 0; c < 70; c++) {
    const start = Math.floor(Math.random() * (out.length - rate * 0.02));
    const amp = 0.15 + Math.random() * 0.35;
    const len = Math.floor(rate * (0.002 + Math.random() * 0.01));
    for (let i = 0; i < len; i++) out[start + i]! += (Math.random() * 2 - 1) * amp * Math.exp((-i / len) * 5);
  }
  return out;
}

// Stand-in for a voice: two vowel-like hums ("hey" ... "o-ver here").
function voice(rate: number): Float32Array<ArrayBuffer> {
  const out = new Float32Array(Math.round(rate * 1.4));
  const parts: [number, number, number][] = [
    [0.1, 0.25, 220], // start, length, pitch
    [0.65, 0.55, 180],
  ];
  for (const [start, len, hz] of parts) {
    const s0 = Math.round(start * rate);
    const n = Math.round(len * rate);
    for (let i = 0; i < n; i++) {
      const t = i / rate;
      const env = Math.sin((Math.PI * i) / n);
      const tone = Math.sin(2 * Math.PI * hz * t) + 0.5 * Math.sin(2 * Math.PI * hz * 2 * t) + 0.3 * Math.sin(2 * Math.PI * hz * 3.1 * t);
      out[s0 + i] = tone * env * 0.35;
    }
  }
  return out;
}

export function synthesize(name: SoundName, rate: number): Float32Array<ArrayBuffer> {
  if (name === 'alarm') return alarm(rate);
  if (name === 'voice') return voice(rate);
  if (name === 'sizzle') return sizzle(rate);
  return bark(rate);
}
