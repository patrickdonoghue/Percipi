import { AnimationAction, Bone, CapsuleGeometry, ConeGeometry, Group, Mesh, MeshStandardMaterial, Object3D, SphereGeometry } from 'three';
import { TUNING } from '../tuning';
import { instanceOf } from '../world/animated';

// The figure that stands in for the character in the replay. Always visible
// (it is the observer, not part of the perceived world). It is the animated man:
// he walks when the recording moves and idles when it stops, and his head tilts
// with where he looked. Falls back to a simple capsule if the model is missing.
export class Character {
  readonly root = new Group();
  private readonly head = new Group(); // gaze cone, at eye height
  private walk: AnimationAction | null = null;
  private idle: AnimationAction | null = null;
  private headBone: Object3D | null = null;
  private pitch = 0;
  private walkWeight = 0;
  private readonly last = { x: 0, z: 0, set: false };
  private moved = 0; // metres moved since the last update

  constructor() {
    const c = TUNING.character;
    if (!this.buildMan()) this.buildCapsule();

    this.head.position.y = TUNING.player.eyeHeight;
    this.root.add(this.head);
    // Faint gaze cone, tip at the eyes, opening forward (-z).
    const gazeMat = new MeshStandardMaterial({
      color: c.color,
      transparent: true,
      opacity: c.gazeOpacity,
      depthWrite: false,
    });
    const gaze = new Mesh(new ConeGeometry(c.gazeRadius, c.gazeLength, 20, 1, true), gazeMat);
    gaze.rotation.x = Math.PI / 2;
    gaze.position.z = -c.gazeLength / 2;
    this.head.add(gaze);
  }

  private buildMan(): boolean {
    const man = instanceOf('man');
    if (!man) return false;
    const c = TUNING.character;
    man.root.scale.setScalar(c.height / man.size.y);
    man.root.rotation.y = Math.PI; // the model faces +z; he looks along -z
    this.root.add(man.root);
    man.root.traverse((o) => {
      if (o instanceof Bone && /head/i.test(o.name) && !/top|end/i.test(o.name) && !this.headBone) this.headBone = o;
    });
    const walk = man.clip('walk');
    const idle = man.clip('idle');
    if (walk) this.walk = man.mixer.clipAction(walk).play();
    if (idle) this.idle = man.mixer.clipAction(idle).play();
    this.walk?.setEffectiveWeight(0);
    return true;
  }

  private buildCapsule(): void {
    const c = TUNING.character;
    const mat = new MeshStandardMaterial({ color: c.color, roughness: 0.6 });
    const body = new Mesh(new CapsuleGeometry(0.2, c.height - 0.55, 4, 12), mat);
    body.position.y = (c.height - 0.15) / 2;
    this.root.add(body);
    const skull = new Mesh(new SphereGeometry(0.13, 16, 12), mat);
    skull.position.y = TUNING.player.eyeHeight;
    this.root.add(skull);
  }

  setPose(x: number, z: number, yaw: number, pitch: number): void {
    if (this.last.set) this.moved += Math.hypot(x - this.last.x, z - this.last.z);
    this.last.x = x;
    this.last.z = z;
    this.last.set = true;
    this.root.position.set(x, 0, z);
    this.root.rotation.y = yaw;
    this.head.rotation.x = pitch;
    this.pitch = pitch;
  }

  // Call after the animations have advanced: blend walk/idle and tilt the head.
  update(dt: number): void {
    const c = TUNING.character;
    const speed = dt > 0 ? this.moved / dt : 0;
    this.moved = 0;
    const target = speed > c.walkThreshold && speed < c.jumpSpeed ? 1 : 0;
    this.walkWeight += (target - this.walkWeight) * Math.min(1, dt * c.blendRate);
    this.walk?.setEffectiveWeight(this.walkWeight);
    this.idle?.setEffectiveWeight(1 - this.walkWeight);
    if (this.walk) this.walk.timeScale = Math.min(c.maxStrideScale, Math.max(0.5, speed / TUNING.player.walkSpeed));
    // Looking up (positive pitch) tips the head back.
    this.headBone?.rotateX(-this.pitch * c.headTilt);
  }
}
