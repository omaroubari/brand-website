import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { createModuleLoader } from "../src/core/load-module.ts";

it.each(["js", "mjs", "ts"])(
  "re-reads edited author %s modules with imports",
  async (extension) => {
    const root = await mkdtemp(join(tmpdir(), "brandtree-modules-"));
    try {
      await writeFile(join(root, "package.json"), '{"type":"module"}');
      const helper = join(root, `helper.${extension}`);
      const config = join(root, `brandtree.config.${extension}`);
      await writeFile(helper, 'export default "one";');
      await writeFile(
        config,
        `import value from "./helper.${extension}"; export default { value, label: "original" };`,
      );
      const load = createModuleLoader();
      expect(await load(config)).toEqual({ value: "one", label: "original" });
      await writeFile(
        config,
        `import value from "./helper.${extension}"; export default { value, label: "updated" };`,
      );
      expect(await load(config)).toEqual({ value: "one", label: "updated" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
);
