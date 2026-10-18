import type { BrandScheme } from "../../brand/schema.ts";
import type { BrandtreeConfigInput } from "../../core/schema.ts";

const scheme = (background: string, foreground: string): BrandScheme => ({
  background,
  foreground,
  card: background,
  cardForeground: foreground,
  popover: background,
  popoverForeground: foreground,
  primary: foreground,
  primaryForeground: background,
  secondary: background,
  secondaryForeground: foreground,
  muted: background,
  mutedForeground: foreground,
  accent: foreground,
  accentForeground: background,
  destructive: foreground,
  destructiveForeground: background,
  border: foreground,
  input: foreground,
  ring: foreground,
  chart1: foreground,
  chart2: background,
  chart3: foreground,
  chart4: background,
  chart5: foreground,
  sidebar: background,
  sidebarForeground: foreground,
  sidebarPrimary: foreground,
  sidebarPrimaryForeground: background,
  sidebarAccent: foreground,
  sidebarAccentForeground: background,
  sidebarBorder: foreground,
  sidebarRing: foreground,
});

/** Starter data lives in the generated config, just like a consumer's brand. */
export const starterConfig = (name: string): BrandtreeConfigInput => ({
  // System fonts keep the starter usable without fetching Google fonts.
  fonts: [],
  brand: {
    meta: {
      name,
      documentTitle: "Brand Guidelines",
      version: "1.0",
      year: new Date().getFullYear(),
      url: "https://example.com",
      description: `The brand guidelines for ${name}.`,
    },
    colors: {
      palette: [],
      swatches: [
        { id: "black", name: "Black", color: "black", category: "primary" },
        { id: "white", name: "White", color: "white", category: "primary" },
      ],
    },
    theme: {
      default: "system",
      light: scheme("white", "black"),
      dark: scheme("black", "white"),
    },
    typography: {
      display: "system-ui, sans-serif",
      text: "system-ui, sans-serif",
      mono: "ui-monospace, monospace",
      families: [
        { id: "display", name: "System UI" },
        { id: "text", name: "System UI" },
      ],
      weights: [
        { name: "Regular", weight: 400 },
        { name: "Bold", weight: 700 },
      ],
      scale: [
        {
          id: "heading",
          name: "Heading",
          font: "display",
          weight: 700,
          size: "clamp(2rem, 5vw, 4rem)",
          lineHeight: "1.1",
          tracking: "-0.03em",
          sample: name,
        },
        {
          id: "body",
          name: "Body",
          font: "text",
          weight: 400,
          size: "1rem",
          lineHeight: "1.6",
          tracking: "0em",
        },
      ],
    },
    logo: {
      logotype: {
        onLight: "/brand/placeholder-dark.svg",
        onDark: "/brand/placeholder-light.svg",
        aspect: 1,
      },
      brandmark: {
        onLight: "/brand/placeholder-dark.svg",
        onDark: "/brand/placeholder-light.svg",
        aspect: 1,
      },
      favicon: "/favicon.svg",
      clearspace: { unit: "one quarter of the mark's width", ratio: 0.25 },
      minSize: { digital: "32 px wide", print: "10 mm wide" },
      colorways: [
        { id: "primary", fg: "black", bg: "white", label: "Primary" },
        { id: "reversed", fg: "white", bg: "black", label: "Reversed" },
      ],
    },
    contact: {},
  },
});

export const placeholderLogo = (fill: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="${fill}" d="M10 10h80v80H10zM30 30v40h40V30z" fill-rule="evenodd"/></svg>\n`;

export const starterPages = {
  "01-introduction.mdx": `---
title: Introduction
description: Start here to make these guidelines your own.
---

## Welcome

Edit structured brand data in \`brandtree.config.ts\` and write your guidelines
in \`content/\`. Numbered filenames control navigation order; their URLs omit
the numeric prefix.

Replace the placeholder artwork in \`public/brand/\` and update the logo paths
in your config before publishing. Set your site's URL in \`brand.meta.url\`.
`,
  "02-colour.mdx": `---
title: Colour
description: Our palette and accessible colour combinations.
---

## Palette

<ColorPalette brand={props.brand} ui={props.ui} />

## Contrast

<ContrastMatrix brand={props.brand} ui={props.ui} />
`,
  "03-typography.mdx": `---
title: Typography
description: Type styles and weights.
---

## Type scale

<TypeScale brand={props.brand} ui={props.ui} />

## Weights

<FontWeights brand={props.brand} />
`,
};
