import { mkdtemp, rm, writeFile, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

import { loadConfig } from "../src/core/config";
import { BrandtreeError } from "../src/core/diagnostics";
import { brandtreeConfigSchema } from "../src/core/schema";
import fixtureConfig from "../../../apps/web/brandtree.config";
import sandboxConfig from "../../../apps/sandbox/brandtree.config";

const directories: string[] = [];
const configModule = fileURLToPath(
  new URL("../src/core/config.ts", import.meta.url),
);
const invalidInput = {
  ...fixtureConfig,
  brand: {
    ...fixtureConfig.brand,
    meta: { ...fixtureConfig.brand.meta, name: 42 },
    colors: {
      ...fixtureConfig.brand.colors,
      palette: fixtureConfig.brand.colors.palette.map((color, index) =>
        index === 0 ? { ...color, name: 42 } : color,
      ),
    },
  },
  unexpected: true,
};

const makeConfig = async (source: string) => {
  const directory = await mkdtemp(join(tmpdir(), "brandtree-config-"));
  directories.push(directory);
  await symlink(
    fileURLToPath(new URL("../../../apps/sandbox/assets/", import.meta.url)),
    join(directory, "assets"),
    "dir",
  );
  await symlink(
    fileURLToPath(new URL("../../../apps/sandbox/public/", import.meta.url)),
    join(directory, "public"),
    "dir",
  );
  const file = join(directory, "brandtree.config.mjs");
  await writeFile(file, source);
  return { root: directory, file };
};

afterAll(async () => {
  await Promise.all(
    directories.map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("config diagnostics", () => {
  it.each([false, true])(
    "preserves every schema issue (defineConfig: %s)",
    async (validateOnLoad) => {
      const input = JSON.stringify(invalidInput);
      const { root, file } = await makeConfig(
        validateOnLoad
          ? `import { defineConfig } from ${JSON.stringify(configModule)}; export default defineConfig(${input});`
          : `export default ${input};`,
      );
      const expected = brandtreeConfigSchema.safeParse(invalidInput);
      if (expected.success) throw new Error("Fixture must fail validation");

      const failure = await loadConfig(root).catch((error: unknown) => error);
      expect(failure).toBeInstanceOf(BrandtreeError);
      expect(failure).toMatchObject({
        name: "BrandtreeError",
        diagnostic: {
          code: "BLUME_CONFIG_INVALID",
          severity: "error",
          file,
          schemaPath: "brand.meta.name",
          line: undefined,
          column: undefined,
        },
      });
      if (!(failure instanceof BrandtreeError))
        throw new Error("Expected diagnostics");
      expect(failure.message).toBe(failure.diagnostic.message);
      for (const issue of expected.error.issues) {
        const path = issue.path.join(".");
        expect(failure.message).toContain(
          path ? `${path}: ${issue.message}` : issue.message,
        );
      }
      expect(failure.message).toContain("brand.colors.palette.0.name:");
      expect(failure.message).toContain("2 more config issue(s):");
    },
  );

  it.each([
    'throw new Error("Cannot evaluate config");',
    "throw { issues: [{ unrelated: true }] };",
  ])(
    "reports evaluation failures without misclassifying them as schema issues",
    async (source) => {
      const { root, file } = await makeConfig(source);
      const failure = await loadConfig(root).catch((error: unknown) => error);
      expect(failure).toBeInstanceOf(BrandtreeError);
      expect(failure).toMatchObject({
        name: "BrandtreeError",
        message: expect.stringContaining("Failed to load config:"),
        diagnostic: {
          code: "BRANDTREE_CONFIG_LOAD_FAILED",
          severity: "error",
          file,
          message: expect.stringContaining("Failed to load config:"),
        },
      });
    },
  );

  it("returns resolved config for a valid module", async () => {
    const { root, file } = await makeConfig(
      `export default ${JSON.stringify(sandboxConfig)};`,
    );
    await expect(loadConfig(root)).resolves.toEqual({
      config: brandtreeConfigSchema.parse(sandboxConfig),
      configFile: file,
      diagnostics: [],
    });
  });

  it("returns nonfatal brand warnings alongside resolved config", async () => {
    const input = {
      ...sandboxConfig,
      brand: {
        ...sandboxConfig.brand,
        typography: {
          ...sandboxConfig.brand.typography,
          display: "var(--font-missing)",
        },
      },
    };
    const { root, file } = await makeConfig(
      `export default ${JSON.stringify(input)};`,
    );
    const result = await loadConfig(root);
    expect(result.config).toEqual(brandtreeConfigSchema.parse(input));
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        file,
        code: "BRANDTREE_FONT_VARIABLE_UNDECLARED",
        severity: "warning",
        schemaPath: "brand.typography.display",
        message: expect.stringContaining("--font-missing"),
      }),
    ]);
  });
});

it("reloads authored config and its imported helper after edits", async () => {
  const { root, file } = await makeConfig(
    `import name from './name.ts'; export default { ...${JSON.stringify(fixtureConfig)}, brand: { ...${JSON.stringify(fixtureConfig.brand)}, meta: { ...${JSON.stringify(fixtureConfig.brand.meta)}, name } } };`,
  );
  const helper = join(root, "name.ts");
  await writeFile(helper, 'export default "Initial name";');
  expect((await loadConfig(root)).config.brand.meta.name).toBe("Initial name");
  await writeFile(helper, 'export default "Edited name";');
  expect((await loadConfig(root)).config.brand.meta.name).toBe("Edited name");
  await writeFile(file, "export default { brand: ;");
  await expect(loadConfig(root)).rejects.toBeInstanceOf(BrandtreeError);
});
