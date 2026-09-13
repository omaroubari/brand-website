import { describe, expect, it } from "vitest";
import { brand, config as siteConfig } from "../src/brand/config";
import { resolveBrand } from "../src/brand/localize";
import type { BrandConfig } from "../src/brand/schema";

const i18n = siteConfig.i18n;

function canonicalBrand(): BrandConfig {
  const config = structuredClone(brand) as BrandConfig;
  config.localeOverrides = undefined;
  return config;
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

    config.localeOverrides = {
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

    const localized = resolveBrand(config, "AR", i18n);

    expect(localized.colors.palette.map(({ id }) => id)).toEqual(
      canonicalPaletteIds,
    );
    expect(localized.colors.palette.map(({ name }) => name)).toEqual([
      "محايد",
      "برتقالي",
    ]);
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
    expect(localized.typography.weights.map(({ weight }) => weight)).toEqual(
      canonicalWeightValues,
    );
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

  it("resolves only the requested locale and does not mutate the source", () => {
    const config = canonicalBrand();
    const canonicalName = config.colors.palette[0].name;
    config.localeOverrides = {
      en: {
        colors: {
          palette: [{ id: "neutral", name: "English locale override" }],
        },
      },
      ar: { meta: { documentTitle: "دليل الهوية" } },
    };

    const localized = resolveBrand(config, "ar", i18n);

    expect(localized.meta.documentTitle).toBe("دليل الهوية");
    expect(localized.colors.palette[0].name).toBe(canonicalName);
    expect(config.colors.palette[0].name).toBe(canonicalName);
  });
});
