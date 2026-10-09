import { runCommand } from "citty";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("astro", () => ({ sync: vi.fn() }));
vi.mock("@astrojs/check", () => ({ check: vi.fn() }));
vi.mock("../src/cli/prepare.ts", () => ({ prepareProject: vi.fn() }));

import { sync } from "astro";
import { check } from "@astrojs/check";
import { mainCommand } from "../src/cli/command.ts";
import { prepareProject } from "../src/cli/prepare.ts";

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prepareProject).mockResolvedValue({
    context: { outDir: "/project/.brandtree" },
  } as Awaited<ReturnType<typeof prepareProject>>);
});
afterEach(() => {
  process.exitCode = 0;
});

it("prepares with strict diagnostics, syncs Astro, and type-checks without a build", async () => {
  await runCommand(mainCommand, { rawArgs: ["check"] });
  expect(prepareProject).toHaveBeenCalledWith({
    root: process.cwd(),
    mode: "dev",
    strict: true,
  });
  expect(sync).toHaveBeenCalledWith({ root: "/project/.brandtree" });
  expect(check).toHaveBeenCalledWith({
    root: "/project/.brandtree",
    watch: false,
  });
});
it("fails on type errors", async () => {
  vi.mocked(check).mockResolvedValue(true);
  await runCommand(mainCommand, { rawArgs: ["check"] });
  expect(process.exitCode).toBe(1);
});
it("does not start Astro after invalid authored inputs", async () => {
  vi.mocked(prepareProject).mockRejectedValue(new Error("Invalid inputs"));
  await expect(runCommand(mainCommand, { rawArgs: ["check"] })).rejects.toThrow(
    "Invalid inputs",
  );
  expect(sync).not.toHaveBeenCalled();
  expect(check).not.toHaveBeenCalled();
});
