# Percipi

A browser visualization of Berkeley's *esse est percipi*: the world exists only while the character senses it. See `PRD.md`.

## Run it

1. Install once (Terminal, in this folder): `npm install`
2. Start: `npm run dev`
3. Open the `Local:` link it prints (usually http://localhost:5173). To try it on a phone on the same Wi-Fi, open the `Network:` link on the phone.

## Controls (Phase 0)

- **Desktop:** click to wake up, WASD to walk, mouse to look, **E** opens/closes a nearby door, Esc releases the mouse.
- **Phone:** tap to wake up, left thumb = joystick, right thumb = drag to look.

The green numbers top-left are the performance HUD (FPS, draw calls, triangles, objects currently perceived).

## Tuning

Every adjustable number (dissolve speed, view cone, walk speed, colours…) is in `src/tuning.ts`.
