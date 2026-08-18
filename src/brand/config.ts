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
   * The palette. Family ids are stable token prefixes: `neutral-950` becomes
   * `--color-neutral-950`. Values may use Hex or OKLCH; components consume the
   * generated token, never a literal colour value.
   */
  colors: {
    palette: [
      {
        id: "neutral",
        name: "Neutral",
        shades: {
          50: { space: "hex", value: "#fafafa" },
          100: { space: "hex", value: "#f4f4f5" },
          200: { space: "hex", value: "#e4e4e7" },
          300: { space: "hex", value: "#d4d4d8" },
          400: { space: "hex", value: "#a1a1aa" },
          500: { space: "hex", value: "#71717a" },
          600: { space: "hex", value: "#52525b" },
          700: { space: "hex", value: "#3f3f46" },
          800: { space: "hex", value: "#27272a" },
          900: { space: "hex", value: "#18181b" },
          950: { space: "hex", value: "#09090b" },
        },
      },
      {
        id: "orange",
        name: "Orange",
        shades: {
          50: { space: "hex", value: "#fff3ed" },
          100: { space: "hex", value: "#ffe2d5" },
          200: { space: "hex", value: "#ffc2a8" },
          300: { space: "hex", value: "#ff976e" },
          400: { space: "hex", value: "#ff6235" },
          500: { space: "hex", value: "#ef3800" },
          600: { space: "hex", value: "#ca2f00" },
          700: { space: "hex", value: "#a62700" },
          800: { space: "hex", value: "#852200" },
          900: { space: "hex", value: "#6e2100" },
          950: { space: "hex", value: "#3b1000" },
        },
      },
    ],
    swatches: [
      {
        id: "black",
        name: "Black",
        color: "neutral-950",
        cmyk: [18, 18, 0, 96],
        usage: "Primary type, backgrounds, the logotype on light surfaces.",
        category: "primary",
      },
      {
        id: "white",
        name: "White",
        color: "white",
        cmyk: [0, 0, 0, 0],
        usage: "Primary surface. The logotype reverses to white on dark.",
        category: "primary",
      },
      {
        id: "orange-red",
        name: "Orange",
        color: "orange-500",
        cmyk: [0, 77, 100, 6],
        usage:
          "One accent, used sparingly: calls to action, headers, highlights.",
        category: "secondary",
        on: "white"
      },
    ],
  },

  /** Complete shadcn semantic roles → stable palette shade references. */
  theme: {
    default: "system",
    light: {
      background: "white",
      foreground: "black",
      card: "white",
      cardForeground: "black",
      popover: "white",
      popoverForeground: "black",
      primary: "orange-500",
      primaryForeground: "white",
      secondary: "neutral-200",
      secondaryForeground: "black",
      muted: "neutral-200",
      mutedForeground: "neutral-600",
      accent: "orange-500",
      accentForeground: "white",
      destructive: "orange-500",
      destructiveForeground: "white",
      border: "neutral-200",
      input: "neutral-200",
      ring: "orange-500",
      chart1: "orange-500",
      chart2: "neutral-600",
      chart3: "neutral-400",
      chart4: "black",
      chart5: "white",
      sidebar: "white",
      sidebarForeground: "black",
      sidebarPrimary: "orange-500",
      sidebarPrimaryForeground: "white",
      sidebarAccent: "neutral-200",
      sidebarAccentForeground: "black",
      sidebarBorder: "neutral-200",
      sidebarRing: "orange-500",
    },
    dark: {
      background: "black",
      foreground: "white",
      card: "neutral-800",
      cardForeground: "white",
      popover: "black",
      popoverForeground: "white",
      primary: "orange-500",
      primaryForeground: "white",
      secondary: "neutral-800",
      secondaryForeground: "white",
      muted: "neutral-800",
      mutedForeground: "neutral-200",
      accent: "orange-500",
      accentForeground: "white",
      destructive: "orange-500",
      destructiveForeground: "white",
      border: "neutral-800",
      input: "neutral-800",
      ring: "orange-500",
      chart1: "orange-500",
      chart2: "neutral-200",
      chart3: "neutral-600",
      chart4: "white",
      chart5: "black",
      sidebar: "black",
      sidebarForeground: "white",
      sidebarPrimary: "orange-500",
      sidebarPrimaryForeground: "white",
      sidebarAccent: "orange-500",
      sidebarAccentForeground: "white",
      sidebarBorder: "neutral-800",
      sidebarRing: "orange-500",
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
    /** Approved pairings, by palette shade. Order matters — first is primary. */
    colorways: [
      { fg: "white", bg: "black", label: "Primary" },
      { fg: "black", bg: "white", label: "Primary reversed" },
      { fg: "white", bg: "orange-500" },
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
