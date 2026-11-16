import { Color, MeshStandardMaterial } from 'three';
import { TUNING } from '../tuning';
import type { Perceivable } from '../perception/tags';
import { PIXEL_SIGHT_GLSL, pixelSightUniforms } from '../perception/pixelSight';

// The dissolve shader is the only way objects appear or disappear.
// uDissolve: 0 = fully present, 1 = fully gone.
// uHaze: 0..1 how strongly an object shows as "heard but not seen" (hazy, flickering).

const DISSOLVE_GLSL = /* glsl */ `
uniform float uDissolve;
uniform float uHaze;
uniform float uTime;
uniform float uHazeLevel;
uniform float uHazeFlicker;
uniform float uHazeFlickerSpeed;
uniform float uNoiseScale;
uniform float uEdgeWidth;
uniform float uEdgeIntensity;
uniform float uEdgeSoftness;
uniform float uNoiseLow;
uniform float uNoiseHigh;
uniform vec3 uEdgeColor;
varying vec3 vDissolvePos;

float dHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float dNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(dHash(i), dHash(i + vec3(1, 0, 0)), f.x),
        mix(dHash(i + vec3(0, 1, 0)), dHash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(dHash(i + vec3(0, 0, 1)), dHash(i + vec3(1, 0, 1)), f.x),
        mix(dHash(i + vec3(0, 1, 1)), dHash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
float dFbm(vec3 p) {
  return 0.5 * dNoise(p) + 0.3 * dNoise(p * 2.03) + 0.2 * dNoise(p * 4.01);
}
`;

interface DissolveUniform {
  value: number;
}

// `sightThickness`: extra per-pixel sight tolerance for solid slabs (walls, doors),
// so the dollhouse-cut tops inside them count as seen along with their faces.
export function createDissolveMaterial(color: number, sightThickness = 0): MeshStandardMaterial {
  const mat = new MeshStandardMaterial({ color: new Color(color), roughness: 0.9, metalness: 0 });
  const d = TUNING.dissolve;
  const uDissolve: DissolveUniform = { value: 1 }; // start gone: nothing exists before waking
  mat.userData.dissolve = uDissolve;
  const uHaze: DissolveUniform = { value: 0 };
  mat.userData.haze = uHaze;

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uDissolve = uDissolve;
    shader.uniforms.uHaze = uHaze;
    shader.uniforms.uTime = sharedDissolveUniforms.uTime;
    shader.uniforms.uHazeLevel = { value: TUNING.replay.haze.level };
    shader.uniforms.uHazeFlicker = { value: TUNING.replay.haze.flicker };
    shader.uniforms.uHazeFlickerSpeed = { value: TUNING.replay.haze.flickerSpeed };
    shader.uniforms.uNoiseScale = { value: d.noiseScale };
    shader.uniforms.uEdgeWidth = { value: d.edgeWidth };
    shader.uniforms.uEdgeIntensity = { value: d.edgeIntensity };
    shader.uniforms.uEdgeSoftness = { value: d.edgeSoftness };
    shader.uniforms.uNoiseLow = { value: d.noiseLow };
    shader.uniforms.uNoiseHigh = { value: d.noiseHigh };
    shader.uniforms.uEdgeColor = { value: new Color(...d.edgeColor) };
    Object.assign(shader.uniforms, pixelSightUniforms);
    shader.uniforms.uSightThickness = { value: sightThickness };

    shader.vertexShader =
      'varying vec3 vDissolvePos;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvDissolvePos = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      );

    shader.fragmentShader =
      DISSOLVE_GLSL +
      PIXEL_SIGHT_GLSL +
      shader.fragmentShader
        .replace(
          '#include <clipping_planes_fragment>',
          `#include <clipping_planes_fragment>
          // Per-pixel replay: each point's own seen/fade state. Otherwise per object.
          float dAmt = uPixelMode > 0.5 ? pixelDissolve(vDissolvePos) * (1.0 - uSolid) : uDissolve;
          // Heard but not seen: partly there, wavering over space and time.
          if (uHaze > 0.0) {
            float flick = dNoise(vec3(vDissolvePos.xz * 1.3, uTime * uHazeFlickerSpeed)) - 0.5;
            float hazy = clamp(uHazeLevel + flick * 2.0 * uHazeFlicker, 0.0, 1.0);
            dAmt = min(dAmt, mix(1.0, hazy, uHaze));
          }
          float dN = dFbm(vDissolvePos * uNoiseScale);
          float dT = dAmt <= 0.0 ? -1.0 : (dAmt >= 1.0 ? 2.0 : mix(uNoiseLow, uNoiseHigh, dAmt));
          if (dN < dT) discard;
          float dEdge = dAmt > 0.0 ? pow(1.0 - smoothstep(0.0, uEdgeWidth, dN - dT), uEdgeSoftness) : 0.0;`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uEdgeColor * dEdge * uEdgeIntensity;',
        );
  };
  // All dissolve materials share one compiled shader program.
  mat.customProgramCacheKey = () => 'percipi-dissolve';
  return mat;
}

// Shared by all dissolve materials.
export const sharedDissolveUniforms = { uTime: { value: 0 } };

function uniformOf(p: Perceivable): DissolveUniform {
  const mat = p.mesh.material as MeshStandardMaterial;
  return mat.userData.dissolve as DissolveUniform;
}

function hazeOf(p: Perceivable): DissolveUniform {
  const mat = p.mesh.material as MeshStandardMaterial;
  return mat.userData.haze as DissolveUniform;
}

// Reads the perception engine's output and animates each object's dissolve.
export class DissolveRenderer {
  // POV: the world looks normal, everything fully solid.
  showAll(items: readonly Perceivable[]): void {
    for (const p of items) {
      uniformOf(p).value = 0;
      hazeOf(p).value = 0;
      p.mesh.visible = true;
    }
  }

  // Replay: objects he heard fade into a hazy state (quick), and out again (slow).
  // Seeing them makes them solid; the shader takes whichever is more present.
  updateHaze(items: readonly Perceivable[], dt: number, time: number): void {
    sharedDissolveUniforms.uTime.value = time;
    const { appearSeconds, vanishSeconds } = TUNING.dissolve;
    for (const p of items) {
      const h = hazeOf(p);
      if (p.sensed.sound) h.value = Math.min(1, h.value + dt / appearSeconds);
      else h.value = Math.max(0, h.value - dt / vanishSeconds);
    }
  }

  isHazy(p: Perceivable): boolean {
    return hazeOf(p).value > 0;
  }

  // Per-pixel replay: the shader decides each pixel; here we only skip drawing
  // objects that cannot have been seen (saves draw calls).
  showPerPixel(items: readonly Perceivable[], drawable: (p: Perceivable) => boolean): void {
    for (const p of items) {
      uniformOf(p).value = 0;
      p.mesh.visible = drawable(p) || this.isHazy(p);
    }
  }

  // Replay: animate each object towards what was sensed. `hidden` skips dollhouse-cut pieces.
  update(items: readonly Perceivable[], dt: number, hidden?: (p: Perceivable) => boolean): void {
    const { appearSeconds, vanishSeconds } = TUNING.dissolve;
    for (const p of items) {
      const u = uniformOf(p);
      if (p.present) u.value = Math.max(0, u.value - dt / appearSeconds);
      else u.value = Math.min(1, u.value + dt / vanishSeconds);
      // Fully dissolved objects are skipped entirely (saves draw calls).
      p.mesh.visible = (u.value < 1 || this.isHazy(p)) && !(hidden?.(p) ?? false);
    }
  }
}
