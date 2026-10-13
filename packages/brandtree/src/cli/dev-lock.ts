import { randomUUID } from "node:crypto";
import {
  linkSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

interface LockRecord {
  pid: number;
  port: number;
  token: string;
}

const isMissing = (error: unknown) =>
  (error as NodeJS.ErrnoException).code === "ENOENT";

const readLock = (path: string): LockRecord | undefined => {
  try {
    const record = JSON.parse(readFileSync(path, "utf8")) as LockRecord;
    if (
      !Number.isInteger(record.pid) ||
      record.pid <= 0 ||
      !Number.isInteger(record.port) ||
      record.port < 0 ||
      record.port > 65535
    ) {
      throw new Error("Invalid lock record");
    }
    return record;
  } catch (error) {
    if (isMissing(error)) return;
    throw new Error(
      `Cannot read dev lock at ${path}. Refusing to overwrite the runtime.`,
      { cause: error },
    );
  }
};

const isAlive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // Only ESRCH proves the process has exited; EPERM still means it exists.
    if ((error as NodeJS.ErrnoException).code === "ESRCH") return false;
    if ((error as NodeJS.ErrnoException).code === "EPERM") return true;
    throw error;
  }
};

const refuse = (record: LockRecord): never => {
  throw new Error(
    `A Brandtree dev session (PID ${record.pid}) owns this runtime at http://localhost:${record.port}/. Stop the existing session first.`,
  );
};

export interface DevLock {
  owns(outDir: string): boolean;
  updatePort(port: number): void;
  release(): void;
}

/** The CLI owns this lock; Astro stops/restarts never acquire or release it. */
export const acquireDevLock = (outDir: string, port: number): DevLock => {
  mkdirSync(outDir, { recursive: true });
  const path = join(outDir, "dev.lock");
  const record: LockRecord = { pid: process.pid, port, token: randomUUID() };
  // Publish complete records atomically; another CLI never sees partial JSON.
  const temporary = join(outDir, `.dev-lock-${record.token}`);
  writeFileSync(temporary, JSON.stringify(record), { flag: "wx" });
  try {
    for (;;) {
      try {
        linkSync(temporary, path);
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        const existing = readLock(path);
        if (!existing) continue;
        if (isAlive(existing.pid)) refuse(existing);
        // Recheck before removing a stale record, so a replacement is preserved.
        if (readLock(path)?.token !== existing.token) continue;
        try {
          unlinkSync(path);
        } catch (error) {
          if (!isMissing(error)) throw error;
        }
      }
    }
  } finally {
    unlinkSync(temporary);
  }
  const owns = (directory: string) =>
    directory === outDir && readLock(path)?.token === record.token;
  return {
    owns,
    updatePort(port) {
      if (!owns(outDir))
        throw new Error("Brandtree dev lock ownership was lost.");
      record.port = port;
      writeFileSync(temporary, JSON.stringify(record), { flag: "wx" });
      try {
        renameSync(temporary, path);
      } finally {
        try {
          unlinkSync(temporary);
        } catch (error) {
          if (!isMissing(error)) throw error;
        }
      }
    },
    release() {
      if (owns(outDir)) unlinkSync(path);
    },
  };
};
