/** Built-ins supplied centrally to MDX. */
import { registerMdxComponent } from "../mdx/runtime.ts";

import Block from "./content/Block.astro";
import Callout from "./content/Callout.astro";
import Figure from "./content/Figure.astro";
import Grid from "./content/Grid.astro";
import Panel from "./content/Panel.astro";
import SpecList from "./content/SpecList.astro";
import Statement from "./content/Statement.astro";
import ColorPalette from "./content/ColorPalette.astro";
import ColorScale from "./content/ColorScale.astro";
import ColorSwatch from "./content/ColorSwatch.astro";
import ConstructionGrid from "./content/ConstructionGrid.astro";
import ContrastMatrix from "./content/ContrastMatrix.astro";
import Downloads from "./content/Downloads.astro";
import FontWeights from "./content/FontWeights.astro";
import Glyphs from "./content/Glyphs.astro";
import IconGrid from "./content/IconGrid.astro";
import LayoutGrid from "./content/LayoutGrid.astro";
import Logo from "./content/Logo.astro";
import LogoClearspace from "./content/LogoClearspace.astro";
import LogoColorways from "./content/LogoColorways.astro";
import LogoMisuse from "./content/LogoMisuse.astro";
import LogoScaling from "./content/LogoScaling.astro";
import PersonaCard from "./content/PersonaCard.astro";
import PhotoGrid from "./content/PhotoGrid.astro";
import ToneSliders from "./content/ToneSliders.astro";
import TypeScale from "./content/TypeScale.astro";
import TypeSpecimen from "./content/TypeSpecimen.astro";
import ValueGrid from "./content/ValueGrid.astro";

// Register identity only; every built-in receives brand, ui, and dir.
registerMdxComponent(Block);
registerMdxComponent(Callout);
registerMdxComponent(Figure);
registerMdxComponent(Grid);
registerMdxComponent(Panel);
registerMdxComponent(SpecList);
registerMdxComponent(Statement);
registerMdxComponent(ColorPalette);
registerMdxComponent(ColorScale);
registerMdxComponent(ColorSwatch);
registerMdxComponent(ConstructionGrid);
registerMdxComponent(ContrastMatrix);
registerMdxComponent(Downloads);
registerMdxComponent(FontWeights);
registerMdxComponent(Glyphs);
registerMdxComponent(IconGrid);
registerMdxComponent(LayoutGrid);
registerMdxComponent(Logo);
registerMdxComponent(LogoClearspace);
registerMdxComponent(LogoColorways);
registerMdxComponent(LogoMisuse);
registerMdxComponent(LogoScaling);
registerMdxComponent(PersonaCard);
registerMdxComponent(PhotoGrid);
registerMdxComponent(ToneSliders);
registerMdxComponent(TypeScale);
registerMdxComponent(TypeSpecimen);
registerMdxComponent(ValueGrid);

export {
  Block,
  Callout,
  Figure,
  Grid,
  Panel,
  SpecList,
  Statement,
  ColorPalette,
  ColorScale,
  ColorSwatch,
  ConstructionGrid,
  ContrastMatrix,
  Downloads,
  FontWeights,
  Glyphs,
  IconGrid,
  LayoutGrid,
  Logo,
  LogoClearspace,
  LogoColorways,
  LogoMisuse,
  LogoScaling,
  PersonaCard,
  PhotoGrid,
  ToneSliders,
  TypeScale,
  TypeSpecimen,
  ValueGrid,
};

export type * from "./props.ts";
export type { BrandtreeBaseComponentProps } from "./base-props.ts";
