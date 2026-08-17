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
      popover: "black",
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
     * The published digital scale. `size`/`lineHeight` are what the website renders;
     * optional `print` values can reproduce a separate print specification.
     */
    scale: [
      {
        name: "Display+",
        role: "The largest expressive style. Use for covers and hero moments.",
        font: "display",
        weight: 600,
        size: "clamp(3rem, 8vw, 5rem)",
        lineHeight: "1",
        tracking: "-0.04em",
        sample: "Progress",
      },
      {
        name: "Display 1",
        role: "Large headlines for page and section openers.",
        font: "display",
        weight: 600,
        size: "clamp(2.25rem, 5vw, 2.875rem)",
        lineHeight: "1.22",
        tracking: "-0.02em",
        sample: "Make it matter",
      },
      {
        name: "Display 2",
        role: "Statement headlines inside a section.",
        font: "display",
        weight: 600,
        size: "clamp(2rem, 4vw, 2.25rem)",
        lineHeight: "1.28",
        tracking: "-0.02em",
        sample: "Crafting strategic visual brand identities",
      },
      {
        name: "Display 3",
        role: "Short headlines and compact display moments.",
        font: "display",
        weight: 600,
        size: "1.875rem",
        lineHeight: "1.33",
        tracking: "-0.02em",
        sample: "Things people love",
      },
      {
        name: "Title 1",
        role: "Page titles and major block headings.",
        font: "display",
        weight: 600,
        size: "clamp(1.25rem, 2.1vw, 1.5rem)",
        lineHeight: "1.33",
        tracking: "0",
        sample: "A clear point of view",
      },
      {
        name: "Title 2",
        role: "Section headings, notices, and supporting titles.",
        font: "display",
        weight: 600,
        size: "clamp(1.125rem, 1.6vw, 1.25rem)",
        lineHeight: "1.4",
        tracking: "0",
        sample: "Built for clarity",
      },
      {
        name: "Title 3",
        role: "Small headings, navigation titles, and compact blocks.",
        font: "display",
        weight: 500,
        size: "1rem",
        lineHeight: "1.5",
        tracking: "0",
        sample: "Start here",
      },
      {
        name: "Subtitle 1",
        role: "Larger supporting copy beneath a title.",
        font: "text",
        weight: 400,
        size: "clamp(1.125rem, 1.6vw, 1.25rem)",
        lineHeight: "1.4",
        tracking: "0",
        sample: "A considered system for every touchpoint.",
      },
      {
        name: "Subtitle 2",
        role: "Supporting copy for section titles and introductions.",
        font: "text",
        weight: 400,
        size: "1rem",
        lineHeight: "1.5",
        tracking: "0",
        sample: "The details add up to a coherent whole.",
      },
      {
        name: "Body",
        role: "Default running text and short descriptions.",
        font: "text",
        weight: 400,
        size: "0.875rem",
        lineHeight: "1.43",
        tracking: "0",
        sample: "A useful system makes the right choice feel obvious.",
      },
      {
        name: "Body bold",
        role: "Emphasis within body copy and compact labels.",
        font: "text",
        weight: 600,
        size: "0.875rem",
        lineHeight: "1.43",
        tracking: "0",
        sample: "A useful system makes the right choice feel obvious.",
      },
      {
        name: "Caption",
        role: "Footnotes, captions, legal copy, and the running foot.",
        font: "text",
        weight: 400,
        size: "0.75rem",
        lineHeight: "1.33",
        tracking: "0",
        sample: "For reference only.",
      },
      {
        name: "Caption bold",
        role: "Emphasised captions and compact metadata.",
        font: "text",
        weight: 600,
        size: "0.75rem",
        lineHeight: "1.33",
        tracking: "0",
        sample: "Updated August 2026",
      },
      {
        name: "Signal 1",
        role: "Short uppercase statuses, tags, and signal components.",
        font: "text",
        weight: 400,
        size: "0.875rem",
        lineHeight: "1.43",
        tracking: "0.05em",
        transform: "uppercase",
        sample: "Authenticity guarantee",
      },
      {
        name: "Signal 2",
        role: "The smallest uppercase signal for compact UI labels.",
        font: "text",
        weight: 600,
        size: "0.625rem",
        lineHeight: "1.2",
        tracking: "0.05em",
        transform: "uppercase",
        sample: "New",
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
