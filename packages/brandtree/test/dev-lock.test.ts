import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { acquireDevLock } from "../src/cli/dev-lock.ts";
import { execFile } from "node:child_process";
import { access, mkdtemp, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execFile);
const framework = fileURLToPath(new URL("../", import.meta.url));

let root: string;
let out: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "brandtree-lock-"));
  out = join(root, ".brandtree");
});
afterEach(() => {
  vi.restoreAllMocks();
  rmSync(root, { recursive: true, force: true });
});
const read = () => JSON.parse(readFileSync(join(out, "dev.lock"), "utf8"));

it("claims the runtime, rejects other writers, and removes its lock on release", () => {
  const lock = acquireDevLock(out, 4567);
  expect(read()).toMatchObject({ pid: process.pid, port: 4567 });
  expect(() => acquireDevLock(out, 4321)).toThrow("http://localhost:4567/");
  lock.updatePort(4568);
  expect(() => acquireDevLock(out, 4321)).toThrow("http://localhost:4568/");
  lock.release();
  lock.release();
  expect(existsSync(join(out, "dev.lock"))).toBe(false);
});

it("automatically replaces a stale lock", () => {
  acquireDevLock(out, 4567);
  writeFileSync(
    join(out, "dev.lock"),
    JSON.stringify({ pid: 123456, port: 4567 }),
  );
  vi.spyOn(process, "kill").mockImplementation(() => {
    throw Object.assign(new Error("Gone"), { code: "ESRCH" });
  });
  const lock = acquireDevLock(out, 4321);
  expect(read()).toMatchObject({ pid: process.pid, port: 4321 });
  lock.release();
});

it("does not release a replacement lock", () => {
  const lock = acquireDevLock(out, 4567);
  writeFileSync(
    join(out, "dev.lock"),
    JSON.stringify({ pid: process.pid, port: 4568, token: "replacement" }),
  );
  lock.release();
  expect(read().token).toBe("replacement");
});

it("does not treat permission errors as a dead process", () => {
  acquireDevLock(out, 4567);
  vi.spyOn(process, "kill").mockImplementation(() => {
    throw Object.assign(new Error("Permission denied"), { code: "EPERM" });
  });
  expect(() => acquireDevLock(out, 4321)).toThrow();
  expect(read().port).toBe(4567);
});

it("removes the dev lock when CLI preparation fails", async () => {
  const root = await mkdtemp(join(tmpdir(), "brandtree-dev-failure-"));
  try {
    await expect(
      exec(process.execPath, [join(framework, "dist/cli/index.js"), "dev"], {
        cwd: root,
      }),
    ).rejects.toMatchObject({ code: 1 });
    await expect(access(join(root, ".brandtree/dev.lock"))).rejects.toThrow();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
