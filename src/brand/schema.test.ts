import { describe, expect, it } from "vitest";
import { brand } from "./config";
import {
  brandConfigSchema,
  i18nConfigSchema,
  navigationConfigSchema,
} from "./schema";

describe("brand configuration schema", () => {
  it("parses the shipped configuration and resolves navigation defaults", () => {
    expect(brandConfigSchema.parse(brand)).toEqual(brand);
    expect(navigationConfigSchema.parse({}).numbering).toBe(false);
    expect(brand.navigation.numbering).toBe(true);

    const { navigation: _navigation, ...withoutNavigation } = brand;
    expect(brandConfigSchema.parse(withoutNavigation).navigation).toEqual({
      numbering: false,
    });
  });

  it("rejects unknown keys instead of silently stripping them", () => {
    expect(() =>
      brandConfigSchema.parse({ ...brand, numbering: true }),
    ).toThrow();
    expect(() =>
      brandConfigSchema.parse({
        ...brand,
        meta: { ...brand.meta, typo: "unknown" },
      }),
    ).toThrow();
  });

  it("enforces locale/default and override relationships", () => {
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

    expect(() =>
      brandConfigSchema.parse({
        ...brand,
        locales: { ...brand.locales, fr: {} },
      }),
    ).toThrow(/not configured/);

    expect(() =>
      brandConfigSchema.parse({
        ...brand,
        locales: {
          ...brand.locales,
          ar: {
            ...brand.locales?.ar,
            colors: { palette: [{ id: "missing" }] },
          },
        },
      }),
    ).toThrow(/canonical id/);
  });

  it("enforces unique identities and resolvable color references", () => {
    expect(() =>
      brandConfigSchema.parse({
        ...brand,
        colors: {
          ...brand.colors,
          palette: [...brand.colors.palette, brand.colors.palette[0]],
        },
      }),
    ).toThrow(/Duplicate id/);

    expect(() =>
      brandConfigSchema.parse({
        ...brand,
        theme: {
          ...brand.theme,
          light: { ...brand.theme.light, primary: "missing-500" },
        },
      }),
    ).toThrow(/Unknown colour reference/);

    expect(() =>
      brandConfigSchema.parse({
        ...brand,
        typography: {
          ...brand.typography,
          weights: [...brand.typography.weights, brand.typography.weights[0]],
        },
      }),
    ).toThrow(/Duplicate weight/);
  });
});
