import { Camera, DoubleSide, Material, PerspectiveCamera, Quaternion, Scene, Vector3, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DEG, TUNING } from '../tuning';
import type { AudioOut } from '../audio/audioOut';
import type { DissolveRenderer } from '../render/dissolve';
import { PixelSight, pixelSightUniforms } from '../perception/pixelSight';
import type { GreyboxWorld } from '../world/greybox';
import { Character } from './character';
import { Dollhouse } from './dollhouse';
import { Playback } from './playback';
import type { Frame, PlumeSnapshot, SoundEvent } from './recorder';
import { ReplayAudio } from './replayAudio';
import { Ripples } from './ripples';
import { SmellTrails } from './smellTrails';
import { SightHistory } from './sightHistory';
import { ReplayBar } from './ui';

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// After the walk: pull the camera out of his head to an isometric view
// (the reveal), then play the walk back with the world shown as perceived.
export class ReplayMode {
  readonly camera: PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly character = new Character();
  private readonly dollhouse: Dollhouse;
  private readonly playback: Playback;
  private readonly bar: ReplayBar;
  private readonly history: SightHistory | null = null; // per-pixel sight (null = per-object fallback)
  private readonly ripples: Ripples;
  private readonly sounds: ReplayAudio;
  private readonly trails: SmellTrails;
  private readonly canvas: HTMLCanvasElement;
  private readonly ear = new Vector3();
  private readonly earForward = new Vector3();
  private phase: 'zoom' | 'hold' | 'play' = 'zoom';
  private phaseTime = 0;

  private readonly startPos = new Vector3();
  private readonly startQuat = new Quaternion();
  private readonly startFov: number;
  private readonly endPos = new Vector3();
  private readonly endQuat = new Quaternion();
  private readonly target = new Vector3(); // follows the character
  private readonly follow = new Vector3();

  constructor(
    renderer: WebGLRenderer,
    scene: Scene,
    povCamera: PerspectiveCamera,
    canvas: HTMLCanvasElement,
    frames: readonly Frame[],
    events: readonly SoundEvent[],
    plume: readonly PlumeSnapshot[],
    audio: AudioOut,
    private readonly world: GreyboxWorld,
    private readonly dissolve: DissolveRenderer,
  ) {
    const r = TUNING.replay;
    this.camera = povCamera.clone();
    this.startPos.copy(povCamera.position);
    this.startQuat.copy(povCamera.quaternion);
    this.startFov = povCamera.fov;
    const last = frames[frames.length - 1];
    if (last) this.target.set(last.x, TUNING.player.eyeHeight / 2, last.z);

    // Isometric end pose.
    const az = r.azimuthDeg * DEG;
    const el = r.elevationDeg * DEG;
    this.endPos.set(
      this.target.x + r.distance * Math.cos(el) * Math.sin(az),
      r.distance * Math.sin(el),
      this.target.z + r.distance * Math.cos(el) * Math.cos(az),
    );
    const look = new PerspectiveCamera();
    look.position.copy(this.endPos);
    look.lookAt(this.target);
    this.endQuat.copy(look.quaternion);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enabled = false;
    this.controls.enableDamping = true;
    this.controls.target.copy(this.target);
    this.controls.minDistance = r.minDistance;
    this.controls.maxDistance = r.maxDistance;
    this.controls.maxPolarAngle = r.maxPolarDeg * DEG;
    this.controls.enablePan = false; // the camera follows him instead

    this.dollhouse = new Dollhouse(world.items);
    this.playback = new Playback(frames, world.items, world.doors);
    this.bar = new ReplayBar(this.playback.duration, {
      onTogglePlay: () => this.playback.togglePlay(),
      onSeek: (t) => this.playback.seek(t),
    });

    // The reveal: show what he sensed in the final moment while we pull out.
    if (last) {
      this.playback.apply(last);
      this.character.setPose(last.x, last.z, last.yaw, last.pitch);
    }
    this.character.root.visible = false;
    scene.add(this.character.root);
    this.ripples = new Ripples(events, world.items);
    this.ripples.root.visible = false;
    scene.add(this.ripples.root);
    this.sounds = new ReplayAudio(audio, events, world.items);
    this.trails = new SmellTrails(plume);
    this.trails.points.visible = false;
    scene.add(this.trails.points);
    this.canvas = canvas;

    if (TUNING.pixelSight.enabled) {
      this.history = new SightHistory(new PixelSight(renderer, scene), this.playback, world, this.dollhouse, this.character);
      pixelSightUniforms.uPixelMode.value = 1;
      pixelSightUniforms.uSolid.value = 1; // start solid; the reveal dissolves everything unseen
      // Only the faces he saw survive, so draw both sides: a wall seen from the
      // far side still shows the face he looked at.
      for (const p of world.items) {
        const mat = p.mesh.material as Material;
        mat.side = DoubleSide;
        mat.needsUpdate = true;
      }
    }
  }

  get activeCamera(): Camera {
    return this.camera;
  }

  update(dt: number): void {
    const r = TUNING.replay;
    this.phaseTime += dt;

    if (this.phase === 'zoom') {
      const k = ease(Math.min(1, this.phaseTime / r.zoomSeconds));
      this.camera.position.lerpVectors(this.startPos, this.endPos, k);
      this.camera.quaternion.slerpQuaternions(this.startQuat, this.endQuat, k);
      this.camera.fov = this.startFov + (r.fovDeg - this.startFov) * k;
      this.camera.updateProjectionMatrix();
      this.dollhouse.setCut(k);
      // The camera starts inside his head: show the figure once we've pulled away.
      this.character.root.visible = k >= r.figureAppearAt;
      if (this.phaseTime >= r.zoomSeconds) this.enter('hold');
    } else if (this.phase === 'hold') {
      if (this.phaseTime >= r.holdSeconds) {
        this.enter('play');
        this.controls.enabled = true;
        this.bar.show();
        this.playback.seek(0);
        this.playback.playing = true;
      }
    } else {
      this.controls.update();
      this.playback.advance(dt);
      const frame = this.playback.currentFrame();
      if (frame) {
        this.playback.apply(frame);
        this.character.setPose(frame.x, frame.z, frame.yaw, frame.pitch);
        this.followCharacter(frame.x, frame.z, dt);
      }
      this.bar.update(this.playback.time, this.playback.playing);
    }

    this.character.update(dt);

    const t = this.phase === 'play' ? this.playback.time : this.playback.duration;
    const playing = this.phase === 'play';

    // Hearing and smell: hazy / ghostly objects, ripples, smell trails, and the sounds.
    this.dissolve.updateSenses(this.world.items, dt, t);
    this.ripples.root.visible = playing;
    this.trails.points.visible = playing;
    if (playing) {
      this.ripples.update(t);
      this.trails.update(t, this.camera, this.canvas.height);
    }
    this.updateEar(t);
    this.sounds.update(t, playing && this.playback.playing, this.ear, this.earForward);

    if (this.history) {
      // Per-pixel: the recorded eyes decide every pixel; cheap culling skips the rest.
      const solid = pixelSightUniforms.uSolid;
      solid.value = Math.max(0, solid.value - dt / TUNING.dissolve.vanishSeconds);
      this.history.update(t);
      const history = this.history;
      this.dissolve.showPerPixel(
        this.world.items,
        (p) => !this.dollhouse.isHidden(p) && (solid.value > 0 || history.isDrawable(p)),
      );
    } else {
      this.dissolve.update(this.world.items, dt, this.dollhouse.isHidden);
    }
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  // Glide the orbit centre towards him, carrying the camera along so the
  // viewer's chosen angle and zoom are kept.
  private followCharacter(x: number, z: number, dt: number): void {
    const k = 1 - Math.exp(-TUNING.replay.followSmoothing * dt);
    this.follow.set(x, this.target.y, z).sub(this.target).multiplyScalar(k);
    this.target.add(this.follow);
    this.camera.position.add(this.follow);
    this.controls.target.copy(this.target);
  }

  // Replay sound is heard from where his head was.
  private updateEar(t: number): void {
    const f = this.playback.frameAt(t);
    if (!f) return;
    this.ear.set(f.x, TUNING.player.eyeHeight, f.z);
    this.earForward.set(-Math.sin(f.yaw) * Math.cos(f.pitch), Math.sin(f.pitch), -Math.cos(f.yaw) * Math.cos(f.pitch));
  }

  private enter(phase: 'zoom' | 'hold' | 'play'): void {
    this.phase = phase;
    this.phaseTime = 0;
  }
}
