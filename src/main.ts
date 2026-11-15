import './style.css';
import { AmbientLight, Clock, DirectionalLight, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { TUNING } from './tuning';
import { Hud } from './hud';
import { DesktopInput } from './input/desktop';
import { combineMoves, type Head } from './input/head';
import { TouchInput } from './input/touch';
import { PerceptionEngine } from './perception/engine';
import { Player } from './player';
import { DissolveRenderer } from './render/dissolve';
import { setupWake } from './wake';
import { buildGreybox } from './world/greybox';

const renderer = new WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, TUNING.render.maxPixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
const canvas = renderer.domElement;
document.getElementById('app')!.appendChild(canvas);

const scene = new Scene();
const cam = TUNING.camera;
const camera = new PerspectiveCamera(cam.fovDeg, window.innerWidth / window.innerHeight, cam.near, cam.far);
camera.rotation.order = 'YXZ';

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
const hud = new Hud();

const head: Head = { yaw: world.spawn.yaw, pitch: 0 };
const player = new Player(world.spawn.x, world.spawn.z);

const toggleNearestDoor = () => {
  let best = world.doors[0];
  for (const d of world.doors) if (d.distanceTo(player.x, player.z) < best!.distanceTo(player.x, player.z)) best = d;
  if (best && best.distanceTo(player.x, player.z) <= TUNING.door.interactDistance) best.toggle();
};
const desktop = new DesktopInput(canvas, head, toggleNearestDoor);
const touch = new TouchInput(canvas, head);

// Dev-only handle for testing from the browser console.
if (import.meta.env.DEV) Object.assign(window, { percipi: { head, player, world, engine, camera, renderer, scene } });

let awake = false;
setupWake(canvas, () => {
  awake = true;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new Clock();
const forward = new Vector3();

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), TUNING.maxFrameSeconds);

  if (awake) {
    desktop.update();
    player.update(dt, head.yaw, combineMoves(desktop.move, touch.move), world.colliders, world.bounds);
  }
  for (const d of world.doors) d.update(dt);

  camera.position.set(player.x, TUNING.player.eyeHeight, player.z);
  camera.rotation.set(head.pitch, head.yaw, 0);
  scene.updateMatrixWorld();
  camera.getWorldDirection(forward);

  // 1. Perception decides what exists. 2. Rendering only reads that.
  if (awake) engine.update(camera.position, forward);
  dissolve.update(world.items, dt);

  renderer.render(scene, camera);

  let present = 0;
  for (const p of world.items) if (p.present) present++;
  hud.frame(dt, renderer.info.render.calls, renderer.info.render.triangles, present, world.items.length);
});
