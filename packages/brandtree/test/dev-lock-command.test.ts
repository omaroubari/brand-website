import { runCommand } from "citty";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("../src/cli/dev-lock.ts", () => ({ acquireDevLock: vi.fn() }));
vi.mock("astro", () => ({ dev: vi.fn() }));
vi.mock("../src/cli/prepare.ts", () => ({ prepareProject: vi.fn() }));
vi.mock("../src/cli/log.ts", () => ({ logger: { error: vi.fn() } }));
import { dev } from "astro";
import { acquireDevLock } from "../src/cli/dev-lock.ts";
import { mainCommand } from "../src/cli/command.ts";
import { logger } from "../src/cli/log.ts";
import { prepareProject } from "../src/cli/prepare.ts";
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NODE_ENV", undefined);
  vi.mocked(acquireDevLock).mockReturnValue({
    owns: vi.fn(() => true),
    updatePort: vi.fn(),
    release: vi.fn(),
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
const runDev = (...args: string[]) =>
  runCommand(mainCommand, { rawArgs: ["dev", ...args] });

it.each(["abc", "", "-1", "65536", "4321.5", "1e3"])(
  "rejects invalid port %j before preparing the project",
  async (port) => {
    await expect(runDev(`--port=${port}`)).rejects.toThrow(
      "--port must be an integer between 0 and 65535.",
    );
    expect(prepareProject).not.toHaveBeenCalled();
    expect(dev).not.toHaveBeenCalled();
  },
);

it("registers exit cleanup before propagating Astro startup failures", async () => {
  vi.mocked(prepareProject).mockResolvedValue({
    config: { fonts: [] },
    context: {
      assetReferences: [],

      root: "/project",
      outDir: "/project/.brandtree",
      contentRoot: "/project/content",
      configFile: "/project/brandtree.config.js",
      componentsFile: null,
      themeFile: null,
    },
  } as unknown as Awaited<ReturnType<typeof prepareProject>>);
  const error = new Error("Startup failed");
  vi.mocked(dev).mockRejectedValue(error);
  const once = vi.spyOn(process, "once");
  await expect(runDev()).rejects.toBe(error);
  expect(
    once.mock.calls.filter(
      ([event]) => event === "SIGINT" || event === "SIGTERM",
    ),
  ).toHaveLength(0);
  const release = vi.mocked(acquireDevLock).mock.results[0]!.value.release;
  expect(release).not.toHaveBeenCalled();
  const exit = once.mock.calls.find(([event]) => event === "exit")![1];
  exit(1);
  expect(release).toHaveBeenCalledOnce();
  expect(logger.error).not.toHaveBeenCalled();
});

it("refuses another dev session before preparing", async () => {
  vi.mocked(acquireDevLock).mockImplementation(() => {
    throw new Error("Existing server: http://localhost:4567/");
  });
  await expect(runDev()).rejects.toThrow("http://localhost:4567/");
  expect(prepareProject).not.toHaveBeenCalled();
});

it("updates the lock to Astro's selected port", async () => {
  vi.mocked(prepareProject).mockResolvedValue({
    config: { fonts: [] },
    context: {
      assetReferences: [],

      root: "/project",
      outDir: "/project/.brandtree",
      contentRoot: "/project/content",
    },
  } as unknown as Awaited<ReturnType<typeof prepareProject>>);
  vi.mocked(dev).mockResolvedValue({
    stop: vi.fn(),
    watcher: { add: vi.fn() },
    address: { port: 4568 },
  } as unknown as Awaited<ReturnType<typeof dev>>);
  vi.spyOn(process, "once").mockReturnValue(process);
  await runDev("--port=4567");
  const lock = vi.mocked(acquireDevLock).mock.results[0]!.value;
  expect(lock.updatePort).toHaveBeenCalledWith(4568);
  expect(lock.release).not.toHaveBeenCalled();
});

it("holds the lock until Astro finishes stopping", async () => {
  vi.mocked(prepareProject).mockImplementation(async () => {
    expect(acquireDevLock).toHaveBeenCalledOnce();
    return {
      config: { fonts: [] },
      context: {
        assetReferences: [],

        root: "/project",
        outDir: "/project/.brandtree",
        contentRoot: "/project/content",
      },
    } as unknown as Awaited<ReturnType<typeof prepareProject>>;
  });
  let finishStop!: () => void;
  const stopping = new Promise<void>((resolve) => {
    finishStop = resolve;
  });
  const stop = vi.fn(() => stopping);
  vi.mocked(dev).mockResolvedValue({
    stop,
    watcher: { add: vi.fn() },
    address: { port: 4321 },
  } as unknown as Awaited<ReturnType<typeof dev>>);
  const once = vi.spyOn(process, "once").mockReturnValue(process);
  await runDev();
  const lock = vi.mocked(acquireDevLock).mock.results[0]!.value;
  const signal = once.mock.calls.find(([event]) => event === "SIGINT")![1];
  signal();
  await vi.waitFor(() => expect(stop).toHaveBeenCalledOnce());
  expect(lock.release).not.toHaveBeenCalled();
  finishStop();
  await vi.waitFor(() => expect(lock.release).toHaveBeenCalledOnce());
});
