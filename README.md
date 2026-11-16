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

## Sound (Phase 1)

- The alarm clock by the bed rings when you wake; walk up to it and press **E** (or tap **Turn off alarm**).
- The dog in the backyard barks a few times the first time you walk into the kitchen/living area.
- In the replay: pale-blue ripples spread from each sound; something he heard but hasn't seen shows hazy and flickering, and turns solid once he sees it. The sounds play again, heard from where his head was (pause = silence; scrubbing picks up mid-sound).
- Real recordings live in `public/audio` as mono MP3: `alarm.mp3` (a seamless loop) and `bark.mp3` (a short run of barks; set the moment each bark starts in `tuning.ts` → `sound.dog.barkTimes`). If a file is missing, a placeholder made in code is used.
- Original WAV masters are kept in `assets-src/audio` (not sent to phones). To convert a new WAV: `ffmpeg -i in.wav -ac 1 -ar 44100 -b:a 128k out.mp3`.

## Tuning

Every adjustable number (dissolve speed, view cone, walk speed, colours…) is in `src/tuning.ts`.
