# Performance baseline

Numbers from the on-screen HUD. Re-check after each phase; investigate if FPS drops or draw calls jump.

## Phase 0 (per-object sight, grey box) — 2026-11-15

Commit `5a62f58`, live site, 230 perceivable objects.

| Device | Mode | FPS | Draw calls | Triangles |
| --- | --- | --- | --- | --- |
| Android phone, Chrome, landscape | POV walk | 58 | 185 | 2,220 |
| Android phone, Chrome, landscape | Replay | 60 | 39 | 1,024 |
| Mac, Chrome (preview) | POV walk | 120 | ~140 | ~1,700 |
| Mac, Chrome (preview) | Replay | 120 | 12–50 | ~700–1,150 |

Perception engine cost on the Mac: 0.2–0.6 ms per frame.

Feel: accepted by Patrick on desktop and phone (walk, gyro, doors, end walk, reveal, replay).

Not yet tested: iPhone Safari (gyro permission prompt), desktop Safari.
