// Public prop types for Brandtree's built-in components, so users can type their
// overrides and wrappers: `import type { ColorPaletteProps } from "brandtree/components"`.
//
// Each type is derived straight from the component with Astro's `ComponentProps`,
// so it can never drift from the real props. `typeof import(...)` keeps these
// type-only (no runtime import); the file-level disable is because that syntax is
// the only way to reference an `.astro` component's type without a value import.
//
// oxlint-disable typescript/consistent-type-imports
import type { ComponentProps } from "astro/types";

export type BlockProps = ComponentProps<
  typeof import("./content/Block.astro").default
>;

export type CalloutProps = ComponentProps<
  typeof import("./content/Callout.astro").default
>;

export type FigureProps = ComponentProps<
  typeof import("./content/Figure.astro").default
>;

export type GridProps = ComponentProps<
  typeof import("./content/Grid.astro").default
>;

export type PanelProps = ComponentProps<
  typeof import("./content/Panel.astro").default
>;

export type SpecListProps = ComponentProps<
  typeof import("./content/SpecList.astro").default
>;

export type StatementProps = ComponentProps<
  typeof import("./content/Statement.astro").default
>;

export type ColorPaletteProps = ComponentProps<
  typeof import("./content/ColorPalette.astro").default
>;

export type ColorScaleProps = ComponentProps<
  typeof import("./content/ColorScale.astro").default
>;

export type ColorSwatchProps = ComponentProps<
  typeof import("./content/ColorSwatch.astro").default
>;

export type ConstructionGridProps = ComponentProps<
  typeof import("./content/ConstructionGrid.astro").default
>;

export type ContrastMatrixProps = ComponentProps<
  typeof import("./content/ContrastMatrix.astro").default
>;

export type DownloadsProps = ComponentProps<
  typeof import("./content/Downloads.astro").default
>;

export type FontWeightsProps = ComponentProps<
  typeof import("./content/FontWeights.astro").default
>;

export type GlyphsProps = ComponentProps<
  typeof import("./content/Glyphs.astro").default
>;

export type IconGridProps = ComponentProps<
  typeof import("./content/IconGrid.astro").default
>;

export type LayoutGridProps = ComponentProps<
  typeof import("./content/LayoutGrid.astro").default
>;

export type LogoProps = ComponentProps<
  typeof import("./content/Logo.astro").default
>;

export type LogoClearspaceProps = ComponentProps<
  typeof import("./content/LogoClearspace.astro").default
>;

export type LogoColorwaysProps = ComponentProps<
  typeof import("./content/LogoColorways.astro").default
>;

export type LogoMisuseProps = ComponentProps<
  typeof import("./content/LogoMisuse.astro").default
>;

export type LogoScalingProps = ComponentProps<
  typeof import("./content/LogoScaling.astro").default
>;

export type PersonaCardProps = ComponentProps<
  typeof import("./content/PersonaCard.astro").default
>;

export type PhotoGridProps = ComponentProps<
  typeof import("./content/PhotoGrid.astro").default
>;

export type ToneSlidersProps = ComponentProps<
  typeof import("./content/ToneSliders.astro").default
>;

export type TypeScaleProps = ComponentProps<
  typeof import("./content/TypeScale.astro").default
>;

export type TypeSpecimenProps = ComponentProps<
  typeof import("./content/TypeSpecimen.astro").default
>;

export type ValueGridProps = ComponentProps<
  typeof import("./content/ValueGrid.astro").default
>;
