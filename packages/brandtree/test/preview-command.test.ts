import { runCommand } from "citty";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("astro", () => ({ preview: vi.fn() }));
vi.mock("node:fs/promises", () => ({ stat: vi.fn() }));
import { preview } from "astro";
import { stat } from "node:fs/promises";
import { mainCommand } from "../src/cli/command.ts";

beforeEach(() => {
  vi.resetAllMocks();
});
afterEach(() => {
  vi.restoreAllMocks();
});
it("previews dist independently of authored config and the generated runtime", async () => {
  vi.mocked(stat).mockResolvedValue({ isDirectory: () => true } as Awaited<
    ReturnType<typeof stat>
  >);
  const stop = vi.fn().mockResolvedValue(undefined);
  vi.mocked(preview).mockResolvedValue({ stop } as unknown as Awaited<
    ReturnType<typeof preview>
  >);
  const once = vi.spyOn(process, "once").mockReturnValue(process);
  await runCommand(mainCommand, { rawArgs: ["preview"] });
  expect(preview).toHaveBeenCalledWith({
    root: process.cwd(),
    outDir: `${process.cwd()}/dist`,
    configFile: false,
    output: "static",
  });
  once.mock.calls.find(([event]) => event === "SIGTERM")![1]();
  expect(stop).toHaveBeenCalledOnce();
});
it("reports a missing production build before starting Astro", async () => {
  vi.mocked(stat).mockRejectedValue(new Error("ENOENT"));
  await expect(
    runCommand(mainCommand, { rawArgs: ["preview"] }),
  ).rejects.toThrow("Run brandtree build first");
  expect(preview).not.toHaveBeenCalled();
});
