import { existsSync } from "node:fs";
import { join } from "node:path";
import { runCommand } from "citty";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("node:fs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:fs")>()),
  existsSync: vi.fn(),
}));

vi.mock("astro", () => ({ sync: vi.fn(), build: vi.fn() }));
vi.mock("@astrojs/check", () => ({ check: vi.fn() }));
vi.mock("../src/cli/prepare.ts", () => ({ prepareProject: vi.fn() }));

import { sync, build } from "astro";
import { check } from "@astrojs/check";
import { mainCommand } from "../src/cli/command.ts";
import { prepareProject } from "../src/cli/prepare.ts";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NODE_ENV", undefined);
  process.exitCode = undefined;
  vi.mocked(prepareProject).mockResolvedValue({
    context: { outDir: "/author/.brandtree" },
  } as Awaited<ReturnType<typeof prepareProject>>);
});
afterEach(() => {
  process.exitCode = undefined;
  vi.unstubAllEnvs();
});

const runCheck = (...flags: string[]) =>
  runCommand(mainCommand, { rawArgs: ["check", ...flags] });

it("prepares cwd without drafts, syncs types, then checks without building", async () => {
  vi.mocked(sync).mockImplementation(async () => {
    expect(prepareProject).toHaveBeenCalledExactlyOnceWith({
      root: process.cwd(),
      mode: "build",
      strict: false,
      preview: false,
      runtimeDir: undefined,
    });
    expect(check).not.toHaveBeenCalled();
  });
  await runCheck();
  expect(sync).toHaveBeenCalledExactlyOnceWith({ root: "/author/.brandtree" });
  expect(check).toHaveBeenCalledExactlyOnceWith({
    root: "/author/.brandtree",
    tsconfig: "/author/.brandtree/tsconfig.json",
    watch: false,
    minimumFailingSeverity: "error",
  });
  expect(build).not.toHaveBeenCalled();
});

it("returns an unsuccessful exit for type errors", async () => {
  vi.mocked(check).mockResolvedValue(true);
  await runCheck();
  expect(process.exitCode).toBe(1);
});

it("stops when preparation fails", async () => {
  vi.mocked(prepareProject).mockRejectedValue(new Error("Invalid config"));
  await expect(runCheck()).rejects.toThrow("Invalid config");
  expect(sync).not.toHaveBeenCalled();
  expect(check).not.toHaveBeenCalled();
});

it("propagates sync failures without checking", async () => {
  vi.mocked(sync).mockRejectedValue(new Error("Invalid content"));
  await expect(runCheck()).rejects.toThrow("Invalid content");
  expect(check).not.toHaveBeenCalled();
});

it("selects the author's tsconfig without merging generated coverage", async () => {
  vi.mocked(existsSync).mockReturnValue(true);
  await runCheck();
  expect(existsSync).toHaveBeenCalledWith(join(process.cwd(), "tsconfig.json"));
  expect(check).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ tsconfig: join(process.cwd(), "tsconfig.json") }),
  );
});

it("forwards strict, preview and isolated options to preparation", async () => {
  vi.mocked(prepareProject).mockResolvedValue({
    context: { outDir: "/author/.brandtree-verify" },
  } as Awaited<ReturnType<typeof prepareProject>>);
  await runCheck("--strict", "--preview", "--isolated");
  expect(prepareProject).toHaveBeenCalledExactlyOnceWith({
    root: process.cwd(),
    mode: "build",
    strict: true,
    preview: true,
    runtimeDir: ".brandtree-verify",
  });
  expect(sync).toHaveBeenCalledExactlyOnceWith({
    root: "/author/.brandtree-verify",
  });
  expect(check).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      tsconfig: "/author/.brandtree-verify/tsconfig.json",
    }),
  );
});
