import { runCommand } from "citty";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("astro", () => ({ dev: vi.fn() }));
vi.mock("../src/cli/prepare.ts", () => ({ prepareProject: vi.fn() }));
vi.mock("../src/cli/log.ts", () => ({ logger: { error: vi.fn() } }));

import { dev } from "astro";
import { mainCommand } from "../src/cli/command.ts";
import { logger } from "../src/cli/log.ts";
import { prepareProject } from "../src/cli/prepare.ts";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NODE_ENV", undefined);
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
