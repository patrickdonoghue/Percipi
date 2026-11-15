import { CapsuleGeometry, ConeGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry } from 'three';
import { TUNING } from '../tuning';

// The figure that stands in for the character in the replay. Always visible
// (it is the observer, not part of the perceived world).
export class Character {
  readonly root = new Group();
  private readonly head = new Group();

  constructor() {
    const c = TUNING.character;
    const mat = new MeshStandardMaterial({ color: c.color, roughness: 0.6 });

    const bodyLength = c.bodyHeight - 2 * c.bodyRadius;
    const body = new Mesh(new CapsuleGeometry(c.bodyRadius, bodyLength, 4, 12), mat);
    body.position.y = c.bodyHeight / 2;
    this.root.add(body);

    this.head.position.y = TUNING.player.eyeHeight;
    this.root.add(this.head);
    const skull = new Mesh(new SphereGeometry(c.headRadius, 16, 12), mat);
    this.head.add(skull);
    const nose = new Mesh(new ConeGeometry(0.04, 0.1, 8), mat);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = -c.headRadius;
    this.head.add(nose);

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

  setPose(x: number, z: number, yaw: number, pitch: number): void {
    this.root.position.set(x, 0, z);
    this.root.rotation.y = yaw;
    this.head.rotation.x = pitch;
  }
}
