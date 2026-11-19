import { Bone, MathUtils, Object3D, Quaternion, Vector3 } from 'three';
import { TUNING } from '../tuning';

// Makes an animated person turn his head to look at a point (the player's head),
// on top of whatever his animation is doing. The turn is shared between the upper
// spine, neck and head so no single joint twists far enough to look broken, and it
// is clamped to what a person could comfortably do: if you walk behind him he holds
// the furthest turn rather than spinning round.

// Shared look target: the walk sets it to the camera, the replay to his recorded head.
export const lookTarget = new Vector3();

const UP = new Vector3(0, 1, 0);
const tmpV = new Vector3();
const tmpQ = new Quaternion();
const bodyQ = new Quaternion();
const boneQ = new Quaternion();
const parentQ = new Quaternion();
const yawQ = new Quaternion();
const pitchQ = new Quaternion();
const pitchAxis = new Vector3();

interface Link {
  bone: Bone;
  share: number; // fraction of the full turn this joint takes
}

export class HeadTracker {
  private readonly chain: Link[] = [];
  private readonly head: Bone | null = null;
  private yaw = 0;
  private pitch = 0;

  constructor(private readonly body: Object3D) {
    const t = TUNING.caller.look;
    const find = (re: RegExp): Bone | null => {
      let hit: Bone | null = null;
      body.traverse((o) => {
        if (!hit && o instanceof Bone && re.test(o.name)) hit = o;
      });
      return hit;
    };
    const parts: [RegExp, number][] = [
      [/Spine2/, t.shares.spine],
      [/Neck/, t.shares.neck],
      [/Head(?!Top)/, t.shares.head],
    ];
    for (const [re, share] of parts) {
      const bone = find(re);
      if (bone) this.chain.push({ bone, share });
    }
    this.head = this.chain[this.chain.length - 1]?.bone ?? null;
  }

  // Call after the animation has posed him this frame.
  update(target: Vector3, dt: number): void {
    if (!this.head) return;
    const t = TUNING.caller.look;
    this.body.updateMatrixWorld(true);
    this.body.getWorldQuaternion(bodyQ); // his body faces +z in this frame

    // Where the target is, seen from his head, in his body's frame.
    const headPos = this.head.getWorldPosition(tmpV);
    const local = headPos.subVectors(target, headPos).applyQuaternion(tmpQ.copy(bodyQ).invert());
    const wantYaw = MathUtils.clamp(Math.atan2(local.x, local.z), -t.maxYawDeg * MathUtils.DEG2RAD, t.maxYawDeg * MathUtils.DEG2RAD);
    const wantPitch = MathUtils.clamp(
      Math.atan2(local.y, Math.hypot(local.x, local.z)),
      -t.maxDownDeg * MathUtils.DEG2RAD,
      t.maxUpDeg * MathUtils.DEG2RAD,
    );
    // Turn smoothly rather than snapping.
    const k = 1 - Math.exp(-t.turnRate * dt);
    this.yaw += (wantYaw - this.yaw) * k;
    this.pitch += (wantPitch - this.pitch) * k;

    // Each joint adds its share: yaw about the world up, pitch about his (turned) side axis.
    for (const { bone, share } of this.chain) {
      yawQ.setFromAxisAngle(UP, this.yaw * share);
      pitchAxis.set(-1, 0, 0).applyQuaternion(bodyQ).applyQuaternion(yawQ); // looking up = rotating about -x
      pitchQ.setFromAxisAngle(pitchAxis, this.pitch * share);
      bone.getWorldQuaternion(boneQ);
      boneQ.premultiply(yawQ).premultiply(pitchQ);
      bone.parent!.getWorldQuaternion(parentQ);
      bone.quaternion.copy(parentQ.invert().multiply(boneQ));
      bone.updateMatrixWorld(true);
    }
  }
}

const trackers: HeadTracker[] = [];

export function addHeadTracker(body: Object3D): void {
  trackers.push(new HeadTracker(body));
}

export function updateHeadTracking(dt: number): void {
  for (const tr of trackers) tr.update(lookTarget, dt);
}
