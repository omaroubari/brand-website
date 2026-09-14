/** @file Pure theme types and policies shared by server and browser code. */
/** A concrete visual mode. */
export type Theme = "light" | "dark";

/** A concrete theme or a request to follow the operating system. */
export type ThemeSetting = Theme | "system";

/** Fully resolved theme state exposed to UI consumers. */
export interface ThemeState {
  /** The concrete mode currently applied to the document. */
  theme: Theme;
  /** The visitor setting when present, otherwise the configured brand default. */
  preference: ThemeSetting;
  /** The mode currently preferred by the operating system. */
  systemTheme: Theme;
}

/** Validate untrusted values such as localStorage entries. */
export function isThemeSetting(value: unknown): value is ThemeSetting {
  return value === "light" || value === "dark" || value === "system";
}

/** Resolve an effective setting into the concrete theme shown by the browser. */
export function resolveThemeState(
  preference: ThemeSetting,
  systemTheme: Theme,
): ThemeState {
  return {
    theme: preference === "system" ? systemTheme : preference,
    preference,
    systemTheme,
  };
}

/** User settings take precedence over the configured brand default. */
export function resolveThemePreference(
  userSetting: ThemeSetting | null,
  brandDefault: ThemeSetting,
): ThemeSetting {
  return userSetting ?? brandDefault;
}

/**
 * Offer an explicit opposite when the page matches the OS. When it differs,
 * offer to return control to the system preference.
 */
export function getSuggestedThemeSetting(
  state: Pick<ThemeState, "theme" | "systemTheme">,
): ThemeSetting {
  if (state.theme !== state.systemTheme) return "system";
  return state.theme === "dark" ? "light" : "dark";
}

/** Attributes that can be rendered before JavaScript or localStorage exist. */
export function getInitialThemeAttributes(brandDefault: ThemeSetting): {
  theme: Theme | undefined;
  preference: ThemeSetting;
} {
  return {
    theme: brandDefault === "system" ? undefined : brandDefault,
    preference: brandDefault,
  };
}
