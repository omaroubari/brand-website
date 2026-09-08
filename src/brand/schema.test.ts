import { describe, expect, expectTypeOf, it } from "vitest";
import { brand, config } from "./config";
import {
  i18nConfigSchema,
  navigationConfigSchema,
  brandtreeConfigSchema,
} from "./schema";

function issuePaths(value: unknown): PropertyKey[][] {
  const result = brandtreeConfigSchema.safeParse(value);
  expect(result.success).toBe(false);
  return result.success ? [] : result.error.issues.map((issue) => issue.path);
}

describe("site configuration schema", () => {
  it("parses the shipped configuration and resolves defaults", () => {
    expect(brandtreeConfigSchema.parse(config)).toEqual(config);
    expect(config.brand).toBe(brand);
    expect(navigationConfigSchema.parse({}).numbering).toBe(false);
    expect(config.navigation.numbering).toBe(true);

    const { navigation: _navigation, ...withoutNavigation } = config;
    expect(brandtreeConfigSchema.parse(withoutNavigation).navigation).toEqual({
      numbering: false,
    });

    expect(
      i18nConfigSchema.parse({
        defaultLocale: "en",
        locales: [{ code: "en", label: "English" }],
      }).locales[0].dir,
    ).toBe("ltr");
  });

  it("preserves configured locale literals in the parsed config type", () => {
    type ConfiguredLocale = NonNullable<
      typeof config.i18n
    >["locales"][number]["code"];

    expectTypeOf<ConfiguredLocale>().toEqualTypeOf<"en" | "ar">();
  });

  it("rejects unknown flat and legacy brand keys", () => {
    expect(() =>
      brandtreeConfigSchema.parse({ ...config, meta: brand.meta }),
    ).toThrow();
    expect(() =>
      brandtreeConfigSchema.parse({
        ...config,
        brand: { ...brand, numbering: true },
      }),
    ).toThrow();
    expect(() =>
      brandtreeConfigSchema.parse({
        ...config,
        brand: { ...brand, locales: {} },
      }),
    ).toThrow();
    expect(() =>
      brandtreeConfigSchema.parse({
        ...config,
        brand: { ...brand, i18n: config.i18n },
      }),
    ).toThrow();
    expect(() =>
      brandtreeConfigSchema.parse({
        ...config,
        brand: { ...brand, navigation: config.navigation },
      }),
    ).toThrow();
    expect(() =>
      brandtreeConfigSchema.parse({
        ...config,
        brand: {
          ...brand,
          meta: { ...brand.meta, typo: "unknown" },
        },
      }),
    ).toThrow();
  });

  it("enforces locale/default relationships", () => {
    expect(() =>
      i18nConfigSchema.parse({
        defaultLocale: "fr",
        locales: [{ code: "en", label: "English" }],
      }),
    ).toThrow(/defaultLocale/);

    expect(() =>
      i18nConfigSchema.parse({
        defaultLocale: "EN",
        locales: [{ code: "EN", label: "English" }],
      }),
    ).toThrow(/canonical BCP 47/);

    expect(() =>
      i18nConfigSchema.parse({
        defaultLocale: "en",
        locales: [
          { code: "en", label: "English" },
          { code: "en", label: "English again" },
        ],
      }),
    ).toThrow(/Duplicate locale code/);
  });

  it("reports cross-aggregate locale failures at useful paths", () => {
    const { i18n: _i18n, ...withoutI18n } = config;
    expect(issuePaths(withoutI18n)).toContainEqual([
      "brand",
      "localeOverrides",
    ]);

    expect(
      issuePaths({
        ...config,
        brand: {
          ...brand,
          localeOverrides: { ...brand.localeOverrides, fr: {} },
        },
      }),
    ).toContainEqual(["brand", "localeOverrides", "fr"]);
  });

  it("enforces exact locale-override identities", () => {
    expect(() =>
      brandtreeConfigSchema.parse({
        ...config,
        brand: {
          ...brand,
          localeOverrides: {
            ...brand.localeOverrides,
            ar: {
              ...brand.localeOverrides?.ar,
              colors: { palette: [{ id: "missing" }] },
            },
          },
        },
      }),
    ).toThrow(/canonical id/);
  });

  it("enforces unique identities and resolvable color references", () => {
    expect(() =>
      brandtreeConfigSchema.parse({
        ...config,
        brand: {
          ...brand,
          colors: {
            ...brand.colors,
            palette: [...brand.colors.palette, brand.colors.palette[0]],
          },
        },
      }),
    ).toThrow(/Duplicate id/);

    expect(() =>
      brandtreeConfigSchema.parse({
        ...config,
        brand: {
          ...brand,
          theme: {
            ...brand.theme,
            light: { ...brand.theme.light, primary: "missing-500" },
          },
        },
      }),
    ).toThrow(/Unknown colour reference/);

    expect(() =>
      brandtreeConfigSchema.parse({
        ...config,
        brand: {
          ...brand,
          typography: {
            ...brand.typography,
            weights: [...brand.typography.weights, brand.typography.weights[0]],
          },
        },
      }),
    ).toThrow(/Duplicate weight/);
  });
});
