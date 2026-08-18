import { describe, expect, it } from "vitest";
import type { BrandColorFamily, BrandConfig, BrandScheme } from "./types";
import {
  brandStyleSheet,
  colorCss,
  colorToHex,
  resolveColor,
  schemeRoles,
  shadeSteps,
} from "./tokens";

function family(id: string, value: BrandColorFamily["shades"][50]) {
  return {
    id,
    name: id,
    shades: Object.fromEntries(
      shadeSteps.map((step) => [step, value]),
    ) as BrandColorFamily["shades"],
  } satisfies BrandColorFamily;
}

const colors = {
  palette: [
    family("paper", { space: "hex", value: "#ffffff" }),
    family("night", { space: "hex", value: "#000000" }),
    family("signal-red", { space: "hex", value: "#ef3800" }),
  ],
  swatches: [],
};

const light = Object.fromEntries(
  schemeRoles.map((role) => [
    role,
    role.includes("Foreground") ? "night-950" : "paper-50",
  ]),
) as unknown as BrandScheme;

const dark = Object.fromEntries(
  schemeRoles.map((role) => [
    role,
    role.includes("Foreground") ? "paper-50" : "night-950",
  ]),
) as unknown as BrandScheme;

function fixture(defaultTheme: "light" | "dark" | "system" = "system") {
  return {
    colors,
    theme: { light: { ...light }, dark: { ...dark }, default: defaultTheme },
    typography: {
      display: "display",
      text: "text",
      mono: "mono",
    },
  } as unknown as BrandConfig;
}

describe("brandStyleSheet", () => {
  it("emits shade tokens and the complete light and dark scheme contract", () => {
    const css = brandStyleSheet(fixture("light"));

    expect(css).toContain("--color-signal-red-500: #ef3800;");
    for (const role of schemeRoles) {
      const cssName = role
        .replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
        .replace(/([a-z])([0-9])/g, "$1-$2");
      expect(css).toContain(`--${cssName}: var(--color-paper-50);`);
      expect(css).toContain(`--${cssName}: var(--color-night-950);`);
    }
    expect(css).not.toContain("prefers-color-scheme");
  });

  it("uses an explicit dark fallback when dark is the configured default", () => {
    const css = brandStyleSheet(fixture("dark"));

    expect(css).toContain(
      ":root:not([data-theme='light']):not([data-theme='dark'])",
    );
    expect(css).not.toContain("prefers-color-scheme");
  });

  it("uses the operating-system fallback for a system default", () => {
    const css = brandStyleSheet(fixture("system"));

    expect(css).toContain("@media (prefers-color-scheme: dark)");
    expect(css).toContain(":root:not([data-theme='light'])");
  });

  it("fails when a scheme references an unknown shade", () => {
    const config = fixture();
    config.theme.light.primary = "missing-500";

    expect(() => brandStyleSheet(config)).toThrow(
      'Unknown colour reference "missing-500"',
    );
  });
});

describe("colour formats", () => {
  it("serialises and converts OKLCH values for CSS and print output", () => {
    const orange = { space: "oklch", l: 0.62, c: 0.22, h: 36 } as const;

    expect(colorCss(orange)).toBe("oklch(62% 0.22 36)");
    expect(colorToHex(orange)).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("special colours", () => {
  it("resolves black and white without palette entries", () => {
    const config = fixture();

    expect(resolveColor(config, "black").value).toEqual({
      space: "hex",
      value: "#000000",
    });
    expect(resolveColor(config, "white").value).toEqual({
      space: "hex",
      value: "#ffffff",
    });
    expect(brandStyleSheet(config)).toContain("--color-black: #000000;");
    expect(brandStyleSheet(config)).toContain("--color-white: #ffffff;");
  });
});
