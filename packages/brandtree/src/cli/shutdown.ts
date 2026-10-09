import { logger } from "./log.ts";

/** Install one idempotent shutdown path and return a listener cleanup function. */
export const onShutdown = (close: () => Promise<void>): (() => void) => {
  const remove = () => {
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
  };
  const stop = () => {
    remove();
    void close().catch((error: unknown) => {
      logger.error(error);
      process.exitCode = 1;
    });
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  return remove;
};
