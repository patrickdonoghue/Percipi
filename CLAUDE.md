# CLAUDE.md — Percipi

## Project

Percipi is a browser-based Three.js visualization of Berkeley's "to be is to be perceived". The world exists only while the character senses it. The user explores a normal, solid world in first person (POV); after they end it, the walk is replayed from an isometric view where things appear and dissolve based on what the character sensed. Read `PRD.md` before any work. The PRD is the source of truth; if a request conflicts with it, ask.

## Owner

Patrick is not a strong coder. Explain changes in plain language, give exact steps for anything he must do (in GitHub Desktop or the browser), and never assume he will read the code to find problems.

## Stack

- Vanilla Three.js, TypeScript strict mode, Vite
- No frameworks (no React, no game engines)
- Deploy to GitHub Pages via the Vite build
- Develop on macOS; test on desktop Chrome, desktop Safari, iPhone Safari, Android Chrome

## Folder Layout

- `public/models` — GLB/glTF assets supplied by Patrick
- `public/audio` — OGG/MP3 assets supplied by Patrick
- `src/perception` — perception engine (sight, sound, smell)
- `src/render` — dissolve shader, materials
- `src/input` — desktop, touch twin-stick, gyro
- `src/replay` — recorder and playback
- `src/tuning.ts` — every tunable number lives here

## Rules

- All magic numbers go in `tuning.ts` (dissolve times, cone angle, sound radii, smell decay)
- Every perceivable object uses the shared sensory tag system; no one-off visibility logic
- POV mode shows the world normally: nothing appears or disappears there
- One perception engine decides what is sensed each frame (live in POV, recorded); the replay renders only from that recording
- In the replay, the dissolve shader is the only way objects appear or disappear
- Never accumulate: unsensed objects dissolve out (in the replay)
- Use placeholder grey boxes when an asset is missing; never block on assets
- Keep files small and modular; no file over ~300 lines

## Mobile and Browser Constraints

- Audio starts only after the "tap to wake up" gesture
- iOS gyro needs DeviceOrientationEvent.requestPermission on that same tap
- Set `touch-action: none` on the canvas to stop scrolling and pinch-zoom
- Target 60 fps on a mid-range phone; watch draw calls

## Phase Discipline

- Work one phase at a time as defined in the PRD
- Current phase: **Phase 2** — the house: real assets, full sequence, polished zoom-out and replay controls
- Phase 0 (grey box, sight only, per-pixel replay) accepted by Patrick on 2026-11-15; baseline in `docs/performance-baseline.md`
- Phase 1 (sound: alarm, dog, sizzle; smell: bacon plume; ripples, haze, ghost flicker, replay audio) accepted by Patrick on 2026-11-16
- First Phase 2 task: the "hey, over here" caller (PRD beat 7), using `public/audio/HeyOverHere.mp3`
- Patrick wants strict phase order: if he asks for a later-phase feature, say which phase it belongs to and ask before building it
- Before moving phases: wiring check, performance HUD baseline (FPS, draw calls), feel evaluation on desktop and a real phone

## Workflow

- Before coding, state the plan in a few lines
- After each change, tell Patrick how to run it (`npm run dev`) and what to look for
- Commit in small steps with clear messages; Patrick pushes via GitHub Desktop
- When unsure about feel or design, ask rather than guess
