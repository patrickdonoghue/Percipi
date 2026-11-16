import './style.css';
import { AmbientLight, Clock, DirectionalLight, Scene, WebGLRenderer } from 'three';
import { TUNING } from './tuning';
import { AudioOut } from './audio/audioOut';
import { Hud } from './hud';
import { PerceptionEngine } from './perception/engine';
import { SmellField } from './perception/smell';
import { SoundField } from './perception/sound';
import { PovMode } from './pov';
import { DissolveRenderer } from './render/dissolve';
import { Recorder } from './replay/recorder';
import { ReplayMode } from './replay/replayMode';
import { createEndButton } from './replay/ui';
import { setupWake } from './wake';
import { Director } from './world/director';
import { buildGreybox } from './world/greybox';

const renderer = new WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, TUNING.render.maxPixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
const canvas = renderer.domElement;
document.getElementById('app')!.appendChild(canvas);

const scene = new Scene();
scene.add(new AmbientLight(0xffffff, TUNING.render.ambientIntensity));
const sun = new DirectionalLight(0xffffff, TUNING.render.sunIntensity);
sun.position.set(...TUNING.render.sunPosition);
scene.add(sun);
const fill = new DirectionalLight(0xffffff, TUNING.render.fillIntensity);
fill.position.set(...TUNING.render.fillPosition);
scene.add(fill);

const world = buildGreybox();
scene.add(world.root);

const soundField = new SoundField(world.items);
const smellField = new SmellField(world.items, world.bounds);
const engine = new PerceptionEngine(world.items, soundField, smellField);
const dissolve = new DissolveRenderer();
const recorder = new Recorder();
const audio = new AudioOut();
const director = new Director(world, audio, soundField, recorder);
const hud = new Hud();
const pov = new PovMode(canvas, world);
pov.addInteractable(director.alarmSwitch);
let walkTime = 0; // seconds since waking
let replay: ReplayMode | null = null;

// wake -> pov (walk, recording) -> replay (zoom-out reveal, then playback)
let mode: 'wake' | 'pov' | 'replay' = 'wake';

const endWalk = () => {
  if (mode !== 'pov' || recorder.frames.length === 0) return;
  mode = 'replay';
  wake.disable();
  endButton.hide();
  pov.inputEnabled = false;
  director.stopAll();
  if (document.pointerLockElement) document.exitPointerLock();
  replay = new ReplayMode(renderer, scene, pov.camera, canvas, recorder.frames, recorder.events, recorder.plume, audio, world, dissolve);
};

const endButton = createEndButton(endWalk);
window.addEventListener('keydown', (e) => {
  if (e.code === 'Enter') endWalk();
});

const wake = setupWake(
  canvas,
  () => {
    mode = 'pov';
    endButton.show();
    director.start(walkTime);
  },
  (isTouch) => {
    audio.unlock(); // browsers allow sound only from inside a tap/click
    if (isTouch) pov.requestGyro();
  },
);

// Dev-only handle for testing from the browser console.
if (import.meta.env.DEV) {
  Object.assign(window, { percipi: { pov, world, engine, smellField, recorder, director, audio, renderer, scene, endWalk, getReplay: () => replay } });
}

window.addEventListener('resize', () => {
  const aspect = window.innerWidth / window.innerHeight;
  pov.resize(aspect);
  replay?.resize(aspect);
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new Clock();

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), TUNING.maxFrameSeconds);

  if (mode === 'pov') {
    walkTime += dt;
    pov.update(dt);
    scene.updateMatrixWorld();
    director.update(walkTime, pov.player.x, pov.player.z);
    audio.setListener(pov.camera.position, pov.forward());
    // The engine decides what he senses; it is recorded, not shown. POV looks normal.
    engine.update(pov.camera.position, pov.forward(), walkTime, dt);
    recorder.capture(walkTime, pov.pose, world.doors, world.items);
    recorder.capturePlume(walkTime, smellField.puffs);
    dissolve.showAll(world.items);
    if (recorder.duration >= TUNING.replay.maxRecordSeconds) endWalk();
  } else if (mode === 'replay' && replay) {
    replay.update(dt);
  }

  renderer.render(scene, replay ? replay.activeCamera : pov.camera);

  let seen = 0;
  let heard = 0;
  for (const p of world.items) {
    if (p.present) seen++;
    if (p.sensed.sound) heard++;
  }
  hud.frame(dt, renderer.info.render.calls, renderer.info.render.triangles, seen, heard, world.items.length);
});
