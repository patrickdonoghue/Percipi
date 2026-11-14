// The "tap to wake up" screen. This same tap will later unlock audio (Phase 1)
// and request iOS gyro permission. On desktop it also captures the mouse.
export function setupWake(canvas: HTMLCanvasElement, onWake: () => void): void {
  const overlay = document.getElementById('wake')!;
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  overlay.textContent = isTouch ? 'tap to wake up' : 'click to wake up';
  let awake = false;
  let usedMouse = false;

  overlay.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') {
      usedMouse = true;
      // Some browsers/embeds refuse pointer lock; drag-to-look still works then.
      const req = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
      req?.catch(() => {});
    }
    overlay.classList.add('hidden');
    if (!awake) {
      awake = true;
      onWake();
    }
  });

  document.addEventListener('pointerlockchange', () => {
    if (usedMouse && document.pointerLockElement !== canvas) {
      overlay.textContent = 'click to continue';
      overlay.classList.remove('hidden');
    }
  });
}
