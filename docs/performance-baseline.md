# Performance baseline

Numbers from the on-screen HUD. Re-check after each phase; investigate if FPS drops or draw calls jump.

## Phase 0 (per-object sight, grey box) — 2026-11-15

Commit `5a62f58`, live site, 230 perceivable objects.

| Device | Mode | FPS | Draw calls | Triangles |
| --- | --- | --- | --- | --- |
| Galaxy S24+, Chrome, landscape | POV walk | 58 | 185 | 2,220 |
| Galaxy S24+, Chrome, landscape | Replay | 60 | 39 | 1,024 |
| Mac, Chrome (preview) | POV walk | 120 | ~140 | ~1,700 |
| Mac, Chrome (preview) | Replay | 120 | 12–50 | ~700–1,150 |

Perception engine cost on the Mac: 0.2–0.6 ms per frame.

Feel: accepted by Patrick on desktop and phone (walk, gyro, doors, end walk, reveal, replay).

Not yet tested: iPhone Safari (gyro permission prompt), desktop Safari.

## Phase 0 + per-pixel sight in the replay — 2026-11-15

Commit `4096b42`, live site. Replay uses 8 eye snapshots (512 px each) per frame.

| Device | Mode | FPS | Draw calls | Triangles |
| --- | --- | --- | --- | --- |
| Galaxy S24+, Chrome, portrait | POV walk | 60 | 58 | 696 |
| Galaxy S24+, Chrome | Replay (per-pixel) | 60 (never dropped below) | — | — |
| Mac, Chrome (preview) | Replay (per-pixel) | 120 | 40–180 | ~1,100–2,700 |

Mac replay frame cost: ~1 ms including GPU; 1.4 ms to rebuild snapshots after a scrub.

## Phase 1 Stage B: sound (ripples, haze, replay audio) — 2026-11-16

Commit `e17c675`, live site.

| Device | Mode | FPS |
| --- | --- | --- |
| Galaxy S24+, Chrome | POV walk with sound | 60 (never dropped below) |
| Galaxy S24+, Chrome | Replay with ripples, haze, audio | 60 (never dropped below) |

Note: the S24+ is a high-end phone; a mid-range phone (the PRD target) is still worth a check before Phase 3.
