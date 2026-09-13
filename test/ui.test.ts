import { describe, expect, expectTypeOf, it } from "vitest";

import {
  EN_UI,
  resolveUIStrings,
  UI_PACKS,
  uiStringsOverrideSchema,
  uiStringsSchema,
  type UIStrings,
} from "../src/lib/core/i18n-ui";

describe("template UI language packs", () => {
  it("derives a fully populated English baseline from nested schema defaults", () => {
    expect(uiStringsSchema.parse({})).toEqual(EN_UI);

    const groups = Object.entries(EN_UI);
    expect(groups.length).toBeGreaterThan(0);
    for (const [group, values] of groups) {
      expect(Object.keys(values), `${group} is empty`).not.toHaveLength(0);
      for (const [key, value] of Object.entries(values)) {
        expect(value.trim(), `${group}.${key} is blank`).not.toBe("");
      }
    }
  });

  it("resolves Arabic while retaining English for omitted leaves", () => {
    const resolved = resolveUIStrings("ar", { defaultLocale: "en" });

    expect(resolved.languageSwitcher.label).toBe("اللغة");
    expect(resolved.page.next).toBe("التالي");
    expect(resolved.color.pantone).toBe(EN_UI.color.pantone);
    expectTypeOf(resolved).toEqualTypeOf<UIStrings>();
  });

  it.each(["ar-SA", "AR-sa"])(
    "resolves %s through the Arabic base-language pack",
    (locale) => {
      expect(
        resolveUIStrings(locale, { defaultLocale: "en" }).page.previous,
      ).toBe("السابق");
    },
  );

  it("falls back through the configured default-locale pack, then English", () => {
    const resolved = resolveUIStrings("fr-CA", { defaultLocale: "ar" });

    expect(resolved.nav.contents).toBe("المحتويات");
    expect(resolved.color.pantone).toBe(EN_UI.color.pantone);
  });

  it("ships only known groups, keys, and nonblank string values", () => {
    for (const [locale, pack] of Object.entries(UI_PACKS)) {
      expect(
        uiStringsOverrideSchema.safeParse(pack),
        `${locale} contains an unknown UI group or key`,
      ).toMatchObject({ success: true });

      for (const [group, values] of Object.entries(pack)) {
        for (const [key, value] of Object.entries(values ?? {})) {
          expect(
            typeof value,
            `${locale}.${group}.${key} is not a string`,
          ).toBe("string");
          expect(
            String(value).trim(),
            `${locale}.${group}.${key} is blank`,
          ).not.toBe("");
        }
      }
    }
  });

  it("preserves placeholders in translated templates", () => {
    for (const placeholder of ["{unit}", "{mark}"]) {
      expect(EN_UI.logo.clearspaceInstruction).toContain(placeholder);
      for (const [locale, pack] of Object.entries(UI_PACKS)) {
        const template = pack.logo?.clearspaceInstruction;
        if (template) {
          expect(template, `${locale} is missing ${placeholder}`).toContain(
            placeholder,
          );
        }
      }
    }
  });

  it("keeps sparse packs sparse and rejects unknown groups and keys", () => {
    expect(
      uiStringsOverrideSchema.parse({ nav: { contents: "Contents" } }),
    ).toEqual({ nav: { contents: "Contents" } });
    expect(
      uiStringsOverrideSchema.safeParse({ unknown: { label: "Unknown" } })
        .success,
    ).toBe(false);
    expect(
      uiStringsOverrideSchema.safeParse({ nav: { unknown: "Unknown" } })
        .success,
    ).toBe(false);
  });
});
