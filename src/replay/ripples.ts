import { AdditiveBlending, Color, Group, Mesh, PlaneGeometry, ShaderMaterial } from 'three';
import { TUNING } from '../tuning';
import type { Perceivable } from '../perception/tags';
import type { SoundEvent } from './recorder';

const plane = new PlaneGeometry(2, 2);
plane.rotateX(-Math.PI / 2); // lie flat on the floor

const VERT = /* glsl */ `
varying vec2 vLocal;
void main() {
  vLocal = position.xz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// A soft ring at uRadius metres, uWidth wide, fading as it nears the sound's range.
const FRAG = /* glsl */ `
uniform float uRadius;
uniform float uScale;
uniform float uWidth;
uniform float uOpacity;
uniform vec3 uColor;
varying vec2 vLocal;
void main() {
  float d = length(vLocal) * uScale;
  float x = (d - uRadius) / uWidth;
  float a = exp(-x * x) * uOpacity;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor * a, a);
}`;

interface Ring {
  mesh: Mesh;
  mat: ShaderMaterial;
}

// Sound ripples in the replay, rebuilt each frame from the recorded ripple events.
export class Ripples {
  readonly root = new Group();
  private readonly rings: Ring[] = [];
  private readonly pulses: SoundEvent[];

  constructor(
    events: readonly SoundEvent[],
    private readonly items: readonly Perceivable[],
  ) {
    this.pulses = events.filter((e) => e.action === 'pulse');
  }

  update(time: number): void {
    const speed = TUNING.sound.rippleSpeed;
    let used = 0;
    for (const e of this.pulses) {
      if (e.t > time) break;
      const source = this.items[e.item];
      const range = source?.tags.sound?.radius;
      if (!source || range === undefined) continue;
      const radius = (time - e.t) * speed;
      if (radius > range) continue;
      const ring = this.ring(used++);
      const r = TUNING.replay.ripple;
      const scale = radius + r.width * 3;
      source.mesh.getWorldPosition(ring.mesh.position);
      ring.mesh.position.y = r.height;
      ring.mesh.scale.setScalar(scale);
      ring.mat.uniforms.uRadius!.value = radius;
      ring.mat.uniforms.uScale!.value = scale;
      ring.mat.uniforms.uOpacity!.value = r.opacity * (1 - radius / range);
      ring.mesh.visible = true;
    }
    for (let i = used; i < this.rings.length; i++) this.rings[i]!.mesh.visible = false;
  }

  private ring(i: number): Ring {
    const existing = this.rings[i];
    if (existing) return existing;
    const r = TUNING.replay.ripple;
    const mat = new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uRadius: { value: 0 },
        uScale: { value: 1 },
        uWidth: { value: r.width },
        uOpacity: { value: r.opacity },
        uColor: { value: new Color(...r.color) },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const mesh = new Mesh(plane, mat);
    mesh.renderOrder = 10;
    this.root.add(mesh);
    const ring = { mesh, mat };
    this.rings.push(ring);
    return ring;
  }
}
