import { describe, expect, it } from "vitest";
import {
  localeCodes,
  localeDir,
  localePlacement,
  localeTargetPath,
  localizeRoute,
  resolveFallbackLocale,
} from "../src/core/i18n";
import type { ResolvedI18nConfig } from "../src/core/schema";

const i18n: ResolvedI18nConfig = {
  defaultLocale: "en",
  fallbackLocale: "en",
  hideDefaultLocalePrefix: false,
  parser: "dir",
  locales: [
    { code: "en", label: "English", dir: "ltr" },
    { code: "ar", label: "العربية", dir: "rtl" },
  ],
};

describe("core i18n helpers", () => {
  it("derives locale codes and direction from the supplied config", () => {
    expect([...localeCodes(i18n)]).toEqual(["en", "ar"]);
    expect(localeDir("AR", i18n)).toBe("rtl");
    expect(localeDir("fr", i18n)).toBe("ltr");
  });

  it("localizes routes", () => {
    expect(localizeRoute("/guides/start", "ar", i18n)).toBe("/ar/guides/start");
  });

  it("resolves locale placement and inverse target paths", () => {
    expect(localePlacement("ar/guides/start.mdx", ".mdx", i18n)).toEqual({
      locales: ["ar"],
      navPath: "guides/start.mdx",
    });
    expect(localeTargetPath("guides/start.mdx", ".mdx", "ar", i18n)).toBe(
      "ar/guides/start.mdx",
    );
  });

  it("supports a disabled fallback locale", () => {
    expect(resolveFallbackLocale({ ...i18n, fallbackLocale: null })).toBe(null);
    expect(resolveFallbackLocale({ ...i18n, fallbackLocale: undefined })).toBe(
      "en",
    );
  });
});
