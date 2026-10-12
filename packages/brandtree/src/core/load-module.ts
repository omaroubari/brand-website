import { createJiti } from "jiti";
import { readFile } from "node:fs/promises";

/**
 * Create a loader for user-authored ESM/TS modules (`brandtree.config.ts`,
 * `meta.ts`). One jiti instance is reused across every file the returned loader
 * is called with. `moduleCache: false` ensures edits are picked up on each load,
 * which is what makes dev-server regeneration reflect config/meta changes.
 */
export const createModuleLoader = (): ((file: string) => Promise<unknown>) => {
  // Native ESM imports remain cached even with jiti's module cache disabled.
  // Transform author modules so JS/MJS edits are re-read just like TS edits.
  const jiti = createJiti(import.meta.url, { moduleCache: false });
  return async (file: string) => {
    const loaded = (await jiti.evalModule(await readFile(file, "utf8"), {
      filename: file,
      async: true,
      forceTranspile: true,
    })) as { default?: unknown } | undefined;
    return loaded?.default ?? loaded;
  };
};
