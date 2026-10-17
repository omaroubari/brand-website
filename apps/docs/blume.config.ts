import { defineConfig } from "blume";

export default defineConfig({
  title: "Brandtree Docs",
  logo: { image: "/logo.svg", text: "" },
  description: "Build and maintain brand guidelines with Brandtree.",
  theme: {
    accent: "#2563eb",
    fonts: {
      body: "dm-sans",
      display: "dm-sans",
      mono: { name: "DM Mono", provider: "google", weights: [400, 500] },
    },
  },
  navigation: {
    // Group by author workflow while keeping published page URLs stable.
    sidebar: [
      {
        label: "Getting started",
        items: ["/", "/quickstart", "/project-structure"],
      },
      {
        label: "Brand configuration",
        items: [
          "/brand-configuration",
          "/brand-identity",
          "/colors",
          "/themes",
          "/typography",
          "/fonts",
          "/logos",
          "/brand-assets",
          "/contact",
        ],
      },
      {
        label: "Content creation",
        items: [
          "/authoring",
          {
            label: "Components",
            root: "/components",
            display: "group",
            collapsed: true,
            items: [
              "/components",
              {
                label: "Layout and prose",
                display: "group",
                collapsed: true,
                items: [
                  "/components/block",
                  "/components/grid",
                  "/components/panel",
                  "/components/figure",
                  "/components/callout",
                  "/components/spec-list",
                  "/components/statement",
                ],
              },
              {
                label: "Logos",
                display: "group",
                collapsed: true,
                items: [
                  "/components/logo",
                  "/components/logo-clearspace",
                  "/components/logo-colorways",
                  "/components/logo-scaling",
                  "/components/construction-grid",
                  "/components/logo-misuse",
                ],
              },
              {
                label: "Colors",
                display: "group",
                collapsed: true,
                items: [
                  "/components/color-palette",
                  "/components/color-swatch",
                  "/components/color-scale",
                  "/components/contrast-matrix",
                ],
              },
              {
                label: "Typography",
                display: "group",
                collapsed: true,
                items: [
                  "/components/type-specimen",
                  "/components/type-scale",
                  "/components/font-weights",
                  "/components/glyphs",
                ],
              },
              {
                label: "Voice and audience",
                display: "group",
                collapsed: true,
                items: [
                  "/components/tone-sliders",
                  "/components/value-grid",
                  "/components/persona-card",
                ],
              },
              {
                label: "Collections",
                display: "group",
                collapsed: true,
                items: [
                  "/components/icon-grid",
                  "/components/photo-grid",
                  "/components/downloads",
                  "/components/layout-grid",
                ],
              },
            ],
          },
          "/media",
          "/customization",
          "/styling",
        ],
      },
      {
        label: "Site management",
        items: [
          "/navigation",
          "/localization",
          "/social-cards",
          "/validation",
          "/publishing",
        ],
      },
      {
        label: "Reference",
        items: [
          "/configuration",
          "/frontmatter",
          "/folder-metadata",
          "/cli",
          "/troubleshooting",
        ],
      },
    ],
  },
  examples: {
    source: "examples",
    css: "examples.css",
  },
  content: {
    root: "docs",
  },
});
