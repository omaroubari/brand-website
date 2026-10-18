/** Built-ins supplied centrally to MDX. */
import { registerMdxComponent } from "../core/mdx.ts";

import Block from "./content/Block.astro";
import Callout from "./content/Callout.astro";
import Figure from "./content/Figure.astro";
import Grid from "./content/Grid.astro";
import Panel from "./content/Panel.astro";
import SpecList from "./content/SpecList.astro";
import Statement from "./content/Statement.astro";
import ColorPalette from "./brand/ColorPalette.astro";
import ColorScale from "./brand/ColorScale.astro";
import ColorSwatch from "./brand/ColorSwatch.astro";
import ConstructionGrid from "./brand/ConstructionGrid.astro";
import ContrastMatrix from "./brand/ContrastMatrix.astro";
import Downloads from "./brand/Downloads.astro";
import FontWeights from "./brand/FontWeights.astro";
import Glyphs from "./brand/Glyphs.astro";
import IconGrid from "./brand/IconGrid.astro";
import LayoutGrid from "./brand/LayoutGrid.astro";
import Logo from "./brand/Logo.astro";
import LogoClearspace from "./brand/LogoClearspace.astro";
import LogoColorways from "./brand/LogoColorways.astro";
import LogoMisuse from "./brand/LogoMisuse.astro";
import LogoScaling from "./brand/LogoScaling.astro";
import PersonaCard from "./brand/PersonaCard.astro";
import PhotoGrid from "./brand/PhotoGrid.astro";
import ToneSliders from "./brand/ToneSliders.astro";
import TypeScale from "./brand/TypeScale.astro";
import TypeSpecimen from "./brand/TypeSpecimen.astro";
import ValueGrid from "./brand/ValueGrid.astro";

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
