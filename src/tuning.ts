// Every tunable number in Percipi lives here.
// Change a value, save, and the dev server reloads the page.

export const TUNING = {
  dissolve: {
    appearSeconds: 0.3, // "quick splash"
    vanishSeconds: 0.7, // "slow fade"
    noiseScale: 2.5, // size of the dissolve pattern (higher = finer grain)
    edgeWidth: 0.06, // width of the glowing edge, in noise units
    edgeIntensity: 2.0,
    edgeColor: [1.0, 0.82, 0.55] as const, // warm glow at the dissolve edge
    noiseLow: 0.15, // noise range the dissolve sweeps across
    noiseHigh: 0.85,
  },

  sight: {
    coneHalfAngleDeg: 60, // half-angle of the view cone (should cover the screen corners)
    maxDistance: 40, // metres
    samplesPerAxis: 3, // sample points per object axis for line-of-sight
    thinAxisMetres: 0.3, // axes thinner than this get a single sample
    sampleInset: 0.1, // keep samples this fraction away from box edges
    blockerEpsilon: 0.02, // metres; tolerance when comparing hit distances
  },

  player: {
    eyeHeight: 1.6,
    radius: 0.25,
    walkSpeed: 2.5, // metres per second
    pitchLimitDeg: 85,
    collideBelow: 1.6, // boxes starting above this height don't block walking
    collideAbove: 0.2, // boxes ending below this height don't block walking
  },

  input: {
    mouseSensitivity: 0.0022, // radians per pixel
    touchLookSensitivity: 0.005, // radians per pixel
    joystickRadiusPx: 60,
  },

  camera: {
    fovDeg: 75,
    near: 0.05,
    far: 100,
  },

  house: {
    wallHeight: 2.6,
    wallThickness: 0.15,
    doorHeight: 2.1,
    windowSill: 1.0,
    windowHead: 2.1,
    maxWallSegment: 2.0, // long walls are split into pieces this long
    floorTile: 2.0,
    floorThickness: 0.05,
  },

  door: {
    openAngleDeg: 100,
    swingSeconds: 0.6,
    thickness: 0.05,
    interactDistance: 2.5,
    startOpenFraction: 0.2, // doors start ajar to test the "crack" view
  },

  render: {
    maxPixelRatio: 2,
    ambientIntensity: 0.35,
    sunIntensity: 1.8,
    sunPosition: [7, 14, 3] as const, // key light: angled so each wall direction gets its own shade
    fillIntensity: 0.6,
    fillPosition: [-4, 6, -9] as const,
    colors: {
      floor: 0x8a8a8a,
      outdoorFloor: 0x6f736f,
      wall: 0xc8c8c8,
      furniture: 0x9c9c9c,
      door: 0x8c8580,
      prop: 0xb0b0b0,
    },
  },

  hud: {
    updateIntervalSeconds: 0.5,
  },

  maxFrameSeconds: 0.1, // clamp long frames (tab switch) so nothing jumps
} as const;

export const DEG = Math.PI / 180;
