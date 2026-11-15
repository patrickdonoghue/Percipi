// The "tap to wake up" screen. On phones this tap also asks for motion
// (gyro) permission, and in Phase 1 it will unlock audio. On desktop the
// click captures the mouse for looking around.
export function setupWake(
  canvas: HTMLCanvasElement,
  onWake: () => void,
  onTap: (isTouch: boolean) => void, // runs inside the tap/click itself (audio unlock, gyro permission)
): { disable: () => void } {
  const overlay = document.getElementById('wake')!;
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  overlay.textContent = isTouch ? 'tap to wake up' : 'click to wake up';
  let awake = false;
  let usedMouse = false;
  let disabled = false;

  const wakeUp = () => {
    overlay.classList.add('hidden');
    if (!awake) {
      awake = true;
      onWake();
    }
  };

  // Mouse: act on press, so pointer lock is allowed.
  overlay.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    usedMouse = true;
    // Some browsers/embeds refuse pointer lock; drag-to-look still works then.
    const req = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
    req?.catch(() => {});
    if (!awake) onTap(false);
    wakeUp();
  });

  // Touch: act on the completed tap ("click"), which iPhones require for
  // the motion-permission prompt.
  // (A mouse click never lands here: the overlay is already hidden on press.)
  overlay.addEventListener('click', () => {
    if (!awake) onTap(true);
    wakeUp();
  });

  document.addEventListener('pointerlockchange', () => {
    if (!disabled && usedMouse && document.pointerLockElement !== canvas) {
      overlay.textContent = 'click to continue';
      overlay.classList.remove('hidden');
    }
  });

  return {
    disable: () => {
      disabled = true;
      overlay.classList.add('hidden');
    },
  };
}
