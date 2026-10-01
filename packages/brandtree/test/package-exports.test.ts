import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, expect, test } from "vitest";

const root = fileURLToPath(new URL("../", import.meta.url));

beforeAll(() => {
  execFileSync(process.execPath, ["scripts/build.mjs"], { cwd: root });
}, 60_000);

test("the source API exposes configuration helpers", async () => {
  const { defineConfig, defineMeta } = await import("brandtree");
  expect(typeof defineConfig).toBe("function");
  expect(typeof defineMeta).toBe("function");
});

test("public API declarations resolve outside the workspace", () => {
  const directory = mkdtempSync(join(tmpdir(), "brandtree-exports-"));
  try {
    mkdirSync(join(directory, "node_modules"));
    symlinkSync(root, join(directory, "node_modules/brandtree"), "dir");
    writeFileSync(join(directory, "package.json"), '{"type":"module"}');
    writeFileSync(
      join(directory, "index.ts"),
      `
      import { defineConfig, type BrandtreeConfigInput } from 'brandtree';
      const configure: typeof defineConfig = defineConfig;
      declare const input: BrandtreeConfigInput;
      configure(input);
      // @ts-expect-error Configuration requires authored brand data.
      configure({});
    `,
    );
    execFileSync(
      process.execPath,
      [
        fileURLToPath(
          new URL("../../../node_modules/typescript/bin/tsc", import.meta.url),
        ),
        "--noEmit",
        "--strict",
        "--module",
        "ESNext",
        "--moduleResolution",
        "Bundler",
        "--target",
        "ES2022",
        "index.ts",
      ],
      { cwd: directory, encoding: "utf8", stdio: "inherit" },
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
