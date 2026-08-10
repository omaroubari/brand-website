import { describe, expect, it } from "vitest";
import { resolveThemeSetting } from "./use-theme";

describe("resolveThemeSetting", () => {
  it("uses the author's default when there is no user setting", () => {
    expect(resolveThemeSetting(null, "light")).toBe("light");
    expect(resolveThemeSetting(null, "dark")).toBe("dark");
    expect(resolveThemeSetting(null, "system")).toBe("system");
  });

  it("always lets an explicit user setting win", () => {
    expect(resolveThemeSetting("light", "dark")).toBe("light");
    expect(resolveThemeSetting("dark", "light")).toBe("dark");
    expect(resolveThemeSetting("system", "light")).toBe("system");
  });
});
