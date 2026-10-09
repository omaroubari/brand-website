import { existsSync, watch, type FSWatcher } from "node:fs";
import { join } from "node:path";

import { CONFIG_FILENAMES } from "../core/project.ts";

const INPUT_DIRECTORIES = ["content", "components", "assets", "public"];

/** Watch authored inputs only; generated files must never trigger regeneration. */
export const watchProject = (
  root: string,
  changed: () => void,
  failed: (error: Error) => void,
): { close(): void } => {
  const directories = new Map<string, FSWatcher>();
  const refresh = () => {
    for (const name of INPUT_DIRECTORIES) {
      const path = join(root, name);
      if (!existsSync(path)) {
        directories.get(name)?.close();
        directories.delete(name);
      } else if (!directories.has(name)) {
        const watcher = watch(path, { recursive: true }, changed);
        watcher.on("error", failed);
        directories.set(name, watcher);
      }
    }
  };
  const rootWatcher = watch(root, (event, filename) => {
    const name = filename?.toString();
    if (name && INPUT_DIRECTORIES.includes(name)) {
      if (event === "rename") {
        directories.get(name)?.close();
        directories.delete(name);
      }
      try {
        refresh();
      } catch (error) {
        failed(error instanceof Error ? error : new Error(String(error)));
      }
      changed();
    } else if (
      name &&
      (CONFIG_FILENAMES.includes(name) || /\.(?:[cm]?[jt]s|json)$/.test(name))
    ) {
      changed();
    }
  });
  rootWatcher.on("error", failed);
  try {
    refresh();
  } catch (error) {
    rootWatcher.close();
    for (const watcher of directories.values()) watcher.close();
    throw error;
  }
  return {
    close() {
      rootWatcher.close();
      for (const watcher of directories.values()) watcher.close();
      directories.clear();
    },
  };
};
