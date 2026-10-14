export interface WatchEvent {
  event: string;
  path: string;
}

/** Batch raw events, serialize regeneration, and recover after failures. */
export const createRegenerationQueue = (
  regenerate: (events: WatchEvent[]) => Promise<unknown>,
  onError: (error: unknown) => void,
) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running: Promise<void> | undefined;
  let pending: WatchEvent[] = [];
  let closed = false;
  const drain = async () => {
    while (pending.length && !closed && timer === undefined) {
      const changes = pending;
      pending = [];
      try {
        await regenerate(changes);
      } catch (error) {
        onError(error);
      }
    }
  };
  const enqueue = (change: WatchEvent) => {
    if (closed) return;
    pending.push(change);
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      running ??= drain().finally(() => {
        running = undefined;
      });
    }, 100);
  };
  return {
    change(event: string, path: string) {
      enqueue({ event, path });
    },
    async close() {
      closed = true;
      clearTimeout(timer);
      pending = [];
      await running;
    },
  };
};
