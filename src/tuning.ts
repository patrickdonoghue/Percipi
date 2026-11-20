// Every tunable number in Percipi lives here.
// Change a value, save, and the dev server reloads the page.

export const TUNING = {
  dissolve: {
    appearSeconds: 0.45, // "quick splash" (a little softer than the PRD's 0.3, to calm the replay)
    vanishSeconds: 1.8, // "slow fade" (longer than the PRD's 0.7: things linger like a fading memory instead of strobing)
    noiseScale: 1.1, // size of the dissolve pattern (higher = finer grain; lower = bigger, calmer patches)
    edgeWidth: 0.16, // width of the glowing edge, in noise units (wider = softer)
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
    cornerInset: 0.003, // metres: wall ends stop just inside the wall they meet (no flicker)
    floorTile: 2.0,
    floorThickness: 0.05,
  },

  door: {
    openAngleDeg: 100, // the most a door opens; less if a wall is in the way
    stopGap: 0.02, // metres: an open door stops this far short of a wall
    hingeSkip: 0.15, // metres from the hinge not checked against walls (the frame touches there)
    swingSeconds: 0.6,
    thickness: 0.05,
    interactDistance: 1.8, // metres: how close you must be to open/close a door
    startOpenFraction: 0.2, // doors start ajar to test the "crack" view
  },

  render: {
    maxPixelRatio: 2,
    ambientIntensity: 1.8, // sky + ground bounce light (lifts the shadows indoors)
    sunIntensity: 1.5,
    sunPosition: [7, 14, 3] as const, // key light: angled so each wall direction gets its own shade
    fillIntensity: 0.6,
    fillPosition: [-4, 6, -9] as const,
    skyColor: 0xa9cbe6, // walk only; the replay's background stays black
    colors: {
      floor: 0x8a8a8a,
      outdoorFloor: 0x6f736f,
      wall: 0xc8c8c8,
      furniture: 0x9c9c9c,
      door: 0x8c8580,
      prop: 0xb0b0b0,
      glass: 0xffffff, // windows are coloured by their frame and pane (below)
      // The house (Phase 2 palette)
      woodFloor: 0xb38b63,
      tileFloor: 0xd8d4cc,
      grass: 0x6f9a52,
      concrete: 0xaaa69f,
      wallInside: 0xf1e7d3, // warm cream paint (rooms without their own colour below)
      wallOutside: 0xffd24f, // sunny yellow siding, bright against the white trim and green yard
      fence: 0x9b7653,
      porchTrim: 0xf4f1ea, // porch posts and roof (white trim, like the window frames)
      frontDoor: 0xb8402f, // a red front door (tints the door model)
    },
    // Wall paint for each room, by its floor's id in layout.ts (both sides of a wall get their own room's colour).
    roomPaint: {
      kitchen_floor: 0xffe3a8, // warm buttercream
      living_floor: 0xffe3a8,
      hall_floor: 0xfbeed6,
      bed1_floor: 0x9fcbf2, // soft sky blue (where he wakes)
      bed2_floor: 0xbde29a, // sage green
      bath_floor: 0x94e0d0, // seafoam
    },
    // Shading baked into the wall colours (free to draw), so walls facing
    // different ways never blend into one flat shape.
    wallShading: {
      faceShade: { '+x': 1.0, '-x': 0.84, '+z': 0.93, '-z': 0.77, '+y': 1.0, '-y': 1.0 }, // by the way a face points
      floorShade: 0.8, // brightness at the floor, rising to 1 at the top of the wall
    },
    sunColor: 0xfff0d6, // warm morning sun
    ambientColor: 0xfff8ee, // sky light from above, fills the shadows (a hemisphere light)
    groundColor: 0xd8b48c, // warm light bounced up from floors and grass
    window: {
      frameColor: 0xf4f1ea,
      frameWidth: 0.06, // metres
      frameDepth: 0.1, // metres, front to back
      glassColor: [0.78, 0.9, 0.97] as const,
      glassOpacity: 0.22,
      glassThickness: 0.02, // metres
    },
  },

  eyes: {
    openSeconds: 1.2, // the black fades away this fast when he opens his eyes
    sunriseSeconds: 3.5, // morning light rises to full over this long
    startLight: 0.25, // light level (0..1) at the moment his eyes open
    ignoreTapSeconds: 0.35, // the wake-up tap itself doesn't also open the eyes
  },

  hints: {
    delaySeconds: 1.0, // pause before a hint appears (after the eyes open / the replay starts)
    minSeconds: 4, // a hint stays at least this long, even once you've done it
    maxSeconds: 12, // and goes by itself after this long
    walkDoneMetres: 3, // the walk hint fades once you've walked this far
  },

  hud: {
    updateIntervalSeconds: 0.5,
  },

  // Per-pixel sight (replay): his recorded eyes act like a light source.
  // A pixel exists only if it was in his line of sight recently.
  pixelSight: {
    enabled: true, // false = fall back to per-object sight in the replay
    slots: 10, // recent snapshots kept; slots x interval should cover vanishSeconds
    intervalSeconds: 0.2, // time between kept snapshots
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
    sizzle: {
      radius: 3.5, // small: heard only close to the kitchen (the smell travels further)
      volume: 0.25,
      pulseSeconds: 1.0,
    },
    voice: {
      radius: 30, // the caller can be heard across the yard
      volume: 1.0,
      // "Hey" and "over here" start at these moments in HeyOverHere.mp3 (one ripple each).
      phraseTimes: [0.1, 0.65],
      repeatSeconds: 5, // calls again after this long if he hasn't looked
      maxCalls: 3,
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

  smell: {
    puffs: 64, // how many smell puffs can exist at once
    emitSeconds: 0.3, // a new puff every this many seconds
    lifeSeconds: 18, // how long a puff lasts
    startRadius: 0.35, // metres
    growth: 0.07, // metres per second a puff spreads
    maxRadius: 1.4,
    flowSpeed: 0.45, // m/s smell spreads outwards from the source (through open space and doorways)
    flowCell: 0.25, // metres: grid size of the flow map
    wander: 0.35, // m/s of random swirl
    damping: 0.6, // how quickly swirl settles back to the draught
    height: 1.35, // metres: puffs float around nose height
    heightSpread: 0.3,
    decay: 9, // seconds for a puff's strength to fall to about a third
    prewarmSeconds: 10, // the bacon has been frying this long before he wakes
    noticeStrength: 0.15, // weaker than this and he doesn't notice it
    lingerSeconds: 3, // smell stays with him this long after the last whiff
    fragmentRadius: 1.0, // metres: nearby objects (the counter) flicker with the source
    recordHz: 5, // plume snapshots per second (for the replay)
    stepSeconds: 1 / 30, // simulation step
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
    headSmoothSeconds: 0.25, // replay steadies his recorded head over this window (0 = off, raw recording)
    maxRecordSeconds: 1200, // walk ends automatically after this long (safety cap)
    minDistance: 6,
    maxDistance: 90,
    maxPolarDeg: 82, // stop the camera going below the ground
    ripple: {
      width: 0.3, // metres: thickness of a sound ripple ring
      opacity: 0.6,
      color: [0.75, 0.86, 1.0] as const, // pale blue, distinct from the warm dissolve edge
      height: 0.06, // metres above the floor
    },
    smellTrail: {
      color: [1.0, 0.76, 0.45] as const, // warm amber wisps
      opacity: 0.13,
      sizeScale: 0.6, // wisps are drawn this fraction of the puff's smell radius
    },
    ghost: {
      level: 0.4, // how dissolved a smelled-but-unseen object looks
      flickerSpeed: 2.5, // how fast it flickers in and out
    },
    haze: {
      level: 0.55, // how dissolved a heard-but-unseen object looks (0 solid .. 1 gone)
      flicker: 0.3, // how much it wavers
      flickerSpeed: 9, // how fast it wavers
    },
  },

  // Yard surfaces (see decor.ts)
  porch: {
    postHeight: 2.4, // metres; the roof sits on top
    roofThickness: 0.15,
    roofOverhangPx: 18, // plan pixels the roof reaches past the posts
  },

  hedge: {
    color: 0x4a7c34,
    step: 0.22, // metres between the bumps' vertices
    rounding: 0.3, // metres: how much the top edges and ends are rounded off
    bump: 0.08, // metres: how far leaves poke in and out
    bumpScale: 2.4, // bumps per metre
    shade: 0.35, // light/dark variation between leaf clumps (0..1)
    darkerAtBase: 0.35, // the bottom is this much darker than the top
  },
  sidewalk: {
    grooveWidth: 0.03, // metres: the dark joint between concrete squares
    grooveShade: 0.55, // joint brightness (1 = no joint)
    speckle: 0.08, // grain in the concrete surface
  },

  caller: {
    height: 1.78, // metres: same as the replay figure (character.height)
    // His clothes are repainted so he isn't mistaken for the main figure:
    // light blue shirt -> red, blue jeans -> brown.
    recolor: [
      { hueMin: 170, hueMax: 205, toHue: 2, sat: 0.9, light: 0.7 },
      { hueMin: 205, hueMax: 250, toHue: 30, sat: 0.6, light: 1.2 },
    ],
    // He turns his head to watch you, within what a neck can comfortably do.
    look: {
      maxYawDeg: 75, // left/right; beyond this he holds the furthest turn
      maxUpDeg: 25,
      maxDownDeg: 35,
      turnRate: 4, // how quickly his gaze follows (higher = snappier)
      shares: { spine: 0.2, neck: 0.35, head: 0.45 }, // how the turn is split between joints
    },
  },

  character: {
    height: 1.78, // metres, the replay figure (eyes end up near player.eyeHeight)
    color: 0xf0b37e, // gaze cone
    walkThreshold: 0.3, // m/s: slower than this he stands idle
    jumpSpeed: 20, // m/s: faster than this is a scrub jump, not walking
    blendRate: 6, // how quickly walk and idle blend into each other
    maxStrideScale: 1.6, // walk animation can speed up to this much to match his pace
    headTilt: 0.7, // how much of his look up/down shows as a head tilt
    gazeLength: 1.2, // faint cone showing where he is looking
    gazeRadius: 0.35,
    gazeOpacity: 0.22,
  },

  maxFrameSeconds: 0.1, // clamp long frames (tab switch) so nothing jumps
} as const;

export const DEG = Math.PI / 180;
