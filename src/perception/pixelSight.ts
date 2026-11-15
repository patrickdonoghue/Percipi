import {
  DepthTexture,
  Matrix4,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  Texture,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import { DEG, TUNING } from '../tuning';

// Per-pixel sight: the eyes are treated as a light source (shadow-map style).
// Each snapshot renders the distance to the nearest surface in every direction
// he could see. A surface point was seen if it is inside his view cone and not
// farther away than that snapshot says. Several recent snapshots are kept so
// each pixel can fade in and out over time.

export const SIGHT_SLOTS = TUNING.pixelSight.slots;
const COLS = 4;
const ROWS = Math.ceil(SIGHT_SLOTS / COLS);

export interface EyePose {
  x: number;
  z: number;
  yaw: number;
  pitch: number;
}

// Shared by every dissolve material (same objects, so one update reaches all).
export const pixelSightUniforms = {
  uPixelMode: { value: 0 }, // 1 = per-pixel replay, 0 = per-object / POV
  uSolid: { value: 1 }, // 1 = everything solid (start of the reveal), 0 = only what was seen
  uSightAtlas: { value: null as Texture | null },
  uSlotViewProj: { value: Array.from({ length: SIGHT_SLOTS }, () => new Matrix4()) },
  uSlotEye: { value: Array.from({ length: SIGHT_SLOTS }, () => new Vector3()) },
  uSlotFwd: { value: Array.from({ length: SIGHT_SLOTS }, () => new Vector3(0, 0, -1)) },
  uSlotAge: { value: new Array<number>(SIGHT_SLOTS).fill(0) },
  uSlotValid: { value: new Array<number>(SIGHT_SLOTS).fill(0) },
  uSlotTile: { value: new Array<number>(SIGHT_SLOTS).fill(0) },
  uSightNear: { value: TUNING.pixelSight.near },
  uSightFar: { value: TUNING.sight.maxDistance },
  uCosHalf: { value: Math.cos(TUNING.sight.coneHalfAngleDeg * DEG) },
  uMaxDist: { value: TUNING.sight.maxDistance },
  uSightBias: { value: TUNING.pixelSight.biasMetres },
  uSightBiasSlope: { value: TUNING.pixelSight.biasSlope },
  uSightInterval: { value: TUNING.pixelSight.intervalSeconds },
  uAppear: { value: TUNING.dissolve.appearSeconds },
  uVanish: { value: TUNING.dissolve.vanishSeconds },
  uAtlasCols: { value: COLS },
  uAtlasRows: { value: ROWS },
};

// GLSL used by the dissolve shader: how dissolved is this world point?
export const PIXEL_SIGHT_GLSL = /* glsl */ `
#define SIGHT_SLOTS ${SIGHT_SLOTS}
uniform float uPixelMode;
uniform float uSolid;
uniform sampler2D uSightAtlas;
uniform mat4 uSlotViewProj[SIGHT_SLOTS];
uniform vec3 uSlotEye[SIGHT_SLOTS];
uniform vec3 uSlotFwd[SIGHT_SLOTS];
uniform float uSlotAge[SIGHT_SLOTS];
uniform float uSlotValid[SIGHT_SLOTS];
uniform float uSlotTile[SIGHT_SLOTS];
uniform float uSightNear;
uniform float uSightFar;
uniform float uCosHalf;
uniform float uMaxDist;
uniform float uSightBias;
uniform float uSightBiasSlope;
uniform float uSightThickness;
uniform float uSightInterval;
uniform float uAppear;
uniform float uVanish;
uniform float uAtlasCols;
uniform float uAtlasRows;

bool sightLit(int i, vec3 p) {
  vec3 d = p - uSlotEye[i];
  float dist = length(d);
  if (dist > uMaxDist) return false;
  if (dist < 0.001) return true;
  if (dot(d / dist, uSlotFwd[i]) < uCosHalf) return false;
  vec4 clip = uSlotViewProj[i] * vec4(p, 1.0);
  if (clip.w <= 0.0) return false;
  vec2 ndc = clip.xy / clip.w;
  if (abs(ndc.x) > 1.0 || abs(ndc.y) > 1.0) return false;
  float tile = uSlotTile[i];
  vec2 cell = vec2(mod(tile, uAtlasCols), floor(tile / uAtlasCols));
  vec2 uv = (cell + ndc * 0.5 + 0.5) / vec2(uAtlasCols, uAtlasRows);
  float z = texture2D(uSightAtlas, uv).r;
  float nearest = (uSightNear * uSightFar) / (uSightFar - z * (uSightFar - uSightNear));
  return clip.w <= nearest + uSightBias + uSightBiasSlope * clip.w + uSightThickness;
}

// Slots arrive newest first. Returns 0 (fully present) .. 1 (gone).
float pixelDissolve(vec3 p) {
  float lastSeen = -1.0;
  float streakStart = -1.0;
  bool streak = true;
  for (int i = 0; i < SIGHT_SLOTS; i++) {
    if (uSlotValid[i] < 0.5) continue;
    if (sightLit(i, p)) {
      if (lastSeen < 0.0) lastSeen = uSlotAge[i];
      if (streak) streakStart = uSlotAge[i];
    } else if (lastSeen >= 0.0) {
      streak = false;
    }
  }
  if (lastSeen < 0.0) return 1.0;
  // Credit one interval so a fresh glimpse shows at once ("quick splash").
  float appear = clamp((streakStart - lastSeen + uSightInterval) / uAppear, 0.0, 1.0);
  float fade = clamp(lastSeen / uVanish, 0.0, 1.0);
  return 1.0 - appear * (1.0 - fade);
}
`;

// Renders eye snapshots into one shared texture (a grid of tiles).
export class PixelSight {
  private readonly target: WebGLRenderTarget;
  private readonly cam: PerspectiveCamera;
  private readonly depthOnly = new MeshBasicMaterial({ colorWrite: false });
  private readonly tileViewProj = Array.from({ length: SIGHT_SLOTS }, () => new Matrix4());
  readonly tileEye = Array.from({ length: SIGHT_SLOTS }, () => new Vector3());
  readonly tileFwd = Array.from({ length: SIGHT_SLOTS }, () => new Vector3());

  constructor(
    private readonly renderer: WebGLRenderer,
    private readonly scene: Scene,
  ) {
    const size = TUNING.pixelSight.tileSize;
    const w = size * COLS;
    const h = size * ROWS;
    this.target = new WebGLRenderTarget(w, h, { depthBuffer: true, depthTexture: new DepthTexture(w, h) });
    // A perspective view wide enough to contain the circular view cone.
    this.cam = new PerspectiveCamera(TUNING.sight.coneHalfAngleDeg * 2, 1, TUNING.pixelSight.near, TUNING.sight.maxDistance);
    this.cam.rotation.order = 'YXZ';
    pixelSightUniforms.uSightAtlas.value = this.target.depthTexture;
  }

  // Render what the eyes at `pose` could see into tile `tile`.
  capture(tile: number, pose: EyePose): void {
    const size = TUNING.pixelSight.tileSize;
    const cam = this.cam;
    cam.position.set(pose.x, TUNING.player.eyeHeight, pose.z);
    cam.rotation.set(pose.pitch, pose.yaw, 0);
    cam.updateMatrixWorld();
    this.tileViewProj[tile]!.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    this.tileEye[tile]!.copy(cam.position);
    cam.getWorldDirection(this.tileFwd[tile]!);

    const x = (tile % COLS) * size;
    const y = Math.floor(tile / COLS) * size;
    this.target.viewport.set(x, y, size, size);
    this.target.scissor.set(x, y, size, size);
    this.target.scissorTest = true;

    const prevAutoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;
    this.renderer.setRenderTarget(this.target);
    this.renderer.clear(true, true, false);
    this.scene.overrideMaterial = this.depthOnly;
    this.renderer.render(this.scene, cam);
    this.scene.overrideMaterial = null;
    this.renderer.setRenderTarget(null);
    this.renderer.autoClear = prevAutoClear;
  }

  // Hand the snapshots to the shader, newest first. `ages` in seconds; null = empty.
  publish(order: { tile: number; age: number | null }[]): void {
    const u = pixelSightUniforms;
    for (let i = 0; i < SIGHT_SLOTS; i++) {
      const entry = order[i];
      if (!entry || entry.age === null) {
        u.uSlotValid.value[i] = 0;
        continue;
      }
      u.uSlotValid.value[i] = 1;
      u.uSlotAge.value[i] = entry.age;
      u.uSlotTile.value[i] = entry.tile;
      u.uSlotViewProj.value[i]!.copy(this.tileViewProj[entry.tile]!);
      u.uSlotEye.value[i]!.copy(this.tileEye[entry.tile]!);
      u.uSlotFwd.value[i]!.copy(this.tileFwd[entry.tile]!);
    }
  }
}
