import type { BrandConfig } from "../brand/schema.ts";
import type { UIStrings } from "./i18n-ui.ts";

/** Values resolved by the route, never by an implementation component. */
export interface BrandtreeBaseComponentProps {
  brand: BrandConfig;
  ui: UIStrings;
  dir: "ltr" | "rtl";
}
// Track built-in identities only, never page values or per-component prop lists.
const builtins = new WeakSet<object>();

/** @internal Register a built-in without changing the exported component. */
export function registerMdxComponent(component: object): void {
  builtins.add(component);
}

/** @internal Called by generated MDX; author props always take precedence. */
export function injectMdxProps(
  component: unknown,
  authorProps: Record<string, unknown>,
  context: Partial<BrandtreeBaseComponentProps>,
): Record<string, unknown> {
  if (
    (typeof component !== "function" && typeof component !== "object") ||
    component === null
  )
    return authorProps;
  if (!builtins.has(component)) return authorProps;
  return {
    brand: context.brand,
    ui: context.ui,
    dir: context.dir,
    ...authorProps,
  };
}
