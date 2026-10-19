import * as builtin from "../components/index.ts";
import type { MdxRenderers } from "../mdx/runtime.ts";
import ColorPalette from "./components/ColorPalette.astro";
import ColorScale from "./components/ColorScale.astro";
import ColorSwatch from "./components/ColorSwatch.astro";
import ContrastMatrix from "./components/ContrastMatrix.astro";
import TypeScale from "./components/TypeScale.astro";
import Callout from "./components/Callout.astro";
import Logo from "./components/Logo.astro";
import LogoClearspace from "./components/LogoClearspace.astro";
import LogoColorways from "./components/LogoColorways.astro";
import LogoScaling from "./components/LogoScaling.astro";
import ConstructionGrid from "./components/ConstructionGrid.astro";
import LayoutGrid from "./components/LayoutGrid.astro";
import ToneSliders from "./components/ToneSliders.astro";

import FontWeights from "./components/FontWeights.astro";
import ValueGrid from "./components/ValueGrid.astro";
import SpecList from "./components/SpecList.astro";
import Downloads from "./components/Downloads.astro";
import IconGrid from "./components/IconGrid.astro";
import TypeSpecimen from "./components/TypeSpecimen.astro";

// Components with meaningful semantic HTML can use their existing renderer.
// Requiring every key makes new built-ins an explicit Markdown design decision.
const alternatives = {
  Block: builtin.Block,
  Figure: builtin.Figure,
  Grid: builtin.Grid,
  Panel: builtin.Panel,
  SpecList,
  Statement: builtin.Statement,
  Downloads,
  FontWeights,
  Glyphs: builtin.Glyphs,
  IconGrid,
  LogoMisuse: builtin.LogoMisuse,
  PersonaCard: builtin.PersonaCard,
  PhotoGrid: builtin.PhotoGrid,
  TypeSpecimen,
  ValueGrid,
  ColorPalette,
  ColorScale,
  ColorSwatch,
  ContrastMatrix,
  TypeScale,
  Callout,
  Logo,
  LogoClearspace,
  LogoColorways,
  LogoScaling,
  ConstructionGrid,
  LayoutGrid,
  ToneSliders,
} satisfies Record<keyof typeof builtin, object>;

/** Custom alternatives receive the same authored props as their originals. */
export function createMarkdownRenderers(
  overrides: MdxRenderers = new Map(),
): MdxRenderers {
  return new Map<object, object>([
    ...Object.entries(builtin).map(
      ([name, component]) =>
        [component, alternatives[name as keyof typeof builtin]] as [
          object,
          object,
        ],
    ),
    ...overrides,
  ]);
}
