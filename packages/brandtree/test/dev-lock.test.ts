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
