import { runCommand } from "citty";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("astro", () => ({ build: vi.fn() }));
vi.mock("../src/cli/prepare.ts", () => ({ prepareProject: vi.fn() }));

import { build } from "astro";
import { mainCommand } from "../src/cli/command.ts";
import { prepareProject } from "../src/cli/prepare.ts";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NODE_ENV", undefined);
});
afterEach(() => vi.unstubAllEnvs());

const runBuild = () => runCommand(mainCommand, { rawArgs: ["build"] });

it("waits for project preparation before building the generated runtime", async () => {
  const runtimeRoot = `${process.cwd()}/.brandtree`;
  let finishPreparation!: (
    project: Awaited<ReturnType<typeof prepareProject>>,
  ) => void;
  vi.mocked(prepareProject).mockImplementation(
    () =>
      new Promise((resolve) => {
        expect(process.env.NODE_ENV).toBe("production");
        finishPreparation = resolve;
      }),
  );
  const running = runBuild();
  await vi.waitFor(() => expect(prepareProject).toHaveBeenCalledOnce());
  expect(prepareProject).toHaveBeenCalledWith({
    root: process.cwd(),
    mode: "build",
  });
  expect(build).not.toHaveBeenCalled();
  finishPreparation({ context: { outDir: runtimeRoot } } as Awaited<
    ReturnType<typeof prepareProject>
  >);
  await running;
  expect(build).toHaveBeenCalledExactlyOnceWith({ root: runtimeRoot });
});

it("does not invoke Astro when preparation fails", async () => {
  const error = new Error("Preparation failed");
  vi.mocked(prepareProject).mockRejectedValue(error);
  await expect(runBuild()).rejects.toBe(error);
  expect(build).not.toHaveBeenCalled();
});

it("propagates Astro build failures", async () => {
  vi.mocked(prepareProject).mockResolvedValue({
    context: { outDir: "/project/.brandtree" },
  } as Awaited<ReturnType<typeof prepareProject>>);
  const error = new Error("Build failed");
  vi.mocked(build).mockRejectedValue(error);
  await expect(runBuild()).rejects.toBe(error);
});
