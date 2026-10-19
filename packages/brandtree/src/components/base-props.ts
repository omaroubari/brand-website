import type { BrandConfig } from "../brand/schema.ts";
import type { UIStrings } from "../core/i18n-ui.ts";

/** Values resolved by the route, never by an implementation component. */
export interface BrandtreeBaseComponentProps {
  brand: BrandConfig;
  ui: UIStrings;
  dir: "ltr" | "rtl";
}
