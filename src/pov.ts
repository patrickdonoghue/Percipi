import { PerspectiveCamera, Vector3 } from 'three';
import { TUNING } from './tuning';
import { DesktopInput } from './input/desktop';
import { InteractPrompt, type Interactable } from './input/interactPrompt';
import { GyroInput } from './input/gyro';
import { combineMoves, type Head } from './input/head';
import { TouchInput } from './input/touch';
import { Player } from './player';
import type { GreyboxWorld } from './world/greybox';

// First-person walk: input moves the body and turns the head; the camera is his head.
export class PovMode {
  readonly camera: PerspectiveCamera;
  readonly head: Head;
  readonly player: Player;
  private readonly desktop: DesktopInput;
  private readonly touch: TouchInput;
  private readonly gyro: GyroInput;
  private readonly prompt: InteractPrompt;
  private interactables: Interactable[] = [];
  private enabled = true;
  private readonly forwardVec = new Vector3();
  private get doorSegments() {
    return this.world.doors.map((d) => d.segment);
  }

  constructor(
    canvas: HTMLCanvasElement,
    private readonly world: GreyboxWorld,
  ) {
    const cam = TUNING.camera;
    this.camera = new PerspectiveCamera(cam.fovDeg, window.innerWidth / window.innerHeight, cam.near, cam.far);
    this.camera.rotation.order = 'YXZ';
    this.head = { yaw: world.spawn.yaw, pitch: 0 };
    this.player = new Player(world.spawn.x, world.spawn.z);
    this.desktop = new DesktopInput(canvas, this.head, () => this.useNearest());
    this.touch = new TouchInput(canvas, this.head);
    this.gyro = new GyroInput(this.head);
    this.prompt = new InteractPrompt(() => this.useNearest());
    this.interactables = [...world.doors];
    this.placeCamera();
  }

  set inputEnabled(on: boolean) {
    this.enabled = on;
    this.desktop.enabled = on;
    this.touch.enabled = on;
    this.gyro.enabled = on;
    if (!on) this.prompt.update(null);
  }

  // Things that can be used with E / the on-screen button (doors are added already).
  addInteractable(thing: Interactable): void {
    this.interactables.push(thing);
  }

  // Call from inside the wake-up tap (iPhone permission rule).
  requestGyro(): void {
    this.gyro.requestPermission();
  }

  get pose(): { x: number; z: number; yaw: number; pitch: number } {
    return { x: this.player.x, z: this.player.z, yaw: this.head.yaw, pitch: this.head.pitch };
  }

  forward(): Vector3 {
    return this.camera.getWorldDirection(this.forwardVec);
  }

  update(dt: number): void {
    this.desktop.update();
    const move = combineMoves(this.desktop.move, this.touch.move);
    for (const d of this.world.doors) d.update(dt);
    this.player.update(dt, this.head.yaw, move, this.world.colliders, this.world.bounds, this.doorSegments);
    this.placeCamera();
    if (this.enabled) this.prompt.update(this.nearest()?.label ?? null);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  private placeCamera(): void {
    this.camera.position.set(this.player.x, TUNING.player.eyeHeight, this.player.z);
    this.camera.rotation.set(this.head.pitch, this.head.yaw, 0);
  }

  // The closest usable thing within reach.
  private nearest(): Interactable | null {
    const { x, z } = this.player;
    let best: Interactable | null = null;
    let bestDist: number = TUNING.door.interactDistance;
    for (const thing of this.interactables) {
      if (thing.label === null) continue;
      const dist = thing.distanceTo(x, z);
      if (dist <= bestDist) {
        best = thing;
        bestDist = dist;
      }
    }
    return best;
  }

  private useNearest(): void {
    this.nearest()?.activate();
  }
}
