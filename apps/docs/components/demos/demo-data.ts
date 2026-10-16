import {
  brandtreeConfigSchema,
  resolveBrand,
  resolveUIStrings,
} from "brandtree";
import sampleConfig from "../../../web/brandtree.config";
import logotypeDark from "../../../web/public/brand/logotype-dark.svg?url";
import logotypeLight from "../../../web/public/brand/logotype-light.svg?url";
import brandmarkDark from "../../../web/public/brand/brandmark-dark.svg?url";
import brandmarkLight from "../../../web/public/brand/brandmark-light.svg?url";

// Resolve the sample once at the preview's composition boundary. Components
// receive props, just as they do in a generated Brandtree content page.
export const demoConfig = brandtreeConfigSchema.parse(sampleConfig);
const brand = resolveBrand(demoConfig.brand, "en", demoConfig.i18n);
const assets = new Map([
  [brand.logo.logotype.onLight, logotypeDark],
  [brand.logo.logotype.onDark, logotypeLight],
  [brand.logo.brandmark.onLight, brandmarkDark],
  [brand.logo.brandmark.onDark, brandmarkLight],
]);
export const demoBrand = {
  ...brand,
  logo: {
    ...brand.logo,
    logotype: {
      ...brand.logo.logotype,
      onLight: logotypeDark,
      onDark: logotypeLight,
    },
    brandmark: {
      ...brand.logo.brandmark,
      onLight: brandmarkDark,
      onDark: brandmarkLight,
    },
  },
  downloads: brand.downloads?.map((item) => ({
    ...item,
    href: assets.get(item.href) ?? item.href,
  })),
};
export const demoUI = resolveUIStrings("en", { defaultLocale: "en" });
