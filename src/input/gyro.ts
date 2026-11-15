import { Euler, Quaternion, Vector3 } from 'three';
import { TUNING } from '../tuning';
import { applyLook, type Head } from './head';

const ZEE = new Vector3(0, 0, 1);
const BACK_TO_SKY = new Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // camera looks out the back of the phone
const DEG = Math.PI / 180;

type PermissionApi = { requestPermission?: () => Promise<'granted' | 'denied'> };

// Gyro look on phones: turning/tilting the phone turns the head. It adds the
// phone's *change* in direction each moment, so it combines with thumb-drag look.
export class GyroInput {
  private enabledFlag = true;
  private last: { yaw: number; pitch: number } | null = null;
  private readonly q = new Quaternion();
  private readonly q0 = new Quaternion();
  private readonly euler = new Euler();
  private readonly fwd = new Vector3();

  constructor(private readonly head: Head) {}

  set enabled(on: boolean) {
    this.enabledFlag = on;
    this.last = null; // avoid a jump when it is switched back on
  }

  // Must be called directly inside a tap handler: iPhones only allow the
  // permission prompt as a response to a tap.
  requestPermission(): void {
    if (!TUNING.input.gyroEnabled || typeof DeviceOrientationEvent === 'undefined') return;
    const api = DeviceOrientationEvent as unknown as PermissionApi;
    if (typeof api.requestPermission === 'function') {
      api
        .requestPermission()
        .then((state) => {
          if (state === 'granted') this.start();
        })
        .catch(() => {});
    } else {
      this.start();
    }
  }

  private start(): void {
    window.addEventListener('deviceorientation', this.onOrientation);
  }

  private readonly onOrientation = (e: DeviceOrientationEvent): void => {
    if (e.alpha === null || e.beta === null || e.gamma === null) return;
    const screenAngle = (screen.orientation?.angle ?? 0) * DEG;
    this.euler.set(e.beta * DEG, e.alpha * DEG, -e.gamma * DEG, 'YXZ');
    this.q.setFromEuler(this.euler).multiply(BACK_TO_SKY).multiply(this.q0.setFromAxisAngle(ZEE, -screenAngle));
    this.fwd.set(0, 0, -1).applyQuaternion(this.q);

    const yaw = Math.atan2(-this.fwd.x, -this.fwd.z);
    const pitch = Math.asin(Math.max(-1, Math.min(1, this.fwd.y)));
    const prev = this.last;
    this.last = { yaw, pitch };
    if (!this.enabledFlag || !prev) return;

    let dYaw = yaw - prev.yaw;
    if (dYaw > Math.PI) dYaw -= 2 * Math.PI;
    if (dYaw < -Math.PI) dYaw += 2 * Math.PI;
    if (Math.abs(this.fwd.y) > 0.97) dYaw = 0; // pointing straight up/down: heading is unreliable
    const dPitch = pitch - prev.pitch;
    // applyLook subtracts, so pass the negated change.
    applyLook(this.head, -dYaw, -dPitch, TUNING.input.gyroSensitivity);
  };
}
