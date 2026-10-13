// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import type { AstroUserConfig } from "astro";
import { prerenderDeps } from "brandtree/astro/prerender-deps";
import mdx from "@astrojs/mdx";
import cloudflare from "@astrojs/cloudflare";

import config from "./src/core/config";

import react from "@astrojs/react";

import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const i18n = config.i18n;
const brand = config.brand;

const configuredOgLogo = (
  value: string | false | undefined,
  fallback: string,
): string | false => (value === false ? false : (value ?? fallback));

/** Bundle the configured logo for static social-card generation. */
const ogAssets = () => ({
  name: "brand-og-assets",
  enforce: "pre" as const,
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
    return `export const logo = ${JSON.stringify(logo)};`;
  },
});

/** Resolve providers from the centralized brand font declarations. */
const fonts = config.fonts.map((font) => {
  if (font.provider === "local") {
    return { ...font, provider: fontProviders.local() };
  }
  if (font.provider === "adobe") {
    const { id, ...family } = font;
    return { ...family, provider: fontProviders.adobe({ id }) };
  }
  return { ...font, provider: fontProviders[font.provider]() };
});

// Astro infers provider-specific options from tuples; this schema-validated
// configuration produces a dynamic list of local and hosted font families.
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
  adapter: cloudflare({
    imageService: "compile",
    prerenderEnvironment: "node",
  }),

  fonts: fonts as NonNullable<AstroUserConfig["fonts"]>,

  vite: {
    plugins: [prerenderDeps(), ogAssets(), tailwindcss()],
  },
});
