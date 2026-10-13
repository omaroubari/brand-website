import { execFile } from "node:child_process";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, it } from "vitest";
const exec = promisify(execFile);
const framework = fileURLToPath(new URL("../", import.meta.url));

it("removes the dev lock when CLI preparation fails", async () => {
  const root = await mkdtemp(join(tmpdir(), "brandtree-dev-failure-"));
  try {
    await expect(
      exec(process.execPath, [join(framework, "dist/cli/index.js"), "dev"], {
        cwd: root,
      }),
    ).rejects.toMatchObject({ code: 1 });
    await expect(access(join(root, ".brandtree/dev.lock"))).rejects.toThrow();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
