import { afterEach, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { loadOgFonts, resolveOgFontFamily } from "../src/og/fonts";
import { defaultFont } from "../src/brand/fonts";
import type { ResolvedConfig } from "../src/core/schema";

const declarations: ResolvedConfig["fonts"] = [
  {
    name: "Display",
    cssVariable: "--display",
    provider: "local",
    options: { variants: [{ src: ["./font.woff2"] }] },
  },
  {
    name: "Arabic",
    cssVariable: "--arabic",
    provider: "google",
    subsets: ["arabic", "latin"],
  },
  {
    ...defaultFont,
    weights: [...defaultFont.weights],
    styles: [...defaultFont.styles],
    fallbacks: [...defaultFont.fallbacks],
  },
];
const inter = await readFile(
  new URL(
    "../../../apps/sandbox/assets/fonts/Inter-Variable.woff2",
    import.meta.url,
  ),
);
afterEach(() => vi.unstubAllGlobals());

it("uses Astro local and Google faces, retaining weights, styles and coverage subsets", async () => {
  const fetcher = vi.fn(async () => new Response(inter));
  vi.stubGlobal("fetch", fetcher);
  const warn = vi.fn();
  const result = await loadOgFonts(
    declarations,
    {
      "--display": [
        { src: [{ url: "/local" }], weight: "100 900", style: "normal" },
      ],
      [defaultFont.cssVariable]: [{ src: [{ url: "/inter" }] }],
      "--arabic": [
        { src: [{ url: "/arabic" }], weight: "500", subset: "arabic" },
        { src: [{ url: "/latin" }], weight: "500", subset: "latin" },
      ],
    },
    (url) => `http://astro${url}`,
    undefined,
    warn,
  );
  expect(fetcher.mock.calls).toHaveLength(4);
  expect(warn).not.toHaveBeenCalled();
  expect(result.fonts).toMatchObject([
    { name: "--display:0", subsetOf: "Display", weight: undefined },
    { name: "--arabic:0", subsetOf: "Arabic", weight: 500 },
    { name: "--arabic:1", subsetOf: "Arabic", weight: 500 },
    { name: `${defaultFont.cssVariable}:0`, subsetOf: "Inter" },
  ]);
  expect(
    resolveOgFontFamily(
      "var(--arabic, var(--display)), sans-serif",
      declarations,
      result.fonts,
    ),
  ).toBe('"Arabic", "Inter"');
  expect(
    resolveOgFontFamily(
      "var(--missing, var(--display)), sans-serif",
      declarations,
      result.fonts,
    ),
  ).toBe('"Display", "Inter"');
  expect(
    resolveOgFontFamily('"Display", serif', declarations, result.fonts),
  ).toBe('"Display", "Inter"');
});

it("recovers from unavailable and corrupt faces, tries alternative sources, and reloads restored files", async () => {
  const warn = vi.fn();
  const fetcher = vi.fn(
    async (url: string) =>
      new Response(url === "/inter" ? inter : "invalid font"),
  );
  vi.stubGlobal("fetch", fetcher);
  const data = {
    "--display": [{ src: [{ url: "/font" }, { url: "/alternative" }] }],
    [defaultFont.cssVariable]: [{ src: [{ url: "/inter" }] }],
  };
  const failed = await loadOgFonts(
    declarations,
    data,
    (url) => url,
    undefined,
    warn,
  );
  expect(failed.fonts).toMatchObject([
    { name: `${defaultFont.cssVariable}:0`, subsetOf: "Inter", src: "/inter" },
  ]);
  expect(warn).toHaveBeenCalledTimes(2);
  expect(
    resolveOgFontFamily("var(--display)", declarations, failed.fonts),
  ).toBe('"Inter"');
  fetcher.mockImplementation(async () => new Response(inter));
  const restored = await loadOgFonts(
    declarations.slice(0, 1),
    data,
    (url) => url,
    undefined,
    warn,
  );
  expect(restored.fonts[0]?.subsetOf).toBe("Display");
});

it("tries alternative face sources and respects an explicit font opt-out", async () => {
  const fetcher = vi.fn(
    async (url: string) => new Response(url === "/valid" ? inter : "invalid"),
  );
  vi.stubGlobal("fetch", fetcher);
  const warn = vi.fn();
  const result = await loadOgFonts(
    declarations.slice(0, 1),
    {
      "--display": [{ src: [{ url: "/corrupt" }, { url: "/valid" }] }],
    },
    (url) => url,
    undefined,
    warn,
  );
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(warn).not.toHaveBeenCalled();
  expect(result.fonts[0]).toMatchObject({ src: "/valid", subsetOf: "Display" });
  const optedOut = await loadOgFonts(
    [],
    { [defaultFont.cssVariable]: [{ src: [{ url: "/inter" }] }] },
    (url) => url,
  );
  expect(optedOut.fonts).toEqual([]);
  expect(resolveOgFontFamily("sans-serif", [], optedOut.fonts)).toBe("");
});
