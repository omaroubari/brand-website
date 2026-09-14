import { describe, expect, it } from "vitest";
import {
  getInitialThemeAttributes,
  getSuggestedThemeSetting,
  resolveThemePreference,
  resolveThemeState,
} from "./theme-state";

describe("getInitialThemeAttributes", () => {
  it("renders a forced author default as the server theme", () => {
    expect(getInitialThemeAttributes("light")).toEqual({
      theme: "light",
      preference: "light",
    });
    expect(getInitialThemeAttributes("dark")).toEqual({
      theme: "dark",
      preference: "dark",
    });
  });

  it("leaves the server theme unresolved for a system default", () => {
    expect(getInitialThemeAttributes("system")).toEqual({
      theme: undefined,
      preference: "system",
    });
  });
});

describe("resolveThemeState", () => {
  it("resolves system to the OS while preserving the system preference", () => {
    expect(resolveThemeState("system", "dark")).toEqual({
      theme: "dark",
      preference: "system",
      systemTheme: "dark",
    });
  });

  it("lets an explicit preference override the OS", () => {
    expect(resolveThemeState("dark", "light")).toEqual({
      theme: "dark",
      preference: "dark",
      systemTheme: "light",
    });
  });
});

describe("resolveThemePreference", () => {
  it("uses the brand default until the visitor chooses a setting", () => {
    expect(resolveThemePreference(null, "system")).toBe("system");
    expect(resolveThemePreference(null, "dark")).toBe("dark");
  });

  it("always lets the visitor setting win", () => {
    expect(resolveThemePreference("light", "dark")).toBe("light");
    expect(resolveThemePreference("system", "dark")).toBe("system");
  });
});

describe("getSuggestedThemeSetting", () => {
  it("offers the opposite theme when the current theme matches the OS", () => {
    expect(
      getSuggestedThemeSetting({ theme: "light", systemTheme: "light" }),
    ).toBe("dark");
    expect(
      getSuggestedThemeSetting({ theme: "dark", systemTheme: "dark" }),
    ).toBe("light");
  });

  it("offers system when the current theme differs from the OS", () => {
    expect(
      getSuggestedThemeSetting({ theme: "dark", systemTheme: "light" }),
    ).toBe("system");
    expect(
      getSuggestedThemeSetting({ theme: "light", systemTheme: "dark" }),
    ).toBe("system");
  });
});
