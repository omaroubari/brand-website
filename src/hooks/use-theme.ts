import { useCallback, useSyncExternalStore } from "react";
import type { Theme, ThemeSetting } from "@/lib/theme";

const THEME_ATTR = "data-theme";

const PREFERENCE_ATTR = "data-theme-preference";

/**
 * Subscribe to the theme state written to <html> by @/lib/theme. The module
 * reflects the resolved theme onto `data-theme` and the user's explicit choice
 * onto `data-theme-preference`, so a MutationObserver on those attributes is
 * our source of truth.
 */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [THEME_ATTR, PREFERENCE_ATTR],
  });
  const handleThemeChange = () => onChange();
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
  document.addEventListener("theme-change", handleThemeChange);
  prefersDark.addEventListener("change", handleThemeChange);
  return () => {
    observer.disconnect();
    document.removeEventListener("theme-change", handleThemeChange);
    prefersDark.removeEventListener("change", handleThemeChange);
  };
}

function getThemeSnapshot(): Theme {
  return (
    (document.documentElement.getAttribute(THEME_ATTR) as Theme) || "light"
  );
}

function getSystemThemeSnapshot(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getPreferenceSnapshot(): Theme {
  const value = document.documentElement.getAttribute(PREFERENCE_ATTR);
  return value === "dark" ? "dark" : "light";
}

// Rendered on the server (and the first client pass) before <html> is readable.
function getServerTheme(defaultTheme: ThemeSetting): Theme {
  return defaultTheme === "dark" ? "dark" : "light";
}

function setTheme(preference: ThemeSetting | null): void {
  // @/lib/theme owns persistence + reflection; nudge it via the event it listens for.
  document.dispatchEvent(new CustomEvent("set-theme", { detail: preference }));
}

export interface UseThemeResult {
  /** The resolved theme currently applied to the document. */
  theme: Theme;
  /** The theme currently preferred by the operating system. */
  systemTheme: Theme;
  /** The resolved preference currently reflected in the document. */
  preference: Theme;
  isDark: boolean;
  /** True when the active setting follows the OS preference. */
  isSystem: boolean;
  /** Set light, dark, or system; pass null to return to the author default. */
  setTheme: (preference: ThemeSetting | null) => void;
  /** Flip between explicit light and dark based on the resolved theme. */
  toggleTheme: () => void;
  /**
   * Toggle between system mode and the opposite of the current OS mode.
   */
  toggleSystem: () => void;
}

export function useTheme({
  defaultTheme = "system",
}: { defaultTheme?: ThemeSetting } = {}): UseThemeResult {
  const getServerSnapshot = () => getServerTheme(defaultTheme);
  const theme = useSyncExternalStore(
    subscribe,
    getThemeSnapshot,
    getServerSnapshot,
  );
  const systemTheme = useSyncExternalStore(
    subscribe,
    getSystemThemeSnapshot,
    getServerSnapshot,
  );
  const preference = useSyncExternalStore(
    subscribe,
    getPreferenceSnapshot,
    getServerSnapshot,
  );
  const isSystem = useSyncExternalStore(
    subscribe,
    () => getActiveThemeSetting(defaultTheme) === "system",
    () => defaultTheme === "system",
  );

  const toggleTheme = useCallback(() => {
    setTheme(getThemeSnapshot() === "dark" ? "light" : "dark");
  }, []);

  const toggleSystem = useCallback(() => {
    // Follow the OS, or pin the opposite of the current OS mode.
    if (getActiveThemeSetting(defaultTheme) === "system") {
      setTheme(getThemeSnapshot() === "dark" ? "light" : "dark");
    } else {
      setTheme("system");
    }
  }, [defaultTheme]);

  return {
    theme,
    systemTheme,
    preference,
    isDark: theme === "dark",
    isSystem,
    setTheme,
    toggleTheme,
    toggleSystem,
  };
}

function isThemeSetting(value: string | null): value is ThemeSetting {
  return value === "light" || value === "dark" || value === "system";
}

/** User settings take precedence over the author's configured fallback. */
export function resolveThemeSetting(
  userSetting: ThemeSetting | null,
  authorDefault: ThemeSetting,
): ThemeSetting {
  return userSetting ?? authorDefault;
}

function getActiveThemeSetting(defaultTheme: ThemeSetting): ThemeSetting {
  const stored = localStorage.getItem("theme");
  return resolveThemeSetting(
    isThemeSetting(stored) ? stored : null,
    defaultTheme,
  );
}
