import { PerspectiveCamera, Vector3 } from 'three';
import { TUNING } from './tuning';
import { DesktopInput } from './input/desktop';
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
  private readonly forwardVec = new Vector3();

  constructor(
    canvas: HTMLCanvasElement,
    private readonly world: GreyboxWorld,
  ) {
    const cam = TUNING.camera;
    this.camera = new PerspectiveCamera(cam.fovDeg, window.innerWidth / window.innerHeight, cam.near, cam.far);
    this.camera.rotation.order = 'YXZ';
    this.head = { yaw: world.spawn.yaw, pitch: 0 };
    this.player = new Player(world.spawn.x, world.spawn.z);
    this.desktop = new DesktopInput(canvas, this.head, () => this.toggleNearestDoor());
    this.touch = new TouchInput(canvas, this.head);
    this.placeCamera();
  }

  set inputEnabled(on: boolean) {
    this.desktop.enabled = on;
    this.touch.enabled = on;
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
    this.player.update(dt, this.head.yaw, move, this.world.colliders, this.world.bounds);
    for (const d of this.world.doors) d.update(dt);
    this.placeCamera();
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  private placeCamera(): void {
    this.camera.position.set(this.player.x, TUNING.player.eyeHeight, this.player.z);
    this.camera.rotation.set(this.head.pitch, this.head.yaw, 0);
  }

  private toggleNearestDoor(): void {
    const { x, z } = this.player;
    let best = this.world.doors[0];
    for (const d of this.world.doors) if (d.distanceTo(x, z) < best!.distanceTo(x, z)) best = d;
    if (best && best.distanceTo(x, z) <= TUNING.door.interactDistance) best.toggle();
  }
}
