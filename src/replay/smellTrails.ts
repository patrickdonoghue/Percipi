import { BufferAttribute, BufferGeometry, Color, PerspectiveCamera, Points, ShaderMaterial } from 'three';
import { DEG, TUNING } from '../tuning';
import { SmellField } from '../perception/smell';
import type { PlumeSnapshot } from './recorder';

const VERT = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
uniform float uPixelScale;
varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = 2.0 * aSize * uPixelScale / max(0.1, -mv.z);
  vAlpha = aAlpha;
  gl_Position = projectionMatrix * mv;
}`;

// A soft round wisp.
const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = (1.0 - smoothstep(0.0, 1.0, d)) * vAlpha * uOpacity;
  if (a < 0.005) discard;
  gl_FragColor = vec4(uColor, a);
}`;

// Drifting smell trails in the replay, drawn from the recorded plume snapshots.
export class SmellTrails {
  readonly points: Points;
  private readonly pos: BufferAttribute;
  private readonly size: BufferAttribute;
  private readonly alpha: BufferAttribute;
  private readonly mat: ShaderMaterial;
  private readonly count: number;

  constructor(private readonly plume: readonly PlumeSnapshot[]) {
    this.count = TUNING.smell.puffs;
    const geo = new BufferGeometry();
    this.pos = new BufferAttribute(new Float32Array(this.count * 3), 3);
    this.size = new BufferAttribute(new Float32Array(this.count), 1);
    this.alpha = new BufferAttribute(new Float32Array(this.count), 1);
    geo.setAttribute('position', this.pos);
    geo.setAttribute('aSize', this.size);
    geo.setAttribute('aAlpha', this.alpha);
    const t = TUNING.replay.smellTrail;
    this.mat = new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uPixelScale: { value: 500 },
        uColor: { value: new Color(...t.color) },
        uOpacity: { value: t.opacity },
      },
      transparent: true,
      depthWrite: false,
    });
    this.points = new Points(geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 11;
  }

  update(time: number, camera: PerspectiveCamera, viewportHeight: number): void {
    this.mat.uniforms.uPixelScale!.value = viewportHeight / (2 * Math.tan((camera.fov * DEG) / 2));
    const [a, b, f] = this.around(time);
    for (let k = 0; k < this.count; k++) {
      const i = k * 4;
      const ageA = a ? a.puffs[i + 3]! : -1;
      const ageB = b ? b.puffs[i + 3]! : -1;
      // Interpolate when it's the same puff in both snapshots; otherwise take the nearer one.
      const same = ageA >= 0 && ageB >= ageA;
      const src = same ? null : f < 0.5 ? a : b;
      const age = same ? ageA + (ageB - ageA) * f : src ? src.puffs[i + 3]! : -1;
      if (age < 0 || !a) {
        this.alpha.setX(k, 0);
        continue;
      }
      const pick = (o: number) => (same ? a.puffs[i + o]! + (b!.puffs[i + o]! - a.puffs[i + o]!) * f : src!.puffs[i + o]!);
      this.pos.setXYZ(k, pick(0), pick(1), pick(2));
      this.size.setX(k, SmellField.radius(age) * TUNING.replay.smellTrail.sizeScale);
      this.alpha.setX(k, SmellField.strength(age) * Math.min(1, age / 0.6));
    }
    this.pos.needsUpdate = true;
    this.size.needsUpdate = true;
    this.alpha.needsUpdate = true;
  }

  // The snapshots either side of `time`, and how far between them (0..1).
  private around(time: number): [PlumeSnapshot | undefined, PlumeSnapshot | undefined, number] {
    const p = this.plume;
    if (p.length === 0) return [undefined, undefined, 0];
    let lo = 0;
    let hi = p.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (p[mid]!.t <= time) lo = mid;
      else hi = mid - 1;
    }
    const a = p[lo]!;
    const b = p[Math.min(lo + 1, p.length - 1)]!;
    const f = b.t > a.t ? Math.min(1, Math.max(0, (time - a.t) / (b.t - a.t))) : 0;
    return [a, b, f];
  }
}
