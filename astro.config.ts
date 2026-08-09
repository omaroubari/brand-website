// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import mdx from "@astrojs/mdx";
import cloudflare from "@astrojs/cloudflare";

import { brand } from "./src/brand/config";

import react from "@astrojs/react";

import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: brand.meta.url,
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
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
