import { runCommand } from "citty";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("node:fs/promises", () => ({ stat: vi.fn(), readdir: vi.fn() }));
vi.mock("astro", () => ({ preview: vi.fn() }));
vi.mock("../src/cli/log.ts", () => ({ logger: { error: vi.fn() } }));
vi.mock("../src/cli/prepare.ts", () => ({ prepareProject: vi.fn() }));

import { readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { preview } from "astro";
import { mainCommand } from "../src/cli/command.ts";
import { prepareProject } from "../src/cli/prepare.ts";
import { logger } from "../src/cli/log.ts";

const close = vi.fn();
let previousExitCode: typeof process.exitCode;
const runPreview = (...args: string[]) =>
  runCommand(mainCommand, { rawArgs: ["preview", ...args] });

beforeEach(() => {
  vi.resetAllMocks();
  previousExitCode = process.exitCode;
  vi.spyOn(process.stderr, "write").mockReturnValue(true);
  vi.mocked(readdir).mockResolvedValue(["index.html"] as never);
  vi.mocked(stat).mockResolvedValue({
    isDirectory: () => true,
    isFile: () => true,
  } as Awaited<ReturnType<typeof stat>>);
  close.mockResolvedValue(undefined);
  vi.mocked(preview).mockResolvedValue({
    stop: close,
  } as unknown as Awaited<ReturnType<typeof preview>>);
  vi.spyOn(process, "once").mockReturnValue(process);
});
afterEach(() => {
  process.exitCode = previousExitCode;
  vi.restoreAllMocks();
});

it("uses Astro preview with the existing generated runtime without preparing a project", async () => {
  await runPreview();
  expect(preview).toHaveBeenCalledExactlyOnceWith({
    root: resolve(".brandtree"),
    server: { host: false, port: 4321, open: false },
  });
  expect(prepareProject).not.toHaveBeenCalled();
});

it.each([
  [[], false],
  [["--host"], true],
  [["--host=127.0.0.1"], "127.0.0.1"],
])(
  "forwards host %j with an explicit port and browser option",
  async (args, host) => {
    await runPreview(...args, "--port=4567", "--open");
    expect(preview).toHaveBeenCalledWith(
      expect.objectContaining({ server: { host, port: 4567, open: true } }),
    );
  },
);

it.each(["ENOENT", "ENOTDIR", "file", "empty"])(
  "directs the author to build when dist is missing or not a directory (%s)",
  async (code) => {
    if (code === "empty") {
      vi.mocked(readdir).mockResolvedValue([]);
    } else if (code === "file") {
      vi.mocked(stat).mockResolvedValue({
        isDirectory: () => false,
        isFile: () => false,
      } as Awaited<ReturnType<typeof stat>>);
    } else {
      vi.mocked(stat).mockRejectedValue(Object.assign(new Error(), { code }));
    }
    vi.mocked(stat).mockResolvedValueOnce({ isFile: () => true } as Awaited<
      ReturnType<typeof stat>
    >);
    await runPreview();
    expect(process.stderr.write).toHaveBeenCalledExactlyOnceWith(
      "No build found. Run `brandtree build` first.\n",
    );
    expect(process.exitCode).toBe(1);
    expect(preview).not.toHaveBeenCalled();
    expect(prepareProject).not.toHaveBeenCalled();
  },
);

it("rejects a deleted runtime even when production output still exists", async () => {
  vi.mocked(stat).mockImplementation(async (path) => {
    if (String(path).includes(".brandtree")) {
      throw Object.assign(new Error(), { code: "ENOENT" });
    }
    return { isDirectory: () => true } as Awaited<ReturnType<typeof stat>>;
  });
  await runPreview();
  expect(process.stderr.write).toHaveBeenCalledExactlyOnceWith(
    "No build found. Run `brandtree build` first.\n",
  );
  expect(process.exitCode).toBe(1);
  expect(preview).not.toHaveBeenCalled();
  expect(prepareProject).not.toHaveBeenCalled();
});

it.each(["abc", "", "0", "-1", "65536", "4321.5", "1e3"])(
  "rejects invalid port %j before starting a server",
  async (port) => {
    await runPreview(`--port=${port}`);
    expect(process.stderr.write).toHaveBeenCalledExactlyOnceWith(
      `Invalid --port "${port}" (expected an integer 1-65535).\n`,
    );
    expect(process.exitCode).toBe(1);
    expect(preview).not.toHaveBeenCalled();
  },
);

it.each(["SIGINT", "SIGTERM"])("closes the server on %s", async (signal) => {
  const removeListener = vi.spyOn(process, "removeListener");
  await runPreview();
  const stop = vi
    .mocked(process.once)
    .mock.calls.find(([event]) => event === signal)![1];
  stop();
  await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());
  expect(removeListener).toHaveBeenCalledWith("SIGINT", stop);
  expect(removeListener).toHaveBeenCalledWith("SIGTERM", stop);
});

it("reports shutdown failure", async () => {
  const previous = process.exitCode;
  const error = new Error("Shutdown failed");
  try {
    close.mockRejectedValue(error);
    await runPreview();
    vi.mocked(process.once).mock.calls.find(
      ([event]) => event === "SIGTERM",
    )![1]();
    await vi.waitFor(() => expect(logger.error).toHaveBeenCalledWith(error));
    expect(process.exitCode).toBe(1);
  } finally {
    process.exitCode = previous;
  }
});

it("propagates server startup and filesystem errors", async () => {
  const error = new Error("Permission denied");
  vi.mocked(stat).mockRejectedValue(error);
  await expect(runPreview()).rejects.toBe(error);
  expect(preview).not.toHaveBeenCalled();
  vi.mocked(stat).mockResolvedValue({
    isDirectory: () => true,
    isFile: () => true,
  } as Awaited<ReturnType<typeof stat>>);
  vi.mocked(preview).mockRejectedValue(error);
  await expect(runPreview()).rejects.toBe(error);
  expect(process.once).not.toHaveBeenCalled();
});
