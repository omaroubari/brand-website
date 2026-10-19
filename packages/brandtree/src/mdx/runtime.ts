import type { BrandConfig } from "../brand/schema.ts";
import type { UIStrings } from "../core/i18n-ui.ts";

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

/** Per-render alternatives; keys are component identities, so aliases work. */
export type MdxRenderers = ReadonlyMap<object, object>;
export interface MdxRenderContext extends Partial<BrandtreeBaseComponentProps> {
  componentRenderers?: MdxRenderers;
}

/** @internal Select an alternative without storing request state globally. */
export function resolveMdxComponent(
  component: unknown,
  context: MdxRenderContext,
): unknown {
  if (
    (typeof component !== "function" && typeof component !== "object") ||
    component === null
  )
    return component;
  return context.componentRenderers?.get(component) ?? component;
}

/** @internal Evaluate component getters and authored props exactly once. */
export function renderMdxComponent(
  runtime: (
    component: unknown,
    props: Record<string, unknown>,
    ...args: unknown[]
  ) => unknown,
  component: unknown,
  authorProps: Record<string, unknown>,
  context: MdxRenderContext,
  ...args: unknown[]
): unknown {
  return runtime(
    resolveMdxComponent(component, context),
    injectMdxProps(component, authorProps, context),
    ...args,
  );
}
