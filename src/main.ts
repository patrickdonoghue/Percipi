import './style.css';
import { AmbientLight, Clock, DirectionalLight, Scene, WebGLRenderer } from 'three';
import { TUNING } from './tuning';
import { Hud } from './hud';
import { PerceptionEngine } from './perception/engine';
import { PovMode } from './pov';
import { DissolveRenderer } from './render/dissolve';
import { Recorder } from './replay/recorder';
import { ReplayMode } from './replay/replayMode';
import { createEndButton } from './replay/ui';
import { setupWake } from './wake';
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

const engine = new PerceptionEngine(world.items);
const dissolve = new DissolveRenderer();
const recorder = new Recorder();
const hud = new Hud();
const pov = new PovMode(canvas, world);
let replay: ReplayMode | null = null;

// wake -> pov (walk, recording) -> replay (zoom-out reveal, then playback)
let mode: 'wake' | 'pov' | 'replay' = 'wake';

const endWalk = () => {
  if (mode !== 'pov' || recorder.frames.length === 0) return;
  mode = 'replay';
  wake.disable();
  endButton.hide();
  pov.inputEnabled = false;
  if (document.pointerLockElement) document.exitPointerLock();
  replay = new ReplayMode(scene, pov.camera, canvas, recorder.frames, world, dissolve);
};

const endButton = createEndButton(endWalk);
window.addEventListener('keydown', (e) => {
  if (e.code === 'Enter') endWalk();
});

const wake = setupWake(canvas, () => {
  mode = 'pov';
  endButton.show();
});

// Dev-only handle for testing from the browser console.
if (import.meta.env.DEV) {
  Object.assign(window, { percipi: { pov, world, engine, recorder, renderer, scene, endWalk, getReplay: () => replay } });
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
    pov.update(dt);
    scene.updateMatrixWorld();
    // The engine decides what he senses; it is recorded, not shown. POV looks normal.
    engine.update(pov.camera.position, pov.forward());
    recorder.capture(dt, pov.pose, world.doors, world.items);
    dissolve.showAll(world.items);
    if (recorder.duration >= TUNING.replay.maxRecordSeconds) endWalk();
  } else if (mode === 'replay' && replay) {
    replay.update(dt);
  }

  renderer.render(scene, replay ? replay.activeCamera : pov.camera);

  let sensed = 0;
  for (const p of world.items) if (p.present) sensed++;
  hud.frame(dt, renderer.info.render.calls, renderer.info.render.triangles, sensed, world.items.length);
});
