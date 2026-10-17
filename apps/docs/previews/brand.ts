import {
  brandtreeConfigSchema,
  resolveBrand,
  resolveUIStrings,
  type BrandConfig,
} from "brandtree";
import { withBase } from "blume/components/islands/base-path.ts";
import docsConfig from "../brandtree.config";

// Resolve the sample once at the preview's composition boundary. Components
// receive props, just as they do in a generated Brandtree content page.
export const demoConfig = brandtreeConfigSchema.parse(docsConfig);
const brand = resolveBrand(demoConfig.brand, "en", demoConfig.i18n);
const artwork = (value: BrandConfig["logo"]["logotype"]) => ({
  ...value,
  onLight: withBase(value.onLight),
  onDark: withBase(value.onDark),
});
export const demoBrand = {
  ...brand,
  logo: {
    ...brand.logo,
    logotype: artwork(brand.logo.logotype),
    brandmark: artwork(brand.logo.brandmark),
  },
  downloads: brand.downloads?.map((item) => ({
    ...item,
    href: withBase(item.href),
  })),
};
export const demoUI = resolveUIStrings("en", { defaultLocale: "en" });
