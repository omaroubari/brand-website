import { randomUUID } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  rmdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

interface LockRecord {
  pid: number;
  port: number;
  token: string;
}

const hasCode = (error: unknown, code: string): boolean =>
  error instanceof Error && "code" in error && error.code === code;

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
    if (hasCode(error, "ENOENT")) return;
    throw new Error(
      `Cannot read dev lock at ${path}. Refusing to overwrite the runtime.`,
      { cause: error },
    );
  }
};

const isAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (hasCode(error, "ESRCH")) return false;
    if (hasCode(error, "EPERM")) return true;
    throw error;
  }
};

/**
 * Serialize every lock mutation with the short-lived dev.lock.guard directory.
 * A competing command must retry. If a process is force-killed during an update,
 * stop all dev sessions before manually removing the leftover guard and retrying.
 */
const withGuard = (path: string, action: () => void): void => {
  const guard = `${path}.guard`;
  try {
    mkdirSync(guard);
  } catch (error) {
    if (!hasCode(error, "EEXIST")) throw error;
    throw new Error(
      `The Brandtree dev lock is being updated. Retry the command. If this persists after stopping all dev sessions, remove ${guard} and retry.`,
    );
  }
  try {
    action();
  } finally {
    rmdirSync(guard);
  }
};

const writeLock = (path: string, record: LockRecord): void => {
  const temporary = `${path}.${record.token}.tmp`;
  try {
    writeFileSync(temporary, JSON.stringify(record), { flag: "wx" });
    renameSync(temporary, path);
  } finally {
    rmSync(temporary, { force: true });
  }
};

export interface DevLock {
  owns(outDir: string): boolean;
  updatePort(port: number): void;
  release(): void;
}

/**
 * Each brandtree dev session claims .brandtree/dev.lock before preparing the
 * runtime. A second invocation is refused with the existing session's localhost
 * URL. The record holds the CLI PID, a unique ownership token, and the requested
 * port, then Astro's actual port. The CLI accepts --port <number>, including 0
 * to select a free port.
 *
 * The CLI owns the lock across Astro restarts and releases it after successful
 * shutdown. If shutdown fails, the lock remains until the CLI exits. A later
 * invocation replaces a lock whose PID has exited. This guards dev sessions only.
 */
export const acquireDevLock = (outDir: string, port: number): DevLock => {
  mkdirSync(outDir, { recursive: true });
  const path = join(outDir, "dev.lock");
  const record: LockRecord = { pid: process.pid, port, token: randomUUID() };

  withGuard(path, () => {
    const existing = readLock(path);
    if (existing && isAlive(existing.pid)) {
      throw new Error(
        `A Brandtree dev session (PID ${existing.pid}) owns this runtime at http://localhost:${existing.port}/. Stop the existing session first.`,
      );
    }
    writeLock(path, record);
  });

  const owns = (directory: string): boolean =>
    directory === outDir && readLock(path)?.token === record.token;
  return {
    owns,
    updatePort(port) {
      withGuard(path, () => {
        if (!owns(outDir))
          throw new Error("Brandtree dev lock ownership was lost.");
        writeLock(path, { ...record, port });
      });
    },
    release() {
      withGuard(path, () => {
        if (owns(outDir)) rmSync(path, { force: true });
      });
    },
  };
};
