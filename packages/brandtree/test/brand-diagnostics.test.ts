import { expect, it } from "vitest";
import fixtureConfig from "../../../apps/sandbox/brandtree.config";
import { collectBrandDiagnostics } from "../src/brand/diagnostics";
import { brandtreeConfigSchema } from "../src/core/schema";
import { formatDiagnostic } from "../src/core/diagnostics";

it("accepts declared variables, system stacks, and generated default fallback variables", () => {
  expect(
    collectBrandDiagnostics(brandtreeConfigSchema.parse(fixtureConfig)),
  ).toEqual([]);
  const config = brandtreeConfigSchema.parse({
    ...fixtureConfig,
    fonts: undefined,
    brand: {
      ...fixtureConfig.brand,
      typography: {
        ...fixtureConfig.brand.typography,
        display: "var(--font-brandtree-default)",
        text: "system-ui, sans-serif",
      },
    },
  });
  expect(collectBrandDiagnostics(config)).toEqual([]);
});

it("reports each undeclared reference once per canonical or locale typography field", () => {
  const config = brandtreeConfigSchema.parse({
    ...fixtureConfig,
    fonts: [],
    brand: {
      ...fixtureConfig.brand,
      typography: {
        ...fixtureConfig.brand.typography,
        display: "var(--font-missing), var(--font-missing)",
        text: "var(--font-missing, var(--font-other, sans-serif))",
        mono: "var(--font-code)",
      },
      localeOverrides: {
        ar: {
          typography: { display: "var(--font-arabic)", text: "system-ui" },
        },
      },
    },
  });
  const diagnostics = collectBrandDiagnostics(config);
  expect(diagnostics.map(({ schemaPath }) => schemaPath)).toEqual([
    "brand.typography.display",
    "brand.typography.text",
    "brand.typography.text",
    "brand.typography.mono",
    "brand.localeOverrides.ar.typography.display",
  ]);
  for (const diagnostic of diagnostics) {
    expect(diagnostic).toMatchObject({
      code: "BRANDTREE_FONT_VARIABLE_UNDECLARED",
      severity: "warning",
      suggestion: expect.stringContaining("cssVariable"),
    });
  }
  expect(diagnostics[0]?.message).toContain('"--font-missing"');
});

it("anchors brand warnings to the config source and uses the existing formatter", () => {
  const config = brandtreeConfigSchema.parse({
    ...fixtureConfig,
    brand: {
      ...fixtureConfig.brand,
      typography: {
        ...fixtureConfig.brand.typography,
        display: "var(--font-missing)",
      },
    },
  });
  const source = `export default {
  brand: {
    typography: {
      display: 'var(--font-missing)',
    },
  },
};`;
  const [diagnostic] = collectBrandDiagnostics(config, {
    file: "/project/brandtree.config.ts",
    source,
  });
  expect(diagnostic).toMatchObject({
    file: "/project/brandtree.config.ts",
    line: 4,
    column: 7,
    schemaPath: "brand.typography.display",
  });
  if (!diagnostic) throw new Error("Expected a font warning");
  expect(formatDiagnostic(diagnostic, "/project")).toContain(
    "brandtree.config.ts:4:7",
  );
});
