export interface SerialIntervalLoopOptions {
  intervalMs: number;
  runOnce: () => Promise<void>;
  onError?: (error: unknown) => void;
}

export interface SerialIntervalLoopHandle {
  stop: () => void;
}

export function startSerialIntervalLoop(options: SerialIntervalLoopOptions): SerialIntervalLoopHandle {
  const intervalMs = Math.max(1, Math.trunc(options.intervalMs || 0));
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;

  const scheduleNext = (): void => {
    if (stopped) return;
    timer = setTimeout(() => {
      void tick();
    }, intervalMs);
    timer.unref?.();
  };

  const tick = async (): Promise<void> => {
    if (stopped) return;
    try {
      await options.runOnce();
    } catch (error) {
      options.onError?.(error);
    } finally {
      scheduleNext();
    }
  };

  void tick();

  return {
    stop: () => {
      stopped = true;
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
    },
  };
}
