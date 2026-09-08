import { describe, expect, expectTypeOf, it } from "vitest";
import { brand } from "../brand/config";
import type { BrandConfig } from "../brand/types";
import {
  defaultLocale,
  getDirection,
  getUi,
  localeInfo,
  resolveBrand,
  supportedLocales,
  type Locale,
} from "./index";

function canonicalBrand(): BrandConfig {
  const config = structuredClone(brand) as BrandConfig;
  config.locales = undefined;
  return config;
}

describe("resolveBrand", () => {
  it("derives locale metadata and switcher order from brand.i18n", () => {
    expectTypeOf<Locale>().toEqualTypeOf<"en" | "ar">();
    expect(supportedLocales).toEqual(["en", "ar"]);
    expect(defaultLocale).toBe("en");
    expect(localeInfo.en).toMatchObject({
      code: "en",
      label: "English",
      dir: "ltr",
    });
    expect(localeInfo.ar).toMatchObject({
      code: "ar",
      label: "العربية",
      dir: "rtl",
    });
    expect(getDirection("ar")).toBe("rtl");
  });

  it("resolves built-in UI copy by exact locale, base language, then English", () => {
    expect(getUi("ar").languageSwitcher.label).toBe("اللغة");
    expect(getUi("ar-SA").languageSwitcher.label).toBe("اللغة");
    expect(getUi("AR-sa").languageSwitcher.label).toBe("اللغة");
    expect(getUi("fr-CA").languageSwitcher.label).toBe("Language");
    expect(getUi("__proto__").languageSwitcher.label).toBe("Language");
  });

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
});
