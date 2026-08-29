import { describe, expect, it } from "vitest";
import { brand } from "../brand/config";
import type { BrandConfig } from "../brand/types";
import { resolveBrand } from "./index";

function canonicalBrand(): BrandConfig {
  const config = structuredClone(brand) as BrandConfig;
  config.locales = undefined;
  return config;
}

function thrownMessage(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }

  throw new Error("Expected the operation to throw");
}

describe("resolveBrand", () => {
  it("applies sparse array overlays by identity while preserving canonical collections", () => {
    const config = canonicalBrand();
    const canonicalPaletteIds = config.colors.palette.map(({ id }) => id);
    const canonicalFamilyIds = config.typography.families.map(({ id }) => id);
    const canonicalWeightValues = config.typography.weights.map(
      ({ weight }) => weight,
    );
    const canonicalScaleIds = config.typography.scale.map(({ id }) => id);

    config.locales = {
      ar: {
        colors: {
          palette: [
            { id: "orange", name: "برتقالي" },
            { id: "neutral", name: "محايد" },
          ],
          swatches: [{ id: "black", name: "أسود", usage: "للنصوص" }],
        },
        typography: {
          display: "var(--font-arabic)",
          families: [
            {
              id: "display",
              name: "PP Neue Montreal Arabic",
              note: "للخطوط الكبيرة",
            },
          ],
          weights: [{ weight: 300, name: "خفيف" }],
          scale: [{ id: "display-plus", role: "للعناوين", sample: "تقدّم" }],
        },
      },
    };

    const localized = resolveBrand(config, "ar");

    expect(localized.colors.palette.map(({ id }) => id)).toEqual(
      canonicalPaletteIds,
    );
    expect(localized.colors.palette.map(({ name }) => name)).toEqual([
      "محايد",
      "برتقالي",
    ]);
    expect(localized.colors.swatches).toHaveLength(
      config.colors.swatches.length,
    );
    expect(localized.colors.swatches[0]).toMatchObject({
      id: "black",
      name: "أسود",
      usage: "للنصوص",
      color: config.colors.swatches[0].color,
    });

    expect(localized.typography.display).toBe("var(--font-arabic)");
    expect(localized.typography.text).toBe(config.typography.text);
    expect(localized.typography.families.map(({ id }) => id)).toEqual(
      canonicalFamilyIds,
    );
    expect(localized.typography.families[0]).toMatchObject({
      id: "display",
      name: "PP Neue Montreal Arabic",
      note: "للخطوط الكبيرة",
    });
    expect(localized.typography.weights.map(({ weight }) => weight)).toEqual(
      canonicalWeightValues,
    );
    expect(localized.typography.weights[0].name).toBe("خفيف");
    expect(localized.typography.scale.map(({ id }) => id)).toEqual(
      canonicalScaleIds,
    );
    expect(localized.typography.scale[0]).toMatchObject({
      id: "display-plus",
      role: "للعناوين",
      sample: "تقدّم",
      size: config.typography.scale[0].size,
    });
  });

  it("resolves only the requested locale over the canonical config", () => {
    const config = canonicalBrand();
    const canonicalName = config.colors.palette[0].name;
    config.locales = {
      en: {
        colors: {
          palette: [{ id: "neutral", name: "English locale override" }],
        },
      },
      ar: {
        meta: { documentTitle: "دليل الهوية" },
      },
    };

    const localized = resolveBrand(config, "ar");

    expect(localized.meta.documentTitle).toBe("دليل الهوية");
    expect(localized.colors.palette[0].name).toBe(canonicalName);
  });

  it("rejects an override identity absent from the canonical collection", () => {
    const config = canonicalBrand();
    config.locales = {
      ar: {
        colors: {
          palette: [{ id: "missing-family", name: "مفقود" }],
        },
      },
    };

    const message = thrownMessage(() => resolveBrand(config, "ar"));

    expect(message).toMatch(/unknown/i);
    expect(message).toContain("ar");
    expect(message).toContain("colors.palette");
    expect(message).toContain("missing-family");
  });

  it("rejects duplicate identities in a locale collection", () => {
    const config = canonicalBrand();
    config.locales = {
      ar: {
        typography: {
          weights: [
            { weight: 300, name: "خفيف" },
            { weight: 300, name: "خفيف جدًا" },
          ],
        },
      },
    };

    const message = thrownMessage(() => resolveBrand(config, "ar"));

    expect(message).toMatch(/duplicate/i);
    expect(message).toContain("ar");
    expect(message).toContain("typography.weights");
    expect(message).toContain("300");
  });

  it("rejects duplicate identities in a canonical collection", () => {
    const config = canonicalBrand();
    config.downloads = [
      {
        id: "logo-pack",
        label: "Logo pack",
        href: "/brand/logo-pack.zip",
      },
      {
        id: "logo-pack",
        label: "Alternate logo pack",
        href: "/brand/alternate-logo-pack.zip",
      },
    ];

    const message = thrownMessage(() => resolveBrand(config, "ar"));

    expect(message).toMatch(/duplicate/i);
    expect(message).toContain("downloads");
    expect(message).toContain("logo-pack");
  });
});
