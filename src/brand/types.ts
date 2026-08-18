/**
 * Type definitions for a brand guidelines site.
 *
 * Everything a client-specific site needs to differ lives in `src/brand/config.ts`.
 * This file describes the shape of that object — you should not need to edit it
 * when spinning up a new client.
 */

/** Tailwind-compatible stops used in a published brand shade scale. */
export type BrandShadeStep =
  50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;

/** A colour stored in its source colour space. */
export type BrandColorValue =
  | { space: "hex"; value: string }
  | {
      space: "oklch";
      /** Lightness from 0 to 1. */
      l: number;
      c: number;
      /** Hue angle from 0 to 360. */
      h: number;
      /** Optional alpha from 0 to 1. */
      alpha?: number;
    };

/** A stable pointer to one published shade, for example `neutral-950`. */
export type BrandColorReference = `${string}-${BrandShadeStep}`;

/** Built-in, format-independent extremes that never need palette entries. */
export type BrandSpecialColor = "black" | "white";

/** Any colour token available to components and semantic theme roles. */
export type BrandColorToken = BrandColorReference | BrandSpecialColor;

/** A named family of related, approved digital shades. */
export interface BrandColorFamily {
  /** Stable CSS-token prefix, e.g. `neutral` → `--color-neutral-950`. */
  id: string;
  /** Display name for the scale, e.g. "Neutral". */
  name: string;
  /** Every published shade is explicit — no runtime colour generation. */
  shades: Record<BrandShadeStep, BrandColorValue>;
}

/** A named colour shown in the primary or secondary documentation. */
export interface BrandSwatch {
  /** Stable handle for documenting this named reference point. */
  id: string;
  /** Display name shown on the swatch, e.g. "Orange/Red". */
  name: string;
  /** An approved palette shade or built-in black/white token. */
  color: BrandColorToken;
  /** Print values, shown alongside the swatch when present. */
  cmyk?: [number, number, number, number];
  pantone?: string;
  /** One line on where this colour is allowed to be used. */
  usage?: string;
  /** Where this colour appears in the colour guidelines. */
  category?: "primary" | "secondary";
  /** Number of grid columns the swatch spans on the palette page. */
  span?: 1 | 2;
  /** Number of grid rows the swatch spans on the palette page. */
  rows?: 1 | 2;
  /** Force the label/spec colour when automatic contrast picks wrong. */
  on?: BrandColorToken;
}

/** The complete, centralised colour system for a brand. */
export interface BrandColors {
  palette: BrandColorFamily[];
  swatches: BrandSwatch[];
}

/** Maps the complete shadcn colour contract onto shade references, per scheme. */
export interface BrandScheme {
  background: BrandColorToken;
  foreground: BrandColorToken;
  card: BrandColorToken;
  cardForeground: BrandColorToken;
  popover: BrandColorToken;
  popoverForeground: BrandColorToken;
  primary: BrandColorToken;
  primaryForeground: BrandColorToken;
  secondary: BrandColorToken;
  secondaryForeground: BrandColorToken;
  muted: BrandColorToken;
  mutedForeground: BrandColorToken;
  accent: BrandColorToken;
  accentForeground: BrandColorToken;
  destructive: BrandColorToken;
  destructiveForeground: BrandColorToken;
  border: BrandColorToken;
  input: BrandColorToken;
  ring: BrandColorToken;
  chart1: BrandColorToken;
  chart2: BrandColorToken;
  chart3: BrandColorToken;
  chart4: BrandColorToken;
  chart5: BrandColorToken;
  sidebar: BrandColorToken;
  sidebarForeground: BrandColorToken;
  sidebarPrimary: BrandColorToken;
  sidebarPrimaryForeground: BrandColorToken;
  sidebarAccent: BrandColorToken;
  sidebarAccentForeground: BrandColorToken;
  sidebarBorder: BrandColorToken;
  sidebarRing: BrandColorToken;
}

export interface BrandTheme {
  light: BrandScheme;
  dark: BrandScheme;
  /** Which scheme wins when the visitor has no stated preference. */
  default: "light" | "dark" | "system";
}

/** A single step in the published type scale. */
export interface TypeStyle {
  /** Name used in the guidelines, e.g. "Header 1.0". */
  name: string;
  /** Where this style is meant to be used. */
  role?: string;
  /** Which family renders it. */
  font?: "display" | "text";
  weight?: number;
  /** Any CSS length — `clamp()` is encouraged. */
  size: string;
  lineHeight: string;
  tracking: string;
  transform?: "none" | "uppercase" | "lowercase" | "capitalize";
  /** Original print spec, reproduced verbatim on the type scale page. */
  print?: { size: string; leading: string; tracking: string };
  /** Overrides the default specimen sentence. */
  sample?: string;
}

export interface FontWeightSpec {
  name: string;
  weight: number;
  italic?: boolean;
}

export interface BrandTypography {
  /** CSS font-family values. Point these at the `cssVariable`s in `astro.config.ts`. */
  display: string;
  text: string;
  mono: string;
  /** Names as written in the document, plus licensing notes. */
  families: Array<{
    label: "display" | "text" | "mono";
    name: string;
    foundry?: string;
    url?: string;
    note?: string;
  }>;
  weights: FontWeightSpec[];
  scale: TypeStyle[];
}

export interface LogoArtwork {
  /** Artwork for use on light backgrounds (usually the dark version). */
  onLight: string;
  /** Artwork for use on dark backgrounds (usually the light version). */
  onDark: string;
  /** width / height. Used to reserve space and to scale correctly. */
  aspect: number;
  /** Rendered instead of the artwork if a file is missing. */
  altText?: string;
}

export interface BrandLogo {
  logotype: LogoArtwork;
  brandmark: LogoArtwork;
  favicon?: string;
  /** Phonetic spelling shown on the logo description page. */
  pronunciation?: string;
  clearspace: {
    /** What one unit of clear space equals, e.g. 'the height of the lowercase "o"'. */
    unit: string;
    /** Clear space as a fraction of logo height — drives the diagram. */
    ratio: number;
  };
  minSize: {
    digital: string;
    print: string;
  };
  /** Approved foreground/background pairs, referenced by palette shade. */
  colorways: Array<{
    fg: BrandColorToken;
    bg: BrandColorToken;
    label?: string;
  }>;
}

export interface BrandMeta {
  /** Brand name as written. */
  name: string;
  /** Legal entity, used in the colophon. */
  legalName?: string;
  /** Short descriptor under the logo, e.g. "Graphic Design Studio". */
  tagline?: string;
  /** Title of the document itself. */
  documentTitle: string;
  version: string;
  year: number;
  /** Canonical origin, used for `site` and meta tags. */
  url: string;
  description: string;
  /** Optional social preview image, relative to `public/`. */
  ogImage?: string;
}

export interface BrandContact {
  email?: string;
  website?: string;
  phone?: string;
  address?: string[];
  socials?: Array<{ label: string; handle: string; url: string }>;
}

/** A downloadable asset offered on the site. */
export interface BrandDownload {
  label: string;
  /** Path under `public/`, or an external URL. */
  href: string;
  format?: string;
  size?: string;
  note?: string;
}

export interface BrandConfig {
  meta: BrandMeta;
  colors: BrandColors;
  theme: BrandTheme;
  typography: BrandTypography;
  logo: BrandLogo;
  contact: BrandContact;
  downloads?: BrandDownload[];
  /** Show the section number ("01") beside titles. */
  numbering?: boolean;
}

/**
 * Identity helper that gives you autocomplete and type errors in `config.ts`.
 *
 * The return type is widened to `BrandConfig` on purpose. Inferring the literal
 * shape would mean every optional key the sample config happens to omit — a
 * phone number, an OG image, a `transform` on a type step — would not exist on
 * the type, and components could not read them until someone edited this file.
 */
export function defineBrand(config: BrandConfig): BrandConfig {
  return config;
}
