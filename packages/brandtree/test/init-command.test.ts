import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { runCommand } from "citty";
import { afterEach, expect, it } from "vitest";

import { mainCommand } from "../src/cli/command.ts";

const roots: string[] = [];
const makeRoot = async () => {
  const root = await mkdtemp(join(tmpdir(), "brandtree-init-"));
  roots.push(root);
  return root;
};
const runInit = (...args: string[]) =>
  runCommand(mainCommand, { rawArgs: ["init", ...args] });

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

it("runs the source CLI as a subprocess and creates the expected ignore entries", async () => {
  const cwd = await makeRoot();
  const root = join(cwd, "my brand");
  const sourceCli = fileURLToPath(
    new URL("../src/cli/index.ts", import.meta.url),
  );
  // execFile rejects on a nonzero exit, so awaiting it also checks success.
  const { stderr } = await promisify(execFile)(
    process.execPath,
    [sourceCli, "init", "my brand", "--yes"],
    { cwd, encoding: "utf-8", timeout: 10_000 },
  );
  expect(stderr).toBe("");
  expect(await readFile(join(root, ".gitignore"), "utf-8")).toBe(
    "node_modules/\n.brandtree/\ndist/\n",
  );
}, 15_000);

it.each(["--package-manager=unknown", "--title= "])(
  "rejects %s without writing files",
  async (flag) => {
    const root = await makeRoot();
    await expect(runInit(root, "--yes", flag)).rejects.toThrow();
    expect(await readdir(root)).toEqual([]);
  },
);
