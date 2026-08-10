import { describe, expect, it } from "vitest";
import type { BrandConfig, BrandScheme } from "./types";
import { brandStyleSheet, schemeRoles } from "./tokens";

const palette = [
  { id: "paper", name: "Paper", hex: "#ffffff" },
  { id: "night", name: "Night", hex: "#000000" },
  { id: "signal-red", name: "Signal Red", hex: "#ef3800" },
] as const;

const light = Object.fromEntries(
  schemeRoles.map((role) => [
    role,
    role.includes("Foreground") ? "night" : "paper",
  ]),
) as unknown as BrandScheme;

const dark = Object.fromEntries(
  schemeRoles.map((role) => [
    role,
    role.includes("Foreground") ? "paper" : "night",
  ]),
) as unknown as BrandScheme;

function fixture(defaultTheme: "light" | "dark" | "system" = "system") {
  return {
    palette,
    theme: { light, dark, default: defaultTheme },
    typography: {
      display: "display",
      text: "text",
      mono: "mono",
    },
  } as unknown as BrandConfig;
}

describe("brandStyleSheet", () => {
  it("emits the complete light and dark scheme contract", () => {
    const css = brandStyleSheet(fixture("light"));

    expect(css).toContain("--color-signal-red: #ef3800;");
    for (const role of schemeRoles) {
      const cssName = role
        .replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
        .replace(/([a-z])([0-9])/g, "$1-$2");
      expect(css).toContain(`--${cssName}: var(--color-paper);`);
      expect(css).toContain(`--${cssName}: var(--color-night);`);
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

  it("fails when a scheme references an unknown swatch", () => {
    const config = fixture();
    config.theme.light.primary = "missing-swatch";

    expect(() => brandStyleSheet(config)).toThrow(
      'Unknown swatch id "missing-swatch" in light scheme role "primary"',
    );
  });
});
