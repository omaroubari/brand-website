import { mkdtemp, mkdir, rm, writeFile, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";

import { watchProject } from "../src/cli/watch.ts";

it("watches edits, additions, deletions, and new input directories, excluding generated output", async () => {
  const root = await mkdtemp(join(tmpdir(), "brandtree-watch-"));
  const changed = vi.fn();
  const failed = vi.fn();
  const watcher = watchProject(root, changed, failed);
  try {
    await mkdir(join(root, "content"));
    await vi.waitFor(() => expect(changed).toHaveBeenCalled());
    changed.mockClear();
    await writeFile(join(root, "content", "01-page.md"), "Page");
    await vi.waitFor(() => expect(changed).toHaveBeenCalled());
    changed.mockClear();
    await writeFile(join(root, "content", "01-page.md"), "Edited");
    await vi.waitFor(() => expect(changed).toHaveBeenCalled());
    changed.mockClear();
    await rename(
      join(root, "content", "01-page.md"),
      join(root, "content", "02-renamed.md"),
    );
    await vi.waitFor(() => expect(changed).toHaveBeenCalled());
    changed.mockClear();
    await rm(join(root, "content", "02-renamed.md"));
    await vi.waitFor(() => expect(changed).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 100));
    changed.mockClear();
    await mkdir(join(root, ".brandtree"));
    await writeFile(join(root, ".brandtree", "generated.json"), "{}");
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(changed).not.toHaveBeenCalled();
    expect(failed).not.toHaveBeenCalled();
  } finally {
    watcher.close();
    await rm(root, { force: true, recursive: true });
  }
});
