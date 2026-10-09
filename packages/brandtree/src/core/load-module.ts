import { createJiti } from "jiti";

/** Load a fresh authored module graph, including imported config/meta helpers. */
export const createModuleLoader = (): ((file: string) => Promise<unknown>) => {
  return async (file: string) => {
    // Each reload needs a fresh import cache. Node's native TS/ESM imports would
    // retain old modules, so let jiti transform the authored graph instead.
    const jiti = createJiti(import.meta.url, {
      moduleCache: false,
      tryNative: false,
    });
    // Synchronous evaluation also transforms authored .mjs files instead of
    // handing them to Node's persistent ESM import cache.
    const loaded = jiti(file) as { default?: unknown } | undefined;
    return loaded?.default ?? loaded;
  };
};
