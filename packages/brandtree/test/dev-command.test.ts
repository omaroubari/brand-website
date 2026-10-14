import { runCommand } from "citty";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("../src/cli/dev-lock.ts", () => ({ acquireDevLock: vi.fn() }));
vi.mock("astro", () => ({ dev: vi.fn() }));
vi.mock("chokidar", () => ({
  watch: vi.fn(() => ({
    add: vi.fn(),
    unwatch: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));
vi.mock("../src/cli/regenerate.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/cli/regenerate.ts")>()),
  createRegenerationQueue: vi.fn(() => ({
    change: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));
vi.mock("../src/cli/prepare.ts", () => ({ prepareProject: vi.fn() }));
vi.mock("../src/cli/log.ts", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  reportDiagnostics: vi.fn(() => false),
}));

vi.mock("../src/core/project-tree.ts", () => ({ scanProject: vi.fn() }));
vi.mock("../src/astro/generate.ts", () => ({ generateRuntime: vi.fn() }));

import { dev } from "astro";
import { acquireDevLock } from "../src/cli/dev-lock.ts";
import { mainCommand } from "../src/cli/command.ts";
import { prepareProject } from "../src/cli/prepare.ts";
import { watch } from "chokidar";
import { createRegenerationQueue } from "../src/cli/regenerate.ts";
import { logger } from "../src/cli/log.ts";
import { scanProject } from "../src/core/project-tree.ts";
import { generateRuntime } from "../src/astro/generate.ts";

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(acquireDevLock).mockReturnValue({
    owns: vi.fn(() => true),
    updatePort: vi.fn(),
    release: vi.fn(),
  });
  vi.stubEnv("NODE_ENV", undefined);
  vi.spyOn(process, "once").mockReturnValue(process);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

const runDev = (...args: string[]) =>
  runCommand(mainCommand, { rawArgs: ["dev", ...args] });
const project = () =>
  ({
    context: {
      root: process.cwd(),
      outDir: `${process.cwd()}/.brandtree`,
      contentRoot: `${process.cwd()}/content`,
      assetReferences: [],
    },
    config: { fonts: [] },
  }) as unknown as Awaited<ReturnType<typeof prepareProject>>;

it("scans and generates the runtime for a queued edit", async () => {
  const runtime = project();
  vi.mocked(prepareProject).mockResolvedValue(runtime);
  vi.mocked(dev).mockResolvedValue({
    stop: vi.fn().mockResolvedValue(undefined),
    address: { port: 4321 },
  } as unknown as Awaited<ReturnType<typeof dev>>);
  vi.mocked(scanProject).mockResolvedValue(runtime);
  vi.mocked(generateRuntime).mockResolvedValue({
    structuralChange: false,
    warnings: [],
  });

  await runDev();
  const regenerate = vi.mocked(createRegenerationQueue).mock.calls[0]![0];
  await regenerate([
    { event: "change", path: `${process.cwd()}/content/page.mdx` },
  ]);

  expect(scanProject).toHaveBeenCalledExactlyOnceWith(process.cwd(), {
    devServerUrl: "http://localhost:4321",
    mode: "dev",
    preview: false,
  });
  expect(generateRuntime).toHaveBeenCalledExactlyOnceWith(runtime);
  expect(logger.error).not.toHaveBeenCalled();
});

// Lock-file behavior lives in dev-lock.test.ts. These cases cover CLI ordering
// and forwarding: claim before preparation, report the bound port, release after stop.
it("claims the lock before preparation and reports Astro's bound port", async () => {
  const runtime = project();
  vi.mocked(prepareProject).mockImplementation(async () => {
    expect(process.env.NODE_ENV).toBe("development");
    expect(acquireDevLock).toHaveBeenCalledExactlyOnceWith(
      runtime.context.outDir,
      4567,
    );
    expect(process.once).toHaveBeenCalledWith(
      "exit",
      vi.mocked(acquireDevLock).mock.results[0]!.value.release,
    );
    expect(dev).not.toHaveBeenCalled();
    return runtime;
  });
  vi.mocked(dev).mockResolvedValue({
    stop: vi.fn().mockResolvedValue(undefined),
    address: { port: 4568 },
  } as unknown as Awaited<ReturnType<typeof dev>>);

  await runDev("--port=4567");

  expect(prepareProject).toHaveBeenCalledExactlyOnceWith({
    root: process.cwd(),
    devServerUrl: "http://localhost:4567",
    mode: "dev",
    preview: false,
    strict: undefined,
  });
  expect(dev).toHaveBeenCalledExactlyOnceWith({
    root: runtime.context.outDir,
    logLevel: "info",
    server: { host: false, open: false, port: 4567 },
  });
  const lock = vi.mocked(acquireDevLock).mock.results[0]!.value;
  expect(lock.updatePort).toHaveBeenCalledExactlyOnceWith(4568);
});

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((finish) => {
    resolve = finish;
  });
  return { promise, resolve };
};

it.each(["SIGINT", "SIGTERM"])(
  "releases the lock after watcher, queue, and Astro cleanup on %s",
  async (signal) => {
    const watcherClosed = deferred();
    const queueClosed = deferred();
    const astroStopped = deferred();
    const stop = vi.fn(() => astroStopped.promise);
    vi.mocked(prepareProject).mockResolvedValue(project());
    vi.mocked(dev).mockResolvedValue({
      stop,
      address: { port: 4321 },
    } as unknown as Awaited<ReturnType<typeof dev>>);
    const removeListener = vi.spyOn(process, "removeListener");

    await runDev();
    const watcher = vi.mocked(watch).mock.results[0]!.value;
    const queue = vi.mocked(createRegenerationQueue).mock.results[0]!.value;
    watcher.close.mockReturnValue(watcherClosed.promise);
    queue.close.mockReturnValue(queueClosed.promise);
    const lock = vi.mocked(acquireDevLock).mock.results[0]!.value;
    const handler = vi
      .mocked(process.once)
      .mock.calls.find(([event]) => event === signal)![1];

    handler();
    await vi.waitFor(() => expect(watcher.close).toHaveBeenCalledOnce());
    expect(queue.close).not.toHaveBeenCalled();
    expect(stop).not.toHaveBeenCalled();
    expect(lock.release).not.toHaveBeenCalled();
    watcherClosed.resolve();
    await vi.waitFor(() => expect(queue.close).toHaveBeenCalledOnce());
    expect(stop).not.toHaveBeenCalled();
    expect(lock.release).not.toHaveBeenCalled();
    queueClosed.resolve();
    await vi.waitFor(() => expect(stop).toHaveBeenCalledOnce());
    expect(lock.release).not.toHaveBeenCalled();
    astroStopped.resolve();
    await vi.waitFor(() => expect(lock.release).toHaveBeenCalledOnce());
    expect(removeListener).toHaveBeenCalledWith("SIGINT", handler);
    expect(removeListener).toHaveBeenCalledWith("SIGTERM", handler);
    expect(removeListener).toHaveBeenCalledWith("exit", lock.release);
  },
);

it.each(["watcher", "queue", "Astro"])(
  "retains the lock and reports a failed %s shutdown",
  async (stage) => {
    const previousExitCode = process.exitCode;
    const error = new Error("Shutdown failed");
    const stop = vi.fn().mockResolvedValue(undefined);
    vi.mocked(prepareProject).mockResolvedValue(project());
    vi.mocked(dev).mockResolvedValue({
      stop,
      address: { port: 4321 },
    } as unknown as Awaited<ReturnType<typeof dev>>);
    const removeListener = vi.spyOn(process, "removeListener");
    try {
      await runDev();
      const watcher = vi.mocked(watch).mock.results[0]!.value;
      const queue = vi.mocked(createRegenerationQueue).mock.results[0]!.value;
      const lock = vi.mocked(acquireDevLock).mock.results[0]!.value;
      if (stage === "watcher") watcher.close.mockRejectedValue(error);
      if (stage === "queue") queue.close.mockRejectedValue(error);
      if (stage === "Astro")
        stop.mockImplementation(() => {
          throw error;
        });
      const handler = vi
        .mocked(process.once)
        .mock.calls.find(([event]) => event === "SIGINT")![1];
      handler();
      await vi.waitFor(() => expect(logger.error).toHaveBeenCalledWith(error));
      expect(queue.close).toHaveBeenCalledOnce();
      expect(stop).toHaveBeenCalledOnce();
      expect(lock.release).not.toHaveBeenCalled();
      expect(removeListener).not.toHaveBeenCalledWith("exit", lock.release);
      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = previousExitCode;
    }
  },
);

it.each(["lock", "preparation", "Astro"])(
  "stops startup when %s fails",
  async (stage) => {
    const error = new Error("Startup failed");
    vi.mocked(prepareProject).mockResolvedValue(project());
    if (stage === "lock")
      vi.mocked(acquireDevLock).mockImplementation(() => {
        throw error;
      });
    if (stage === "preparation")
      vi.mocked(prepareProject).mockRejectedValue(error);
    if (stage === "Astro") vi.mocked(dev).mockRejectedValue(error);

    await expect(runDev()).rejects.toBe(error);
    if (stage === "lock") expect(prepareProject).not.toHaveBeenCalled();
    if (stage !== "Astro") expect(dev).not.toHaveBeenCalled();
    const calls = vi.mocked(process.once).mock.calls;
    expect(
      calls.filter(([event]) => event === "SIGINT" || event === "SIGTERM"),
    ).toHaveLength(0);
    if (stage !== "lock") {
      // The exit hook survives failed startup so the CLI can clean up its claim.
      const release = vi.mocked(acquireDevLock).mock.results[0]!.value.release;
      const exit = calls.find(([event]) => event === "exit")![1];
      exit(1);
      expect(release).toHaveBeenCalledOnce();
    }
  },
);

it.each(["abc", "", "-1", "65536", "4321.5", "1e3"])(
  "rejects invalid port %j before claiming or preparing the runtime",
  async (port) => {
    await expect(runDev(`--port=${port}`)).rejects.toThrow(
      "--port must be an integer between 0 and 65535.",
    );
    expect(acquireDevLock).not.toHaveBeenCalled();
    expect(prepareProject).not.toHaveBeenCalled();
    expect(dev).not.toHaveBeenCalled();
  },
);
