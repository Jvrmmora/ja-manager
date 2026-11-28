// Reloj pausable: las esperas pendientes se reprograman al pausar y reanudar.
export function createPlaybackClock() {
  const pending = new Set<() => void>();
  let stoppedAt: number | null = null;
  let pausedTime = 0;
  const now = () => (stoppedAt ?? performance.now()) - pausedTime;

  function wait(ms: number, signal: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
      signal.throwIfAborted();
      const end = now() + ms;
      let timer: number | undefined;

      const remove = () => {
        window.clearTimeout(timer);
        pending.delete(schedule);
        signal.removeEventListener('abort', cancel);
      };
      const cancel = () => {
        remove();
        reject(signal.reason);
      };
      const schedule = () => {
        window.clearTimeout(timer);
        if (stoppedAt !== null) return;
        timer = window.setTimeout(
          () => {
            remove();
            resolve();
          },
          Math.max(0, end - now())
        );
      };

      signal.addEventListener('abort', cancel, { once: true });
      pending.add(schedule);
      schedule();
    });
  }

  function pause(value: boolean) {
    if (value === (stoppedAt !== null)) return;
    if (value) {
      stoppedAt = performance.now();
    } else {
      pausedTime += performance.now() - (stoppedAt as number);
      stoppedAt = null;
    }
    pending.forEach(schedule => schedule());
  }

  return { now, wait, pause };
}
