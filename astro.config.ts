// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import mdx from "@astrojs/mdx";
import cloudflare from "@astrojs/cloudflare";

import { brand, config } from "./src/brand/config";

import react from "@astrojs/react";

import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const i18n = config.i18n;

const configuredOgLogo = (
  value: string | false | undefined,
  fallback: string,
): string | false => (value === false ? false : (value ?? fallback));

/** Bundle build-only OG assets so Cloudflare's prerender worker needs no disk access. */
const ogAssets = () => ({
  name: "brand-og-assets",
  resolveId(id: string) {
    return id === "virtual:og-assets" ? `\0${id}` : undefined;
  },
  load(id: string) {
    if (id !== "\0virtual:og-assets") return undefined;
    const og = config.seo.og;
    const logoSource = configuredOgLogo(og.logo, brand.logo.logotype.onDark);
    const logo =
      typeof logoSource === "string" && logoSource.endsWith(".svg")
        ? readFileSync(
            logoSource.startsWith("/")
              ? resolve("public", logoSource.slice(1))
              : resolve(logoSource),
            "utf8",
          )
        : logoSource === false
          ? false
          : undefined;
    const fontData = Object.fromEntries(
      (og.fonts ?? [])
        .filter(
          (font): font is Extract<typeof font, { src: string }> =>
            typeof font === "object" && "src" in font,
        )
        .map((font) => [
          font.src,
          readFileSync(resolve(font.src)).toString("base64"),
        ]),
    );
    return `export const logo = ${JSON.stringify(logo)}; export const fontData = ${JSON.stringify(fontData)};`;
  },
});

// https://astro.build/config
export default defineConfig({
  site: brand.meta.url,
  output: "static",
  i18n: i18n
    ? {
        locales: i18n.locales.map(({ code }) => code),
        defaultLocale: i18n.defaultLocale,
        routing: {
          prefixDefaultLocale: !i18n.hideDefaultLocalePrefix,
        },
      }
    : undefined,
  integrations: [mdx(), react()],

  // A guidelines site's imagery is fixed, so images are optimised at build
  // time. That keeps the output plain static files — no Cloudflare Images
  // binding to provision, and the `dist/` folder deploys anywhere.
  adapter: cloudflare({ imageService: "compile" }),

  /**
   * Brand typefaces. Astro self-hosts these, preloads them and generates
   * size-adjusted fallbacks, so there is no layout shift and no third-party
   * request.
   *
   * `cssVariable` is what `typography.display` / `typography.text` in
   * src/brand/config.ts point at — change one, change the other.
   *
   * The template ships a single variable family so there is one download. Most
   * brands want two: add a second entry with its own `cssVariable`, then set
   * `typography.display` to it.
   *
   *   Licensed file you host yourself (drop it in src/assets/fonts/):
   *     provider: fontProviders.local(),
   *     options: { variants: [{ src: ['./src/assets/fonts/MyFont.woff2'], weight: '100 900', style: 'normal' }] }
   *
   *   Hosted — swap `provider` and drop `options` entirely:
   *     provider: fontProviders.google(),   // or .adobe({ id }), .fontshare(), .bunny(), .fontsource()
   *     name: 'Inter',
   *     weights: ['300 800'],
   */
  fonts: [
    {
      name: "Brand Sans",
      cssVariable: "--font-brand",
      provider: fontProviders.local(),
      fallbacks: [
        "ui-sans-serif",
        "system-ui",
        "-apple-system",
        "Segoe UI",
        "Helvetica Neue",
        "Arial",
        "sans-serif",
      ],
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/BrandSans-Variable.ttf"],
            weight: "100 900",
            style: "normal",
          },
        ],
      },
    },
    {
      name: "PP Neue Montreal Arabic",
      cssVariable: "--font-arabic",
      provider: fontProviders.local(),
      fallbacks: ["ui-sans-serif", "system-ui", "sans-serif"],
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/PPNeueMontrealArabic-Variable.ttf"],
            weight: "100 900",
            style: "normal",
          },
        ],
      },
    },
  ],

  vite: {
    plugins: [ogAssets(), tailwindcss()],
  },
});
