# Percipi — PRD v0.2

## Summary

Percipi is a browser-based interactive visualization of Berkeley's idea that to be is to be perceived (esse est percipi). The world exists only while the character senses it. The user first explores a normal, solid world in first person; afterwards the exploration is replayed from an isometric view, where the world appears and dissolves around the character according to what they sensed. Phase 1 delivers one environment, a house with a backyard.

## Goals

- Make the idea understood without text, through a POV walkthrough followed by an isometric replay that reveals what was perceived
- Run smoothly in mobile and desktop browsers
- Build one environment end to end, structured so a reusable system can be extracted later

## Non-Goals (Phase 1)

- Multiple environments
- Sense controls (close eyes, sunglasses, lights off) — stretch only
- Custom 3D modeling
- Monetization, accounts, saving

## Tech Stack

- Vanilla Three.js, TypeScript (strict), Vite
- Deployed to GitHub Pages
- Built with Claude Code on macOS
- Assets: glTF/GLB models (one consistent low-poly family, e.g. Quaternius), compressed audio (OGG/MP3)
- Folders: `public/models`, `public/audio`

## Experience Flow

1. **Wake screen:** black screen, "tap to wake up". The tap unlocks browser audio and requests gyro permission on iOS.
2. **POV walkthrough:** first person, free roam. Camera = his head. Everything looks and sounds as it normally would: nothing appears or disappears.
3. **Recording:** behind the scenes, the perception engine runs every frame; position, head orientation, and what was sensed are logged.
4. **End:** the user ends the exploration whenever they choose (on-screen button; a key on desktop).
5. **Zoom-out:** the camera pulls out of his head up to an isometric view of the house.
6. **Replay:** the walkthrough plays back with a figure for the character. The world exists only where he sensed it, appearing and dissolving moment to moment. The view starts isometric; the user can orbit, zoom, tilt, and play, pause, and scrub the timeline.

## Controls

- **Desktop POV:** WASD to move, mouse look (pointer lock), E to open/close doors, a key to end the exploration
- **Mobile POV:** left virtual joystick to move, right-side drag to look, gyro look combined (all drive the same head orientation); on-screen button to end the exploration
- **Replay:** orbit, zoom, tilt via mouse or touch gestures; play, pause, scrub

## Perception Engine

One system decides each frame what the character senses, and therefore what exists. It runs live during the POV walkthrough (recorded, not shown) and its output drives the replay. Every object carries sensory tags.

- **Sight:** view cone from the head plus line-of-sight raycasts. Doors and walls block it.
- **Sound:** emitter with radius. Ripples expand from the source; when one reaches him, the source appears hazy and unstable, turning solid once seen.
- **Smell:** emitter with plume. Drifting trails; where a trail touches him, a ghostly fragment of the source flickers in and out. Smell lingers.
- **No accumulation:** objects that stop being sensed dissolve away (in the replay).

## Transitions (replay only)

- POV shows the world normally; dissolves are seen only in the replay
- Noise-based dissolve shader applied to every perceivable object
- Appear ≈ 0.3s, vanish ≈ 0.7s, both in `tuning.ts`
- Feel: stone in a pond — quick splash, slow fade
- Hazy state (heard or smelled but not seen): partial dissolve with flicker

## Environment: The House

Layout: see `docs/floorplan.png` (Patrick's floor plan). Build the grey box from it. Include at least one window and one blind corner for the voice.

In the replay, the house has no roof and walls are shown cut low (dollhouse view) so the character and rooms stay visible from above.

The walkthrough beats below are lived normally in POV; the replay shows how each was perceived:

1. Bedroom in darkness. Alarm clock rings and appears through sound alone.
2. Eyes open; sunlight; bedroom forms.
3. Bedroom door opens to the hallway; passed rooms dissolve.
4. Bacon smell; kitchen fragments flicker before he sees it.
5. Dog barks outside; appears hazy.
6. Back door opens; backyard appears, including the view through windows.
7. A voice calls "hey, over here", prompting him to turn or round a corner.

**Per-pixel sight:** in the replay, visibility is decided per pixel, not per object, by treating the recorded eyes as a light source (shadow-map style). A door open a crack reveals only the wedge of the room in its line of sight. Prove this in Phase 0, including on mobile; per-object visibility is the fallback.

## Scene Authoring (Blender)

Patrick lays out the house in Blender and exports one GLB of the scene, used directly.

- Don't join meshes; every object stays a separate node
- Walls split by room
- Door origins on their hinges
- Meaningful names that drive tagging, e.g. `kitchen_bacon`, `yard_dog`

## Assets Needed (Patrick to gather)

- Models: bedroom, hallway, kitchen, backyard, character, dog, alarm clock, power tool (optional), caller
- Audio: alarm clock, dog bark, bacon sizzle, voice line, door open/close, ambient outdoor, footsteps

## Phases

- **Phase 0 — grey box:** untextured rooms, sight only. Solid POV walkthrough, end button, recording, and a basic isometric replay. Acceptance: "after I walk around and end the exploration, the replay shows grey-box rooms dissolving in and out convincingly as he looks around."
- **Phase 1 — senses:** sound and smell systems with placeholder assets.
- **Phase 2 — the house:** real assets, full sequence, polished zoom-out and replay controls.
- **Phase 3 — polish:** mobile tuning, performance, iOS testing.

## Validation

Run before adding content in each phase: wiring check, performance baseline (HUD showing FPS and draw calls), feel evaluation on desktop and on a real phone.

## Risks

- Single reveal surprises once; replay must hold interest
- Free roam can make dull replays; prompts steer attention
- Fast head turns cause flicker; tune timings
- iOS Safari: audio unlock and gyro permission most likely to break
- Mixed asset packs clash visually; use one family

## Open Questions

- Replay option for a "ghost trail" of everything perceived?
- Should there be a suggested length or gentle nudge to end the walkthrough?
