/**
 * Barrel for everything usable inside `src/content/brand-guidelines/*.mdx`.
 *
 * One import line per section file:
 *
 *   import { Block, ColorPalette, TypeScale } from '../../components/mdx';
 */

export { default as Block } from "./content/Block.astro";
export { default as Callout } from "./content/Callout.astro";
export { default as Figure } from "./content/Figure.astro";
export { default as Grid } from "./content/Grid.astro";
export { default as Panel } from "./content/Panel.astro";
export { default as SpecList } from "./content/SpecList.astro";
export { default as Statement } from "./content/Statement.astro";

export { default as ColorPalette } from "@/components/brand/ColorPalette.astro";
export { default as ColorScale } from "@/components/brand/ColorScale.astro";
export { default as ColorSwatch } from "@/components/brand/ColorSwatch.astro";
export { default as ConstructionGrid } from "@/components/brand/ConstructionGrid.astro";
export { default as ContrastMatrix } from "@/components/brand/ContrastMatrix.astro";
export { default as Downloads } from "@/components/brand/Downloads.astro";
export { default as FontWeights } from "@/components/brand/FontWeights.astro";
export { default as Glyphs } from "@/components/brand/Glyphs.astro";
export { default as IconGrid } from "@/components/brand/IconGrid.astro";
export { default as LayoutGrid } from "@/components/brand/LayoutGrid.astro";
export { default as Logo } from "@/components/brand/Logo.astro";
export { default as LogoClearspace } from "@/components/brand/LogoClearspace.astro";
export { default as LogoColorways } from "@/components/brand/LogoColorways.astro";
export { default as LogoMisuse } from "@/components/brand/LogoMisuse.astro";
export { default as LogoScaling } from "@/components/brand/LogoScaling.astro";
export { default as PersonaCard } from "@/components/brand/PersonaCard.astro";
export { default as PhotoGrid } from "@/components/brand/PhotoGrid.astro";
export { default as ToneSliders } from "@/components/brand/ToneSliders.astro";
export { default as TypeScale } from "@/components/brand/TypeScale.astro";
export { default as TypeSpecimen } from "@/components/brand/TypeSpecimen.astro";
export { default as ValueGrid } from "@/components/brand/ValueGrid.astro";
