import { runCommand } from "citty";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("../src/cli/dev-lock.ts", () => ({ acquireDevLock: vi.fn() }));
vi.mock("astro", () => ({ dev: vi.fn() }));
vi.mock("../src/cli/prepare.ts", () => ({ prepareProject: vi.fn() }));
vi.mock("../src/cli/log.ts", () => ({ logger: { error: vi.fn() } }));

import { dev } from "astro";
import { acquireDevLock } from "../src/cli/dev-lock.ts";
import { mainCommand } from "../src/cli/command.ts";
import { prepareProject } from "../src/cli/prepare.ts";

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
  ({ context: { outDir: `${process.cwd()}/.brandtree` } }) as Awaited<
    ReturnType<typeof prepareProject>
  >;

// Lock-file behavior lives in dev-lock.test.ts. These cases cover CLI ordering
// and forwarding: claim before preparation, report the bound port, release after stop.
it.each([
  { signal: "SIGINT", port: 4567, args: ["--port=4567"] },
  { signal: "SIGTERM", port: 4321, args: [] },
])(
  "starts and shuts down the session on $signal",
  async ({ signal, port, args }) => {
    const runtime = project();
    vi.mocked(prepareProject).mockImplementation(async () => {
      expect(process.env.NODE_ENV).toBe("development");
      expect(acquireDevLock).toHaveBeenCalledExactlyOnceWith(
        runtime.context.outDir,
        port,
      );
      expect(process.once).toHaveBeenCalledWith(
        "exit",
        vi.mocked(acquireDevLock).mock.results[0]!.value.release,
      );
      expect(dev).not.toHaveBeenCalled();
      return runtime;
    });
    let finishStop!: () => void;
    const stop = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishStop = resolve;
        }),
    );
    vi.mocked(dev).mockResolvedValue({
      stop,
      address: { port: 4568 },
    } as unknown as Awaited<ReturnType<typeof dev>>);
    const removeListener = vi.spyOn(process, "removeListener");

    await runDev(...args);
    expect(prepareProject).toHaveBeenCalledExactlyOnceWith({
      root: process.cwd(),
      mode: "dev",
    });
    expect(dev).toHaveBeenCalledExactlyOnceWith({
      root: runtime.context.outDir,
      server: { port },
    });
    const lock = vi.mocked(acquireDevLock).mock.results[0]!.value;
    expect(lock.updatePort).toHaveBeenCalledExactlyOnceWith(4568);
    const handler = vi
      .mocked(process.once)
      .mock.calls.find(([event]) => event === signal)![1];
    handler();
    expect(stop).toHaveBeenCalledOnce();
    expect(lock.release).not.toHaveBeenCalled();
    finishStop();
    await vi.waitFor(() => expect(lock.release).toHaveBeenCalledOnce());
    expect(removeListener).toHaveBeenCalledWith("SIGINT", handler);
    expect(removeListener).toHaveBeenCalledWith("SIGTERM", handler);
    expect(removeListener).toHaveBeenCalledWith("exit", lock.release);
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
