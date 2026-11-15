# Percipi

A browser visualization of Berkeley's *esse est percipi*: the world exists only while the character senses it. See `PRD.md`.

## Run it

1. Install once (Terminal, in this folder): `npm install`
2. Start: `npm run dev`
3. Open the `Local:` link it prints (usually http://localhost:5173). To try it on a phone on the same Wi-Fi, open the `Network:` link on the phone.

## How it works (Phase 0)

1. **Walk:** the house looks completely normal. Behind the scenes, everything he sees is recorded.
2. **End walk:** press **Enter** (desktop) or tap **End walk** (top right).
3. **Reveal:** the camera pulls out of his head; everything he wasn't looking at dissolves away.
4. **Replay:** the walk plays back from above. The world exists only where he looked.

## Controls

- **Walking, desktop:** click to wake up, WASD to walk, mouse to look, **E** opens/closes a nearby door, Esc releases the mouse, Enter ends the walk.
- **Walking, phone:** tap to wake up (allow motion access so turning the phone turns your head), left thumb = joystick, right thumb = drag to look, **Open door** button when near a door, **End walk** button.
- **Replay:** drag to orbit, scroll or pinch to zoom; play/pause and scrub with the bar at the bottom; **Walk again** starts over.

The green numbers top-left are the performance HUD (FPS, draw calls, triangles, objects currently sensed).

## Online

Every push to `main` publishes the site to GitHub Pages (see `.github/workflows/deploy.yml`): https://patrickdonoghue.github.io/Percipi/

## Tuning

Every adjustable number (dissolve speed, view cone, walk speed, colours…) is in `src/tuning.ts`.
