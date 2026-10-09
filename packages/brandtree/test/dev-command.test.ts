import { runCommand } from "citty";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("astro", () => ({ dev: vi.fn() }));
vi.mock("../src/cli/prepare.ts", () => ({
  prepareProject: vi.fn(),
  readProject: vi.fn(),
  writeProject: vi.fn(),
}));
vi.mock("../src/cli/watch.ts", () => ({ watchProject: vi.fn() }));
vi.mock("../src/cli/log.ts", () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

import { dev } from "astro";
import { mainCommand } from "../src/cli/command.ts";
import { logger } from "../src/cli/log.ts";
import {
  prepareProject,
  readProject,
  writeProject,
} from "../src/cli/prepare.ts";
import { watchProject } from "../src/cli/watch.ts";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NODE_ENV", undefined);
  vi.mocked(watchProject).mockReturnValue({ close: vi.fn() });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

const runDev = () => runCommand(mainCommand, { rawArgs: ["dev"] });

it.each(["SIGINT", "SIGTERM"])(
  "starts the generated runtime in development mode and stops on %s",
  async (signal) => {
    const runtimeRoot = `${process.cwd()}/.brandtree`;
    vi.mocked(prepareProject).mockImplementation(async () => {
      expect(process.env.NODE_ENV).toBe("development");
      expect(dev).not.toHaveBeenCalled();
      return { context: { outDir: runtimeRoot } } as Awaited<
        ReturnType<typeof prepareProject>
      >;
    });
    const stop = vi.fn().mockResolvedValue(undefined);
    vi.mocked(dev).mockResolvedValue({ stop } as unknown as Awaited<
      ReturnType<typeof dev>
    >);
    const once = vi.spyOn(process, "once").mockReturnValue(process);
    const removeListener = vi.spyOn(process, "removeListener");

    await runDev();
    expect(prepareProject).toHaveBeenCalledExactlyOnceWith({
      root: process.cwd(),
      mode: "dev",
    });
    expect(dev).toHaveBeenCalledExactlyOnceWith({ root: runtimeRoot });
    expect(stop).not.toHaveBeenCalled();
    const handler = once.mock.calls.find(([event]) => event === signal)![1];
    handler();
    await Promise.resolve();
    expect(stop).toHaveBeenCalledOnce();
    expect(removeListener).toHaveBeenCalledWith("SIGINT", handler);
    expect(removeListener).toHaveBeenCalledWith("SIGTERM", handler);
  },
);

it("does not start Astro when preparation fails", async () => {
  const error = new Error("Preparation failed");
  vi.mocked(prepareProject).mockRejectedValue(error);
  await expect(runDev()).rejects.toBe(error);
  expect(dev).not.toHaveBeenCalled();
});

it("propagates Astro startup failures without registering shutdown handlers", async () => {
  vi.mocked(prepareProject).mockResolvedValue({
    context: { outDir: "/project/.brandtree" },
  } as Awaited<ReturnType<typeof prepareProject>>);
  const error = new Error("Startup failed");
  vi.mocked(dev).mockRejectedValue(error);
  const once = vi.spyOn(process, "once");
  await expect(runDev()).rejects.toBe(error);
  expect(
    once.mock.calls.filter(
      ([event]) => event === "SIGINT" || event === "SIGTERM",
    ),
  ).toEqual([]);
  expect(logger.error).not.toHaveBeenCalled();
});

const ready = async () => {
  const project = { context: { outDir: "/project/.brandtree" } } as Awaited<
    ReturnType<typeof prepareProject>
  >;
  vi.mocked(prepareProject).mockResolvedValue(project);
  vi.mocked(readProject).mockResolvedValue(project);
  const stop = vi.fn().mockResolvedValue(undefined);
  vi.mocked(dev).mockResolvedValue({ stop } as unknown as Awaited<
    ReturnType<typeof dev>
  >);
  const once = vi.spyOn(process, "once").mockReturnValue(process);
  await runDev();
  const close = once.mock.calls.find(([event]) => event === "SIGTERM")![1];
  const changed = vi.mocked(watchProject).mock.calls[0]![1];
  return { changed, close, stop, project };
};

it("keeps the last server and runtime after invalid config and recovers on the next save", async () => {
  vi.useFakeTimers();
  try {
    const { changed, close, stop, project } = await ready();
    vi.mocked(readProject).mockRejectedValueOnce(
      new Error("brandtree.config.ts: invalid config"),
    );
    changed();
    await vi.advanceTimersByTimeAsync(200);
    expect(stop).not.toHaveBeenCalled();
    expect(writeProject).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      "Regeneration failed: brandtree.config.ts: invalid config",
    );
    changed();
    await vi.advanceTimersByTimeAsync(200);
    expect(writeProject).toHaveBeenCalledWith(project);
    expect(dev).toHaveBeenCalledTimes(2);
    close();
    await vi.advanceTimersByTimeAsync(0);
  } finally {
    vi.useRealTimers();
  }
});

it("keeps watching after a failed restart and retries after another edit", async () => {
  vi.useFakeTimers();
  try {
    const { changed, close } = await ready();
    vi.mocked(dev).mockRejectedValueOnce(new Error("Restart failed"));
    changed();
    await vi.advanceTimersByTimeAsync(200);
    expect(logger.error).toHaveBeenCalledWith(
      "Regeneration failed: Restart failed",
    );
    changed();
    await vi.advanceTimersByTimeAsync(200);
    expect(dev).toHaveBeenCalledTimes(3);
    close();
    await vi.advanceTimersByTimeAsync(0);
  } finally {
    vi.useRealTimers();
  }
});

it("coalesces rapid saves and closes the watcher and pending work at shutdown", async () => {
  vi.useFakeTimers();
  try {
    const { changed, close } = await ready();
    changed();
    changed();
    changed();
    await vi.advanceTimersByTimeAsync(200);
    expect(readProject).toHaveBeenCalledOnce();
    changed();
    close();
    await vi.advanceTimersByTimeAsync(200);
    expect(readProject).toHaveBeenCalledOnce();
    expect(
      vi.mocked(watchProject).mock.results[0]!.value.close,
    ).toHaveBeenCalledOnce();
  } finally {
    vi.useRealTimers();
  }
});
