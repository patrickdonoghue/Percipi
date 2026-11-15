// Every tunable number in Percipi lives here.
// Change a value, save, and the dev server reloads the page.

export const TUNING = {
  dissolve: {
    appearSeconds: 0.3, // "quick splash"
    vanishSeconds: 0.7, // "slow fade"
    noiseScale: 2.5, // size of the dissolve pattern (higher = finer grain)
    edgeWidth: 0.12, // width of the glowing edge, in noise units (wider = softer)
    edgeIntensity: 0.45, // brightness of the edge glow (higher blows out to white)
    edgeSoftness: 2.0, // how quickly the glow fades into the surface (higher = gentler)
    edgeColor: [1.0, 0.86, 0.68] as const, // warm glow at the dissolve edge
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
    gyroEnabled: true,
    gyroSensitivity: 1.0, // 1 = head turns exactly as much as the phone
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
    interactDistance: 1.8, // metres: how close you must be to open/close a door
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

  // Per-pixel sight (replay): his recorded eyes act like a light source.
  // A pixel exists only if it was in his line of sight recently.
  pixelSight: {
    enabled: true, // false = fall back to per-object sight in the replay
    slots: 8, // recent snapshots kept; slots x interval should cover vanishSeconds
    intervalSeconds: 0.1, // time between kept snapshots
    tileSize: 512, // snapshot resolution (pixels per side)
    near: 0.1, // metres
    biasMetres: 0.04, // tolerance so surfaces don't hide themselves
    biasSlope: 0.004, // extra tolerance per metre of distance
  },

  sound: {
    rippleSpeed: 12, // m/s that sound ripples spread (slower than real sound, so the replay can show it)
    hearHoldSeconds: 1.1, // how long a sound counts as "heard" after a ripple reaches him
    masterVolume: 0.8,
    refDistance: 1.5, // metres at which a sound plays at full volume
    rolloff: 1.0, // how fast volume falls with distance
    alarm: {
      radius: 14, // metres: beyond this he can't hear it
      volume: 0.35,
      pulseSeconds: 1.0, // one ripple per ring cycle
      beepHz: 2100,
    },
    dog: {
      radius: 30,
      volume: 0.9,
      // The bark sound is one clip containing several barks (public/audio/bark.mp3).
      // These are the moments (seconds into the clip) each bark starts: one ripple each.
      barkTimes: [0, 0.6, 1.2],
      startDelay: 0.4, // seconds after entering the living area
    },
  },

  replay: {
    fovDeg: 30, // narrow lens so the view reads as isometric
    azimuthDeg: 45, // camera direction around the house
    elevationDeg: 40, // camera height angle above the ground
    distance: 22, // metres from the character
    followSmoothing: 2.5, // how quickly the camera keeps up with him (higher = tighter)
    zoomSeconds: 2.8, // pull-out from the head to the isometric view
    holdSeconds: 1.2, // pause on the "reveal" before playback starts
    figureAppearAt: 0.15, // fraction of the pull-out after which his figure is shown
    wallCutHeight: 1.1, // dollhouse: walls are shown this tall in the replay
    playbackSpeed: 1,
    maxRecordSeconds: 1200, // walk ends automatically after this long (safety cap)
    minDistance: 6,
    maxDistance: 90,
    maxPolarDeg: 82, // stop the camera going below the ground
  },

  character: {
    bodyRadius: 0.2,
    bodyHeight: 1.45,
    headRadius: 0.13,
    color: 0xf0b37e,
    gazeLength: 1.2, // faint cone showing where he is looking
    gazeRadius: 0.35,
    gazeOpacity: 0.22,
  },

  maxFrameSeconds: 0.1, // clamp long frames (tab switch) so nothing jumps
} as const;

export const DEG = Math.PI / 180;
