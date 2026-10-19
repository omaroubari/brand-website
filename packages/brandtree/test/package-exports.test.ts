import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  existsSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

test("the install-time CLI entry exists outside generated build output and is shipped", () => {
  const entry = manifest.bin.brandtree.replace(/^\.\//, "");
  expect(entry.startsWith("dist/")).toBe(false);
  expect(existsSync(join(root, entry))).toBe(true);
  expect(
    manifest.files.some((directory: string) => entry.startsWith(directory)),
  ).toBe(true);
});

test("the CLI runs from source before compiled output exists", () => {
  const directory = mkdtempSync(join(tmpdir(), "brandtree-source-cli-"));
  try {
    mkdirSync(join(directory, "bin"));
    const launcher = join(directory, manifest.bin.brandtree);
    copyFileSync(join(root, manifest.bin.brandtree), launcher);
    symlinkSync(join(root, "src"), join(directory, "src"), "dir");
    expect(
      execFileSync(process.execPath, [launcher, "--version"], {
        cwd: directory,
        encoding: "utf8",
      }).trim(),
    ).toBe(manifest.version);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("the source API loads through the config loader and the compiled CLI runs", () => {
  const output = execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
    import { createJiti } from 'jiti';
    const { defineConfig, defineMeta } = await createJiti(import.meta.url).import('brandtree');
    if (typeof defineConfig !== 'function' || typeof defineMeta !== 'function') process.exit(1);
    console.log('resolved');
  `,
    ],
    { cwd: root, encoding: "utf8" },
  );
  expect(output.trim()).toBe("resolved");
  expect(
    execFileSync(process.execPath, [manifest.bin.brandtree, "--version"], {
      cwd: root,
      encoding: "utf8",
    }).trim(),
  ).toBe("0.0.1");
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
      import { defineConfig, BrandtreeError, type Diagnostic, type DiagnosticSeverity, type BrandtreeConfigInput } from 'brandtree';
      const severity: DiagnosticSeverity = 'warning';
      const diagnostic: Diagnostic = { code: 'EXAMPLE', severity, message: 'Example' };
      new BrandtreeError(diagnostic);
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
      // This runs a full declaration check, which can exceed 5s on CI runners.
      { cwd: directory, encoding: "utf8", stdio: "inherit", timeout: 25_000 },
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 30_000);
