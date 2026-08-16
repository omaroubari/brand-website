import { defineBrand } from "./types";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE ONE FILE YOU EDIT PER CLIENT.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Everything structured — palette, type scale, logo artwork, contact details —
 * lives here. Prose lives in `src/content/sections/*.mdx`.
 *
 * The values below are the sample brand the template ships with. Replace them,
 * drop new artwork into `public/brand/`, and rewrite the MDX sections.
 * See README.md for the full checklist.
 */
export const brand = defineBrand({
  meta: {
    name: "Valence",
    legalName: "Studio Valence Design",
    tagline: "Web Design Studio",
    documentTitle: "Brand Guidelines",
    version: "1.0",
    year: 2026,
    url: "https://brand.example.com",
    description:
      "The brand guidelines for Studio Valence — logo usage, colour, typography and application rules.",
  },

  /**
   * The palette. `id` is referenced by `theme` below and becomes `--color-{id}`,
   * so keep ids stable even when names and hexes change.
   */
  palette: [
    {
      id: "black",
      name: "Black",
      hex: "#000000",
      cmyk: [100, 100, 100, 100],
      usage: "Primary type, backgrounds, the logotype on light surfaces.",
      tints: true,
      span: 1,
      rows: 2,
    },
    {
      id: "white",
      name: "White",
      hex: "#ffffff",
      cmyk: [0, 0, 0, 0],
      usage: "Primary surface. The logotype reverses to white on dark.",
    },
    {
      id: "accent",
      name: "Orange/Red",
      hex: "#ef3800",
      cmyk: [0, 87, 100, 0],
      usage:
        "One accent, used sparingly: calls to action, headers, highlights.",
      tints: true,
    },
    {
      id: "graphite",
      name: "Dark Grey",
      hex: "#494e54",
      cmyk: [67, 54, 47, 43],
      usage: "Secondary surface and quiet type on light backgrounds.",
      tints: true,
    },
    {
      id: "iron",
      name: "Iron",
      hex: "#dbdee3",
      cmyk: [17, 11, 7, 0],
      usage: "Hairlines, dividers, disabled states, subtle fills.",
      tints: true,
    },
  ],

  /** Complete shadcn semantic roles → palette ids. */
  theme: {
    default: "system",
    light: {
      background: "white",
      foreground: "black",
      card: "white",
      cardForeground: "black",
      popover: "white",
      popoverForeground: "black",
      primary: "accent",
      primaryForeground: "white",
      secondary: "iron",
      secondaryForeground: "black",
      muted: "iron",
      mutedForeground: "graphite",
      accent: "accent",
      accentForeground: "white",
      destructive: "accent",
      destructiveForeground: "white",
      border: "iron",
      input: "iron",
      ring: "accent",
      chart1: "accent",
      chart2: "graphite",
      chart3: "iron",
      chart4: "black",
      chart5: "white",
      sidebar: "white",
      sidebarForeground: "black",
      sidebarPrimary: "accent",
      sidebarPrimaryForeground: "white",
      sidebarAccent: "iron",
      sidebarAccentForeground: "black",
      sidebarBorder: "iron",
      sidebarRing: "accent",
    },
    dark: {
      background: "black",
      foreground: "white",
      card: "graphite",
      cardForeground: "white",
      popover: "graphite",
      popoverForeground: "white",
      primary: "accent",
      primaryForeground: "white",
      secondary: "graphite",
      secondaryForeground: "white",
      muted: "graphite",
      mutedForeground: "iron",
      accent: "accent",
      accentForeground: "white",
      destructive: "accent",
      destructiveForeground: "white",
      border: "graphite",
      input: "graphite",
      ring: "accent",
      chart1: "accent",
      chart2: "iron",
      chart3: "graphite",
      chart4: "white",
      chart5: "black",
      sidebar: "black",
      sidebarForeground: "white",
      sidebarPrimary: "accent",
      sidebarPrimaryForeground: "white",
      sidebarAccent: "accent",
      sidebarAccentForeground: "white",
      sidebarBorder: "graphite",
      sidebarRing: "accent",
    },
  },

  typography: {
    // These point at `cssVariable`s declared in the `fonts` block of astro.config.ts.
    display: "var(--font-brand)",
    text: "var(--font-brand)",
    mono: "ui-monospace, SFMono-Regular, Menlo, monospace",

    families: [
      {
        label: "display",
        name: "Inter",
        note: "Swap in the licensed brand face via the fonts block in astro.config.ts. Ships as Inter (SIL Open Font License) so the template runs out of the box.",
      },
      {
        label: "text",
        name: "Inter",
        note: "Same family as display in the default setup — add a second entry in astro.config.ts to split them.",
      },
    ],

    weights: [
      { name: "Light", weight: 300 },
      { name: "Regular", weight: 400 },
      { name: "Medium", weight: 500 },
      { name: "Semibold", weight: 600 },
      { name: "Bold", weight: 700 },
      { name: "Heavy", weight: 800 },
    ],

    /**
     * The published scale. `size`/`lineHeight` are what the website renders;
     * `print` reproduces the original document spec next to each step.
     */
    scale: [
      {
        name: "Display 1.0",
        role: "Covers and section openers. One per page, never in a paragraph.",
        font: "display",
        weight: 500,
        size: "clamp(4rem, 15.5vw, 15rem)",
        lineHeight: "0.86",
        tracking: "-0.035em",
        print: { size: "310 pt", leading: "290 pt", tracking: "6%" },
        sample: "Progress",
      },
      {
        name: "Display 2.0",
        role: "Statement headlines inside a section.",
        font: "display",
        weight: 500,
        size: "clamp(2.75rem, 8vw, 7.5rem)",
        lineHeight: "0.94",
        tracking: "-0.03em",
        print: { size: "155 pt", leading: "150 pt", tracking: "6%" },
        sample: "Crafting strategic visual brand identities",
      },
      {
        name: "Heading 1.0",
        role: "Page and block titles.",
        font: "display",
        weight: 500,
        size: "clamp(1.875rem, 3.9vw, 3.5rem)",
        lineHeight: "1",
        tracking: "-0.028em",
        print: { size: "75 pt", leading: "75 pt", tracking: "6%" },
        sample:
          "Through collaborative thinking we help our clients to clarify and grow their brand.",
      },
      {
        name: "Heading 2.0",
        role: "Sub-heads and pull quotes.",
        font: "display",
        weight: 500,
        size: "clamp(1.25rem, 2.1vw, 1.875rem)",
        lineHeight: "1.1",
        tracking: "-0.02em",
        print: { size: "36 pt", leading: "42 pt", tracking: "6%" },
        sample: "Simple",
      },
      {
        name: "Heading 3.0",
        role: "Labels above a block of copy.",
        font: "text",
        weight: 500,
        size: "0.9375rem",
        lineHeight: "1.25",
        tracking: "0",
        print: { size: "18 pt", leading: "21.6 pt", tracking: "0%" },
      },
      {
        name: "Body 1.0",
        role: "Statement paragraphs — the one big block of copy on a page.",
        font: "text",
        weight: 300,
        size: "clamp(1.5rem, 3.4vw, 3rem)",
        lineHeight: "1.14",
        tracking: "-0.02em",
        print: { size: "18 pt", leading: "21.6 pt", tracking: "0%" },
      },
      {
        name: "Body 2.0",
        role: "Default running text. Small by design — this is a reference document.",
        font: "text",
        weight: 300,
        size: "0.8125rem",
        lineHeight: "1.45",
        tracking: "0",
        print: { size: "14 pt", leading: "21.6 pt", tracking: "0%" },
      },
      {
        name: "Caption",
        role: "Footnotes, captions, specimen labels, the running foot.",
        font: "text",
        weight: 400,
        size: "0.75rem",
        lineHeight: "1.4",
        tracking: "0.005em",
        print: { size: "10 pt", leading: "14 pt", tracking: "0%" },
      },
      {
        name: "Call to action",
        role: "Buttons and links that must be pressed.",
        font: "display",
        weight: 600,
        size: "1.125rem",
        lineHeight: "1",
        tracking: "-0.01em",
        print: { size: "36 pt", leading: "36 pt", tracking: "6%" },
        sample: "Learn more",
      },
    ],
  },

  logo: {
    logotype: {
      onLight: "/brand/logotype-dark.svg",
      onDark: "/brand/logotype-light.svg",
      aspect: 1200 / 260,
    },
    brandmark: {
      onLight: "/brand/brandmark-dark.svg",
      onDark: "/brand/brandmark-light.svg",
      aspect: 1,
    },
    favicon: "/favicon.svg",
    pronunciation: "VAY • luhns",
    clearspace: {
      unit: "the height of the lowercase “e”",
      ratio: 0.34,
    },
    minSize: {
      digital: "96 px wide",
      print: "20 mm wide",
    },
    /** Approved pairings, by palette id. Order matters — first is primary. */
    colorways: [
      { fg: "white", bg: "black", label: "Primary" },
      { fg: "black", bg: "white", label: "Primary reversed" },
      { fg: "black", bg: "accent" },
      { fg: "white", bg: "accent" },
      { fg: "white", bg: "graphite" },
      { fg: "black", bg: "iron" },
    ],
  },

  contact: {
    email: "omar@byvalence.com",
    website: "www.byvalence.com",
    socials: [
      {
        label: "Instagram",
        handle: "@byvalence",
        url: "https://instagram.com/byvalence",
      },
      {
        label: "Behance",
        handle: "@byvalence",
        url: "https://behance.net/byvalence",
      },
    ],
  },

  /** Shown on the home page. Drop the real files into `public/brand/`. */
  downloads: [
    {
      label: "Logo pack",
      href: "/brand/logotype-dark.svg",
      format: "SVG",
      note: "Logotype and brandmark, all approved colourways.",
    },
    {
      label: "This document",
      href: "/",
      format: "PDF",
      note: "Replace with an exported PDF of the guidelines.",
    },
  ],

  numbering: true,
});

export type Brand = typeof brand;
export default brand;
