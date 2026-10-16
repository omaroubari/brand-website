export const demos = [
  {
    slug: "block",
    name: "Block",
  },
  {
    slug: "callout",
    name: "Callout",
  },
  {
    slug: "figure",
    name: "Figure",
  },
  {
    slug: "grid",
    name: "Grid",
  },
  {
    slug: "panel",
    name: "Panel",
  },
  {
    slug: "spec-list",
    name: "SpecList",
  },
  {
    slug: "statement",
    name: "Statement",
  },
  {
    slug: "color-palette",
    name: "ColorPalette",
  },
  {
    slug: "color-scale",
    name: "ColorScale",
  },
  {
    slug: "color-swatch",
    name: "ColorSwatch",
  },
  {
    slug: "construction-grid",
    name: "ConstructionGrid",
  },
  {
    slug: "contrast-matrix",
    name: "ContrastMatrix",
  },
  {
    slug: "downloads",
    name: "Downloads",
  },
  {
    slug: "font-weights",
    name: "FontWeights",
  },
  {
    slug: "glyphs",
    name: "Glyphs",
  },
  {
    slug: "icon-grid",
    name: "IconGrid",
  },
  {
    slug: "layout-grid",
    name: "LayoutGrid",
  },
  {
    slug: "logo",
    name: "Logo",
  },
  {
    slug: "logo-clearspace",
    name: "LogoClearspace",
  },
  {
    slug: "logo-colorways",
    name: "LogoColorways",
  },
  {
    slug: "logo-misuse",
    name: "LogoMisuse",
  },
  {
    slug: "logo-scaling",
    name: "LogoScaling",
  },
  {
    slug: "persona-card",
    name: "PersonaCard",
  },
  {
    slug: "photo-grid",
    name: "PhotoGrid",
  },
  {
    slug: "tone-sliders",
    name: "ToneSliders",
  },
  {
    slug: "type-scale",
    name: "TypeScale",
  },
  {
    slug: "type-specimen",
    name: "TypeSpecimen",
  },
  {
    slug: "value-grid",
    name: "ValueGrid",
  },
] as const;

export type DemoName = (typeof demos)[number]["slug"];
